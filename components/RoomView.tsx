"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import MessageEditor from "./MessageEditor";
import MessageList from "./MessageList";
import FileList from "./FileList";
import FilePreviewModal from "./FilePreviewModal";
import ExpirationTimer from "./ExpirationTimer";
import { useSocket } from "@/lib/socket-client";
import type { MessageItem, FileItem } from "@/lib/types";
import ToastContainer, { ToastItem } from "./Toast";

interface Props {
  slug: string;
  expiresAt: string;
}

export default function RoomView({ slug, expiresAt }: Props) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [activeTab, setActiveTab] = useState<"messages" | "files">("messages");
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
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

  // Fetch initial messages and files
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/rooms/${slug}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    }

    async function fetchFiles() {
      try {
        const res = await fetch(`/api/rooms/${slug}/files`);
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files || []);
        }
      } catch (err) {
        console.error("Failed to fetch files:", err);
      } finally {
        setLoadingFiles(false);
      }
    }

    fetchMessages();
    fetchFiles();
  }, [slug]);

  // Real-time WebSocket synchronization for both messages and files
  useEffect(() => {
    if (!socket) return;

    const handleMessageCreated = (msg: MessageItem & { sessionId?: string }) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { id: msg.id, content: msg.content, createdAt: msg.createdAt, isOwn: false }];
      });
      showToast("New message received from participant", "success");
    };

    const handleFileUploaded = (file: FileItem) => {
      setFiles((prev) => {
        if (prev.some((f) => f.id === file.id)) return prev;
        return [...prev, { ...file, isOwn: false }];
      });
      showToast(`New file attached: "${file.originalName}"`, "success");
    };

    const handleFileDeleted = (data: { id: string }) => {
      setFiles((prev) => prev.filter((f) => f.id !== data.id));
    };

    socket.on("message:created", handleMessageCreated);
    socket.on("file:uploaded", handleFileUploaded);
    socket.on("file:deleted", handleFileDeleted);

    return () => {
      socket.off("message:created", handleMessageCreated);
      socket.off("file:uploaded", handleFileUploaded);
      socket.off("file:deleted", handleFileDeleted);
    };
  }, [socket, showToast]);

  const handleMessageSent = useCallback((msg: MessageItem) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    showToast("Message shared with room", "success");
  }, [showToast]);

  const handleFilesUploaded = useCallback((newFiles: FileItem[]) => {
    setFiles((prev) => {
      const ids = new Set(prev.map((f) => f.id));
      const unique = newFiles.filter((f) => !ids.has(f.id));
      return [...prev, ...unique.map((f) => ({ ...f, isOwn: true }))];
    });
    showToast(`${newFiles.length} file${newFiles.length > 1 ? "s" : ""} attached to room`, "success");
    setActiveTab("files"); // Automatically show the files tab
  }, [showToast]);

  const handleFileDeleted = useCallback((fileId: string, fileName?: string) => {
    setFiles((prev) => {
      const deleted = prev.find((f) => f.id === fileId);
      const name = fileName || deleted?.originalName || "File";
      showToast(`"${name}" deleted`, "success");
      return prev.filter((f) => f.id !== fileId);
    });
  }, [showToast]);

  const copyRoomUrl = useCallback(async () => {
    try {
      const textToCopy = passcode
        ? `${window.location.origin}/${slug} (4-digit code: ${passcode})`
        : window.location.href;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedLink(true);
      showToast("Room link and 4-digit code copied to clipboard", "success");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(true);
    }
  }, [slug, passcode, showToast]);

  return (
    <div className="relative min-h-[100dvh] lg:h-[100dvh] w-full p-2.5 sm:p-4 flex flex-col justify-start overflow-y-auto lg:overflow-hidden bg-radial from-[#f6fafd] via-[#edf4f9] to-[#e1edf6]">
      <div className="w-full flex-1 min-h-0 flex flex-col lg:overflow-hidden max-w-7xl mx-auto">
        {/* Floating Top Navigation Bar */}
        <header className="shrink-0 mb-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 p-3 rounded-2xl sm:rounded-3xl bg-white/80 backdrop-blur-md border border-white shadow-xs">
          {/* Room Code & Passcode */}
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pl-1">
                Room
              </span>
              <span className="font-mono font-bold text-sm sm:text-base text-slate-800 bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-inner tracking-wider">
                {slug}
              </span>
            </div>

            {passcode && (
              <span
                className="font-mono text-xs sm:text-sm font-semibold text-amber-900 bg-amber-100/90 px-2.5 py-1.5 rounded-xl border border-amber-200/80 shadow-xs flex items-center gap-1.5"
                title="4-digit access code for this room"
              >
                <span className="text-[10px] text-amber-700/90 font-sans font-medium">Code:</span>
                <span className="tracking-widest font-bold">{passcode}</span>
              </span>
            )}
          </div>

          {/* Timer & Room Actions */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <ExpirationTimer expiresAt={expiresAt} />

            <button
              type="button"
              onClick={copyRoomUrl}
              className="px-3.5 py-1.5 text-xs font-medium rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              title="Copy room link and 4-digit code"
            >
              <span>{copiedLink ? "✓ Copied" : "Share Link & Code"}</span>
            </button>

            <Link
              href="/"
              className="px-3.5 py-1.5 text-xs font-medium rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Exit room"
            >
              Exit
            </Link>
          </div>
        </header>

        {/* Main Workspace — Gmail Compose Box + Shared Feed */}
        <main className="flex-1 min-h-0 flex flex-col lg:flex-row items-stretch gap-4 w-full lg:overflow-hidden">
          {/* Left / Primary Column: The Large Blank Data Box (Gmail-Style Composer) */}
          <section className="flex-1 flex flex-col min-w-0 lg:h-full lg:min-h-0 lg:overflow-hidden">
            <div className="shrink-0 flex items-center justify-between pb-2 px-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Compose Message
                </h2>
                <span className="text-[11px] text-slate-400 font-normal">
                  (Type, paste, or attach any files)
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col lg:overflow-hidden">
              <MessageEditor
                slug={slug}
                onMessageSent={handleMessageSent}
                onFilesUploaded={handleFilesUploaded}
              />
            </div>
          </section>

          {/* Right Column: Shared Room Content (Messages & Files) */}
          <aside className="w-full lg:w-[420px] xl:w-[480px] shrink-0 flex flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
            {/* Feed Header with Tab Toggle */}
            <div className="shrink-0 flex items-center justify-between pb-2 px-1 gap-2">
              <div className="p-1 rounded-2xl bg-white/80 border border-slate-100 shadow-inner flex gap-1 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("messages")}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "messages"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>Messages</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "messages" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-600"}`}>
                    {messages.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("files")}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "files"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>Attached Files</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "files" ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-600"}`}>
                    {files.length}
                  </span>
                </button>
              </div>

              {/* Status pill */}
              <span className="hidden sm:inline-block text-[11px] text-emerald-600 font-medium">
                • Live sync
              </span>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 lg:overflow-y-auto pr-0 lg:pr-1 custom-scrollbar">
              {activeTab === "messages" && (
                <>
                  {loadingMessages ? (
                    <div className="p-10 text-center bg-white/60 rounded-3xl border border-white">
                      <p className="text-xs text-slate-400">Loading messages...</p>
                    </div>
                  ) : (
                    <MessageList messages={messages} />
                  )}
                </>
              )}

              {activeTab === "files" && (
                <>
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
                </>
              )}
            </div>
          </aside>
        </main>
      </div>

      {/* In-app File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        slug={slug}
        onClose={() => setPreviewFile(null)}
        onDownloaded={(name) => showToast(`Downloaded "${name}"`, "success")}
      />

      {/* Floating Toast Alerts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
