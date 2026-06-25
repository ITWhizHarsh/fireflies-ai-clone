"use client";

import { Trash2, AlertTriangle, X } from "lucide-react";

interface DeleteConfirmModalProps {
  meetingTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteConfirmModal({
  meetingTitle,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#2e2e38] rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-[#2e2e38]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Delete Meeting</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#25252c] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
            Are you sure you want to delete this meeting?
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">"{meetingTitle}"</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            This action cannot be undone. The meeting, transcript, summary, and all
            associated data will be permanently removed.
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              {isDeleting ? "Deleting..." : "Delete Meeting"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
