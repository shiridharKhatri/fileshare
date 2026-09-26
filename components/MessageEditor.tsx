"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useCallback, useEffect, useRef } from "react";
import type { MessageItem, FileItem } from "@/lib/types";

interface UploadProgress {
  name: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

interface Props {
  slug: string;
  onMessageSent: (msg: MessageItem) => void;
  onFilesUploaded?: (files: FileItem[]) => void;
}

export default function MessageEditor({ slug, onMessageSent, onFilesUploaded }: Props) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ words: 0, chars: 0 });
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileUploads, setFileUploads] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder:
          "Type your message here, or paste formatted text from anywhere (Word, email, docs)...",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "tiptap-editor focus:outline-none",
        role: "textbox",
        "aria-label": "Rich text message editor",
        "aria-multiline": "true",
      },
    },
    onUpdate({ editor: currentEditor }) {
      const text = currentEditor.getText().trim();
      const words = text ? text.split(/\s+/).length : 0;
      setStats({ words, chars: text.length });
    },
  });

  const uploadFiles = useCallback(
    async (filesToUpload: FileList | File[]) => {
      const fileArray = Array.from(filesToUpload);
      if (fileArray.length === 0) return;

      const initialProgress: UploadProgress[] = fileArray.map((f) => ({
        name: f.name,
        progress: 0,
        status: "uploading",
      }));
      setFileUploads((prev) => [...prev, ...initialProgress]);

      const formData = new FormData();
      fileArray.forEach((file) => {
        formData.append("files", file);
      });

      try {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setFileUploads((prev) =>
              prev.map((u) =>
                fileArray.some((f) => f.name === u.name)
                  ? { ...u, progress: percent }
                  : u
              )
            );
          }
        });

        const response = await new Promise<{
          ok: boolean;
          data: { files?: FileItem[]; error?: string };
        }>((resolve) => {
          xhr.addEventListener("load", () => {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ ok: xhr.status >= 200 && xhr.status < 300, data });
            } catch {
              resolve({ ok: false, data: { error: "Upload failed" } });
            }
          });
          xhr.addEventListener("error", () => {
            resolve({ ok: false, data: { error: "Network error during upload" } });
          });

          xhr.open("POST", `/api/rooms/${slug}/files`);
          xhr.send(formData);
        });

        if (response.ok && response.data.files) {
          setFileUploads((prev) =>
            prev.map((u) =>
              fileArray.some((f) => f.name === u.name)
                ? { ...u, progress: 100, status: "success" }
                : u
            )
          );
          onFilesUploaded?.(response.data.files);
          setTimeout(() => {
            setFileUploads((prev) =>
              prev.filter((u) => !fileArray.some((f) => f.name === u.name && u.status === "success"))
            );
          }, 3000);
        } else {
          const errMsg = response.data.error || "Upload failed";
          setFileUploads((prev) =>
            prev.map((u) =>
              fileArray.some((f) => f.name === u.name)
                ? { ...u, status: "error", error: errMsg }
                : u
            )
          );
        }
      } catch {
        setFileUploads((prev) =>
          prev.map((u) =>
            fileArray.some((f) => f.name === u.name)
              ? { ...u, status: "error", error: "Upload failed" }
              : u
          )
        );
      }
    },
    [slug, onFilesUploaded]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [uploadFiles]
  );

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter link URL (e.g. https://example.com):", previousUrl || "https://");

    if (url === null) return;

    if (url.trim() === "" || url.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    try {
      new URL(url);
    } catch {
      alert("Please enter a valid URL including http:// or https://");
      return;
    }

    if (url.toLowerCase().startsWith("javascript:")) {
      alert("Invalid URL");
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }, [editor]);

  const handleSend = useCallback(async () => {
    if (!editor || sending) return;

    const html = editor.getHTML();
    const text = editor.getText();

    if (!text.trim()) {
      setError("Please type or paste a message before sending.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/rooms/${slug}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: html }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send message.");
        return;
      }

      onMessageSent(data);
      editor.commands.clearContent();
      setStats({ words: 0, chars: 0 });
    } catch {
      setError("Failed to send message. Please check your connection.");
    } finally {
      setSending(false);
    }
  }, [editor, sending, slug, onMessageSent]);

  // Support Ctrl+Enter / Cmd+Enter keyboard shortcut to send
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSend]);

  function handleClear() {
    if (!editor) return;
    const text = editor.getText().trim();
    if (!text) return;
    if (window.confirm("Clear all text from the box?")) {
      editor.commands.clearContent();
      setStats({ words: 0, chars: 0 });
      setError("");
    }
  }

  if (!editor) return null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="space-y-3 flex flex-col h-full relative"
    >
      {/* Hidden File Input for uploading any files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        id="editor-file-input"
        aria-label="Upload files"
      />

      {/* Editor Main Card */}
      <div
        className={`flex-1 flex flex-col rounded-3xl border bg-white/95 shadow-md overflow-hidden transition-all ${
          isDraggingFile
            ? "border-amber-400 ring-4 ring-amber-400/30 bg-amber-50/40"
            : "border-white/90 focus-within:ring-2 focus-within:ring-amber-400/60 focus-within:border-amber-300"
        }`}
      >
        {/* Gmail-Style Rich Text Formatting Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 bg-slate-50/90 flex-wrap shrink-0 select-none">
          {/* History */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            label="Undo (Ctrl+Z)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            label="Redo (Ctrl+Y)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
            </svg>
          </ToolbarButton>

          <span className="w-px h-4 bg-slate-200 mx-1" aria-hidden="true" />

          {/* Heading Sizes */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            label="Title (Heading 1)"
          >
            <span className="font-bold text-xs">H1</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            label="Section (Heading 2)"
          >
            <span className="font-bold text-xs">H2</span>
          </ToolbarButton>

          <span className="w-px h-4 bg-slate-200 mx-1" aria-hidden="true" />

          {/* Text Styling */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            label="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            label="Italic (Ctrl+I)"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            label="Underline (Ctrl+U)"
          >
            <u>U</u>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            label="Strikethrough"
          >
            <s>S</s>
          </ToolbarButton>

          <span className="w-px h-4 bg-slate-200 mx-1" aria-hidden="true" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            label="Bullet list"
          >
            <span className="flex items-center gap-1">
              <span className="text-[13px] leading-none">•</span> List
            </span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            label="Numbered list"
          >
            <span className="flex items-center gap-1">
              <span className="text-[11px] font-mono leading-none">1.</span> List
            </span>
          </ToolbarButton>

          <span className="w-px h-4 bg-slate-200 mx-1" aria-hidden="true" />

          {/* Quotes & Links */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            label="Quote"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={setLink}
            active={editor.isActive("link")}
            label="Add or Edit Link"
          >
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Link</span>
            </span>
          </ToolbarButton>

          {/* Attach files from toolbar */}
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            label="Attach files (images, documents, archives)"
          >
            <span className="flex items-center gap-1 text-slate-700">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span>Attach</span>
            </span>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            label="Remove Formatting"
          >
            <span className="text-[11px] text-slate-500 hover:text-slate-800">Clear Format</span>
          </ToolbarButton>

          {/* Quick Clear Draft */}
          {stats.chars > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-auto text-[11px] text-slate-400 hover:text-red-600 transition-colors px-2 py-1 rounded cursor-pointer"
              title="Clear all text"
            >
              Reset Draft
            </button>
          )}
        </div>

        {/* Drag & Drop Overlay */}
        {isDraggingFile && (
          <div className="p-6 text-center bg-amber-50/80 border-b border-amber-200 text-amber-900 font-medium text-xs flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Drop your files to upload to this room</span>
          </div>
        )}

        {/* Spacious Blank Data Box Content */}
        <div className="flex-1 min-h-[300px] overflow-y-auto cursor-text" onClick={() => editor.commands.focus()}>
          <EditorContent editor={editor} className="h-full" />
        </div>

        {/* Active Upload Progress list */}
        {fileUploads.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/80 p-2.5 space-y-1.5 shrink-0 max-h-32 overflow-y-auto">
            {fileUploads.map((u, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs gap-2">
                <span className="truncate max-w-[200px] text-slate-700 font-mono text-[11px]">{u.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-150"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {u.status === "uploading" && `${u.progress}%`}
                    {u.status === "success" && <span className="text-emerald-600 font-semibold">✓ Uploaded</span>}
                    {u.status === "error" && <span className="text-red-500">{u.error || "Failed"}</span>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-xs font-medium border border-red-200" role="alert">
          {error}
        </div>
      )}

      {/* Action Row — Gmail Send bar + Attach Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 shrink-0">
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>{stats.words} words • {stats.chars} characters</span>
          <span className="hidden md:inline">• ⌘+Enter to send</span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Attach Button (Paperclip) */}
          <button
            id="attach-files-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 text-xs font-medium rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            title="Attach any files (images, documents, archives, etc.)"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span>Attach Files</span>
          </button>

          {/* Send Message Button */}
          <button
            id="send-message-button"
            onClick={handleSend}
            disabled={sending || stats.chars === 0}
            className="btn-golden px-7 py-2.5 text-sm font-semibold cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            <svg className="w-4 h-4 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span>{sending ? "Sending..." : "Send Message"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
        active
          ? "bg-slate-900 text-white shadow-xs"
          : "hover:bg-slate-200/70 text-slate-700 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}
