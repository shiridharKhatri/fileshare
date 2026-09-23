"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  slug: string;
  onAuthenticated: () => void;
}

export default function AccessCodeForm({ slug, onAuthenticated }: Props) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d?$/.test(value)) return;

      const newDigits = [...digits];
      newDigits[index] = value;
      setDigits(newDigits);
      setError("");

      // Auto-focus next input
      if (value && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
      if (text.length > 0) {
        const newDigits = [...digits];
        for (let i = 0; i < text.length && i < 4; i++) {
          newDigits[i] = text[i];
        }
        setDigits(newDigits);
        const focusIndex = Math.min(text.length, 3);
        inputRefs.current[focusIndex]?.focus();
      }
    },
    [digits]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const passcode = digits.join("");

    if (passcode.length !== 4) {
      setError("Please enter all 4 digits.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/rooms/${slug}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error || "Too many attempts. Locked out for 15 min.");
        } else {
          setError(data.error || "Incorrect access code.");
        }
        setDigits(["", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      try {
        sessionStorage.setItem(`room_code_${slug}`, passcode);
      } catch {}

      onAuthenticated();
    } catch {
      setError("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sky-card w-full max-w-md mx-auto p-5 sm:p-8 md:p-10 text-center space-y-5 sm:space-y-6 shadow-2xl">
      <div className="flex flex-col items-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-serif italic text-slate-800 tracking-tight">
          Unlock Room
        </h1>
        <div className="inline-block px-3 py-1 rounded-full bg-white/70 border border-white text-xs font-mono font-semibold text-slate-700 shadow-sm">
          {slug}
        </div>
        <p className="text-xs text-slate-500 font-sans px-2">
          Enter the 4-digit code provided by the room creator
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <div
          className="flex justify-center gap-2 sm:gap-3"
          role="group"
          aria-label="4-digit access code"
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="\d"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              aria-label={`Digit ${i + 1}`}
              className="w-12 h-14 sm:w-15 sm:h-17 text-center text-xl sm:text-3xl font-mono font-bold rounded-xl sm:rounded-2xl border border-white/80 bg-white/90 text-slate-800 shadow-inner focus:outline-none focus:ring-3 focus:ring-amber-400/50 transition-all"
              autoFocus={i === 0}
              disabled={loading}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-500 font-medium bg-red-50/80 p-2.5 rounded-xl border border-red-200" role="alert">
            {error}
          </p>
        )}

        <button
          id="enter-room-button"
          type="submit"
          disabled={loading || digits.some((d) => !d)}
          className="btn-golden w-full py-3.5 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span>{loading ? "Verifying..." : "Enter Room"}</span>
          <span className="text-xs">➔</span>
        </button>
      </form>
    </div>
  );
}
