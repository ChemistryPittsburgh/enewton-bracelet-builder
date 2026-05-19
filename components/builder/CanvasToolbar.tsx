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

import { Pencil } from "lucide-react";
import { useStore } from "@/lib/store";

export function CanvasToolbar() {
  const { isEditMode, toggleEditMode, viewMode, setViewMode } = useStore((s) => ({
    isEditMode: s.isEditMode,
    toggleEditMode: s.toggleEditMode,
    viewMode: s.viewMode,
    setViewMode: s.setViewMode,
  }));

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
                onClick={() => setViewMode(mode === "3D" ? "3D" : "line")}
                className={`px-5 py-2 flex-1 text-sm font-semibold transition-all ${
                  (mode === "3D" ? "3D" : "line") === viewMode
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
          onClick={toggleEditMode}
          className={`flex border-l min-w-[70px] border-neutral-200 items-center justify-center px-3 py-2.5 transition-colors ${
            isEditMode
              ? "bg-blue-50 text-blue-600"
              : "text-neutral-500 hover:bg-neutral-100"
          }`}
          aria-label={isEditMode ? "Exit edit mode" : "Edit bead order"}
        >
          <Pencil size={24} />
        </button>

      </div>

    </div>
  );
}