"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTags } from "@/hooks/useTags";
import { useCollections } from "@/hooks/useCollections";
import { usePermissions } from "@/hooks/usePermissions";
import { ManageTagsDialog } from "@/components/builder/dialogs/manage/ManageTagsDialog";
import { ManageCollectionsDialog } from "@/components/builder/dialogs/manage/ManageCollectionsDialog";
import type { Collection, Tag } from "@/types";

// ── Shared internals ──────────────────────────────────────────────────────────

const triggerCls = {
  filter: "min-w-[100px] xxl:w-[150px] rounded-[2px] border border-default bg-white px-2 py-2.5 text-sm outline-none transition-colors hover:border-neutral-400 focus:border-neutral-500 cursor-pointer flex items-center justify-between gap-1",
  assign: "flex items-center gap-1.5 rounded-[2px] border border-default bg-white px-3 py-1.5 text-sm min-w-[200px] justify-between transition-colors hover:border-neutral-400 cursor-pointer",
} as const;

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  return { open, setOpen, ref };
}

// ── TagPicker ─────────────────────────────────────────────────────────────────

interface TagPickerProps {
  selectedIds: number[];
  onToggle: (tag: Tag) => void;
  /** Tag IDs with an in-flight mutation — show per-row spinner, block interaction. */
  pendingIds?: number[];
  variant?: "filter" | "assign";
  className?: string;
  placeholder?: string;
  showManage?: boolean;
}

export function TagPicker({
  selectedIds = [],
  onToggle,
  pendingIds = [],
  variant = "filter",
  className,
  placeholder = "Custom Tags",
  showManage = false,
}: TagPickerProps) {
  const { data: tags = [] } = useTags();
  const { isAdmin } = usePermissions();
  const { open, setOpen, ref } = useDropdown();
  const [manageOpen, setManageOpen] = useState(false);

  const isBusy = pendingIds.length > 0;

  return (
    <>
      <div ref={ref} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={triggerCls[variant]}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="truncate">
            {selectedIds.length > 0 ? `${placeholder} (${selectedIds.length})` : placeholder}
          </span>
          {isBusy
            ? <Loader2 size={14} className="shrink-0 animate-spin text-color-base/70" />
            : <ChevronDown size={14} className={cn("shrink-0 text-color-base/70 transition-transform", open && "rotate-180")} />
          }
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-[2px] border border-default bg-white shadow-lg overflow-hidden">
            {isAdmin && showManage && (
              <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
                <span className="text-xs font-semibold text-color-base/70 uppercase tracking-wide">Custom Tags</span>
                <button
                  onClick={() => { setOpen(false); setManageOpen(true); }}
                  className="manage-btn"
                >
                  <Settings size={12} /> Manage
                </button>
              </div>
            )}
            <div className="max-h-60 overflow-y-auto py-1">
              {tags.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-color-base/70">No tags yet.</p>
              ) : tags.map((tag) => {
                const isPending = pendingIds.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 transition-colors",
                      isPending ? "cursor-default opacity-60" : "cursor-pointer hover:bg-neutral-50",
                    )}
                  >
                    {isPending
                      ? <Loader2 size={13} className="shrink-0 animate-spin text-color-base/70" />
                      : <input type="checkbox" checked={selectedIds.includes(tag.id)} onChange={() => onToggle(tag)} className="h-3.5 w-3.5 text-yellow-600 ring-yellow-600 accent-neutral-800 cursor-pointer" />
                    }
                    <span className="text-sm  ">{tag.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <ManageTagsDialog open={manageOpen} onClose={() => setManageOpen(false)} includeBackDropBlur={variant !== 'assign'} />
    </>
  );
}

// ── CollectionPicker ──────────────────────────────────────────────────────────

interface CollectionPickerProps {
  selectedIds: number[];
  onToggle: (collection: Collection) => void;
  /** Collection IDs with an in-flight mutation — show per-row spinner. */
  pendingIds?: number[];
  variant?: "filter" | "assign";
  className?: string;
  placeholder?: string;
  showManage?: boolean;
}

export function CollectionPicker({
  selectedIds = [],
  onToggle,
  pendingIds = [],
  variant = "filter",
  className,
  placeholder = "Collection",
  showManage = false,
}: CollectionPickerProps) {
  const { data: collections = [] } = useCollections();
  const { isAdmin } = usePermissions();
  const { open, setOpen, ref } = useDropdown();
  const [manageOpen, setManageOpen] = useState(false);

  const isBusy = pendingIds.length > 0;

  return (
    <>
      <div ref={ref} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={triggerCls[variant]}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="truncate">
            {selectedIds.length > 0 ? `${placeholder} (${selectedIds.length})` : placeholder}
          </span>
          {isBusy
            ? <Loader2 size={14} className="shrink-0 animate-spin text-color-base/70" />
            : <ChevronDown size={14} className={cn("shrink-0 text-color-base/70 transition-transform", open && "rotate-180")} />
          }
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-[2px] border border-default bg-white shadow-lg overflow-hidden">
            {isAdmin && showManage && (
              <div className="flex items-center justify-between border-b border-default px-3 py-2">
                <span className="text-xs font-semibold text-color-base/70 uppercase tracking-wide">Collections</span>
                <button
                  onClick={() => { setOpen(false); setManageOpen(true); }}
                  className="manage-btn"
                >
                  <Settings size={12} /> Manage
                </button>
              </div>
            )}
            <div className="max-h-60 overflow-y-auto py-1">
              {collections.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-color-base/70">No collections yet.</p>
              ) : collections.map((c) => {
                const isPending = pendingIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 transition-colors",
                      isPending ? "cursor-default opacity-60" : "cursor-pointer hover:bg-light-grey",
                    )}
                  >
                    {isPending
                      ? <Loader2 size={13} className="shrink-0 animate-spin text-color-base/70" />
                      : <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => onToggle(c)} className="h-3.5 w-3.5 text-yellow-600 accent-grey ring-gold cursor-pointer" />
                    }
                    <span className="text-sm  ">{c.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <ManageCollectionsDialog open={manageOpen} onClose={() => setManageOpen(false)} includeBackDropBlur={variant !== 'assign'} />
    </>
  );
}