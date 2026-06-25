"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, FileText } from "lucide-react";
import { TranscriptSegmentRow } from "./TranscriptSegmentRow";
import type { TranscriptSegment } from "@/lib/types";
import { findActiveSegment, findHighlightRanges } from "@/lib/utils";

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onSeek: (time: number) => void;
  meetingId: number;
}

export function TranscriptPanel({ segments, currentTime, onSeek, meetingId }: TranscriptPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const activeSegment = findActiveSegment(segments, currentTime);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLDivElement>(null);

  // Count search matches
  const matchCount = searchQuery
    ? segments.reduce((count, seg) => {
        return count + findHighlightRanges(seg.text, searchQuery).length;
      }, 0)
    : 0;

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeRowRef.current && activeSegment) {
      activeRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeSegment?.id]);

  if (segments.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-[#2e2e38]">
          <h2 className="font-semibold text-gray-900 dark:text-white text-base">Transcript</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#25252c] flex items-center justify-center mb-4">
            <FileText size={20} className="text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">No transcript available</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">
            Add a transcript when creating the meeting to see it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-[#2e2e38] space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white text-base">Transcript</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">{segments.length} segments</span>
        </div>

        {/* Transcript search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full pl-9 pr-9 py-2 bg-gray-100 dark:bg-[#25252c] border border-gray-200 dark:border-[#3a3a46] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
            aria-label="Search transcript"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Clear transcript search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Search match count */}
        {searchQuery && (
          <div className="text-xs">
            {matchCount > 0 ? (
              <span className="text-violet-300">{matchCount} match{matchCount !== 1 ? "es" : ""} found</span>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">No matches found for "{searchQuery}"</span>
            )}
          </div>
        )}
      </div>

      {/* Segments list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto py-2">
        {segments.map((seg) => (
          <div
            key={seg.id}
            ref={activeSegment?.id === seg.id ? activeRowRef : null}
          >
            <TranscriptSegmentRow
              segment={seg}
              isActive={activeSegment?.id === seg.id}
              searchQuery={searchQuery}
              onSeek={onSeek}
              meetingId={meetingId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
