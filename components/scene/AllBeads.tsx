"use client";

import { Suspense, useRef, useMemo } from "react";
import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS, EDIT_REPLACE_GROUP_COLORS, DRAG_LIVE_PREVIEW } from "@/lib/constants";
import { computeCharmAdjustments } from "@/lib/charm-collision";
import { getEvenSpacingBonus } from "@/lib/bead-layout";
import { useDesign } from "@/hooks/useDesign";
import type { PlacedBead } from "@/types";
import { BeadOnBracelet } from "./BeadOnBracelet";
import { BarOnBracelet } from "./BarOnBracelet";
import { SpacerOnBracelet } from "./SpacerOnBracelet";
import { SeedSegmentOnBracelet } from "./SeedSegmentOnBracelet";
import { BeadErrorBoundary } from "./BeadErrorBoundary";
import { useBraceletReorderDrag, usePanelDrop, type DragState } from "@/hooks/useDrag";

/** Statuses where spacer wireframes are visible on the canvas. */
const SPACER_VISIBLE_STATUSES = new Set(["draft", "rejected"]);

/**
 * Pure mirror of the store's reorderBeads / reorderBeadsGroup, used to compute
 * the live drag-preview ordering WITHOUT mutating the store. Must stay in sync
 * with those reducers so what the user previews equals what lands on drop.
 */
function previewReorder(beads: PlacedBead[], dragState: DragState): PlacedBead[] {
  const { fromIndex, toIndex, groupFromIndices } = dragState;
  if (fromIndex === toIndex) return beads;

  if (groupFromIndices && groupFromIndices.length > 1) {
    const arr = [...beads];
    const sorted = [...groupFromIndices].sort((a, b) => a - b);
    const group = sorted.map((i) => arr[i]);
    const indexSet = new Set(sorted);
    const remaining = arr.filter((_, i) => !indexSet.has(i));
    const anchorPositionInGroup = sorted.indexOf(fromIndex);
    const insertPosition = Math.max(0, Math.min(remaining.length, toIndex - anchorPositionInGroup));
    return [
      ...remaining.slice(0, insertPosition),
      ...group,
      ...remaining.slice(insertPosition),
    ];
  }

  const arr = [...beads];
  const [moved] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, moved);
  return arr;
}

export function AllBeads({ isLocked }: { isLocked?: boolean }) {
  const beads                   = useStore((s) => s.beads);
  const braceletSize            = useStore((s) => s.braceletSize);
  const viewMode                = useStore((s) => s.viewMode);
  const isEvenlySpaced          = useStore((s) => s.isEvenlySpaced);
  const activeDesignId          = useStore((s) => s.activeDesignId);
  const spacersHiddenForCapture = useStore((s) => s.spacersHiddenForCapture);
  const showCharmCollisions     = useStore((s) => s.showCharmCollisions);
  const editReplaceMode         = useStore((s) => s.editReplaceMode);
  const editSelectedIds         = useStore((s) => s.editSelectedIds);
  const editSelectionGroups     = useStore((s) => s.editSelectionGroups);
  const radius = BRACELET_SIZE_RADIUS[braceletSize];

  // Refs shared by both drag hooks so their closures always read latest values.
  // These intentionally track the STORE order (not the preview) — slot math for
  // the drag itself must run against the real array.
  const beadsRef = useRef<PlacedBead[]>(beads);
  beadsRef.current = beads;
  const radiusRef = useRef<number>(radius);
  radiusRef.current = radius;
  const viewModeRef = useRef<"3D" | "line">(viewMode);
  viewModeRef.current = viewMode;

  const { dragState, handleDragStart } = useBraceletReorderDrag(beadsRef, radiusRef, viewModeRef);
  const { panelDropSlot, dragFromPanel } = usePanelDrop(beadsRef, radiusRef, viewModeRef);

  // ── Live reorder preview ────────────────────────────────────────────────────
  // While reordering, lay every item out in the order it WOULD land in on drop,
  // so neighbours reflow and the dragged item moves to its destination in real
  // time. Render-only: the store order is untouched until the drop commits.
  // Flip DRAG_LIVE_PREVIEW to false to revert to the old static behaviour.
  const liveDrag = DRAG_LIVE_PREVIEW && dragState !== null;
  const displayBeads = liveDrag ? previewReorder(beads, dragState!) : beads;
  const displayIndexById = liveDrag
    ? new Map(displayBeads.map((b, i) => [b.instanceId, i] as const))
    : null;

  const extraSpacingPerGap = isEvenlySpaced && viewMode === '3D'
    ? getEvenSpacingBonus(displayBeads, radius)
    : 0;

  // Map instanceId → group hex color for edit-replace mode.
  const editReplaceColorMap = useMemo(() => {
    const totalSelected = editSelectedIds.length + editSelectionGroups.reduce((n, g) => n + g.length, 0);
    if (!editReplaceMode || totalSelected === 0) return null;

    const map = new Map<string, string>();

    if (editSelectionGroups.length > 0) {
      // Explicit groups mode: frozen groups get sequential colors; active selection gets the next slot
      editSelectionGroups.forEach((group, g) => {
        const color = EDIT_REPLACE_GROUP_COLORS[g % EDIT_REPLACE_GROUP_COLORS.length];
        group.forEach(id => map.set(id, color));
      });
      const activeColor = EDIT_REPLACE_GROUP_COLORS[editSelectionGroups.length % EDIT_REPLACE_GROUP_COLORS.length];
      editSelectedIds.forEach(id => map.set(id, activeColor));
    } else {
      // Auto mode: group by product.id, ordered by first appearance in editSelectedIds
      const productOrder = new Map<number, number>();
      for (const id of editSelectedIds) {
        const pid = beads.find((b) => b.instanceId === id)?.product.id;
        if (pid !== undefined && !productOrder.has(pid)) productOrder.set(pid, productOrder.size);
      }
      for (const id of editSelectedIds) {
        const pid = beads.find((b) => b.instanceId === id)?.product.id;
        if (pid !== undefined) {
          const idx = productOrder.get(pid) ?? 0;
          map.set(id, EDIT_REPLACE_GROUP_COLORS[idx % EDIT_REPLACE_GROUP_COLORS.length]);
        }
      }
    }

    return map;
  }, [editReplaceMode, editSelectedIds, editSelectionGroups, beads]);

  // Charm adjustments — layer offset + bail-pivot swing for nearby charms
  const charmAdjustments = useMemo(
    () => computeCharmAdjustments(displayBeads, radius, extraSpacingPerGap),
    [displayBeads, radius, extraSpacingPerGap],
  );

  // Design status — new/unsaved bracelets default to "draft"
  const { data: activeDesign } = useDesign(activeDesignId);
  const designStatus = activeDesign?.status ?? "draft";

  // Spacers are visible only in editable states and not during thumbnail capture
  const spacersVisible = !spacersHiddenForCapture && SPACER_VISIBLE_STATUSES.has(designStatus);

  return (
    <group name="all-beads">
      {beads.map((bead, index) => {
        const isSpacer      = bead.product.bead_category === "spacer";
        const isBar         = bead.product.bead_category === "bar";
        const isSeedSegment = bead.product.bead_category === "seed_segment";
        const isDragged =
          dragState?.fromIndex === index ||
          (dragState?.groupFromIndices?.includes(index) ?? false);
        const isDragTarget =
          (!liveDrag && dragState !== null && dragState.toIndex === index && !isDragged) ||
          (panelDropSlot === index && dragFromPanel !== null);

        return (
          <BeadErrorBoundary key={bead.instanceId} bead={bead} slotIndex={index}>
            {isBar ? (
              <BarOnBracelet
                bead={bead}
                slotIndex={index}
                layoutBeads={liveDrag ? displayBeads : undefined}
                layoutIndex={liveDrag ? displayIndexById!.get(bead.instanceId) : undefined}
                isDragged={isDragged}
                isDragTarget={isDragTarget}
                onDragStart={handleDragStart}
                isLocked={isLocked}
              />
            ) : isSpacer ? (
              <SpacerOnBracelet
                bead={bead}
                slotIndex={index}
                layoutBeads={liveDrag ? displayBeads : undefined}
                layoutIndex={liveDrag ? displayIndexById!.get(bead.instanceId) : undefined}
                isDragged={isDragged}
                isDragTarget={isDragTarget}
                onDragStart={handleDragStart}
                visible={spacersVisible}
              />
            ) : isSeedSegment ? (
              <SeedSegmentOnBracelet
                bead={bead}
                slotIndex={index}
                layoutBeads={liveDrag ? displayBeads : undefined}
                layoutIndex={liveDrag ? displayIndexById!.get(bead.instanceId) : undefined}
                isDragged={isDragged}
                isDragTarget={isDragTarget}
                onDragStart={handleDragStart}
                isLocked={isLocked}
              />
            ) : (
              <Suspense fallback={null}>
                <BeadOnBracelet
                  bead={bead}
                  slotIndex={index}
                  layoutBeads={liveDrag ? displayBeads : undefined}
                  layoutIndex={liveDrag ? displayIndexById!.get(bead.instanceId) : undefined}
                  isDragged={isDragged}
                  isDragTarget={isDragTarget}
                  onDragStart={handleDragStart}
                  isLocked={isLocked}
                  layerOffset={charmAdjustments.get(bead.instanceId)?.layerOffset ?? 0}
                  swingAngle={charmAdjustments.get(bead.instanceId)?.swingAngle ?? 0}
                  isColliding={showCharmCollisions && charmAdjustments.has(bead.instanceId)}
                  selectionColor={editReplaceColorMap?.get(bead.instanceId)}
                  isCapturing={spacersHiddenForCapture}
                />
              </Suspense>
            )}
          </BeadErrorBoundary>
        );
      })}
    </group>
  );
}