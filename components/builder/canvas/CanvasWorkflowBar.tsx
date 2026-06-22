"use client";

import { useStore } from "@/lib/store";
import { useDesign } from "@/hooks/useDesign";
import { STATUS_META } from "@/lib/category-colors";
import type { BraceletStatus } from "@/types";

/**
 * Compact status badge rendered on the canvas overlay.
 * Workflow action buttons live in HeaderToolbar.
 * Only visible when a saved design is loaded (activeDesignId is set).
 */
export function CanvasWorkflowBar() {
  const activeDesignId = useStore((s) => s.activeDesignId);
  const { data: savedDesign } = useDesign(activeDesignId);

  if (!savedDesign) return null;

  const status: BraceletStatus =
    savedDesign.is_discontinued === 1 ? "discontinued" : savedDesign.status;

  const { label, cls } = STATUS_META[status];

  return (
    <div className="flex items-center pt-1">
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
        {label}
      </span>
    </div>
  );
}