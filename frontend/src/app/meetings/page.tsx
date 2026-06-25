"use client";

import { useState, useMemo } from "react";
import { Plus, Mic2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { MeetingList } from "@/components/meetings/MeetingList";
import { SearchAndFilters } from "@/components/meetings/SearchAndFilters";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { meetingsApi } from "@/lib/api";
import { filterMeetings } from "@/lib/utils";
import type { MeetingFilters } from "@/lib/types";

export default function MeetingsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState<MeetingFilters>({
    search: "",
    from_date: "",
    to_date: "",
    tags: [],
  });

  const {
    data: allMeetings = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => meetingsApi.list(),
  });

  // Client-side filtering
  const meetings = useMemo(
    () =>
      filterMeetings(allMeetings, {
        search: filters.search,
        from_date: filters.from_date,
        to_date: filters.to_date,
        tags: filters.tags,
      }),
    [allMeetings, filters]
  );

  // Collect all unique tags for filter chips
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allMeetings.forEach((m) => m.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [allMeetings]);

  const handleFiltersChange = (newFilters: {
    search: string;
    from_date: string;
    to_date: string;
    tags: string[];
  }) => {
    setFilters(newFilters);
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0f0f10]">
      <Navbar />

      {/* Main content */}
      <main className="flex-1 ml-60 min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Meetings</h1>
              <p className="text-sm text-gray-500">
                {isLoading
                  ? "Loading..."
                  : `${allMeetings.length} meeting${allMeetings.length !== 1 ? "s" : ""} total`}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-violet-600/20"
            >
              <Plus size={16} />
              New Meeting
            </button>
          </div>

          {/* Search and filters */}
          <div className="mb-6">
            <SearchAndFilters
              onFiltersChange={handleFiltersChange}
              availableTags={allTags}
            />
          </div>

          {/* Meeting list */}
          <MeetingList
            meetings={meetings}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
          />
        </div>
      </main>

      {/* Create meeting modal */}
      {showCreateModal && (
        <CreateMeetingModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
