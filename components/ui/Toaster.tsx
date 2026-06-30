"use client";

import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

/**
 * App-level toast notifications. Renders the ephemeral `toasts` store slice
 * (see addToast / removeToast). Success toasts auto-dismiss; all are dismissable.
 * Fire them with the `toast` helper in lib/toast.ts, e.g. toast.success("Saved").
 */
const STYLES = {
  success: { border: "border-l-green", icon: CheckCircle2, color: "text-green" },
  error:   { border: "border-l-error",   icon: AlertCircle,  color: "text-error" },
  info:    { border: "border-l-navy",       icon: Info,         color: "text-navy" },
} as const;

export function Toaster() {
  const { toasts, removeToast } = useStore(useShallow((s) => ({
    toasts: s.toasts,
    removeToast: s.removeToast,
  })));

  //if (toasts.length === 0) return null;

  return (
    <div className="toaster fixed top-5 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">

      {toasts.map((t) => {
          const s = STYLES[t.type];
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto xl:min-w-[220px] flex items-center gap-2.5 rounded-[3px] bg-light-grey/20 shadow-md border border-default border-l-10 ${s.border} pl-3 pr-2.5 py-2.5 text-sm max-w-sm animate-[toastIn_.18s_ease-out]`}
            >
              <Icon size={18} className={`${s.color} shrink-0`} />
              <span className="text-color-base flex-1">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss"
                className="icon-only-btn shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
    </div>
  );
}