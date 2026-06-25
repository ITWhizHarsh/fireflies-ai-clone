"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "@/lib/api";
import type { MeetingDetail } from "@/lib/types";

interface EditMeetingModalProps {
  meeting: MeetingDetail;
  onClose: () => void;
}

export function EditMeetingModal({ meeting, onClose }: EditMeetingModalProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(meeting.title);
  const [participants, setParticipants] = useState<string[]>(
    meeting.participants.length > 0
      ? meeting.participants.map((p) => p.name)
      : [""]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateMutation = useMutation({
    mutationFn: () =>
      meetingsApi.update(meeting.id, {
        title,
        participants: participants.filter((p) => p.trim()),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meeting", meeting.id] });
      toast.success("Meeting updated successfully");
      onClose();
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: { error?: { message?: string; field?: string } } } });
      const errMsg = apiErr?.response?.data?.error?.message || "Failed to update meeting";
      const field = apiErr?.response?.data?.error?.field;
      if (field) {
        setErrors((prev) => ({ ...prev, [field]: errMsg }));
      }
      toast.error(errMsg);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    else if (title.length > 200) newErrors.title = "Title must be 200 characters or less";
    const valid = participants.filter((p) => p.trim());
    if (valid.length > 50) newErrors.participants = "Maximum 50 participants for editing";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    updateMutation.mutate();
  };

  const addParticipant = () => setParticipants((prev) => [...prev, ""]);
  const updateParticipant = (i: number, val: string) =>
    setParticipants((prev) => prev.map((p, idx) => (idx === i ? val : p)));
  const removeParticipant = (i: number) =>
    setParticipants((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#2e2e38] rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-[#2e2e38]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Meeting</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#25252c] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#25252c] border border-gray-200 dark:border-[#3a3a46] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
              maxLength={200}
            />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Participants</label>
            <div className="space-y-2">
              {participants.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => updateParticipant(i, e.target.value)}
                    placeholder={`Participant ${i + 1}`}
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#25252c] border border-gray-200 dark:border-[#3a3a46] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  {participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(i)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      aria-label="Remove participant"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {participants.length < 50 && (
                <button
                  type="button"
                  onClick={addParticipant}
                  className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <Plus size={14} />
                  Add participant
                </button>
              )}
            </div>
            {errors.participants && <p className="mt-1 text-xs text-red-400">{errors.participants}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
