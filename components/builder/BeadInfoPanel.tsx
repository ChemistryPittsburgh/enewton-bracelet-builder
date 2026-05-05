"use client";

/**
 * BeadInfoPanel.tsx
 *
 * Slides up from the bottom when a bead is tapped in the 3D scene.
 * Shows details about the selected bead and a button to remove it.
 * Dismiss by tapping the backdrop or the × button.
 */

import { X, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useRef } from 'react';

export function BeadInfoPanel() {
  const { selectedBead, clearSelectedBead, removeBead } = useStore((s) => ({
    selectedBead: s.selectedBead,
    clearSelectedBead: s.clearSelectedBead,
    removeBead: s.removeBead,
  }));
  const isOpen = selectedBead !== null;

    // Holds the last non-null bead so content stays rendered during the closing transition
    const lastBead = useRef(selectedBead);
    if (selectedBead !== null) lastBead.current = selectedBead;

    const bead = lastBead.current; // always non-null after first open

  return (
    <>
    {selectedBead && (
          <>
            {/* Backdrop — tap to dismiss */}
            <div
              className={`fixed inset-0 z-40 transition-opacity duration-200 ${
                isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
              onClick={clearSelectedBead}
              aria-hidden
            />

            {/* Panel */}
            <div  className={`fixed bottom-0 h-full w-[30vw] min-w-[250px] animate-slide-out z-50 bg-white shadow-xl ${
                isOpen ? "open" : ""
              }`}>

              {/* Header */}
              <div className="flex items-start justify-between px-5 pt-2 pb-4">
                <div>
                  <h2 className="text-base font-semibold text-neutral-800">
                    {selectedBead.product.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {(selectedBead.product.diameter * 1000).toFixed(1)} mm bead
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
              <div className="mx-5 mb-4 rounded-xl bg-neutral-50 p-4 space-y-2">
                <DetailRow label="Style" value={selectedBead.product.name} />
                <DetailRow label="Diameter" value={`${(selectedBead.product.diameter * 1000).toFixed(2)} mm`} />
                <DetailRow label="File" value={selectedBead.product.glbPath.split("/").pop() ?? ""} />
                {/* Add more fields here as the product type grows (price, material, etc.) */}
              </div>

              {/* Remove button */}
              <div className="px-5 pb-8">
                <button
                  onClick={() => removeBead(bead.instanceId)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={15} />
                  Remove from bracelet
                </button>
              </div>

            </div>
          </>
        )}
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
