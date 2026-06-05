"use client";

import { useStore } from "@/lib/store";
import { useDesign } from "@/hooks/useDesign";
import type { BraceletStatus } from "@/types";

const STATUS_LABEL: Record<BraceletStatus, string> = {
  draft:          "In Progress",
  in_review:      "In Review",
  approved:       "Approved",
  published:      "Published",
  discontinued:   "Discontinued",
};

const STATUS_CLS: Record<BraceletStatus, string> = {
  draft:          "bg-neutral-200/70 text-neutral-600",
  in_review:      "bg-amber-100/80  text-amber-700",
  approved:       "bg-blue-100/80   text-blue-700",
  published:      "bg-green-100/80  text-green-700",
  discontinued:   "bg-red-100/80    text-red-600",
};

/**
 * Compact status badge rendered on the canvas overlay.
 * Workflow action buttons live in CanvasToolbar.
 * Only visible when a saved design is loaded (activeDesignId is set).
 */
export function CanvasWorkflowBar() {
  const activeDesignId = useStore((s) => s.activeDesignId);
  const { data: savedDesign } = useDesign(activeDesignId);

  if (!savedDesign) return null;

  const status: BraceletStatus =
    (savedDesign.is_discontinued === 1 && savedDesign.status === "published") ? "discontinued" : savedDesign.status;

  return (
    <div className="flex items-center pt-1">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[status]}`}
      >
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
}