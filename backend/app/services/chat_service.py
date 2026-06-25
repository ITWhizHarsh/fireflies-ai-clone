import time
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.models import Meeting, ChatMessage
from app.llm.base import SummaryProvider


def ask_question(
    db: Session,
    meeting_id: int,
    question: str,
    provider: SummaryProvider,
) -> dict:
    """Ask a question about a meeting and persist the conversation."""
    question = question.strip()
    if not question:
        raise ValueError("Question cannot be empty")
    if len(question) > 1000:
        raise ValueError("Question cannot exceed 1000 characters")

    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise LookupError(f"Meeting {meeting_id} not found")

    # Build transcript text
    transcript_text = "\n".join(
        f"{seg.speaker_label}: {seg.text}" for seg in meeting.transcript_segments
    )

    if not transcript_text.strip():
        raise ValueError("No transcript available to answer questions about")

    now = int(time.time())

    # Persist user message
    user_msg = ChatMessage(
        meeting_id=meeting_id,
        role="user",
        content=question,
        created_at=now,
    )
    db.add(user_msg)
    db.flush()

    try:
        answer = provider.answer_question(transcript_text, question)
    except Exception as e:
        db.rollback()
        raise RuntimeError(f"Failed to generate answer: {e}") from e

    # Persist assistant message
    assistant_msg = ChatMessage(
        meeting_id=meeting_id,
        role="assistant",
        content=answer,
        created_at=int(time.time()),
    )
    db.add(assistant_msg)

    try:
        db.commit()
        db.refresh(user_msg)
        db.refresh(assistant_msg)
    except Exception:
        db.rollback()
        raise

    return {
        "question": question,
        "answer": answer,
        "user_message_id": user_msg.id,
        "assistant_message_id": assistant_msg.id,
    }


def get_chat_history(db: Session, meeting_id: int) -> List[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.meeting_id == meeting_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
