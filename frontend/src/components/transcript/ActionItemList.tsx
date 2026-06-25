"use client";

import { useState } from "react";
import { Plus, Check, Pencil, Trash2, X, CheckSquare } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { actionItemsApi } from "@/lib/api";
import toast from "react-hot-toast";
import type { ActionItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ActionItemListProps {
  items: ActionItem[];
  meetingId: number;
}

export function ActionItemList({ items, meetingId }: ActionItemListProps) {
  const queryClient = useQueryClient();
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [addError, setAddError] = useState("");

  const invalidateMeeting = () => queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });

  const addMutation = useMutation({
    mutationFn: () => actionItemsApi.create(meetingId, { description: newDescription }),
    onSuccess: () => {
      setNewDescription("");
      setAddError("");
      invalidateMeeting();
      toast.success("Action item added");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to add action item";
      setAddError(msg);
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { description?: string; is_complete?: boolean } }) =>
      actionItemsApi.update(id, data),
    onSuccess: () => {
      setEditingId(null);
      invalidateMeeting();
    },
    onError: () => toast.error("Failed to update action item"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => actionItemsApi.delete(id),
    onSuccess: () => {
      invalidateMeeting();
      toast.success("Action item deleted");
    },
    onError: () => toast.error("Failed to delete action item"),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDescription.trim();
    if (!trimmed) { setAddError("Description cannot be empty"); return; }
    if (trimmed.length > 500) { setAddError("Description must be 500 characters or less"); return; }
    setAddError("");
    addMutation.mutate();
  };

  const startEdit = (item: ActionItem) => {
    setEditingId(item.id);
    setEditDescription(item.description);
  };

  const saveEdit = (id: number) => {
    const trimmed = editDescription.trim();
    if (!trimmed) { toast.error("Description cannot be empty"); return; }
    updateMutation.mutate({ id, data: { description: trimmed } });
  };

  const toggleComplete = (item: ActionItem) => {
    updateMutation.mutate({ id: item.id, data: { is_complete: !item.is_complete } });
  };

  return (
    <div className="space-y-2">
      {/* Items */}
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">No action items yet. Add one below.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#25252c] transition-colors"
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleComplete(item)}
                className={cn(
                  "mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors",
                  item.is_complete
                    ? "bg-violet-600 border-violet-600"
                    : "border-gray-300 dark:border-[#3a3a46] hover:border-violet-500"
                )}
                aria-label={item.is_complete ? "Mark incomplete" : "Mark complete"}
              >
                {item.is_complete && <Check size={10} className="text-white" />}
              </button>

              {/* Description */}
              {editingId === item.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(item.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 px-2 py-1 bg-gray-100 dark:bg-[#2e2e38] border border-violet-500 rounded text-sm text-gray-900 dark:text-white focus:outline-none"
                    autoFocus
                    maxLength={500}
                  />
                  <button
                    onClick={() => saveEdit(item.id)}
                    className="p-1.5 text-green-400 hover:text-green-300 transition-colors"
                    aria-label="Save"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className={cn(
                      "flex-1 text-sm leading-relaxed",
                      item.is_complete ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-700 dark:text-gray-200"
                    )}
                  >
                    {item.description}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => startEdit(item)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add new item */}
      <form onSubmit={handleAdd} className="pt-1">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Plus size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => { setNewDescription(e.target.value); setAddError(""); }}
              placeholder="Add action item..."
              maxLength={500}
              className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-[#25252c] border border-gray-200 dark:border-[#3a3a46] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={addMutation.isPending || !newDescription.trim()}
            className="px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            aria-label="Add action item"
          >
            {addMutation.isPending ? "..." : "Add"}
          </button>
        </div>
        {addError && <p className="mt-1 text-xs text-red-400">{addError}</p>}
      </form>
    </div>
  );
}
