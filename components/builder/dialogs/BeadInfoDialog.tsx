"use client";
import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { FloatingDialog } from "@/components/ui/FloatingDialog";
import { Button } from "@/components/ui/Button";
import { InfoRow } from "@/components/ui/InfoRow";
import { capitalize, slugify, formatMm } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function BeadInfoDialog({ isLocked }: { isLocked?: boolean }) {
  const { beads, selectedBead, clearSelectedBead, removeBead, selectAllActive, selectAllOfType, removeAllOfType, isEditMode} = useStore((s) => ({
    beads: s.beads,
    selectedBead: s.selectedBead,
    clearSelectedBead: s.clearSelectedBead,
    removeBead: s.removeBead,
    selectAllActive: s.selectAllActive,
    selectAllOfType: s.selectAllOfType,
    removeAllOfType: s.removeAllOfType,
    isEditMode: s.isEditMode,
  }));

  const isOpen = !isLocked && selectedBead !== null;

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
        "absolute top-24 right-6 z-50 w-[340px] transition-all duration-300 ease-out",
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none",
        isEditMode && 'top-[150px]'
      )}
    >
      <FloatingDialog
        title=""
        open={isOpen}
        onClose={clearSelectedBead}
        includeTitleBar={false}
      >
        {bead && (
          <>
            <div className="p-2 mb-2 space-y-2 lg:p-3">
              <h3 className="mb-3">{bead.product.bead_type ? capitalize(bead.product.name) : "Bead Name"}</h3>
              <InfoRow layout="horizontal"
                label="Bead Type"
                value={bead.product.bead_type ? capitalize(bead.product.bead_type) : "—"}
              />
              <InfoRow layout="horizontal"
                label="Category"
                value={bead.product.bead_category ? capitalize(bead.product.bead_category) : "—"}
              />
              {bead.product.bead_category && slugify(bead.product.bead_category) !== 'spacer' && (
                <InfoRow layout="horizontal"
                  label="Material"
                  value={bead.product.material ? capitalize(bead.product.material) : "—"}
                />
              )}
              <InfoRow layout="horizontal" label="Diameter" value={bead.product.size_mm != null
                ? `${bead.product.size_mm} mm`
                : `${formatMm(bead.product.diameter * 1000)} mm`} />
              <InfoRow layout="horizontal" label="On Bracelet" value={`${matchCount} bead${matchCount !== 1 ? "s" : ""}`} />
            </div>
            {!isLocked && matchCount > 1 && (
              <>
                {selectAllActive ? (
                  <p className="text-sm font-semibold   mb-3 px-2">All {bead.product.name} {bead.product.bead_category}s selected</p>
                ) : (
                  <Button onClick={() => selectAllOfType()} variant="ghost" className="w-full mb-2">
                  Select All ({matchCount})
                  </Button>
                )}
              </>
            )}
            {!isLocked && (
              <Button onClick={handleRemove} className="w-full" variant="danger">
                <Trash2 size={15} />
                {selectAllActive ? `Remove All (${matchCount})` :
                  bead.product.bead_category ? `Remove ${capitalize(bead.product.bead_category)}` : "Remove Bead"
                }
              </Button>
            )}
          </>
        )}
      </FloatingDialog>
    </div>
  );
}
