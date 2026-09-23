"use client";

import { useState } from "react";
import Link from "next/link";
import FalconIcon from "@/components/FalconIcon";

interface Props {
  onBack: () => void;
}

interface RoomResult {
  slug: string;
  passcode: string;
  expiresAt: string;
}

const EXPIRATION_OPTIONS = [
  { label: "10 hours", value: 10 },
  { label: "18 hours", value: 18 },
  { label: "24 hours", value: 24 },
];

function getRandomPasscode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function CreateRoomModal({ onBack }: Props) {
  const [slug, setSlug] = useState("");
  const [passcode, setPasscode] = useState(() => getRandomPasscode());
  const [expirationHours, setExpirationHours] = useState(18);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RoomResult | null>(null);
  const [copied, setCopied] = useState<"link" | "details" | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let codeToUse = passcode.trim();
    if (!codeToUse) {
      codeToUse = getRandomPasscode();
      setPasscode(codeToUse);
    }

    if (codeToUse.length !== 4 || !/^\d{4}$/.test(codeToUse)) {
      setError("Access code must be exactly 4 digits.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim() || undefined,
          passcode: codeToUse,
          expirationHours,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create room.");
        return;
      }

      setResult({
        slug: data.slug,
        passcode: codeToUse,
        expiresAt: data.expiresAt,
      });
    } catch {
      setError("Failed to create room. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function getRoomUrl(roomSlug: string): string {
    if (typeof window === "undefined") return `/${roomSlug}`;
    return `${window.location.origin}/${roomSlug}`;
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(getRoomUrl(result.slug));
      setCopied("link");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied("link");
    }
  }

  async function copyDetails() {
    if (!result) return;
    try {
      const text = `Room: ${result.slug}\nAccess code: ${result.passcode}\n${getRoomUrl(result.slug)}`;
      await navigator.clipboard.writeText(text);
      setCopied("details");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied("details");
    }
  }

  // --- Result View ---
  if (result) {
    return (
      <div className="space-y-6 text-left max-w-md mx-auto">
        <div className="flex flex-col items-center text-center space-y-2">
          <FalconIcon className="w-10 h-5 text-[#1e293b]" />
          <h2 className="text-2xl sm:text-3xl font-serif italic text-slate-800">
            Your room is ready for flight.
          </h2>
          <p className="text-xs text-slate-500">
            Share this link and the 4-digit code with whoever you&apos;re sending files to.
          </p>
        </div>

        <div className="space-y-3 p-5 rounded-2xl border border-white/80 bg-white/70 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Room Slug
            </span>
            <span className="text-base font-mono font-semibold text-slate-800">
              {result.slug}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Access Code
            </span>
            <span className="text-xl font-mono font-bold tracking-widest text-slate-900 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/60">
              {result.passcode}
            </span>
          </div>

          <div className="pt-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
              Direct Link
            </span>
            <p className="text-xs font-mono break-all text-slate-600 bg-white/90 p-2.5 rounded-xl border border-slate-200/60 select-all">
              {getRoomUrl(result.slug)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Link
            href={`/${result.slug}`}
            className="btn-golden w-full py-3.5 text-sm font-medium text-center"
          >
            <span>Enter Room Now</span>
            <FalconIcon className="w-3.5 h-2 text-[#1e293b]" />
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="copy-link-button"
              type="button"
              onClick={copyLink}
              className="px-3.5 py-2.5 text-xs font-medium rounded-xl bg-white/80 hover:bg-white text-slate-700 border border-white shadow-sm transition-all text-center"
            >
              {copied === "link" ? "✓ Copied Link!" : "Copy Link"}
            </button>
            <button
              id="copy-details-button"
              type="button"
              onClick={copyDetails}
              className="px-3.5 py-2.5 text-xs font-medium rounded-xl bg-white/80 hover:bg-white text-slate-700 border border-white shadow-sm transition-all text-center"
            >
              {copied === "details" ? "✓ Copied!" : "Copy All Info"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Create Form ---
  return (
    <form onSubmit={handleCreate} className="space-y-5 text-left max-w-md mx-auto">
      <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <FalconIcon className="w-6 h-3 text-[#1e293b]" />
          <h2 className="text-xl font-serif italic text-slate-800">Launch New Room</h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="Go back"
        >
          ← Back
        </button>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="room-slug"
          className="block text-xs font-medium text-slate-600"
        >
          Custom room name{" "}
          <span className="text-[11px] text-slate-400 font-normal">(optional — auto-generated if blank)</span>
        </label>
        <input
          id="room-slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g. 09-23-AA"
          maxLength={50}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-400/50 font-mono shadow-inner"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="room-passcode"
            className="block text-xs font-medium text-slate-600"
          >
            4-digit access code
          </label>
          <button
            type="button"
            onClick={() => {
              setPasscode(getRandomPasscode());
              setError("");
            }}
            className="text-xs text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Randomize code</span>
          </button>
        </div>
        <input
          id="room-passcode"
          type="text"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={passcode}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            setPasscode(v);
            if (error) setError("");
          }}
          placeholder="e.g. 4829"
          className="w-full px-3.5 py-2.5 text-base rounded-xl border border-white/80 bg-white/90 focus:outline-none focus:ring-2 focus:ring-amber-400/50 font-mono tracking-[0.4em] font-bold text-center text-slate-800 shadow-inner"
        />
        <p className="text-[11px] text-slate-400">
          Only guests with this code can enter and view files.
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="room-expiration"
          className="block text-xs font-medium text-slate-600"
        >
          Auto-delete after
        </label>
        <select
          id="room-expiration"
          value={expirationHours}
          onChange={(e) => setExpirationHours(Number(e.target.value))}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-400/50 shadow-inner text-slate-700"
        >
          {EXPIRATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-xs text-red-500 font-medium bg-red-50/80 p-2.5 rounded-xl border border-red-200" role="alert">
          {error}
        </p>
      )}

      <button
        id="submit-create-room"
        type="submit"
        disabled={loading}
        className="btn-golden w-full py-3.5 text-sm font-medium cursor-pointer"
      >
        <span>{loading ? "Creating room..." : "Create & Launch Room"}</span>
        <FalconIcon className="w-3.5 h-2 text-[#1e293b]" />
      </button>
    </form>
  );
}
