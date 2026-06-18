"use client";
import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { FloatingDialog } from "@/components/ui/FloatingDialog";
import { Button } from "@/components/ui/Button";
import { InfoRow } from "@/components/ui/InfoRow";
import { cn, capitalize, slugify, formatMm, unslugify } from "@/lib/utils";
import { SEED_BEAD_SIZE_LABELS } from "@/lib/constants";
import type { SeedSegmentConfig } from "@/types";

/** Readable size for a seed segment (Small/Large for seed, mm for round). */
function seedSizeLabel(cfg: SeedSegmentConfig, includeMM: boolean): string {
  if (cfg.seed_shape === "round") {
    const mm = cfg.round_size_mm ?? 2;
    return includeMM ? `${mm}mm` : `${mm}`;
  }
  // Prefer the stored nominal; fall back to the range midpoint for legacy configs.
  const size =
    cfg.seed_size_mm ?? Math.round((cfg.bead_size_range[0] + cfg.bead_size_range[1]) / 2);
  const label = SEED_BEAD_SIZE_LABELS[size];
  if (label) return includeMM ? `${label} (${size}mm)` : label;
  return includeMM ? `${size}mm` : `${size}`;
}

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

  // Seed segments carry a seedConfig (unique to them) — use it to tailor the
  // dialog rather than the shared bead fields, which don't apply (a segment has
  // a colorway, not one material; its "diameter" is really the segment length).
  const seedConfig = bead?.seedConfig;
  const isSeed = !!seedConfig;

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
        "absolute top-24 right-6 z-20 w-[340px] transition-all duration-300 ease-out",
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
            <div className="p-2 mb-2 space-y-2 lg:py-3 lg:px-0">
              <h3 className="mb-3 pr-3">
                {isSeed ? (
                  <>
                    {seedSizeLabel(seedConfig, false)} Seed Beads ({formatMm(seedConfig.arc_length_mm)} mm)
                  </>
                ) : (
                  <>
                    {bead.product.bead_type ? capitalize(bead.product.name) : "Bead Name"}
                  </>
                )}
              </h3>

              {isSeed && seedConfig ? (
                /* ── Seed segment ─────────────────────────────────────────── */
                <>
                  <InfoRow layout="horizontal"
                    label="Bead Type"
                    value={bead.product.bead_type ? capitalize(bead.product.bead_type) : "Seed"}
                  />
                  <InfoRow layout="horizontal" label="Category" value="Seed" />
                  <InfoRow layout="horizontal" label="Size" value={seedSizeLabel(seedConfig, true)} />

                  {/* Colorway swatches (single colour shows its label) */}
                  {seedConfig.colorway.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-color-base/70">Colorway</span>
                      <div className="flex items-center gap-1">
                        {seedConfig.colorway.map((c, i) => (
                          <span
                            key={i}
                            className="w-3.5 h-3.5 rounded-full border border-color-base/30"
                            style={{ backgroundColor: c.hex }}
                            title={`${c.label ?? ""} ${c.percent}%`.trim()}
                          />
                        ))}
                        {seedConfig.colorway.length === 1 && seedConfig.colorway[0].label && (
                          <span className="text-xs font-semibold ml-1">{seedConfig.colorway[0].label}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <InfoRow layout="horizontal" label="Length" value={`${formatMm(seedConfig.arc_length_mm)} mm`} />
                </>
              ) : (
                /* ── Standard bead / charm / spacer ───────────────────────── */
                <>
                  <InfoRow layout="horizontal"
                    label="Bead Type"
                    value={bead.product.bead_type ? capitalize(bead.product.bead_type) : "—"}
                  />
                  <InfoRow layout="horizontal"
                    label="Category"
                    value={bead.product.bead_category ? unslugify(bead.product.bead_category) : "—"}
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
                  <InfoRow layout="horizontal" label="Number on Bracelet" value={`${matchCount}`} />
                </>
              )}
            </div>
            {!isLocked && matchCount > 1 && (
              <>
                {selectAllActive ? (
                  <p className="text-sm font-semibold   mb-3 px-2">All {bead.product.name && unslugify(bead.product.name)} {unslugify(bead.product.bead_category ?? "bead")}s selected</p>
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
                  isSeed ? "Remove seed beads" :
                  `Delete ${unslugify(bead.product.bead_category ?? "bead")}`
                }
              </Button>
            )}
          </>
        )}
      </FloatingDialog>
    </div>
  );
}