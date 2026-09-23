"use client";

import { useState, useRef, useCallback } from "react";
import type { FileItem } from "@/lib/types";
import { FileCard, getFormatFile } from "./FileCard";

interface UploadProgress {
  name: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

interface Props {
  slug: string;
  onFilesUploaded: (files: FileItem[]) => void;
  className?: string;
}

export default function FileUpload({ slug, onFilesUploaded, className }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (fileList: FileList) => {
      if (fileList.length === 0) return;

      const fileArray = Array.from(fileList);

      // Initialize progress for each file
      const initialProgress: UploadProgress[] = fileArray.map((f) => ({
        name: f.name,
        progress: 0,
        status: "uploading",
      }));
      setUploads(initialProgress);

      // Upload using FormData
      const formData = new FormData();
      fileArray.forEach((file) => {
        formData.append("files", file);
      });

      try {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploads((prev) =>
              prev.map((u) => ({
                ...u,
                progress: percent,
              }))
            );
          }
        });

        const response = await new Promise<{
          ok: boolean;
          data: {
            files?: FileItem[];
            failed?: { name: string; reason: string }[];
            error?: string;
          };
        }>((resolve) => {
          xhr.addEventListener("load", () => {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ ok: xhr.status >= 200 && xhr.status < 300, data });
            } catch {
              resolve({
                ok: false,
                data: { error: "Upload failed" },
              });
            }
          });

          xhr.addEventListener("error", () => {
            resolve({ ok: false, data: { error: "Upload failed" } });
          });

          xhr.open("POST", `/api/rooms/${slug}/files`);
          xhr.send(formData);
        });

        if (response.ok && response.data.files) {
          setUploads((prev) =>
            prev.map((u) => ({ ...u, progress: 100, status: "success" as const }))
          );
          onFilesUploaded(response.data.files);

          // Clear progress after a short delay
          setTimeout(() => setUploads([]), 2500);
        } else {
          setUploads((prev) =>
            prev.map((u) => ({
              ...u,
              status: "error" as const,
              error: response.data.error || "Upload failed",
            }))
          );
        }
      } catch {
        setUploads((prev) =>
          prev.map((u) => ({
            ...u,
            status: "error" as const,
            error: "Network error during upload",
          }))
        );
      }
    },
    [slug, onFilesUploaded]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        uploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [uploadFiles]
  );

  return (
    <div className={`flex flex-col h-full space-y-3 ${className || ""}`}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Drop files here or click to choose files"
        className={`group relative rounded-3xl p-5 sm:p-8 lg:p-10 text-center cursor-pointer transition-all duration-300 flex-1 min-h-[190px] sm:min-h-[240px] lg:min-h-0 h-full flex flex-col items-center justify-center ${
          isDragging
            ? "border-2 border-dashed border-amber-400 bg-amber-50/80 scale-[1.01] shadow-lg"
            : "border-2 border-dashed border-sky-200/90 hover:border-amber-400/80 bg-white/70 hover:bg-white/90 shadow-sm hover:shadow-md"
        }`}
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sky-100/70 group-hover:bg-amber-100/70 flex items-center justify-center text-sky-600 group-hover:text-amber-600 transition-colors shadow-inner">
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <div>
            <p className="font-serif italic text-xl sm:text-2xl text-slate-800">
              Drop your files here
            </p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
              or <span className="text-amber-700 font-medium underline">browse files to upload</span>
            </p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload-input"
        aria-label="Choose files to upload"
      />

      {/* Upload progress list */}
      {uploads.length > 0 && (
        <div className="space-y-2 p-3 sm:p-3.5 rounded-2xl bg-white/85 border border-white shadow-sm shrink-0">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Upload Activity</span>
            <button
              type="button"
              onClick={() => setUploads([])}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
            {uploads.map((upload, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCard formatFile={getFormatFile(upload.name)} size="sm" className="scale-75 origin-left" />
                    <span className="truncate max-w-[140px] sm:max-w-[220px] font-medium text-slate-700">{upload.name}</span>
                  </div>
                  <span className="font-mono text-slate-500 shrink-0 text-[11px] sm:text-xs">
                    {upload.status === "uploading" && `${upload.progress}%`}
                    {upload.status === "success" && <span className="text-emerald-600 font-bold">✓ Ready</span>}
                    {upload.status === "error" && <span className="text-red-500 font-medium">Failed</span>}
                  </span>
                </div>
                {upload.status === "uploading" && (
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-200"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.status === "error" && upload.error && (
                  <p className="text-[11px] text-red-500 font-medium">{upload.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
