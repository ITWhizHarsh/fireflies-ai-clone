"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileCode2, ChevronDown } from "lucide-react";
import { meetingsApi } from "@/lib/api";
import toast from "react-hot-toast";

interface ExportMenuProps {
  meetingId: number;
}

export function ExportMenu({ meetingId }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (kind: string, format: string) => {
    setExporting(true);
    setIsOpen(false);
    try {
      const blob = await meetingsApi.export(meetingId, kind, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting-${meetingId}-${kind}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${kind} exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const options = [
    { kind: "transcript", format: "pdf", label: "Transcript — PDF", icon: FileText },
    { kind: "transcript", format: "md", label: "Transcript — Markdown", icon: FileCode2 },
    { kind: "transcript", format: "txt", label: "Transcript — Text", icon: FileText },
    { kind: "summary", format: "pdf", label: "Summary — PDF", icon: FileText },
    { kind: "summary", format: "md", label: "Summary — Markdown", icon: FileCode2 },
    { kind: "summary", format: "txt", label: "Summary — Text", icon: FileText },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-[#1e1e24] border border-gray-200 dark:border-[#2e2e38] hover:bg-gray-200 dark:hover:bg-[#25252c] disabled:opacity-60 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
        aria-label="Export meeting"
        aria-expanded={isOpen}
      >
        <Download size={14} />
        Export
        <ChevronDown size={13} className={isOpen ? "rotate-180" : ""} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-gray-100 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#2e2e38] rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          {options.map(({ kind, format, label, icon: Icon }) => (
            <button
              key={`${kind}-${format}`}
              onClick={() => handleExport(kind, format)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#25252c] hover:text-gray-900 dark:hover:text-white transition-colors text-left"
            >
              <Icon size={14} className="text-gray-400 dark:text-gray-500" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
