from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable


@dataclass
class GenerationResult:
    """Result from LLM summary generation."""
    summary_text: str
    action_items: list[str] = field(default_factory=list)
    key_topics: list[str] = field(default_factory=list)


@runtime_checkable
class SummaryProvider(Protocol):
    """Protocol for LLM summary providers."""

    def is_available(self) -> bool:
        """Return True if this provider is ready to generate."""
        ...

    def generate(self, transcript_text: str) -> GenerationResult:
        """Generate summary, action items, and key topics from transcript text.

        Raises:
            Exception: on generation failure.
        """
        ...

    def answer_question(self, transcript_text: str, question: str) -> str:
        """Answer a natural-language question about the transcript.

        Raises:
            Exception: on generation failure.
        """
        ...
