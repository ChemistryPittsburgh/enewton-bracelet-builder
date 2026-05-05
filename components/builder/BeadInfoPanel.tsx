"use client";

import { useRef } from "react";
import { X, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";

export function BeadInfoPanel() {
  const { selectedBead, clearSelectedBead, removeBead } = useStore((s) => ({
    selectedBead: s.selectedBead,
    clearSelectedBead: s.clearSelectedBead,
    removeBead: s.removeBead,
  }));

  const isOpen = selectedBead !== null;

  // Keeps the last known bead in memory so content stays
  // rendered during the closing transition instead of going blank
  const lastBead = useRef(selectedBead);
  if (selectedBead !== null) lastBead.current = selectedBead;
  const bead = lastBead.current;

  function handleRemove() {
    if (bead) removeBead(bead.instanceId);
  }

  return (
    <>
      {/* Backdrop - canvas should appear above */}
      <div
        className={`fixed inset-0 transition-opacity duration-300 bg-black/20 ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={clearSelectedBead}
        aria-hidden
      />

      {/* Panel — always in DOM, slides in/out */}
      <div
        className={`fixed bottom-0 right-0 h-full w-[30vw] min-w-[250px] z-50 bg-white shadow-xl transition-all duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {bead && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-semibold text-neutral-800">
                  {bead.product.name}
                </h2>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {((bead.product.diameter ?? 0) * 1000).toFixed(1)} mm bead
                </p>
              </div>
              <button
                onClick={clearSelectedBead}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Bead details */}
            <div className="mx-5 mt-4 mb-4 rounded-xl bg-neutral-50 p-4 space-y-2">
              <DetailRow label="Style" value={bead.product.name} />
              <DetailRow
                label="Diameter"
                value={`${((bead.product.diameter ?? 0) * 1000).toFixed(2)} mm`}
              />
              <DetailRow
                label="File"
                value={bead.product.glbPath.split("/").pop() ?? ""}
              />
            </div>

            {/* Remove button */}
            <div className="px-5">
              <button
                onClick={handleRemove}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={15} />
                Remove from bracelet
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-xs font-medium text-neutral-700">{value}</span>
    </div>
  );
}