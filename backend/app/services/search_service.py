from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.models import Meeting, TranscriptSegment, Summary


def global_search(db: Session, q: str) -> List[Dict[str, Any]]:
    """Search across meeting titles, summaries, and transcript segments.

    Uses LIKE-based search (FTS5 fallback always works with SQLite).
    Returns matching meetings with excerpt snippets.
    """
    if not q or not q.strip():
        return []

    search_term = q.strip()
    search_lower = f"%{search_term.lower()}%"

    results = []
    seen_ids = set()

    # Search meeting titles
    meetings_by_title = (
        db.query(Meeting)
        .filter(Meeting.title.ilike(search_lower))
        .all()
    )
    for m in meetings_by_title:
        if m.id not in seen_ids:
            seen_ids.add(m.id)
            results.append(_build_result(m, "title", m.title, search_term))

    # Search summaries
    summaries = (
        db.query(Summary)
        .filter(Summary.summary_text.ilike(search_lower))
        .all()
    )
    for s in summaries:
        if s.meeting_id not in seen_ids:
            meeting = db.query(Meeting).filter(Meeting.id == s.meeting_id).first()
            if meeting:
                seen_ids.add(meeting.id)
                excerpt = _extract_excerpt(s.summary_text or "", search_term)
                results.append(_build_result(meeting, "summary", excerpt, search_term))

    # Search transcript segments
    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.text.ilike(search_lower))
        .all()
    )
    for seg in segments:
        if seg.meeting_id not in seen_ids:
            meeting = db.query(Meeting).filter(Meeting.id == seg.meeting_id).first()
            if meeting:
                seen_ids.add(meeting.id)
                excerpt = _extract_excerpt(seg.text, search_term)
                results.append(_build_result(meeting, "transcript", excerpt, search_term))

    return results


def _extract_excerpt(text: str, query: str, context_chars: int = 120) -> str:
    """Extract a snippet around the first occurrence of query in text."""
    if not text:
        return ""
    idx = text.lower().find(query.lower())
    if idx == -1:
        return text[:context_chars] + ("..." if len(text) > context_chars else "")

    start = max(0, idx - context_chars // 2)
    end = min(len(text), idx + len(query) + context_chars // 2)
    excerpt = text[start:end]
    if start > 0:
        excerpt = "..." + excerpt
    if end < len(text):
        excerpt = excerpt + "..."
    return excerpt


def _build_result(meeting: Meeting, match_type: str, excerpt: str, query: str) -> Dict[str, Any]:
    participants = [p.name for p in meeting.participants]
    tags = [mt.tag.name for mt in meeting.meeting_tags]
    return {
        "id": meeting.id,
        "title": meeting.title,
        "meeting_date": meeting.meeting_date,
        "duration_seconds": meeting.duration_seconds,
        "participants": participants,
        "tags": tags,
        "created_at": meeting.created_at,
        "match_type": match_type,
        "excerpt": excerpt,
    }
