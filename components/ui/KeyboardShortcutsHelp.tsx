"use client";

import { useState, useEffect, useRef } from "react";
import { HelpCircle, X } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const MOD = IS_MAC ? "⌘" : "Ctrl";

// Keep in sync with the .animate-help-out duration in globals.css.
const OUT_MS = 160;

type Group = { title: string; tag?: { label: string; tone: "anywhere" | "edit" }; items: { keys: string; desc: string }[] };

const SHORTCUT_GROUPS: Group[] = [
  {
    title: "General",
    tag: { label: "Works anywhere", tone: "anywhere" },
    items: [
      { keys: `${MOD} Z`,        desc: "Undo" },
      { keys: `${MOD} ⇧ Z`,      desc: "Redo" },
      { keys: "E",               desc: "Enter edit mode" },
      { keys: `${MOD} Esc`,      desc: "Exit edit mode" },
      { keys: "?",               desc: "Show shortcuts" },
    ],
  },
  {
    title: "Selection",
    tag: { label: "Edit mode", tone: "edit" },
    items: [
      { keys: "Click",           desc: "Select / deselect an item" },
      { keys: `${MOD} Click`,    desc: "View item info" },
      { keys: "Esc",             desc: "Deselect all" },
    ],
  },
  {
    title: "Editing",
    tag: { label: "Edit mode", tone: "edit" },
    items: [
      { keys: "← → ↑ ↓",         desc: "Move selected bead" },
      { keys: "Drag",            desc: "Reorder by dragging" },
      { keys: `${MOD} D`,        desc: "Duplicate selected" },
      { keys: "Delete",          desc: "Remove selected" },
    ],
  },
  {
    title: "Canvas",
    tag: { label: "Edit mode", tone: "edit" },
    items: [
      { keys: "+  /  −",         desc: "Zoom in / out" },
      { keys: "[  /  ]",         desc: "Rotate view" },
      { keys: "V",               desc: "Top / side view" },
      { keys: "H",               desc: "Grab (pan) tool" },
      { keys: "L",               desc: "Look (orbit) tool" },
    ],
  },
];

/**
 * Global keyboard-shortcuts panel. Lives in the header so it's reachable in any
 * mode (previously this was edit-mode only). Open it with the "?" key or the
 * header button. The General group lists app-wide shortcuts; the rest are
 * tagged "Edit mode" since they only apply on the canvas while editing.
 */
export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);      // user intent — drives the in/out animation class
  const [render, setRender] = useState(false);  // stays mounted through the out animation
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openPanel() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
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

  // Global "?" toggles the panel; Escape closes it. Ignored while typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { if (open) closePanel(); return; }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        open ? closePanel() : openPanel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on click outside the button + panel.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closePanel();
    }
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Clear any pending close timer on unmount
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  return (
    <div ref={wrapRef} className="relative shrink-0 ml-1">
      <Tooltip content={!open ? "Keyboard shortcuts  (?)" : ""} placement="bottom-end">
        <button
          onClick={() => (open ? closePanel() : openPanel())}
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
            open
              ? "bg-navy text-white border-navy hover:bg-navy/80"
              : "bg-white text-color-base/55 border-color-base/50 hover:text-color-base hover:bg-light-grey/50"
          }`}
          aria-label="Keyboard shortcuts"
        >
          <HelpCircle size={18} />
        </button>
      </Tooltip>

      {render && (
        <div
          className={`${open ? "animate-help-in" : "animate-help-out"} absolute right-0 top-[calc(100%+15px)] z-50 w-[320px] max-h-[70vh] rounded-[2px] bg-white shadow-lg border border-default overflow-hidden`}
        >
          <div className="sticky top-0 flex items-center justify-between pl-3.5 pr-2 py-1 border-b border-default bg-light-grey/70">
            <span className="text-[11.5px] font-semibold tracking-wide text-color-base/80">
              Keyboard shortcuts
            </span>
            <button
              onClick={closePanel}
              className="icon-only-btn icon-only-btn--white"
              aria-label="Close shortcuts"
            >
              <X size={14} />
            </button>
          </div>

          <div className="pt-2.5 space-y-3 overflow-y-auto max-h-[calc(70vh-66px)] [&>*:last-child]:border-b-0 [&>*:nth-last-child(2)]:mb-0">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2 border-b border-default px-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-color-base/80">
                    {group.title}
                  </span>
                  {group.tag && (
                    <span
                      className={`text-[9.5px] font-medium rounded-[2px] px-2 py-px border ${
                        group.tag.tone === "anywhere" ? "bg-gold/20 border-gold/80" : "bg-edit border-navy/80"
                      }`}
                    >
                      {group.tag.label}
                    </span>
                  )}
                </div>
                <ul className="space-y-2 pb-3">
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

            <div className="bg-light-grey text-[11px] text-color-base/80 py-2 px-3.5" >
              <kbd className="text-[11px] font-mono bg-white rounded px-1.5 py-0.5 mr-1 border border-color-base/80">?</kbd> opens this panel anytime
              {!IS_MAC && <> · <span className="font-mono">⌘</span> = Ctrl</>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}