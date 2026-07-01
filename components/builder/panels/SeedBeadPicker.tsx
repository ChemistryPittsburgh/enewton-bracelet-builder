"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Square, Shuffle, Settings, Circle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import type { SeedColorEntry } from "@/types";

import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { AvailableSpaceBox } from "@/components/ui/AvailableSpaceBox";
import { BraceletFullNotice } from "@/components/ui/BraceletFullNotice";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GapFillNotice } from "@/components/ui/GapFillNotice";
import { Tooltip } from "@/components/ui/Tooltip";

import { usePermissions } from "@/hooks/usePermissions";
import { useSeedColors } from "@/hooks/useSeedColors";
import { useSeedPresets } from "@/hooks/useSeedPresets";
import { maxSeedArcMm, evenFillGapMm } from "@/lib/bead-layout";
import {
  BRACELET_SIZE_RADIUS,
  SEED_BEAD_THICKNESS_RATIO,
  SEED_BEAD_SIZES_MM,
  SEED_BEAD_SIZE_LABELS,
  seedBeadSizeRange,
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
    seedSizeMm?: number,
  ) => void;
  /** Distribute seeds evenly into the gaps between the already-placed beads. */
  onFillGapsEvenly?: (
    colorway: SeedColorEntry[],
    seedShape: "seed" | "round",
    roundSizeMm?: number,
    material?: string,
    seedSizeMm?: number,
  ) => void;
  error: string | null;
  onManageColors: () => void;
  maxArcMm?: number;
  isReplaceMode?: boolean;
  /** Replace mode: hide Fill Amount (each replaced segment keeps its own length). */
  replaceMode?: boolean;
  /** Gap-fill: a specific gap is selected as the insert target. Replaces the Fill
   *  Amount controls with a notice; the segment fills the selected gap. */
  isGapFill?: boolean;
}

export function SeedBeadPicker({ onAdd, onFillGapsEvenly, error, onManageColors, maxArcMm, isReplaceMode, replaceMode = false, isGapFill = false }: SeedBeadPickerProps) {
  const { placedBeads, braceletSize } = useStore(useShallow((s) => ({
    placedBeads:  s.beads,
    braceletSize: s.braceletSize,
  })));
  const { canEdit, isAdmin } = usePermissions();

  const { data: apiColors = [] } = useSeedColors();
  const { data: apiPresets = [] } = useSeedPresets();

  // Presets shown in the picker, sorted alphabetically by name.
  const sortedPresets = useMemo(
    () => [...apiPresets].sort((a, b) => a.name.localeCompare(b.name)),
    [apiPresets],
  );

  const [colorway, setColorway] = useState<SeedColorEntry[]>([]);
  const [fillMode, setFillMode] = useState<"remaining" | "size" | "quantity" | "evenly">("remaining");
  const [customMm, setCustomMm] = useState("");
  const [customQuantity, setCustomQuantity] = useState("");

  // Filling a specific gap: the gap defines the length, so the segment always
  // fills the gap (Fill remaining against the gap's available arc). The Fill
  // Amount controls are hidden while a gap is selected (see notice below).
  useEffect(() => {
    if (isGapFill) setFillMode("remaining");
  }, [isGapFill]);
  const [seed, setSeed] = useState(() => newRandomSeed());
  const [seedShape, setSeedShape] = useState<"seed" | "round">("seed");
  const [seedSizeMm, setSeedSizeMm] = useState<number>(1);
  const [roundSizeMm, setRoundSizeMm] = useState<number>(2);
  const [roundColor, setRoundColor] = useState<string>("gold");
  const [activePresetId, setActivePresetId] = useState<number | null>(null);

  const isRound = seedShape === "round";

  // Gates the lower half of the picker. Round beads always carry a color
  // (gold/silver default); seed beads need at least one colorway entry.
  const hasColors = isRound || colorway.length > 0;

  const seedPickerSectionClass = "border-b border-default";
  const fillModeButtonClass = "flex w-full items-center gap-2.5 rounded-[2px] border px-3 py-2.5 text-sm text-left transition-all mb-1.5 min-h-[50px] bg-light-grey/50";
  const fillModeInputClass = "flex-1 min-w-0 rounded-[2px] max-w-[65%] border px-2 py-1 text-sm outline-none bg-white focus:ring-light-grey";

  /** Max quantity of beads in quantity mode. */
  const MAX_QUANTITY = 30;

  /** Estimate the arc length in mm needed for a given number of beads. */
  function arcFromQuantity(qty: number): number {
    if (isRound) {
      return qty * roundSizeMm;
    }
    const [minMm, maxMm] = seedBeadSizeRange(seedSizeMm);
    const avgDiameter = (minMm + maxMm) / 2;
    return qty * avgDiameter * SEED_BEAD_THICKNESS_RATIO;
  }

  const radius               = BRACELET_SIZE_RADIUS[braceletSize];
  // Gap-aware: the most seed arc that actually fits when appended (accounts for
  // the spacing gap inserted before the segment) — floored so we never offer a
  // value that beadFits would then reject. See maxSeedArcMm.
  const availableMm          = Math.floor(maxSeedArcMm(placedBeads, radius) * 10) / 10;
  const effectiveAvailableMm = maxArcMm ?? availableMm;

  // Smallest arc that can hold at least one bead of the currently selected type/size.
  const minUsefulArcMm = isRound
    ? roundSizeMm
    : seedBeadSizeRange(seedSizeMm)[0] * SEED_BEAD_THICKNESS_RATIO;

  const parsedQuantity = parseInt(customQuantity) || 0;
  const tooMany = fillMode === "quantity" && parsedQuantity > MAX_QUANTITY;

  const arcMm = (isGapFill || fillMode === "remaining")
    ? effectiveAvailableMm
    : fillMode === "quantity"
      ? arcFromQuantity(Math.min(parsedQuantity, MAX_QUANTITY))
      : parseFloat(customMm) || 0;
  const validArc = arcMm >= minUsefulArcMm && arcMm <= effectiveAvailableMm && !tooMany;

  // Fill-gaps-evenly: distribute seeds into the gaps between already-placed beads.
  // Shares its formula with the store's fillGapsWithSeeds (evenFillGapMm) so this
  // preview can never diverge from what the button actually does.
  const evenGapMm = evenFillGapMm(placedBeads, radius);
  const canFillGaps = !replaceMode && placedBeads.length > 0 && evenGapMm >= minUsefulArcMm;
  const perFillBeadMm = arcFromQuantity(1);
  const evenApproxBeads = canFillGaps && perFillBeadMm > 0 ? Math.max(1, Math.round(evenGapMm / perFillBeadMm)) : 0;

  // Preview: generate a small sample of the color distribution
  const previewBeads = useMemo(() => {
    if (colorway.length === 0) return [];
    return generateSeedBeads({
      colorway,
      arc_length_mm: Math.min(arcMm || 20, 50),
      bead_size_range: seedBeadSizeRange(seedSizeMm),
      seed_size_mm: seedSizeMm,
      random_seed: seed,
    });
  }, [colorway, arcMm, seed, seedSizeMm]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handlePresetClick(preset: typeof apiPresets[number]) {
    setColorway(preset.colors.map((c) => ({
      hex: c.hex,
      percent: c.percent,
      label: c.label,
      is_metallic: c.is_metallic,
    })));
    setActivePresetId(preset.id);
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
    setActivePresetId(null);
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
    setActivePresetId(null);
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
    setActivePresetId(null);
  }

  function handleAdd() {
    if (fillMode === "evenly") {
      if (!canFillGaps) return;
      if (isRound) {
        const opt = ROUND_COLOR_OPTIONS.find((o) => o.value === roundColor) ?? ROUND_COLOR_OPTIONS[0];
        onFillGapsEvenly?.([{ hex: opt.hex, percent: 100, label: opt.label, is_metallic: true }], "round", roundSizeMm, roundColor);
      } else {
        onFillGapsEvenly?.(colorway, "seed", undefined, undefined, seedSizeMm);
      }
      setSeed(newRandomSeed());
      return;
    }
    if (!replaceMode && !validArc) return;
    if (isRound) {
      const opt = ROUND_COLOR_OPTIONS.find((o) => o.value === roundColor) ?? ROUND_COLOR_OPTIONS[0];
      const roundColorway: SeedColorEntry[] = [
        { hex: opt.hex, percent: 100, label: opt.label, is_metallic: true },
      ];
      onAdd(arcMm, roundColorway, seed, "round", roundSizeMm, roundColor);
    } else {
      onAdd(arcMm, colorway, seed, "seed", undefined, undefined, seedSizeMm);
    }
    setSeed(newRandomSeed());
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col h-full min-h-0`}>
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 flex flex-col gap-4 pt-4">

        {!replaceMode && <AvailableSpaceBox className="!mb-0" />}

        <div className={seedPickerSectionClass}>
          {/* Shape picker — always visible at the top */}
          <SectionHeading>Shape</SectionHeading>
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setSeedShape("seed")}
              className={`flex-1 flex flex-col items-center gap-1.5 border py-3 text-sm transition-all hover:bg-mint ${
                seedShape === "seed"
                  ? "border-navy bg-white shadow-sm font-medium"
                  : "border-default bg-white hover:border-neutral-400"
              }`}
            >
              <Square size={16} className="text-navy" />
              Seed
            </button>
            <button
              onClick={() => setSeedShape("round")}
              className={`flex-1 flex flex-col items-center gap-1.5 rounded-[2px] border py-3 text-sm transition-all hover:bg-mint ${
                seedShape === "round"
                  ? "border-navy bg-white shadow-sm font-medium"
                  : "border-default bg-white hover:border-neutral-400"
              }`}
            >
              <Circle size={16} className="text-navy" />
              Round
            </button>
          </div>
        </div>

        {/* ── Round mode: color + size ─────────────────────────────────────── */}
        {isRound && (
          <>
          <div className={seedPickerSectionClass}>
            <SectionHeading>Color</SectionHeading>
              <div className="flex gap-2 mb-5">
                {ROUND_COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRoundColor(opt.value)}
                    className={`flex min-w-[25%] px-2 py-2 hover:bg-white items-center bg-light-grey border border-color-base/30 justify-center gap-2 border text-sm transition-all ${
                      roundColor === opt.value
                        ? "border-navy bg-white shadow-sm font-medium"
                        : ""
                    }`}
                  >
                    <span className="flex-1 text-left">{opt.label}</span>
                    <span
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: opt.hex }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className={seedPickerSectionClass} >
              <SectionHeading>Size</SectionHeading>
              <div className="flex gap-2 mb-5">
                {ROUND_SEED_SIZES_MM.map((size) => (
                  <button
                    key={size}
                    onClick={() => setRoundSizeMm(size)}
                    className={`flex-1 rounded-[2px] border py-3 text-sm transition-all hover:bg-mint ${
                      roundSizeMm === size
                        ? "border-navy bg-white shadow-sm font-medium"
                        : "border-default bg-white hover:border-neutral-400"
                    }`}
                  >
                    {size}mm
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Seed mode: colorway presets + editor + preview ───────────────── */}
        {!isRound && (
          <>
            {/* Size — Small (1mm) / Large (2mm); individual beads still vary slightly */}
            <div className={seedPickerSectionClass}>
              <SectionHeading>Size</SectionHeading>
              <div className="flex gap-2 mb-3">
                {SEED_BEAD_SIZES_MM.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSeedSizeMm(size)}
                    className={`flex-1 rounded-[2px] border py-3 text-sm transition-all hover:bg-mint ${
                      seedSizeMm === size
                        ? "border-navy bg-white shadow-sm font-medium"
                        : "border-default bg-white hover:border-neutral-400"
                    }`}
                  >
                    {SEED_BEAD_SIZE_LABELS[size]} ({size}mm)
                  </button>
                ))}
              </div>
              <p className="text-color-base/50 text-xs pb-3"><sup>*</sup>Seed beads will vary slightly in size.</p>
            </div>

            <div className={seedPickerSectionClass}>
              {/* Preset colorways */}
              <div className="flex items-center gap-2 mb-2.5">
                <SectionHeading className="mb-0 flex-1">Colorway presets</SectionHeading>
                {isAdmin && (
                  <Tooltip content="Open Seed Bead Color + Preset Manager" placement="left">
                    <button className="manage-btn" onClick={onManageColors}>
                      <Settings size={12} /> Manage
                    </button>
                  </Tooltip>
                )}
              </div>

              <div className="flex gap-2 flex-wrap mb-5">
                {sortedPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className={`flex items-center min-w-[32%] gap-1.5 rounded-[1px] border px-2.5 py-1.5 text-xs hover:border-navy transition-all ${
                    activePresetId === preset.id
                      ? "border-navy bg-white font-medium"
                      : "bg-light-grey border-color-base/30"
                  }`}
                  >
                    <span className="flex-1 text-left">{preset.name}</span>
                    <span className="flex gap-0.5">
                      {preset.colors.map((c, i) => (
                        <span
                          key={i}
                          className="w-3.5 h-3.5 rounded-full border border-color-base/30"
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className={seedPickerSectionClass}>
              {/* Active colorway editor */}
              <SectionHeading>Colorway</SectionHeading>

              {colorway.length === 0 ? (
                <p className="text-sm text-color-base/60 mb-4">
                  Pick a preset above or add a color below to start your seed beads.
                </p>
              ) : (
              <div className="space-y-2 mb-4">
                {colorway.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 shrink-0 rounded-full border border-color-base/50"
                      style={{ backgroundColor: entry.hex }}
                    />
                    <span className="flex-1 text-[12.5px] truncate">{entry.label ?? entry.hex}</span>
                    <Tooltip content={colorway.length === 1 ? "Only one color selected" : ""} >
                      <input
                        type="range"
                        min={colorway.length === 1 ? 0 : 5}
                        max={colorway.length === 1 ? 100 : 95}
                        value={colorway.length === 1 ? 100 : entry.percent}
                        readOnly={colorway.length === 1}
                        tabIndex={colorway.length === 1 ? -1 : undefined}
                        onChange={(e) => {
                          if (colorway.length === 1) return;
                          handlePercentChange(i, parseInt(e.target.value));
                        }}
                        className={`w-20 accent-navy ${colorway.length === 1 ? "pointer-events-none" : ""}`}
                      />
                    </Tooltip>
                    <span className="text-xs w-8 text-right text-color-base/90">{colorway.length === 1 ? 100 : entry.percent}%</span>
                    {colorway.length > 1 && (
                      <Tooltip content={`Remove ${entry.label}`} placement="left">
                        <button
                          onClick={() => handleRemoveColor(i)}
                          className="icon-only-btn icon-only-btn--error"
                          aria-label="Remove color"
                        >
                          <X size={13} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* Add color swatches — grouped by finish */}
            {colorway.length < 6 && (() => {
              const available = apiColors.filter((opt) => !colorway.some((c) => c.hex === opt.hex));
              if (available.length === 0) return null;
              const metallic = available.filter((opt) => opt.is_metallic);
              const matte = available.filter((opt) => !opt.is_metallic);

              const swatch = (opt: typeof available[number]) => (
                <Tooltip key={opt.id} content={opt.label}>
                  <button
                    onClick={() => handleAddColor(opt.hex, opt.label, opt.is_metallic)}
                    className="w-6 h-6 rounded-full border border-color-base/50 hover:ring-2 hover:ring-navy transition-all"
                    style={{ backgroundColor: opt.hex }}
                    aria-label={opt.label}
                  />
                </Tooltip>
              );

              return (
                <div className={seedPickerSectionClass}>
                  <SectionHeading>Add color</SectionHeading>
                  {metallic.length > 0 && (
                    <div className="mt-3 mb-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-color-base/50 mb-1.5">Metallic</p>
                      <div className="flex gap-1.5 flex-wrap">{metallic.map(swatch)}</div>
                    </div>
                  )}
                  {matte.length > 0 && (
                    <div className="mb-5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-color-base/50 mb-1.5">Matte</p>
                      <div className="flex gap-1.5 flex-wrap">{matte.map(swatch)}</div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Preview strip */}
            {previewBeads.length > 0 && (
              <div className={seedPickerSectionClass}>
                <SectionHeading>Preview</SectionHeading>
                <div className="flex items-center overflow-hidden rounded-[2px] border border-color-base/20 h-5 mb-2 bg-light-grey/50">
                  {(() => {
                    const totalD = previewBeads.reduce((s, pb) => s + pb.diameter, 0);
                    return previewBeads.map((pb, i) => (
                      <div
                        key={i}
                        className="h-full border-r border-color-base/10 last:border-r-0"
                        style={{
                          backgroundColor: pb.color,
                          width: `${(pb.diameter / totalD) * 100}%`,
                        }}
                      />
                    ));
                  })()}
                </div>
                <Button 
                  variant="ghost"
                  size="xs"
                  onClick={() => setSeed(newRandomSeed())}
                  className="w-fit mt-2 mb-4"
                >
                  <Shuffle size={12} />
                  Shuffle pattern
                </Button>
              </div>
            )}
          </>
        )}

        {/* Fill amount — hidden in replace mode + until a colorway is selected.
            When a gap is selected, the gap defines the length, so we swap the
            amount controls for a notice. */}
        {!replaceMode && (isGapFill ? (
          <GapFillNotice gapMm={effectiveAvailableMm} subject="These seed beads" />
        ) : hasColors ? (
        <div>
          <SectionHeading>Fill amount</SectionHeading>

          {/* Fill remaining */}
          <button
            onClick={() => setFillMode("remaining")}
            className={`${fillModeButtonClass} ${
              fillMode === "remaining"
                ? "ring-1 ring-navy border-navy"
                : "border-default hover:border-neutral-400"
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              fillMode === "remaining" ? "border-navy" : "border-neutral-300"
            }`}>
              {fillMode === "remaining" && <span className="w-1.5 h-1.5 rounded-full bg-navy" />}
            </span>
            <span className="flex-1">Fill remaining</span>
            <span className="text-xs text-color-base/50">{effectiveAvailableMm}mm</span>
          </button>

          {/* Custom size (mm) */}
          <button
            onClick={() => setFillMode("size")}
            className={`${fillModeButtonClass} ${
              fillMode === "size"
                ? "ring-1 ring-navy border-navy"
                : "border-default hover:border-neutral-400"
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              fillMode === "size" ? "border-navy" : "border-neutral-300"
            }`}>
              {fillMode === "size" && <span className="w-1.5 h-1.5 rounded-full bg-navy" />}
            </span>
            <span className="shrink-0 min-w-[55px]">Size</span>
            <input
              type="number"
              min={2}
              max={effectiveAvailableMm}
              step={1}
              value={customMm}
              onChange={(e) => { setCustomMm(e.target.value); setFillMode("size"); }}
              onFocus={() => setFillMode("size")}
              onClick={(e) => e.stopPropagation()}
              placeholder={`2 – ${effectiveAvailableMm}`}
              className={`${fillModeInputClass} ${
                fillMode === "size"
                  ? "border-default bg-white focus:border-navy"
                  : "border-transparent bg-light-grey/50 text-color-base/40"
              }`}
            />
            <span className="text-xs text-color-base/50 shrink-0">mm</span>
          </button>

          {/* Custom quantity */}
          <button
            onClick={() => setFillMode("quantity")}
            className={`${fillModeButtonClass} ${
              fillMode === "quantity"
                ? tooMany
                  ? "ring-1 ring-error border-error"
                  : "ring-1 ring-navy border-navy"
                : "border-default hover:border-neutral-400"
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              fillMode === "quantity"
                ? tooMany ? "border-error" : "border-navy"
                : "border-neutral-300"
            }`}>
              {fillMode === "quantity" && <span className={`w-1.5 h-1.5 rounded-full ${tooMany ? "bg-error" : "bg-navy"}`} />}
            </span>
            <span className="shrink-0 min-w-[55px]">Quantity</span>
            <input
              type="number"
              min={1}
              max={MAX_QUANTITY}
              step={1}
              value={customQuantity}
              onChange={(e) => { setCustomQuantity(e.target.value); setFillMode("quantity"); }}
              onFocus={() => setFillMode("quantity")}
              onClick={(e) => e.stopPropagation()}
              placeholder={`1 – ${MAX_QUANTITY}`}
              className={`${fillModeInputClass} ${
                fillMode === "quantity"
                  ? tooMany
                    ? "border-error bg-white focus:border-error"
                    : "border-default bg-white focus:border-navy"
                  : "border-transparent bg-light-grey/50 text-color-base/40"
              }`}
            />
            <span className="text-xs text-color-base/50 shrink-0">beads</span>
          </button>

          {/* Validation / info for quantity mode */}
          {fillMode === "quantity" && tooMany && (
            <p className="text-xs text-error mt-0.5 mb-1 pl-6">
              Maximum is {MAX_QUANTITY} beads.
            </p>
          )}
          {fillMode === "quantity" && parsedQuantity > 0 && !tooMany && (
            <p className="text-xs text-color-base/50 mt-0.5 mb-1 pl-6">
              ≈ {Math.round(arcFromQuantity(parsedQuantity) * 10) / 10}mm
              {arcFromQuantity(parsedQuantity) > effectiveAvailableMm && (
                <span className="text-error ml-1">(exceeds {effectiveAvailableMm}mm available)</span>
              )}
            </p>
          )}

          {/* Evenly between placed beads — distribute seeds into the gaps */}
          {placedBeads.length > 0 && (
            <button
              onClick={() => { if (canFillGaps) setFillMode("evenly"); }}
              disabled={!canFillGaps}
              className={`${fillModeButtonClass} ${
                fillMode === "evenly" ? "ring-1 ring-navy border-navy" : "border-default hover:border-neutral-400"
              } ${!canFillGaps ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                fillMode === "evenly" ? "border-navy" : "border-neutral-300"
              }`}>
                {fillMode === "evenly" && <span className="w-1.5 h-1.5 rounded-full bg-navy" />}
              </span>
              <span className="flex-1">Evenly between beads</span>
              <span className="text-xs text-color-base/50">{canFillGaps ? `${placedBeads.length} gaps` : "no room"}</span>
            </button>
          )}
          {fillMode === "evenly" && canFillGaps && (
            <p className="text-xs text-color-base/50 mt-0.5 mb-1 pl-6">
              Spaces your {placedBeads.length} placed beads evenly · ≈ {evenApproxBeads} per gap.
            </p>
          )}
        </div>
        ) : null)}
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-default px-5 pt-4 pb-5 space-y-3">
        {error && <ErrorAlert message={error} />}

        {(replaceMode || effectiveAvailableMm >= minUsefulArcMm) ? (
          <>
            {!tooMany && (
              <SectionHeading>
                {fillMode === "evenly"
                  ? (canFillGaps ? `Fill ${placedBeads.length} gaps · ≈${evenApproxBeads} beads each` : (isRound ? "Select color & size" : "Configure colorway"))
                  : hasColors && arcMm > 0
                  ? isRound
                    ? fillMode === "quantity"
                      ? `${parsedQuantity}× round ${roundSizeMm}mm ${roundColor} beads`
                      : `${arcMm}mm round ${roundSizeMm}mm ${roundColor} beads`
                    : fillMode === "quantity"
                      ? `${parsedQuantity}× seed beads (≈${Math.round(arcMm * 10) / 10}mm)`
                      : `${arcMm}mm seed beads`
                  : isRound ? "Select color & size" : "Configure colorway"}
              </SectionHeading>
            )}
            {canEdit && (
              <Button
                onClick={handleAdd}
                disabled={
                  fillMode === "evenly"
                    ? (!canFillGaps || (!isRound && colorway.length === 0))
                    : ((!replaceMode && !validArc) || (!isRound && colorway.length === 0))
                }
                className="flex w-full items-center justify-center gap-2 group"
              >
                {isRound ? (
                  <Circle size={14} className="-mt-[1px] stroke-white group-hover:stroke-navy transition-colors" />
                ) : (
                  <Square size={16} className="-mt-[2.5px] stroke-white group-hover:stroke-navy transition-colors" />
                )}
                {fillMode === "evenly"
                  ? "Fill gaps evenly"
                  : isReplaceMode ? "Replace bar" : isRound ? (replaceMode ? "Replace round beads" : "Add round beads") : (replaceMode ? "Replace seed beads" : "Add seed beads")}
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