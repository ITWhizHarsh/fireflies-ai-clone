"use client";

import { RefreshCcw, CalendarX } from "lucide-react";
import { MeetingCard } from "./MeetingCard";
import type { MeetingListItem } from "@/lib/types";

interface MeetingListProps {
  meetings: MeetingListItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#1e1e24] border border-gray-200 dark:border-[#2e2e38] rounded-xl p-5 space-y-3 animate-pulse">
      <div className="skeleton h-5 w-3/4 rounded" />
      <div className="flex gap-3">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-4 w-16 rounded" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-5 w-20 rounded-full" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function MeetingList({ meetings, isLoading, isError, onRetry }: MeetingListProps) {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        aria-label="Loading meetings"
        role="status"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <RefreshCcw size={20} className="text-red-400" />
        </div>
        <h3 className="text-gray-900 dark:text-white font-semibold mb-2">Could not load meetings</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm">
          There was an error fetching your meetings. Please check your connection and try again.
        </p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCcw size={14} />
          Retry
        </button>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#25252c] flex items-center justify-center mb-4">
          <CalendarX size={20} className="text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-gray-900 dark:text-white font-semibold mb-2">No meetings found</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
          No meetings match your current search or filter. Try adjusting your filters or create a new meeting.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
    </div>
  );
}
