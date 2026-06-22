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
    editSelectionGroups,
    editReplaceNarrowedIds,
    beads,
    setEditReplaceNarrowedIds,
    cancelReplaceMode,
    saveCurrentSelectionAsGroup,
  } = useStore((s) => ({
    isEditMode: s.isEditMode,
    editReplaceMode: s.editReplaceMode,
    editSelectedIds: s.editSelectedIds,
    editSelectionGroups: s.editSelectionGroups,
    editReplaceNarrowedIds: s.editReplaceNarrowedIds,
    beads: s.beads,
    setEditReplaceNarrowedIds: s.setEditReplaceNarrowedIds,
    cancelReplaceMode: s.cancelReplaceMode,
    saveCurrentSelectionAsGroup: s.saveCurrentSelectionAsGroup,
  }));

  // Auto product-type groups (used when no explicit groups have been saved)
  const autoGroups = useMemo(() => {
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

  const isExplicitMode = editSelectionGroups.length > 0;
  const isOpen = isEditMode && editReplaceMode;

  // In explicit mode, build a flat list of all groups (frozen + active pending)
  const explicitGroups: Array<{ label: string; instanceIds: string[]; colorIndex: number }> = isExplicitMode
    ? [
        ...editSelectionGroups.map((ids, i) => ({
          label: `Group ${i + 1}`,
          instanceIds: ids,
          colorIndex: i,
        })),
        ...(editSelectedIds.length > 0
          ? [{
              label: `Group ${editSelectionGroups.length + 1}`,
              instanceIds: editSelectedIds,
              colorIndex: editSelectionGroups.length,
            }]
          : []),
      ]
    : [];

  function isGroupActive(instanceIds: string[]) {
    return (
      editReplaceNarrowedIds !== null &&
      instanceIds.length === editReplaceNarrowedIds.length &&
      instanceIds.every((id) => editReplaceNarrowedIds!.includes(id))
    );
  }

  function handleGroupClick(instanceIds: string[]) {
    const active = isGroupActive(instanceIds);
    setEditReplaceNarrowedIds(active ? null : instanceIds);
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

      {/* ── Auto product-type groups (default) ── */}
      {!isExplicitMode && (
        <>
          {autoGroups.length === 0 ? (
            <p className="text-xs text-color-base/50 mb-3">Select beads to replace</p>
          ) : (
            <ul className="mb-3 space-y-1">
              {autoGroups.map(({ product, instanceIds }, i) => {
                const active = isGroupActive(instanceIds);
                const palette = EDIT_REPLACE_GROUPS[i % EDIT_REPLACE_GROUPS.length];
                const hasMultiple = autoGroups.length > 1;
                return (
                  <li key={product.id}>
                    <button
                      onClick={() => handleGroupClick(instanceIds)}
                      className={cn(
                        "w-full text-left text-sm px-2 py-1 rounded-[2px] transition-colors flex items-center gap-2",
                        active ? `${palette.active} font-medium` : palette.inactive
                      )}
                    >
                      {hasMultiple && (
                        <span className={cn(
                          "shrink-0 inline-block w-2 h-2 rounded-full",
                          active ? "bg-white/70" : palette.active.split(" ")[0]
                        )} />
                      )}
                      {!hasMultiple && <span className="shrink-0 text-xs opacity-70">•</span>}
                      {instanceIds.length} – {product.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* ── Explicit manual groups ── */}
      {isExplicitMode && (
        <>
          {explicitGroups.length === 0 ? (
            <p className="text-xs text-color-base/50 mb-3">Select beads to replace</p>
          ) : (
            <ul className="mb-3 space-y-1">
              {explicitGroups.map(({ label, instanceIds, colorIndex }) => {
                const active = isGroupActive(instanceIds);
                const palette = EDIT_REPLACE_GROUPS[colorIndex % EDIT_REPLACE_GROUPS.length];
                return (
                  <li key={label}>
                    <button
                      onClick={() => handleGroupClick(instanceIds)}
                      className={cn(
                        "w-full text-left text-sm px-2 py-1 rounded-[2px] transition-colors flex items-center gap-2",
                        active ? `${palette.active} font-medium` : palette.inactive
                      )}
                    >
                      <span className={cn(
                        "shrink-0 inline-block w-2 h-2 rounded-full",
                        active ? "bg-white/70" : palette.active.split(" ")[0]
                      )} />
                      {instanceIds.length} bead{instanceIds.length !== 1 ? "s" : ""} – {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* ── New Group button ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={cancelReplaceMode}
          className="text-xs font-semibold underline text-color-base/70 hover:text-color-base transition-colors"
        >
          close bead replacement mode
        </button>
        <button
          onClick={saveCurrentSelectionAsGroup}
          disabled={editSelectedIds.length === 0}
          className="text-xs font-semibold text-navy hover:text-navy/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          + New group
        </button>
      </div>
    </div>
    </div>
  );
}
