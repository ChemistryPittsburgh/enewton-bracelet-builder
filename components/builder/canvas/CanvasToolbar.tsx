"use client";

/**
 * CanvasToolbar.tsx
 *
 * Toolbar that floats at the top of the 3D canvas.
 * UI Shell only
 *
 * Left:   (empty)
 * Centre: 3D / Line view toggle
 * Right:  Edit + Comments buttons
 */

import { List, Pencil } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDesign } from "@/hooks/useDesign";
import { usePermissions } from "@/hooks/usePermissions";

interface CanvasToolbarProps {
  commentsOpen?: boolean;
  onCommentsClick?: () => void;
}

export function CanvasToolbar({ commentsOpen = false, onCommentsClick }: CanvasToolbarProps) {
  const { isEditMode, toggleEditMode, viewMode, setViewMode, activeDesignId } = useStore((s) => ({
    isEditMode: s.isEditMode,
    toggleEditMode: s.toggleEditMode,
    viewMode: s.viewMode,
    setViewMode: s.setViewMode,
    activeDesignId: s.activeDesignId,
  }));
  const { canEdit } = usePermissions();
  const { data: savedDesign } = useDesign(activeDesignId);
  const isLocked = savedDesign?.status === "approved" || savedDesign?.status === "published";

  const canvasToolbarRightWidth = canEdit ? 150 : 250;

  return (
    <div className="flex flex-col gap-2 pointer-events-none relative z-20">

      {/* Main toolbar row */}
      <div className="relative flex justify-between pointer-events-auto bg-white shadow-sm">

        {/* 3D / Line toggle */}
        <div className="flex items-center justify-center py-3 flex-1"
        style={{ paddingLeft: canvasToolbarRightWidth }}>
          <div className="flex rounded-xl border border-neutral-200 bg-white min-w-[140px] overflow-hidden">
            {(["3D", "Line"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode === "3D" ? "3D" : "line")}
                title={`${mode} View`}
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

        {/* Right — Edit + Comments */}
        <div className="flex items-center gap-2 shrink-0 justify-end border-l border-neutral-200 px-3 lg:pr-6 py-2"
        style={{ minWidth: canvasToolbarRightWidth }}>
          {canEdit && !isLocked && (
            <button
              onClick={toggleEditMode}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                isEditMode
                  ? "border-blue-300 bg-blue-50 text-blue-600"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
              aria-label={isEditMode ? "Exit edit mode" : "Edit bead order"}
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
          <button
            onClick={onCommentsClick}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              commentsOpen
                ? "bg-neutral-700 text-white"
                : "bg-neutral-500 text-white hover:bg-neutral-600"
            }`}
            aria-label="Open comments"
          >
            <List size={14} />
            Comments
          </button>
        </div>

      </div>

    </div>
  );
}