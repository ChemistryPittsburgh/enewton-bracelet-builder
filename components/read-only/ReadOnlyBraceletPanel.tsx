"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDesigns } from "@/hooks/useDesigns";
import { useLoadDesign } from "@/hooks/useLoadDesign";
import { Panel } from "@/components/ui/Panel";
import { STATUS_META } from "@/lib/category-colors";
import { cn } from "@/lib/utils";
import type { Bracelet, BraceletStatus } from "@/types";

const STATUS_FILTERS: { label: string; value: BraceletStatus | undefined }[] = [
  { label: "All",         value: undefined   },
  { label: "In-progress", value: "draft"     },
  { label: "In-review",   value: "in_review" },
  { label: "Approved",    value: "approved"  },
  { label: "Published",   value: "published" },
];

interface ReadOnlyBraceletPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Reports whether a bracelet load is in flight, so the canvas can show its
   *  own loading overlay while this panel's row spinner also displays. */
  onLoadingChange?: (loading: boolean) => void;
  /** "left" (side panel, tablet/desktop) or "bottom" (sheet, mobile). */
  direction?: "left" | "bottom";
}

/**
 * Minimal saved-bracelet browser for the read-only route. Deliberately not
 * SavedDesignsScreen — no tags/collections/materials, no workflow actions.
 * Clicking a bracelet loads it onto the canvas without acquiring an edit lock
 * (loadDesign's second argument skips lock acquisition entirely).
 */
export function ReadOnlyBraceletPanel({ isOpen, onClose, onLoadingChange, direction = "left" }: ReadOnlyBraceletPanelProps) {
  const [status, setStatus] = useState<BraceletStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const { data: designs = [], isLoading } = useDesigns({ status, search });
  const { loadDesign } = useLoadDesign();
  const activeDesignId = useStore((s) => s.activeDesignId);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function handleClick(design: Bracelet) {
    if (design.id === activeDesignId || pendingId !== null) return;
    setPendingId(design.id);
    onLoadingChange?.(true);
    try {
      await loadDesign(design, true);
    } finally {
      setPendingId(null);
      onLoadingChange?.(false);
    }
  }

  return (
    <Panel
      open={isOpen}
      onClose={onClose}
      title="Bracelets"
      direction={direction}
      overflowYScroll={false}
      className={direction === "bottom" ? "max-h-[70vh]" : "bottom-0 h-auto"}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 space-y-3 border-b border-default px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setStatus(value)}
                className={cn(
                  "rounded-[2px] border border-navy px-2.5 py-1 text-xs font-medium transition-colors",
                  status === value ? "bg-navy text-white" : "bg-white hover:bg-mint",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0 rounded-[2px] border border-default bg-white pr-3 transition-colors focus-within:border-navy">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bracelets"
              aria-label="Search by bracelet name"
              className="flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none ring-0 placeholder:text-color-base/70"
            />
            <Search size={15} className="shrink-0 text-color-base/70" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-color-base/50">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : designs.length === 0 ? (
            <p className="px-4 py-6 text-sm text-color-base/50">No bracelets match.</p>
          ) : (
            <ul className="divide-y divide-default">
              {designs.map((design) => {
                const isActive = design.id === activeDesignId;
                const meta = STATUS_META[design.status];
                return (
                  <li key={design.id}>
                    <button
                      onClick={() => handleClick(design)}
                      disabled={pendingId !== null}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                        isActive ? "bg-mint" : "hover:bg-shell",
                        pendingId !== null && "opacity-60",
                      )}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-default bg-shell">
                        {design.preview_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={design.preview_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[9px] text-color-base/40">No image</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-color-base">{design.name}</p>
                        <span className={cn("mt-1 inline-block rounded-[2px] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", meta.cls)}>
                          {meta.label}
                        </span>
                      </div>
                      {pendingId === design.id && (
                        <Loader2 size={16} className="shrink-0 animate-spin text-color-base/50" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
