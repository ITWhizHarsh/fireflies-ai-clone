"use client";

import { useState } from "react";
import { Loader2, RefreshCcw, FileText, CheckSquare, Tag } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "@/lib/api";
import toast from "react-hot-toast";
import type { MeetingDetail } from "@/lib/types";
import { ActionItemList } from "./ActionItemList";
import { KeyTopicList } from "./KeyTopicList";
import { MeetingChat } from "@/components/bonus/MeetingChat";
import { cn } from "@/lib/utils";

interface SummaryPanelProps {
  meeting: MeetingDetail;
}

type PanelTab = "summary" | "actions" | "topics" | "chat";

export function SummaryPanel({ meeting }: SummaryPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("summary");
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: () => meetingsApi.generateSummary(meeting.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", meeting.id] });
      toast.success("Summary generated");
    },
    onError: () => toast.error("Failed to generate summary"),
  });

  const tabs: { id: PanelTab; label: string; count?: number }[] = [
    { id: "summary", label: "Summary" },
    { id: "actions", label: "Actions", count: meeting.action_items.length },
    { id: "topics", label: "Topics", count: meeting.key_topics.length },
    { id: "chat", label: "Chat" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-[#2e2e38] flex-shrink-0">
        <h2 className="font-semibold text-gray-900 dark:text-white text-base mb-3">AI Notes</h2>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-violet-600 text-white"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#25252c] hover:text-gray-900 dark:hover:text-white"
              )}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "text-[10px] px-1 rounded-full",
                  activeTab === tab.id ? "bg-white/20" : "bg-gray-200 dark:bg-[#2e2e38]"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "summary" && (
          <div className="space-y-4">
            {/* Generate button */}
            {meeting.transcript_segments.length > 0 && (
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-60"
              >
                {generateMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCcw size={12} />
                )}
                {generateMutation.isPending ? "Generating..." : "Regenerate with AI"}
              </button>
            )}

            {/* Summary content */}
            {meeting.summary?.summary_text ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={13} className="text-violet-400" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Summary</span>
                  {meeting.summary.generation_status === "seeded" && (
                    <span className="text-[10px] bg-gray-200 dark:bg-[#2e2e38] text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">Seeded</span>
                  )}
                  {meeting.summary.generation_status === "generated" && (
                    <span className="text-[10px] bg-violet-600/20 text-violet-300 px-1.5 py-0.5 rounded">AI</span>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{meeting.summary.summary_text}</p>
              </div>
            ) : meeting.summary?.generation_status === "failed" ? (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-sm text-red-300 font-medium mb-1">Generation failed</p>
                <p className="text-xs text-red-400/70">{meeting.summary.generation_error}</p>
                <button
                  onClick={() => generateMutation.mutate()}
                  className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#25252c] flex items-center justify-center mx-auto mb-3">
                  <FileText size={18} className="text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">No summary available</p>
                {meeting.transcript_segments.length > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Click "Regenerate with AI" to generate one.</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "actions" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare size={13} className="text-violet-400" />
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Action Items</span>
            </div>
            <ActionItemList items={meeting.action_items} meetingId={meeting.id} />
          </div>
        )}

        {activeTab === "topics" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag size={13} className="text-violet-400" />
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Key Topics</span>
            </div>
            <KeyTopicList topics={meeting.key_topics} />
          </div>
        )}

        {activeTab === "chat" && (
          <MeetingChat meeting={meeting} />
        )}
      </div>
    </div>
  );
}
