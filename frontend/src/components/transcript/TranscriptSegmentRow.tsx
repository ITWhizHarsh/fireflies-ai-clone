"use client";

import { cn, formatTimestamp, findHighlightRanges, getSpeakerColor, getSpeakerInitials, type HighlightRange } from "@/lib/utils";
import type { TranscriptSegment } from "@/lib/types";
import { Highlighter, MessageSquare } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { segmentsApi } from "@/lib/api";
import toast from "react-hot-toast";

// Re-export HighlightRange for external use
export type { HighlightRange };

interface TranscriptSegmentRowProps {
  segment: TranscriptSegment;
  isActive: boolean;
  searchQuery?: string;
  onSeek: (time: number) => void;
  meetingId: number;
}

function HighlightedText({ text, ranges }: { text: string; ranges: HighlightRange[] }) {
  if (!ranges.length) return <span>{text}</span>;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const range of ranges) {
    if (range.start > lastIndex) {
      parts.push(text.slice(lastIndex, range.start));
    }
    parts.push(
      <mark key={range.start} className="search-highlight">
        {text.slice(range.start, range.end)}
      </mark>
    );
    lastIndex = range.end;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span>{parts}</span>;
}

export function TranscriptSegmentRow({
  segment,
  isActive,
  searchQuery = "",
  onSeek,
  meetingId,
}: TranscriptSegmentRowProps) {
  const queryClient = useQueryClient();
  const highlightRanges = findHighlightRanges(segment.text, searchQuery);
  const speakerColor = getSpeakerColor(segment.speaker_label);
  const initials = getSpeakerInitials(segment.speaker_label);

  const highlightMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (segment.highlight) {
        await segmentsApi.removeHighlight(segment.id);
      } else {
        await segmentsApi.addHighlight(segment.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
    },
    onError: () => {
      toast.error("Failed to update highlight");
    },
  });

  const handleClick = () => onSeek(segment.start_time);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-150 relative",
        isActive
          ? "bg-violet-600/10 border-l-2 border-violet-500 ml-[-2px]"
          : "hover:bg-gray-100 dark:hover:bg-[#25252c] border-l-2 border-transparent ml-[-2px]",
        segment.highlight && "bg-amber-500/5"
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Segment by ${segment.speaker_label} at ${formatTimestamp(segment.start_time)}`}
      aria-pressed={isActive}
    >
      {/* Speaker avatar */}
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white", speakerColor)}>
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        {/* Speaker + timestamp */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{segment.speaker_label}</span>
          <span
            className={cn(
              "text-[11px] font-mono px-1.5 py-0.5 rounded font-medium",
              isActive
                ? "bg-violet-600 text-white"
                : "bg-gray-200 dark:bg-[#2e2e38] text-gray-500 dark:text-gray-400"
            )}
          >
            {formatTimestamp(segment.start_time)}
          </span>
          {segment.highlight && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
              Highlighted
            </span>
          )}
        </div>

        {/* Text */}
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          {searchQuery && highlightRanges.length > 0 ? (
            <HighlightedText text={segment.text} ranges={highlightRanges} />
          ) : (
            segment.text
          )}
        </p>

        {/* Comments */}
        {segment.comments.length > 0 && (
          <div className="mt-2 space-y-1">
            {segment.comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#25252c] rounded-lg px-3 py-2"
              >
                <MessageSquare size={11} className="mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span>{comment.body}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons (appear on hover) */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            highlightMutation.mutate();
          }}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            segment.highlight
              ? "text-amber-400 bg-amber-500/15"
              : "text-gray-400 hover:text-amber-400 hover:bg-amber-500/10"
          )}
          aria-label={segment.highlight ? "Remove highlight" : "Add highlight"}
          title={segment.highlight ? "Remove highlight" : "Add highlight"}
        >
          <Highlighter size={13} />
        </button>
      </div>
    </div>
  );
}
