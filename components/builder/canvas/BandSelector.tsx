"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FloatingDialog } from "@/components/ui/FloatingDialog";
import { useStore } from "@/lib/store";
import { useDesign } from "@/hooks/useDesign";
import {
  BRACELET_MATERIALS,
  BRACELET_SIZES,
  BRACELET_SIZE_RADIUS,
  HAIRTIE_COLORS,
  HAIRTIE_DEFAULT_SIZE,
} from "@/lib/constants";
import { usedArc, braceletArc } from "@/lib/bead-layout";
import type { BandMaterial } from "@/types";

interface BandSelectorProps {
  panelOpen?: boolean;
}

const toggleClass = (active: boolean, disabled = false) =>
  cn(
    "rounded-[2px] border px-2 py-1 text-[11px] font-medium transition-all",
    disabled
      ? "border-default bg-light-grey text-color-base/30 cursor-not-allowed"
      : active
        ? "border-navy bg-navy text-white"
        : "border-default bg-white text-color-base/70 hover:border-neutral-400"
  );

export function BandSelector({ panelOpen = false }: BandSelectorProps) {
  const {
    bandMaterial,
    braceletSize,
    hairtieColor,
    setbandMaterial,
    setBraceletSize,
    setHairtieColor,
    beads,
    activeDesignId,
  } = useStore((s) => ({
    bandMaterial:    s.bandMaterial,
    braceletSize:    s.braceletSize,
    hairtieColor:    s.hairtieColor,
    setbandMaterial:  s.setbandMaterial,
    setBraceletSize: s.setBraceletSize,
    setHairtieColor: s.setHairtieColor,
    beads:           s.beads,
    activeDesignId:  s.activeDesignId,
  }));

  const { data: savedDesign, isLoading: designLoading } = useDesign(activeDesignId);
  const isLocked =
    designLoading ||
    savedDesign?.status === "approved" ||
    savedDesign?.status === "published";

  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLocked) return null;

  const arc = usedArc(beads);
  const isHairtie = bandMaterial === "hairtie";
  const bandSelectorTitle = panelOpen && !dialogOpen ? "" : "Band settings";

  function handleMaterialChange(value: BandMaterial) {
    setbandMaterial(value);
    // When switching to hairtie, lock the size
    if (value === "hairtie") {
      setBraceletSize(HAIRTIE_DEFAULT_SIZE);
    }
  }

  return (
    <FloatingDialog
      title={bandSelectorTitle}
      onOpenChange={setDialogOpen}
      buttonTitle="Band Settings"
      className={cn(
        "absolute bottom-4 left-4 z-40 transition-all duration-300 ease-out w-auto max-w-[300px]",
        !panelOpen && "min-w-[16.25rem]"
      )}
    >
      <div className="space-y-4">
        {/* Material */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-color-base/70">Material</span>
          <div className="flex gap-1.5">
            {BRACELET_MATERIALS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleMaterialChange(value)}
                className={toggleClass(bandMaterial === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Bracelet size — hidden when hairtie is selected */}
        {!isHairtie && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-color-base/70">Bracelet size</span>
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
        )}

        {/* Hairtie color picker — only visible when hairtie is selected */}
        {isHairtie && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-color-base/70">Hairtie color</span>
            <div className="flex flex-wrap gap-1.5">
              {HAIRTIE_COLORS.map(({ value, label, hex }) => (
                <button
                  key={value}
                  onClick={() => setHairtieColor(value)}
                  title={label}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-all",
                    hairtieColor === value
                      ? "border-navy ring-2 ring-navy/30 scale-110"
                      : "border-transparent hover:border-neutral-400 hover:scale-105",
                  )}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </FloatingDialog>
  );
}