"use client";

import { useMemo } from "react";
import { AlertTriangle, ChartNoAxesGantt, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { usedArc, braceletArc } from "@/lib/bead-layout";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { getCollidingCharmIds } from "@/lib/charm-collision";
import { cn, formatMm } from "@/lib/utils";

import { Tooltip } from "@/components/ui/Tooltip";

import { useDesign } from "@/hooks/useDesign";

export function CanvasStatsBar({ hidden = false }: { hidden?: boolean }) {
  const { 
    placedBeads, 
    braceletSize, 
    showCharmCollisions, 
    setShowCharmCollisions, 
    activeDesignId, 
    isEvenlySpaced,
    isEditMode,
  } = useStore((s) => ({
    placedBeads: s.beads,
    braceletSize: s.braceletSize,
    showCharmCollisions: s.showCharmCollisions,
    setShowCharmCollisions: s.setShowCharmCollisions,
    activeDesignId: s.activeDesignId,
    isEvenlySpaced: s.isEvenlySpaced,
    isEditMode: s.isEditMode,
  }));

  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const maxArc = braceletArc(radius);
  const arcUsed = usedArc(placedBeads);
  const arcUsedMm = arcUsed * 1000;
  const totalMm = Math.max(maxArc * 1000, 0);
  const percentUsed = Math.min((arcUsed / maxArc) * 100, 100);
  const remainingMm = Math.max(totalMm - arcUsedMm, 0);

  const { data: savedDesign } = useDesign(activeDesignId);

  const isPublished = savedDesign?.status === "published";

  const beadCount = placedBeads.filter(
    (b) => b.product.bead_category === "bead"
  ).length;

  const charmCount = placedBeads.filter(
    (b) => b.product.bead_category === "charm"
  ).length;

  const collidingIds = useMemo(
    () => getCollidingCharmIds(placedBeads, radius),
    [placedBeads, radius],
  );

  const hasCollisions = collidingIds.length > 0;

  function handleCollisionClick() {
    setShowCharmCollisions(!showCharmCollisions);
  }

  return (
    <div className={cn(
      "absolute left-4 bottom-4 right-4 z-40 flex flex-col transition-opacity duration-300",
      hidden && "opacity-0 pointer-events-none",
      isEditMode && "bottom-0 w-full left-0 right-0 bg-navy/20"
    )} >
      <div className="canvas-stats-wrapper relative w-fit mx-auto">
        {hasCollisions && !isPublished && (
        <Tooltip content="Ensure charms look correct before publishing" className="w-fit ml-auto !block" placement="bottom">
          <button
            onClick={handleCollisionClick}
            className={`flex mr-4 -mb-[5px] items-center gap-2 px-4 pt-2 pl-2 pr-3 pb-3 rounded-t-[5px] text-xs font-medium transition-all translate-y-0 ${
              showCharmCollisions
                ? "bg-error/80 text-white ring-1 ring-error !-translate-y-[5px] hover:bg-error/60 hover:-translate-y-[0px]"
                : "bg-error/10 text-error backdrop-blur-sm shadow-sm hover:bg-white hover:-translate-y-[5px]"
            }`}
          >
            {showCharmCollisions ? (
              <X size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            Charms may be overlapping
          </button>
        </Tooltip>
      )}
        <div className={cn(
            "bg-white shadow-sm rounded-[5px] flex items-center p-4 m-auto gap-2 xl:gap-4",
            isEditMode && "shadow-none border-none bg-transparent py-3 h-[50px]"
          )} >
          <Stat label="MM Used" value={`${remainingMm > 0.5 ? formatMm(remainingMm) : "0"}mm / ${formatMm(totalMm)}mm`} isEditMode={isEditMode} />
          <Stat label="Filled" value={`${percentUsed.toFixed(1)}%`} isEditMode={isEditMode} />
          <Stat label="Items" value={`${placedBeads.length}`} isEditMode={isEditMode} />
          <Stat label="Beads" value={`${String(beadCount)}`} isEditMode={isEditMode} />
          <Stat label="Charms" value={`${String(charmCount)}`} isEditMode={isEditMode} />
          {isEvenlySpaced && (
            <span className="rounded-[2px] bg-navy/10 text-navy px-3 py-0.5 xl:py-1 text-xs flex items-center gap-1.5">
              <ChartNoAxesGantt size={12} />
              <span className="text-[10px] xl:text-[11px] tracking-wide uppercase font-medium">Evenly Spaced</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, isEditMode }: { label: string; value: string; isEditMode: boolean }) {
  return (
    <span
      className={cn(
        "rounded-[2px] bg-grey/70 px-4 py-0.5 xl:py-1 text-xs",
        isEditMode && "bg-white/60"
      )} >
      <span className="text-[10px] xl:text-[11px] tracking-wide uppercase text-black/80">{label}</span> <span className="xl:text-sm font-semibold ml-1 xl:ml-2">{value}</span>
    </span>
  );
}