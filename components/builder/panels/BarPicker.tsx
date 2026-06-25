"use client";

import { useState, useMemo, useEffect } from "react";
import { useStore } from "@/lib/store";
import type { BeadProduct, PlacedBead } from "@/types";

import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { BraceletFullNotice } from "@/components/ui/BraceletFullNotice";

import { usePermissions } from "@/hooks/usePermissions";
import { braceletArc, usedArc, beadFits } from "@/lib/bead-layout";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";

import { BeadCard } from "./../cards/BeadCard";

export function BarPicker({ bars, onAdd, onReplace, effectiveBeads, isReplaceMode, error }: {
  bars: BeadProduct[];
  onAdd: (bar: BeadProduct) => void;
  onReplace: (bar: BeadProduct) => void;
  effectiveBeads: PlacedBead[];
  isReplaceMode: boolean;
  error: string | null;
}) {
  const braceletSize = useStore((s) => s.braceletSize);
  const { canEdit } = usePermissions();

  const [selectedBar, setSelectedBar]       = useState<BeadProduct | null>(null);
  const [selectedLength, setSelectedLength] = useState<number>(30);

  const radius      = BRACELET_SIZE_RADIUS[braceletSize];
  const totalArc    = braceletArc(radius);
  const used        = usedArc(effectiveBeads);
  const availableMm = Math.max(0, Math.round((totalArc - used) * 1000 * 10) / 10);

  // Reset slider to the bar's natural size_mm whenever the selection changes
  useEffect(() => {
    if (selectedBar) setSelectedLength(selectedBar.size_mm ?? 30);
  }, [selectedBar]);

  const productToAdd = useMemo(
    () => (selectedBar ? { ...selectedBar, size_mm: selectedLength } : null),
    [selectedBar, selectedLength],
  );

  const canAdd = productToAdd !== null && beadFits(effectiveBeads, { product: productToAdd }, radius);

  return (
    <div className="flex flex-col h-full min-h-0 pt-4">
      <div className="flex-1 min-h-0 px-5 pb-4 overflow-y-auto">
        <div className="rounded-lg border border-default bg-light-grey/50 px-4 py-3 mb-5">
          <p className="text-xs font-semibold text-color-base/70 uppercase tracking-wide mb-1">
            Available space
          </p>
          <p className="text-2xl font-semibold text-navy">{availableMm}mm</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-light-grey overflow-hidden">
            <div
              className="h-full rounded-full bg-navy transition-all"
              style={{ width: `${Math.min(100, (used / totalArc) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-color-base/70 mt-1">
            {Math.round((used / totalArc) * 100)}% occupied
          </p>
        </div>

        {/* Step 1 — Select a bar */}
        <p className="text-xs font-semibold text-color-base/70 uppercase tracking-wide mb-3">
          Select bar
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 min-[1700px]:grid-cols-4 gap-3 mb-5">
          {bars.map((bar) => (
            <BeadCard
              key={bar.id}
              bead={bar}
              selected={selectedBar?.id === bar.id}
              onClick={() => setSelectedBar((prev) => (prev?.id === bar.id ? null : bar))}
              canEdit={canEdit}
              disabled={!beadFits(effectiveBeads, { product: bar }, radius)}
            />
          ))}
        </div>

        {/* Step 2 — Length slider */}
        {selectedBar && (
          <div className="mb-5 rounded-[2px] border border-default bg-light-grey/40 px-4 py-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-color-base/70 uppercase tracking-wide">Length</span>
              <span className="font-semibold text-color-base">{selectedLength} mm</span>
            </div>
            <input
              type="range"
              min={5}
              max={Math.max(5, Math.floor(availableMm))}
              step={0.5}
              value={selectedLength}
              onChange={(e) => setSelectedLength(Number(e.target.value))}
              className="w-full accent-navy"
            />
            <div className="flex justify-between text-[11px] text-stone/60">
              <span>5 mm</span>
              <span>{Math.floor(availableMm)} mm available</span>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-default/50 px-5 pt-4 pb-5 space-y-3">
        {error && <ErrorAlert message={error} />}
        {availableMm >= 1 ? (
          <>
            <p className="text-[12px] tracking-wider uppercase font-bold text-color-base/70 mb-1">
              {productToAdd ? productToAdd.name : "Select a bar"}
            </p>
            {canEdit && (
              <Button
                onClick={() => {
                  if (!productToAdd) return;
                  isReplaceMode ? onReplace(productToAdd) : onAdd(productToAdd);
                }}
                disabled={!canAdd}
                variant="secondary"
                className="flex w-full items-center justify-center gap-2"
              >
                ✦ {isReplaceMode ? "Replace bar" : "Add bar"}
              </Button>
            )}
          </>
        ) : (
          <BraceletFullNotice />
        )}
      </div>
    </div>
  );
}