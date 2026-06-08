"use client";

import { useState, useMemo, useRef } from "react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { RotateCcw, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { capitalize } from "@/lib/utils";
import type { BeadProduct } from "@/types";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Plus } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

interface BeadSelectorPanelProps {
  beads: BeadProduct[];
  isOpen: boolean;
  onClose: () => void;
}


function BeadThumbnail({ bead }: { bead: BeadProduct }) {
  const [failed, setFailed] = useState(false);

  if (failed || bead.bead_type == null) {
    return (
      <>
      <div
        className="rounded-full"
        style={{
          width: "30px",
          height: "30px",
          background: "radial-gradient(circle at 35% 35%, #f5d87e, #c8980a)",
        }}
      >
          <Plus size={16} />
        </div>
      </>
    );
  } else {
    const src = `/images/${bead.slug}-thumbnail.png`;
    return (
      <img
        src={src}
        alt={bead.name}
        width={38}
        style={{ height: "auto" }}
        onError={() => setFailed(true)}
      />
    );
  }
}

function BeadCard({ bead, selected, onClick, canEdit }: {
  bead: BeadProduct; selected: boolean; onClick: () => void; canEdit: boolean;
}) {
  const setDragFromPanel = useStore((s) => s.setDragFromPanel);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const size = bead.size_mm ?? 4;

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    didDragRef.current = false;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!startRef.current || didDragRef.current || !canEdit) return;
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
    if (!didDragRef.current) onClick();
  }

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      className={`flex flex-col gap-1 rounded-md border transition-all overflow-hidden ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-default"} ${
        selected
          ? "ring-2 ring-gold border-gold shadow-sm"
          : "border-default bg-white hover:border-neutral-400"
      }`}
    >
      <div className="bg-light-grey p-2 min-h-[70px] w-full items-center flex justify-center">
        <BeadThumbnail bead={bead} />
      </div>
      <div className="flex flex-col pt-[2px] pb-2 text-left px-2">
        <span className="text-[12px]">{bead.bead_type}</span>
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
        className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm transition-all ${
          active
            ? "border-navy bg-navy text-white font-medium"
            : "border-default bg-white text-color-base hover:border-navy hover:bg-mint"
        }`}
      >
        {label}
      </button>
    );
  }

export function BeadSelectorPanel({ beads, isOpen, onClose }: BeadSelectorPanelProps) {
  const addBead = useStore((s) => s.addBead);
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: ["beads"] });
  const { canEdit } = usePermissions();

  const [search, setSearch] = useState("");
  const [activeMaterial, setActiveMaterial] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>("");
  const [selectedBead, setSelectedBead] = useState<BeadProduct | null>(null);
  const [fillFull, setFillFull] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const materials = useMemo(
    () => [...new Set(beads.map((b) => b.material).filter(Boolean))] as string[],
    [beads]
  );

  const bead_types = useMemo(() => {
    const pool = activeMaterial
      ? beads.filter((b) => b.material === activeMaterial)
      : beads;
    return [...new Set(pool.map((b) => b.bead_type).filter(Boolean))] as string[];
  }, [beads, activeMaterial]);

  const filteredBeads = useMemo(() => {
    return beads.filter((b) => {
      const matchesSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
      const matchesMaterial = !activeMaterial || b.material === activeMaterial;
      const matchesType = !activeType || b.bead_type === activeType;
      return matchesSearch && matchesMaterial && matchesType;
    });
  }, [beads, search, activeMaterial, activeType]);

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

  function handleSelectBead(bead: BeadProduct) {
    if (selectedBead?.id === bead.id) {
      setSelectedBead(null);
    } else {
      setSelectedBead(bead);
      setQuantity(1);
    }
  }

  return (
    <Panel open={isOpen} onClose={onClose} title="Bead Selector" direction="left">
      <div className="flex flex-col h-full">

        {/* Search */}
        <div className="px-5 pt-4 pb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search item name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-default py-2.5 pl-4 pr-16 text-sm outline-none placeholder:text-color-base/70 focus:outline-gold focus:ring-gold"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["beads"] })}
                disabled={isFetching > 0}
                className="rounded p-1 text-color-base/50 hover:text-color-base hover:bg-light-grey disabled:opacity-40 transition-colors"
                aria-label="Refresh beads"
                title="Refresh beads"
              >
                <RotateCcw size={13} className={isFetching > 0 ? "animate-spin" : ""} />
              </button>
              <Search size={16} className="text-color-base/50 mr-1" />
            </div>
          </div>
        </div>

        {/* Material pills */}
        <div className="flex gap-2 px-5 pb-3 overflow-x-scroll min-h-[50px] picker-scroll">
          <MaterialPill
            label="All"
            active={activeMaterial === null}
            onClick={() => { setActiveMaterial(null); setActiveType(""); }}
          />
          {materials.map((mat) => (
            <MaterialPill
              key={mat}
              label={capitalize(mat)}
              active={activeMaterial === mat}
              onClick={() => {
                setActiveMaterial((prev) => (prev === mat ? null : mat));
                setActiveType("");
              }}
            />
          ))}
        </div>

        {/* Type dropdown */}
        <div className="px-5 pb-4">
          <select
            id="bead-type-select"
            aria-label="Filter Beads by Bead Type"
            value={activeType}
            onChange={(e) => setActiveType(e.target.value)}
            className="rounded-lg border border-default bg-white px-3 py-2 pr-6 min-w-[150px] text-sm text-color-base/70 outline-none focus:border-neutral-400"
          >
            <option value="">Filter by type</option>
            {bead_types.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Bead grid */}
        <div className="flex-1 px-5 pb-4 overflow-visible">
          {filteredBeads.length === 0 ? (
            <p className="text-xs text-color-base/50 text-center py-8">
              No beads match your filters.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filteredBeads.map((bead) => (
                <BeadCard
                  key={bead.id}
                  bead={bead}
                  selected={selectedBead?.id === bead.id}
                  onClick={() => handleSelectBead(bead)}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="shrink-0 border-t border-default/50 px-5 pt-4 pb-5 space-y-3">

          <p className="text-[12px] tracking-wider uppercase font-bold text-color-base/70 mb-1">
            {selectedBead?.name ? "Item Selected" : "Select a bead"}
          </p>

          <div className="flex items-center gap-3">

            {/* Preview */}
            {/*<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-default bg-neutral-50">
              {selectedBead ? (
                <div
                  className="rounded-full"
                  style={{
                    width: Math.max(10, Math.min(28, (selectedBead.size_mm ?? 4) * 3.5)),
                    height: Math.max(10, Math.min(28, (selectedBead.size_mm ?? 4) * 3.5)),
                    background: "radial-gradient(circle at 35% 35%, #f5d87e, #c8980a)",
                  }}
                />
              ) : (
                <div className="h-4 w-4 rounded-full bg-light-grey" />
              )}
            </div>*/}

            {/* Bead name + size */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-[15px] font-medium  ">
                {selectedBead?.bead_type ?? ""}
              </p>
              <p className="text-[12px] text-color-base/70">
                {selectedBead?.size_mm ? `${selectedBead.size_mm}mm` : "—"}
              </p>
            </div>

            { selectedBead && (
              <>
              {/* Fill entire bracelet checkbox */}
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-color-base/70 mr-1">
                <input
                  type="checkbox"
                  checked={fillFull}
                  onChange={(e) => setFillFull(e.target.checked)}
                  className="form-checkbox rounded-xs w-4 h-4 bg-grey border-none text-navy focus:ring-grey focus:ring-1"
                />
                Fill full bracelet?
              </label>

              {/* Quantity input */}
              {!fillFull && (
                <div className="flex shrink-0 items-center gap-1.5 text-xs text-color-base/70">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value))))}
                    className="w-14 rounded border border-default px-2 py-1.5 text-center text-sm outline-none focus:border-default/50"
                  />
                </div>
              )}
              </>
            )}
          </div>

          {error && <ErrorAlert message={error} />}

          {canEdit && (
            <Button
              onClick={handleAddToDesign}
              disabled={!selectedBead}
              variant="secondary"
              className="flex w-full items-center justify-center gap-2 disabled"
            >
              ✦ Add to design
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}