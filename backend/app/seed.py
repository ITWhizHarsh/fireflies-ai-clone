"""
Database seeder — populates the DB with 5 realistic meetings if empty.
"""
import time
from sqlalchemy.orm import Session

from app.models.models import Meeting, Participant, TranscriptSegment, Summary, ActionItem, KeyTopic, Tag, MeetingTag


SEED_DATA = [
    {
        "title": "Q3 Product Roadmap Review",
        "meeting_date": "2024-07-15",
        "duration_seconds": 3600,
        "participants": ["Sarah Chen", "Mike Johnson", "Priya Patel", "Alex Rivera"],
        "tags": ["product", "roadmap"],
        "summary": (
            "The team reviewed the Q3 product roadmap and prioritized features for the upcoming sprint. "
            "Sarah presented the updated feature backlog with revised timelines. "
            "The group agreed to deprioritize the dashboard redesign and focus on API performance improvements. "
            "Key decisions included adopting a phased rollout strategy for the new onboarding flow. "
            "The team aligned on shipping the core features by end of August."
        ),
        "action_items": [
            "Sarah to update the product backlog with revised priority scores by Friday",
            "Mike to schedule API performance benchmarking session with the engineering team",
            "Priya to draft the phased rollout plan for stakeholder review",
            "Alex to finalize UX specs for the new onboarding flow",
        ],
        "key_topics": ["Feature Prioritization", "API Performance", "Onboarding Flow", "Sprint Planning"],
        "segments": [
            {"speaker": "Sarah Chen", "start": 0.0, "end": 45.0, "text": "Good morning everyone. Let's get started with the Q3 roadmap review. I've shared the updated deck in the meeting notes."},
            {"speaker": "Mike Johnson", "start": 45.0, "end": 90.0, "text": "Thanks Sarah. Before we dive in, I want to flag that the API response times have been degrading. We need to address this in Q3."},
            {"speaker": "Priya Patel", "start": 90.0, "end": 135.0, "text": "Agreed. Our SLA is 200ms and we're averaging 450ms on the search endpoint. That's a top priority for us."},
            {"speaker": "Sarah Chen", "start": 135.0, "end": 200.0, "text": "I've moved API performance to the top of the backlog. Let's look at the feature list. We have 12 items, but realistically we can ship 7 in Q3."},
            {"speaker": "Alex Rivera", "start": 200.0, "end": 260.0, "text": "The onboarding redesign is critical. We're seeing a 40% drop-off at step 3. Users are confused by the permissions screen."},
            {"speaker": "Mike Johnson", "start": 260.0, "end": 320.0, "text": "Can we do a phased rollout? Ship the simplified flow to 20% of new users first, measure the impact, then expand?"},
            {"speaker": "Priya Patel", "start": 320.0, "end": 380.0, "text": "That makes sense. We can use our feature flag system. I'll draft the rollout plan by Thursday."},
            {"speaker": "Sarah Chen", "start": 380.0, "end": 440.0, "text": "Perfect. What about the dashboard redesign? We had it scheduled for August."},
            {"speaker": "Alex Rivera", "start": 440.0, "end": 510.0, "text": "I'd recommend we deprioritize it. The current dashboard works fine. We should focus engineering effort on the performance issues and onboarding."},
            {"speaker": "Mike Johnson", "start": 510.0, "end": 570.0, "text": "Seconded. The dashboard is nice-to-have but won't move the needle on activation or retention."},
            {"speaker": "Sarah Chen", "start": 570.0, "end": 640.0, "text": "Okay, dashboard redesign moves to Q4. Let's confirm our Q3 commitments: API performance, new onboarding flow, and the mobile push notifications."},
            {"speaker": "Priya Patel", "start": 640.0, "end": 710.0, "text": "Mobile push is a big undertaking. We estimated 6 weeks. Is there a lighter version we could ship first?"},
            {"speaker": "Alex Rivera", "start": 710.0, "end": 770.0, "text": "We could ship in-app notifications in week 4 and layer push notifications in week 8. That gives us a testable MVP earlier."},
            {"speaker": "Mike Johnson", "start": 770.0, "end": 840.0, "text": "I like that approach. We'll also need the backend team to set up the notification service infrastructure."},
            {"speaker": "Sarah Chen", "start": 840.0, "end": 920.0, "text": "Great discussion. Let me summarize the decisions. We're committed to API performance, phased onboarding rollout, and a two-phase notifications feature. Dashboard moves to Q4. Action items in the notes. See you next week."},
        ],
    },
    {
        "title": "Sprint 24 Planning Session",
        "meeting_date": "2024-07-22",
        "duration_seconds": 5400,
        "participants": ["James Park", "Lena Schmidt", "Omar Hassan", "Nina Torres"],
        "tags": ["engineering", "sprint"],
        "summary": (
            "The engineering team completed sprint planning for Sprint 24. "
            "The team estimated 47 story points total capacity and committed to 42 points. "
            "High priority items include the authentication bug fix, database query optimization, "
            "and the new file upload component. "
            "The team flagged two dependencies on the design team for the profile settings screens. "
            "Velocity trend shows improvement over the last three sprints."
        ),
        "action_items": [
            "James to investigate and fix the authentication token refresh bug before sprint kickoff",
            "Lena to coordinate with design team on profile settings mockups by Tuesday",
            "Omar to set up database query monitoring dashboard before Thursday standup",
            "Nina to break down the file upload epic into subtasks and update the board",
        ],
        "key_topics": ["Capacity Planning", "Authentication Bug", "Database Optimization", "File Upload Feature"],
        "segments": [
            {"speaker": "James Park", "start": 0.0, "end": 50.0, "text": "Alright team, let's plan Sprint 24. We have our velocity from the last sprint at 44 points. What's our capacity this sprint?"},
            {"speaker": "Lena Schmidt", "start": 50.0, "end": 100.0, "text": "I have two days of PTO on Thursday and Friday, so I'm at 60% capacity. That's about 8 points for me."},
            {"speaker": "Omar Hassan", "start": 100.0, "end": 150.0, "text": "Full capacity here, 12 points. I'm planning to focus on the database optimization tickets."},
            {"speaker": "Nina Torres", "start": 150.0, "end": 210.0, "text": "I'm full capacity too, 12 points. But I want to flag that the file upload epic is larger than estimated. I think it's 15 points not 8."},
            {"speaker": "James Park", "start": 210.0, "end": 280.0, "text": "Let's re-estimate that together. Nina, can you walk us through what you found?"},
            {"speaker": "Nina Torres", "start": 280.0, "end": 360.0, "text": "Sure. The basic upload is straightforward, but we need chunked uploads for files over 50MB, progress tracking, error recovery, and integration with the storage service. That's at least 13-15 points."},
            {"speaker": "Omar Hassan", "start": 360.0, "end": 420.0, "text": "I agree. The chunked upload alone is complex. We should break it into smaller tickets."},
            {"speaker": "Lena Schmidt", "start": 420.0, "end": 490.0, "text": "Before we finalize, I need to raise the auth bug. We had three customer reports of token refresh failing. That needs to be sprint one priority."},
            {"speaker": "James Park", "start": 490.0, "end": 560.0, "text": "Agreed. That's a P0. I'll take it. Estimated at 3 points but could be more once I dig in."},
            {"speaker": "Omar Hassan", "start": 560.0, "end": 630.0, "text": "The database optimization is well understood. I can commit to 8 points there: query profiling, adding the missing indexes, and updating the ORM queries."},
            {"speaker": "Lena Schmidt", "start": 630.0, "end": 700.0, "text": "I have the profile settings work blocked on design. Two screens aren't finalized yet. I'll coordinate with them first thing tomorrow."},
            {"speaker": "Nina Torres", "start": 700.0, "end": 770.0, "text": "So our committed work is: auth bug fix, database optimization, file upload phase one with chunking. That's roughly 42 points."},
            {"speaker": "James Park", "start": 770.0, "end": 850.0, "text": "That sounds right and is within our capacity. Let's keep the profile settings as stretch goals pending design sign-off. Sprint starts Monday. Daily standups at 9am."},
        ],
    },
    {
        "title": "Customer Success Team Sync",
        "meeting_date": "2024-07-18",
        "duration_seconds": 2700,
        "participants": ["Rachel Kim", "David Brown", "Sophia Martinez"],
        "tags": ["customer-success", "support"],
        "summary": (
            "The customer success team reviewed the weekly metrics and discussed key account issues. "
            "Churn risk was identified in three enterprise accounts due to onboarding delays. "
            "The team agreed on escalation procedures and support ticket SLAs. "
            "New onboarding checklist templates were approved for rollout next week. "
            "NPS score improved from 42 to 51 this quarter."
        ),
        "action_items": [
            "Rachel to schedule executive business reviews with three at-risk enterprise accounts this week",
            "David to update the support ticket routing rules to reduce P1 response time to 2 hours",
            "Sophia to finalize and share the new onboarding checklist templates with the team",
        ],
        "key_topics": ["Churn Risk", "Support SLAs", "Onboarding Templates", "NPS Score"],
        "segments": [
            {"speaker": "Rachel Kim", "start": 0.0, "end": 55.0, "text": "Good afternoon! Let's start with metrics. Weekly NPS is at 51, up from 42 last quarter. Really great trend."},
            {"speaker": "David Brown", "start": 55.0, "end": 110.0, "text": "Support tickets are up 18% week-over-week. Most are related to the new API changes. We should flag this to engineering."},
            {"speaker": "Sophia Martinez", "start": 110.0, "end": 170.0, "text": "I've been reviewing our enterprise accounts and I'm concerned about three of them. Acme Corp, TechVentures, and GlobalSync are all behind on onboarding milestones."},
            {"speaker": "Rachel Kim", "start": 170.0, "end": 230.0, "text": "Those are all Q2 closes. What's the blocker for each of them?"},
            {"speaker": "Sophia Martinez", "start": 230.0, "end": 300.0, "text": "Acme Corp is waiting on IT approval for SSO setup. TechVentures hasn't completed admin training. GlobalSync has a data migration issue that our team needs to help resolve."},
            {"speaker": "David Brown", "start": 300.0, "end": 370.0, "text": "These accounts are at churn risk if we don't resolve their blockers in the next two weeks. I'd recommend executive business reviews for all three."},
            {"speaker": "Rachel Kim", "start": 370.0, "end": 440.0, "text": "I'll get those scheduled today. What about our support SLAs? I noticed some P1 tickets were taking 4-5 hours to get a first response."},
            {"speaker": "David Brown", "start": 440.0, "end": 510.0, "text": "Our target is 2 hours for P1. The issue is ticket routing. P1s are getting mixed in with P2s. I need to update the routing rules in Zendesk."},
            {"speaker": "Sophia Martinez", "start": 510.0, "end": 580.0, "text": "I've finished the new onboarding templates. They're much clearer and include a 30-60-90 day checklist. Can we roll them out next Monday?"},
            {"speaker": "Rachel Kim", "start": 580.0, "end": 650.0, "text": "Absolutely. Share them in Slack first so we can all review. Anything else before we wrap?"},
            {"speaker": "David Brown", "start": 650.0, "end": 710.0, "text": "Just a reminder that our quarterly business reviews are due by end of month. Eight accounts still need their QBR decks completed."},
            {"speaker": "Rachel Kim", "start": 710.0, "end": 780.0, "text": "Good call. Everyone should have their QBR decks done by next Friday. I'll send a reminder today. Thanks team!"},
        ],
    },
    {
        "title": "Design System Workshop",
        "meeting_date": "2024-07-10",
        "duration_seconds": 4500,
        "participants": ["Emma Wilson", "Carlos Rodriguez", "Yuki Tanaka", "Ben Davis"],
        "tags": ["design", "frontend"],
        "summary": (
            "The design team held a workshop to establish standards for the company's design system. "
            "The team reviewed existing component libraries and identified inconsistencies across products. "
            "Decisions were made on typography scale, color tokens, spacing units, and component naming conventions. "
            "A governance model was proposed with a design system committee. "
            "The target is a v1.0 component library launch in six weeks."
        ),
        "action_items": [
            "Emma to document the finalized color token naming convention and share in Figma",
            "Carlos to audit existing React components for inconsistencies and create a migration plan",
            "Yuki to set up the Storybook instance for the new design system components",
            "Ben to write the design system contribution guidelines and governance charter",
        ],
        "key_topics": ["Component Library", "Color Tokens", "Typography Scale", "Governance Model"],
        "segments": [
            {"speaker": "Emma Wilson", "start": 0.0, "end": 60.0, "text": "Welcome to our design system workshop. The goal today is to align on standards so we can build a consistent component library that scales across all our products."},
            {"speaker": "Carlos Rodriguez", "start": 60.0, "end": 120.0, "text": "I've audited our current codebase and found 47 different button variants, 12 different modal implementations, and no consistent spacing system. It's creating a lot of duplicated work."},
            {"speaker": "Yuki Tanaka", "start": 120.0, "end": 180.0, "text": "On the design side it's even worse. I counted 6 different shades of blue being used as primary color across different parts of the app."},
            {"speaker": "Ben Davis", "start": 180.0, "end": 250.0, "text": "We should start with design tokens. Everything flows from tokens: colors, typography, spacing, shadows. Once tokens are standardized, components follow naturally."},
            {"speaker": "Emma Wilson", "start": 250.0, "end": 320.0, "text": "Agreed. Let's define our color token naming convention first. I propose semantic names like color-primary-500, color-neutral-100, rather than literal color values."},
            {"speaker": "Carlos Rodriguez", "start": 320.0, "end": 390.0, "text": "Semantic naming makes sense. It also makes theming much easier. We can swap color themes without changing component code."},
            {"speaker": "Yuki Tanaka", "start": 390.0, "end": 460.0, "text": "For typography, I recommend a type scale based on 4px baseline grid. Sizes would be 12, 14, 16, 20, 24, 32, 40, 48. Clean and consistent."},
            {"speaker": "Ben Davis", "start": 460.0, "end": 530.0, "text": "The 8px spacing unit is industry standard. We should use multiples of 8: 4, 8, 16, 24, 32, 48, 64. Very predictable for both designers and developers."},
            {"speaker": "Emma Wilson", "start": 530.0, "end": 610.0, "text": "Let's talk governance. Who owns the design system? Who approves new components? We need a clear process."},
            {"speaker": "Carlos Rodriguez", "start": 610.0, "end": 680.0, "text": "I suggest a rotating committee of 2 designers and 2 engineers who review and merge contributions. Monthly committee meetings, weekly office hours."},
            {"speaker": "Yuki Tanaka", "start": 680.0, "end": 750.0, "text": "For tooling, I'll set up Storybook for the component library. It gives us a live catalog and makes it easy to review components in isolation."},
            {"speaker": "Ben Davis", "start": 750.0, "end": 820.0, "text": "I'll write the contribution guidelines. Clear documentation on how to propose, build, and get a component accepted into the system."},
            {"speaker": "Emma Wilson", "start": 820.0, "end": 910.0, "text": "Excellent work today. Our target is a v1.0 launch in 6 weeks with 20 core components. Let's schedule a checkpoint in 3 weeks to review progress."},
        ],
    },
    {
        "title": "Engineering Architecture Review",
        "meeting_date": "2024-07-05",
        "duration_seconds": 5400,
        "participants": ["Robert Chang", "Aisha Okonkwo", "Tom Mitchell", "Julia Santos", "Kevin Lee"],
        "tags": ["engineering", "architecture"],
        "summary": (
            "The engineering team conducted a quarterly architecture review to assess technical debt and plan infrastructure improvements. "
            "The monolith decomposition project was presented with a proposed microservices migration timeline of 18 months. "
            "The team discussed database scaling challenges, caching strategy, and observability improvements. "
            "A decision was made to adopt OpenTelemetry for distributed tracing across all services. "
            "The team agreed to form a platform engineering guild to own cross-cutting concerns."
        ),
        "action_items": [
            "Robert to create the microservices migration RFC document for team review by end of week",
            "Aisha to evaluate Redis vs Memcached for the new caching layer and present findings next week",
            "Tom to set up OpenTelemetry collectors in staging environment for initial testing",
            "Julia to document current database bottlenecks and recommend indexing improvements",
            "Kevin to draft the platform engineering guild charter and invite founding members",
        ],
        "key_topics": ["Microservices Migration", "Caching Strategy", "OpenTelemetry", "Database Scaling", "Platform Engineering"],
        "segments": [
            {"speaker": "Robert Chang", "start": 0.0, "end": 65.0, "text": "Thanks everyone for joining our quarterly architecture review. We'll cover technical debt, the monolith decomposition proposal, observability, and database scaling."},
            {"speaker": "Julia Santos", "start": 65.0, "end": 140.0, "text": "I want to start with the database. We're hitting read replica lag issues during peak hours. The primary is at 78% CPU during the Monday morning surge."},
            {"speaker": "Tom Mitchell", "start": 140.0, "end": 210.0, "text": "Have we considered read replicas or a caching layer? A lot of our queries are reading the same data repeatedly."},
            {"speaker": "Aisha Okonkwo", "start": 210.0, "end": 285.0, "text": "We've talked about caching for a while. I think it's time to implement it. Redis would give us sub-millisecond response times for frequently accessed data."},
            {"speaker": "Kevin Lee", "start": 285.0, "end": 360.0, "text": "We should also look at query optimization before throwing caching at the problem. Julia, how many of our slow queries have proper indexes?"},
            {"speaker": "Julia Santos", "start": 360.0, "end": 435.0, "text": "I ran an analysis last week. We're missing indexes on 12 high-traffic query patterns. Adding those alone could improve performance by 30-40%."},
            {"speaker": "Robert Chang", "start": 435.0, "end": 510.0, "text": "Great. Let's prioritize that. Now for the bigger topic: decomposing the monolith. Our deploy frequency has dropped because everything is coupled together."},
            {"speaker": "Tom Mitchell", "start": 510.0, "end": 590.0, "text": "The monolith is 450k lines of code at this point. Any change in the payments module requires a full regression test of the entire app. It's slowing us down significantly."},
            {"speaker": "Aisha Okonkwo", "start": 590.0, "end": 670.0, "text": "I propose we identify service boundaries first. Payments, notifications, and user auth are natural candidates for extraction. They have clear APIs and limited internal dependencies."},
            {"speaker": "Kevin Lee", "start": 670.0, "end": 750.0, "text": "What's our migration strategy? Big bang rewrite is too risky. I'd recommend the strangler fig pattern. Extract services incrementally alongside the monolith."},
            {"speaker": "Robert Chang", "start": 750.0, "end": 830.0, "text": "Agreed. 18-month timeline. Start with auth service extraction in Q3, payments in Q4, then move to Q1 next year for notifications and other services."},
            {"speaker": "Julia Santos", "start": 830.0, "end": 910.0, "text": "We also need better observability. Right now we have logs but no distributed tracing. When a request fails, it's very hard to trace through multiple service calls."},
            {"speaker": "Tom Mitchell", "start": 910.0, "end": 990.0, "text": "OpenTelemetry is the standard solution here. It's vendor-neutral and well-supported. We can route traces to either Jaeger or a cloud provider."},
            {"speaker": "Aisha Okonkwo", "start": 990.0, "end": 1060.0, "text": "We should adopt OpenTelemetry now, even before the microservices migration. It'll be invaluable for debugging once we have distributed systems."},
            {"speaker": "Kevin Lee", "start": 1060.0, "end": 1140.0, "text": "For the platform engineering concerns, I think we need a dedicated guild or team. Someone needs to own the CI/CD pipeline, infrastructure, and cross-cutting libraries."},
            {"speaker": "Robert Chang", "start": 1140.0, "end": 1230.0, "text": "Let's form a platform engineering guild. Voluntary membership, monthly meetings, cross-team ownership of the developer platform. Kevin, can you draft the charter?"},
        ],
    },
]


def seed_database(db: Session) -> None:
    """Seed the database with realistic meeting data."""
    # Check if already seeded
    existing = db.query(Meeting).count()
    if existing > 0:
        return

    now = int(time.time())

    for meeting_data in SEED_DATA:
        # Create meeting
        meeting = Meeting(
            title=meeting_data["title"],
            meeting_date=meeting_data["meeting_date"],
            duration_seconds=meeting_data["duration_seconds"],
            created_at=now,
            updated_at=now,
        )
        db.add(meeting)
        db.flush()

        # Add participants
        for i, name in enumerate(meeting_data["participants"]):
            db.add(Participant(
                meeting_id=meeting.id,
                name=name,
                position=i,
            ))

        # Add transcript segments
        for seg_data in meeting_data["segments"]:
            db.add(TranscriptSegment(
                meeting_id=meeting.id,
                segment_index=meeting_data["segments"].index(seg_data),
                speaker_label=seg_data["speaker"],
                start_time=seg_data["start"],
                end_time=seg_data.get("end"),
                text=seg_data["text"],
            ))

        # Add summary
        db.add(Summary(
            meeting_id=meeting.id,
            summary_text=meeting_data["summary"],
            generation_status="seeded",
            created_at=now,
            updated_at=now,
        ))

        # Add action items
        for desc in meeting_data["action_items"]:
            db.add(ActionItem(
                meeting_id=meeting.id,
                description=desc,
                is_complete=0,
                created_at=now,
                updated_at=now,
            ))

        # Add key topics
        for i, topic in enumerate(meeting_data["key_topics"]):
            db.add(KeyTopic(
                meeting_id=meeting.id,
                topic=topic,
                position=i,
            ))

        # Add tags
        for tag_name in meeting_data["tags"]:
            tag = db.query(Tag).filter(Tag.name.ilike(tag_name)).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
                db.flush()
            # Check if association exists
            existing_assoc = db.query(MeetingTag).filter(
                MeetingTag.meeting_id == meeting.id,
                MeetingTag.tag_id == tag.id
            ).first()
            if not existing_assoc:
                db.add(MeetingTag(meeting_id=meeting.id, tag_id=tag.id))

        now -= 86400  # Vary timestamps for realism

    db.commit()
