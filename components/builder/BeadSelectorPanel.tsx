"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { capitalize } from "@/lib/utils";
import type { BeadProduct } from "@/types";

import { StringDetailsSelector } from "./StringDetailsSelector";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

import Image from 'next/image';

interface BeadSelectorPanelProps {
  beads: BeadProduct[];
  isOpen: boolean;
  onClose: () => void;
}


function BeadThumbnail({ bead }: { bead: BeadProduct }) {
  const [failed, setFailed] = useState(false);

  if (failed || bead.beadType == null) {
    return (
      <>
      <div
        className="rounded-full"
        style={{
          width: circlePx,
          height: circlePx,
          background: "radial-gradient(circle at 35% 35%, #f5d87e, #c8980a)",
        }}
      >
          <Plus size={16} />
        </div>
      </>
    );
  } else {
    const src = `/images/${bead.id.toLowerCase()}-thumbnail.png`;
    return (
      <img
        src={src}
        alt={bead.name}
        width={64}
        height={64}
        className="h-auto max-w-[30px]"
        onError={() => setFailed(true)}
      />
    );
  }
}

function BeadCard({ bead, selected, onClick }: {
  bead: BeadProduct; selected: boolean; onClick: () => void;
}) {
  const size = bead.sizeMm ?? 4;
  const circlePx = Math.max(14, Math.min(44, size * 5.5));

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border py-4 transition-all ${
        selected
          ? "border-neutral-800 bg-neutral-50 shadow-sm"
          : "border-neutral-200 bg-white hover:border-neutral-400"
      }`}
    >
      <BeadThumbnail bead={bead} />
      <span className="text-[11px] text-neutral-500">{size} mm</span>
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
            ? "border-neutral-800 bg-white font-medium text-neutral-900"
            : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400"
        }`}
      >
        {label}
      </button>
    );
  }

export function BeadSelectorPanel({ beads, isOpen, onClose }: BeadSelectorPanelProps) {
  const addBead = useStore((s) => s.addBead);

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

  const beadTypes = useMemo(() => {
    const pool = activeMaterial
      ? beads.filter((b) => b.material === activeMaterial)
      : beads;
    return [...new Set(pool.map((b) => b.beadType).filter(Boolean))] as string[];
  }, [beads, activeMaterial]);

  const filteredBeads = useMemo(() => {
    return beads.filter((b) => {
      const matchesSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
      const matchesMaterial = !activeMaterial || b.material === activeMaterial;
      const matchesType = !activeType || b.beadType === activeType;
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
      }
    } else {
      for (let i = 0; i < quantity; i++) {
        err = addBead(selectedBead);
        if (err) break;
      }
      if (err) {
        setError(err);
        setTimeout(() => setError(null), 3000);
      }
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
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 pl-4 pr-10 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
            />
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>

        {/* Material pills */}
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto picker-scroll">
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
            value={activeType}
            onChange={(e) => setActiveType(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 outline-none focus:border-neutral-400"
          >
            <option value="">Filter type</option>
            {beadTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Bead grid */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {filteredBeads.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-8">
              No beads match your filters.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filteredBeads.map((bead) => (
                <BeadCard
                  key={bead.id}
                  bead={bead}
                  selected={selectedBead?.id === bead.id}
                  onClick={() => setSelectedBead((prev) => prev?.id === bead.id ? null : bead)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="shrink-0 border-t border-neutral-100 px-5 pt-4 pb-5 space-y-3">

          <p className="text-[12px] tracking-wider uppercase font-bold text-neutral-500 mb-1">
            {selectedBead?.name ? "Item Selected" : "Select a bead"}
          </p>

          <div className="flex items-center gap-3">

            {/* Preview */}
            {/*<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
              {selectedBead ? (
                <div
                  className="rounded-full"
                  style={{
                    width: Math.max(10, Math.min(28, (selectedBead.sizeMm ?? 4) * 3.5)),
                    height: Math.max(10, Math.min(28, (selectedBead.sizeMm ?? 4) * 3.5)),
                    background: "radial-gradient(circle at 35% 35%, #f5d87e, #c8980a)",
                  }}
                />
              ) : (
                <div className="h-4 w-4 rounded-full bg-neutral-200" />
              )}
            </div>*/}

            {/* Bead name + size */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-[15px] font-medium text-neutral-800">
                {selectedBead?.beadType ?? ""}
              </p>
              <p className="text-[12px] text-neutral-500">
                {selectedBead?.sizeMm ? `${selectedBead.sizeMm}mm` : "—"}
              </p>
            </div>

            {/* Fill entire bracelet checkbox */}
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-neutral-600 mr-1">
              <input
                type="checkbox"
                checked={fillFull}
                onChange={(e) => setFillFull(e.target.checked)}
                className="rounded"
              />
              Fill full bracelet?
            </label>

            {/* Quantity input */}
            {!fillFull && (
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-600">
                <span>Quantity</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value))))}
                  className="w-14 rounded border border-neutral-200 px-2 py-1.5 text-center text-sm outline-none focus:border-neutral-400"
                />
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleAddToDesign}
            disabled={!selectedBead}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✦ Add to design
          </button>
        </div>
      </div>
    </Panel>
  );
}
