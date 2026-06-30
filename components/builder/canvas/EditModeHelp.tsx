"use client";

import { useState, useEffect, useRef } from "react";
import { HelpCircle, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { Tooltip } from "@/components/ui/Tooltip";

const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const MOD = IS_MAC ? "⌘" : "Ctrl";

// Keep in sync with the .animate-help-out duration in globals.css.
const OUT_MS = 160;

const SHORTCUT_GROUPS: { title: string; items: { keys: string; desc: string }[] }[] = [
  {
    title: "Selection",
    items: [
      { keys: "Click",            desc: "Select / deselect an item" },
      { keys: `${MOD} + Click`,   desc: "View item info" },
      { keys: "Esc",              desc: "Deselect all" },
    ],
  },
  {
    title: "Editing",
    items: [
      { keys: "← → ↑ ↓",          desc: "Move selected bead" },
      { keys: "Drag",             desc: "Reorder by dragging" },
      { keys: `${MOD} + D`,       desc: "Duplicate selected" },
      { keys: "Delete",           desc: "Remove selected / close window" },
    ],
  },
  {
    title: "Canvas",
    items: [
      { keys: "+  /  −",          desc: "Zoom in / out" },
      { keys: "[  /  ]",          desc: "Rotate view left / right" },
      { keys: "V",                desc: "Switch top / side view" },
      { keys: "L",                desc: "Toggle look (orbit) tool" },
    ],
  },
  {
    title: "Mode",
    items: [
      { keys: "E",                desc: "Enter Edit Mode" },
      { keys: `${MOD} + Esc`,     desc: "Exit Edit Mode" },
    ],
  },
];

export function EditModeHelp() {
  const isEditMode = useStore((s) => s.isEditMode);
  const [open, setOpen] = useState(false);      // user intent — drives the in/out animation class
  const [render, setRender] = useState(false);  // stays mounted through the out animation
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openPanel() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setRender(true);
    setOpen(true);
  }

  function closePanel() {
    setOpen(false); // swaps to animate-help-out; unmount once it has played
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setRender(false);
      closeTimer.current = null;
    }, OUT_MS);
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Clear any pending close timer on unmount
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  // Close on click outside
  // useEffect(() => {
  //   if (!open) return;
  //   function onClick(e: MouseEvent) {
  //     if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
  //       closePanel();
  //     }
  //   }
  //   window.addEventListener("pointerdown", onClick);
  //   return () => window.removeEventListener("pointerdown", onClick);
  // }, [open]);

  if (!isEditMode) return null;

  return (
    <div ref={panelRef} className="relative flex justify-center items-center">
      {render && (
        <div
          className={`pointer-events-auto ${open ? "animate-help-in" : "animate-help-out"} absolute right-0 top-14 z-50 mb-2 w-[300px] max-h-[70vh] overflow-hidden rounded-[2px] bg-white shadow-lg border border-default`}
        >
          <div className="sticky top-0 flex items-center justify-between pl-3.5 pr-2 py-1 border-b border-default bg-light-grey">
            <span className="text-[11.5px] font-semibold tracking-wide text-color-base/80">
              Edit Mode Shortcuts
            </span>
            <button
              onClick={closePanel}
              className="icon-only-btn icon-only-btn--white text-color-base/40 hover:text-color-base"
              aria-label="Close help"
            >
              <X size={14} />
            </button>
          </div>
          <div className="px-3.5 py-2.5 space-y-3 max-h-[300px] xl:max-h-[450px] [&>*:last-child]:pb-3 overflow-y-scroll">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-color-base/40">
                  {group.title}
                </div>
                <ul className="space-y-2">
                  {group.items.map((s) => (
                    <li key={s.desc} className="flex items-baseline justify-between gap-3">
                      <kbd className="shrink-0 text-[11px] font-mono font-medium text-color-base bg-light-grey rounded px-1.5 py-0.5">
                        {s.keys}
                      </kbd>
                      <span className="text-xs text-color-base/70 text-right">{s.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      <Tooltip content={!open ? 'Open Keyboard Shortcuts' : ''} placement="bottom-end">
        <button
          onClick={() => (open ? closePanel() : openPanel())}
          className={`pointer-events-auto ml-auto flex items-center justify-center h-10 w-10 rounded-full shadow-sm border transition-colors ${
            open
              ? "bg-navy text-white border-navy hover:bg-navy/80"
              : "bg-white text-color-base/50 border-default hover:text-color-base hover:bg-light-grey/50"
          }`}
          aria-label="Edit mode help"
        >
          <HelpCircle size={18} />
        </button>
      </Tooltip>
    </div>
  );
}