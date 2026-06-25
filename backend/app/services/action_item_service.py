import time
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.models import ActionItem, Meeting
from app.schemas.schemas import ActionItemCreate, ActionItemUpdate


def list_action_items(db: Session, meeting_id: int) -> List[ActionItem]:
    """List action items for a meeting, ordered oldest to newest."""
    return (
        db.query(ActionItem)
        .filter(ActionItem.meeting_id == meeting_id)
        .order_by(ActionItem.created_at.asc())
        .all()
    )


def create_action_item(db: Session, meeting_id: int, data: ActionItemCreate) -> ActionItem:
    """Create a new action item for a meeting."""
    description = data.description.strip()
    if not description:
        raise ValueError("Description cannot be empty or whitespace only")
    if len(description) > 500:
        raise ValueError("Description cannot exceed 500 characters")

    # Verify meeting exists
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise LookupError(f"Meeting {meeting_id} not found")

    now = int(time.time())
    item = ActionItem(
        meeting_id=meeting_id,
        description=description,
        is_complete=0,
        created_at=now,
        updated_at=now,
    )
    db.add(item)
    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise
    return item


def update_action_item(
    db: Session, item_id: int, data: ActionItemUpdate
) -> Optional[ActionItem]:
    """Update action item description and/or completion status."""
    item = db.query(ActionItem).filter(ActionItem.id == item_id).first()
    if not item:
        return None

    if data.description is not None:
        description = data.description.strip()
        if not description:
            raise ValueError("Description cannot be empty or whitespace only")
        if len(description) > 500:
            raise ValueError("Description cannot exceed 500 characters")
        item.description = description

    if data.is_complete is not None:
        item.is_complete = 1 if data.is_complete else 0

    item.updated_at = int(time.time())

    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise

    return item


def delete_action_item(db: Session, item_id: int) -> bool:
    """Delete an action item."""
    item = db.query(ActionItem).filter(ActionItem.id == item_id).first()
    if not item:
        return False
    try:
        db.delete(item)
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise
