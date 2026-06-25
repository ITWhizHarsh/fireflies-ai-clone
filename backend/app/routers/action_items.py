from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import ActionItemCreate, ActionItemUpdate
from app.services import action_item_service

router = APIRouter(tags=["action-items"])


@router.post("/meetings/{meeting_id}/action-items", response_model=dict, status_code=201)
def create_action_item(
    meeting_id: int,
    data: ActionItemCreate,
    db: Session = Depends(get_db),
):
    """Add an action item to a meeting."""
    try:
        item = action_item_service.create_action_item(db, meeting_id, data)
    except LookupError as e:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": str(e)}})
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "VALIDATION_ERROR", "message": str(e), "field": "description"}})

    return {
        "id": item.id,
        "meeting_id": item.meeting_id,
        "description": item.description,
        "is_complete": bool(item.is_complete),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


@router.put("/action-items/{item_id}", response_model=dict)
def update_action_item(
    item_id: int,
    data: ActionItemUpdate,
    db: Session = Depends(get_db),
):
    """Edit an action item's description or toggle completion."""
    try:
        item = action_item_service.update_action_item(db, item_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "VALIDATION_ERROR", "message": str(e), "field": "description"}})

    if not item:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": f"Action item {item_id} not found"}})

    return {
        "id": item.id,
        "meeting_id": item.meeting_id,
        "description": item.description,
        "is_complete": bool(item.is_complete),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


@router.delete("/action-items/{item_id}", status_code=204)
def delete_action_item(item_id: int, db: Session = Depends(get_db)):
    """Delete an action item."""
    deleted = action_item_service.delete_action_item(db, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": f"Action item {item_id} not found"}})
    return Response(status_code=204)
