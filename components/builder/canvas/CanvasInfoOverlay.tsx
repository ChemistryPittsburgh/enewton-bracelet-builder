"use client";

import { LayoutTemplate, Lock, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { CATEGORY_STYLES } from "@/lib/category-colors";
import { CanvasWorkflowBar } from "./CanvasWorkflowBar";

import type { Bracelet } from "@/types";

interface CanvasInfoOverlayProps {
  activePatternId: number | null;
  kickedNotification: boolean;
  lockedByOther: boolean;
  lockHeld: boolean;
  savedDesign: Bracelet | undefined;
  braceletName: string;
  highlightReason: "name" | "sku" | null;
  onDetailsClick: () => void;
}

/** Top-left canvas overlay: mode/lock banners, workflow, name, and details link. */
export function CanvasInfoOverlay({
  activePatternId,
  kickedNotification,
  lockedByOther,
  lockHeld,
  savedDesign,
  braceletName,
  highlightReason,
  onDetailsClick,
}: CanvasInfoOverlayProps) {
  // Collections only apply to bracelet designs, not patterns.
  const collections = activePatternId === null ? savedDesign?.collections ?? [] : [];

  return (
    <div className="absolute left-4 lg:left-6 xl:left-8 lg:top-4 top-2 z-20 flex flex-col gap-0.5">
      {activePatternId !== null && (
        <div className="mb-1 flex w-fit items-center gap-1.5 rounded-[2px] bg-gold px-2.5 py-1 text-xs font-medium text-white">
          <LayoutTemplate size={11} className="shrink-0" />
          <span className="font-bold">Pattern mode</span>
        </div>
      )}
      {(kickedNotification || lockedByOther) && (
        <div className="mb-1 flex items-center gap-1.5 rounded-[2px] bg-orange px-2.5 py-1 text-xs font-medium text-white">
          <ShieldAlert size={11} className="shrink-0" />
          {kickedNotification
            ? "Read-only — your session was taken over"
            : `Read-only — being edited by ${savedDesign!.active_lock!.user_name}`}
        </div>
      )}
      <CanvasWorkflowBar />
      {savedDesign?.status === "rejected" && savedDesign?.rejection_reason && (
        <p className="max-w-[240px] pt-1 text-xs leading-relaxed">
          <span className="text-color-base/60 font-semibold">Reason: </span>
          <span className="italic">&ldquo;{savedDesign.rejection_reason}&rdquo;</span>
        </p>
      )}
      <p className="py-2 font-semibold leading-snug">
        <span className="text-color-base/70 font-headline">{activePatternId !== null ? "Pattern Name:" : "Bracelet Name:"}</span> {braceletName}
      </p>
      {collections.length > 0 && (
        <div 
          className={cn(
              "flex max-w-[260px] w-fit flex-wrap items-center gap-1 py-1 px-2 mb-1 rounded-[3px] border border-navy text-[11px]",
              CATEGORY_STYLES.collection.bg,
            )} >
          <p className="font-semibold text-color-base/70">Collections:</p>
          <span>{collections.map((c) => c.name).join(", ")}</span>
        </div>
      )}

      {/* "view bracelet/pattern details" button*/}
      <button
        onClick={onDetailsClick}
        className={cn(
          "text-left text-xs w-fit rounded-[1px] transition-all duration-200 focus:outline-none focus:ring focus:ring-color-base/50 focus:ring-offset-3 focus:bg-white",
          highlightReason !== null
            ? "px-2.5 py-1 bg-mint text-navy font-semibold border border-navy animate-pulse"
            : "underline hover:no-underline text-color-base/70",
        )}
      >
        {highlightReason === "name" ? "Set a bracelet name →" : highlightReason === "sku" ? "Add a Shopify SKU →" : activePatternId !== null ? "view pattern details" : "view bracelet details"}
      </button>
    </div>
  );
}