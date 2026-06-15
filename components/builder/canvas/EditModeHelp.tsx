"use client";

import { useState, useEffect, useRef } from "react";
import { HelpCircle, X } from "lucide-react";
import { useStore } from "@/lib/store";

const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

const MOD = IS_MAC ? "⌘" : "Ctrl";

const SHORTCUTS = [
  { keys: "Click",              desc: "Select / deselect an item" },
  { keys: `${MOD} + Click`,     desc: "View item info" },
  { keys: "← →  or  ↑ ↓",      desc: "Move selected bead" },
  { keys: `${MOD} + D`,         desc: "Duplicate selected" },
  { keys: "Delete",             desc: "Remove selected / Close Window" },
  { keys: "Esc",                desc: "Deselect all" },
  { keys: "Drag",               desc: "Reorder by dragging" },
];

export function EditModeHelp() {
  const isEditMode = useStore((s) => s.isEditMode);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Close on click outside
  // useEffect(() => {
  //   if (!open) return;
  //   function onClick(e: MouseEvent) {
  //     if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
  //       setOpen(false);
  //     }
  //   }
  //   window.addEventListener("pointerdown", onClick);
  //   return () => window.removeEventListener("pointerdown", onClick);
  // }, [open]);

  if (!isEditMode) return null;

  return (
    <div ref={panelRef} className="absolute right-4 lg:right-6 bottom-4 z-50">
      {open && (
        <div className="mb-2 w-[300px] rounded-[2px] bg-white shadow-lg border border-default overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-default bg-light-grey/70">
            <span className="text-xs font-semibold tracking-wide text-color-base/80">
              Edit Mode Shortcuts
            </span>
            <button
              onClick={() => setOpen(false)}
              className="icon-only-btn icon-only-btn--white text-color-base/40 hover:text-color-base"
              aria-label="Close help"
            >
              <X size={14} />
            </button>
          </div>
          <ul className="px-3.5 py-2.5 space-y-2">
            {SHORTCUTS.map((s) => (
              <li key={s.desc} className="flex items-baseline justify-between gap-3">
                <kbd className="shrink-0 text-[11px] font-mono font-medium text-color-base bg-light-grey rounded px-1.5 py-0.5">
                  {s.keys}
                </kbd>
                <span className="text-xs text-color-base/70 text-right">{s.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`pointer-events-auto ml-auto flex items-center justify-center w-8 h-8 rounded-full shadow-sm border transition-colors ${
          open
            ? "bg-navy text-white border-navy"
            : "bg-white text-color-base/50 border-default hover:text-color-base hover:bg-light-grey/50"
        }`}
        aria-label="Edit mode help"
        title="Keyboard shortcuts"
      >
        <HelpCircle size={16} />
      </button>
    </div>
  );
}