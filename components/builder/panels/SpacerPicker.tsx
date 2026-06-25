"use client";

import { useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { useStore } from "@/lib/store";

import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { AvailableSpaceBox } from "@/components/ui/AvailableSpaceBox";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { usePermissions } from "@/hooks/usePermissions";
import { braceletArc, usedArc } from "@/lib/bead-layout";
import { BRACELET_SIZE_RADIUS, SPACER_SIZES_MM } from "@/lib/constants";

interface SpacerPickerProps {
  onAdd: (sizeMm: number) => void;
  error: string | null;
  maxArcMm?: number;
  isReplaceMode?: boolean;
}

export function SpacerPicker({ onAdd, error, maxArcMm, isReplaceMode }: SpacerPickerProps) {
  const { placedBeads, braceletSize } = useStore((s) => ({
    placedBeads:  s.beads,
    braceletSize: s.braceletSize,
  }));
  const { canEdit } = usePermissions();

  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [customSize, setCustomSize]     = useState("");

  const radius              = BRACELET_SIZE_RADIUS[braceletSize];
  const totalArc            = braceletArc(radius);
  const used                = usedArc(placedBeads);
  const availableMm         = Math.max(0, Math.round((totalArc - used) * 1000 * 10) / 10);
  const effectiveAvailableMm = maxArcMm ?? availableMm;

  const MAX_SPACER_MM = 14;

  const activeSize = selectedSize ?? (customSize ? parseFloat(customSize) : null);
  const tooLarge = activeSize != null && activeSize > MAX_SPACER_MM;
  const fits = activeSize != null && activeSize > 0 && activeSize <= effectiveAvailableMm && !tooLarge;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-5 pb-4">
        <AvailableSpaceBox />

        <SectionHeading>Spacer size</SectionHeading>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-5">
          {SPACER_SIZES_MM.map((size) => {
            const canFit   = size <= effectiveAvailableMm;
            const isActive = selectedSize === size && !customSize;
            return (
              <button
                key={size}
                disabled={!canFit}
                onClick={() => { setSelectedSize(size); setCustomSize(""); }}
                className={`flex flex-col items-center gap-0.5 rounded-[2px] border py-3 text-sm transition-all ${
                  isActive
                    ? "ring-2 ring-navy border-navy bg-white shadow-sm"
                    : canFit
                      ? "border-default bg-white hover:border-neutral-400"
                      : "border-default bg-light-grey/50 text-color-base/30 cursor-not-allowed"
                }`}
              >
                <span className="font-semibold">{size}mm</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs font-semibold text-color-base/70 uppercase tracking-wide mb-2">
          Custom size
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0.5}
            max={MAX_SPACER_MM}
            step={0.5}
            value={customSize}
            onChange={(e) => {
              setCustomSize(e.target.value);
              setSelectedSize(null);
            }}
            placeholder={`0.5 – ${MAX_SPACER_MM}`}
            className={`w-full rounded-[2px] border px-3 py-2.5 text-sm outline-none placeholder:text-color-base/70 ${
              tooLarge
                ? "border-error focus:border-error"
                : "border-default focus:border-navy focus:ring-navy"
            }`}
          />
          <span className="shrink-0 text-sm text-color-base/70">mm</span>
        </div>
        {tooLarge && (
          <p className="text-xs text-error mt-1.5">
            Maximum spacer size is {MAX_SPACER_MM}mm.
          </p>
        )}
        {isReplaceMode && activeSize != null && activeSize > 0 && !tooLarge && (
          <p className="text-[11px] text-color-base/50 mt-2">
            Fills {Math.floor(effectiveAvailableMm / activeSize)} × {activeSize}mm spacers
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-default/50 px-5 pt-4 pb-5 space-y-3">
        {error && <ErrorAlert message={error} />}
        {(1 < effectiveAvailableMm) ? (
          <>
           <SectionHeading>
            {activeSize ? `${activeSize}mm spacer` : "Select a size"}
          </SectionHeading>
          {canEdit && (
            <Button
              onClick={() => activeSize && onAdd(activeSize)}
              disabled={!fits}
              className="flex w-full items-center justify-center gap-2 group"
            >
              <MoveHorizontal size={16} className="-mt-[2.5px] fill-white group-hover:fill-navy stroke-white hover:fill-navy group-hover:stroke-navy transition-colors" />
              {isReplaceMode ? "Replace bar" : "Add spacer"}
            </Button>
          )}
          </>
        ) : (
          <div className="rounded-[2px] border border-error/20 bg-error/5 px-4 py-3 text-center">
            <SectionHeading className="mb-1 text-error">Bracelet is full</SectionHeading>
            <p className="text-xs text-color-base/80 mt-0">Remove beads to free up space.</p>
          </div>
        )}
      </div>
    </div>
  );
}