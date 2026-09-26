"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function getRandomPasscode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [customPasscode, setCustomPasscode] = useState("");
  const [customExpiration, setCustomExpiration] = useState(18);
  const [error, setError] = useState("");

  function openCreateRoom() {
    setCustomPasscode(getRandomPasscode());
    setError("");
    setShowCreate(true);
    setShowJoin(false);
  }

  async function handleCreateRoom(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");

    const code = customPasscode.trim();
    if (code && !/^\d{4}$/.test(code)) {
      setError("Access code must be exactly 4 digits.");
      return;
    }

    setCreating(true);

    try {
      const payload: {
        passcode?: string;
        expirationHours?: number;
      } = {
        expirationHours: customExpiration,
      };

      if (code) {
        payload.passcode = code;
      }

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create room.");
        setCreating(false);
        return;
      }

      if (data.slug) {
        if (data.passcode) {
          try {
            sessionStorage.setItem(`room_code_${data.slug}`, data.passcode);
          } catch {}
        }
        router.push(`/${data.slug}`);
      }
    } catch {
      setError("Network error. Please try again.");
      setCreating(false);
    }
  }

  function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!joinInput.trim()) return;
    const clean = joinInput.trim().replace(/^https?:\/\/[^/]+\//, "");
    router.push(`/${clean}`);
  }

  return (
    <div className="relative min-h-screen min-h-[100dvh] flex items-center justify-center p-3.5 sm:p-6 overflow-x-hidden">
      {/* Ambient background cloud glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
        <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-white/70 rounded-full blur-[110px]" />
        <div className="absolute top-[20%] -left-[10%] w-[550px] h-[550px] bg-sky-100/60 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] -right-[10%] w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-white/80 rounded-full blur-[120px]" />
      </div>

      {/* Main Sky Card */}
      <div className="relative z-10 w-full max-w-xl my-auto">
        <div className="sky-card relative p-6 sm:p-10 md:p-12 text-center transition-all duration-300">
          {/* Editorial Serif Heading */}
          <h1 className="font-serif italic text-3xl sm:text-5xl text-[#1e293b] tracking-tight leading-[1.15] mb-3">
            Let your files take <br />
            a safe flight
          </h1>

          {/* Clean Minimal Subtitle */}
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-8 font-sans font-normal leading-relaxed px-1">
            Private, ephemeral shared messages. Type or paste rich text, protect with a 4-digit code, and auto-delete when expired.
          </p>

          {/* Error notice if any */}
          {error && (
            <div className="max-w-xs mx-auto mb-4 p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-200" role="alert">
              {error}
            </div>
          )}

          {/* 2 Buttons: New Room & Join Room */}
          {!showJoin && !showCreate && (
            <div className="space-y-4 relative z-20">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-3.5 max-w-xs sm:max-w-md mx-auto w-full">
                <button
                  id="btn-new-room"
                  type="button"
                  onClick={openCreateRoom}
                  className="btn-golden w-full sm:w-auto px-7 sm:px-8 py-3.5 text-sm font-medium cursor-pointer shadow-md"
                >
                  <span className="text-base leading-none font-bold">+</span>
                  <span>New Room</span>
                </button>

                <button
                  id="btn-join-room"
                  type="button"
                  onClick={() => {
                    setShowJoin(true);
                    setShowCreate(false);
                    setError("");
                  }}
                  className="badge-pill-frosted w-full sm:w-auto px-7 sm:px-8 py-3.5 text-sm font-medium hover:bg-white text-slate-700 cursor-pointer shadow-sm transition-all hover:shadow-md flex items-center justify-center gap-2"
                >
                  <span>Join Room</span>
                  <span className="text-xs">➔</span>
                </button>
              </div>
            </div>
          )}

          {/* Create Room Form (Explicit 4-digit code setting) */}
          {showCreate && (
            <form onSubmit={handleCreateRoom} className="max-w-sm mx-auto space-y-4 pt-1 text-left">
              <div className="text-center pb-1">
                <h2 className="text-lg font-serif italic text-slate-800">Configure Your Room</h2>
                <p className="text-xs text-slate-400">Set your 4-digit passcode to share with guests</p>
              </div>

              {/* 4-Digit Passcode Input with Randomizer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="custom-passcode" className="text-xs font-semibold text-slate-700">
                    4-Digit Access Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomPasscode(getRandomPasscode())}
                    className="text-[11px] text-amber-600 hover:text-amber-700 font-medium cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Randomize</span>
                  </button>
                </div>
                <input
                  id="custom-passcode"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={customPasscode}
                  onChange={(e) => setCustomPasscode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="e.g. 4829"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 text-lg font-mono font-bold text-center tracking-widest rounded-xl border border-white/80 bg-white/95 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/50 shadow-inner"
                />
                <p className="text-[10px] text-slate-400 text-center">
                  Guests will need this code to enter your room.
                </p>
              </div>

              {/* Expiration Dropdown */}
              <div className="space-y-1">
                <label htmlFor="custom-expiration" className="block text-xs font-semibold text-slate-700">
                  Room Lifetime
                </label>
                <select
                  id="custom-expiration"
                  value={customExpiration}
                  onChange={(e) => setCustomExpiration(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-white/80 bg-white/95 focus:outline-none focus:ring-2 focus:ring-amber-400/50 shadow-inner text-slate-700 font-medium cursor-pointer"
                >
                  <option value={10}>10 hours (auto-delete)</option>
                  <option value={18}>18 hours (auto-delete)</option>
                  <option value={24}>24 hours (auto-delete)</option>
                </select>
              </div>


              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={creating || customPasscode.length !== 4}
                  className="btn-golden flex-1 py-2.5 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {creating ? "Launching..." : "Launch Room ➔"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setError("");
                  }}
                  className="px-4 py-2.5 text-xs rounded-xl bg-white/80 hover:bg-white text-slate-600 border border-white transition-colors cursor-pointer"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {/* Join Room Input Form */}
          {showJoin && (
            <form onSubmit={handleJoinRoom} className="max-w-sm mx-auto space-y-3 pt-1 text-left">
              <div className="text-center pb-1">
                <h2 className="text-lg font-serif italic text-slate-800">Join a Shared Room</h2>
                <p className="text-xs text-slate-400">Enter the room link or code</p>
              </div>

              <div className="space-y-1 text-left">
                <label htmlFor="input-join-slug" className="block text-xs font-semibold text-slate-700">
                  Room Link or Code
                </label>
                <input
                  id="input-join-slug"
                  type="text"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  placeholder="e.g. 5Y-TR-8V or full link"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-white/80 bg-white/95 focus:outline-none focus:ring-2 focus:ring-amber-400/50 font-mono tracking-wider text-center shadow-inner font-semibold"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="btn-golden flex-1 py-2.5 text-sm font-medium cursor-pointer shadow-md"
                >
                  Enter Room ➔
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoin(false);
                    setError("");
                  }}
                  className="px-4 py-2.5 text-xs rounded-xl bg-white/80 hover:bg-white text-slate-600 border border-white transition-colors cursor-pointer"
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
