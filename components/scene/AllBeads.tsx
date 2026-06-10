"use client";

import { Suspense, useRef } from "react";
import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import type { PlacedBead } from "@/types";
import { BeadOnBracelet } from "./BeadOnBracelet";
import { BeadErrorBoundary } from "./BeadErrorBoundary";
import { useBraceletReorderDrag, usePanelDrop } from "@/hooks/useDrag";

export function AllBeads({ isLocked }: { isLocked?: boolean }) {
  const { beads, reorderBeads, braceletSize, viewMode } = useStore((s) => ({
    beads:        s.beads,
    reorderBeads: s.reorderBeads,
    braceletSize: s.braceletSize,
    viewMode:     s.viewMode,
  }));
  const radius = BRACELET_SIZE_RADIUS[braceletSize];

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
      {beads.map((bead, index) => (
        <BeadErrorBoundary key={bead.instanceId} bead={bead} slotIndex={index}>
          <Suspense fallback={null}>
            <BeadOnBracelet
              bead={bead}
              slotIndex={index}
              isDragged={dragState?.fromIndex === index}
              isDragTarget={
                (dragState !== null &&
                  dragState.toIndex === index &&
                  dragState.fromIndex !== index) ||
                (panelDropSlot === index && dragFromPanel !== null)
              }
              onDragStart={handleDragStart}
              isLocked={isLocked}
            />
          </Suspense>
        </BeadErrorBoundary>
      ))}
    </group>
  );
}
