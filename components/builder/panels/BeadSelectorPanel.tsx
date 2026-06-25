"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Dot, Sparkle } from "lucide-react";
import { useStore } from "@/lib/store";
import { capitalize, unslugify } from "@/lib/utils";
import type { BeadProduct, PlacedBead, SeedColorEntry, SeedSegmentConfig } from "@/types";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { BeadThumbnail } from "@/components/ui/BeadThumbnail";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BraceletFullNotice } from "@/components/ui/BraceletFullNotice";
import { Tooltip } from "@/components/ui/Tooltip";
import { ScrollableRow } from "@/components/ui/ScrollableRow";

import { usePermissions } from "@/hooks/usePermissions";
import { useBeads } from "@/hooks/useBeads";
import { braceletArc, usedArc, beadFits } from "@/lib/bead-layout";
import {
  BRACELET_SIZE_RADIUS,
  createSpacerProduct,
  createSeedSegmentProduct,
  SEED_BEAD_SIZE_RANGE,
  seedBeadSizeRange,
} from "@/lib/constants";

import { SpacerPicker } from "./SpacerPicker";
import { SeedBeadPicker } from "./SeedBeadPicker";

const SPACER_TAB = "__spacer__";
const BAR_TAB    = "bar";
const SEED_TAB   = "__seed__";

const panelGapClass = "px-4 xl:px-7";

// ── Small inline helpers ───────────────────────────────────────────────────

function BeadCard({ bead, selected, onClick, canEdit, disabled = false }: {
  bead: BeadProduct; selected: boolean; onClick: () => void; canEdit: boolean; disabled?: boolean;
}) {
  const setDragFromPanel = useStore((s) => s.setDragFromPanel);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const size = bead.size_mm ?? 4;

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    didDragRef.current = false;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!startRef.current || didDragRef.current || !canEdit || disabled) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      didDragRef.current = true;
      setDragFromPanel(bead);
    }
  }

  function handlePointerUp() {
    startRef.current = null;
  }

  function handleClick() {
    if (!didDragRef.current && !disabled) onClick();
  }

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      disabled={disabled}
      className={`flex flex-col gap-1 rounded-[2px] border transition-all overflow-hidden h-full ${
        disabled
          ? "border-default bg-light-grey/50 opacity-40 cursor-not-allowed hidden"
          : canEdit
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-default"
      } ${
        selected && !disabled
          ? "ring-2 ring-navy border-navy shadow-sm"
          : !disabled
            ? "border-default bg-white hover:border-neutral-400"
            : ""
      }`}
    >
      <div className="flex flex-col justify-center items-center h-[120px] py-1 overflow-hidden w-full object-cover object-center bg-light-grey">
        <BeadThumbnail bead={bead} className="w-full max-w-24"  />
      </div>
      <div className="flex flex-1 min-h-14 shrink-0 flex-col pt-[2px] pb-2 text-left px-2">
        <span className="text-[12px]">{bead.name}</span>
        <span className="text-[10px] leading-tight text-color-base/70">{size}mm</span>
      </div>
    </button>
  );
}

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

// ── Bar picker ─────────────────────────────────────────────────────────────

function BarPicker({ bars, onAdd, onReplace, effectiveBeads, isReplaceMode, error }: {
  bars: BeadProduct[];
  onAdd: (bar: BeadProduct) => void;
  onReplace: (bar: BeadProduct) => void;
  effectiveBeads: PlacedBead[];
  isReplaceMode: boolean;
  error: string | null;
}) {
  const braceletSize = useStore((s) => s.braceletSize);
  const { canEdit } = usePermissions();

  const [selectedBar, setSelectedBar]       = useState<BeadProduct | null>(null);
  const [selectedLength, setSelectedLength] = useState<number>(30);

  const radius      = BRACELET_SIZE_RADIUS[braceletSize];
  const totalArc    = braceletArc(radius);
  const used        = usedArc(effectiveBeads);
  const availableMm = Math.max(0, Math.round((totalArc - used) * 1000 * 10) / 10);

  // Reset slider to the bar's natural size_mm whenever the selection changes
  useEffect(() => {
    if (selectedBar) setSelectedLength(selectedBar.size_mm ?? 30);
  }, [selectedBar]);

  const productToAdd = useMemo(
    () => (selectedBar ? { ...selectedBar, size_mm: selectedLength } : null),
    [selectedBar, selectedLength],
  );

  const canAdd = productToAdd !== null && beadFits(effectiveBeads, { product: productToAdd }, radius);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-5 pb-4 overflow-y-auto">
        <div className="rounded-lg border border-default bg-light-grey/50 px-4 py-3 mb-5">
          <p className="text-xs font-semibold text-color-base/70 uppercase tracking-wide mb-1">
            Available space
          </p>
          <p className="text-2xl font-semibold text-navy">{availableMm}mm</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-light-grey overflow-hidden">
            <div
              className="h-full rounded-full bg-navy transition-all"
              style={{ width: `${Math.min(100, (used / totalArc) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-color-base/70 mt-1">
            {Math.round((used / totalArc) * 100)}% occupied
          </p>
        </div>

        {/* Step 1 — Select a bar */}
        <p className="text-xs font-semibold text-color-base/70 uppercase tracking-wide mb-3">
          Select bar
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 min-[1700px]:grid-cols-4 gap-3 mb-5">
          {bars.map((bar) => (
            <BeadCard
              key={bar.id}
              bead={bar}
              selected={selectedBar?.id === bar.id}
              onClick={() => setSelectedBar((prev) => (prev?.id === bar.id ? null : bar))}
              canEdit={canEdit}
              disabled={!beadFits(effectiveBeads, { product: bar }, radius)}
            />
          ))}
        </div>

        {/* Step 2 — Length slider */}
        {selectedBar && (
          <div className="mb-5 rounded-lg border border-default bg-light-grey/40 px-4 py-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-color-base/70 uppercase tracking-wide">Length</span>
              <span className="font-semibold text-color-base">{selectedLength} mm</span>
            </div>
            <input
              type="range"
              min={5}
              max={Math.max(5, Math.floor(availableMm))}
              step={0.5}
              value={selectedLength}
              onChange={(e) => setSelectedLength(Number(e.target.value))}
              className="w-full accent-gold"
            />
            <div className="flex justify-between text-[11px] text-stone/60">
              <span>5 mm</span>
              <span>{Math.floor(availableMm)} mm available</span>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-default/50 px-5 pt-4 pb-5 space-y-3">
        {error && <ErrorAlert message={error} />}
        {availableMm >= 1 ? (
          <>
            <p className="text-[12px] tracking-wider uppercase font-bold text-color-base/70 mb-1">
              {productToAdd ? productToAdd.name : "Select a bar"}
            </p>
            {canEdit && (
              <Button
                onClick={() => {
                  if (!productToAdd) return;
                  isReplaceMode ? onReplace(productToAdd) : onAdd(productToAdd);
                }}
                disabled={!canAdd}
                variant="secondary"
                className="flex w-full items-center justify-center gap-2"
              >
                ✦ {isReplaceMode ? "Replace bar" : "Add bar"}
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
  const replaceBeadInStore = useStore((s) => s.replaceBead);
  const replaceAllBeadsInStore = useStore((s) => s.replaceAllBeads);
  const replaceEditSelectedBeadsAction = useStore((s) => s.replaceEditSelectedBeads);
  const replaceWithBeadsAction = useStore((s) => s.replaceWithBeads);
  const replaceBarWithSeedSegmentAction = useStore((s) => s.replaceBarWithSeedSegment);
  const replaceTargetInstanceId = useStore((s) => s.replaceTargetInstanceId);
  const replaceAllTargetProductId = useStore((s) => s.replaceAllTargetProductId);
  const isEditMode = useStore((s) => s.isEditMode);
  const editReplaceMode = useStore((s) => s.editReplaceMode);
  const editReplaceNarrowedIds = useStore((s) => s.editReplaceNarrowedIds);
  const editSelectedIds = useStore((s) => s.editSelectedIds);
  const editSelectionGroups = useStore((s) => s.editSelectionGroups);
  const placedBeads = useStore((s) => s.beads);
  const braceletSize = useStore((s) => s.braceletSize);
  const braceletRadius = BRACELET_SIZE_RADIUS[braceletSize];
  const { canEdit } = usePermissions();

  const isReplaceSingle = replaceTargetInstanceId !== null;
  const isReplaceAll = replaceAllTargetProductId !== null;
  const isEditReplace = editReplaceMode && !isReplaceSingle && !isReplaceAll;
  const isReplaceMode = isReplaceSingle || isReplaceAll || isEditReplace;
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
        // In explicit mode, IDs live in editSelectionGroups (editSelectedIds is empty) — skip the filter.
        // In auto mode, confirm the IDs are still in the active selection.
        return editSelectionGroups.length > 0
          ? editReplaceNarrowedIds
          : editReplaceNarrowedIds.filter((id) => editSelectedIds.includes(id));
      }
      return editSelectedIds;
    }
    return editSelectedIds;
  }, [isEditReplace, isImplicitEditReplace, editReplaceNarrowedIds, editSelectedIds, editSelectionGroups]);

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
  const isBarReplaceMode = isReplaceSingle || isEditReplace;
  const barEffectiveBeads = isReplaceSingle
    ? effectivePlacedBeads
    : isEditReplace
      ? withoutTargets
      : placedBeads;

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

  // Clear picked bead when the user narrows to a new group so they re-select for that target.
  // Do not clear when un-narrowing (null) — there's no new group to pick for yet.
  useEffect(() => {
    if (isEditReplace && editReplaceNarrowedIds !== null) setSelectedBead(null);
  }, [editReplaceNarrowedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-switch to the Bar tab when any replace mode targets bar(s).
  useEffect(() => {
    if (replaceTargetInstanceId) {
      const target = placedBeads.find((b) => b.instanceId === replaceTargetInstanceId);
      if (target?.product.bead_category === "bar") setActiveTab(BAR_TAB);
      return;
    }
    if (editReplaceMode && editReplaceTargetIds.length > 0) {
      const allBars = editReplaceTargetIds.every((id) =>
        placedBeads.find((b) => b.instanceId === id)?.product.bead_category === "bar",
      );
      if (allBars) setActiveTab(BAR_TAB);
    }
  }, [replaceTargetInstanceId, editReplaceMode, editReplaceTargetIds, placedBeads]);

  // How many of the selected candidate type fit in the freed arc (up to the number of removed beads).
  // Computed once per render so JSX doesn't run the loop inline.
  const editReplaceFitCount = useMemo(() => {
    if (!selectedBead || (!isEditReplace && !isImplicitEditReplace) || editReplaceTargetIds.length === 0) return 0;
    let count = 0;
    let tempList = withoutTargets;
    while (count < editReplaceTargetIds.length && beadFits(tempList, { product: selectedBead }, braceletRadius)) {
      count++;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tempList = [...tempList, { instanceId: `__fit_${count}`, product: selectedBead } as any];
    }
    return count;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBead, isEditReplace, isImplicitEditReplace, withoutTargets, editReplaceTargetIds, braceletRadius]);

  // Uncapped fit count for bar → non-bar replace (not limited by run length).
  const barReplaceFitCount = useMemo(() => {
    if (!isBarReplace || !selectedBead || selectedBead.bead_category === "bar") return 0;
    const baseline = isBarSingleReplace ? effectivePlacedBeads : withoutTargets;
    let count = 0;
    let tempList = baseline;
    while (count < 500 && beadFits(tempList, { product: selectedBead }, braceletRadius)) {
      count++;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tempList = [...tempList, { instanceId: `__fit_${count}`, product: selectedBead } as any];
    }
    return count;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBarReplace, isBarSingleReplace, selectedBead, effectivePlacedBeads, withoutTargets, braceletRadius]);

  // Default replaceQuantity to however many fit whenever a new bead is selected or fit count changes
  useEffect(() => {
    if (isBarReplace && barReplaceFitCount > 0) setReplaceQuantity(barReplaceFitCount);
    else if (editReplaceFitCount > 0) setReplaceQuantity(editReplaceFitCount);
  }, [editReplaceFitCount, isBarReplace, barReplaceFitCount]);

  const isSpacerMode = activeTab === SPACER_TAB;
  const isBarMode  = activeTab === BAR_TAB;
  const isSeedMode = activeTab === SEED_TAB;

  const radius       = BRACELET_SIZE_RADIUS[braceletSize];
  const totalArc     = braceletArc(radius);
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
    return beads
      .filter((b) => {
        const matchesSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !activeTab || isSpacerMode || isBarMode || isSeedMode || b.bead_category === activeTab;
        const matchesMaterial = !activeMaterial || b.material === activeMaterial;
        const matchesType = !activeType || b.bead_type === activeType;
        return matchesSearch && matchesCategory && matchesMaterial && matchesType;
      })
      .sort((a, b) => (a.size_mm ?? a.diameter * 1000) - (b.size_mm ?? b.diameter * 1000));
  }, [beads, search, activeTab, activeMaterial, activeType, isSpacerMode, isBarMode, isSeedMode]);

  const anyBeadFits  = filteredBeads.some((b) => beadFits(placedBeads, { product: b }, braceletRadius));
  const braceletFull = filteredBeads.length > 0 && !(availableMm >= 1 && anyBeadFits);

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
        setError(err ?? "Bracelet is already full.");
        setTimeout(() => setError(null), 3000);
      } else {
        setQuantity(1);
      }
    } else {
      for (let i = 0; i < quantity; i++) {
        err = addBead(selectedBead);
        if (err) break;
      }
      if (err) {
        setError(err);
        setTimeout(() => setError(null), 3000);
      } else {
        setQuantity(1);
      }
    }
  }

  function handleReplace() {
    if (!selectedBead || !replaceTargetInstanceId) return;
    if (isBarSingleReplace) {
      const err = replaceWithBeadsAction([replaceTargetInstanceId], selectedBead, replaceQuantity);
      if (err) { setError(err); setTimeout(() => setError(null), 3000); }
      return;
    }
    const err = replaceBeadInStore(replaceTargetInstanceId, selectedBead);
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 3000);
    }
  }

  function handleReplaceAll() {
    if (!selectedBead || !replaceAllTargetProductId) return;
    const err = replaceAllBeadsInStore(replaceAllTargetProductId, selectedBead);
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 3000);
    }
  }

  function handleEditReplace() {
    if (!selectedBead || editReplaceTargetIds.length === 0) return;
    if (isBarEditReplace) {
      const err = replaceWithBeadsAction(editReplaceTargetIds, selectedBead, replaceQuantity);
      if (err) { setError(err); setTimeout(() => setError(null), 3000); }
      return;
    }
    const isPartialFit = editReplaceFitCount > 0 && editReplaceFitCount < editReplaceTargetIds.length;
    const err = replaceEditSelectedBeadsAction(
      editReplaceTargetIds,
      selectedBead,
      isPartialFit ? replaceQuantity : undefined,
    );
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 3000);
    }
  }

  function handleAddSpacer(sizeMm: number) {
    const spacerProduct = createSpacerProduct(sizeMm);
    if (isBarReplace) {
      const barIds = isBarSingleReplace ? [replaceTargetInstanceId!] : editReplaceTargetIds;
      const baseline = isBarSingleReplace ? effectivePlacedBeads : withoutTargets;
      let count = 0;
      let tempList = baseline;
      while (count < 500 && beadFits(tempList, { product: spacerProduct as any }, braceletRadius)) {
        count++;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tempList = [...tempList, { instanceId: `__v_${count}`, product: spacerProduct } as any];
      }
      if (count === 0) { setError("The spacer is too large for the available space."); setTimeout(() => setError(null), 3000); return; }
      const err = replaceWithBeadsAction(barIds, spacerProduct as any, count);
      if (err) { setError(err); setTimeout(() => setError(null), 3000); }
      return;
    }
    const err = addBead(spacerProduct as any);
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 3000);
    }
  }

  function handleAddBar(bar: BeadProduct) {
    const err = addBead(bar);
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 3000);
    }
  }

  function handleReplaceBar(product: BeadProduct) {
    if (replaceTargetInstanceId) {
      const err = replaceBeadInStore(replaceTargetInstanceId, product);
      if (err) {
        setError(err);
        setTimeout(() => setError(null), 3000);
      }
      return;
    }
    if (editReplaceMode && editReplaceTargetIds.length > 0) {
      const err = replaceEditSelectedBeadsAction(editReplaceTargetIds, product);
      if (err) {
        setError(err);
        setTimeout(() => setError(null), 3000);
      }
    }
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
    const product = createSeedSegmentProduct(arcMm, randomSeed, seedShape, roundSizeMm, material);
    const isRound = seedShape === "round";
    const seedConfig: SeedSegmentConfig = {
      colorway,
      arc_length_mm: arcMm,
      bead_size_range: (seedSizeMm ? seedBeadSizeRange(seedSizeMm) : SEED_BEAD_SIZE_RANGE) as [number, number],
      random_seed: randomSeed,
      ...(isRound
        ? { seed_shape: "round" as const, round_size_mm: roundSizeMm ?? 2 }
        : { seed_size_mm: seedSizeMm ?? 1 }),
    };
    if (isBarReplace) {
      const barIds = isBarSingleReplace ? [replaceTargetInstanceId!] : editReplaceTargetIds;
      const err = replaceBarWithSeedSegmentAction(barIds, product as any, seedConfig);
      if (err) { setError(err); setTimeout(() => setError(null), 3000); }
      return;
    }
    const err = addSeedSegment(product as any, seedConfig);
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 3000);
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
    <Panel open={isOpen} onClose={onClose} title="Bead Selector" direction="left" overflowYScroll={false} className="bottom-0 h-auto">
      <div className="flex flex-col h-full overflow-y-scroll border-b border-default">

        {/* Search — hidden in spacer/bar/seed mode */}
        {!isSpacerMode && !isBarMode && !isSeedMode && (
          <div className={`pt-4 ${panelGapClass}`}>
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
        <ScrollableRow className="py-3 min-h-14" trackClassName="gap-2">
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

        <div key={activeTab ?? "__all"} className="animate-tab-in">
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
            maxArcMm={isBarReplace ? barFreedArcMm : undefined}
            isReplaceMode={isBarReplace}
          />
        ) : isSeedMode ? (
          <SeedBeadPicker
            onAdd={handleAddSeedSegment}
            error={error}
            onManageColors={onManageSeedColors}
            maxArcMm={isBarReplace ? barFreedArcMm : undefined}
            isReplaceMode={isBarReplace}
          />
        ) : (
          /* ── Normal bead selector ── */
          <>
            {/* Filter dropdowns + active chips */}
            <div className={`pb-3 border-b border-default flex flex-col gap-2 ${panelGapClass}`}>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Filter by material"
                  value={activeMaterial}
                  onChange={(e) => setActiveMaterial(e.target.value)}
                  className="flex-1 rounded-[2px] border border-default bg-white px-3 py-2 text-sm text-color-base/70 outline-none focus:border-navy focus:ring-navy"
                >
                  <option value="">All materials</option>
                  {materials.map((mat) => (
                    <option key={mat} value={mat}>{capitalize(mat)}</option>
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
                      {capitalize(activeMaterial)}
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
            <div className={`flex-1 py-3 overflow-y-scroll ${panelGapClass}`}>
              {filteredBeads.length === 0 ? (
                <p className="text-xs text-color-base/50 text-center py-8">
                  No beads match your filters.
                </p>
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
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className={`shrink-0 border-t border-default/50 pt-4 pb-5 space-y-3 ${panelGapClass}`}>
              {error && <ErrorAlert message={error} />}

              {filteredBeads.length === 0 || (isEditReplace && editSelectionGroups.length > 0 && editReplaceTargetIds.length === 0) || (isReplaceMode ? filteredBeads.some(b => candidateFits(b)) : availableMm >= 1 && filteredBeads.some(b => candidateFits(b))) ? (
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
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setReplaceQuantity(q => Math.max(1, q - 1))}
                            disabled={replaceQuantity <= 1}
                            className="w-5 h-5 flex items-center justify-center rounded-[2px] border border-default text-color-base/60 hover:bg-light-grey disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none"
                          >−</button>
                          <span className="w-5 text-center text-[11px] font-medium tabular-nums">{replaceQuantity}</span>
                          <button
                            onClick={() => setReplaceQuantity(q => Math.min(editReplaceFitCount, q + 1))}
                            disabled={replaceQuantity >= editReplaceFitCount}
                            className="w-5 h-5 flex items-center justify-center rounded-[2px] border border-default text-color-base/60 hover:bg-light-grey disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none"
                          >+</button>
                        </div>
                      </div>
                    )}
                    {isBarReplace && selectedBead?.bead_category !== "bar" && barReplaceFitCount > 1 && (
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-color-base/50">
                          Up to {barReplaceFitCount} will fit
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setReplaceQuantity(q => Math.max(1, q - 1))}
                            disabled={replaceQuantity <= 1}
                            className="w-5 h-5 flex items-center justify-center rounded-[2px] border border-default text-color-base/60 hover:bg-light-grey disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none"
                          >−</button>
                          <span className="w-5 text-center text-[11px] font-medium tabular-nums">{replaceQuantity}</span>
                          <button
                            onClick={() => setReplaceQuantity(q => Math.min(barReplaceFitCount, q + 1))}
                            disabled={replaceQuantity >= barReplaceFitCount}
                            className="w-5 h-5 flex items-center justify-center rounded-[2px] border border-default text-color-base/60 hover:bg-light-grey disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none"
                          >+</button>
                        </div>
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