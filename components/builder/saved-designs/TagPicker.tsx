"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTags } from "@/hooks/useTags";
import { usePermissions } from "@/hooks/usePermissions";
import { ManageTagsDialog } from "@/components/builder/dialogs/ManageTagsDialog";
import type { Tag } from "@/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface TagPickerProps {
  /** Currently selected tag IDs */
  selectedIds: number[];
  /** Called when user toggles a tag */
  onToggle: (tag: Tag) => void;
  /**
   * Tag IDs currently being saved (in-flight mutations).
   * Rows with a pending ID show a spinner and are non-interactive.
   */
  pendingIds?: number[];
  /** Trigger button appearance */
  variant?: "filter" | "assign";
  /** Extra class on the trigger */
  className?: string;
  /** Placeholder text shown when nothing selected */
  placeholder?: string;
  /** Whether to show "Manage Tags" admin link */
  showManage?: boolean;
}

/**
 * A dropdown that lists all tags with checkboxes.
 * Used as a filter in SavedDesignsPanel and as a tag-assigner in BraceletDetailsDialog.
 *
 * For "filter" variant: pass `selectedIds` = selected tag IDs to filter by.
 * For "assign" variant: pass `selectedIds` = IDs already on the design.
 */
export function TagPicker({
  selectedIds,
  onToggle,
  pendingIds = [],
  variant = "filter",
  className,
  placeholder = "Custom Tags",
  showManage = false,
}: TagPickerProps) {
  const { data: tags = [] } = useTags();
  const { canManageComponents } = usePermissions();

  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selectedCount = selectedIds.length;
  const isBusy = pendingIds.length > 0;

  // Trigger button style varies by variant
  const triggerCls =
    variant === "filter"
      ? "w-[150px] rounded-lg border border-neutral-200 bg-white px-2 py-2.5 text-sm text-neutral-700 outline-none transition-colors hover:border-neutral-400 focus:border-neutral-500 cursor-pointer flex items-center justify-between gap-1"
      : "flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:border-neutral-400 cursor-pointer";

  return (
    <>
      <div ref={containerRef} className={cn("relative", className)}>
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={triggerCls}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="truncate">
            {selectedCount > 0
              ? `${placeholder} (${selectedCount})`
              : placeholder}
          </span>
          {isBusy ? (
            <Loader2
              size={14}
              className="shrink-0 animate-spin text-neutral-400"
            />
          ) : (
            <ChevronDown
              size={14}
              className={cn("shrink-0 text-neutral-400 transition-transform", open && "rotate-180")}
            />
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden">
            {/* Header (admin only) */}
            {canManageComponents && showManage && (
              <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Custom Tags
                </span>
                <button
                  onClick={() => { setOpen(false); setManageOpen(true); }}
                  className="flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-800 transition-colors"
                  title="Manage tags"
                >
                  <Settings size={12} /> Manage tags
                </button>
              </div>
            )}

            {/* Tag list */}
            <div className="max-h-60 overflow-y-auto py-1">
              {tags.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-neutral-400">No tags yet.</p>
              ) : (
                tags.map((tag) => {
                  const checked  = selectedIds.includes(tag.id);
                  const isPending = pendingIds.includes(tag.id);
                  return (
                    <label
                      key={tag.id}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 transition-colors",
                        isPending
                          ? "cursor-default opacity-60"
                          : "cursor-pointer hover:bg-neutral-50",
                      )}
                    >
                      {isPending ? (
                        <Loader2 size={13} className="shrink-0 animate-spin text-neutral-400" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle(tag)}
                          className="h-3.5 w-3.5 accent-neutral-800 cursor-pointer"
                        />
                      )}
                      <span className="text-sm text-neutral-700">{tag.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manage dialog */}
      <ManageTagsDialog open={manageOpen} onClose={() => setManageOpen(false)} />
    </>
  );
}