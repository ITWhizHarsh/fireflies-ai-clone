"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, FileText } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { meetingsApi } from "@/lib/api";
import toast from "react-hot-toast";
import type { MeetingDetail, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MeetingChatProps {
  meeting: MeetingDetail;
}

export function MeetingChat({ meeting }: MeetingChatProps) {
  const [question, setQuestion] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(meeting.chat_messages);
  const [questionError, setQuestionError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const askMutation = useMutation({
    mutationFn: (q: string) => meetingsApi.chat(meeting.id, { question: q }),
    onSuccess: (data) => {
      const now = Math.floor(Date.now() / 1000);
      setLocalMessages((prev) => [
        ...prev,
        { id: data.user_message_id, role: "user", content: data.question, created_at: now },
        { id: data.assistant_message_id, role: "assistant", content: data.answer, created_at: now + 1 },
      ]);
      setQuestion("");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to get answer";
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();

    // Client-side validation — do NOT invoke backend
    if (!trimmed) { setQuestionError("Question cannot be empty"); return; }
    if (trimmed.length > 1000) { setQuestionError("Question must be 1000 characters or less"); return; }
    setQuestionError("");

    askMutation.mutate(trimmed);
  };

  // No transcript available
  if (meeting.transcript_segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#25252c] flex items-center justify-center mb-3">
          <FileText size={18} className="text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">No transcript available</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Add a transcript to this meeting to enable Q&A.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto min-h-0 mb-3">
        {localMessages.length === 0 && (
          <div className="text-center py-6">
            <Bot size={24} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ask anything about this meeting</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Powered by AI based on the transcript</p>
          </div>
        )}

        {localMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-2.5",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
              msg.role === "user" ? "bg-violet-600" : "bg-gray-200 dark:bg-[#25252c]"
            )}>
              {msg.role === "user" ? (
                <User size={13} className="text-white" />
              ) : (
                <Bot size={13} className="text-gray-500 dark:text-gray-300" />
              )}
            </div>
            <div className={cn(
              "max-w-[80%] px-3 py-2.5 rounded-xl text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-violet-600 text-white rounded-tr-sm"
                : "bg-gray-100 dark:bg-[#25252c] text-gray-700 dark:text-gray-200 rounded-tl-sm"
            )}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {askMutation.isPending && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-[#25252c] flex items-center justify-center flex-shrink-0">
              <Bot size={13} className="text-gray-500 dark:text-gray-300" />
            </div>
            <div className="bg-gray-100 dark:bg-[#25252c] px-4 py-3 rounded-xl rounded-tl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse-dot"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={question}
              onChange={(e) => { setQuestion(e.target.value); setQuestionError(""); }}
              placeholder="Ask a question..."
              maxLength={1000}
              disabled={askMutation.isPending}
              className={cn(
                "w-full px-3 py-2.5 bg-gray-100 dark:bg-[#25252c] border rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-colors",
                questionError ? "border-red-500" : "border-gray-200 dark:border-[#3a3a46] focus:border-violet-500"
              )}
            />
            {questionError && <p className="mt-1 text-xs text-red-400">{questionError}</p>}
          </div>
          <button
            type="submit"
            disabled={askMutation.isPending || !question.trim()}
            className="w-10 h-10 flex items-center justify-center bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex-shrink-0"
            aria-label="Send question"
          >
            {askMutation.isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
