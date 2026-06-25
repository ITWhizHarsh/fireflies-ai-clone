"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Tag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { MediaPlayer } from "@/components/transcript/MediaPlayer";
import { TranscriptPanel } from "@/components/transcript/TranscriptPanel";
import { SummaryPanel } from "@/components/transcript/SummaryPanel";
import { EditMeetingModal } from "@/components/meetings/EditMeetingModal";
import { DeleteConfirmModal } from "@/components/meetings/DeleteConfirmModal";
import { ExportMenu } from "@/components/bonus/ExportMenu";
import { TagManager } from "@/components/bonus/TagManager";
import { formatDate, formatDuration } from "@/lib/utils";
import toast from "react-hot-toast";

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const meetingId = Number(params.id);

  const [currentTime, setCurrentTime] = useState(0);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);

  const {
    data: meeting,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: () => meetingsApi.get(meetingId),
    enabled: Boolean(meetingId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => meetingsApi.delete(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting deleted");
      router.push("/meetings");
    },
    onError: () => toast.error("Failed to delete meeting"),
  });

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setSeekTo(time);
    setCurrentTime(time);
    // Reset seekTo after a tick so it can be set again
    setTimeout(() => setSeekTo(null), 100);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-white dark:bg-[#0f0f10]">
        <Navbar />
        <main className="flex-1 ml-60 flex items-center justify-center">
          <div className="space-y-3 text-center">
            <div className="w-10 h-10 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading meeting...</p>
          </div>
        </main>
      </div>
    );
  }

  if (isError || !meeting) {
    return (
      <div className="flex min-h-screen bg-white dark:bg-[#0f0f10]">
        <Navbar />
        <main className="flex-1 ml-60 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-900 dark:text-white font-semibold mb-2">Meeting not found</p>
            <button
              onClick={() => router.push("/meetings")}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              ← Back to meetings
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0f0f10]">
      <Navbar />

      <main className="flex-1 ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="flex-shrink-0 border-b border-gray-200 dark:border-[#2e2e38] bg-white dark:bg-[#0f0f10] sticky top-0 z-10">
          <div className="flex items-center gap-4 px-6 py-4">
            {/* Back button */}
            <button
              onClick={() => router.push("/meetings")}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1e1e24] transition-colors flex-shrink-0"
              aria-label="Back to meetings"
            >
              <ArrowLeft size={18} />
            </button>

            {/* Title & meta */}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900 dark:text-white text-lg leading-tight truncate">{meeting.title}</h1>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                <span>{formatDate(meeting.meeting_date)}</span>
                {meeting.duration_seconds > 0 && (
                  <span>{formatDuration(meeting.duration_seconds)}</span>
                )}
                {meeting.participants.length > 0 && (
                  <span>{meeting.participants.map((p) => p.name).join(", ")}</span>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {meeting.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="text-[11px] bg-violet-600/15 text-violet-300 border border-violet-600/20 px-2 py-0.5 rounded-full"
                >
                  {tag.name}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowTagManager(!showTagManager)}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1e1e24] transition-colors"
                aria-label="Manage tags"
                title="Manage tags"
              >
                <Tag size={16} />
              </button>
              <ExportMenu meetingId={meetingId} />
              <button
                onClick={() => setShowEdit(true)}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1e1e24] transition-colors"
                aria-label="Edit meeting"
                title="Edit meeting"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                aria-label="Delete meeting"
                title="Delete meeting"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Tag manager panel */}
          {showTagManager && (
            <div className="px-6 pb-4 border-t border-gray-200 dark:border-[#2e2e38] pt-4">
              <TagManager meetingId={meetingId} currentTags={meeting.tags} />
            </div>
          )}
        </header>

        {/* Media player */}
        <div className="px-6 py-4 flex-shrink-0 border-b border-gray-200 dark:border-[#2e2e38]">
          <MediaPlayer
            mediaUrl={meeting.media_url}
            onTimeUpdate={handleTimeUpdate}
            seekTo={seekTo}
            totalDuration={meeting.duration_seconds}
          />
        </div>

        {/* Two-panel view: Transcript (left) + Summary (right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Transcript panel */}
          <div
            className="flex-1 border-r border-gray-200 dark:border-[#2e2e38] overflow-y-auto"
            aria-label="Transcript panel"
          >
            <TranscriptPanel
              segments={meeting.transcript_segments}
              currentTime={currentTime}
              onSeek={handleSeek}
              meetingId={meetingId}
            />
          </div>

          {/* Summary / AI notes panel */}
          <div
            className="w-[380px] flex-shrink-0 overflow-y-auto"
            aria-label="Summary panel"
          >
            <SummaryPanel meeting={meeting} />
          </div>
        </div>
      </main>

      {/* Modals */}
      {showEdit && (
        <EditMeetingModal meeting={meeting} onClose={() => setShowEdit(false)} />
      )}
      {showDelete && (
        <DeleteConfirmModal
          meetingTitle={meeting.title}
          onConfirm={() => {
            setShowDelete(false);
            deleteMutation.mutate();
          }}
          onCancel={() => setShowDelete(false)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
