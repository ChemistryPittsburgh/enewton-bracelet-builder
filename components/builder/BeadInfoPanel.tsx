"use client";

import { useRef } from "react";
import { X, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { capitalize } from "@/lib/utils";

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

      {/* Panel */}
      <Panel open={isOpen} onClose={clearSelectedBead} title="Bead Details" direction="right">
        <div className="px-5 py-4">
          {bead && (
            <>


              {/* Bead details */}
              <div className="mt-4 mb-4 rounded-xl bg-neutral-50 p-4 space-y-2">
                <DetailRow label="Bead Type" value={capitalize(bead.product.beadType) ?? "—"} />
                <DetailRow label="Bead Category" value={bead.product.beadCategory ?? "—"} />
                <DetailRow label="Bead Material" value={bead.product.beadMaterial ?? "—"} />
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
                <Button
                  onClick={handleRemove}
                  className="w-full"
                  variant="danger"
                >
                  <Trash2 size={15} />
                  Remove Bead
                </Button>
            </>
          )}
        </div>
      </Panel>
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