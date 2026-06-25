import time
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.models import (
    Meeting, Participant, TranscriptSegment, Summary, ActionItem,
    KeyTopic, Tag, MeetingTag, Soundbite, ChatMessage, Highlight, Comment
)
from app.schemas.schemas import MeetingCreate, MeetingUpdate, MeetingListItem, MeetingDetail
from app.parsers.base import serialize_segments, TranscriptParseError
from app.parsers.txt_parser import TxtParser
from app.parsers.vtt_parser import VttParser
from app.parsers.json_parser import JsonParser


_PARSERS = {
    ".txt": TxtParser(),
    ".vtt": VttParser(),
    ".json": JsonParser(),
}


def _get_parser(extension: str):
    parser = _PARSERS.get(extension.lower())
    if parser is None:
        raise ValueError(f"Unsupported transcript format: '{extension}'. Use .txt, .vtt, or .json")
    return parser


def _parse_transcript(text: str, extension: str = ".txt"):
    """Parse transcript text using the appropriate parser."""
    parser = _get_parser(extension)
    segments = parser.parse(text)
    if not segments:
        raise TranscriptParseError("Transcript yielded zero segments")
    return segments


def list_meetings(
    db: Session,
    search: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> List[dict]:
    """List meetings sorted by date desc, title asc with optional filters."""
    query = db.query(Meeting)

    if from_date:
        query = query.filter(Meeting.meeting_date >= from_date)
    if to_date:
        query = query.filter(Meeting.meeting_date <= to_date)

    if tags:
        for tag_name in tags:
            tag_obj = db.query(Tag).filter(Tag.name.ilike(tag_name.strip())).first()
            if tag_obj:
                query = query.filter(
                    Meeting.meeting_tags.any(MeetingTag.tag_id == tag_obj.id)
                )
            else:
                # No meeting can have a tag that doesn't exist
                return []

    meetings = query.order_by(Meeting.meeting_date.desc(), Meeting.title.asc()).all()

    if search:
        search_lower = search.lower()
        filtered = []
        for m in meetings:
            title_match = search_lower in m.title.lower()
            participant_match = any(
                search_lower in p.name.lower() for p in m.participants
            )
            if title_match or participant_match:
                filtered.append(m)
        meetings = filtered

    result = []
    for m in meetings:
        tags_list = [mt.tag.name for mt in m.meeting_tags]
        participants_list = [p.name for p in m.participants]
        result.append({
            "id": m.id,
            "title": m.title,
            "meeting_date": m.meeting_date,
            "duration_seconds": m.duration_seconds,
            "participants": participants_list,
            "tags": tags_list,
            "created_at": m.created_at,
        })

    return result


def get_meeting(db: Session, meeting_id: int) -> Optional[Meeting]:
    """Get a single meeting with all related data."""
    return db.query(Meeting).filter(Meeting.id == meeting_id).first()


def create_meeting(
    db: Session,
    data: MeetingCreate,
    transcript_text: Optional[str] = None,
    transcript_extension: str = ".txt",
) -> Meeting:
    """Create a meeting with optional transcript. Atomic transaction."""
    now = int(time.time())

    meeting = Meeting(
        title=data.title,
        meeting_date=data.meeting_date,
        duration_seconds=data.duration_seconds,
        created_at=now,
        updated_at=now,
    )
    db.add(meeting)
    db.flush()  # Get the ID

    # Add participants
    for i, name in enumerate(data.participants):
        participant = Participant(
            meeting_id=meeting.id,
            name=name.strip(),
            position=i,
        )
        db.add(participant)

    # Parse and store transcript segments
    parsed_segments = []
    if transcript_text and transcript_text.strip():
        try:
            parsed_segments = _parse_transcript(transcript_text, transcript_extension)
        except TranscriptParseError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise TranscriptParseError(str(e))

        for seg in parsed_segments:
            db_seg = TranscriptSegment(
                meeting_id=meeting.id,
                segment_index=seg.segment_index,
                speaker_label=seg.speaker_label,
                start_time=seg.start_time,
                end_time=seg.end_time,
                text=seg.text,
            )
            db.add(db_seg)

    # Create empty summary placeholder
    summary = Summary(
        meeting_id=meeting.id,
        summary_text=None,
        generation_status="none",
        created_at=now,
        updated_at=now,
    )
    db.add(summary)

    try:
        db.commit()
        db.refresh(meeting)
    except Exception as e:
        db.rollback()
        raise

    return meeting


def upload_meeting(
    db: Session,
    data: MeetingCreate,
    file_content: str,
    file_extension: str,
) -> Meeting:
    """Create a meeting from an uploaded transcript file."""
    return create_meeting(
        db=db,
        data=data,
        transcript_text=file_content,
        transcript_extension=file_extension,
    )


def update_meeting(db: Session, meeting_id: int, data: MeetingUpdate) -> Optional[Meeting]:
    """Update meeting title and participants."""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return None

    meeting.title = data.title
    meeting.updated_at = int(time.time())

    # Replace participants
    db.query(Participant).filter(Participant.meeting_id == meeting_id).delete()
    for i, name in enumerate(data.participants):
        db.add(Participant(meeting_id=meeting_id, name=name.strip(), position=i))

    try:
        db.commit()
        db.refresh(meeting)
    except Exception as e:
        db.rollback()
        raise

    return meeting


def delete_meeting(db: Session, meeting_id: int) -> bool:
    """Delete a meeting and all cascade dependents."""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return False

    try:
        db.delete(meeting)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise


def get_transcript_json(db: Session, meeting_id: int) -> Optional[str]:
    """Return serialized normalized JSON for a meeting's transcript."""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return None

    from app.parsers.base import TranscriptSegment as ParsedSegment
    segs = [
        ParsedSegment(
            speaker_label=s.speaker_label,
            start_time=s.start_time,
            end_time=s.end_time,
            text=s.text,
            segment_index=s.segment_index,
        )
        for s in meeting.transcript_segments
    ]
    return serialize_segments(segs)
