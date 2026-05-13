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
    <div className="flex flex-col gap-2 pointer-events-none">

      {/* Main toolbar row */}
      <div className="flex justify-between pointer-events-auto bg-white shadow-sm">

        {/* Left — Undo / Redo */}
        <div className="flex items-center divide-x divide-neutral-200 m-0 overflow-hidden">
          <button
            disabled
            className="flex items-center border-r border-neutral-200 justify-center px-5 py-4 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Undo"
          >
            <Undo2 size={24} />
          </button>
          <button
            disabled
            className="flex items-center border-r border-neutral-200 justify-center px-5 py-4 text-neutral-500 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Redo"
          >
            <Redo2 size={24} />
          </button>
        </div>

        {/* Centre — 3D / Line toggle */}
        <div className="flex items-center">
          <div className="flex rounded-xl border border-neutral-200 bg-white min-w-[140px] overflow-hidden">
            {(["3D", "Line"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-5 py-1.5 flex-1 text-sm font-semibold transition-all ${
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