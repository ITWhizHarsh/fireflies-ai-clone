// ---------------------------------------------------------------------------
// Core domain types (mirror backend Pydantic schemas)
// ---------------------------------------------------------------------------

export interface Participant {
  id: number;
  name: string;
  position: number;
}

export interface Tag {
  id: number;
  name: string;
}

export interface TranscriptSegment {
  id: number;
  segment_index: number;
  speaker_label: string;
  start_time: number;
  end_time: number | null;
  text: string;
  highlight: Highlight | null;
  comments: Comment[];
}

export interface Summary {
  id: number;
  summary_text: string | null;
  generation_status: "none" | "seeded" | "generated" | "failed";
  generation_error: string | null;
  created_at: number;
  updated_at: number;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  description: string;
  is_complete: boolean;
  created_at: number;
  updated_at: number;
}

export interface KeyTopic {
  id: number;
  topic: string;
  position: number;
}

export interface Comment {
  id: number;
  segment_id: number;
  body: string;
  created_at: number;
  updated_at: number;
}

export interface Highlight {
  id: number;
  color: string;
  created_at: number;
}

export interface Soundbite {
  id: number;
  meeting_id: number;
  label: string | null;
  start_time: number;
  end_time: number;
  created_at: number;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Meeting types
// ---------------------------------------------------------------------------

export interface MeetingListItem {
  id: number;
  title: string;
  meeting_date: string;
  duration_seconds: number;
  participants: string[];
  tags: string[];
  created_at: number;
}

export interface MeetingDetail {
  id: number;
  title: string;
  meeting_date: string;
  duration_seconds: number;
  media_url: string | null;
  created_at: number;
  updated_at: number;
  participants: Participant[];
  transcript_segments: TranscriptSegment[];
  summary: Summary | null;
  action_items: ActionItem[];
  key_topics: KeyTopic[];
  soundbites: Soundbite[];
  tags: Tag[];
  chat_messages: ChatMessage[];
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface MeetingCreateRequest {
  title: string;
  meeting_date: string;
  participants: string[];
  transcript_text?: string;
  duration_seconds: number;
}

export interface MeetingUpdateRequest {
  title: string;
  participants: string[];
}

export interface ActionItemCreateRequest {
  description: string;
}

export interface ActionItemUpdateRequest {
  description?: string;
  is_complete?: boolean;
}

export interface CommentCreateRequest {
  body: string;
}

export interface SoundbitCreateRequest {
  label?: string;
  start_time: number;
  end_time: number;
}

export interface TagCreateRequest {
  name: string;
}

export interface ChatRequest {
  question: string;
}

// ---------------------------------------------------------------------------
// API response / error types
// ---------------------------------------------------------------------------

export interface ErrorDetail {
  code: string;
  message: string;
  field?: string;
}

export interface ApiError {
  error: ErrorDetail;
}

export interface SearchResult extends MeetingListItem {
  match_type: string;
  excerpt: string;
}

export interface ChatResponse {
  question: string;
  answer: string;
  user_message_id: number;
  assistant_message_id: number;
}

// ---------------------------------------------------------------------------
// Filter / search state
// ---------------------------------------------------------------------------

export interface MeetingFilters {
  search: string;
  from_date: string;
  to_date: string;
  tags: string[];
}
