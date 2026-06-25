# Implementation Plan: Fireflies Clone

## Overview

This plan converts the design into incremental coding steps for a full-stack Fireflies.ai clone:
a Python **FastAPI** backend (SQLAlchemy + Alembic over SQLite, with an FTS5 search index) and a
**Next.js (TypeScript, App Router)** frontend using TanStack Query.

Build order is dependency-driven: backend and frontend scaffolding first, then the database schema
and models, then the transcript parser/serializer (the foundation that meeting creation depends on,
validated by the round-trip Property 1), then backend services and REST endpoints, then the frontend
views that consume them, then seeding, and finally deployment artifacts and the README. Core features
(Requirements 1-10) come first; bonus features (Requirements 11-16) follow and are clearly marked
**[BONUS]** so they can be deferred if time is constrained.

Property-based tests use Hypothesis (Python) and fast-check (TypeScript), each tagged
`Feature: fireflies-clone, Property {number}: {text}` and run with a minimum of 100 generated cases.

## Tasks

- [ ] 1. Scaffold backend and frontend projects
  - [ ] 1.1 Scaffold the FastAPI backend project
    - Create `backend/` with `app/` package, `pyproject.toml`/`requirements.txt` (fastapi, uvicorn, sqlalchemy, alembic, pydantic, hypothesis, pytest, httpx, google-genai, reportlab, markdown)
    - Add `app/main.py` with a FastAPI app, CORS for the frontend origin, and a `/api/health` endpoint
    - Add config module reading `DATABASE_URL` and `GEMINI_API_KEY` from environment
    - Set up `pytest` and a `tests/` directory
    - _Requirements: 8.1_

  - [ ] 1.2 Scaffold the Next.js frontend project
    - Create `frontend/` with Next.js 14+ App Router, TypeScript, ESLint
    - Install and configure TanStack Query (QueryClientProvider) and a typed API client wrapper reading `NEXT_PUBLIC_API_BASE_URL`
    - Install and configure `fast-check` + the test runner (vitest/jest) and React Testing Library
    - Add base app shell route structure (`/meetings`, `/meetings/[id]`)
    - _Requirements: 9.1_

- [ ] 2. Establish database schema, models, and migrations
  - [ ] 2.1 Define SQLAlchemy models for all 12 tables
    - Implement models: `meetings`, `participants`, `transcript_segments`, `summaries`, `action_items`, `key_topics`, `comments`, `highlights`, `soundbites`, `tags`, `meeting_tags`, `chat_messages`
    - Apply CHECK constraints, `ON DELETE CASCADE` relationships, indexes, and `UNIQUE` constraints exactly as in the design schema
    - Enable `PRAGMA foreign_keys = ON` on every connection
    - _Requirements: 8.1, 5.4_

  - [ ] 2.2 Configure Alembic and create the initial migration
    - Initialize Alembic against the SQLAlchemy metadata
    - Generate the initial migration creating all 12 tables plus the `meeting_search` FTS5 virtual table (with a guarded `LIKE`-fallback note if FTS5 is unavailable)
    - Add a DB session/engine module and a `get_db` dependency
    - _Requirements: 8.1, 8.3, 13.1_

  - [ ]* 2.3 Write integration test for persistence durability
    - Write records, dispose and reopen the SQLite connection, assert full retrieval equality with no loss or modification
    - _Requirements: 8.1, 8.3, 8.4_

- [ ] 3. Implement the transcript parser and serializer
  - [ ] 3.1 Define the normalized segment model and JSON serializer
    - Implement the internal `TranscriptSegment` dataclass and `serialize_segments` producing the normalized JSON (`version`, ordered `segments` with `index`/`speaker`/`start`/`end`/`text`)
    - Define the segment-equivalence contract used by the round-trip property
    - _Requirements: 7.4_

  - [ ] 3.2 Implement format-specific parsers (.txt, .vtt, .json)
    - Implement `TranscriptParser` for each format selected by extension/declared format, normalizing into ordered segments with non-empty speaker labels, `start_time >= 0`, and text
    - Raise `TranscriptParseError(reason, location)` on nonconformity; enforce the 10 MB size limit and zero-segment rejection
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 3.3 Write property test for parse/serialize round-trip
    - **Property 1: Transcript parse/serialize round-trip**
    - Tag: `Feature: fireflies-clone, Property 1: For any valid collection of Transcript_Segments, parsing the normalized JSON produced by serializing that collection yields an equivalent collection (identical count, ordering, speaker, start, end, text).`
    - Use a shared normalized-segment generator (unicode, whitespace, `-->`, newlines, JSON metacharacters)
    - **Validates: Requirements 7.4, 7.5**

  - [ ]* 3.4 Write property test for ordered, well-formed segments
    - **Property 2: Parser produces ordered, well-formed segments**
    - Tag: `Feature: fireflies-clone, Property 2: For any valid .txt, .vtt, or .json input, segments are in source order with strictly increasing segment_index from 0, each with non-empty speaker_label, start_time >= 0, and text.`
    - Use a dedicated generator per format
    - **Validates: Requirements 7.1**

- [ ] 4. Implement core meeting persistence services and validation
  - [ ] 4.1 Implement repositories and Pydantic request/response DTOs
    - Add repository/query helpers and the consistent error envelope `{ "error": { code, message, field } }`
    - Define Pydantic schemas enforcing field constraints for create/edit (title 1-200, valid date, participant limits) and the `MeetingSummaryDTO` / `MeetingDetailDTO` projections
    - _Requirements: 4.2, 5.2, 8.2_

  - [ ] 4.2 Implement meeting create service (metadata + pasted/parsed transcript)
    - Create meeting + participants + segments in a single transaction; roll back fully on any parse or persistence failure so no partial meeting is created
    - Apply default sort projection (date desc, then title asc) for list queries
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 1.2, 8.2_

  - [ ]* 4.3 Write property test for meeting create persistence round-trip
    - **Property 12: Meeting create persistence round-trip**
    - Tag: `Feature: fireflies-clone, Property 12: For any valid create metadata (title 1-200, valid date, 0-100 participants), creating then retrieving the meeting returns matching title, date, and participants.`
    - **Validates: Requirements 4.1**

  - [ ]* 4.4 Write property test for invalid create rejected with field error
    - **Property 13: Invalid meeting create rejected with field error**
    - Tag: `Feature: fireflies-clone, Property 13: For any create metadata violating a field constraint, the backend rejects it, creates no meeting, and returns an error identifying the failing field.`
    - **Validates: Requirements 4.2**

  - [ ]* 4.5 Write property test for invalid transcript rejected atomically
    - **Property 3: Invalid transcript input is rejected atomically**
    - Tag: `Feature: fireflies-clone, Property 3: For any nonconforming, oversized, or zero-segment transcript input, the backend rejects with a reason (and location) and persists no meeting and no Transcript_Segment.`
    - **Validates: Requirements 4.5, 7.2, 7.3**

  - [ ]* 4.6 Write property test for default library ordering
    - **Property 4: Default library ordering**
    - Tag: `Feature: fireflies-clone, Property 4: For any set of meetings, the default-sorted library lists by meeting_date descending, then title ascending for shared dates.`
    - **Validates: Requirements 1.2**

  - [ ] 4.7 Implement meeting edit and delete services
    - Edit: validate (title 1-200, 0-50 participants), update record, return 404 when the meeting does not exist, leave record unchanged on validation failure
    - Delete: cascade-remove meeting and all dependent rows in a transaction; roll back and retain all records on failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.2_

  - [ ]* 4.8 Write property test for meeting edit persistence round-trip
    - **Property 14: Meeting edit persistence round-trip**
    - Tag: `Feature: fireflies-clone, Property 14: For any existing meeting and valid edit (title 1-200, 0-50 participants), applying then retrieving returns the updated title and participants.`
    - **Validates: Requirements 5.1**

  - [ ]* 4.9 Write property test for invalid edit rejected, record unchanged
    - **Property 15: Invalid meeting edit rejected, record unchanged**
    - Tag: `Feature: fireflies-clone, Property 15: For any edit with empty/oversized title or more than 50 participants, the backend rejects the update, leaves the record unchanged, and returns a validation error.`
    - **Validates: Requirements 5.2**

  - [ ]* 4.10 Write property test for delete cascade completeness
    - **Property 16: Delete cascade completeness**
    - Tag: `Feature: fireflies-clone, Property 16: For any meeting with associated children, deletion removes the meeting and leaves no orphaned dependent rows in any child table.`
    - **Validates: Requirements 5.4**

  - [ ]* 4.11 Write property test for write-path failure safety
    - **Property 20: Write-path failure safety**
    - Tag: `Feature: fireflies-clone, Property 20: For any create or update of a meeting, transcript, summary, or action item, if persistence fails the backend returns an error, does not report success, and leaves prior state unchanged.`
    - **Validates: Requirements 8.2**

- [ ] 5. Implement action item and summary services
  - [ ] 5.1 Implement action item service (add, edit, toggle, list)
    - Add (description 1-500, defaults incomplete), edit (1-500), toggle complete/incomplete, list ordered oldest-to-newest by creation time
    - Reject empty/whitespace/over-500 descriptions leaving the DB unchanged; return error on persistence failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 5.2 Write property test for action item persistence and validation
    - **Property 17: Action item persistence and validation round-trip**
    - Tag: `Feature: fireflies-clone, Property 17: For any description 1-500 chars, adding/editing persists the value (new items incomplete) and it is retrievable; for any empty, whitespace-only, or over-500 description the operation is rejected and the DB unchanged.`
    - **Validates: Requirements 6.1, 6.2, 6.4**

  - [ ]* 5.3 Write property test for completion-status toggle round-trip
    - **Property 18: Completion-status toggle round-trip**
    - Tag: `Feature: fireflies-clone, Property 18: For any action item, marking complete sets status complete, then marking incomplete restores it to incomplete.`
    - **Validates: Requirements 6.5, 6.6**

  - [ ]* 5.4 Write property test for action items ordered oldest-to-newest
    - **Property 19: Action items ordered oldest-to-newest**
    - Tag: `Feature: fireflies-clone, Property 19: For any set of action items in a meeting, the displayed list is ordered by creation time oldest to newest.`
    - **Validates: Requirements 6.7**

  - [ ] 5.5 Implement the LLM summary provider interface and mock
    - Implement `SummaryProvider` protocol, `MockSummaryProvider` (deterministic, default when no API key), and `GeminiSummaryProvider` (used only when `GEMINI_API_KEY` is set, via google-genai SDK with gemini-2.5-flash model)
    - Generate summary + action items + key topics; on failure set `generation_status='failed'` and `generation_error` without mutating prior data
    - _Requirements: 3.4, 3.7_

  - [ ]* 5.6 Write property test for failed generation preserving existing data
    - **Property 11: Failed generation preserves existing data**
    - Tag: `Feature: fireflies-clone, Property 11: For any pre-existing meeting state, when generation fails the meeting's existing data is unchanged and the summary generation_status is recorded as failed with an error indication.`
    - **Validates: Requirements 3.7**

- [ ] 6. Expose core REST API endpoints
  - [ ] 6.1 Implement meeting routers (list, detail, create, upload, edit, delete)
    - Wire `GET /api/meetings` (search/date filters), `GET /api/meetings/{id}` (full detail bundle), `POST /api/meetings`, `POST /api/meetings/upload` (multipart), `PUT /api/meetings/{id}`, `DELETE /api/meetings/{id}`
    - Map statuses: 201/200/204, 400 (+field), 404, 422 (parse/file), 500/503
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 4.3, 5.1, 5.4_

  - [ ] 6.2 Implement action item, summary-generate, and transcript-json routers
    - Wire `POST /api/meetings/{id}/action-items`, `PUT /api/action-items/{id}`, `DELETE /api/action-items/{id}`, `POST /api/meetings/{id}/summary:generate`, `GET /api/meetings/{id}/transcript.json`
    - _Requirements: 6.1, 6.4, 6.5, 6.6, 3.4, 7.4_

  - [ ]* 6.3 Write integration tests for upload/paste persistence and LLM wiring
    - Upload one sample file per format and one pasted sample, assert segments persisted; with `MockSummaryProvider` assert generation returns summary + action items + key topics; verify real provider selected only when `GEMINI_API_KEY` present
    - _Requirements: 4.3, 4.4, 3.4_

- [ ] 7. Seed the database
  - [ ] 7.1 Implement the seeder
    - Seed at least 3 meetings, each with exactly one complete transcript, exactly one summary, and at least one action item; include participants and key topics; wire seeder to run on initialization
    - _Requirements: 8.5_

  - [ ]* 7.2 Write integration test for seeding
    - Run the seeder and assert at least 3 meetings each with one transcript, one summary, and >=1 action item
    - _Requirements: 8.5_

- [ ] 8. Checkpoint - backend core complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Build frontend app shell and meetings library
  - [ ] 9.1 Implement app shell, navbar, and toast system
    - Build `AppShell`/`Navbar` with profile/settings placeholders; implement `ToastProvider` with success/failure toasts auto-dismissing between 3 and 5 seconds; retain form data on failure
    - _Requirements: 1.9, 9.1, 9.3, 9.4_

  - [ ] 9.2 Implement client-side library filter pure functions
    - Implement case-insensitive partial-match search over title/participants, date-range filter, and combined intersection used by the library
    - _Requirements: 1.3, 1.4_

  - [ ]* 9.3 Write property test for library search membership
    - **Property 5: Library search membership**
    - Tag: `Feature: fireflies-clone, Property 5: For any set of meetings and search text, the filtered result contains exactly those meetings whose title or any participant name contains the text under case-insensitive partial matching.`
    - **Validates: Requirements 1.3**

  - [ ]* 9.4 Write property test for combined date-and-search filtering
    - **Property 6: Combined date-and-search filtering**
    - Tag: `Feature: fireflies-clone, Property 6: For any set of meetings, date range, and search text, the result equals the intersection of the date-satisfying and search-satisfying meetings.`
    - **Validates: Requirements 1.4**

  - [ ] 9.5 Implement MeetingList, MeetingCard, and SearchAndFilters with TanStack Query
    - Render title/date/duration/participants; debounced search; loading indicator, error state with retry, and empty state; navigate to detail on selection
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 1.8_

  - [ ] 9.6 Implement Create and Edit meeting modals
    - Forms with field validation, file upload, paste, and pre-population for edit; delete confirmation prompt; success/failure toasts
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 5.1, 5.6, 5.7, 5.8, 9.5_

  - [ ]* 9.7 Write unit tests for library empty/loading/error states and modals
    - Test empty-state message, loading indicator, error+retry, navigation, modal pre-population and form-data retention on failure
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 9.5_

- [ ] 10. Build the transcript detail view
  - [ ] 10.1 Implement transcript pure functions (HH:MM:SS, active-segment, search highlight)
    - Implement timestamp formatting, binary-search active-segment lookup (end implied by next segment's start when null), click-to-seek mapping, and case-insensitive search-match ranges
    - _Requirements: 2.1, 2.5, 2.6, 2.7_

  - [ ]* 10.2 Write property test for transcript display ordering and timestamp formatting
    - **Property 7: Transcript display ordering and timestamp formatting**
    - Tag: `Feature: fireflies-clone, Property 7: For any meeting transcript, segments render in ascending start_time order, and for any non-negative timestamp the label equals its correct HH:MM:SS representation.`
    - **Validates: Requirements 2.1**

  - [ ]* 10.3 Write property test for click-to-seek mapping
    - **Property 8: Click-to-seek mapping**
    - Tag: `Feature: fireflies-clone, Property 8: For any selected Transcript_Segment, the media player position is set to that segment's start_time.`
    - **Validates: Requirements 2.5**

  - [ ]* 10.4 Write property test for exactly one active segment
    - **Property 9: Exactly one active segment**
    - Tag: `Feature: fireflies-clone, Property 9: For any time-ordered segment collection and any position within the media duration, the lookup returns exactly the unique segment whose [start, end) range contains the position, with at most one active.`
    - **Validates: Requirements 2.6**

  - [ ]* 10.5 Write property test for transcript search highlighting
    - **Property 10: Transcript search highlights exactly the matches**
    - Tag: `Feature: fireflies-clone, Property 10: For any transcript text and query of 1-200 chars, the set of highlighted ranges equals all case-insensitive occurrences of the query in the displayed segments.`
    - **Validates: Requirements 2.7**

  - [ ] 10.6 Implement MediaPlayer, TranscriptPanel, and SummaryPanel
    - MediaPlayer with seek bar, media-load error indication preserving segments; TranscriptPanel with ordered segments, click-to-seek, active highlight, transcript search + clear; SummaryPanel with summary, action items (CRUD + complete), key topics, and placeholders; two independently scrollable panels
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 3.2, 3.3, 3.5, 3.6, 6.7, 6.8, 9.2_

  - [ ]* 10.7 Write unit tests for detail-view empty states and search clear
    - Test no-transcript message with player still rendered, no-summary/no-action-items/no-topics placeholders, no-match indication, and search-clear removing highlights
    - _Requirements: 2.2, 2.8, 2.9, 3.5, 3.6, 6.8_

- [ ] 11. Implement Coming Soon placeholders and single-user access
  - [ ] 11.1 Implement ComingSoon placeholders and no-auth access
    - Render non-interactive labeled "Coming Soon" placeholders for the meeting bot, integrations, and team sharing; ensure activating them takes no action and leaves view state unchanged; grant access to all data with no login step
    - _Requirements: 9.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 11.2 Write unit tests for Coming Soon placeholders and no-auth access
    - Assert placeholders are non-interactive and that no login/credential step gates access
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 12. Checkpoint - core product (Requirements 1-10) complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. [BONUS] Comments, highlights, and soundbites
  - [ ] 13.1 [BONUS] Implement comment, highlight, and soundbite services and routers
    - Comment (1-1000), highlight add/remove (one per segment), soundbite (same-meeting, end >= start); wire `POST /api/segments/{id}/comments`, `POST`/`DELETE /api/segments/{id}/highlight`, `POST /api/meetings/{id}/soundbites`; reject invalids leaving DB unchanged
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.8_

  - [ ]* 13.2 [BONUS] Write property test for comment validation round-trip
    - **Property 21: Comment validation round-trip (bonus)**
    - Tag: `Feature: fireflies-clone, Property 21: For any comment 1-1000 chars, creating persists a comment on the target segment; for any empty, whitespace-only, or over-1000 comment the operation is rejected and the DB unchanged.`
    - **Validates: Requirements 11.1, 11.2**

  - [ ]* 13.3 [BONUS] Write property test for highlight add/remove round-trip
    - **Property 22: Highlight add/remove round-trip (bonus)**
    - Tag: `Feature: fireflies-clone, Property 22: For any Transcript_Segment, applying then removing a highlight returns the segment's highlight state to its original absent state.`
    - **Validates: Requirements 11.3, 11.4**

  - [ ]* 13.4 [BONUS] Write property test for soundbite range validity
    - **Property 23: Soundbite range validity (bonus)**
    - Tag: `Feature: fireflies-clone, Property 23: For any soundbite request, it succeeds and persists start/end when end >= start and both endpoints share a meeting, and is rejected with DB unchanged when end precedes start or endpoints differ in meeting.`
    - **Validates: Requirements 11.5, 11.6**

  - [ ] 13.5 [BONUS] Implement frontend comment/highlight/soundbite UI on segments
    - Display comments, highlights, and soundbites alongside their segments
    - _Requirements: 11.7_

- [ ] 14. [BONUS] Export transcript or summary
  - [ ] 14.1 [BONUS] Implement Exporter interface (pdf, md, txt) and export router
    - Implement `Exporter` per format including title, date, participants, and selected content; wire `GET /api/meetings/{id}/export?kind=&format=`; reject unsupported formats with 415
    - _Requirements: 12.1, 12.2, 12.3, 12.5, 12.6_

  - [ ]* 14.2 [BONUS] Write property test for export content completeness
    - **Property 24: Export content completeness (bonus)**
    - Tag: `Feature: fireflies-clone, Property 24: For any meeting, a generated Markdown or TXT export of its transcript or summary contains the title, date, every participant name, and the selected content.`
    - **Validates: Requirements 12.3**

  - [ ] 14.3 [BONUS] Implement frontend ExportMenu with download and toast
    - Trigger export, initiate download, show confirmation/failure toast
    - _Requirements: 12.4, 12.6_

- [ ] 15. [BONUS] Global search across meetings
  - [ ] 15.1 [BONUS] Implement global search service and router (FTS5 + LIKE fallback)
    - Return meetings whose title/summary/segment text match (case-insensitive partial) with matching excerpts; wire `GET /api/search?q=`
    - _Requirements: 13.1, 13.2_

  - [ ]* 15.2 [BONUS] Write property test for global search membership and excerpt
    - **Property 25: Global search membership and excerpt (bonus)**
    - Tag: `Feature: fireflies-clone, Property 25: For any set of meetings and query 1-200 chars, global search returns exactly the meetings whose title, summary, or any segment contains the query (case-insensitive partial), and each excerpt contains the matched text.`
    - **Validates: Requirements 13.1, 13.2**

  - [ ] 15.3 [BONUS] Implement GlobalSearch frontend with loading/error/empty states
    - Show results with title + excerpt, navigate on selection, loading indicator, empty state, error with retry
    - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.6_

- [ ] 16. [BONUS] Tags and filtering
  - [ ] 16.1 [BONUS] Implement tag service and routers
    - Add tag (1-50, case-insensitive unique per meeting), remove tag; reject empty/whitespace/over-50/duplicate leaving DB unchanged; wire `POST`/`DELETE /api/meetings/{id}/tags`
    - _Requirements: 14.1, 14.2, 14.3, 14.7_

  - [ ]* 16.2 [BONUS] Write property test for tag association round-trip and validation
    - **Property 26: Tag association add/remove round-trip and validation (bonus)**
    - Tag: `Feature: fireflies-clone, Property 26: For any tag 1-50 chars, adding associates it (add then remove restores original set); for any empty, whitespace-only, over-50, or duplicate tag the operation is rejected and the DB unchanged.`
    - **Validates: Requirements 14.1, 14.2, 14.3**

  - [ ] 16.3 [BONUS] Implement tag display and AND-filter in the frontend
    - Display tags on cards/detail; implement tag AND-filtering in the library with empty state
    - _Requirements: 14.4, 14.5, 14.6_

  - [ ]* 16.4 [BONUS] Write property test for tag AND-filtering
    - **Property 27: Tag AND-filtering (bonus)**
    - Tag: `Feature: fireflies-clone, Property 27: For any set of meetings and selection of tags, the filtered result equals exactly the meetings whose tag set includes all selected tags.`
    - **Validates: Requirements 14.4**

- [ ] 17. [BONUS] Ask a question about this meeting
  - [ ] 17.1 [BONUS] Implement chat service and router
    - Generate a transcript-derived answer via the provider (mock when no API key), persist chat messages; wire `POST /api/meetings/{id}/chat`; return error on failure
    - _Requirements: 15.1, 15.5_

  - [ ] 17.2 [BONUS] Implement MeetingChat frontend with validation gating and states
    - Reject empty/whitespace/over-1000 questions client-side without invoking the backend; show loading state, render answer, retain question text on failure, and show no-transcript message
    - _Requirements: 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ]* 17.3 [BONUS] Write property test for question validation gating
    - **Property 28: Question validation gating (bonus)**
    - Tag: `Feature: fireflies-clone, Property 28: For any question that is empty, whitespace-only, or over 1000 chars, the frontend rejects the submission, signals invalid text, and does not invoke the backend.`
    - **Validates: Requirements 15.4**

- [ ] 18. [BONUS] Dark mode
  - [ ] 18.1 [BONUS] Implement ThemeProvider with light/dark toggle and persistence
    - Toggle theme, apply across all views, persist to `localStorage`, apply persisted theme on load, default to light when none persisted
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ]* 18.2 [BONUS] Write unit tests for theme toggle, persistence, and default
    - Assert toggle switches theme, persistence survives reload, and light is the default when none persisted
    - _Requirements: 16.1, 16.3, 16.4, 16.5_

- [ ] 19. Deployment artifacts and README
  - [ ] 19.1 Add deployment configuration for backend and frontend
    - Add Render/Railway config (start command, env vars) for the FastAPI backend and Vercel config for the Next.js frontend; document `DATABASE_URL`, `GEMINI_API_KEY`, and `NEXT_PUBLIC_API_BASE_URL`
    - _Requirements: 8.1_

  - [ ] 19.2 Write the project README
    - Document architecture, local setup (backend + frontend), running migrations and the seeder, environment variables, test commands, and deployment steps
    - _Requirements: 8.5_

- [ ] 20. Final checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP.
- Tasks marked **[BONUS]** implement Requirements 11-16 and may be deferred or omitted without affecting Requirements 1-10.
- Each task references specific requirements for traceability; property-test sub-tasks reference a specific correctness property from the design.
- Property tests use Hypothesis (Python backend) and fast-check (TypeScript frontend), run with a minimum of 100 generated cases, and are tagged `Feature: fireflies-clone, Property {number}: {text}`.
- Backend services and endpoints are built before the frontend components that consume them; the transcript parser/serializer (Property 1) is built before meeting creation that depends on it.
- Checkpoints ensure incremental validation at the end of the backend core, the core product, and the full build.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1", "9.1", "9.2", "11.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "9.3", "9.4", "9.5", "11.2", "18.1"] },
    { "id": 4, "tasks": ["4.1", "9.6", "9.7", "10.1", "18.2"] },
    { "id": 5, "tasks": ["4.2", "10.2", "10.3", "10.4", "10.5"] },
    { "id": 6, "tasks": ["4.3", "4.4", "4.5", "4.6", "4.7", "5.1", "5.5", "10.6"] },
    { "id": 7, "tasks": ["4.8", "4.9", "4.10", "4.11", "5.2", "5.3", "5.4", "5.6", "10.7"] },
    { "id": 8, "tasks": ["6.1", "6.2"] },
    { "id": 9, "tasks": ["6.3", "7.1"] },
    { "id": 10, "tasks": ["7.2"] },
    { "id": 11, "tasks": ["13.1", "14.1", "15.1", "16.1", "17.1"] },
    { "id": 12, "tasks": ["13.2", "13.3", "13.4", "14.2", "15.2", "16.2", "17.3"] },
    { "id": 13, "tasks": ["13.5", "14.3", "15.3", "16.3", "17.2"] },
    { "id": 14, "tasks": ["16.4"] },
    { "id": 15, "tasks": ["19.1", "19.2"] }
  ]
}
```
