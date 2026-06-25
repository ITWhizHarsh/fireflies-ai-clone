import time
from typing import Optional
from sqlalchemy.orm import Session

from app.models.models import Meeting, Summary, ActionItem, KeyTopic
from app.llm.base import SummaryProvider


def generate_summary(
    db: Session,
    meeting_id: int,
    provider: SummaryProvider,
) -> Optional[Summary]:
    """Generate summary, action items, and key topics for a meeting.

    On failure: records generation_status='failed' without mutating prior data.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return None

    # Build transcript text from segments
    transcript_text = "\n".join(
        f"{seg.speaker_label}: {seg.text}" for seg in meeting.transcript_segments
    )

    if not transcript_text.strip():
        # No transcript — mark as failed
        summary = _get_or_create_summary(db, meeting_id)
        summary.generation_status = "failed"
        summary.generation_error = "No transcript available to generate summary from"
        summary.updated_at = int(time.time())
        db.commit()
        db.refresh(summary)
        return summary

    summary = _get_or_create_summary(db, meeting_id)

    try:
        result = provider.generate(transcript_text)

        summary.summary_text = result.summary_text
        summary.generation_status = "generated"
        summary.generation_error = None
        summary.updated_at = int(time.time())

        # Replace action items
        db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).delete()
        now = int(time.time())
        for desc in result.action_items:
            if desc.strip():
                db.add(ActionItem(
                    meeting_id=meeting_id,
                    description=desc.strip()[:500],
                    is_complete=0,
                    created_at=now,
                    updated_at=now,
                ))

        # Replace key topics
        db.query(KeyTopic).filter(KeyTopic.meeting_id == meeting_id).delete()
        for i, topic in enumerate(result.key_topics):
            if topic.strip():
                db.add(KeyTopic(
                    meeting_id=meeting_id,
                    topic=topic.strip(),
                    position=i,
                ))

        db.commit()
        db.refresh(summary)
        return summary

    except Exception as e:
        # Preserve existing data — only update status/error
        db.rollback()

        # Re-fetch summary to avoid stale state
        summary = _get_or_create_summary(db, meeting_id)
        summary.generation_status = "failed"
        summary.generation_error = str(e)[:500]
        summary.updated_at = int(time.time())
        try:
            db.commit()
            db.refresh(summary)
        except Exception:
            db.rollback()

        return summary


def _get_or_create_summary(db: Session, meeting_id: int) -> Summary:
    summary = db.query(Summary).filter(Summary.meeting_id == meeting_id).first()
    if not summary:
        now = int(time.time())
        summary = Summary(
            meeting_id=meeting_id,
            summary_text=None,
            generation_status="none",
            created_at=now,
            updated_at=now,
        )
        db.add(summary)
        db.flush()
    return summary
