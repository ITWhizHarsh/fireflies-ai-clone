import re
from typing import Optional

from app.parsers.base import TranscriptSegment, TranscriptParseError, MAX_FILE_SIZE


# Pattern: "SPEAKER_NAME: text" optionally followed by timestamp "at HH:MM:SS" or "(HH:MM:SS)"
_SPEAKER_COLON_PATTERN = re.compile(
    r"^(?P<speaker>[^:\n]+?)\s*:\s*(?P<text>.+?)(?:\s+(?:at\s+)?(?P<ts>\d{1,2}:\d{2}(?::\d{2})?))?$",
    re.MULTILINE,
)

# Pattern: "SPEAKER [HH:MM:SS] text" or "SPEAKER (HH:MM:SS) text"
_SPEAKER_BRACKET_PATTERN = re.compile(
    r"^(?P<speaker>[^\[\(\n]+?)\s*[\[\(](?P<ts>\d{1,2}:\d{2}(?::\d{2})?)[\]\)]\s*(?P<text>.+)$",
    re.MULTILINE,
)

# Pattern: "[HH:MM:SS] SPEAKER: text"
_TIMESTAMP_FIRST_PATTERN = re.compile(
    r"^\[?(?P<ts>\d{1,2}:\d{2}(?::\d{2})?)\]?\s+(?P<speaker>[^:\n]+?)\s*:\s*(?P<text>.+)$",
    re.MULTILINE,
)


def _parse_timestamp(ts: Optional[str]) -> float:
    """Convert HH:MM:SS or MM:SS string to seconds float."""
    if ts is None:
        return 0.0
    parts = ts.strip().split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    else:
        return float(parts[0])


class TxtParser:
    """Parser for plain-text transcript formats."""

    extension = ".txt"

    def parse(self, raw: str) -> list[TranscriptSegment]:
        if len(raw.encode("utf-8")) > MAX_FILE_SIZE:
            raise TranscriptParseError("File exceeds 10 MB size limit")

        segments = self._try_bracket_format(raw)
        if not segments:
            segments = self._try_timestamp_first(raw)
        if not segments:
            segments = self._try_colon_format(raw)
        if not segments:
            segments = self._try_simple_multiline(raw)

        if not segments:
            raise TranscriptParseError(
                "No transcript segments could be parsed from the .txt file. "
                "Expected format: 'SPEAKER: text' or 'SPEAKER [HH:MM:SS] text'"
            )

        return segments

    def _try_bracket_format(self, raw: str) -> list[TranscriptSegment]:
        matches = list(_SPEAKER_BRACKET_PATTERN.finditer(raw))
        if not matches:
            return []
        segments = []
        for i, m in enumerate(matches):
            speaker = m.group("speaker").strip()
            ts = m.group("ts")
            text = m.group("text").strip()
            if not speaker or not text:
                continue
            segments.append(TranscriptSegment(
                speaker_label=speaker,
                start_time=_parse_timestamp(ts),
                end_time=None,
                text=text,
                segment_index=i,
            ))
        return segments

    def _try_timestamp_first(self, raw: str) -> list[TranscriptSegment]:
        matches = list(_TIMESTAMP_FIRST_PATTERN.finditer(raw))
        if not matches:
            return []
        segments = []
        for i, m in enumerate(matches):
            speaker = m.group("speaker").strip()
            ts = m.group("ts")
            text = m.group("text").strip()
            if not speaker or not text:
                continue
            segments.append(TranscriptSegment(
                speaker_label=speaker,
                start_time=_parse_timestamp(ts),
                end_time=None,
                text=text,
                segment_index=i,
            ))
        return segments

    def _try_colon_format(self, raw: str) -> list[TranscriptSegment]:
        """Parse 'SPEAKER: text [optional timestamp]' format."""
        lines = [l.strip() for l in raw.splitlines() if l.strip()]
        segments = []
        ts_counter = 0.0
        for i, line in enumerate(lines):
            m = _SPEAKER_COLON_PATTERN.match(line)
            if not m:
                continue
            speaker = m.group("speaker").strip()
            text = m.group("text").strip()
            ts_str = m.group("ts")
            if not speaker or not text:
                continue
            ts = _parse_timestamp(ts_str) if ts_str else ts_counter
            ts_counter = ts + 5.0  # assume 5s gaps when no timestamps
            segments.append(TranscriptSegment(
                speaker_label=speaker,
                start_time=ts,
                end_time=None,
                text=text,
                segment_index=len(segments),
            ))
        return segments

    def _try_simple_multiline(self, raw: str) -> list[TranscriptSegment]:
        """Last-resort: split by double-newline blocks, treat first word as speaker if colon exists."""
        blocks = [b.strip() for b in re.split(r"\n\s*\n", raw) if b.strip()]
        segments = []
        ts_counter = 0.0
        for block in blocks:
            first_line = block.split("\n")[0]
            if ":" in first_line:
                speaker, _, rest = first_line.partition(":")
                speaker = speaker.strip()
                text_parts = [rest.strip()] + block.split("\n")[1:]
                text = " ".join(p for p in text_parts if p.strip())
            else:
                speaker = "Unknown"
                text = block.replace("\n", " ").strip()
            if not text:
                continue
            segments.append(TranscriptSegment(
                speaker_label=speaker or "Unknown",
                start_time=ts_counter,
                end_time=None,
                text=text,
                segment_index=len(segments),
            ))
            ts_counter += 5.0
        return segments
