"use client";

import { useRouter } from "next/navigation";
import { Calendar, Clock, Users, Tag } from "lucide-react";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import type { MeetingListItem } from "@/lib/types";

interface MeetingCardProps {
  meeting: MeetingListItem;
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/meetings/${meeting.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={cn(
        "bg-white dark:bg-[#1e1e24] border border-gray-200 dark:border-[#2e2e38] rounded-xl p-5 cursor-pointer",
        "hover:bg-gray-50 dark:hover:bg-[#25252c] hover:border-gray-300 dark:hover:border-[#3a3a46] transition-all duration-150",
        "focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open meeting: ${meeting.title}`}
    >
      {/* Title */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-[15px] leading-snug mb-3 line-clamp-2">
        {meeting.title}
      </h3>

      {/* Meta row */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <Calendar size={12} className="text-gray-400 dark:text-gray-500" />
          {formatDate(meeting.meeting_date)}
        </span>
        {meeting.duration_seconds > 0 && (
          <span className="flex items-center gap-1.5">
            <Clock size={12} className="text-gray-400 dark:text-gray-500" />
            {formatDuration(meeting.duration_seconds)}
          </span>
        )}
        {meeting.participants.length > 0 && (
          <span className="flex items-center gap-1.5">
            <Users size={12} className="text-gray-400 dark:text-gray-500" />
            {meeting.participants.length}{" "}
            {meeting.participants.length === 1 ? "person" : "people"}
          </span>
        )}
      </div>

      {/* Participants */}
      {meeting.participants.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {meeting.participants.slice(0, 4).map((name, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-gray-100 dark:bg-[#2a2a32] text-gray-700 dark:text-gray-300 font-medium"
            >
              {name}
            </span>
          ))}
          {meeting.participants.length > 4 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-gray-100 dark:bg-[#2a2a32] text-gray-400 dark:text-gray-500">
              +{meeting.participants.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {meeting.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {meeting.tags.slice(0, 5).map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-violet-600/15 text-violet-300 border border-violet-600/20"
            >
              <Tag size={9} />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
