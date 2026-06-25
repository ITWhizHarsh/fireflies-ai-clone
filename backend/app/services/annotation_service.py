import time
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.models import Comment, Highlight, Soundbite, TranscriptSegment, Meeting
from app.schemas.schemas import CommentCreate, SoundbitCreate


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

def create_comment(db: Session, segment_id: int, data: CommentCreate) -> Comment:
    """Create a comment on a transcript segment."""
    segment = db.query(TranscriptSegment).filter(TranscriptSegment.id == segment_id).first()
    if not segment:
        raise LookupError(f"Transcript segment {segment_id} not found")

    body = data.body.strip()
    if not body:
        raise ValueError("Comment body cannot be empty or whitespace only")
    if len(body) > 1000:
        raise ValueError("Comment body cannot exceed 1000 characters")

    now = int(time.time())
    comment = Comment(
        segment_id=segment_id,
        body=body,
        created_at=now,
        updated_at=now,
    )
    db.add(comment)
    try:
        db.commit()
        db.refresh(comment)
    except Exception:
        db.rollback()
        raise
    return comment


def list_comments(db: Session, segment_id: int) -> List[Comment]:
    return db.query(Comment).filter(Comment.segment_id == segment_id).all()


# ---------------------------------------------------------------------------
# Highlights
# ---------------------------------------------------------------------------

def add_highlight(db: Session, segment_id: int, color: str = "yellow") -> Highlight:
    """Add or update highlight on a transcript segment (one per segment)."""
    segment = db.query(TranscriptSegment).filter(TranscriptSegment.id == segment_id).first()
    if not segment:
        raise LookupError(f"Transcript segment {segment_id} not found")

    # One highlight per segment — upsert
    existing = db.query(Highlight).filter(Highlight.segment_id == segment_id).first()
    if existing:
        return existing

    highlight = Highlight(
        segment_id=segment_id,
        color=color,
        created_at=int(time.time()),
    )
    db.add(highlight)
    try:
        db.commit()
        db.refresh(highlight)
    except Exception:
        db.rollback()
        raise
    return highlight


def remove_highlight(db: Session, segment_id: int) -> bool:
    """Remove highlight from a transcript segment."""
    highlight = db.query(Highlight).filter(Highlight.segment_id == segment_id).first()
    if not highlight:
        return False
    try:
        db.delete(highlight)
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise


# ---------------------------------------------------------------------------
# Soundbites
# ---------------------------------------------------------------------------

def create_soundbite(db: Session, meeting_id: int, data: SoundbitCreate) -> Soundbite:
    """Create a soundbite for a meeting."""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise LookupError(f"Meeting {meeting_id} not found")

    if data.end_time < data.start_time:
        raise ValueError("end_time must be >= start_time")

    soundbite = Soundbite(
        meeting_id=meeting_id,
        label=data.label,
        start_time=data.start_time,
        end_time=data.end_time,
        created_at=int(time.time()),
    )
    db.add(soundbite)
    try:
        db.commit()
        db.refresh(soundbite)
    except Exception:
        db.rollback()
        raise
    return soundbite


def list_soundbites(db: Session, meeting_id: int) -> List[Soundbite]:
    return db.query(Soundbite).filter(Soundbite.meeting_id == meeting_id).all()
