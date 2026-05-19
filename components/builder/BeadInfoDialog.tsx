"use client";
import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { FloatingDialog } from "@/components/ui/FloatingDialog";
import { Button } from "@/components/ui/Button";
import { capitalize } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function BeadInfoDialog() {
  const { beads, selectedBead, clearSelectedBead, removeBead, selectAllActive, selectAllOfType, removeAllOfType } = useStore((s) => ({
    beads: s.beads,
    selectedBead: s.selectedBead,
    clearSelectedBead: s.clearSelectedBead,
    removeBead: s.removeBead,
    selectAllActive: s.selectAllActive,
    selectAllOfType: s.selectAllOfType,
    removeAllOfType: s.removeAllOfType,
  }));

  const isOpen = selectedBead !== null;

  // Keep last known bead so content stays rendered during close transition
  const lastBead = useRef(selectedBead);
  if (selectedBead !== null) lastBead.current = selectedBead;
  const bead = lastBead.current;

  const matchCount = bead
    ? beads.filter((b) => b.product.id === bead.product.id).length
    : 0;

  function handleRemove() {
    if (!bead) return;
    if (selectAllActive) {
      removeAllOfType();
    } else {
      removeBead(bead.instanceId);
      clearSelectedBead();
    }
  }

  return (
    <div
      className={cn(
        "absolute top-18 right-6 z-50 w-72 transition-all duration-300 ease-out",
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none"
      )}
    >
      <FloatingDialog
        title=""
        open={isOpen}
        onClose={clearSelectedBead}
      >
        {bead && (
          <>
            <div className="p-2 mb-2 space-y-2">
              <h3 className="mb-3">{bead.product.beadType ? capitalize(bead.product.name) : "Bead Name"}</h3>
              <DetailRow
                label="Bead Type"
                value={bead.product.beadType ? capitalize(bead.product.beadType) : "—"}
              />
              <DetailRow
                label="Category"
                value={bead.product.beadCategory ? capitalize(bead.product.beadCategory) : "—"}
              />
              <DetailRow
                label="Material"
                value={bead.product.material ? capitalize(bead.product.material) : "—"}
              />
              <DetailRow label="Diameter" value={`${bead.product.sizeMm} mm`} />
              <DetailRow
                label="File"
                value={bead.product.glbPath.split("/").pop() ?? ""}
              />
              <DetailRow label="On Bracelet" value={`${matchCount} bead${matchCount !== 1 ? "s" : ""}`} />
            </div>
            {matchCount > 1 && (
              <>
                {selectAllActive ? (
                  <p className="text-sm font-semibold text-neutral-700 mb-3 px-2">All {bead.product.name} {bead.product.beadCategory}s selected</p>
                ) : (
                  <Button onClick={() => selectAllOfType()} >
                  Select All ({matchCount})
                  </Button>
                )}
              </>
            )}
            <Button onClick={handleRemove} className="w-full" variant="danger">
              <Trash2 size={15} />
              {selectAllActive ? `Remove All (${matchCount})` : "Remove Bead"}
            </Button>
          </>
        )}
      </FloatingDialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-xs font-semibold text-neutral-700">{value}</span>
    </div>
  );
}