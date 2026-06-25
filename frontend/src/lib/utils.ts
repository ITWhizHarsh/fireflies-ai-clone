import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TranscriptSegment, MeetingListItem } from "./types";

// ---------------------------------------------------------------------------
// Tailwind class merging helper
// ---------------------------------------------------------------------------
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Timestamp formatting
// ---------------------------------------------------------------------------

/**
 * Format a time in seconds to HH:MM:SS string.
 * Property 7: For any non-negative timestamp, the label equals its correct HH:MM:SS representation.
 */
export function formatTimestamp(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format duration in seconds to a human-readable string.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// ---------------------------------------------------------------------------
// Active segment lookup
// ---------------------------------------------------------------------------

/**
 * Find the active transcript segment for a given playback position.
 *
 * Property 9: For any time-ordered segment collection and any position within
 * the media duration, returns exactly the unique segment whose [start, end)
 * range contains the position. When end_time is null, uses next segment's
 * start as the implied end.
 */
export function findActiveSegment(
  segments: TranscriptSegment[],
  currentTime: number
): TranscriptSegment | null {
  if (!segments.length) return null;

  // Segments must be sorted by start_time ascending
  const sorted = [...segments].sort((a, b) => a.start_time - b.start_time);

  for (let i = 0; i < sorted.length; i++) {
    const seg = sorted[i];
    const start = seg.start_time;
    // Implied end is next segment's start, or Infinity for last segment
    const end = seg.end_time !== null
      ? seg.end_time
      : i + 1 < sorted.length
        ? sorted[i + 1].start_time
        : Infinity;

    if (currentTime >= start && currentTime < end) {
      return seg;
    }
  }

  // If past all segments, return the last one
  return sorted[sorted.length - 1];
}

// ---------------------------------------------------------------------------
// Search highlight ranges
// ---------------------------------------------------------------------------

export interface HighlightRange {
  start: number;
  end: number;
}

/**
 * Find all case-insensitive occurrences of query in text.
 * Returns an array of {start, end} character ranges.
 *
 * Property 10: For any transcript text and query, the highlighted ranges equal
 * all case-insensitive occurrences.
 */
export function findHighlightRanges(text: string, query: string): HighlightRange[] {
  if (!query || !query.trim()) return [];

  const ranges: HighlightRange[] = [];
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  let startIdx = 0;

  while (startIdx < text.length) {
    const idx = textLower.indexOf(queryLower, startIdx);
    if (idx === -1) break;
    ranges.push({ start: idx, end: idx + query.length });
    startIdx = idx + 1;
  }

  return ranges;
}

// ---------------------------------------------------------------------------
// Client-side meeting filtering
// ---------------------------------------------------------------------------

/**
 * Filter meetings by search text using case-insensitive partial matching.
 * Property 5: Result contains exactly meetings whose title or participant contains text.
 */
export function filterMeetingsBySearch(meetings: MeetingListItem[], search: string): MeetingListItem[] {
  if (!search.trim()) return meetings;
  const lower = search.toLowerCase();
  return meetings.filter(
    (m) =>
      m.title.toLowerCase().includes(lower) ||
      m.participants.some((p) => p.toLowerCase().includes(lower))
  );
}

/**
 * Filter meetings by date range.
 */
export function filterMeetingsByDate(
  meetings: MeetingListItem[],
  fromDate?: string,
  toDate?: string
): MeetingListItem[] {
  return meetings.filter((m) => {
    if (fromDate && m.meeting_date < fromDate) return false;
    if (toDate && m.meeting_date > toDate) return false;
    return true;
  });
}

/**
 * Filter meetings by tags (AND semantics — meeting must have ALL selected tags).
 * Property 27: Result equals exactly meetings whose tag set includes all selected tags.
 */
export function filterMeetingsByTags(meetings: MeetingListItem[], tags: string[]): MeetingListItem[] {
  if (!tags.length) return meetings;
  const tagsLower = tags.map((t) => t.toLowerCase());
  return meetings.filter((m) =>
    tagsLower.every((tag) => m.tags.map((t) => t.toLowerCase()).includes(tag))
  );
}

/**
 * Combined filter applying search + date range + tags (intersection).
 * Property 6: Result equals the intersection of date and search filtered sets.
 */
export function filterMeetings(
  meetings: MeetingListItem[],
  filters: { search?: string; from_date?: string; to_date?: string; tags?: string[] }
): MeetingListItem[] {
  let result = meetings;
  if (filters.search) result = filterMeetingsBySearch(result, filters.search);
  if (filters.from_date || filters.to_date)
    result = filterMeetingsByDate(result, filters.from_date, filters.to_date);
  if (filters.tags?.length) result = filterMeetingsByTags(result, filters.tags);
  return result;
}

// ---------------------------------------------------------------------------
// Debounce
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Speaker color
// ---------------------------------------------------------------------------

const SPEAKER_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
];

export function getSpeakerColor(speakerLabel: string): string {
  let hash = 0;
  for (let i = 0; i < speakerLabel.length; i++) {
    hash = speakerLabel.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SPEAKER_COLORS[Math.abs(hash) % SPEAKER_COLORS.length];
}

export function getSpeakerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
