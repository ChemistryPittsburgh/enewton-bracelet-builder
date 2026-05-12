"use client";

import { useStore } from "@/lib/store";
import { usedArc, MAX_BRACELET_ARC } from "@/lib/bead-layout";

export function BraceletInfoBar() {
  const placedBeads = useStore((s) => s.beads);

  const arcUsed = usedArc(placedBeads);
  const percentUsed = Math.min((arcUsed / MAX_BRACELET_ARC) * 100, 100);
  const totalMm = Math.max((MAX_BRACELET_ARC) * 1000, 0);
  const remainingMm = Math.max((MAX_BRACELET_ARC - arcUsed) * 1000, 0);

  const beadCount = placedBeads.filter(
    (b) => b.product.beadCategory === "bead"
  ).length;

  const charmCount = placedBeads.filter(
    (b) => b.product.beadCategory === "charm"
  ).length;

  return (
    <div className="absolute left-4 bottom-4 right-4 z-40 flex items-center justify-center">
      <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-2xl flex items-center p-4 m-auto gap-4">
        <Stat label="Available" value={`${remainingMm.toFixed(1)}mm / ${totalMm.toFixed(0)}mm`} />
        <Stat label="Fit" value={`${percentUsed.toFixed(0)}% used`} />
        <Stat label="Items" value={`${placedBeads.length} items`} />
        <Stat label="Beads" value={`${String(beadCount)} beads`} />
        <Stat label="Charms" value={`${String(charmCount)} charms`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-neutral-100 px-4 py-1 text-xs text-neutral-700">
      {label} <span className="text-sm font-semibold ml-2">{value}</span>
    </span>
  );
}