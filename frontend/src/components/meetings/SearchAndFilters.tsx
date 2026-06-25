"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Calendar, Tag } from "lucide-react";
import { debounce } from "@/lib/utils";

interface SearchAndFiltersProps {
  onFiltersChange: (filters: {
    search: string;
    from_date: string;
    to_date: string;
    tags: string[];
  }) => void;
  availableTags?: string[];
}

export function SearchAndFilters({ onFiltersChange, availableTags = [] }: SearchAndFiltersProps) {
  const [searchInput, setSearchInput] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Debounced search emit (300ms)
  const debouncedEmit = useCallback(
    debounce((search: string, from: string, to: string, tags: string[]) => {
      onFiltersChange({ search, from_date: from, to_date: to, tags });
    }, 300),
    [onFiltersChange]
  );

  useEffect(() => {
    debouncedEmit(searchInput, fromDate, toDate, selectedTags);
  }, [searchInput, fromDate, toDate, selectedTags, debouncedEmit]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearAll = () => {
    setSearchInput("");
    setFromDate("");
    setToDate("");
    setSelectedTags([]);
  };

  const hasFilters = searchInput || fromDate || toDate || selectedTags.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search meetings or participants..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-[#1e1e24] border border-gray-200 dark:border-[#2e2e38] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
            aria-label="Search meetings"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2.5 bg-white dark:bg-[#1e1e24] border border-gray-200 dark:border-[#2e2e38] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors [color-scheme:dark]"
            aria-label="From date"
          />
          <span className="text-gray-400 dark:text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2.5 bg-white dark:bg-[#1e1e24] border border-gray-200 dark:border-[#2e2e38] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors [color-scheme:dark]"
            aria-label="To date"
          />
        </div>

        {/* Clear all */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            aria-label="Clear all filters"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Tag filter chips */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Tag size={13} className="text-gray-400 dark:text-gray-500" />
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? "bg-violet-600 text-white"
                  : "bg-white dark:bg-[#1e1e24] border border-gray-200 dark:border-[#2e2e38] text-gray-500 dark:text-gray-400 hover:border-violet-500 hover:text-violet-300"
              }`}
              aria-pressed={selectedTags.includes(tag)}
              aria-label={`Filter by tag: ${tag}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
