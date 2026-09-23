"use client";

import { useEffect, useState } from "react";
import type { FileItem } from "@/lib/types";
import { FileCard, getFormatFile } from "./FileCard";
import { downloadFileWithLoader } from "@/lib/download";

interface Props {
  file: FileItem | null;
  slug: string;
  onClose: () => void;
  onDownloaded?: (filename: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function PreviewSpinner({ message = "Loading preview..." }: { message?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50/90 z-20 backdrop-blur-xs">
      <div className="w-10 h-10 rounded-full border-3 border-amber-400/25 border-t-amber-500 animate-spin" />
      <p className="text-xs font-medium text-slate-500 animate-pulse">{message}</p>
    </div>
  );
}

function TextViewer({ slug, fileId }: { slug: string; fileId: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/rooms/${slug}/files/${fileId}/download?inline=true`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load content");
        return res.text();
      })
      .then((text) => {
        if (isMounted) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setContent("Unable to preview this file's text contents.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug, fileId]);

  async function handleCopy() {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  if (loading) {
    return (
      <div className="relative flex-1 min-h-[300px]">
        <PreviewSpinner message="Loading code preview..." />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-end pb-2">
        <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-1 text-xs font-medium rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
        >
          {copied ? "✓ Copied" : "Copy Code"}
        </button>
      </div>
      <div className="flex-1 rounded-2xl bg-[#1e2127] text-slate-100 p-4 font-mono text-xs overflow-auto max-h-[66vh] shadow-inner custom-scrollbar">
        <pre className="whitespace-pre-wrap break-words">{content}</pre>
      </div>
    </div>
  );
}

export default function FilePreviewModal({ file, slug, onClose, onDownloaded }: Props) {
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const ext = file?.originalName.split(".").pop()?.toLowerCase() || "";
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
  const isPdf = ext === "pdf";
  const isVideo = ["mp4", "mov", "webm", "mkv", "avi"].includes(ext);
  const isAudio = ["mp3", "wav", "m4a", "ogg", "aac", "flac"].includes(ext);
  const isText = [
    "txt",
    "md",
    "mdx",
    "json",
    "csv",
    "js",
    "jsx",
    "ts",
    "tsx",
    "html",
    "css",
    "scss",
    "log",
    "xml",
    "yaml",
    "yml",
    "sh",
    "py",
  ].includes(ext);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scrolling while modal is open
  useEffect(() => {
    if (file) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [file]);

  if (!file) return null;

  const inlineUrl = `/api/rooms/${slug}/files/${file.id}/download?inline=true`;
  const downloadUrl = `/api/rooms/${slug}/files/${file.id}/download`;

  async function handleDownload() {
    if (!file || isDownloading) return;
    setIsDownloading(true);
    await downloadFileWithLoader(
      downloadUrl,
      file.originalName,
      undefined,
      () => {
        setIsDownloading(false);
        onDownloaded?.(file.originalName);
      }
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-white/80 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-100 bg-white/95 backdrop-blur-sm gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <FileCard formatFile={getFormatFile(file.originalName)} size="sm" />
            <div className="min-w-0 flex-1">
              <h2
                id="preview-modal-title"
                className="text-xs sm:text-sm font-semibold text-slate-800 truncate"
                title={file.originalName}
              >
                {file.originalName}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5">
                {formatSize(file.size)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="btn-golden px-3 sm:px-4 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-80 flex items-center gap-1.5"
              title="Download file"
            >
              {isDownloading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <span>Download</span>
                  <span className="text-[11px]">↓</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer with Loaders */}
        <div className="relative flex-1 overflow-auto bg-slate-50/70 flex flex-col justify-center min-h-[320px]">
          {isImage && (
            <div className="relative p-4 sm:p-6 flex items-center justify-center flex-1 min-h-[320px]">
              {isMediaLoading && <PreviewSpinner message="Loading image..." />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={file.id}
                src={inlineUrl}
                alt={file.originalName}
                onLoad={() => setIsMediaLoading(false)}
                onError={() => setIsMediaLoading(false)}
                className={`max-h-[72vh] max-w-full object-contain rounded-2xl shadow-sm border border-slate-200/60 transition-opacity duration-300 ${
                  isMediaLoading ? "opacity-0" : "opacity-100"
                }`}
              />
            </div>
          )}

          {isPdf && (
            <div className="relative w-full h-[72vh]">
              {isMediaLoading && <PreviewSpinner message="Loading document..." />}
              <iframe
                key={file.id}
                src={inlineUrl}
                onLoad={() => setIsMediaLoading(false)}
                className="w-full h-full border-0"
                title={file.originalName}
              />
            </div>
          )}

          {isVideo && (
            <div className="relative p-4 sm:p-6 flex items-center justify-center bg-black/95 flex-1 min-h-[320px]">
              {isMediaLoading && <PreviewSpinner message="Buffering video..." />}
              <video
                key={file.id}
                controls
                autoPlay
                playsInline
                src={inlineUrl}
                onLoadedData={() => setIsMediaLoading(false)}
                onError={() => setIsMediaLoading(false)}
                className={`max-h-[72vh] max-w-full rounded-xl shadow-lg transition-opacity duration-300 ${
                  isMediaLoading ? "opacity-0" : "opacity-100"
                }`}
              >
                Your browser does not support playing this video.
              </video>
            </div>
          )}

          {isAudio && (
            <div className="relative p-8 sm:p-12 flex flex-col items-center justify-center gap-4 flex-1 min-h-[260px]">
              {isMediaLoading && <PreviewSpinner message="Loading audio..." />}
              <FileCard formatFile={getFormatFile(file.originalName)} size="md" />
              <audio
                key={file.id}
                controls
                autoPlay
                src={inlineUrl}
                onLoadedData={() => setIsMediaLoading(false)}
                onError={() => setIsMediaLoading(false)}
                className="w-full max-w-md mt-4"
              >
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {isText && <TextViewer key={file.id} slug={slug} fileId={file.id} />}

          {!isImage && !isPdf && !isVideo && !isAudio && !isText && (
            <div className="p-10 sm:p-16 flex flex-col items-center justify-center text-center gap-3">
              <FileCard formatFile={getFormatFile(file.originalName)} size="md" className="scale-125 mb-3" />
              <p className="text-base font-semibold text-slate-800">{file.originalName}</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Direct in-browser preview is not available for this file format ({ext.toUpperCase() || "unknown"}).
              </p>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="btn-golden px-5 py-2.5 text-xs font-medium cursor-pointer mt-3 disabled:opacity-80 flex items-center gap-1.5"
              >
                {isDownloading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <span>Download to Open</span>
                    <span>↓</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
