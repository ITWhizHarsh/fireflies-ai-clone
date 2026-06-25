import time
from sqlalchemy import (
    Integer, String, Text, Float, Boolean, ForeignKey,
    CheckConstraint, UniqueConstraint, Index, event
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import Optional, List

from app.database import Base


def _now() -> int:
    return int(time.time())


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    meeting_date: Mapped[str] = mapped_column(Text, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    media_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(Integer, nullable=False, default=_now)
    updated_at: Mapped[int] = mapped_column(Integer, nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        CheckConstraint("length(title) BETWEEN 1 AND 200", name="ck_meetings_title_len"),
        CheckConstraint("duration_seconds >= 0", name="ck_meetings_duration"),
        Index("idx_meetings_date_title", "meeting_date", "title"),
    )

    # Relationships
    participants: Mapped[List["Participant"]] = relationship(
        "Participant", back_populates="meeting", cascade="all, delete-orphan", order_by="Participant.position"
    )
    transcript_segments: Mapped[List["TranscriptSegment"]] = relationship(
        "TranscriptSegment", back_populates="meeting", cascade="all, delete-orphan", order_by="TranscriptSegment.segment_index"
    )
    summary: Mapped[Optional["Summary"]] = relationship(
        "Summary", back_populates="meeting", cascade="all, delete-orphan", uselist=False
    )
    action_items: Mapped[List["ActionItem"]] = relationship(
        "ActionItem", back_populates="meeting", cascade="all, delete-orphan", order_by="ActionItem.created_at"
    )
    key_topics: Mapped[List["KeyTopic"]] = relationship(
        "KeyTopic", back_populates="meeting", cascade="all, delete-orphan", order_by="KeyTopic.position"
    )
    soundbites: Mapped[List["Soundbite"]] = relationship(
        "Soundbite", back_populates="meeting", cascade="all, delete-orphan"
    )
    meeting_tags: Mapped[List["MeetingTag"]] = relationship(
        "MeetingTag", back_populates="meeting", cascade="all, delete-orphan"
    )
    chat_messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="meeting", cascade="all, delete-orphan", order_by="ChatMessage.created_at"
    )


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        CheckConstraint("length(name) BETWEEN 1 AND 200", name="ck_participants_name_len"),
        Index("idx_participants_meeting", "meeting_id"),
    )

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="participants")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    segment_index: Mapped[int] = mapped_column(Integer, nullable=False)
    speaker_label: Mapped[str] = mapped_column(Text, nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        CheckConstraint("length(speaker_label) >= 1", name="ck_segments_speaker_len"),
        CheckConstraint("start_time >= 0", name="ck_segments_start_time"),
        UniqueConstraint("meeting_id", "segment_index", name="uq_segments_meeting_index"),
        Index("idx_segments_meeting_order", "meeting_id", "segment_index"),
        Index("idx_segments_meeting_time", "meeting_id", "start_time"),
    )

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="transcript_segments")
    comments: Mapped[List["Comment"]] = relationship(
        "Comment", back_populates="segment", cascade="all, delete-orphan"
    )
    highlight: Mapped[Optional["Highlight"]] = relationship(
        "Highlight", back_populates="segment", cascade="all, delete-orphan", uselist=False
    )


class Summary(Base):
    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    summary_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    generation_status: Mapped[str] = mapped_column(Text, nullable=False, default="none")
    generation_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[int] = mapped_column(Integer, nullable=False, default=_now)
    updated_at: Mapped[int] = mapped_column(Integer, nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        CheckConstraint(
            "generation_status IN ('none','seeded','generated','failed')",
            name="ck_summaries_status"
        ),
    )

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="summary")


class ActionItem(Base):
    __tablename__ = "action_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_complete: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[int] = mapped_column(Integer, nullable=False, default=_now)
    updated_at: Mapped[int] = mapped_column(Integer, nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        CheckConstraint("length(trim(description)) BETWEEN 1 AND 500", name="ck_action_items_desc_len"),
        CheckConstraint("is_complete IN (0, 1)", name="ck_action_items_complete"),
        Index("idx_action_items_meeting", "meeting_id", "created_at"),
    )

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="action_items")


class KeyTopic(Base):
    __tablename__ = "key_topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        CheckConstraint("length(topic) >= 1", name="ck_key_topics_topic_len"),
        Index("idx_key_topics_meeting", "meeting_id", "position"),
    )

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="key_topics")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    segment_id: Mapped[int] = mapped_column(Integer, ForeignKey("transcript_segments.id", ondelete="CASCADE"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[int] = mapped_column(Integer, nullable=False, default=_now)
    updated_at: Mapped[int] = mapped_column(Integer, nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        CheckConstraint("length(trim(body)) BETWEEN 1 AND 1000", name="ck_comments_body_len"),
        Index("idx_comments_segment", "segment_id"),
    )

    segment: Mapped["TranscriptSegment"] = relationship("TranscriptSegment", back_populates="comments")


class Highlight(Base):
    __tablename__ = "highlights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    segment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("transcript_segments.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    color: Mapped[str] = mapped_column(Text, nullable=False, default="yellow")
    created_at: Mapped[int] = mapped_column(Integer, nullable=False, default=_now)

    segment: Mapped["TranscriptSegment"] = relationship("TranscriptSegment", back_populates="highlight")


class Soundbite(Base):
    __tablename__ = "soundbites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[int] = mapped_column(Integer, nullable=False, default=_now)

    __table_args__ = (
        CheckConstraint("start_time >= 0", name="ck_soundbites_start"),
        CheckConstraint("end_time >= start_time", name="ck_soundbites_range"),
        Index("idx_soundbites_meeting", "meeting_id"),
    )

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="soundbites")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)

    __table_args__ = (
        CheckConstraint("length(trim(name)) BETWEEN 1 AND 50", name="ck_tags_name_len"),
    )

    meeting_tags: Mapped[List["MeetingTag"]] = relationship("MeetingTag", back_populates="tag", cascade="all, delete-orphan")


class MeetingTag(Base):
    __tablename__ = "meeting_tags"

    meeting_id: Mapped[int] = mapped_column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="meeting_tags")
    tag: Mapped["Tag"] = relationship("Tag", back_populates="meeting_tags")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[int] = mapped_column(Integer, nullable=False, default=_now)

    __table_args__ = (
        CheckConstraint("role IN ('user','assistant')", name="ck_chat_role"),
        Index("idx_chat_meeting", "meeting_id", "created_at"),
    )

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="chat_messages")
