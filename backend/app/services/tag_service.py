from typing import List
from sqlalchemy.orm import Session

from app.models.models import Tag, MeetingTag, Meeting


def add_tag(db: Session, meeting_id: int, tag_name: str) -> Tag:
    """Add a tag to a meeting. Tag names are case-insensitive unique."""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise LookupError(f"Meeting {meeting_id} not found")

    name = tag_name.strip()
    if not name:
        raise ValueError("Tag name cannot be empty or whitespace only")
    if len(name) > 50:
        raise ValueError("Tag name cannot exceed 50 characters")

    # Get or create tag (case-insensitive)
    tag = db.query(Tag).filter(Tag.name.ilike(name)).first()
    if not tag:
        tag = Tag(name=name)
        db.add(tag)
        db.flush()

    # Check if already associated
    existing = (
        db.query(MeetingTag)
        .filter(MeetingTag.meeting_id == meeting_id, MeetingTag.tag_id == tag.id)
        .first()
    )
    if existing:
        raise ValueError(f"Tag '{name}' is already associated with this meeting")

    meeting_tag = MeetingTag(meeting_id=meeting_id, tag_id=tag.id)
    db.add(meeting_tag)
    try:
        db.commit()
        db.refresh(tag)
    except Exception:
        db.rollback()
        raise
    return tag


def remove_tag(db: Session, meeting_id: int, tag_name: str) -> bool:
    """Remove a tag from a meeting."""
    name = tag_name.strip()
    tag = db.query(Tag).filter(Tag.name.ilike(name)).first()
    if not tag:
        return False

    meeting_tag = (
        db.query(MeetingTag)
        .filter(MeetingTag.meeting_id == meeting_id, MeetingTag.tag_id == tag.id)
        .first()
    )
    if not meeting_tag:
        return False

    try:
        db.delete(meeting_tag)
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise


def list_tags(db: Session) -> List[Tag]:
    return db.query(Tag).order_by(Tag.name.asc()).all()
