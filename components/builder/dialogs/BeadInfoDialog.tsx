"use client";
import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { FloatingDialog } from "@/components/ui/FloatingDialog";
import { Button } from "@/components/ui/Button";
import { InfoRow } from "@/components/ui/InfoRow";
import { cn, capitalize, slugify, formatMm, unslugify } from "@/lib/utils";
import { seedSizeLabel, seedKindLabel, beadMatchKey } from "@/lib/seed-bead-utils";

export function BeadInfoDialog({ isLocked, beadSelectorOpen }: { isLocked?: boolean; beadSelectorOpen?: boolean }) {
  const { beads, selectedBead, clearSelectedBead, removeBead, selectAllActive, selectAllOfType, removeAllOfType, isEditMode, startReplaceMode, startReplaceAllMode, startReplaceSeedMode, startReplaceSeedSegment } = useStore((s) => ({
    beads: s.beads,
    selectedBead: s.selectedBead,
    clearSelectedBead: s.clearSelectedBead,
    removeBead: s.removeBead,
    selectAllActive: s.selectAllActive,
    selectAllOfType: s.selectAllOfType,
    removeAllOfType: s.removeAllOfType,
    isEditMode: s.isEditMode,
    startReplaceMode: s.startReplaceMode,
    startReplaceAllMode: s.startReplaceAllMode,
    startReplaceSeedMode: s.startReplaceSeedMode,
    startReplaceSeedSegment: s.startReplaceSeedSegment,
  }));
  const isOpen = !isLocked && selectedBead !== null;
  // Keep last known bead so content stays rendered during close transition
  const lastBead = useRef(selectedBead);
  if (selectedBead !== null) lastBead.current = selectedBead;
  const bead = lastBead.current;
  const matchCount = bead
    ? beads.filter((b) => b.product.id === bead.product.id).length
    : 0;
  // Seeds match by (size, shape) across all colours, not by product id —
  // so "select all of this kind" counts segments sharing the seed match key.
  const seedMatchCount = bead?.seedConfig
    ? beads.filter((b) => b.seedConfig && beadMatchKey(b) === beadMatchKey(bead)).length
    : 0;

  // Seed segments carry a seedConfig (unique to them) — use it to tailor the
  // dialog rather than the shared bead fields, which don't apply (a segment has
  // a colorway, not one material; its "diameter" is really the segment length).
  const seedConfig = bead?.seedConfig;
  const isSeed = !!seedConfig;

  function handleRemove() {
    if (!bead) return;
    if (selectAllActive && !isSeed) {
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
            {/* Select-all-of-type (non-seed): toggles selection by product id */}
            {!isLocked && !isSeed && matchCount > 1 && (
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
            {/* Select-all-of-kind (seed): selection only — keeps the info window
                open and does NOT open the picker, mirroring the bead Select All.
                Matches by seed key (size + shape), not product id. */}
            {!isLocked && isSeed && seedConfig && seedMatchCount > 1 && (
              <>
                {selectAllActive ? (
                  <p className="text-sm font-semibold mb-3 px-2">All {seedKindLabel(seedConfig)} Seed Beads selected</p>
                ) : (
                  <Button onClick={() => selectAllOfType()} variant="ghost" className="w-full mb-2 !h-auto py-2.5 !text-[11.5px]">
                    Select All {seedKindLabel(seedConfig)} Seed Beads ({seedMatchCount})
                  </Button>
                )}
              </>
            )}
            {/* Replace — single segment when nothing is select-all-ed; whole kind
                (opens the seed picker) once Select All is active. */}
            {!isLocked && isSeed && !selectAllActive && !beadSelectorOpen && (
              <Button onClick={() => startReplaceSeedSegment(bead.instanceId)} className="w-full" variant="secondary">
                Replace Seed Beads
              </Button>
            )}
            {!isLocked && isSeed && seedConfig && selectAllActive && !beadSelectorOpen && (
              <Button onClick={() => startReplaceSeedMode(beadMatchKey(bead))} className="w-full" variant="secondary">
                Replace All {seedKindLabel(seedConfig)} Seed Beads ({seedMatchCount})
              </Button>
            )}
            {!isLocked && !isSeed && !selectAllActive && !beadSelectorOpen && (
              <Button onClick={() => startReplaceMode(bead.instanceId)} className="w-full" variant="secondary">
                {bead.product.bead_category === "bar" ? "Replace Bar" : "Replace Bead"}
              </Button>
            )}
            {!isLocked && !isSeed && selectAllActive && !beadSelectorOpen && (
              <Button onClick={() => startReplaceAllMode(bead.product.id)} className="w-full" variant="secondary">
                Replace All ({matchCount})
              </Button>
            )}
            {!isLocked && (
              <Button onClick={handleRemove} className="w-full mt-2" variant="danger">
                <Trash2 size={15} />
                {selectAllActive && !isSeed ? `Remove All (${matchCount})` :
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