import axios, { AxiosInstance } from "axios";
import type {
  MeetingListItem,
  MeetingDetail,
  MeetingCreateRequest,
  MeetingUpdateRequest,
  ActionItem,
  ActionItemCreateRequest,
  ActionItemUpdateRequest,
  Comment,
  CommentCreateRequest,
  Highlight,
  Soundbite,
  SoundbitCreateRequest,
  Tag,
  TagCreateRequest,
  SearchResult,
  ChatResponse,
  ChatRequest,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export const meetingsApi = {
  list: async (params?: {
    search?: string;
    from?: string;
    to?: string;
    tags?: string;
  }): Promise<MeetingListItem[]> => {
    const { data } = await apiClient.get("/meetings", { params });
    return data;
  },

  get: async (id: number): Promise<MeetingDetail> => {
    const { data } = await apiClient.get(`/meetings/${id}`);
    return data;
  },

  create: async (payload: MeetingCreateRequest): Promise<MeetingDetail> => {
    const { data } = await apiClient.post("/meetings", payload);
    return data;
  },

  upload: async (formData: FormData): Promise<MeetingDetail> => {
    const { data } = await apiClient.post("/meetings/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    });
    return data;
  },

  update: async (id: number, payload: MeetingUpdateRequest): Promise<MeetingDetail> => {
    const { data } = await apiClient.put(`/meetings/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/meetings/${id}`);
  },

  generateSummary: async (id: number): Promise<unknown> => {
    const { data } = await apiClient.post(`/meetings/${id}/summary:generate`);
    return data;
  },

  getTranscriptJson: async (id: number): Promise<unknown> => {
    const { data } = await apiClient.get(`/meetings/${id}/transcript.json`);
    return data;
  },

  addTag: async (id: number, tag: TagCreateRequest): Promise<Tag> => {
    const { data } = await apiClient.post(`/meetings/${id}/tags`, tag);
    return data;
  },

  removeTag: async (id: number, tagName: string): Promise<void> => {
    await apiClient.delete(`/meetings/${id}/tags/${encodeURIComponent(tagName)}`);
  },

  createSoundbite: async (id: number, payload: SoundbitCreateRequest): Promise<Soundbite> => {
    const { data } = await apiClient.post(`/meetings/${id}/soundbites`, payload);
    return data;
  },

  export: async (id: number, kind: string, format: string): Promise<Blob> => {
    const response = await apiClient.get(`/meetings/${id}/export`, {
      params: { kind, format },
      responseType: "blob",
    });
    return response.data;
  },

  chat: async (id: number, payload: ChatRequest): Promise<ChatResponse> => {
    const { data } = await apiClient.post(`/meetings/${id}/chat`, payload);
    return data;
  },
};

// ---------------------------------------------------------------------------
// Action Items
// ---------------------------------------------------------------------------

export const actionItemsApi = {
  create: async (meetingId: number, payload: ActionItemCreateRequest): Promise<ActionItem> => {
    const { data } = await apiClient.post(`/meetings/${meetingId}/action-items`, payload);
    return data;
  },

  update: async (itemId: number, payload: ActionItemUpdateRequest): Promise<ActionItem> => {
    const { data } = await apiClient.put(`/action-items/${itemId}`, payload);
    return data;
  },

  delete: async (itemId: number): Promise<void> => {
    await apiClient.delete(`/action-items/${itemId}`);
  },
};

// ---------------------------------------------------------------------------
// Segments (Comments & Highlights)
// ---------------------------------------------------------------------------

export const segmentsApi = {
  addComment: async (segmentId: number, payload: CommentCreateRequest): Promise<Comment> => {
    const { data } = await apiClient.post(`/segments/${segmentId}/comments`, payload);
    return data;
  },

  addHighlight: async (segmentId: number, color?: string): Promise<Highlight> => {
    const { data } = await apiClient.post(`/segments/${segmentId}/highlight`, null, {
      params: { color: color || "yellow" },
    });
    return data;
  },

  removeHighlight: async (segmentId: number): Promise<void> => {
    await apiClient.delete(`/segments/${segmentId}/highlight`);
  },
};

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const searchApi = {
  global: async (q: string): Promise<SearchResult[]> => {
    const { data } = await apiClient.get("/search", { params: { q } });
    return data;
  },
};

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export const healthApi = {
  check: async (): Promise<{ status: string }> => {
    const { data } = await apiClient.get("/health");
    return data;
  },
};

export default apiClient;
