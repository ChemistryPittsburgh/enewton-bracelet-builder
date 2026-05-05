"use client";

/**
 * BeadPicker.tsx
 *
 * Shows available bead products. Clicking one adds it to the bracelet.
 * Click a bead in the 3D scene to remove it.
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { BeadProduct } from "@/types";

interface BeadPickerProps {
  beads: BeadProduct[];
}

export function BeadPicker({ beads }: BeadPickerProps) {
  const [error, setError] = useState<string | null>(null);
  const addBead = useStore((s) => s.addBead);

  function handleAdd(bead: BeadProduct) {
    const err = addBead(bead);
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 3000);
    }
  }

  return (
    <div className="px-4 py-3">

      {/* Hint text */}
      <p className="mb-2 text-[11px] text-neutral-400">
        Tap a bead to add it · Tap a bead in the scene to remove it
      </p>

      {/* Error */}
      {error && (
        <p className="mb-2 text-[11px] text-red-500">{error}</p>
      )}

      {/* Bead options */}
      <div className="flex gap-3 overflow-x-auto picker-scroll pb-1">
        {beads.map((bead) => (
          <button
            key={bead.id}
            onClick={() => handleAdd(bead)}
            className="group flex shrink-0 flex-col items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-all hover:border-neutral-400 hover:shadow-sm active:scale-95"
          >
            {/* Placeholder circle — swap for a real thumbnail image later */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200 transition-colors">
              <Plus size={16} />
            </div>

            <span className="max-w-[96px] text-center text-[11px] leading-tight text-neutral-700">
              {bead.name}
            </span>
          </button>
        ))}
      </div>

    </div>
  );
}
