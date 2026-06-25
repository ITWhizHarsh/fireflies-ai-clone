from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator
import re


# ---------------------------------------------------------------------------
# Error envelope
# ---------------------------------------------------------------------------

class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


# ---------------------------------------------------------------------------
# Participant
# ---------------------------------------------------------------------------

class ParticipantOut(BaseModel):
    id: int
    name: str
    position: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Tag
# ---------------------------------------------------------------------------

class TagOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)

    @field_validator("name")
    @classmethod
    def name_not_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Tag name cannot be whitespace only")
        return v.strip()


# ---------------------------------------------------------------------------
# Transcript segment
# ---------------------------------------------------------------------------

class TranscriptSegmentOut(BaseModel):
    id: int
    segment_index: int
    speaker_label: str
    start_time: float
    end_time: Optional[float]
    text: str
    highlight: Optional["HighlightOut"] = None
    comments: List["CommentOut"] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

class SummaryOut(BaseModel):
    id: int
    summary_text: Optional[str]
    generation_status: str
    generation_error: Optional[str]
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Action item
# ---------------------------------------------------------------------------

class ActionItemOut(BaseModel):
    id: int
    meeting_id: int
    description: str
    is_complete: bool
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


class ActionItemCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)

    @field_validator("description")
    @classmethod
    def description_not_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Description cannot be whitespace only")
        return v


class ActionItemUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    is_complete: Optional[bool] = None

    @field_validator("description")
    @classmethod
    def description_not_whitespace(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Description cannot be whitespace only")
        return v


# ---------------------------------------------------------------------------
# Key topic
# ---------------------------------------------------------------------------

class KeyTopicOut(BaseModel):
    id: int
    topic: str
    position: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------

class CommentOut(BaseModel):
    id: int
    segment_id: int
    body: str
    created_at: int
    updated_at: int

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=1000)

    @field_validator("body")
    @classmethod
    def body_not_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Comment body cannot be whitespace only")
        return v


# ---------------------------------------------------------------------------
# Highlight
# ---------------------------------------------------------------------------

class HighlightOut(BaseModel):
    id: int
    color: str
    created_at: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Soundbite
# ---------------------------------------------------------------------------

class SoundbitOut(BaseModel):
    id: int
    meeting_id: int
    label: Optional[str]
    start_time: float
    end_time: float
    created_at: int

    model_config = {"from_attributes": True}


class SoundbitCreate(BaseModel):
    label: Optional[str] = None
    start_time: float = Field(..., ge=0)
    end_time: float

    @field_validator("end_time")
    @classmethod
    def end_gte_start(cls, v: float, info) -> float:
        start = info.data.get("start_time")
        if start is not None and v < start:
            raise ValueError("end_time must be >= start_time")
        return v


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: int

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)

    @field_validator("question")
    @classmethod
    def question_not_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Question cannot be whitespace only")
        return v


# ---------------------------------------------------------------------------
# Meeting
# ---------------------------------------------------------------------------

class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    meeting_date: str  # ISO 8601 YYYY-MM-DD
    participants: List[str] = Field(default_factory=list, max_length=100)
    transcript_text: Optional[str] = Field(None, max_length=1_000_000)
    duration_seconds: int = Field(default=0, ge=0)

    @field_validator("title")
    @classmethod
    def title_not_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be whitespace only")
        return v

    @field_validator("meeting_date")
    @classmethod
    def valid_date(cls, v: str) -> str:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("meeting_date must be in YYYY-MM-DD format")
        return v

    @field_validator("participants", mode="before")
    @classmethod
    def validate_participants(cls, v: Any) -> Any:
        if not isinstance(v, list):
            return v
        for p in v:
            if not isinstance(p, str) or not p.strip():
                raise ValueError("Participant names must be non-empty strings")
        return v


class MeetingUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    participants: List[str] = Field(default_factory=list, max_length=50)

    @field_validator("title")
    @classmethod
    def title_not_whitespace(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be whitespace only")
        return v


class MeetingListItem(BaseModel):
    id: int
    title: str
    meeting_date: str
    duration_seconds: int
    participants: List[str]
    tags: List[str]
    created_at: int

    model_config = {"from_attributes": True}


class MeetingDetail(BaseModel):
    id: int
    title: str
    meeting_date: str
    duration_seconds: int
    media_url: Optional[str]
    created_at: int
    updated_at: int
    participants: List[ParticipantOut]
    transcript_segments: List[TranscriptSegmentOut]
    summary: Optional[SummaryOut]
    action_items: List[ActionItemOut]
    key_topics: List[KeyTopicOut]
    soundbites: List[SoundbitOut]
    tags: List[TagOut]
    chat_messages: List[ChatMessageOut]

    model_config = {"from_attributes": True}


# Update forward references
TranscriptSegmentOut.model_rebuild()
