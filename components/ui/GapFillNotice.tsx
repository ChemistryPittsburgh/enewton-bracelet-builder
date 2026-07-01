"use client";

import { Info } from "lucide-react";

/**
 * Shown in a picker's amount area when a gap is selected as the insert target.
 * The gap defines the length, so the amount/size controls are hidden and this
 * notice explains what will happen. Used by the Seed, Spacer, and Bar pickers.
 */
export function GapFillNotice({ gapMm, subject = "This item" }: { gapMm?: number; subject?: string }) {
  return (
    <div className="rounded-[2px] border border-gold bg-gold/10 px-3.5 py-3 flex items-start gap-2.5">
      <Info size={16} className="text-gold shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-color-base">Filling the selected gap</p>
        <p className="text-xs text-color-base/70 mt-1 leading-relaxed">
          {subject} will fill the gap you selected{gapMm && gapMm > 0 ? ` (about ${gapMm}mm)` : ""}. To set the amount instead, cancel the gap at the top of the panel.
        </p>
      </div>
    </div>
  );
}