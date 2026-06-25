# Fireflies Clone

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

A full-stack Fireflies.ai meeting-assistant clone built with **FastAPI** (Python backend) and **Next.js 14** (TypeScript frontend).

## Architecture

```
.
├── backend/          # FastAPI + SQLAlchemy + SQLite
│   ├── app/
│   │   ├── config.py          # Settings (pydantic-settings)
│   │   ├── database.py        # SQLAlchemy engine + session
│   │   ├── main.py            # FastAPI app, CORS, lifespan seeding
│   │   ├── seed.py            # DB seeder (5 realistic meetings)
│   │   ├── models/            # SQLAlchemy ORM models (12 tables)
│   │   ├── parsers/           # .txt / .vtt / .json transcript parsers
│   │   ├── llm/               # Gemini + Mock summary providers
│   │   ├── schemas/           # Pydantic request/response DTOs
│   │   ├── services/          # Business logic (meetings, actions, search, export…)
│   │   └── routers/           # FastAPI routers
│   ├── alembic/               # Database migrations
│   ├── .env                   # Environment variables
│   └── requirements.txt
│
└── frontend/         # Next.js 14 App Router + TypeScript
    ├── src/
    │   ├── app/               # Next.js pages (/ → /meetings, /meetings/[id])
    │   ├── components/        # React components
    │   │   ├── layout/        # Navbar (Fireflies-style dark sidebar)
    │   │   ├── meetings/      # Library page components
    │   │   ├── transcript/    # Detail view components
    │   │   └── bonus/         # Chat, Export, GlobalSearch, TagManager
    │   ├── lib/               # API client, types, utilities
    │   └── providers/         # TanStack Query, ThemeProvider
    ├── .env.local
    └── package.json
```

## Features

### Core
- **Meetings Library** — browse, search (case-insensitive partial match), date filter, tag filter
- **Transcript Detail** — interactive transcript, click-to-seek, active segment highlight, transcript search
- **Media Player** — seek bar, volume, error state (segments preserved on load failure)
- **AI Summary** — Gemini-powered or mock summary, action items, key topics
- **Action Items** — CRUD with inline editing, completion toggle
- **Meeting CRUD** — create from pasted text or file upload (.txt/.vtt/.json), edit, delete
- **Seeded Data** — 5 realistic meetings with full transcripts on first start

### Bonus
- **Comments & Highlights** — annotate transcript segments
- **Soundbites** — clip references by time range
- **Export** — transcript/summary as PDF, Markdown, or TXT
- **Global Search** — search across titles, summaries, and transcript text
- **Tags** — case-insensitive tags with AND filtering
- **Meeting Chat** — ask Gemini questions about any meeting
- **Dark/Light Theme** — persisted to localStorage

## Local Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (optional — app auto-creates tables on startup)
alembic upgrade head

# Start the server (auto-seeds on first run)
uvicorn app.main:app --reload --port 8001
```

The API will be available at http://localhost:8001.
Swagger docs: http://localhost:8001/docs

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:3000.

## Environment Variables

### backend/.env
```
DATABASE_URL=sqlite:///./fireflies.db
GEMINI_API_KEY=your_gemini_api_key_here
FRONTEND_URL=http://localhost:3000
```

### frontend/.env.local
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api
```

## Running Migrations

```bash
cd backend
source .venv/bin/activate

# Apply all migrations
alembic upgrade head

# Create a new migration (after model changes)
alembic revision --autogenerate -m "description"
```

## Seeding

The database is automatically seeded with 5 realistic meetings on first startup (when the meetings table is empty). To re-seed, delete `backend/fireflies.db` and restart the server.

```bash
# Manual seed (from backend directory)
python -c "from app.database import SessionLocal, create_tables; create_tables(); from app.seed import seed_database; db = SessionLocal(); seed_database(db); db.close()"
```

## Test Commands

```bash
# Backend tests
cd backend
source .venv/bin/activate
pytest tests/ -v

# Frontend tests
cd frontend
npm test
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/meetings` | List meetings (search, date, tag filters) |
| POST | `/api/meetings` | Create meeting with optional pasted transcript |
| POST | `/api/meetings/upload` | Create meeting with uploaded transcript file |
| GET | `/api/meetings/{id}` | Full meeting detail bundle |
| PUT | `/api/meetings/{id}` | Update title and participants |
| DELETE | `/api/meetings/{id}` | Delete meeting + all related data |
| POST | `/api/meetings/{id}/summary:generate` | Generate AI summary |
| GET | `/api/meetings/{id}/transcript.json` | Normalized transcript JSON |
| POST | `/api/meetings/{id}/action-items` | Add action item |
| PUT | `/api/action-items/{id}` | Edit action item |
| DELETE | `/api/action-items/{id}` | Delete action item |
| POST | `/api/segments/{id}/comments` | Add comment to segment |
| POST | `/api/segments/{id}/highlight` | Highlight a segment |
| DELETE | `/api/segments/{id}/highlight` | Remove highlight |
| POST | `/api/meetings/{id}/soundbites` | Create soundbite |
| GET | `/api/meetings/{id}/export` | Export (kind=transcript/summary, format=pdf/md/txt) |
| GET | `/api/search?q=` | Global search |
| POST | `/api/meetings/{id}/tags` | Add tag |
| DELETE | `/api/meetings/{id}/tags/{name}` | Remove tag |
| POST | `/api/meetings/{id}/chat` | Ask a question (AI-powered) |

## Deployment

### Backend (Render)

1. Push the `backend/` directory to a GitHub repo
2. Create a new **Web Service** on [Render](https://render.com)
3. Set Build Command: `pip install -r requirements.txt`
4. Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `DATABASE_URL` — use a persistent disk path or external DB for production
   - `GEMINI_API_KEY` — your Google Gemini API key
   - `FRONTEND_URL` — your Vercel frontend URL

### Frontend (Vercel)

1. Push the `frontend/` directory to a GitHub repo
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variable:
   - `NEXT_PUBLIC_API_BASE_URL` — your Render backend URL + `/api`
4. Deploy

> **Note:** For production, use a persistent SQLite volume mount or switch DATABASE_URL to a PostgreSQL connection string with the appropriate SQLAlchemy driver.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| State | TanStack Query (React Query) |
| Backend | Python FastAPI |
| ORM | SQLAlchemy 2.x + Alembic |
| Database | SQLite |
| LLM | Google Gemini 2.5 Flash (google-genai SDK) |
| PDF Export | ReportLab |
| Property Tests | Hypothesis (Python), fast-check (TypeScript) |

## Database Schema

The database is SQLite, managed by SQLAlchemy 2.x with Alembic migrations. Foreign keys are enforced via `PRAGMA foreign_keys = ON` and all child tables use `ON DELETE CASCADE` so deleting a meeting removes every related row in one operation. Timestamps are stored as Unix epoch integers for portability.

### Tables

| Table | Purpose |
|-------|---------|
| `meetings` | Core meeting record — title, date, duration, optional media URL, created/updated timestamps |
| `participants` | 0-to-N participant names per meeting, ordered by `position` |
| `transcript_segments` | Normalized transcript rows — speaker label, start/end times (seconds), text, segment index |
| `summaries` | One-to-one with meetings — stores summary text and generation status (`none` / `seeded` / `generated` / `failed`) |
| `action_items` | Per-meeting action items with completion flag and timestamps |
| `key_topics` | Ordered list of topics/chapters extracted from the summary |
| `comments` | Per-segment comments (bonus annotation feature) |
| `highlights` | At most one highlight per segment with a color value (bonus) |
| `soundbites` | Time-range clips referencing a meeting (bonus) |
| `tags` | Global tag registry, case-insensitively unique |
| `meeting_tags` | Many-to-many join between meetings and tags |
| `chat_messages` | Per-meeting chat history with `user` / `assistant` roles (bonus) |

### Key Design Decisions

- **`transcript_segments.segment_index`** — preserves exact source order from the uploaded file, which is required for the parse → serialize round-trip property.
- **`summaries.generation_status`** — separates "never generated", "AI generated", "seeded", and "failed" so the UI can show the right placeholder and the backend can record errors without overwriting prior data.
- **`tags.name COLLATE NOCASE`** — tag names are deduplicated case-insensitively at the DB level.
- **`meeting_tags` composite primary key** — prevents duplicate tag associations at the schema level without an extra unique index.
- **Indexes** — `(meeting_date DESC, title ASC)` on meetings backs the default library sort; `(meeting_id, segment_index)` and `(meeting_id, start_time)` on segments back ordered rendering and active-segment lookup during media playback.

### ER Diagram

```
meetings ──< participants
meetings ──< transcript_segments ──< comments
                                 ──< highlights
meetings ──  summaries
meetings ──< action_items
meetings ──< key_topics
meetings ──< soundbites
meetings ──< meeting_tags >── tags
meetings ──< chat_messages
```

---

## Assumptions & Scoping Decisions

### Authentication
No authentication is implemented. All data belongs to a single implicit `Default_User`. This was explicitly out of scope per the assignment brief, which focuses on core meeting-intelligence features.

### Speech-to-Text
Real audio transcription is out of scope. Transcripts are provided via three input paths:
- **Seeded data** — 5 realistic meetings auto-seeded on first startup
- **File upload** — `.txt`, `.vtt` (WebVTT), or `.json` transcript files
- **Paste** — raw transcript text pasted directly into the create modal

### LLM Integration
The Gemini API (`gemini-2.5-flash`) is used when `GEMINI_API_KEY` is set. When no key is configured the app falls back to a deterministic `MockSummaryProvider` that returns a canned summary, action items, and key topics — so the entire app is functional without any API credentials.

The new `google-genai` SDK is used instead of the deprecated `google-generativeai` package because it supports the `AQ.` key format issued by Google AI Studio.

### Media Playback
A real audio/video file is not bundled. The `media_url` field on each meeting is nullable. The media player renders a seek bar and time display, and handles the error state gracefully — all transcript segments, highlights, and click-to-seek remain fully functional regardless of whether a media source loads.

### Database
SQLite was chosen as required by the assignment. For production use the `DATABASE_URL` can be switched to a PostgreSQL connection string with the appropriate SQLAlchemy driver (`asyncpg` or `psycopg2`); no model changes are needed. For Render deployments a persistent disk mount is required to survive deploys.

### Search
Full-text search uses SQLite's `LIKE`-based case-insensitive partial matching rather than FTS5. This covers all search requirements (title, participant, summary, transcript) without requiring a specific SQLite build flag. FTS5 would be the upgrade path for larger datasets.

### Transcript Parsing
- **`.txt`** — lines starting with `Speaker:` or `HH:MM:SS Speaker:` patterns are parsed as segments; consecutive lines from the same speaker are merged.
- **`.vtt`** — standard WebVTT cue blocks are parsed; speaker labels are extracted from voice-span notation (`<v Speaker>`) or defaulted to `Speaker`.
- **`.json`** — expects the normalized `{ "version": 1, "segments": [...] }` format produced by the app's own export.

Any file that yields zero parseable segments is rejected with a `422` error and no partial meeting is created.

### Export
PDF export uses ReportLab (pure Python, no system dependencies). Markdown and plain-text exports are generated in-memory and streamed as file downloads. Export is available for both the transcript and the AI summary, in all three formats.

### Participants
Up to 100 participants are allowed on create; up to 50 on edit (the edit form is narrower in scope). Participant lists are stored as ordered rows so display order is deterministic.

### Timestamps
All `created_at` / `updated_at` fields store Unix epoch seconds as integers. The frontend formats them to locale-aware date strings for display.
