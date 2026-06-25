from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import CommentCreate
from app.services import annotation_service

router = APIRouter(prefix="/segments", tags=["segments"])


@router.post("/{segment_id}/comments", response_model=dict, status_code=201)
def add_comment(
    segment_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
):
    """Add a comment to a transcript segment."""
    try:
        comment = annotation_service.create_comment(db, segment_id, data)
    except LookupError as e:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": str(e)}})
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "VALIDATION_ERROR", "message": str(e), "field": "body"}})

    return {
        "id": comment.id,
        "segment_id": comment.segment_id,
        "body": comment.body,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
    }


@router.post("/{segment_id}/highlight", response_model=dict, status_code=201)
def add_highlight(
    segment_id: int,
    color: str = "yellow",
    db: Session = Depends(get_db),
):
    """Add a highlight to a transcript segment."""
    try:
        highlight = annotation_service.add_highlight(db, segment_id, color)
    except LookupError as e:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": str(e)}})

    return {
        "id": highlight.id,
        "segment_id": highlight.segment_id,
        "color": highlight.color,
        "created_at": highlight.created_at,
    }


@router.delete("/{segment_id}/highlight", status_code=204)
def remove_highlight(segment_id: int, db: Session = Depends(get_db)):
    """Remove a highlight from a transcript segment."""
    removed = annotation_service.remove_highlight(db, segment_id)
    if not removed:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": f"No highlight found for segment {segment_id}"}},
        )
    return Response(status_code=204)
