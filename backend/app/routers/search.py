from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.services import search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=List[dict])
def global_search(
    q: str = Query(..., min_length=1, max_length=200),
    db: Session = Depends(get_db),
):
    """Search across all meetings (title, summary, transcript)."""
    if not q.strip():
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "VALIDATION_ERROR", "message": "Search query cannot be empty", "field": "q"}},
        )

    results = search_service.global_search(db, q)
    return results
