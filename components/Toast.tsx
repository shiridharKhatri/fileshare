"use client";

import { useEffect } from "react";

export interface ToastItem {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-3"
    >
      {toasts.map((toast) => (
        <ToastMessage key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastMessage({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isError = toast.type === "error";

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in slide-in-from-bottom-4 ${
        isError
          ? "bg-red-900/90 text-white border-red-700/80 shadow-red-900/20"
          : "bg-slate-900/90 text-white border-slate-700/80 shadow-slate-950/30"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`size-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
            isError ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
          }`}
        >
          {isError ? "!" : "✓"}
        </div>
        <p className="text-xs sm:text-sm font-medium truncate">{toast.message}</p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss toast"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
