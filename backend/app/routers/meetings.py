from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import json

from app.database import get_db
from app.schemas.schemas import (
    MeetingCreate, MeetingUpdate, MeetingListItem, MeetingDetail,
    SoundbitCreate, TagCreate, ChatRequest, ErrorResponse, ErrorDetail,
    SoundbitOut, ChatMessageOut
)
from app.services import meeting_service, summary_service, annotation_service, export_service, tag_service, chat_service
from app.parsers.base import TranscriptParseError
from app.llm.base import SummaryProvider
from app.llm.mock_provider import MockSummaryProvider
from app.llm.gemini_provider import GeminiSummaryProvider
from app.config import get_settings

router = APIRouter(prefix="/meetings", tags=["meetings"])


def get_llm_provider() -> SummaryProvider:
    settings = get_settings()
    if settings.GEMINI_API_KEY:
        return GeminiSummaryProvider(api_key=settings.GEMINI_API_KEY)
    return MockSummaryProvider()


@router.get("", response_model=List[dict])
def list_meetings(
    search: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    tags: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List all meetings with optional filtering."""
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None
    return meeting_service.list_meetings(db, search=search, from_date=from_date, to_date=to_date, tags=tag_list)


@router.get("/{meeting_id}", response_model=dict)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    """Get full meeting detail bundle."""
    meeting = meeting_service.get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": f"Meeting {meeting_id} not found"}})

    return _serialize_meeting_detail(meeting)


@router.post("", response_model=dict, status_code=201)
def create_meeting(
    data: MeetingCreate,
    db: Session = Depends(get_db),
    provider: SummaryProvider = Depends(get_llm_provider),
):
    """Create a meeting with optional pasted transcript."""
    try:
        meeting = meeting_service.create_meeting(
            db=db,
            data=data,
            transcript_text=data.transcript_text,
            transcript_extension=".txt",
        )
    except TranscriptParseError as e:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "PARSE_ERROR", "message": str(e), "field": "transcript_text"}},
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "VALIDATION_ERROR", "message": str(e)}},
        )

    # Trigger async summary generation if transcript exists
    if data.transcript_text and data.transcript_text.strip():
        try:
            summary_service.generate_summary(db, meeting.id, provider)
        except Exception:
            pass  # Non-blocking — summary failure doesn't fail meeting creation

    return _serialize_meeting_detail(meeting_service.get_meeting(db, meeting.id))


@router.post("/upload", response_model=dict, status_code=201)
async def upload_meeting(
    title: str = Form(...),
    meeting_date: str = Form(...),
    participants: str = Form(default="[]"),
    duration_seconds: int = Form(default=0),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    provider: SummaryProvider = Depends(get_llm_provider),
):
    """Create a meeting from an uploaded transcript file."""
    # Validate file extension
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in (".txt", ".vtt", ".json"):
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "INVALID_FILE_TYPE", "message": f"Unsupported file extension '{ext}'. Use .txt, .vtt, or .json", "field": "file"}},
        )

    # Read file content
    content_bytes = await file.read()
    if len(content_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "FILE_TOO_LARGE", "message": "File exceeds 10 MB limit", "field": "file"}},
        )

    content = content_bytes.decode("utf-8", errors="replace")

    # Parse participants
    try:
        parts_list = json.loads(participants) if participants else []
        if not isinstance(parts_list, list):
            parts_list = []
    except Exception:
        parts_list = []

    data = MeetingCreate(
        title=title,
        meeting_date=meeting_date,
        participants=parts_list,
        duration_seconds=duration_seconds,
    )

    try:
        meeting = meeting_service.upload_meeting(
            db=db,
            data=data,
            file_content=content,
            file_extension=ext,
        )
    except TranscriptParseError as e:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "PARSE_ERROR", "message": str(e), "field": "file"}},
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "VALIDATION_ERROR", "message": str(e)}},
        )

    # Trigger summary generation
    try:
        summary_service.generate_summary(db, meeting.id, provider)
    except Exception:
        pass

    return _serialize_meeting_detail(meeting_service.get_meeting(db, meeting.id))


@router.put("/{meeting_id}", response_model=dict)
def update_meeting(
    meeting_id: int,
    data: MeetingUpdate,
    db: Session = Depends(get_db),
):
    """Update meeting title and participants."""
    try:
        meeting = meeting_service.update_meeting(db, meeting_id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "VALIDATION_ERROR", "message": str(e)}},
        )

    if not meeting:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": f"Meeting {meeting_id} not found"}},
        )

    return _serialize_meeting_detail(meeting_service.get_meeting(db, meeting.id))


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    """Delete a meeting and all its data."""
    deleted = meeting_service.delete_meeting(db, meeting_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": f"Meeting {meeting_id} not found"}},
        )
    return Response(status_code=204)


@router.post("/{meeting_id}/summary:generate", response_model=dict)
def generate_summary(
    meeting_id: int,
    db: Session = Depends(get_db),
    provider: SummaryProvider = Depends(get_llm_provider),
):
    """Trigger LLM summary generation for a meeting."""
    meeting = meeting_service.get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Meeting not found"}})

    summary = summary_service.generate_summary(db, meeting_id, provider)
    if not summary:
        raise HTTPException(status_code=500, detail={"error": {"code": "GENERATION_FAILED", "message": "Summary generation failed"}})

    return {
        "id": summary.id,
        "meeting_id": summary.meeting_id,
        "summary_text": summary.summary_text,
        "generation_status": summary.generation_status,
        "generation_error": summary.generation_error,
    }


@router.get("/{meeting_id}/transcript.json")
def get_transcript_json(meeting_id: int, db: Session = Depends(get_db)):
    """Return normalized JSON transcript."""
    json_str = meeting_service.get_transcript_json(db, meeting_id)
    if json_str is None:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Meeting not found"}})
    return Response(content=json_str, media_type="application/json")


@router.post("/{meeting_id}/soundbites", response_model=dict, status_code=201)
def create_soundbite(
    meeting_id: int,
    data: SoundbitCreate,
    db: Session = Depends(get_db),
):
    """Create a soundbite for a meeting."""
    try:
        soundbite = annotation_service.create_soundbite(db, meeting_id, data)
    except LookupError as e:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": str(e)}})
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "VALIDATION_ERROR", "message": str(e)}})

    return {
        "id": soundbite.id,
        "meeting_id": soundbite.meeting_id,
        "label": soundbite.label,
        "start_time": soundbite.start_time,
        "end_time": soundbite.end_time,
        "created_at": soundbite.created_at,
    }


@router.post("/{meeting_id}/tags", response_model=dict, status_code=201)
def add_tag(
    meeting_id: int,
    data: TagCreate,
    db: Session = Depends(get_db),
):
    """Add a tag to a meeting."""
    try:
        tag = tag_service.add_tag(db, meeting_id, data.name)
    except LookupError as e:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": str(e)}})
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "VALIDATION_ERROR", "message": str(e)}})

    return {"id": tag.id, "name": tag.name}


@router.delete("/{meeting_id}/tags/{tag_name}", status_code=204)
def remove_tag(
    meeting_id: int,
    tag_name: str,
    db: Session = Depends(get_db),
):
    """Remove a tag from a meeting."""
    removed = tag_service.remove_tag(db, meeting_id, tag_name)
    if not removed:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": f"Tag '{tag_name}' not found on this meeting"}})
    return Response(status_code=204)


@router.get("/{meeting_id}/export")
def export_meeting(
    meeting_id: int,
    kind: str = Query(..., description="transcript or summary"),
    format: str = Query(..., description="pdf, md, or txt"),
    db: Session = Depends(get_db),
):
    """Export meeting content as PDF, Markdown, or TXT."""
    try:
        content, content_type = export_service.export_meeting(db, meeting_id, kind, format)
    except LookupError as e:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": str(e)}})
    except ValueError as e:
        status = 415 if "format" in str(e).lower() else 400
        raise HTTPException(status_code=status, detail={"error": {"code": "UNSUPPORTED_FORMAT", "message": str(e)}})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": {"code": "EXPORT_FAILED", "message": str(e)}})

    ext_map = {"text/plain": "txt", "text/markdown": "md", "application/pdf": "pdf"}
    ext = ext_map.get(content_type, "bin")
    filename = f"{meeting_id}_{kind}.{ext}"

    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{meeting_id}/chat", response_model=dict)
def chat_with_meeting(
    meeting_id: int,
    data: ChatRequest,
    db: Session = Depends(get_db),
    provider: SummaryProvider = Depends(get_llm_provider),
):
    """Ask a question about a meeting."""
    try:
        result = chat_service.ask_question(db, meeting_id, data.question, provider)
    except LookupError as e:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": str(e)}})
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "VALIDATION_ERROR", "message": str(e)}})
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail={"error": {"code": "GENERATION_FAILED", "message": str(e)}})

    return result


def _serialize_meeting_detail(meeting) -> dict:
    """Serialize a meeting ORM object to a dict for the API response."""
    if not meeting:
        return {}

    segments = []
    for seg in meeting.transcript_segments:
        seg_dict = {
            "id": seg.id,
            "segment_index": seg.segment_index,
            "speaker_label": seg.speaker_label,
            "start_time": seg.start_time,
            "end_time": seg.end_time,
            "text": seg.text,
            "highlight": None,
            "comments": [],
        }
        if seg.highlight:
            seg_dict["highlight"] = {
                "id": seg.highlight.id,
                "color": seg.highlight.color,
                "created_at": seg.highlight.created_at,
            }
        seg_dict["comments"] = [
            {"id": c.id, "segment_id": c.segment_id, "body": c.body, "created_at": c.created_at, "updated_at": c.updated_at}
            for c in seg.comments
        ]
        segments.append(seg_dict)

    return {
        "id": meeting.id,
        "title": meeting.title,
        "meeting_date": meeting.meeting_date,
        "duration_seconds": meeting.duration_seconds,
        "media_url": meeting.media_url,
        "created_at": meeting.created_at,
        "updated_at": meeting.updated_at,
        "participants": [{"id": p.id, "name": p.name, "position": p.position} for p in meeting.participants],
        "transcript_segments": segments,
        "summary": {
            "id": meeting.summary.id,
            "summary_text": meeting.summary.summary_text,
            "generation_status": meeting.summary.generation_status,
            "generation_error": meeting.summary.generation_error,
            "created_at": meeting.summary.created_at,
            "updated_at": meeting.summary.updated_at,
        } if meeting.summary else None,
        "action_items": [
            {"id": a.id, "meeting_id": a.meeting_id, "description": a.description,
             "is_complete": bool(a.is_complete), "created_at": a.created_at, "updated_at": a.updated_at}
            for a in meeting.action_items
        ],
        "key_topics": [{"id": t.id, "topic": t.topic, "position": t.position} for t in meeting.key_topics],
        "soundbites": [
            {"id": s.id, "meeting_id": s.meeting_id, "label": s.label,
             "start_time": s.start_time, "end_time": s.end_time, "created_at": s.created_at}
            for s in meeting.soundbites
        ],
        "tags": [{"id": mt.tag.id, "name": mt.tag.name} for mt in meeting.meeting_tags],
        "chat_messages": [
            {"id": c.id, "role": c.role, "content": c.content, "created_at": c.created_at}
            for c in meeting.chat_messages
        ],
    }
