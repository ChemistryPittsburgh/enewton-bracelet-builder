"use client";

import { useState, useMemo, useRef } from "react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { Search, X, Dot, Sparkle } from "lucide-react";
import { useStore } from "@/lib/store";
import { capitalize, unslugify } from "@/lib/utils";
import type { BeadProduct, SeedColorEntry } from "@/types";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { BeadThumbnail } from "@/components/ui/BeadThumbnail";
import { SectionHeading } from "@/components/ui/SectionHeading";

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
const SEED_TAB = "__seed__";

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
          ? "border-default bg-light-grey/50 opacity-40 cursor-not-allowed"
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
  const placedBeads = useStore((s) => s.beads);
  const braceletSize = useStore((s) => s.braceletSize);
  const braceletRadius = BRACELET_SIZE_RADIUS[braceletSize];
  const { canEdit } = usePermissions();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<string>("");
  const [selectedBead, setSelectedBead] = useState<BeadProduct | null>(null);
  const [fillFull, setFillFull] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const isSpacerMode = activeTab === SPACER_TAB;
  const isSeedMode = activeTab === SEED_TAB;

  const radius       = BRACELET_SIZE_RADIUS[braceletSize];
  const totalArc     = braceletArc(radius);
  const used         = usedArc(placedBeads);
  const availableMm  = Math.max(0, Math.round((totalArc - used) * 1000 * 10) / 10);

  const beadCategories = useMemo(
    () => [...new Set(beads.map((b) => b.bead_category).filter(Boolean))] as string[],
    [beads],
  );

  const materials = useMemo(() => {
    const pool = activeTab && !isSpacerMode && !isSeedMode
      ? beads.filter((b) => b.bead_category === activeTab)
      : beads;
    return [...new Set(pool.map((b) => b.material).filter(Boolean))] as string[];
  }, [beads, activeTab, isSpacerMode, isSeedMode]);

  const beadTypes = useMemo(() => {
    const pool = activeTab && !isSpacerMode && !isSeedMode
      ? beads.filter((b) => b.bead_category === activeTab)
      : beads;
    return [...new Set(pool.map((b) => b.bead_type).filter(Boolean))] as string[];
  }, [beads, activeTab, isSpacerMode, isSeedMode]);

  const filteredBeads = useMemo(() => {
    return beads
      .filter((b) => {
        const matchesSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !activeTab || isSpacerMode || isSeedMode || b.bead_category === activeTab;
        const matchesMaterial = !activeMaterial || b.material === activeMaterial;
        const matchesType = !activeType || b.bead_type === activeType;
        return matchesSearch && matchesCategory && matchesMaterial && matchesType;
      })
      .sort((a, b) => (a.size_mm ?? a.diameter * 1000) - (b.size_mm ?? b.diameter * 1000));
  }, [beads, search, activeTab, activeMaterial, activeType, isSpacerMode, isSeedMode]);

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

  function handleAddSpacer(sizeMm: number) {
    const spacer = createSpacerProduct(sizeMm);
    const err = addBead(spacer as any);
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 3000);
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
    const seedConfig = {
      colorway,
      arc_length_mm: arcMm,
      bead_size_range: (seedSizeMm ? seedBeadSizeRange(seedSizeMm) : SEED_BEAD_SIZE_RANGE) as [number, number],
      random_seed: randomSeed,
      ...(isRound
        ? { seed_shape: "round" as const, round_size_mm: roundSizeMm ?? 2 }
        : { seed_size_mm: seedSizeMm ?? 1 }),
    };
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

        {/* Search — hidden in spacer/seed mode */}
        {!isSpacerMode && !isSeedMode && (
          <div className="px-5 pt-4">
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
        <div className="flex gap-2 px-5 py-3 flex-wrap picker-scroll">
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
            label="Seed"
            active={isSeedMode}
            onClick={() => {
              setActiveTab((prev) => (prev === SEED_TAB ? null : SEED_TAB));
              setActiveMaterial("");
              setActiveType(null);
              setSelectedBead(null);
            }}
          />
        </div>

        {isSpacerMode ? (
          <SpacerPicker onAdd={handleAddSpacer} error={error} />
        ) : isSeedMode ? (
          <SeedBeadPicker onAdd={handleAddSeedSegment} error={error} onManageColors={onManageSeedColors} />
        ) : (
          /* ── Normal bead selector ── */
          <>
            {/* Filter dropdowns + active chips */}
            <div className="px-5 pb-3 border-b border-default flex flex-col gap-2">
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
                      <button onClick={() => setActiveMaterial("")} className="ml-0.5 opacity-60 hover:opacity-100" aria-label="Remove material filter">
                        <X size={11} />
                      </button>
                    </span>
                  )}
                  {activeType && (
                    <span className="inline-flex items-center gap-1 rounded-[2px] bg-gold/30 px-2 py-0.5 text-xs font-medium text-color-base/80">
                      {activeType}
                      <button onClick={() => setActiveType(null)} className="ml-0.5 opacity-60 hover:opacity-100" aria-label="Remove type filter">
                        <X size={11} />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bead grid */}
            <div className="flex-1 px-5 py-3 overflow-y-scroll">
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
                      disabled={!beadFits(placedBeads, { product: bead }, braceletRadius)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="shrink-0 border-t border-default/50 px-5 pt-4 pb-5 space-y-3">
              {error && <ErrorAlert message={error} />}

              {filteredBeads.length === 0 || (availableMm >= 1 && filteredBeads.some(b => beadFits(placedBeads, { product: b }, braceletRadius))) ? (
                <>
                <p className="text-[12px] tracking-wider uppercase font-bold text-color-base/70 mb-1">
                  {selectedBead?.name ? "Item Selected" : "Select a bead"}
                </p>

                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[15px] font-medium">
                      {selectedBead?.bead_type ?? ""}
                    </p>
                    <p className="text-[12px] text-color-base/70 flex items-center">
                      {selectedBead?.size_mm ? `${selectedBead.size_mm}mm` : "—"}
                      {selectedBead?.color && (
                        <span className="flex items-center gap-0.5">
                          <Dot size={10} />
                          {capitalize(selectedBead.color)}
                        </span>
                      )}
                    </p>
                  </div>

                  {selectedBead && (
                    <>
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
                    </>
                  )}
                </div>

                {canEdit && (
                  <Button
                    onClick={handleAddToDesign}
                    disabled={!selectedBead || !beadFits(placedBeads, { product: selectedBead }, braceletRadius)}
                    className="flex w-full items-center justify-center gap-2 disabled group"
                  >
                    <Sparkle size={12} className="-mt-[2.5px] fill-white group-hover:fill-navy stroke-white group-hover:fill-navy group-hover:stroke-navy transition-colors" />
                    Add to design
                  </Button>
                )}
                </>
              ) : (
                <div className="rounded-[2px] border border-error/20 bg-error/5 px-4 py-3 text-center">
                  <SectionHeading className="text-error mb-1">Bracelet is full</SectionHeading>
                  <p className="text-xs text-color-base/80 mt-0">No more items can fit. Remove beads to free up space.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}