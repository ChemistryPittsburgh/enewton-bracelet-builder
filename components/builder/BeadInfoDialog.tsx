"use client";
import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { FloatingDialog } from "@/components/ui/FloatingDialog";
import { Button } from "@/components/ui/Button";
import { capitalize } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function BeadInfoDialog() {
  const { selectedBead, clearSelectedBead, removeBead } = useStore((s) => ({
    selectedBead: s.selectedBead,
    clearSelectedBead: s.clearSelectedBead,
    removeBead: s.removeBead,
  }));

  const isOpen = selectedBead !== null;

  // Keep last known bead so content stays rendered during close transition
  const lastBead = useRef(selectedBead);
  if (selectedBead !== null) lastBead.current = selectedBead;
  const bead = lastBead.current;

  function handleRemove() {
    if (bead) {
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
        title="Bead Details"
        open={isOpen}
        onClose={clearSelectedBead}
      >
        {bead && (
          <>
            <div className="mb-4 rounded-xl bg-neutral-50 p-4 space-y-2">
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
            </div>
            <Button onClick={handleRemove} className="w-full" variant="danger">
              <Trash2 size={15} />
              Remove Bead
            </Button>
          </>
        )}
      </FloatingDialog>
    </div>
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