"use client";

/**
 * CanvasToolbar.tsx
 *
 * Toolbar that floats at the top of the 3D canvas.
 * UI Shell only
 *
 * Left:   Undo / Redo
 * Centre: 3D / Line view toggle
 * Right:  Edit button
 * Below:  Light mode dropdown
 */

import { useState } from "react";
import { Undo2, Redo2, Pencil, Eye, ChevronDown } from "lucide-react";

export function CanvasToolbar() {
  const [viewMode, setViewMode] = useState<"3D" | "Line">("3D");

  return (
    <div className="flex flex-col gap-2 pointer-events-none relative z-20">

      {/* Main toolbar row */}
      <div className="flex justify-between pointer-events-auto bg-white shadow-sm">

        {/* Centre — 3D / Line toggle */}
        <div className="flex items-center justify-center py-3 flex-1">
          <div className="flex rounded-xl border border-neutral-200 bg-white min-w-[140px] overflow-hidden">
            {(["3D", "Line"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-5 py-2 flex-1 text-sm font-semibold transition-all ${
                  viewMode === mode
                    ? "bg-neutral-600 text-white"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Right — Edit */}
        <button
            className="flex border-l min-w-[70px] border-neutral-200 items-center justify-center px-3 py-2.5 text-neutral-500 hover:bg-neutral-100 transition-colors"
            aria-label="Edit"
          >
          <Pencil size={24} />
        </button>

      </div>

    </div>
  );
}