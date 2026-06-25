"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Loader2, Calendar, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { searchApi } from "@/lib/api";
import type { SearchResult } from "@/lib/types";
import { debounce, formatDate } from "@/lib/utils";

interface GlobalSearchProps {
  onClose: () => void;
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [searched, setSearched] = useState(false);
  const router = useRouter();

  const performSearch = useCallback(
    debounce(async (q: string) => {
      if (!q.trim() || q.trim().length < 1) {
        setResults([]);
        setSearched(false);
        return;
      }
      setIsLoading(true);
      setIsError(false);
      try {
        const data = await searchApi.global(q);
        setResults(data);
        setSearched(true);
      } catch {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }, 400),
    []
  );

  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const navigateTo = (id: number) => {
    router.push(`/meetings/${id}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#2e2e38] rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-[#2e2e38]">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all meetings..."
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none"
            autoFocus
            aria-label="Global search"
          />
          {isLoading && <Loader2 size={16} className="text-gray-400 animate-spin flex-shrink-0" />}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors flex-shrink-0"
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {isError && (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Search failed. Please try again.</p>
              <button
                onClick={() => performSearch(query)}
                className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                <RefreshCcw size={12} />
                Retry
              </button>
            </div>
          )}

          {!isError && searched && results.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No meetings matched "{query}"</p>
            </div>
          )}

          {!isError && results.map((result) => (
            <button
              key={result.id}
              onClick={() => navigateTo(result.id)}
              className="w-full flex flex-col gap-1.5 px-5 py-4 hover:bg-gray-100 dark:hover:bg-[#25252c] transition-colors text-left border-b border-gray-200/50 dark:border-[#2e2e38]/50 last:border-0"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">{result.title}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] bg-violet-600/20 text-violet-300 px-1.5 py-0.5 rounded capitalize">
                    {result.match_type}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <Calendar size={10} />
                    {formatDate(result.meeting_date)}
                  </span>
                </div>
              </div>
              {result.excerpt && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {result.excerpt}
                </p>
              )}
              {result.participants.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {result.participants.slice(0, 3).map((p, i) => (
                    <span key={i} className="text-[10px] text-gray-500 bg-gray-200 dark:bg-[#2e2e38] px-1.5 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}

          {!searched && !isLoading && (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">Type to search across all meetings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
