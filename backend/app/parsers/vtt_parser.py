import re
from typing import Optional

from app.parsers.base import TranscriptSegment, TranscriptParseError, MAX_FILE_SIZE


# WebVTT timestamp: 00:00:05.000 or 00:05.000
_VTT_TIMESTAMP_RE = re.compile(
    r"(?:(\d{2,}):)?(\d{2}):(\d{2})\.(\d{3})"
)

_CUE_SEPARATOR = re.compile(r"-->\s*")


def _parse_vtt_timestamp(ts: str) -> float:
    """Parse a WebVTT timestamp string to seconds."""
    m = _VTT_TIMESTAMP_RE.match(ts.strip())
    if not m:
        raise TranscriptParseError(f"Invalid VTT timestamp: '{ts}'")
    hours = int(m.group(1)) if m.group(1) else 0
    minutes = int(m.group(2))
    seconds = int(m.group(3))
    millis = int(m.group(4))
    return hours * 3600 + minutes * 60 + seconds + millis / 1000.0


class VttParser:
    """Parser for WebVTT (.vtt) transcript files."""

    extension = ".vtt"

    def parse(self, raw: str) -> list[TranscriptSegment]:
        if len(raw.encode("utf-8")) > MAX_FILE_SIZE:
            raise TranscriptParseError("File exceeds 10 MB size limit")

        lines = raw.splitlines()

        # Validate WEBVTT header
        header = lines[0].strip() if lines else ""
        if not header.startswith("WEBVTT"):
            raise TranscriptParseError(
                "File does not start with WEBVTT header", location="line 1"
            )

        segments = []
        segment_index = 0
        i = 1

        # Track speaker from NOTE blocks or cue identifiers
        current_speaker: Optional[str] = None

        while i < len(lines):
            line = lines[i].strip()

            # Skip empty lines
            if not line:
                i += 1
                continue

            # NOTE block — may contain speaker info
            if line.startswith("NOTE"):
                note_content = []
                i += 1
                while i < len(lines) and lines[i].strip():
                    note_content.append(lines[i].strip())
                    i += 1
                for nc in note_content:
                    if nc.lower().startswith("speaker:"):
                        current_speaker = nc[len("speaker:"):].strip()
                continue

            # Check for cue identifier (non-timestamp line before the timing line)
            cue_id: Optional[str] = None
            if "-->" not in line:
                cue_id = line
                i += 1
                if i >= len(lines):
                    break
                line = lines[i].strip()

            # Timing line
            if "-->" not in line:
                i += 1
                continue

            timing_parts = _CUE_SEPARATOR.split(line, maxsplit=1)
            if len(timing_parts) < 2:
                raise TranscriptParseError(
                    f"Invalid cue timing line: '{line}'", location=f"line {i + 1}"
                )

            try:
                start_time = _parse_vtt_timestamp(timing_parts[0])
                # end timestamp may have positioning settings after it
                end_raw = timing_parts[1].split()[0] if timing_parts[1].split() else timing_parts[1]
                end_time = _parse_vtt_timestamp(end_raw)
            except TranscriptParseError as e:
                raise TranscriptParseError(str(e.reason), location=f"line {i + 1}") from e

            i += 1

            # Collect cue payload lines
            cue_lines = []
            while i < len(lines) and lines[i].strip():
                cue_lines.append(lines[i].strip())
                i += 1

            if not cue_lines:
                continue

            # Extract speaker from first line if it contains "<v SpeakerName>" or "SpeakerName: "
            speaker = current_speaker or "Unknown"
            text_lines = []
            for cue_line in cue_lines:
                v_match = re.match(r"<v\s+([^>]+)>\s*(.*)", cue_line)
                if v_match:
                    speaker = v_match.group(1).strip()
                    rest = v_match.group(2).strip()
                    if rest:
                        text_lines.append(re.sub(r"<[^>]+>", "", rest).strip())
                elif ":" in cue_line:
                    # "SpeakerName: text" inline format
                    potential_speaker, _, rest = cue_line.partition(":")
                    if len(potential_speaker.split()) <= 3 and potential_speaker.strip():
                        speaker = potential_speaker.strip()
                        cleaned = re.sub(r"<[^>]+>", "", rest).strip()
                        if cleaned:
                            text_lines.append(cleaned)
                    else:
                        text_lines.append(re.sub(r"<[^>]+>", "", cue_line).strip())
                else:
                    text_lines.append(re.sub(r"<[^>]+>", "", cue_line).strip())

            # Also check cue_id for speaker hint
            if cue_id and not v_match if cue_lines else False:
                pass  # cue_id typically is a numeric index

            full_text = " ".join(t for t in text_lines if t).strip()
            if not full_text:
                continue

            segments.append(TranscriptSegment(
                speaker_label=speaker,
                start_time=start_time,
                end_time=end_time,
                text=full_text,
                segment_index=segment_index,
            ))
            segment_index += 1

        if not segments:
            raise TranscriptParseError("No transcript segments found in VTT file")

        return segments
