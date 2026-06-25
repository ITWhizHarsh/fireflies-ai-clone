"use client";

import { useState, useRef } from "react";
import { X, Plus, Trash2, Upload, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingsApi } from "@/lib/api";

interface CreateMeetingModalProps {
  onClose: () => void;
}

export function CreateMeetingModal({ onClose }: CreateMeetingModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [participants, setParticipants] = useState<string[]>([""]);
  const [transcriptText, setTranscriptText] = useState("");
  const [uploadMode, setUploadMode] = useState<"paste" | "file">("paste");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (formData: FormData | object) =>
      formData instanceof FormData
        ? meetingsApi.upload(formData as FormData)
        : meetingsApi.create(formData as Parameters<typeof meetingsApi.create>[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting created successfully");
      onClose();
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: { error?: { message?: string; field?: string } } } });
      const errMsg = apiErr?.response?.data?.error?.message || "Failed to create meeting";
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
    if (!meetingDate) newErrors.meeting_date = "Date is required";
    const validParticipants = participants.filter((p) => p.trim());
    if (validParticipants.length > 100) newErrors.participants = "Maximum 100 participants";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const validParticipants = participants.filter((p) => p.trim());

    if (uploadMode === "file" && uploadedFile) {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("meeting_date", meetingDate);
      formData.append("participants", JSON.stringify(validParticipants));
      formData.append("duration_seconds", String(durationSeconds));
      formData.append("file", uploadedFile);
      createMutation.mutate(formData);
    } else {
      createMutation.mutate({
        title,
        meeting_date: meetingDate,
        participants: validParticipants,
        duration_seconds: durationSeconds,
        transcript_text: transcriptText || undefined,
      });
    }
  };

  const addParticipant = () => setParticipants((prev) => [...prev, ""]);
  const updateParticipant = (i: number, val: string) =>
    setParticipants((prev) => prev.map((p, idx) => (idx === i ? val : p)));
  const removeParticipant = (i: number) =>
    setParticipants((prev) => prev.filter((_, idx) => idx !== i));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["txt", "vtt", "json"].includes(ext || "")) {
        setErrors((prev) => ({ ...prev, file: "Only .txt, .vtt, or .json files are supported" }));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, file: "File must be 10 MB or less" }));
        return;
      }
      setUploadedFile(file);
      setErrors((prev) => ({ ...prev, file: "" }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#2e2e38] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-[#2e2e38]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Meeting</h2>
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
              placeholder="e.g. Q3 Product Review"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#25252c] border border-gray-200 dark:border-[#3a3a46] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
              maxLength={200}
            />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
          </div>

          {/* Date + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#25252c] border border-gray-200 dark:border-[#3a3a46] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors [color-scheme:dark]"
              />
              {errors.meeting_date && <p className="mt-1 text-xs text-red-400">{errors.meeting_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Duration (seconds)</label>
              <input
                type="number"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                min={0}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#25252c] border border-gray-200 dark:border-[#3a3a46] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
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
              {participants.length < 100 && (
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

          {/* Transcript section */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              Transcript (optional)
            </label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setUploadMode("paste")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  uploadMode === "paste"
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 dark:bg-[#25252c] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <FileText size={12} />
                Paste text
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("file")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  uploadMode === "file"
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 dark:bg-[#25252c] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Upload size={12} />
                Upload file
              </button>
            </div>

            {uploadMode === "paste" ? (
              <textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                placeholder="Paste transcript text here... (format: 'Speaker: text' or WebVTT)"
                rows={5}
                maxLength={1_000_000}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#25252c] border border-gray-200 dark:border-[#3a3a46] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
            ) : (
              <div>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    errors.file
                      ? "border-red-500/50"
                      : "border-gray-200 dark:border-[#3a3a46] hover:border-violet-500/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                  tabIndex={0}
                  role="button"
                  aria-label="Upload transcript file"
                >
                  <Upload size={20} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {uploadedFile ? (
                      <span className="text-violet-300">{uploadedFile.name}</span>
                    ) : (
                      <>
                        Click to upload <span className="text-violet-400">.txt, .vtt, or .json</span>
                        <br />
                        <span className="text-xs text-gray-400 dark:text-gray-500">Max 10 MB</span>
                      </>
                    )}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.vtt,.json"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="Select transcript file"
                />
                {errors.file && <p className="mt-1 text-xs text-red-400">{errors.file}</p>}
              </div>
            )}
            {errors.transcript_text && (
              <p className="mt-1 text-xs text-red-400">{errors.transcript_text}</p>
            )}
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
              disabled={createMutation.isPending}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {createMutation.isPending ? "Creating..." : "Create Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
