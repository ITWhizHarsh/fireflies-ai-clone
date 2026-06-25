from typing import Optional
from sqlalchemy.orm import Session
import io

from app.models.models import Meeting


SUPPORTED_FORMATS = {"pdf", "md", "txt"}
SUPPORTED_KINDS = {"transcript", "summary"}


def export_meeting(
    db: Session,
    meeting_id: int,
    kind: str,
    fmt: str,
) -> tuple[bytes, str]:
    """Export meeting transcript or summary as PDF, Markdown, or TXT.

    Returns (content_bytes, content_type).
    Raises ValueError for unsupported formats.
    """
    if fmt.lower() not in SUPPORTED_FORMATS:
        raise ValueError(f"Unsupported export format: '{fmt}'. Use pdf, md, or txt")
    if kind.lower() not in SUPPORTED_KINDS:
        raise ValueError(f"Unsupported export kind: '{kind}'. Use transcript or summary")

    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise LookupError(f"Meeting {meeting_id} not found")

    participants_str = ", ".join(p.name for p in meeting.participants) or "No participants"
    fmt_lower = fmt.lower()
    kind_lower = kind.lower()

    if fmt_lower == "md":
        content = _render_markdown(meeting, kind_lower, participants_str)
        return content.encode("utf-8"), "text/markdown"
    elif fmt_lower == "txt":
        content = _render_txt(meeting, kind_lower, participants_str)
        return content.encode("utf-8"), "text/plain"
    elif fmt_lower == "pdf":
        content = _render_pdf(meeting, kind_lower, participants_str)
        return content, "application/pdf"

    raise ValueError(f"Unhandled format: {fmt}")


def _render_markdown(meeting: Meeting, kind: str, participants_str: str) -> str:
    lines = [
        f"# {meeting.title}",
        "",
        f"**Date:** {meeting.meeting_date}",
        f"**Participants:** {participants_str}",
        f"**Duration:** {_format_duration(meeting.duration_seconds)}",
        "",
    ]

    if kind == "transcript":
        lines.append("## Transcript")
        lines.append("")
        for seg in meeting.transcript_segments:
            ts = _format_timestamp(seg.start_time)
            lines.append(f"**[{ts}] {seg.speaker_label}:** {seg.text}")
            lines.append("")
    else:  # summary
        lines.append("## Summary")
        lines.append("")
        if meeting.summary and meeting.summary.summary_text:
            lines.append(meeting.summary.summary_text)
        else:
            lines.append("*No summary available.*")
        lines.append("")
        lines.append("## Action Items")
        lines.append("")
        action_items = meeting.action_items
        if action_items:
            for item in action_items:
                status = "✅" if item.is_complete else "☐"
                lines.append(f"- {status} {item.description}")
        else:
            lines.append("*No action items.*")
        lines.append("")
        lines.append("## Key Topics")
        lines.append("")
        key_topics = meeting.key_topics
        if key_topics:
            for topic in key_topics:
                lines.append(f"- {topic.topic}")
        else:
            lines.append("*No key topics.*")

    return "\n".join(lines)


def _render_txt(meeting: Meeting, kind: str, participants_str: str) -> str:
    lines = [
        f"{'=' * 60}",
        f"{meeting.title}",
        f"{'=' * 60}",
        f"Date: {meeting.meeting_date}",
        f"Participants: {participants_str}",
        f"Duration: {_format_duration(meeting.duration_seconds)}",
        f"{'=' * 60}",
        "",
    ]

    if kind == "transcript":
        lines.append("TRANSCRIPT")
        lines.append("-" * 40)
        for seg in meeting.transcript_segments:
            ts = _format_timestamp(seg.start_time)
            lines.append(f"[{ts}] {seg.speaker_label}: {seg.text}")
        lines.append("")
    else:
        lines.append("SUMMARY")
        lines.append("-" * 40)
        if meeting.summary and meeting.summary.summary_text:
            lines.append(meeting.summary.summary_text)
        else:
            lines.append("No summary available.")
        lines.append("")
        lines.append("ACTION ITEMS")
        lines.append("-" * 40)
        for item in meeting.action_items:
            status = "[x]" if item.is_complete else "[ ]"
            lines.append(f"{status} {item.description}")
        if not meeting.action_items:
            lines.append("No action items.")
        lines.append("")
        lines.append("KEY TOPICS")
        lines.append("-" * 40)
        for topic in meeting.key_topics:
            lines.append(f"- {topic.topic}")
        if not meeting.key_topics:
            lines.append("No key topics.")

    return "\n".join(lines)


def _render_pdf(meeting: Meeting, kind: str, participants_str: str) -> bytes:
    """Render PDF using ReportLab."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib import colors

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle("CustomTitle", parent=styles["Heading1"], fontSize=18, spaceAfter=12)
    story.append(Paragraph(meeting.title, title_style))
    story.append(Paragraph(f"<b>Date:</b> {meeting.meeting_date}", styles["Normal"]))
    story.append(Paragraph(f"<b>Participants:</b> {participants_str}", styles["Normal"]))
    story.append(Paragraph(f"<b>Duration:</b> {_format_duration(meeting.duration_seconds)}", styles["Normal"]))
    story.append(Spacer(1, 0.3 * inch))

    if kind == "transcript":
        story.append(Paragraph("Transcript", styles["Heading2"]))
        story.append(Spacer(1, 0.1 * inch))
        for seg in meeting.transcript_segments:
            ts = _format_timestamp(seg.start_time)
            text = f"<b>[{ts}] {seg.speaker_label}:</b> {seg.text}"
            story.append(Paragraph(text, styles["Normal"]))
            story.append(Spacer(1, 0.05 * inch))
    else:
        story.append(Paragraph("Summary", styles["Heading2"]))
        if meeting.summary and meeting.summary.summary_text:
            story.append(Paragraph(meeting.summary.summary_text, styles["Normal"]))
        else:
            story.append(Paragraph("No summary available.", styles["Normal"]))
        story.append(Spacer(1, 0.2 * inch))

        story.append(Paragraph("Action Items", styles["Heading2"]))
        for item in meeting.action_items:
            status = "✓" if item.is_complete else "○"
            story.append(Paragraph(f"{status} {item.description}", styles["Normal"]))
        if not meeting.action_items:
            story.append(Paragraph("No action items.", styles["Normal"]))
        story.append(Spacer(1, 0.2 * inch))

        story.append(Paragraph("Key Topics", styles["Heading2"]))
        for topic in meeting.key_topics:
            story.append(Paragraph(f"• {topic.topic}", styles["Normal"]))
        if not meeting.key_topics:
            story.append(Paragraph("No key topics.", styles["Normal"]))

    doc.build(story)
    return buffer.getvalue()


def _format_duration(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds}s"
    elif seconds < 3600:
        return f"{seconds // 60}m {seconds % 60}s"
    else:
        h = seconds // 3600
        m = (seconds % 3600) // 60
        s = seconds % 60
        return f"{h}h {m}m {s}s"


def _format_timestamp(seconds: float) -> str:
    total = int(seconds)
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    return f"{h:02d}:{m:02d}:{s:02d}"
