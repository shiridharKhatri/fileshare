"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import FileUpload from "./FileUpload";
import FileList from "./FileList";
import MessageEditor from "./MessageEditor";
import MessageList from "./MessageList";
import ExpirationTimer from "./ExpirationTimer";
import { useSocket } from "@/lib/socket-client";
import type { FileItem, MessageItem } from "@/lib/types";

import ToastContainer, { ToastItem } from "./Toast";
import FilePreviewModal from "./FilePreviewModal";

interface Props {
  slug: string;
  expiresAt: string;
}

export default function RoomView({ slug, expiresAt }: Props) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [activeTab, setActiveTab] = useState<"files" | "messages">("files");
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const [passcode] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem(`room_code_${slug}`);
      } catch {
        return null;
      }
    }
    return null;
  });

  const socket = useSocket(slug);

  // Fetch initial data
  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await fetch(`/api/rooms/${slug}/files`);
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files);
        }
      } catch (err) {
        console.error("Failed to fetch files:", err);
      } finally {
        setLoadingFiles(false);
      }
    }

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/rooms/${slug}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    }

    fetchFiles();
    fetchMessages();
  }, [slug]);

  // Socket.io real-time listeners
  useEffect(() => {
    if (!socket) return;

    const handleFileUploaded = (file: FileItem) => {
      setFiles((prev) => {
        if (prev.some((f) => f.id === file.id)) return prev;
        return [...prev, { ...file, isOwn: false }];
      });
    };

    const handleFileDeletedSocket = (data: { id: string }) => {
      setFiles((prev) => prev.filter((f) => f.id !== data.id));
    };

    const handleMessageCreated = (msg: MessageItem & { sessionId?: string }) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { id: msg.id, content: msg.content, createdAt: msg.createdAt, isOwn: false }];
      });
    };

    socket.on("file:uploaded", handleFileUploaded);
    socket.on("file:deleted", handleFileDeletedSocket);
    socket.on("message:created", handleMessageCreated);

    return () => {
      socket.off("file:uploaded", handleFileUploaded);
      socket.off("file:deleted", handleFileDeletedSocket);
      socket.off("message:created", handleMessageCreated);
    };
  }, [socket]);

  const handleFilesUploaded = useCallback((newFiles: FileItem[]) => {
    setFiles((prev) => {
      const ids = new Set(prev.map((f) => f.id));
      const unique = newFiles.filter((f) => !ids.has(f.id));
      return [...prev, ...unique.map((f) => ({ ...f, isOwn: true }))];
    });
    if (newFiles.length > 0) {
      showToast(`${newFiles.length} file${newFiles.length > 1 ? "s" : ""} uploaded`, "success");
    }
  }, [showToast]);

  const handleFileDeleted = useCallback((fileId: string, fileName?: string) => {
    setFiles((prev) => {
      const deleted = prev.find((f) => f.id === fileId);
      const name = fileName || deleted?.originalName || "File";
      showToast(`"${name}" deleted`, "success");
      return prev.filter((f) => f.id !== fileId);
    });
  }, [showToast]);

  const handleMessageSent = useCallback((msg: MessageItem) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    showToast("Note posted to room", "success");
  }, [showToast]);

  const copyRoomUrl = useCallback(async () => {
    try {
      const textToCopy = passcode
        ? `${window.location.origin}/${slug} (Passcode: ${passcode})`
        : window.location.href;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedLink(true);
      showToast("Room link and passcode copied", "success");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(true);
    }
  }, [slug, passcode, showToast]);

  return (
    <div className="relative lg:fixed lg:inset-0 min-h-[100dvh] lg:h-[100dvh] w-full p-2 sm:p-3 lg:p-4 flex flex-col justify-start overflow-y-auto lg:overflow-hidden bg-radial from-[#f6fafd] via-[#edf4f9] to-[#e1edf6]">
      <div className="w-full flex-1 min-h-0 flex flex-col lg:overflow-hidden">
        {/* Sleek Floating Header Bar */}
        <header className="shrink-0 mb-2.5 sm:mb-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl bg-white/80 backdrop-blur-md border border-white shadow-xs">
          {/* Left on Desktop / Top Row on Mobile: Slug + Passcode + Actions */}
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="font-mono font-bold text-sm sm:text-base md:text-lg text-slate-800 bg-white px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-slate-100 shadow-inner tracking-wider shrink-0">
                {slug}
              </span>

              {passcode && (
                <span
                  className="font-mono text-xs sm:text-sm font-semibold text-amber-900 bg-amber-100/90 px-2 sm:px-2.5 py-1.5 rounded-xl border border-amber-200/80 shadow-xs shrink-0 flex items-center gap-1 sm:gap-1.5"
                  title="4-digit access code for this room"
                >
                  <span className="text-[10px] sm:text-[11px] text-amber-700/80 font-sans font-medium">Code:</span>
                  <span className="tracking-widest">{passcode}</span>
                </span>
              )}
            </div>

            {/* Mobile Actions: Share and Exit right beside code on mobile */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={copyRoomUrl}
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-xs cursor-pointer"
                title="Copy room link"
              >
                {copiedLink ? "✓ Copied" : "Share"}
              </button>
              <Link
                href="/"
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100/90 hover:bg-slate-200/90 text-slate-600 transition-colors"
                title="Exit room"
              >
                Exit
              </Link>
            </div>
          </div>

          {/* Middle: Tab Selector + Mobile Timer */}
          <div className="flex items-center justify-between sm:justify-center gap-2">
            <div className="flex-1 sm:flex-initial p-1 rounded-2xl bg-white/90 border border-slate-100 shadow-inner flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("files")}
                className={`flex-1 sm:flex-initial px-4 sm:px-6 py-1.5 sm:py-2 text-xs font-medium rounded-xl transition-all cursor-pointer text-center ${
                  activeTab === "files"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Files {files.length > 0 && `(${files.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("messages")}
                className={`flex-1 sm:flex-initial px-4 sm:px-6 py-1.5 sm:py-2 text-xs font-medium rounded-xl transition-all cursor-pointer text-center ${
                  activeTab === "messages"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Notes {messages.length > 0 && `(${messages.length})`}
              </button>
            </div>

            {/* Mobile Expiration Timer */}
            <div className="md:hidden">
              <ExpirationTimer expiresAt={expiresAt} />
            </div>
          </div>

          {/* Right on Desktop: Timer + Share + Exit */}
          <div className="hidden md:flex items-center justify-end gap-2 shrink-0">
            <ExpirationTimer expiresAt={expiresAt} />

            <button
              type="button"
              onClick={copyRoomUrl}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-medium rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Copy room link"
            >
              <span>{copiedLink ? "✓ Copied" : "Share"}</span>
            </button>

            <Link
              href="/"
              className="px-3 sm:px-3.5 py-1.5 text-xs font-medium rounded-full bg-slate-100/90 hover:bg-slate-200/90 text-slate-600 transition-colors shrink-0"
              title="Exit room"
            >
              Exit
            </Link>
          </div>
        </header>

        {/* Tab 1: Shared Files (Full width & fully responsive) */}
        {activeTab === "files" && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-stretch gap-3 sm:gap-4 lg:gap-5 w-full lg:overflow-hidden">
            {/* Left Portal: Responsive width & full height */}
            <div className="w-full lg:w-[320px] xl:w-[360px] 2xl:w-[400px] shrink-0 flex flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
              <div className="flex-1 flex flex-col min-h-0 lg:overflow-hidden space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 shrink-0">
                  Upload Portal
                </h3>
                <FileUpload slug={slug} onFilesUploaded={handleFilesUploaded} className="flex-1 min-h-0" />
              </div>
            </div>

            {/* Right Side: Uploaded Files (Full width & internal scroll on desktop) */}
            <div className="w-full lg:flex-1 flex flex-col min-w-0 lg:h-full lg:min-h-0 lg:overflow-hidden">
              {/* Sticky List Header */}
              <div className="shrink-0 flex items-center justify-between px-2 pb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Files in Room ({files.length})
                </h3>
                {files.length > 0 && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {files.reduce((acc, f) => acc + f.size, 0) < 1024 * 1024
                      ? `${(files.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB total`
                      : `${(files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(1)} MB total`}
                  </span>
                )}
              </div>

              {/* File List Container */}
              <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto pr-0 lg:pr-2 custom-scrollbar">
                {loadingFiles ? (
                  <div className="p-10 text-center bg-white/60 rounded-3xl border border-white">
                    <p className="text-xs text-slate-400">Loading files...</p>
                  </div>
                ) : (
                  <FileList
                    files={files}
                    slug={slug}
                    onFileDeleted={handleFileDeleted}
                    onPreviewFile={setPreviewFile}
                    onDownloaded={(name) => showToast(`Downloaded "${name}"`, "success")}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Rich-Text Notes (Full width & fully responsive) */}
        {activeTab === "messages" && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-stretch gap-3 sm:gap-4 lg:gap-5 w-full lg:overflow-hidden">
            {/* Left Portal: Message Editor */}
            <div className="w-full lg:w-[360px] xl:w-[420px] 2xl:w-[460px] shrink-0 flex flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
              <div className="flex-1 flex flex-col min-h-0 lg:overflow-hidden space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 shrink-0">
                  Compose Note
                </h3>
                <div className="flex-1 min-h-0 lg:overflow-y-auto pr-0 lg:pr-1 custom-scrollbar">
                  <MessageEditor slug={slug} onMessageSent={handleMessageSent} />
                </div>
              </div>
            </div>

            {/* Right Side: Message Thread */}
            <div className="w-full lg:flex-1 flex flex-col min-w-0 lg:h-full lg:min-h-0 lg:overflow-hidden">
              <div className="shrink-0 flex items-center justify-between px-2 pb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Message Thread ({messages.length})
                </h3>
              </div>
              <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto pr-0 lg:pr-2 custom-scrollbar">
                {loadingMessages ? (
                  <div className="p-10 text-center bg-white/60 rounded-3xl border border-white">
                    <p className="text-xs text-slate-400">Loading messages...</p>
                  </div>
                ) : (
                  <MessageList messages={messages} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* In-app File Preview Modal (No download required) */}
      <FilePreviewModal
        file={previewFile}
        slug={slug}
        onClose={() => setPreviewFile(null)}
        onDownloaded={(name) => showToast(`Downloaded "${name}"`, "success")}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
