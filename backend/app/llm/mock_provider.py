import hashlib
from app.llm.base import GenerationResult


class MockSummaryProvider:
    """Deterministic mock provider — always available, no API key required.

    Generates realistic-looking fake summaries based on transcript length so
    the output is consistent for the same input (useful for testing).
    """

    def is_available(self) -> bool:
        return True

    def generate(self, transcript_text: str) -> GenerationResult:
        # Derive a deterministic seed from the transcript
        digest = hashlib.md5(transcript_text.encode("utf-8")).hexdigest()
        seed = int(digest[:8], 16)

        word_count = len(transcript_text.split())
        segment_count = transcript_text.count("\n") + 1

        topics_pool = [
            "Product Roadmap", "Q3 Planning", "Engineering Updates",
            "Design Review", "Sprint Retrospective", "Customer Feedback",
            "Technical Debt", "Team Sync", "Architecture Discussion",
            "Release Planning", "Bug Triage", "Performance Review",
        ]

        action_pool = [
            "Follow up with the team on the action items discussed",
            "Schedule a follow-up meeting for next week",
            "Create tickets for the identified issues",
            "Share the meeting notes with stakeholders",
            "Review the proposed architecture changes",
            "Update the project timeline in the task tracker",
            "Prepare a demo for the next sprint review",
            "Document the decisions made in this meeting",
        ]

        # Select topics and actions deterministically
        num_topics = 3 + (seed % 3)
        num_actions = 2 + (seed % 4)

        selected_topics = [topics_pool[(seed + i) % len(topics_pool)] for i in range(num_topics)]
        selected_actions = [action_pool[(seed + i) % len(action_pool)] for i in range(num_actions)]

        summary = (
            f"This meeting covered {num_topics} key topics across approximately "
            f"{segment_count} discussion segments. "
            f"The team reviewed current progress, identified blockers, and aligned on "
            f"next steps. Key decisions were made regarding {selected_topics[0]} and "
            f"{selected_topics[1]}. "
            f"Participants agreed on {num_actions} action items to be completed before the next sync. "
            f"Overall, the meeting was productive with clear outcomes and ownership assigned."
        )

        return GenerationResult(
            summary_text=summary,
            action_items=selected_actions,
            key_topics=selected_topics,
        )

    def answer_question(self, transcript_text: str, question: str) -> str:
        digest = hashlib.md5((transcript_text + question).encode("utf-8")).hexdigest()
        seed = int(digest[:8], 16)
        responses = [
            "Based on the transcript, the team discussed this topic in detail and reached a consensus.",
            "The transcript indicates that this was a key point of discussion, with several participants contributing.",
            "According to the meeting transcript, this was addressed but requires follow-up.",
            "The transcript shows that the team acknowledged this and assigned it as an action item.",
            "This was briefly mentioned in the meeting. The full context is available in the transcript above.",
        ]
        return responses[seed % len(responses)]
