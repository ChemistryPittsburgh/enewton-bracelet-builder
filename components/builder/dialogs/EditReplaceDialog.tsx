"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { EDIT_REPLACE_GROUPS, EDIT_REPLACE_GROUP_COLORS, EDIT_GROUPING_ENABLED } from "@/lib/constants";
import type { BeadProduct } from "@/types";
import { beadMatchKey, seedKindLabel } from "@/lib/seed-bead-utils";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

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
    startReplaceSeedMode,
    replaceSeedTargetIds,
    clearReplaceSeed,
  } = useStore(useShallow((s) => ({
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
    startReplaceSeedMode: s.startReplaceSeedMode,
    replaceSeedTargetIds: s.replaceSeedTargetIds,
    clearReplaceSeed: s.clearReplaceSeed,
  })));

  // Unique bead/charm types on the bracelet (excludes spacers/seed segments),
  // split so charms get their own section. Charms = "charm" + "float_charm".
  const { beadRows, charmRows } = useMemo(() => {
    const beadMap = new Map<number, { product: BeadProduct; instanceIds: string[] }>();
    const charmMap = new Map<number, { product: BeadProduct; instanceIds: string[] }>();
    for (const bead of beads) {
      const cat = bead.product.bead_category;
      if (cat === "spacer" || cat === "seed_segment") continue;
      const isCharm = cat === "charm" || cat === "float_charm";
      const map = isCharm ? charmMap : beadMap;
      const pid = bead.product.id;
      if (!map.has(pid)) map.set(pid, { product: bead.product, instanceIds: [] });
      map.get(pid)!.instanceIds.push(bead.instanceId);
    }
    return { beadRows: [...beadMap.values()], charmRows: [...charmMap.values()] };
  }, [beads]);

  // Seed segments grouped by (size, shape) — added to the replace list so users
  // can replace a whole seed kind. Keyed by beadMatchKey; colors are ignored.
  const seedRows = useMemo(() => {
    const map = new Map<string, { key: string; label: string; instanceIds: string[] }>();
    for (const bead of beads) {
      if (!bead.seedConfig) continue;
      const key = beadMatchKey(bead);
      if (!map.has(key)) {
        map.set(key, { key, label: `${seedKindLabel(bead.seedConfig)} Seed`, instanceIds: [] });
      }
      map.get(key)!.instanceIds.push(bead.instanceId);
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

  const isExplicitMode = EDIT_GROUPING_ENABLED && editSelectionGroups.length > 0;
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
    // Multi-select: toggle this whole type in/out of the running selection so
    // several types can be queued for replacement at once. Clicking a type that
    // is already fully selected removes just its instances; otherwise they are
    // merged into the selection (and any seed target is dropped).
    const allSelected = allInstanceIds.every((id) => editSelectedIds.includes(id));
    if (allSelected) {
      setEditSelectedIds(editSelectedIds.filter((id) => !allInstanceIds.includes(id)));
    } else {
      setEditSelectedIds([...new Set([...editSelectedIds, ...allInstanceIds])]);
      clearReplaceSeed();
    }
  }

  const title = isExplicitMode
    ? "Replacing selected bead(s)"
    : "Select item by type to replace";
  // Section labels only earn their keep when more than one section is present.
  const sectionCount =
    (beadRows.length > 0 ? 1 : 0) + (charmRows.length > 0 ? 1 : 0) + (seedRows.length > 0 ? 1 : 0);
  const showSectionLabels = sectionCount > 1;

  return (
    <div
      className={cn(
        "absolute top-[150px] right-6 z-20 w-[340px] transition-all duration-300 ease-out",
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none"
      )}
    >
    <div className="bg-white rounded-[3px] border border-default shadow-md">

      {/* ── Header (title + close) ── */}
      <div className="flex items-start justify-between gap-3 border-b border-default px-3 py-2">
        <p className="text-sm font-medium text-color-base mt-1">{title}</p>
        <Tooltip content="Exit Replace Mode">
          <button
            type="button"
            onClick={cancelReplaceMode}
            aria-label="Exit bead replacement mode"
            className="icon-only-btn"
          >
            <X size={18} />
          </button>
        </Tooltip>
      </div>

      <div className="max-h-[320px] py-3 px-2 overflow-y-scroll">
        {!isExplicitMode ? (
          /* ── Default mode: bead types and seed beads in separate sections ── */
          beadRows.length === 0 && charmRows.length === 0 && seedRows.length === 0 ? (
            <p className="text-xs text-color-base/50">No beads on bracelet</p>
          ) : (
            <div className="space-y-3 pr-0.5">
              {beadRows.length > 0 && (
                <div>
                  {showSectionLabels && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-color-base/40 px-2 mb-1.5">
                      Beads
                    </p>
                  )}
                  <ul className="space-y-1">
                    {beadRows.map(({ product, instanceIds }) => (
                      <BeadTypeRow
                        key={product.id}
                        product={product}
                        instanceIds={instanceIds}
                        editSelectedIds={editSelectedIds}
                        colorIndex={productColorIndex.get(product.id)}
                        onToggle={handleTypeToggle}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {charmRows.length > 0 && (
                <div className={cn(beadRows.length > 0 && "border-t border-default pt-3")}>
                  {showSectionLabels && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-color-base/40 px-2 mb-1.5">
                      Charms
                    </p>
                  )}
                  <ul className="space-y-1">
                    {charmRows.map(({ product, instanceIds }) => (
                      <BeadTypeRow
                        key={product.id}
                        product={product}
                        instanceIds={instanceIds}
                        editSelectedIds={editSelectedIds}
                        colorIndex={productColorIndex.get(product.id)}
                        onToggle={handleTypeToggle}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {seedRows.length > 0 && (
                <div className={cn((beadRows.length > 0 || charmRows.length > 0) && "border-t border-default pt-3")}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-color-base/40 px-2 mb-1.5">
                    Seed Beads
                  </p>
                  <ul className="space-y-1">
                    {seedRows.map((row) => {
                      // Reflect both selection paths: the dedicated seed-replace target
                      // (row click / Bead Info button) sets replaceSeedTargetIds, while
                      // selecting seed segments directly on the bracelet populates
                      // editSelectedIds. Either should light the row up.
                      const seedTargeted =
                        replaceSeedTargetIds !== null &&
                        replaceSeedTargetIds.length === row.instanceIds.length &&
                        row.instanceIds.every((id) => replaceSeedTargetIds.includes(id));
                      const selectedCount = seedTargeted
                        ? row.instanceIds.length
                        : row.instanceIds.filter((id) => editSelectedIds.includes(id)).length;
                      const isSelected = selectedCount > 0;
                      const isPartial = isSelected && selectedCount < row.instanceIds.length;
                      const countDisplay = isPartial
                        ? `${selectedCount} of ${row.instanceIds.length}`
                        : String(row.instanceIds.length);
                      return (
                        <li key={row.key}>
                          <button
                            onClick={() => startReplaceSeedMode(row.key)}
                            className={cn(
                              "w-full text-left text-sm px-2 py-1.5 rounded-[2px] transition-colors flex items-center gap-2",
                              isSelected ? "bg-navy text-white font-medium" : "hover:bg-light-grey"
                            )}
                          >
                            <span className="truncate flex-1">{row.label}</span>
                            <span className={cn("shrink-0 text-xs tabular-nums", isSelected ? "text-white/70" : "text-color-base/50")}>
                              {countDisplay}
                            </span>
                            <X size={12} className={`opacity-0 ${isSelected && "opacity-100"}`} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )
        ) : (
          /* ── Explicit mode: frozen groups + pending ── */
          explicitGroups.length === 0 ? (
            <p className="text-xs text-color-base/50">Select beads to replace</p>
          ) : (
            <ul className="space-y-1">
              {explicitGroups.map((g) => (
                <GroupButton
                  key={g.key}
                  group={g}
                  active={isGroupActive(g.instanceIds)}
                  onClick={() => handleGroupClick(g.instanceIds)}
                />
              ))}
            </ul>
          )
        )}
      </div>

      {/* ── Footer: grouping action only — exit lives in the header ✕ ── */}
      {EDIT_GROUPING_ENABLED && (editSelectedIds.length > 0 || isExplicitMode) && (
        <div className="flex items-center justify-end mt-3 pt-3 border-t border-default">
          <button
            onClick={saveCurrentSelectionAsGroup}
            disabled={editSelectedIds.length === 0}
            className="text-xs font-semibold text-navy hover:text-navy/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            + New group
          </button>
        </div>
      )}
    </div>
    </div>
  );
}

function BeadTypeRow({ product, instanceIds, editSelectedIds, colorIndex, onToggle }: {
  product: BeadProduct;
  instanceIds: string[];
  editSelectedIds: string[];
  colorIndex: number | undefined;
  onToggle: (instanceIds: string[]) => void;
}) {
  const selectedCount = instanceIds.filter((id) => editSelectedIds.includes(id)).length;
  const isSelected = selectedCount > 0;
  const isPartial = isSelected && selectedCount < instanceIds.length;
  const countDisplay = isPartial
    ? `${selectedCount} of ${instanceIds.length}`
    : String(instanceIds.length);
  const palette = colorIndex !== undefined
    ? EDIT_REPLACE_GROUPS[colorIndex % EDIT_REPLACE_GROUPS.length]
    : null;
  return (
    <li>
      <Tooltip content={`${isSelected ? "Remove selected item" : ""}`} placement="bottom" className="!block">
        <button
          onClick={() => onToggle(instanceIds)}
          className={cn(
            "w-full text-left text-sm px-2 py-1.5 rounded-[2px] transition-colors flex items-center gap-2",
            isSelected && palette ? `${palette.active} font-medium` : "hover:bg-light-grey"
          )}
        >
          <span className="truncate flex-1">{product.name}</span>
          <span className={cn("shrink-0 text-xs tabular-nums", isSelected ? "text-white/70" : "text-color-base/50")}>
            {countDisplay}
          </span>
          <X size={12} className={`opacity-0 ${isSelected && "opacity-100"}`} />
        </button>
      </Tooltip>
    </li>
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