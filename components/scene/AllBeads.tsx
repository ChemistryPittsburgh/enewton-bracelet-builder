"use client";

import { Suspense, useRef } from "react";
import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { useDesign } from "@/hooks/useDesign";
import type { PlacedBead } from "@/types";
import { BeadOnBracelet } from "./BeadOnBracelet";
import { SpacerOnBracelet } from "./SpacerOnBracelet";
import { BeadErrorBoundary } from "./BeadErrorBoundary";
import { useBraceletReorderDrag, usePanelDrop } from "@/hooks/useDrag";

/** Statuses where spacer wireframes are visible on the canvas. */
const SPACER_VISIBLE_STATUSES = new Set(["draft", "rejected"]);

export function AllBeads({ isLocked }: { isLocked?: boolean }) {
  const { beads, reorderBeads, braceletSize, viewMode, activeDesignId, spacersHiddenForCapture } =
    useStore((s) => ({
      beads:                    s.beads,
      reorderBeads:             s.reorderBeads,
      braceletSize:             s.braceletSize,
      viewMode:                 s.viewMode,
      activeDesignId:           s.activeDesignId,
      spacersHiddenForCapture:  s.spacersHiddenForCapture,
    }));
  const radius = BRACELET_SIZE_RADIUS[braceletSize];

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
        const sharedProps = {
          bead,
          slotIndex: index,
          isDragged: dragState?.fromIndex === index,
          isDragTarget:
            (dragState !== null &&
              dragState.toIndex === index &&
              dragState.fromIndex !== index) ||
            (panelDropSlot === index && dragFromPanel !== null),
          onDragStart: handleDragStart,
        };

        return (
          <BeadErrorBoundary key={bead.instanceId} bead={bead} slotIndex={index}>
            {isSpacer ? (
              <SpacerOnBracelet {...sharedProps} visible={spacersVisible} />
            ) : (
              <Suspense fallback={null}>
                <BeadOnBracelet {...sharedProps} isLocked={isLocked} />
              </Suspense>
            )}
          </BeadErrorBoundary>
        );
      })}
    </group>
  );
}