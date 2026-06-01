"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FloatingDialog } from "@/components/ui/FloatingDialog";
import { useStore } from "@/lib/store";
import { BRACELET_MATERIALS, BRACELET_SIZES, BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { usedArc, braceletArc } from "@/lib/bead-layout";

interface BandSelectorProps {
  panelOpen?: boolean;
}

const toggleClass = (active: boolean, disabled = false) =>
  cn(
    "rounded-lg border px-2 py-1 text-[11px] font-medium transition-all",
    disabled
      ? "border-neutral-200 bg-neutral-50 text-neutral-300 cursor-not-allowed"
      : active
        ? "border-neutral-900 bg-neutral-900 text-white"
        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
  );

export function BandSelector({ panelOpen = false }: BandSelectorProps) {
  const { bandMaterial, braceletSize, setbandMaterial, setBraceletSize, beads } =
    useStore((s) => ({
      bandMaterial: s.bandMaterial,
      braceletSize: s.braceletSize,
      setbandMaterial: s.setbandMaterial,
      setBraceletSize: s.setBraceletSize,
      beads: s.beads,
    }));

  const [dialogOpen, setDialogOpen] = useState(false);

  const arc = usedArc(beads);

  const materialLabel = BRACELET_MATERIALS.find((m) => m.value === bandMaterial)?.label ?? "String";
  const sizeLabel = BRACELET_SIZES.find((s) => s.value === braceletSize)?.label ?? "Size";

  const bandSelectorTitle = (panelOpen && !dialogOpen) ? "" : "Band settings";


  return (
    <FloatingDialog
      title={bandSelectorTitle}
      onOpenChange={setDialogOpen}
      buttonTitle="Band Settings"
      className={cn(
        "absolute bottom-4 left-4 z-40 transition-all duration-300 ease-out w-auto",
        !panelOpen && "min-w-[16.25rem]"
      )}
    >
      <div className="space-y-4">

        {/* Material */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">Material</span>
          <div className="flex gap-1.5">
            {BRACELET_MATERIALS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setbandMaterial(value)}
                className={toggleClass(bandMaterial === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Bracelet size — disabled if current beads won't fit */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-500">Bracelet size</span>
          <div className="flex gap-2">
            {BRACELET_SIZES.map(({ value, label }) => {
              const isDisabled = arc > braceletArc(BRACELET_SIZE_RADIUS[value]);
              return (
                <button
                  key={value}
                  onClick={() => !isDisabled && setBraceletSize(value)}
                  disabled={isDisabled}
                  className={toggleClass(braceletSize === value, isDisabled)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </FloatingDialog>
  );
}