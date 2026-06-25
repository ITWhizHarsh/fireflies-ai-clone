"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface TagManagerProps {
  meetingId: number;
  currentTags: { id: number; name: string }[];
}

export function TagManager({ meetingId, currentTags }: TagManagerProps) {
  const [newTag, setNewTag] = useState("");
  const [tagError, setTagError] = useState("");
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });

  const addMutation = useMutation({
    mutationFn: () => meetingsApi.addTag(meetingId, { name: newTag }),
    onSuccess: () => {
      setNewTag("");
      setTagError("");
      invalidate();
      toast.success("Tag added");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to add tag";
      setTagError(msg);
      toast.error(msg);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (tagName: string) => meetingsApi.removeTag(meetingId, tagName),
    onSuccess: () => {
      invalidate();
      toast.success("Tag removed");
    },
    onError: () => toast.error("Failed to remove tag"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTag.trim();
    if (!trimmed) { setTagError("Tag cannot be empty"); return; }
    if (trimmed.length > 50) { setTagError("Tag must be 50 characters or less"); return; }
    setTagError("");
    addMutation.mutate();
  };

  return (
    <div className="space-y-3">
      {/* Current tags */}
      <div className="flex flex-wrap gap-2">
        {currentTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-violet-600/15 text-violet-300 border border-violet-600/20"
          >
            {tag.name}
            <button
              onClick={() => removeMutation.mutate(tag.name)}
              className="hover:text-red-300 transition-colors"
              aria-label={`Remove tag ${tag.name}`}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {currentTags.length === 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">No tags yet</span>
        )}
      </div>

      {/* Add tag */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => { setNewTag(e.target.value); setTagError(""); }}
          placeholder="Add tag..."
          maxLength={50}
          className="flex-1 px-2.5 py-1.5 bg-gray-100 dark:bg-[#25252c] border border-gray-200 dark:border-[#3a3a46] rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <button
          type="submit"
          disabled={addMutation.isPending || !newTag.trim()}
          className="p-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg transition-colors"
          aria-label="Add tag"
        >
          <Plus size={14} />
        </button>
      </form>
      {tagError && <p className="text-xs text-red-400">{tagError}</p>}
    </div>
  );
}
