import json
from dataclasses import dataclass
from typing import Optional, Protocol, runtime_checkable


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@dataclass
class TranscriptSegment:
    """Normalized transcript segment - the internal representation."""
    speaker_label: str
    start_time: float
    end_time: Optional[float]
    text: str
    segment_index: int

    def __eq__(self, other) -> bool:
        if not isinstance(other, TranscriptSegment):
            return False
        return (
            self.speaker_label == other.speaker_label
            and self.start_time == other.start_time
            and self.end_time == other.end_time
            and self.text == other.text
            and self.segment_index == other.segment_index
        )

    def is_equivalent_to(self, other: "TranscriptSegment") -> bool:
        """Equivalence as defined by the round-trip property (ignores segment_index position)."""
        return (
            self.speaker_label == other.speaker_label
            and abs(self.start_time - other.start_time) < 1e-9
            and (self.end_time is None) == (other.end_time is None)
            and (self.end_time is None or abs(self.end_time - other.end_time) < 1e-9)
            and self.text == other.text
        )


class TranscriptParseError(Exception):
    """Raised when a transcript file cannot be parsed."""

    def __init__(self, reason: str, location: Optional[str] = None):
        self.reason = reason
        self.location = location
        msg = f"Parse error: {reason}"
        if location:
            msg += f" (at {location})"
        super().__init__(msg)


@runtime_checkable
class TranscriptParser(Protocol):
    """Protocol that all format-specific parsers must implement."""
    extension: str

    def parse(self, raw: str) -> list[TranscriptSegment]:
        """Parse raw text into an ordered list of TranscriptSegments.

        Raises:
            TranscriptParseError: if content does not conform to the format,
                                  exceeds size limits, or yields zero segments.
        """
        ...


def serialize_segments(segments: list[TranscriptSegment]) -> str:
    """Serialize a list of TranscriptSegments into normalized JSON.

    The normalized format preserves segment ordering and is the canonical
    representation used for the round-trip property (Requirement 7.4, 7.5).
    """
    return json.dumps(
        {
            "version": 1,
            "segments": [
                {
                    "index": seg.segment_index,
                    "speaker": seg.speaker_label,
                    "start": seg.start_time,
                    "end": seg.end_time,
                    "text": seg.text,
                }
                for seg in sorted(segments, key=lambda s: s.segment_index)
            ],
        },
        ensure_ascii=False,
        indent=None,
    )
