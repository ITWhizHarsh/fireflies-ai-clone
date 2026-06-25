# Fireflies Clone

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
