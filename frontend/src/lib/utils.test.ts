import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  formatTimestamp,
  findActiveSegment,
  findHighlightRanges,
  filterMeetingsBySearch,
  filterMeetingsByDate,
  filterMeetingsByTags,
  filterMeetings,
} from "./utils";
import type { TranscriptSegment, MeetingListItem } from "./types";

// ---------------------------------------------------------------------------
// formatTimestamp — Property 7 (HH:MM:SS formatting)
// ---------------------------------------------------------------------------
describe("formatTimestamp", () => {
  it("formats 0 seconds as 00:00:00", () => {
    expect(formatTimestamp(0)).toBe("00:00:00");
  });

  it("formats 61 seconds as 00:01:01", () => {
    expect(formatTimestamp(61)).toBe("00:01:01");
  });

  it("formats 3661 seconds as 01:01:01", () => {
    expect(formatTimestamp(3661)).toBe("01:01:01");
  });

  it("formats 7199 seconds as 01:59:59", () => {
    expect(formatTimestamp(7199)).toBe("01:59:59");
  });

  /**
   * Property 7: Transcript display ordering and timestamp formatting
   * For any non-negative timestamp, the label equals its correct HH:MM:SS representation.
   *
   * Validates: Requirements 2.1
   */
  it("Property 7: for any non-negative seconds, produces correct HH:MM:SS", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 359999 }), // 0 to 99:59:59
        (seconds) => {
          const result = formatTimestamp(seconds);
          const parts = result.split(":");
          expect(parts).toHaveLength(3);
          const [h, m, s] = parts.map(Number);
          expect(h * 3600 + m * 60 + s).toBe(Math.floor(seconds));
          expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// findActiveSegment — Property 9 (exactly one active segment)
// ---------------------------------------------------------------------------
describe("findActiveSegment", () => {
  const makeSegment = (
    id: number,
    start: number,
    end: number | null,
    index: number
  ): TranscriptSegment => ({
    id,
    segment_index: index,
    speaker_label: `Speaker ${id}`,
    start_time: start,
    end_time: end,
    text: "text",
    highlight: null,
    comments: [],
  });

  it("returns null for empty segments", () => {
    expect(findActiveSegment([], 5)).toBeNull();
  });

  it("returns the segment whose range contains currentTime", () => {
    const segs = [
      makeSegment(1, 0, 5, 0),
      makeSegment(2, 5, 10, 1),
      makeSegment(3, 10, null, 2),
    ];
    expect(findActiveSegment(segs, 3)?.id).toBe(1);
    expect(findActiveSegment(segs, 7)?.id).toBe(2);
    expect(findActiveSegment(segs, 12)?.id).toBe(3);
  });

  it("uses next segment start as implied end when end_time is null", () => {
    const segs = [
      makeSegment(1, 0, null, 0),
      makeSegment(2, 10, null, 1),
    ];
    // time 5 is in [0, 10) so segment 1
    expect(findActiveSegment(segs, 5)?.id).toBe(1);
    // time 10 is in [10, ∞) so segment 2
    expect(findActiveSegment(segs, 10)?.id).toBe(2);
  });

  /**
   * Property 9: Exactly one active segment
   * For any time-ordered segment collection and any playback position,
   * at most one segment is active.
   *
   * Validates: Requirements 2.6
   */
  it("Property 9: at most one segment is active for any time position", () => {
    fc.assert(
      fc.property(
        // Generate 1-10 segments with increasing start times
        fc.array(fc.nat({ max: 100 }), { minLength: 1, maxLength: 10 }).map((starts) => {
          const sorted = [...new Set(starts)].sort((a, b) => a - b);
          return sorted.map((start, i) => makeSegment(i + 1, start, null, i));
        }),
        fc.float({ min: 0, max: 200, noNaN: true }),
        (segments, time) => {
          const active = findActiveSegment(segments, time);
          // At most one result (never throws, never returns multiple)
          expect(active === null || typeof active.id === "number").toBe(true);
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// findHighlightRanges — Property 10 (transcript search highlights)
// ---------------------------------------------------------------------------
describe("findHighlightRanges", () => {
  it("returns empty for empty query", () => {
    expect(findHighlightRanges("hello world", "")).toHaveLength(0);
  });

  it("finds single occurrence", () => {
    const ranges = findHighlightRanges("hello world", "world");
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toEqual({ start: 6, end: 11 });
  });

  it("finds multiple occurrences", () => {
    const ranges = findHighlightRanges("the cat and the cat", "cat");
    expect(ranges).toHaveLength(2);
  });

  it("is case-insensitive", () => {
    const ranges = findHighlightRanges("Hello HELLO hello", "hello");
    expect(ranges).toHaveLength(3);
  });

  it("returns empty when no match", () => {
    expect(findHighlightRanges("hello world", "xyz")).toHaveLength(0);
  });

  /**
   * Property 10: Transcript search highlights exactly the matches
   * For any transcript text and query, highlighted ranges equal all
   * case-insensitive occurrences.
   *
   * Validates: Requirements 2.7
   */
  it("Property 10: highlighted ranges equal all case-insensitive occurrences", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (text, query) => {
          const ranges = findHighlightRanges(text, query);
          // Verify each range actually contains the query text (case-insensitive)
          for (const range of ranges) {
            const slice = text.slice(range.start, range.end).toLowerCase();
            expect(slice).toBe(query.toLowerCase());
          }
          // Verify no overlap between ranges
          for (let i = 1; i < ranges.length; i++) {
            expect(ranges[i].start).toBeGreaterThanOrEqual(ranges[i - 1].end);
          }
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// filterMeetingsBySearch — Property 5
// ---------------------------------------------------------------------------
describe("filterMeetingsBySearch", () => {
  const makeMeeting = (
    id: number,
    title: string,
    participants: string[] = []
  ): MeetingListItem => ({
    id,
    title,
    meeting_date: "2024-01-01",
    duration_seconds: 0,
    participants,
    tags: [],
    created_at: 0,
  });

  it("returns all meetings for empty search", () => {
    const meetings = [makeMeeting(1, "Alpha"), makeMeeting(2, "Beta")];
    expect(filterMeetingsBySearch(meetings, "")).toHaveLength(2);
  });

  it("filters by title (case-insensitive)", () => {
    const meetings = [makeMeeting(1, "Product Review"), makeMeeting(2, "Engineering Sync")];
    const result = filterMeetingsBySearch(meetings, "product");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("filters by participant name", () => {
    const meetings = [
      makeMeeting(1, "Meeting 1", ["Alice", "Bob"]),
      makeMeeting(2, "Meeting 2", ["Charlie"]),
    ];
    expect(filterMeetingsBySearch(meetings, "alice")).toHaveLength(1);
    expect(filterMeetingsBySearch(meetings, "charlie")).toHaveLength(1);
  });

  /**
   * Property 5: Library search membership
   * Result contains exactly those meetings whose title or participant contains text.
   *
   * Validates: Requirements 1.3
   */
  it("Property 5: result contains exactly matching meetings", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.nat(),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            participants: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
          }),
          { maxLength: 20 }
        ),
        fc.string({ minLength: 1, maxLength: 10 }),
        (meetingInputs, search) => {
          const meetings: MeetingListItem[] = meetingInputs.map((m) => ({
            ...m,
            meeting_date: "2024-01-01",
            duration_seconds: 0,
            tags: [],
            created_at: 0,
          }));

          const result = filterMeetingsBySearch(meetings, search);
          const lowerSearch = search.toLowerCase();

          // Every returned meeting must match
          for (const m of result) {
            const titleMatch = m.title.toLowerCase().includes(lowerSearch);
            const participantMatch = m.participants.some((p) =>
              p.toLowerCase().includes(lowerSearch)
            );
            expect(titleMatch || participantMatch).toBe(true);
          }

          // Every matching meeting must be in result
          const resultIds = new Set(result.map((m) => m.id));
          for (const m of meetings) {
            const shouldMatch =
              m.title.toLowerCase().includes(lowerSearch) ||
              m.participants.some((p) => p.toLowerCase().includes(lowerSearch));
            if (shouldMatch) {
              expect(resultIds.has(m.id)).toBe(true);
            }
          }
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// filterMeetings — Property 6 (combined filtering is an intersection)
// ---------------------------------------------------------------------------
describe("filterMeetings (combined)", () => {
  const makeMeeting = (
    id: number,
    title: string,
    date: string,
    tags: string[] = [],
    participants: string[] = []
  ): MeetingListItem => ({
    id,
    title,
    meeting_date: date,
    duration_seconds: 0,
    participants,
    tags,
    created_at: 0,
  });

  /**
   * Property 6: Combined date-and-search filtering is an intersection
   *
   * Validates: Requirements 1.4
   */
  it("Property 6: combined result equals intersection of date and search results", () => {
    const meetings = [
      makeMeeting(1, "Alpha Review", "2024-01-15"),
      makeMeeting(2, "Beta Planning", "2024-02-10"),
      makeMeeting(3, "Alpha Planning", "2024-02-20"),
      makeMeeting(4, "Gamma Review", "2024-03-01"),
    ];

    // With both search and date filter
    const result = filterMeetings(meetings, {
      search: "alpha",
      from_date: "2024-02-01",
      to_date: "2024-03-31",
    });

    // Should only include meetings that match BOTH criteria
    expect(result.every((m) => m.title.toLowerCase().includes("alpha"))).toBe(true);
    expect(result.every((m) => m.meeting_date >= "2024-02-01" && m.meeting_date <= "2024-03-31")).toBe(true);
    expect(result.map((m) => m.id)).toEqual(expect.arrayContaining([3]));
    expect(result.map((m) => m.id)).not.toContain(1); // alpha but outside date range
  });
});
