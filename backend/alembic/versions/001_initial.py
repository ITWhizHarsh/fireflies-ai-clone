"""Initial migration — all 12 tables + FTS5 search index

Revision ID: 001_initial
Revises:
Create Date: 2024-07-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "meetings",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("meeting_date", sa.Text, nullable=False),
        sa.Column("duration_seconds", sa.Integer, nullable=False, server_default="0"),
        sa.Column("media_url", sa.Text, nullable=True),
        sa.Column("created_at", sa.Integer, nullable=False),
        sa.Column("updated_at", sa.Integer, nullable=False),
        sa.CheckConstraint("length(title) BETWEEN 1 AND 200", name="ck_meetings_title_len"),
        sa.CheckConstraint("duration_seconds >= 0", name="ck_meetings_duration"),
    )
    op.create_index("idx_meetings_date_title", "meetings", ["meeting_date", "title"])

    op.create_table(
        "participants",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("meeting_id", sa.Integer, sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("position", sa.Integer, nullable=False, server_default="0"),
        sa.CheckConstraint("length(name) BETWEEN 1 AND 200", name="ck_participants_name_len"),
    )
    op.create_index("idx_participants_meeting", "participants", ["meeting_id"])

    op.create_table(
        "transcript_segments",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("meeting_id", sa.Integer, sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("segment_index", sa.Integer, nullable=False),
        sa.Column("speaker_label", sa.Text, nullable=False),
        sa.Column("start_time", sa.Float, nullable=False),
        sa.Column("end_time", sa.Float, nullable=True),
        sa.Column("text", sa.Text, nullable=False),
        sa.CheckConstraint("length(speaker_label) >= 1", name="ck_segments_speaker_len"),
        sa.CheckConstraint("start_time >= 0", name="ck_segments_start_time"),
        sa.UniqueConstraint("meeting_id", "segment_index", name="uq_segments_meeting_index"),
    )
    op.create_index("idx_segments_meeting_order", "transcript_segments", ["meeting_id", "segment_index"])
    op.create_index("idx_segments_meeting_time", "transcript_segments", ["meeting_id", "start_time"])

    op.create_table(
        "summaries",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("meeting_id", sa.Integer, sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("summary_text", sa.Text, nullable=True),
        sa.Column("generation_status", sa.Text, nullable=False, server_default="none"),
        sa.Column("generation_error", sa.Text, nullable=True),
        sa.Column("created_at", sa.Integer, nullable=False),
        sa.Column("updated_at", sa.Integer, nullable=False),
        sa.CheckConstraint(
            "generation_status IN ('none','seeded','generated','failed')",
            name="ck_summaries_status"
        ),
    )

    op.create_table(
        "action_items",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("meeting_id", sa.Integer, sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("is_complete", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.Integer, nullable=False),
        sa.Column("updated_at", sa.Integer, nullable=False),
        sa.CheckConstraint("length(trim(description)) BETWEEN 1 AND 500", name="ck_action_items_desc_len"),
        sa.CheckConstraint("is_complete IN (0, 1)", name="ck_action_items_complete"),
    )
    op.create_index("idx_action_items_meeting", "action_items", ["meeting_id", "created_at"])

    op.create_table(
        "key_topics",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("meeting_id", sa.Integer, sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("topic", sa.Text, nullable=False),
        sa.Column("position", sa.Integer, nullable=False, server_default="0"),
        sa.CheckConstraint("length(topic) >= 1", name="ck_key_topics_topic_len"),
    )
    op.create_index("idx_key_topics_meeting", "key_topics", ["meeting_id", "position"])

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("segment_id", sa.Integer, sa.ForeignKey("transcript_segments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("created_at", sa.Integer, nullable=False),
        sa.Column("updated_at", sa.Integer, nullable=False),
        sa.CheckConstraint("length(trim(body)) BETWEEN 1 AND 1000", name="ck_comments_body_len"),
    )
    op.create_index("idx_comments_segment", "comments", ["segment_id"])

    op.create_table(
        "highlights",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("segment_id", sa.Integer, sa.ForeignKey("transcript_segments.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("color", sa.Text, nullable=False, server_default="yellow"),
        sa.Column("created_at", sa.Integer, nullable=False),
    )

    op.create_table(
        "soundbites",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("meeting_id", sa.Integer, sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.Text, nullable=True),
        sa.Column("start_time", sa.Float, nullable=False),
        sa.Column("end_time", sa.Float, nullable=False),
        sa.Column("created_at", sa.Integer, nullable=False),
        sa.CheckConstraint("start_time >= 0", name="ck_soundbites_start"),
        sa.CheckConstraint("end_time >= start_time", name="ck_soundbites_range"),
    )
    op.create_index("idx_soundbites_meeting", "soundbites", ["meeting_id"])

    op.create_table(
        "tags",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.Text, nullable=False, unique=True),
        sa.CheckConstraint("length(trim(name)) BETWEEN 1 AND 50", name="ck_tags_name_len"),
    )

    op.create_table(
        "meeting_tags",
        sa.Column("meeting_id", sa.Integer, sa.ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tag_id", sa.Integer, sa.ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("meeting_id", sa.Integer, sa.ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.Text, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("created_at", sa.Integer, nullable=False),
        sa.CheckConstraint("role IN ('user','assistant')", name="ck_chat_role"),
    )
    op.create_index("idx_chat_meeting", "chat_messages", ["meeting_id", "created_at"])

    # FTS5 virtual table for global search (SQLite-specific)
    # If FTS5 is not available, skip silently — service falls back to LIKE queries
    op.execute(
        """
        CREATE VIRTUAL TABLE IF NOT EXISTS meeting_search
        USING fts5(
            meeting_id UNINDEXED,
            title,
            summary_text,
            transcript_text
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS meeting_search")
    op.drop_table("chat_messages")
    op.drop_table("meeting_tags")
    op.drop_table("tags")
    op.drop_table("soundbites")
    op.drop_table("highlights")
    op.drop_table("comments")
    op.drop_table("key_topics")
    op.drop_table("action_items")
    op.drop_table("summaries")
    op.drop_table("transcript_segments")
    op.drop_table("participants")
    op.drop_table("meetings")
