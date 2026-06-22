"use client";

import { useMemo } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { usedArc, braceletArc } from "@/lib/bead-layout";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { getCollidingCharmIds } from "@/lib/charm-collision";
import { formatMm } from "@/lib/utils";

import { Tooltip } from "@/components/ui/Tooltip";

import { useDesign } from "@/hooks/useDesign";

export function CanvasStatsBar() {
  const { placedBeads, braceletSize, showCharmCollisions, setShowCharmCollisions, activeDesignId } = useStore((s) => ({
    placedBeads: s.beads,
    braceletSize: s.braceletSize,
    showCharmCollisions: s.showCharmCollisions,
    setShowCharmCollisions: s.setShowCharmCollisions,
    activeDesignId: s.activeDesignId,
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
    <div className="absolute left-4 bottom-4 right-4 z-40 flex flex-col">
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
        <div className="bg-white backdrop-blur-sm shadow-sm rounded-[5px] flex items-center p-4 m-auto gap-4">
          <Stat label="MM Used" value={`${remainingMm > 0.1 ? formatMm(remainingMm) : "0"}mm / ${formatMm(totalMm)}mm`} />
          <Stat label="Filled" value={`${percentUsed.toFixed(0)}%`} />
          <Stat label="Items" value={`${placedBeads.length}`} />
          <Stat label="Beads" value={`${String(beadCount)}`} />
          <Stat label="Charms" value={`${String(charmCount)}`} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-[2px] bg-grey/70 px-4 py-1 text-xs">
      <span className="text-[11px] tracking-wide uppercase text-black/80">{label}</span> <span className="text-sm font-semibold ml-2">{value}</span>
    </span>
  );
}