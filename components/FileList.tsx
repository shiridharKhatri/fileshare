"use client";

import { useState } from "react";
import type { FileItem } from "@/lib/types";
import { FileCard, getFormatFile } from "./FileCard";
import { downloadFileWithLoader } from "@/lib/download";

interface Props {
  files: FileItem[];
  slug: string;
  onFileDeleted: (fileId: string, fileName?: string) => void;
  onPreviewFile?: (file: FileItem) => void;
  onDownloaded?: (filename: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function FileList({
  files,
  slug,
  onFileDeleted,
  onPreviewFile,
  onDownloaded,
}: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (files.length === 0) {
    return (
      <div className="text-center py-10 px-4 rounded-3xl border border-dashed border-slate-200/80 bg-white/60 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[320px]">
        <div className="w-11 h-11 rounded-2xl bg-sky-100/60 flex items-center justify-center text-sky-600 mb-3 shadow-inner">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-700">No files shared yet</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">Drop files in the upload portal on the left to share them in this room.</p>
      </div>
    );
  }

  async function handleDelete(file: FileItem) {
    // Immediate optimistic delete and toast notification
    onFileDeleted(file.id, file.originalName);
    try {
      await fetch(`/api/rooms/${slug}/files/${file.id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  async function handleDownload(file: FileItem) {
    if (downloadingId) return;
    setDownloadingId(file.id);
    const downloadUrl = `/api/rooms/${slug}/files/${file.id}/download`;

    await downloadFileWithLoader(
      downloadUrl,
      file.originalName,
      undefined,
      () => {
        setDownloadingId(null);
        onDownloaded?.(file.originalName);
      }
    );
  }

  return (
    <div className="space-y-2.5">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white/85 border border-white shadow-xs hover:shadow-md transition-all gap-3 group"
        >
          {/* Clickable file item to open preview modal without downloading */}
          <div
            onClick={() => onPreviewFile?.(file)}
            className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPreviewFile?.(file);
              }
            }}
            title={`Click to preview ${file.originalName}`}
          >
            <FileCard formatFile={getFormatFile(file.originalName)} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-amber-800 transition-colors truncate">
                {file.originalName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">{formatSize(file.size)}</span>
                <span className="text-[10px] text-amber-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                  Click to view
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View modal trigger button */}
            <button
              type="button"
              onClick={() => onPreviewFile?.(file)}
              className="px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-full bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
              title="Preview in modal without downloading"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="hidden sm:inline">View</span>
            </button>

            {/* Direct download button with loader */}
            <button
              type="button"
              onClick={() => handleDownload(file)}
              disabled={downloadingId === file.id}
              className="btn-golden px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-medium cursor-pointer disabled:opacity-80 flex items-center gap-1"
              aria-label={`Download ${file.originalName}`}
            >
              {downloadingId === file.id ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>Download</span>
                  <span className="text-[11px]">↓</span>
                </>
              )}
            </button>

            {/* Instant Delete Button with Toast */}
            <button
              type="button"
              onClick={() => handleDelete(file)}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Delete file immediately"
              aria-label={`Delete ${file.originalName}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
