"use client";

import { Suspense, useRef, useMemo } from "react";
import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS, EDIT_REPLACE_GROUP_COLORS } from "@/lib/constants";
import { computeCharmAdjustments } from "@/lib/charm-collision";
import { useDesign } from "@/hooks/useDesign";
import type { PlacedBead } from "@/types";
import { BeadOnBracelet } from "./BeadOnBracelet";
import { SpacerOnBracelet } from "./SpacerOnBracelet";
import { SeedSegmentOnBracelet } from "./SeedSegmentOnBracelet";
import { BeadErrorBoundary } from "./BeadErrorBoundary";
import { useBraceletReorderDrag, usePanelDrop } from "@/hooks/useDrag";

/** Statuses where spacer wireframes are visible on the canvas. */
const SPACER_VISIBLE_STATUSES = new Set(["draft", "rejected"]);

export function AllBeads({ isLocked }: { isLocked?: boolean }) {
  const beads                   = useStore((s) => s.beads);
  const reorderBeads            = useStore((s) => s.reorderBeads);
  const braceletSize            = useStore((s) => s.braceletSize);
  const viewMode                = useStore((s) => s.viewMode);
  const activeDesignId          = useStore((s) => s.activeDesignId);
  const spacersHiddenForCapture = useStore((s) => s.spacersHiddenForCapture);
  const showCharmCollisions     = useStore((s) => s.showCharmCollisions);
  const editReplaceMode         = useStore((s) => s.editReplaceMode);
  const editSelectedIds         = useStore((s) => s.editSelectedIds);
  const editSelectionGroups     = useStore((s) => s.editSelectionGroups);
  const radius = BRACELET_SIZE_RADIUS[braceletSize];

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
    () => computeCharmAdjustments(beads, radius),
    [beads, radius],
  );

  // Design status — new/unsaved bracelets default to "draft"
  const { data: activeDesign } = useDesign(activeDesignId);
  const designStatus = activeDesign?.status ?? "draft";

  // Spacers are visible only in editable states and not during thumbnail capture
  const spacersVisible = !spacersHiddenForCapture && SPACER_VISIBLE_STATUSES.has(designStatus);

  // Refs shared by both hooks so closures always read latest values
  const beadsRef = useRef<PlacedBead[]>(beads);
  beadsRef.current = beads;
  const radiusRef = useRef<number>(radius);
  radiusRef.current = radius;
  const viewModeRef = useRef<"3D" | "line">(viewMode);
  viewModeRef.current = viewMode;

  const { dragState, handleDragStart } = useBraceletReorderDrag(beadsRef, radiusRef, viewModeRef, reorderBeads);
  const { panelDropSlot, dragFromPanel } = usePanelDrop(beadsRef, radiusRef, viewModeRef);

  return (
    <group name="all-beads">
      {beads.map((bead, index) => {
        const isSpacer = bead.product.bead_category === "spacer";
        const isSeedSegment = bead.product.bead_category === "seed_segment";
        const isDragged = dragState?.fromIndex === index;
        const isDragTarget =
          (dragState !== null &&
            dragState.toIndex === index &&
            dragState.fromIndex !== index) ||
          (panelDropSlot === index && dragFromPanel !== null);

        return (
          <BeadErrorBoundary key={bead.instanceId} bead={bead} slotIndex={index}>
            {isSpacer ? (
              <SpacerOnBracelet
                bead={bead}
                slotIndex={index}
                isDragged={isDragged}
                isDragTarget={isDragTarget}
                onDragStart={handleDragStart}
                visible={spacersVisible}
              />
            ) : isSeedSegment ? (
              <SeedSegmentOnBracelet
                bead={bead}
                slotIndex={index}
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
                  isDragged={isDragged}
                  isDragTarget={isDragTarget}
                  onDragStart={handleDragStart}
                  isLocked={isLocked}
                  layerOffset={charmAdjustments.get(bead.instanceId)?.layerOffset ?? 0}
                  swingAngle={charmAdjustments.get(bead.instanceId)?.swingAngle ?? 0}
                  isColliding={showCharmCollisions && charmAdjustments.has(bead.instanceId)}
                  selectionColor={editReplaceColorMap?.get(bead.instanceId)}
                />
              </Suspense>
            )}
          </BeadErrorBoundary>
        );
      })}
    </group>
  );
}