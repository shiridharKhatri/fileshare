"use client";

import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import type { MessageItem } from "@/lib/types";

interface Props {
  messages: MessageItem[];
}

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s",
  "h1", "h2", "h3",
  "ul", "ol", "li",
  "a", "blockquote", "code", "pre", "hr",
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
      className="message-content text-sm text-slate-800 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

function MessageCard({ msg }: { msg: MessageItem }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      // Strip HTML to get plain text for clipboard
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = msg.content;
      const plainText = tempDiv.innerText || tempDiv.textContent || "";
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <article className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-2.5 break-words transition-all hover:shadow-md">
      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {msg.isOwn ? (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
              You
            </span>
          ) : (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200/80">
              Participant
            </span>
          )}
          <time dateTime={msg.createdAt} className="font-mono text-[11px] text-slate-400">
            {formatTime(msg.createdAt)}
          </time>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="text-[11px] text-slate-400 hover:text-slate-800 font-medium px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
          title="Copy message text"
        >
          {copied ? (
            <span className="text-emerald-600 font-semibold">✓ Copied</span>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <MessageContent html={msg.content} />
    </article>
  );
}

export default function MessageList({ messages }: Props) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          No Shared Messages Yet
        </h4>
        <p className="text-xs text-slate-400 font-sans max-w-xs mx-auto">
          Type or paste a message into the blank box and click &ldquo;Send Message&rdquo; to share it with participating parties.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <MessageCard key={msg.id} msg={msg} />
      ))}
    </div>
  );
}
