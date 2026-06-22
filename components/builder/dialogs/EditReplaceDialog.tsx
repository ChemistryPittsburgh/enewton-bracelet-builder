"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { EDIT_REPLACE_GROUPS } from "@/lib/constants";
import type { BeadProduct } from "@/types";
import { cn } from "@/lib/utils";

export function EditReplaceDialog() {
  const {
    isEditMode,
    editReplaceMode,
    editSelectedIds,
    editReplaceNarrowedIds,
    beads,
    setEditReplaceNarrowedIds,
    cancelReplaceMode,
  } = useStore((s) => ({
    isEditMode: s.isEditMode,
    editReplaceMode: s.editReplaceMode,
    editSelectedIds: s.editSelectedIds,
    editReplaceNarrowedIds: s.editReplaceNarrowedIds,
    beads: s.beads,
    setEditReplaceNarrowedIds: s.setEditReplaceNarrowedIds,
    cancelReplaceMode: s.cancelReplaceMode,
  }));

  const groups = useMemo(() => {
    const map = new Map<number, { product: BeadProduct; instanceIds: string[] }>();
    for (const id of editSelectedIds) {
      const bead = beads.find((b) => b.instanceId === id);
      if (!bead) continue;
      const pid = bead.product.id;
      if (!map.has(pid)) map.set(pid, { product: bead.product, instanceIds: [] });
      map.get(pid)!.instanceIds.push(id);
    }
    return [...map.values()];
  }, [editSelectedIds, beads]);

  const isOpen = isEditMode && editReplaceMode;
  const hasMultipleGroups = groups.length > 1;

  function handleGroupClick(instanceIds: string[]) {
    const isActive =
      editReplaceNarrowedIds !== null &&
      instanceIds.length === editReplaceNarrowedIds.length &&
      instanceIds.every((id) => editReplaceNarrowedIds!.includes(id));
    setEditReplaceNarrowedIds(isActive ? null : instanceIds);
  }

  return (
    <div
      className={cn(
        "absolute top-[150px] right-6 z-20 w-[340px] transition-all duration-300 ease-out",
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none"
      )}
    >
    <div className="bg-white rounded-[3px] border border-default shadow-md p-4">
      <p className="text-sm font-medium text-color-base mb-2">
        Replacing selected bead(s):
      </p>

      {groups.length === 0 ? (
        <p className="text-xs text-color-base/50 mb-3">Select beads to replace</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {groups.map(({ product, instanceIds }, i) => {
            const isActive =
              editReplaceNarrowedIds !== null &&
              instanceIds.length === editReplaceNarrowedIds.length &&
              instanceIds.every((id) => editReplaceNarrowedIds!.includes(id));
            const palette = EDIT_REPLACE_GROUPS[i % EDIT_REPLACE_GROUPS.length];
            return (
              <li key={product.id}>
                <button
                  onClick={() => handleGroupClick(instanceIds)}
                  className={cn(
                    "w-full text-left text-sm px-2 py-1 rounded-[2px] transition-colors flex items-center gap-2",
                    isActive ? `${palette.active} font-medium` : palette.inactive
                  )}
                >
                  {hasMultipleGroups && (
                    <span className={cn(
                      "shrink-0 inline-block w-2 h-2 rounded-full",
                      isActive ? "bg-white/70" : palette.active.split(" ")[0]
                    )} />
                  )}
                  {!hasMultipleGroups && <span className="shrink-0 text-xs opacity-70">•</span>}
                  {instanceIds.length} – {product.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={cancelReplaceMode}
        className="text-xs font-semibold underline text-color-base/70 hover:text-color-base transition-colors"
      >
        close bead replacement mode
      </button>
    </div>
    </div>
  );
}
