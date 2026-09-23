"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";
import type { MessageItem } from "@/lib/types";


interface Props {
  messages: MessageItem[];
}

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s",
  "h1", "h2", "h3",
  "ul", "ol", "li",
  "a", "blockquote", "code", "pre",
  "span", "div",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageContent({ html }: { html: string }) {
  const sanitized = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
      }),
    [html]
  );

  return (
    <div
      className="message-content text-sm"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

export default function MessageList({ messages }: Props) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200/80 bg-white/40">
        <p className="text-xs text-slate-400 font-sans">No messages or notes in this room yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <article
          key={msg.id}
          className="p-3.5 sm:p-4 rounded-2xl bg-white/80 border border-white shadow-xs space-y-1.5 break-words overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-100/80">
            <time dateTime={msg.createdAt} className="font-mono text-[11px]">
              {formatTime(msg.createdAt)}
            </time>
            {msg.isOwn && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200/60">
                You
              </span>
            )}
          </div>
          <MessageContent html={msg.content} />
        </article>
      ))}
    </div>
  );
}
