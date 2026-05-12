"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import type { BeadProduct } from "@/types";

interface BeadSelectorProps {
  beads: BeadProduct[];
}

function unique<T>(arr: (T | undefined)[]): T[] {
  return [...new Set(arr.filter((v): v is T => v !== undefined))];
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm transition-all ${
        active
          ? "border-neutral-800 bg-neutral-800 text-white"
          : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
      }`}
    >
      {label}
    </button>
  );
}

export function BeadSelector({ beads }: BeadSelectorProps) {
  const addBead = useStore((s) => s.addBead);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeSize, setActiveSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // ── Derived filter options ─────────────────────────────────────────────

  const categories = useMemo(
    () => unique(beads.map((b) => b.beadCategory)),
    [beads]
  );

  const filteredByCategory = useMemo(
    () => activeCategory ? beads.filter((b) => b.beadCategory === activeCategory) : beads,
    [beads, activeCategory]
  );

  const materials = useMemo(
    () => unique(filteredByCategory.map((b) => b.material)),
    [filteredByCategory]
  );

  const filteredByMaterial = useMemo(
    () => activeMaterial ? filteredByCategory.filter((b) => b.material === activeMaterial) : filteredByCategory,
    [filteredByCategory, activeMaterial]
  );

  const types = useMemo(
    () => unique(filteredByMaterial.map((b) => b.beadType)),
    [filteredByMaterial]
  );

  const filteredByType = useMemo(
    () => activeType ? filteredByMaterial.filter((b) => b.beadType === activeType) : filteredByMaterial,
    [filteredByMaterial, activeType]
  );

  const sizes = useMemo(
    () => unique(filteredByType.map((b) => b.sizeMm)).sort((a, b) => a - b),
    [filteredByType]
  );

  const filteredBySize = useMemo(
    () => activeSize ? filteredByType.filter((b) => b.sizeMm === activeSize) : filteredByType,
    [filteredByType, activeSize]
  );

  const hasSelection = activeCategory !== null || activeMaterial !== null || activeType !== null || activeSize !== null;

  const matchedBead: BeadProduct | null = hasSelection ? (filteredBySize[0] ?? null) : null;

  // ── Helpers ───────────────────────────────────────────────────────────

  function resetFrom(level: "category" | "material" | "type") {
    if (level === "category") { setActiveMaterial(null); setActiveType(null); setActiveSize(null); }
    if (level === "material") { setActiveType(null); setActiveSize(null); }
    if (level === "type")     { setActiveSize(null); }
    setQuantity(1);
  }

  function handleAddToDesign() {
    if (!matchedBead) return;
    let err: string | null = null;
    for (let i = 0; i < quantity; i++) {
      err = addBead(matchedBead);
      if (err) break;
    }
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 3000);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex border-b border-neutral-100 shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory((prev) => prev === cat ? null : cat);
                resetFrom("category");
              }}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeCategory === cat
                  ? "border-neutral-800 text-neutral-800"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}
            >
              {capitalize(cat)}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

        {/* Material */}
        {materials.length > 0 && (
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Material</p>
            <div className="flex flex-wrap gap-2">
              {materials.map((mat) => (
                <FilterPill
                  key={mat}
                  label={capitalize(mat)}
                  active={activeMaterial === mat}
                  onClick={() => {
                    setActiveMaterial((prev) => prev === mat ? null : mat);
                    resetFrom("material");
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bead type */}
        {types.length > 0 && (
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Bead type</p>
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <FilterPill
                  key={type}
                  label={type}
                  active={activeType === type}
                  onClick={() => {
                    setActiveType((prev) => prev === type ? null : type);
                    resetFrom("type");
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Size */}
        {sizes.length > 0 && (
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Bead size (mm)</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <FilterPill
                  key={size}
                  label={String(size)}
                  active={activeSize === size}
                  onClick={() => setActiveSize((prev) => prev === size ? null : size)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Matched bead preview */}
        {matchedBead && (
          <div className="rounded-xl bg-neutral-50 p-4 space-y-1">
            <p className="text-xs font-semibold text-neutral-800">
              {matchedBead.name}
            </p>
            <p className="text-[11px] text-neutral-400">
              {[
                matchedBead.sizeMm && `${matchedBead.sizeMm}mm`,
                matchedBead.material,
                matchedBead.beadType,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )}

        {/* No match */}
        {filteredBySize.length === 0 &&
          (activeCategory || activeMaterial || activeType || activeSize) && (
            <p className="text-xs text-neutral-400 text-center py-4">
              No beads match these filters.
            </p>
          )}

      </div>

      {/* Quantity + Add to design */}
      <div className="shrink-0 border-t border-neutral-100 px-5 py-4">
        {error && (
          <p className="text-xs text-red-500 text-center mb-2">{error}</p>
        )}
        <div className="flex items-end gap-3">

          {/* Quantity */}
          <div>
            <p className="text-xs text-neutral-500 mb-1.5">Quantity</p>
            <div className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="text-neutral-400 hover:text-neutral-700"
              >
                −
              </button>
              <span className="text-sm font-medium text-neutral-800 w-4 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="text-neutral-400 hover:text-neutral-700"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to design */}
          <button
            onClick={handleAddToDesign}
            disabled={!matchedBead}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✦ Add to design
          </button>
        </div>
      </div>

    </div>
  );
}