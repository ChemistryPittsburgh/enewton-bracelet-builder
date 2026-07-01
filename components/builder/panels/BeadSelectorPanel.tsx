"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, Dot, Sparkle, ArrowLeftRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { capitalize, unslugify, beadMatchesSearch } from "@/lib/utils";
import type { BeadProduct, PlacedBead, SeedColorEntry, SeedSegmentConfig } from "@/types";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { BraceletFullNotice } from "@/components/ui/BraceletFullNotice";
import { Tooltip } from "@/components/ui/Tooltip";
import { ScrollableRow } from "@/components/ui/ScrollableRow";

import { usePermissions } from "@/hooks/usePermissions";
import { useBeads } from "@/hooks/useBeads";
import { braceletArc, usedArc, beadFits, maxFit, maxSeedArcMm, maxArcMmAtGap, buildEffectiveGroups } from "@/lib/bead-layout";
import {
  BRACELET_SIZE_RADIUS,
  BAR_REPLACE_FIT_LIMIT,
  createSpacerProduct,
  createSeedSegmentProduct,
  SEED_BEAD_SIZE_RANGE,
  seedBeadSizeRange,
} from "@/lib/constants";
import { newRandomSeed, seedPackedLengthMm } from "@/lib/seed-bead-utils";

import { SpacerPicker } from "./SpacerPicker";
import { SeedBeadPicker } from "./SeedBeadPicker";
import { BeadCard } from "./../cards/BeadCard";
import { BarPicker } from "./BarPicker";

const SPACER_TAB = "__spacer__";
const BAR_TAB    = "bar";
const SEED_TAB   = "__seed__";
/** Real bead_category (not a synthetic tab) whose grid sorts A–Z instead of by size. */
const LETTER_CHARM_CATEGORY = "letter_charm";

/** Which category pill a placed bead belongs to — used to default the tab when a
 *  replace mode opens the selector. Seeds/spacers/bars map to their synthetic
 *  tabs; everything else to its bead_category (null → "All"). */
function tabForPlacedBead(b: PlacedBead): string | null {
  if (b.seedConfig || b.product.bead_category === "seed_segment") return SEED_TAB;
  const cat = b.product.bead_category;
  if (cat === "spacer") return SPACER_TAB;
  if (cat === BAR_TAB)  return BAR_TAB;
  return cat ?? null;
}

const panelGapClass = "px-4 xl:px-7";

// ── Small inline helpers ───────────────────────────────────────────────────

function MaterialPill({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-[2px] border px-3 py-1.5 text-sm transition-all ${
        active
          ? "border-navy bg-navy text-white font-medium"
          : "border-default bg-white text-color-base hover:border-navy hover:bg-mint"
      }`}
    >
      {label}
    </button>
  );
}

function QuantityStepper({ value, max, min = 1, onChange }: {
  value: number; max: number; min?: number; onChange: (n: number) => void;
}) {
  const btn = "w-5 h-5 flex items-center justify-center rounded-[2px] border border-default text-color-base/60 hover:bg-light-grey disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none";
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className={btn}>−</button>
      <span className="w-5 text-center text-[11px] font-medium tabular-nums">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className={btn}>+</button>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

interface BeadSelectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onManageSeedColors: () => void;
}

export function BeadSelectorPanel({ isOpen, onClose, onManageSeedColors }: BeadSelectorPanelProps) {
  const { data: beads = [] } = useBeads();
  const addBead = useStore((s) => s.addBead);
  const addSeedSegment = useStore((s) => s.addSeedSegment);
  const fillGapsWithSeeds = useStore((s) => s.fillGapsWithSeeds);
  const replaceBeadInStore = useStore((s) => s.replaceBead);
  const replaceAllBeadsInStore = useStore((s) => s.replaceAllBeads);
  const replaceEditSelectedBeadsAction = useStore((s) => s.replaceEditSelectedBeads);
  const replaceWithBeadsAction = useStore((s) => s.replaceWithBeads);
  const replaceBarWithSeedSegmentAction = useStore((s) => s.replaceBarWithSeedSegment);
  const replaceTargetInstanceId = useStore((s) => s.replaceTargetInstanceId);
  const replaceAllTargetProductId = useStore((s) => s.replaceAllTargetProductId);
  const replaceSeedTargetIds = useStore((s) => s.replaceSeedTargetIds);
  const replaceSeedSegmentsInStore = useStore((s) => s.replaceSeedSegments);
  const cancelReplaceMode = useStore((s) => s.cancelReplaceMode);
  const isEditMode = useStore((s) => s.isEditMode);
  const editReplaceMode = useStore((s) => s.editReplaceMode);
  const selectedGapIndex = useStore((s) => s.selectedGapIndex);
  const setSelectedGapIndex = useStore((s) => s.setSelectedGapIndex);
  const isEvenlySpaced = useStore((s) => s.isEvenlySpaced);
  const editReplaceNarrowedIds = useStore((s) => s.editReplaceNarrowedIds);
  const editSelectedIds = useStore((s) => s.editSelectedIds);
  const groups = useStore((s) => s.groups);
  const placedBeads = useStore((s) => s.beads);
  const braceletSize = useStore((s) => s.braceletSize);
  const braceletRadius = BRACELET_SIZE_RADIUS[braceletSize];
  const { canEdit } = usePermissions();

  const isReplaceSingle = replaceTargetInstanceId !== null;
  const isReplaceAll = replaceAllTargetProductId !== null;
  const isReplaceSeed = replaceSeedTargetIds !== null && replaceSeedTargetIds.length > 0;
  const isEditReplace = editReplaceMode && !isReplaceSingle && !isReplaceAll;
  const isReplaceMode = isReplaceSingle || isReplaceAll || isEditReplace || isReplaceSeed;
  const isImplicitEditReplace = isEditMode && editSelectedIds.length > 0 && !isReplaceMode;

  // For single replace: remove the target bead from fit calculations (its slot is freed)
  const effectivePlacedBeads = isReplaceSingle
    ? placedBeads.filter((b) => b.instanceId !== replaceTargetInstanceId)
    : placedBeads;

  // For edit replace: the narrowed subset, or all selected — filtered to still-selected ids.
  // Also used by implicit mode (beads selected in edit mode without explicit replace button).
  const editReplaceTargetIds = useMemo(() => {
    if (!isEditReplace && !isImplicitEditReplace) return [];
    if (isEditReplace) {
      if (editReplaceNarrowedIds !== null) {
        // In explicit mode, IDs live in groups (editSelectedIds is empty) — skip the filter.
        // In auto mode, confirm the IDs are still in the active selection.
        return groups.length > 0
          ? editReplaceNarrowedIds
          : editReplaceNarrowedIds.filter((id) => editSelectedIds.includes(id));
      }
      return editSelectedIds;
    }
    return editSelectedIds;
  }, [isEditReplace, isImplicitEditReplace, editReplaceNarrowedIds, editSelectedIds, groups]);

  // Beads remaining after the replace targets are removed — shared by fit functions below.
  const withoutTargets = useMemo(
    () => placedBeads.filter((b) => !editReplaceTargetIds.includes(b.instanceId)),
    [placedBeads, editReplaceTargetIds],
  );

  // ── Bar → non-bar replace context ──────────────────────────────────────────
  const replaceTargetBead = replaceTargetInstanceId
    ? placedBeads.find(b => b.instanceId === replaceTargetInstanceId) ?? null
    : null;

  const isBarSingleReplace =
    isReplaceSingle && replaceTargetBead?.product.bead_category === "bar";

  const isBarEditReplace =
    isEditReplace &&
    editReplaceTargetIds.length > 0 &&
    editReplaceTargetIds.every(id =>
      placedBeads.find(b => b.instanceId === id)?.product.bead_category === "bar"
    );

  const isBarReplace = isBarSingleReplace || isBarEditReplace;

  // BarPicker replace-mode context: which effective bead list to pass for arc calculations.
  const barEffectiveBeads = isBarSingleReplace
    ? effectivePlacedBeads
    : isBarEditReplace
      ? withoutTargets
      : placedBeads;

  // ── Seed → seed replace context ─────────────────────────────────────────────
  // Edit-mode replace where every targeted bead is a seed segment → treat it as
  // a seed→seed replace (seed picker, no Fill Amount) rather than a normal swap.
  const editReplaceSeedTargetIds = useMemo(
    () =>
      (isEditReplace || isImplicitEditReplace) &&
      editReplaceTargetIds.length > 0 &&
      editReplaceTargetIds.every(
        (id) => placedBeads.find((b) => b.instanceId === id)?.seedConfig,
      )
        ? editReplaceTargetIds
        : [],
    [isEditReplace, isImplicitEditReplace, editReplaceTargetIds, placedBeads],
  );

  // Seed-replace UI is active from the dedicated path (Bead Info / replace list)
  // OR from an all-seed edit-mode selection. Either way the seed picker takes over.
  const isSeedReplaceUI = isReplaceSeed || editReplaceSeedTargetIds.length > 0;
  const seedReplaceTargetIds = isReplaceSeed ? replaceSeedTargetIds! : editReplaceSeedTargetIds;

  // For replace-all: swap all instances of the target product and check total arc
  function fitsForReplaceAll(candidate: BeadProduct): boolean {
    if (!replaceAllTargetProductId) return false;
    const swapped = placedBeads.map((b) =>
      b.product.id === replaceAllTargetProductId ? { ...b, product: candidate } : b
    );
    return usedArc(swapped) <= braceletArc(braceletRadius);
  }

  // For edit replace: enabled if at least 1 candidate fits in the freed arc
  function fitsForEditReplace(candidate: BeadProduct): boolean {
    if (editReplaceTargetIds.length === 0) return false;
    return beadFits(withoutTargets, { product: candidate }, braceletRadius);
  }

  function candidateFits(candidate: BeadProduct): boolean {
    if (isBarEditReplace) return beadFits(withoutTargets, { product: candidate }, braceletRadius);
    if (isEditReplace || isImplicitEditReplace) return fitsForEditReplace(candidate);
    if (isReplaceAll) return fitsForReplaceAll(candidate);
    return beadFits(effectivePlacedBeads, { product: candidate }, braceletRadius);
  }

  const replaceAllCount = replaceAllTargetProductId !== null
    ? placedBeads.filter((b) => b.product.id === replaceAllTargetProductId).length
    : 0;

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<string>("");
  const [selectedBead, setSelectedBead] = useState<BeadProduct | null>(null);
  const [fillFull, setFillFull] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [replaceQuantity, setReplaceQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Surface a transient error that clears itself after 3s.
  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  };

  // Clear picked bead when the user narrows to a new group so they re-select for that target.
  // Do not clear when un-narrowing (null) — there's no new group to pick for yet.
  useEffect(() => {
    if (isEditReplace && editReplaceNarrowedIds !== null) setSelectedBead(null);
  }, [editReplaceNarrowedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a replace mode opens the selector, default the category tab to the item(s)
  // being replaced: a single target → its tab; several of one category → that tab;
  // a mix of categories → "All". Re-runs when the target/selection changes (incl.
  // narrowing) but not on manual tab switches, so the user can freely re-pick after.
  useEffect(() => {
    let targets: PlacedBead[] = [];
    if (replaceTargetInstanceId) {
      const t = placedBeads.find((b) => b.instanceId === replaceTargetInstanceId);
      if (t) targets = [t];
    } else if (replaceAllTargetProductId !== null) {
      const t = placedBeads.find((b) => b.product.id === replaceAllTargetProductId);
      if (t) targets = [t];
    } else if (replaceSeedTargetIds && replaceSeedTargetIds.length > 0) {
      targets = placedBeads.filter((b) => replaceSeedTargetIds.includes(b.instanceId));
    } else if (editReplaceMode && editReplaceTargetIds.length > 0) {
      targets = placedBeads.filter((b) => editReplaceTargetIds.includes(b.instanceId));
    }
    if (targets.length === 0) return;
    const tabs = new Set(targets.map(tabForPlacedBead));
    setActiveTab(tabs.size === 1 ? [...tabs][0] : null);
  }, [replaceTargetInstanceId, replaceAllTargetProductId, replaceSeedTargetIds, editReplaceMode, editReplaceTargetIds, placedBeads]);

  // How many of the selected candidate type fit in the freed arc (up to the number of removed beads).
  // Computed once per render so JSX doesn't run the loop inline.
  const editReplaceFitCount = useMemo(() => {
    if (!selectedBead || (!isEditReplace && !isImplicitEditReplace) || editReplaceTargetIds.length === 0) return 0;
    return maxFit(withoutTargets, selectedBead, braceletRadius, editReplaceTargetIds.length);
  }, [selectedBead, isEditReplace, isImplicitEditReplace, withoutTargets, editReplaceTargetIds, braceletRadius]);

  // Uncapped fit count for bar → non-bar replace (not limited by run length).
  const barReplaceFitCount = useMemo(() => {
    if (!isBarReplace || !selectedBead || selectedBead.bead_category === "bar") return 0;
    const baseline = isBarSingleReplace ? effectivePlacedBeads : withoutTargets;
    return maxFit(baseline, selectedBead, braceletRadius, BAR_REPLACE_FIT_LIMIT);
  }, [isBarReplace, isBarSingleReplace, selectedBead, effectivePlacedBeads, withoutTargets, braceletRadius]);

  // Default replaceQuantity to however many fit whenever a new bead is selected or fit count changes
  useEffect(() => {
    if (isBarReplace && barReplaceFitCount > 0) setReplaceQuantity(barReplaceFitCount);
    else if (editReplaceFitCount > 0) setReplaceQuantity(editReplaceFitCount);
  }, [editReplaceFitCount, isBarReplace, barReplaceFitCount]);

  const isSpacerMode = activeTab === SPACER_TAB;
  const isBarMode  = activeTab === BAR_TAB;
  const isSeedMode = activeTab === SEED_TAB || isReplaceSeed;

  const totalArc     = braceletArc(braceletRadius);
  const used         = usedArc(placedBeads);
  const availableMm  = Math.max(0, Math.round((totalArc - used) * 1000 * 10) / 10);

  // Freed arc in mm available when replacing bar(s) — used by SpacerPicker and SeedBeadPicker.
  const barFreedArcMm = useMemo(() => {
    if (!isBarReplace) return undefined;
    const baseline = isBarSingleReplace ? effectivePlacedBeads : withoutTargets;
    const usedM = usedArc(baseline);
    return Math.max(0, Math.round((totalArc - usedM) * 1000 * 10) / 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBarReplace, isBarSingleReplace, effectivePlacedBeads, withoutTargets, totalArc]);

  // Arc (in mm) available for gap-fill insertion — caps maxArcMm for spacer/seed pickers.
  // Uses maxArcMmAtGap (accounts for actual gap neighbors, and the item category's own
  // spacing rule) so the cap matches what beadFitsAtIndex will allow for this position.
  const gapArcMm = useMemo(() => {
    if (selectedGapIndex === null || !isEvenlySpaced || placedBeads.length < 2) return undefined;
    const effectiveGroups = buildEffectiveGroups(groups, editSelectedIds);
    const category = isSpacerMode ? "spacer" : "seed_segment";
    return Math.floor(maxArcMmAtGap(placedBeads, selectedGapIndex, braceletRadius, effectiveGroups, isEvenlySpaced, category) * 10) / 10;
  }, [selectedGapIndex, isEvenlySpaced, placedBeads, braceletRadius, groups, editSelectedIds, isSpacerMode]);

  // Exclude "bar" from the data-driven pills — the bar tab renders BarPicker, not the card grid.
  const beadCategories = useMemo(
    () => [...new Set(beads.map((b) => b.bead_category).filter(Boolean))].filter((c) => c !== BAR_TAB) as string[],
    [beads],
  );

  // Bar products — fed into BarPicker when the Bar tab is active
  const bars = useMemo(() => beads.filter((b) => b.bead_category === BAR_TAB), [beads]);
  const materials = useMemo(() => {
    const pool = activeTab && !isSpacerMode && !isBarMode && !isSeedMode
      ? beads.filter((b) => b.bead_category === activeTab)
      : beads;
    return [...new Set(pool.map((b) => b.material).filter(Boolean))] as string[];
  }, [beads, activeTab, isSpacerMode, isBarMode, isSeedMode]);

  const beadTypes = useMemo(() => {
    const pool = activeTab && !isSpacerMode && !isBarMode && !isSeedMode
      ? beads.filter((b) => b.bead_category === activeTab)
      : beads;
    return [...new Set(pool.map((b) => b.bead_type).filter(Boolean))] as string[];
  }, [beads, activeTab, isSpacerMode, isBarMode, isSeedMode]);

  const filteredBeads = useMemo(() => {
    const list = beads.filter((b) => {
      const matchesSearch = beadMatchesSearch(b, search);
      const matchesCategory = !activeTab || isSpacerMode || isBarMode || isSeedMode || b.bead_category === activeTab;
      const matchesMaterial = !activeMaterial || b.material === activeMaterial;
      const matchesType = !activeType || b.bead_type === activeType;
      return matchesSearch && matchesCategory && matchesMaterial && matchesType;
    });
    // Letter charms read as a list of names → sort A–Z by the label shown on the
    // card (BeadCard renders bead.name). Everything else sorts by physical size.
    if (activeTab === LETTER_CHARM_CATEGORY) {
      return list.sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", undefined, { numeric: true, sensitivity: "base" }),
      );
    }
    return list.sort((a, b) => (a.size_mm ?? a.diameter * 1000) - (b.size_mm ?? b.diameter * 1000));
  }, [beads, search, activeTab, activeMaterial, activeType, isSpacerMode, isBarMode, isSeedMode]);

  // True when nothing in the current view can be added: either no arc is left or
  // no visible bead fits. Not applicable while replacing (you're swapping, not
  // adding). Drives both the bottom-bar "full" message and the bead cards, which
  // show greyed-out (rather than hidden) when the bracelet is full.
  const braceletFull =
    !isReplaceMode &&
    filteredBeads.length > 0 &&
    !(availableMm >= 1 && filteredBeads.some((b) => candidateFits(b)));

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleAddToDesign() {
    if (!selectedBead) return;
    let err: string | null = null;

    if (fillFull) {
      let added = 0;
      while (true) {
        err = addBead(selectedBead);
        if (err) break;
        added++;
      }
      if (added === 0) {
        showError(err ?? "Bracelet is already full.");
      } else {
        setQuantity(1);
      }
    } else {
      for (let i = 0; i < quantity; i++) {
        err = addBead(selectedBead);
        if (err) break;
      }
      if (err) {
        showError(err);
      } else {
        setQuantity(1);
      }
    }
  }

  function handleReplace() {
    if (!selectedBead || !replaceTargetInstanceId) return;
    if (isBarSingleReplace) {
      const err = replaceWithBeadsAction([replaceTargetInstanceId], selectedBead, replaceQuantity);
      if (err) { showError(err); }
      return;
    }
    const err = replaceBeadInStore(replaceTargetInstanceId, selectedBead);
    if (err) {
      showError(err);
    }
  }

  function handleReplaceAll() {
    if (!selectedBead || !replaceAllTargetProductId) return;
    const err = replaceAllBeadsInStore(replaceAllTargetProductId, selectedBead);
    if (err) {
      showError(err);
    }
  }

  function handleEditReplace() {
    if (!selectedBead || editReplaceTargetIds.length === 0) return;
    if (isBarEditReplace) {
      const err = replaceWithBeadsAction(editReplaceTargetIds, selectedBead, replaceQuantity);
      if (err) { showError(err); }
      return;
    }
    const isPartialFit = editReplaceFitCount > 0 && editReplaceFitCount < editReplaceTargetIds.length;
    const err = replaceEditSelectedBeadsAction(
      editReplaceTargetIds,
      selectedBead,
      isPartialFit ? replaceQuantity : undefined,
    );
    if (err) {
      showError(err);
    }
  }

  function handleAddSpacer(sizeMm: number) {
    const spacerProduct = createSpacerProduct(sizeMm);
    if (isBarReplace) {
      const barIds = isBarSingleReplace ? [replaceTargetInstanceId!] : editReplaceTargetIds;
      const baseline = isBarSingleReplace ? effectivePlacedBeads : withoutTargets;
      const count = maxFit(baseline, spacerProduct, braceletRadius, BAR_REPLACE_FIT_LIMIT);
      if (count === 0) { showError("The spacer is too large for the available space."); return; }
      const err = replaceWithBeadsAction(barIds, spacerProduct as any, count);
      if (err) { showError(err); }
      return;
    }
    const err = addBead(spacerProduct as any);
    if (err) {
      showError(err);
    }
  }

  function handleAddBar(bar: BeadProduct) {
    const err = addBead(bar);
    if (err) {
      showError(err);
    }
  }

  function handleReplaceBar(product: BeadProduct) {
    if (replaceTargetInstanceId) {
      const err = replaceBeadInStore(replaceTargetInstanceId, product);
      if (err) {
        showError(err);
      }
      return;
    }
    if (editReplaceMode && editReplaceTargetIds.length > 0) {
      const err = replaceEditSelectedBeadsAction(editReplaceTargetIds, product);
      if (err) {
        showError(err);
      }
    }
  }

  /** Build a seed segment {product, seedConfig} from picker values + a length. */
  function buildSeedSegment(
    arcMm: number,
    colorway: SeedColorEntry[],
    randomSeed: number,
    seedShape?: "seed" | "round",
    roundSizeMm?: number,
    material?: string,
    seedSizeMm?: number,
  ) {
    const isRound = seedShape === "round";
    const baseConfig: SeedSegmentConfig = {
      colorway,
      arc_length_mm: arcMm,
      bead_size_range: (seedSizeMm ? seedBeadSizeRange(seedSizeMm) : SEED_BEAD_SIZE_RANGE) as [number, number],
      random_seed: randomSeed,
      ...(isRound
        ? { seed_shape: "round" as const, round_size_mm: roundSizeMm ?? 2 }
        : { seed_size_mm: seedSizeMm ?? 1 }),
    };
    // Snap the reserved arc to what the beads actually pack to. The requested arc
    // (from quantity / size / remaining, or a prior segment when changing size)
    // can be wider than the beads occupy; that surplus is what renders as gaps,
    // worst on large/few beads. Snapping keeps the slot flush with the beads.
    const packedMm = seedPackedLengthMm(baseConfig);
    const finalArcMm = packedMm > 0 ? Math.round(packedMm * 100) / 100 : arcMm;
    const product = createSeedSegmentProduct(finalArcMm, randomSeed, seedShape, roundSizeMm, material);
    const seedConfig: SeedSegmentConfig = { ...baseConfig, arc_length_mm: finalArcMm };
    return { product, seedConfig };
  }

  function handleAddSeedSegment(
    arcMm: number,
    colorway: SeedColorEntry[],
    randomSeed: number,
    seedShape?: "seed" | "round",
    roundSizeMm?: number,
    material?: string,
    seedSizeMm?: number,
  ) {
    const { product, seedConfig } = buildSeedSegment(arcMm, colorway, randomSeed, seedShape, roundSizeMm, material, seedSizeMm);
    if (isBarReplace) {
      const barIds = isBarSingleReplace ? [replaceTargetInstanceId!] : editReplaceTargetIds;
      const err = replaceBarWithSeedSegmentAction(barIds, product as any, seedConfig);
      if (err) { showError(err); }
      return;
    }
    const err = addSeedSegment(product as any, seedConfig);
    if (err) {
      showError(err);
    }
  }

  /** Distribute seeds evenly into the gaps between placed beads, using the
   *  picker's current colorway/size. A fresh random seed per gap varies each run. */
  function handleFillGapsEvenly(
    colorway: SeedColorEntry[],
    seedShape: "seed" | "round",
    roundSizeMm?: number,
    material?: string,
    seedSizeMm?: number,
  ) {
    const makeFiller = (arcMm: number) => {
      const { product, seedConfig } = buildSeedSegment(
        arcMm, colorway, newRandomSeed(), seedShape, roundSizeMm, material, seedSizeMm,
      );
      return { product: product as any, seedConfig };
    };
    const err = fillGapsWithSeeds(makeFiller);
    if (err) showError(err);
  }

  /** Replace every queued seed segment with the picked config, each at its own length. */
  function handleReplaceSeeds(
    _arcMm: number,
    colorway: SeedColorEntry[],
    randomSeed: number,
    seedShape?: "seed" | "round",
    roundSizeMm?: number,
    material?: string,
    seedSizeMm?: number,
  ) {
    const targets = placedBeads.filter(
      (b) => seedReplaceTargetIds.includes(b.instanceId) && b.seedConfig,
    );
    if (targets.length === 0) return;
    const replacements = targets.map((t) => {
      const { product, seedConfig } = buildSeedSegment(
        t.seedConfig!.arc_length_mm, colorway, randomSeed, seedShape, roundSizeMm, material, seedSizeMm,
      );
      return { instanceId: t.instanceId, product: product as any, seedConfig };
    });
    const err = replaceSeedSegmentsInStore(replacements);
    if (err) {
      showError(err);
    }
  }

  function handleSelectBead(bead: BeadProduct) {
    if (selectedBead?.id === bead.id) {
      setSelectedBead(null);
    } else {
      setSelectedBead(bead);
      setQuantity(1);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Panel open={isOpen} onClose={onClose} title={isReplaceMode ? "Replace Bead" : "Bead Selector"} direction="left" overflowYScroll={false} className="bottom-0 h-auto">
      <div className="flex flex-col h-full min-h-0 border-b border-default">

        {/* Replace-mode banner — distinguishes replace from the normal "add" flow */}
        {isReplaceMode && (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-navy px-4 py-2.5 text-white">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
              <ArrowLeftRight size={14} />
              Replace mode
            </span>
            <button
              onClick={cancelReplaceMode}
              className="text-xs font-medium underline underline-offset-2 hover:no-underline"
            >
              Exit
            </button>
          </div>
        )}

        {/* Gap-insert banner — shown when a gap is selected as insertion target */}
        {selectedGapIndex !== null && !isReplaceMode && (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-gold px-4 py-2 text-white">
            <span className="text-xs font-semibold">
              Filling gap {selectedGapIndex + 1}
              {gapArcMm !== undefined && gapArcMm > 0 && (
                <span className="font-normal opacity-80"> · {gapArcMm}mm</span>
              )}
            </span>
            <button
              onClick={() => setSelectedGapIndex(null)}
              className="text-xs font-medium underline underline-offset-2 hover:no-underline"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Search — hidden in spacer/bar/seed mode */}
        {!isSpacerMode && !isBarMode && !isSeedMode && (
          <div className={`shrink-0 pt-4 ${panelGapClass}`}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search item name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-[2px] border border-default py-2.5 pl-4 pr-16 text-sm outline-none placeholder:text-color-base/70 focus:ring-navy focus:border-navy"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-[2px] text-color-base/40 bg-white hover:text-color-base hover:bg-light-grey focus:ring-navy transition-colors"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Search size={16} className="text-color-base/50 mr-1" />
              </div>
            </div>
          </div>
        )}

        {/* Category pills + Spacer + Seed tabs */}
        <ScrollableRow className={`shrink-0 py-3 min-h-14 ${(isBarMode || isSeedMode || isSpacerMode) && "border-b border-default"}`} trackClassName="gap-2">
          <MaterialPill
            label="All"
            active={activeTab === null}
            onClick={() => { setActiveTab(null); setActiveMaterial(""); setActiveType(null); }}
          />
          {beadCategories.map((cat) => (
            <MaterialPill
              key={cat}
              label={unslugify(cat, "_")}
              active={activeTab === cat}
              onClick={() => {
                setActiveTab((prev) => (prev === cat ? null : cat));
                setActiveMaterial("");
                setActiveType(null);
              }}
            />
          ))}
          <MaterialPill
            label="Spacer"
            active={isSpacerMode}
            onClick={() => {
              setActiveTab((prev) => (prev === SPACER_TAB ? null : SPACER_TAB));
              setActiveMaterial("");
              setActiveType(null);
              setSelectedBead(null);
            }}
          />
          <MaterialPill
            label="Bar"
            active={isBarMode}
            onClick={() => {
              setActiveTab((prev) => (prev === BAR_TAB ? null : BAR_TAB));
              setActiveMaterial("");
              setActiveType(null);
              setSelectedBead(null);
            }}
          />
          <MaterialPill
            label="Seed"
            active={isSeedMode}
            onClick={() => {
              setActiveTab((prev) => (prev === SEED_TAB ? null : SEED_TAB));
              setActiveMaterial("");
              setActiveType(null);
              setSelectedBead(null);
            }}
          />
        </ScrollableRow>

        <div key={activeTab ?? "__all"} className="animate-tab-in flex flex-col flex-1 min-h-0">
        {isBarMode ? (
          <BarPicker
            bars={bars}
            onAdd={handleAddBar}
            onReplace={handleReplaceBar}
            effectiveBeads={barEffectiveBeads}
            isReplaceMode={isBarReplace}
            error={error}
          />
        ) : isSpacerMode ? (
          <SpacerPicker
            onAdd={handleAddSpacer}
            error={error}
            maxArcMm={isBarReplace ? barFreedArcMm : gapArcMm}
            isReplaceMode={isBarReplace}
          />
        ) : isSeedMode ? (
          <SeedBeadPicker
            onAdd={isSeedReplaceUI ? handleReplaceSeeds : handleAddSeedSegment}
            onFillGapsEvenly={handleFillGapsEvenly}
            error={error}
            onManageColors={onManageSeedColors}
            maxArcMm={isBarReplace ? barFreedArcMm : gapArcMm}
            isReplaceMode={isBarReplace}
            replaceMode={isSeedReplaceUI}
          />
        ) : (
          /* ── Normal bead selector ── */
          <>
            {/* Filter dropdowns + active chips */}
            <div className={`shrink-0 pb-3 border-b border-default flex flex-col gap-2 ${panelGapClass}`}>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Filter by material"
                  value={activeMaterial}
                  onChange={(e) => setActiveMaterial(e.target.value)}
                  className="flex-1 rounded-[2px] border border-default bg-white px-3 py-2 text-sm text-color-base/70 outline-none focus:border-navy focus:ring-navy"
                >
                  <option value="">All materials</option>
                  {materials.map((mat) => (
                    <option key={mat} value={mat}>{unslugify(mat)}</option>
                  ))}
                </select>

                {beadTypes.length > 1 && (
                  <select
                    aria-label="Filter by bead type"
                    value={activeType ?? ""}
                    onChange={(e) => setActiveType(e.target.value || null)}
                    className="flex-1 rounded-[2px] border border-default bg-white px-3 py-2 text-sm text-color-base/70 outline-none focus:border-navy focus:ring-navy"
                  >
                    <option value="">All types</option>
                    {beadTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                )}
              </div>

              {(activeMaterial || activeType) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeMaterial && (
                    <span className="inline-flex items-center gap-1 rounded-[2px] bg-mint/50 px-2 py-0.5 text-xs font-medium text-color-base/80">
                      {unslugify(activeMaterial)}
                      <Tooltip content={`Remove filter ${unslugify(activeMaterial)}`}>
                        <button onClick={() => setActiveMaterial("")} className="ml-0.5 opacity-60 hover:opacity-100" aria-label="Remove material filter">
                          <X size={11} />
                        </button>
                      </Tooltip>
                    </span>
                  )}
                  {activeType && (
                    <span className="inline-flex items-center gap-1 rounded-[2px] bg-gold/30 px-2 py-0.5 text-xs font-medium text-color-base/80">
                      {activeType}
                      <Tooltip content={`Remove filter ${unslugify(activeType)}`}>
                        <button onClick={() => setActiveType(null)} className="ml-0.5 opacity-60 hover:opacity-100" aria-label="Remove type filter">
                          <X size={11} />
                        </button>
                      </Tooltip>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bead grid */}
            <div className={`flex-1 min-h-0 overflow-y-auto py-3 ${panelGapClass}`}>
              {filteredBeads.length === 0 ? (
                <p className="text-xs text-color-base/50 text-center py-8">
                  No items match your filters.
                </p>
              ) : isEditReplace && editReplaceTargetIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center gap-3 py-12 px-4">
                  <div className="w-11 h-11 rounded-full bg-navy/10 flex items-center justify-center">
                    <ArrowLeftRight size={20} className="text-navy" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-color-base">Select an item to replace</p>
                    <p className="text-xs text-color-base/60 mt-1 max-w-[240px] mx-auto">
                      Pick an item by type from the list on the right, or tap an item on the bracelet, then choose a replacement here.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={cancelReplaceMode}>
                    Exit replace mode
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 min-[1700px]:grid-cols-4 gap-3">
                  {filteredBeads.map((bead) => (
                    <BeadCard
                      key={bead.id}
                      bead={bead}
                      selected={selectedBead?.id === bead.id}
                      onClick={() => handleSelectBead(bead)}
                      canEdit={canEdit}
                      disabled={!candidateFits(bead)}
                      braceletFull={braceletFull}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className={`shrink-0 border-t border-default/50 pt-4 pb-5 space-y-3 ${panelGapClass}`}>
              {error && <ErrorAlert message={error} />}

              {!braceletFull ? (
                <>
                <p className="text-[12px] tracking-wider uppercase font-bold text-color-base/70 mb-1">
                  {isReplaceMode
                    ? (selectedBead?.name ? "Item Selected" : "Select replacement bead")
                    : (selectedBead?.name ? "Item Selected" : "Select a bead")}
                </p>

                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[15px] font-medium flex items-center">
                      {selectedBead?.bead_type ?? ""} 
                      {selectedBead?.size_mm && (
                        <span className="flex items-center gap-0.5">
                          <Dot size={15} />
                          {selectedBead.size_mm}mm
                        </span>
                      )}
                    </span>
                    <p className="text-[12px] text-color-base/70 flex-col gap-1">
                      {selectedBead?.material && (<span>Material: {unslugify(selectedBead.material)} </span>)}
                      {selectedBead?.color && (
                        <span>
                        <br />Color: {capitalize(selectedBead.color)}
                        </span>
                      )}
                    </p>
                    {editReplaceFitCount > 0 && editReplaceFitCount < editReplaceTargetIds.length && (
                      <div className="mt-1 flex items-center gap-2.5">
                        <p className="text-[11px] text-color-base/50">
                          {editReplaceFitCount} of {editReplaceTargetIds.length} will fit
                        </p>
                        <QuantityStepper value={replaceQuantity} max={editReplaceFitCount} onChange={setReplaceQuantity} />
                      </div>
                    )}
                    {isBarReplace && selectedBead?.bead_category !== "bar" && barReplaceFitCount > 1 && (
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-color-base/50">
                          Up to {barReplaceFitCount} will fit
                        </p>
                        <QuantityStepper value={replaceQuantity} max={barReplaceFitCount} onChange={setReplaceQuantity} />
                      </div>
                    )}
                  </div>

                  {selectedBead && !isReplaceMode && !isImplicitEditReplace && (
                    <div className="flex flex-col gap-2">
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-color-base/70 mr-1">
                      <input
                        type="checkbox"
                        checked={fillFull}
                        onChange={(e) => setFillFull(e.target.checked)}
                        className="form-checkbox rounded-[2px] w-4 h-4 bg-grey border-none text-navy focus:ring-navy focus:ring-1"
                      />
                      Fill full bracelet?
                    </label>

                    {!fillFull && (
                      <div className="flex shrink-0 items-center gap-1.5 text-xs text-color-base/70">
                        <span>Quantity</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value))))}
                          className="w-14 rounded-[2px] border border-default px-2 py-1.5 text-center text-sm outline-none focus:border-navy focus:ring-navy"
                        />
                      </div>
                    )}
                    </div>
                  )}
                </div>

                {canEdit && (
                  <Button
                    onClick={isEditReplace || isImplicitEditReplace ? handleEditReplace : isReplaceAll ? handleReplaceAll : isReplaceSingle ? handleReplace : handleAddToDesign}
                    disabled={!selectedBead || !candidateFits(selectedBead)}
                    className="flex w-full items-center justify-center gap-2 disabled group"
                  >
                    <Sparkle size={12} className="-mt-[2.5px] fill-white group-hover:fill-navy stroke-white group-hover:fill-navy group-hover:stroke-navy transition-colors" />
                    {isBarReplace && selectedBead?.bead_category !== "bar"
                      ? `Replace bar (×${replaceQuantity})`
                      : isEditReplace || isImplicitEditReplace
                        ? (() => {
                            const isPartialFit = editReplaceFitCount > 0 && editReplaceFitCount < editReplaceTargetIds.length;
                            const n = isPartialFit ? replaceQuantity : editReplaceTargetIds.length;
                            return `Replace ${n} bead${n !== 1 ? "s" : ""}`;
                          })()
                        : isReplaceAll ? `Replace All (${replaceAllCount})` : isReplaceSingle ? "Replace Bead" : "Add to design"}
                  </Button>
                )}
                </>
              ) : (
                <BraceletFullNotice />
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </Panel>
  );
}