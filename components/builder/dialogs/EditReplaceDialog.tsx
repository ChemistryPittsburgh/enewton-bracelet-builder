"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { EDIT_REPLACE_GROUPS, EDIT_REPLACE_GROUP_COLORS } from "@/lib/constants";
import type { BeadProduct } from "@/types";
import { cn } from "@/lib/utils";

type ReplaceGroup = {
  key: string;
  label: string;
  instanceIds: string[];
  colorIndex: number;
  /** Show a colored swatch dot (vs a plain bullet for a single auto group). */
  showDot: boolean;
};

export function EditReplaceDialog() {
  const {
    isEditMode,
    editReplaceMode,
    editSelectedIds,
    editSelectionGroups,
    editReplaceNarrowedIds,
    beads,
    setEditReplaceNarrowedIds,
    setEditSelectedIds,
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
    setEditSelectedIds: s.setEditSelectedIds,
    cancelReplaceMode: s.cancelReplaceMode,
    saveCurrentSelectionAsGroup: s.saveCurrentSelectionAsGroup,
  }));

  // Default state: all unique bead types on the bracelet (excludes spacers/seed segments)
  const typeRows = useMemo(() => {
    const map = new Map<number, { product: BeadProduct; instanceIds: string[] }>();
    for (const bead of beads) {
      const cat = bead.product.bead_category;
      if (cat === "spacer" || cat === "seed_segment") continue;
      const pid = bead.product.id;
      if (!map.has(pid)) map.set(pid, { product: bead.product, instanceIds: [] });
      map.get(pid)!.instanceIds.push(bead.instanceId);
    }
    return [...map.values()];
  }, [beads]);

  // Mirror the color assignment in AllBeads: product types are ordered by first appearance in editSelectedIds.
  const productColorIndex = useMemo(() => {
    const order = new Map<number, number>();
    for (const id of editSelectedIds) {
      const pid = beads.find((b) => b.instanceId === id)?.product.id;
      if (pid !== undefined && !order.has(pid)) order.set(pid, order.size);
    }
    return order;
  }, [editSelectedIds, beads]);

  const isExplicitMode = editSelectionGroups.length > 0;
  const isOpen = isEditMode && editReplaceMode;

  const plural = (n: number) => `${n} bead${n !== 1 ? "s" : ""}`;

  // Explicit mode: frozen saved groups + the active pending selection as a trailing group.
  const explicitGroups: ReplaceGroup[] = isExplicitMode
    ? [
        ...editSelectionGroups.map((ids, i) => ({
          key: `group-${i}`,
          label: `${plural(ids.length)} – Group ${i + 1}`,
          instanceIds: ids,
          colorIndex: i,
          showDot: true,
        })),
        ...(editSelectedIds.length > 0
          ? [{
              key: "group-pending",
              label: `${plural(editSelectedIds.length)} – Group ${editSelectionGroups.length + 1}`,
              instanceIds: editSelectedIds,
              colorIndex: editSelectionGroups.length,
              showDot: true,
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

  function handleTypeToggle(allInstanceIds: string[]) {
    const anySelected = allInstanceIds.some(id => editSelectedIds.includes(id));
    if (anySelected) {
      setEditSelectedIds(editSelectedIds.filter(id => !allInstanceIds.includes(id)));
    } else {
      setEditSelectedIds([...editSelectedIds, ...allInstanceIds]);
    }
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

      {!isExplicitMode ? (
        /* ── Default mode: always show type list with selection state ── */
        <>
          <p className="text-sm font-medium text-color-base mb-2">
            Select a bead type to replace:
          </p>
          {typeRows.length === 0 ? (
            <p className="text-xs text-color-base/50 mb-3">No beads on bracelet</p>
          ) : (
            <ul className="mb-3 space-y-1 max-h-[260px] overflow-y-auto">
              {typeRows.map(({ product, instanceIds }) => {
                const selectedCount = instanceIds.filter(id => editSelectedIds.includes(id)).length;
                const isSelected = selectedCount > 0;
                const isPartial = isSelected && selectedCount < instanceIds.length;
                const countDisplay = isPartial
                  ? `${selectedCount} of ${instanceIds.length}`
                  : String(instanceIds.length);
                const colorIdx = productColorIndex.get(product.id);
                const palette = colorIdx !== undefined
                  ? EDIT_REPLACE_GROUPS[colorIdx % EDIT_REPLACE_GROUPS.length]
                  : null;
                return (
                  <li key={product.id}>
                    <button
                      onClick={() => handleTypeToggle(instanceIds)}
                      className={cn(
                        "w-full text-left text-sm px-2 py-1.5 rounded-[2px] transition-colors flex items-center justify-between gap-2",
                        isSelected && palette ? `${palette.active} font-medium` : "hover:bg-light-grey"
                      )}
                    >
                      <span className="truncate">{product.name}</span>
                      <span className={cn("shrink-0 text-xs tabular-nums", isSelected ? "text-white/70" : "text-color-base/50")}>
                        {countDisplay}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        /* ── Explicit mode: frozen groups + pending ── */
        <>
          <p className="text-sm font-medium text-color-base mb-2">
            Replacing selected bead(s):
          </p>
          {explicitGroups.length === 0 ? (
            <p className="text-xs text-color-base/50 mb-3">Select beads to replace</p>
          ) : (
            <ul className="mb-3 space-y-1">
              {explicitGroups.map((g) => (
                <GroupButton
                  key={g.key}
                  group={g}
                  active={isGroupActive(g.instanceIds)}
                  onClick={() => handleGroupClick(g.instanceIds)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {/* ── Footer actions ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={cancelReplaceMode}
          className="text-xs font-semibold underline text-color-base/70 hover:text-color-base transition-colors"
        >
          exit bead replacement mode
        </button>
        {(editSelectedIds.length > 0 || isExplicitMode) && (
          <button
            onClick={saveCurrentSelectionAsGroup}
            disabled={editSelectedIds.length === 0}
            className="text-xs font-semibold text-navy hover:text-navy/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            + New group
          </button>
        )}
      </div>
    </div>
    </div>
  );
}

function GroupButton({ group, active, onClick }: { group: ReplaceGroup; active: boolean; onClick: () => void }) {
  const palette = EDIT_REPLACE_GROUPS[group.colorIndex % EDIT_REPLACE_GROUPS.length];
  const dotColor = EDIT_REPLACE_GROUP_COLORS[group.colorIndex % EDIT_REPLACE_GROUP_COLORS.length];
  return (
    <li>
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left text-sm px-2 py-1 rounded-[2px] transition-colors flex items-center gap-2",
          active ? `${palette.active} font-medium` : palette.inactive
        )}
      >
        {group.showDot ? (
          <span
            className={cn("shrink-0 inline-block w-2 h-2 rounded-full", active && "bg-white/70")}
            style={active ? undefined : { backgroundColor: dotColor }}
          />
        ) : (
          <span className="shrink-0 text-xs opacity-70">•</span>
        )}
        {group.label}
      </button>
    </li>
  );
}
