import json
from typing import Any, Optional

from app.parsers.base import TranscriptSegment, TranscriptParseError, MAX_FILE_SIZE


class JsonParser:
    """Parser for JSON transcript files.

    Supports two formats:
    1. Our normalized JSON format: {"version": 1, "segments": [...]}
    2. Common third-party format: array of {speaker, text, start, end} objects
    """

    extension = ".json"

    def parse(self, raw: str) -> list[TranscriptSegment]:
        if len(raw.encode("utf-8")) > MAX_FILE_SIZE:
            raise TranscriptParseError("File exceeds 10 MB size limit")

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise TranscriptParseError(
                f"Invalid JSON: {e.msg}", location=f"line {e.lineno}, col {e.colno}"
            ) from e

        # Try normalized format first
        if isinstance(data, dict) and "segments" in data:
            return self._parse_normalized(data)

        # Try array format
        if isinstance(data, list):
            return self._parse_array(data)

        # Try wrapped array formats
        for key in ("transcripts", "transcript", "entries", "items", "results"):
            if isinstance(data, dict) and key in data:
                inner = data[key]
                if isinstance(inner, list):
                    return self._parse_array(inner)

        raise TranscriptParseError(
            "Unrecognized JSON transcript format. Expected array of segment objects "
            "or {\"segments\": [...]} object."
        )

    def _parse_normalized(self, data: dict) -> list[TranscriptSegment]:
        """Parse our own normalized JSON format."""
        segments_raw = data.get("segments", [])
        if not isinstance(segments_raw, list):
            raise TranscriptParseError("'segments' must be an array")

        segments = []
        for i, raw_seg in enumerate(segments_raw):
            if not isinstance(raw_seg, dict):
                raise TranscriptParseError(f"Segment at index {i} is not an object")

            speaker = str(raw_seg.get("speaker", "")).strip()
            if not speaker:
                raise TranscriptParseError(f"Segment {i}: missing or empty 'speaker'", location=f"index {i}")

            start = self._extract_time(raw_seg, "start", i)
            end = self._extract_optional_time(raw_seg, "end", i)
            text = str(raw_seg.get("text", "")).strip()

            if not text:
                raise TranscriptParseError(f"Segment {i}: missing or empty 'text'", location=f"index {i}")

            # Use the 'index' field if present, else use enumeration order
            idx = raw_seg.get("index", i)

            segments.append(TranscriptSegment(
                speaker_label=speaker,
                start_time=start,
                end_time=end,
                text=text,
                segment_index=idx,
            ))

        if not segments:
            raise TranscriptParseError("No segments found in JSON file")

        # Sort by index and re-assign sequential indices
        segments.sort(key=lambda s: s.segment_index)
        for i, seg in enumerate(segments):
            seg.segment_index = i

        return segments

    def _parse_array(self, items: list) -> list[TranscriptSegment]:
        """Parse a flat array of segment objects (third-party format)."""
        if not items:
            raise TranscriptParseError("Empty segments array in JSON file")

        segments = []
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                raise TranscriptParseError(f"Item at index {i} is not an object")

            # Speaker field — try multiple common key names
            speaker = ""
            for key in ("speaker", "speaker_label", "speakerLabel", "name", "participant"):
                val = item.get(key)
                if val:
                    speaker = str(val).strip()
                    break
            if not speaker:
                speaker = f"Speaker {i + 1}"

            # Text field
            text = ""
            for key in ("text", "content", "transcript", "words", "utterance"):
                val = item.get(key)
                if val:
                    text = str(val).strip()
                    break
            if not text:
                raise TranscriptParseError(f"Segment {i}: no text found", location=f"index {i}")

            # Start time
            start = 0.0
            for key in ("start", "start_time", "startTime", "begin", "offset"):
                val = item.get(key)
                if val is not None:
                    try:
                        start = float(val)
                        break
                    except (TypeError, ValueError):
                        pass

            # End time
            end: Optional[float] = None
            for key in ("end", "end_time", "endTime", "finish"):
                val = item.get(key)
                if val is not None:
                    try:
                        end = float(val)
                        break
                    except (TypeError, ValueError):
                        pass

            if start < 0:
                raise TranscriptParseError(
                    f"Segment {i}: start_time must be >= 0 (got {start})", location=f"index {i}"
                )

            segments.append(TranscriptSegment(
                speaker_label=speaker,
                start_time=start,
                end_time=end,
                text=text,
                segment_index=i,
            ))

        return segments

    def _extract_time(self, obj: dict, key: str, index: int) -> float:
        val = obj.get(key)
        if val is None:
            return 0.0
        try:
            t = float(val)
            if t < 0:
                raise TranscriptParseError(
                    f"Segment {index}: {key} must be >= 0 (got {t})", location=f"index {index}"
                )
            return t
        except (TypeError, ValueError):
            raise TranscriptParseError(
                f"Segment {index}: {key} is not a valid number", location=f"index {index}"
            )

    def _extract_optional_time(self, obj: dict, key: str, index: int) -> Optional[float]:
        val = obj.get(key)
        if val is None:
            return None
        try:
            return float(val)
        except (TypeError, ValueError):
            return None
