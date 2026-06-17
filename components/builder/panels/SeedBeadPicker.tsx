"use client";

import { useState, useMemo } from "react";
import { X, Square, Shuffle, Settings, Circle } from "lucide-react";
import { useStore } from "@/lib/store";
import type { SeedColorEntry } from "@/types";

import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { AvailableSpaceBox } from "@/components/ui/AvailableSpaceBox";
import { SectionHeading } from "@/components/ui/SectionHeading";

import { usePermissions } from "@/hooks/usePermissions";
import { useSeedColors } from "@/hooks/useSeedColors";
import { useSeedPresets } from "@/hooks/useSeedPresets";
import { braceletArc, usedArc } from "@/lib/bead-layout";
import {
  BRACELET_SIZE_RADIUS,
  SEED_BEAD_SIZE_RANGE,
  ROUND_SEED_SIZES_MM,
} from "@/lib/constants";
import { newRandomSeed, generateSeedBeads } from "@/lib/seed-bead-utils";

/** Gold/silver options for round seed beads. */
const ROUND_COLOR_OPTIONS: { value: string; label: string; hex: string }[] = [
  { value: "gold",   label: "Gold",   hex: "#D4AF37" },
  { value: "silver", label: "Silver", hex: "#C0C0C0" },
];

interface SeedBeadPickerProps {
  onAdd: (
    arcMm: number,
    colorway: SeedColorEntry[],
    randomSeed: number,
    seedShape?: "seed" | "round",
    roundSizeMm?: number,
    material?: string,
  ) => void;
  error: string | null;
}

export function SeedBeadPicker({ onAdd, error }: SeedBeadPickerProps) {
  const { placedBeads, braceletSize } = useStore((s) => ({
    placedBeads:  s.beads,
    braceletSize: s.braceletSize,
  }));
  const { canEdit } = usePermissions();
  const { isAdmin } = usePermissions();

  const { data: apiColors = [] } = useSeedColors();
  const { data: apiPresets = [] } = useSeedPresets();

  // Default colorway: first preset if available, otherwise a single gold entry
  const defaultColorway = useMemo<SeedColorEntry[]>(() => {
    if (apiPresets.length > 0) {
      return apiPresets[0].colors.map((c) => ({
        hex: c.hex,
        percent: c.percent,
        label: c.label,
        is_metallic: c.is_metallic,
      }));
    }
    return [{ hex: "#D4AF37", percent: 100, label: "Gold", is_metallic: true }];
  }, [apiPresets]);

  const [colorway, setColorway] = useState<SeedColorEntry[]>([]);
  const [fillMode, setFillMode] = useState<"remaining" | "custom">("remaining");
  const [customMm, setCustomMm] = useState("");
  const [customMode, setCustomMode] = useState<"mm" | "quantity">("mm");
  const [customQuantity, setCustomQuantity] = useState("");
  const [seed, setSeed] = useState(() => newRandomSeed());
  const [seedShape, setSeedShape] = useState<"seed" | "round">("seed");
  const [roundSizeMm, setRoundSizeMm] = useState<number>(2);
  const [roundColor, setRoundColor] = useState<string>("gold");

  const isRound = seedShape === "round";

  /** Seed bead thickness ratio (disc-shaped, flat faces flush). */
  const SEED_THICKNESS_RATIO = 0.72;
  /** Max quantity of beads in quantity mode. */
  const MAX_QUANTITY = 30;

  /** Estimate the arc length in mm needed for a given number of beads. */
  function arcFromQuantity(qty: number): number {
    if (isRound) {
      return qty * roundSizeMm;
    }
    const avgDiameter = (SEED_BEAD_SIZE_RANGE[0] + SEED_BEAD_SIZE_RANGE[1]) / 2;
    return qty * avgDiameter * SEED_THICKNESS_RATIO;
  }

  // Initialise colorway from API default once presets load
  const [initialised, setInitialised] = useState(false);
  if (!initialised && defaultColorway.length > 0) {
    setColorway(defaultColorway);
    setInitialised(true);
  }

  const radius       = BRACELET_SIZE_RADIUS[braceletSize];
  const totalArc     = braceletArc(radius);
  const used         = usedArc(placedBeads);
  const availableMm  = Math.max(0, Math.round((totalArc - used) * 1000 * 10) / 10);

  const parsedQuantity = parseInt(customQuantity) || 0;
  const tooMany = parsedQuantity > MAX_QUANTITY;

  const arcMm = fillMode === "remaining"
    ? availableMm
    : customMode === "quantity"
      ? arcFromQuantity(Math.min(parsedQuantity, MAX_QUANTITY))
      : parseFloat(customMm) || 0;
  const validArc = arcMm > 0 && arcMm <= availableMm && !tooMany;

  // Preview: generate a small sample of the color distribution
  const previewBeads = useMemo(() => {
    if (colorway.length === 0) return [];
    return generateSeedBeads({
      colorway,
      arc_length_mm: Math.min(arcMm || 20, 50),
      bead_size_range: SEED_BEAD_SIZE_RANGE,
      random_seed: seed,
    });
  }, [colorway, arcMm, seed]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handlePresetClick(preset: typeof apiPresets[number]) {
    setColorway(preset.colors.map((c) => ({
      hex: c.hex,
      percent: c.percent,
      label: c.label,
      is_metallic: c.is_metallic,
    })));
    setSeed(newRandomSeed());
  }

  function handleAddColor(hex: string, label: string, is_metallic: boolean) {
    if (colorway.length >= 6) return;
    if (colorway.some((c) => c.hex === hex)) return;

    const newCount = colorway.length + 1;
    const evenPercent = Math.floor(100 / newCount);
    const remainder = 100 - evenPercent * newCount;
    const updated = colorway.map((c, i) => ({
      ...c,
      percent: evenPercent + (i === 0 ? remainder : 0),
    }));
    updated.push({ hex, percent: evenPercent, label, is_metallic });
    setColorway(updated);
    setSeed(newRandomSeed());
  }

  function handleRemoveColor(index: number) {
    if (colorway.length <= 1) return;
    const updated = colorway.filter((_, i) => i !== index);
    const evenPercent = Math.floor(100 / updated.length);
    const remainder = 100 - evenPercent * updated.length;
    const rebalanced = updated.map((c, i) => ({
      ...c,
      percent: evenPercent + (i === 0 ? remainder : 0),
    }));
    setColorway(rebalanced);
    setSeed(newRandomSeed());
  }

  function handlePercentChange(index: number, value: number) {
    const clamped = Math.max(5, Math.min(95, value));
    const updated = [...colorway];
    updated[index] = { ...updated[index], percent: clamped };

    const othersTotal = updated.reduce((sum, c, i) => (i === index ? sum : sum + c.percent), 0);
    if (othersTotal > 0) {
      const target = 100 - clamped;
      for (let i = 0; i < updated.length; i++) {
        if (i === index) continue;
        updated[i] = {
          ...updated[i],
          percent: Math.round((updated[i].percent / othersTotal) * target),
        };
      }
      const total = updated.reduce((s, c) => s + c.percent, 0);
      if (total !== 100) {
        const diff = 100 - total;
        const fixIdx = updated.findIndex((_, i) => i !== index);
        if (fixIdx >= 0) updated[fixIdx].percent += diff;
      }
    }
    setColorway(updated);
  }

  function handleAdd() {
    if (!validArc) return;
    if (isRound) {
      const opt = ROUND_COLOR_OPTIONS.find((o) => o.value === roundColor) ?? ROUND_COLOR_OPTIONS[0];
      const roundColorway: SeedColorEntry[] = [
        { hex: opt.hex, percent: 100, label: opt.label, is_metallic: true },
      ];
      onAdd(arcMm, roundColorway, seed, "round", roundSizeMm, roundColor);
    } else {
      onAdd(arcMm, colorway, seed, "seed", undefined, undefined);
    }
    setSeed(newRandomSeed());
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-5 pb-4">

        <AvailableSpaceBox />

        {/* Shape picker — always visible at the top */}
        <SectionHeading>Shape</SectionHeading>
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setSeedShape("seed")}
            className={`flex-1 flex flex-col items-center gap-1.5 rounded-[2px] border py-3 text-sm transition-all ${
              seedShape === "seed"
                ? "ring-2 ring-navy border-navy bg-white shadow-sm font-medium"
                : "border-default bg-white hover:border-neutral-400"
            }`}
          >
            <Square size={16} className="text-color-base/60" />
            Seed
          </button>
          <button
            onClick={() => setSeedShape("round")}
            className={`flex-1 flex flex-col items-center gap-1.5 rounded-[2px] border py-3 text-sm transition-all ${
              seedShape === "round"
                ? "ring-2 ring-navy border-navy bg-white shadow-sm font-medium"
                : "border-default bg-white hover:border-neutral-400"
            }`}
          >
            <Circle size={16} className="text-color-base/60" />
            Round
          </button>
        </div>

        {/* ── Round mode: color + size ─────────────────────────────────────── */}
        {isRound && (
          <>
            <SectionHeading>Color</SectionHeading>
            <div className="flex gap-2 mb-5">
              {ROUND_COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRoundColor(opt.value)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-[2px] border py-3 text-sm transition-all ${
                    roundColor === opt.value
                      ? "ring-2 ring-navy border-navy bg-white shadow-sm font-medium"
                      : "border-default bg-white hover:border-neutral-400"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/10"
                    style={{ backgroundColor: opt.hex }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>

            <SectionHeading>Size</SectionHeading>
            <div className="flex gap-2 mb-5">
              {ROUND_SEED_SIZES_MM.map((size) => (
                <button
                  key={size}
                  onClick={() => setRoundSizeMm(size)}
                  className={`flex-1 rounded-[2px] border py-3 text-sm transition-all ${
                    roundSizeMm === size
                      ? "ring-2 ring-navy border-navy bg-white shadow-sm font-medium"
                      : "border-default bg-white hover:border-neutral-400"
                  }`}
                >
                  {size}mm
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Seed mode: colorway presets + editor + preview ───────────────── */}
        {!isRound && (
          <>
            {/* Preset colorways */}
            <div className="flex items-center gap-2 mb-2.5">
              <SectionHeading className="mb-0 flex-1">Colorway presets</SectionHeading>
              {isAdmin && (
                <button className="manage-btn">
                  <Settings size={12} /> Manage
                </button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap mb-5">
              {apiPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className="flex items-center gap-1.5 rounded-[2px] border border-default bg-white px-2.5 py-1.5 text-xs hover:border-neutral-400 transition-all"
                >
                  <span className="flex gap-0.5">
                    {preset.colors.map((c, i) => (
                      <span
                        key={i}
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </span>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>

            {/* Active colorway editor */}
            <SectionHeading>Colorway</SectionHeading>

            <div className="space-y-2 mb-4">
              {colorway.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: entry.hex }}
                  />
                  <span className="flex-1 text-xs truncate">{entry.label ?? entry.hex}</span>
                  <input
                    type="range"
                    min={5}
                    max={95}
                    value={entry.percent}
                    onChange={(e) => handlePercentChange(i, parseInt(e.target.value))}
                    className="w-20 accent-navy"
                  />
                  <span className="text-xs w-8 text-right text-color-base/70">{entry.percent}%</span>
                  {colorway.length > 1 && (
                    <button
                      onClick={() => handleRemoveColor(i)}
                      className="p-0.5 rounded-[2px] text-color-base/40 hover:text-error transition-colors"
                      aria-label="Remove color"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add color swatches */}
            {colorway.length < 6 && (
              <>
                <SectionHeading>Add color</SectionHeading>
                <div className="flex gap-1.5 flex-wrap mb-5">
                  {apiColors.filter(
                    (opt) => !colorway.some((c) => c.hex === opt.hex)
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleAddColor(opt.hex, opt.label, opt.is_metallic)}
                      className="w-6 h-6 rounded-full border border-black/10 hover:ring-2 hover:ring-navy/40 transition-all"
                      style={{ backgroundColor: opt.hex }}
                      title={opt.label}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Preview strip */}
            {previewBeads.length > 0 && (
              <>
                <SectionHeading>Preview</SectionHeading>
                <div className="flex items-center overflow-hidden rounded-full border border-default h-5 mb-2 bg-light-grey/50">
                  {(() => {
                    const totalD = previewBeads.reduce((s, pb) => s + pb.diameter, 0);
                    return previewBeads.map((pb, i) => (
                      <div
                        key={i}
                        className="h-full border-r border-black/5 last:border-r-0"
                        style={{
                          backgroundColor: pb.color,
                          width: `${(pb.diameter / totalD) * 100}%`,
                        }}
                      />
                    ));
                  })()}
                </div>
                <button
                  onClick={() => setSeed(newRandomSeed())}
                  className="flex items-center gap-1.5 text-xs text-color-base/60 hover:text-navy transition-colors mb-4"
                >
                  <Shuffle size={12} />
                  Shuffle pattern
                </button>
              </>
            )}
          </>
        )}

        {/* Fill mode — shared by both shapes */}
        <SectionHeading>Fill amount</SectionHeading>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setFillMode("remaining")}
            className={`flex-1 rounded-[2px] border py-2 text-sm transition-all ${
              fillMode === "remaining"
                ? "ring-2 ring-navy border-navy bg-white shadow-sm font-medium"
                : "border-default bg-white hover:border-neutral-400"
            }`}
          >
            Fill remaining
          </button>
          <button
            onClick={() => setFillMode("custom")}
            className={`flex-1 rounded-[2px] border py-2 text-sm transition-all ${
              fillMode === "custom"
                ? "ring-2 ring-navy border-navy bg-white shadow-sm font-medium"
                : "border-default bg-white hover:border-neutral-400"
            }`}
          >
            Custom
          </button>
        </div>

        {fillMode === "custom" && (
          <>
            {/* mm vs quantity sub-toggle */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setCustomMode("mm")}
                className={`flex-1 rounded-[2px] border py-1.5 text-xs transition-all ${
                  customMode === "mm"
                    ? "ring-1 ring-navy border-navy bg-white font-medium"
                    : "border-default bg-white hover:border-neutral-400"
                }`}
              >
                By size (mm)
              </button>
              <button
                onClick={() => setCustomMode("quantity")}
                className={`flex-1 rounded-[2px] border py-1.5 text-xs transition-all ${
                  customMode === "quantity"
                    ? "ring-1 ring-navy border-navy bg-white font-medium"
                    : "border-default bg-white hover:border-neutral-400"
                }`}
              >
                By quantity
              </button>
            </div>

            {customMode === "mm" ? (
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  min={2}
                  max={availableMm}
                  step={1}
                  value={customMm}
                  onChange={(e) => setCustomMm(e.target.value)}
                  placeholder={`2 – ${availableMm}`}
                  className="w-full rounded-[2px] border border-default px-3 py-2.5 text-sm outline-none placeholder:text-color-base/70 focus:border-navy focus:ring-navy"
                />
                <span className="shrink-0 text-sm text-color-base/70">mm</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  min={1}
                  max={MAX_QUANTITY}
                  step={1}
                  value={customQuantity}
                  onChange={(e) => setCustomQuantity(e.target.value)}
                  placeholder={`1 – ${MAX_QUANTITY}`}
                  className={`w-full rounded-[2px] border px-3 py-2.5 text-sm outline-none placeholder:text-color-base/70 ${
                    tooMany || (parsedQuantity > 0 && arcFromQuantity(parsedQuantity) > availableMm)
                      ? "border-error focus:border-error"
                      : "border-default focus:border-navy focus:ring-navy"
                  }`}
                />
                <span className="shrink-0 text-sm text-color-base/70">beads</span>
              </div>
            )}

            {/* Validation messages for quantity mode */}
            {customMode === "quantity" && tooMany && (
              <p className="text-xs text-error -mt-1 mb-3">
                Maximum is {MAX_QUANTITY} beads.
              </p>
            )}

            {/* Show estimated arc when in quantity mode */}
            {customMode === "quantity" && parsedQuantity > 0 && !tooMany && (
              <p className="text-xs text-color-base/50 -mt-1 mb-3">
                ≈ {Math.round(arcFromQuantity(parsedQuantity) * 10) / 10}mm
                {arcFromQuantity(parsedQuantity) > availableMm && (
                  <span className="text-error ml-1">
                    (exceeds {availableMm}mm available)
                  </span>
                )}
              </p>
            )}
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-default/50 px-5 pt-4 pb-5 space-y-3">
        {error && <ErrorAlert message={error} />}

        {availableMm >= 2 ? (
          <>
            {!tooMany && (
              <SectionHeading>
                {arcMm > 0
                  ? isRound
                    ? fillMode === "custom" && customMode === "quantity"
                      ? `${parsedQuantity}× round ${roundSizeMm}mm ${roundColor} beads`
                      : `${arcMm}mm round ${roundSizeMm}mm ${roundColor} beads`
                    : fillMode === "custom" && customMode === "quantity"
                      ? `${parsedQuantity}× seed beads (≈${Math.round(arcMm * 10) / 10}mm)`
                      : `${arcMm}mm seed beads`
                  : isRound ? "Select color & size" : "Configure colorway"}
              </SectionHeading>
            )}
            {canEdit && (
              <Button
                onClick={handleAdd}
                disabled={!validArc || (!isRound && colorway.length === 0)}
                className="flex w-full items-center justify-center gap-2 group"
              >
                {isRound ? (
                  <Circle size={14} className="-mt-[1px] stroke-white group-hover:stroke-navy transition-colors" />
                ) : (
                  <Square size={16} className="-mt-[2.5px] stroke-white group-hover:stroke-navy transition-colors" />
                )}
                {isRound ? "Add round beads" : "Add seed beads"}
              </Button>
            )}
          </>
        ) : (
          <div className="rounded-[2px] border border-error/20 bg-error/5 px-4 py-3 text-center">
            <SectionHeading className="text-error mb-1">Bracelet is full</SectionHeading>
            <p className="text-xs text-color-base/80 mt-0">Remove beads to free up space.</p>
          </div>
        )}
      </div>
    </div>
  );
}