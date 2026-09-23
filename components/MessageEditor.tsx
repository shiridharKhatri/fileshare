"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useCallback } from "react";
import type { MessageItem } from "@/lib/types";

interface Props {
  slug: string;
  onMessageSent: (msg: MessageItem) => void;
}

export default function MessageEditor({ slug, onMessageSent }: Props) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

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
        placeholder: "Write a message, note, code snippet, or formatted instructions...",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "tiptap-editor focus:outline-none",
        role: "textbox",
        "aria-label": "Message editor",
        "aria-multiline": "true",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      alert("Please enter a valid URL");
      return;
    }

    // Prevent javascript: URLs
    if (url.toLowerCase().startsWith("javascript:")) {
      alert("Invalid URL");
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  async function handleSend() {
    if (!editor) return;

    const html = editor.getHTML();
    const text = editor.getText();

    if (!text.trim()) {
      setError("Message cannot be empty.");
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
    } catch {
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  if (!editor) return null;

  return (
    <div className="space-y-3">
      {/* Editor Box */}
      <div className="rounded-3xl border border-white/90 bg-white/90 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-amber-400/50 transition-all">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex-wrap">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            label="Bold"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            label="Italic"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            label="Underline"
          >
            <u>U</u>
          </ToolbarButton>

          <span className="w-px h-4 bg-slate-200 mx-1.5" aria-hidden="true" />

          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive("heading", { level: 2 })}
            label="Heading"
          >
            H2
          </ToolbarButton>

          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor.isActive("heading", { level: 3 })}
            label="Subheading"
          >
            H3
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            label="Bullet list"
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            label="Numbered list"
          >
            1. List
          </ToolbarButton>

          <span className="w-px h-4 bg-slate-200 mx-1.5" aria-hidden="true" />

          <ToolbarButton
            onClick={setLink}
            active={editor.isActive("link")}
            label="Add link"
          >
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Link</span>
            </span>
          </ToolbarButton>
        </div>

        {/* Spacious Editor Content */}
        <EditorContent editor={editor} />
      </div>

      {error && (
        <p className="text-xs text-red-500 font-medium bg-red-50 p-2.5 rounded-xl border border-red-200" role="alert">
          {error}
        </p>
      )}

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <p className="text-[11px] text-slate-400">
          Markdown shortcuts and rich formatting supported.
        </p>
        <button
          id="send-message-button"
          onClick={handleSend}
          disabled={sending}
          className="btn-golden w-full sm:w-auto px-7 py-2.5 text-xs font-semibold cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span>{sending ? "Sending..." : "Send Note"}</span>
          <span className="text-xs">➔</span>
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
        active
          ? "bg-slate-800 text-white shadow-xs"
          : "hover:bg-slate-200/60 text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}
