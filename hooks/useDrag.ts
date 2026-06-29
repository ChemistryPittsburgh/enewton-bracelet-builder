"use client";

import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";

import { useStore } from "@/lib/store";
import { formatMm } from "@/lib/utils";
import { getBeadAngle, getBeadTransformLine, getEvenSpacingBonus } from "@/lib/bead-layout";
import type { BeadProduct, PlacedBead } from "@/types";


// ─── Slot-finding helpers ─────────────────────────────────────────────────────

function nearestSlot(point: THREE.Vector3, beads: PlacedBead[], radius: number, extraSpacingPerGap = 0): number {
  const angle = Math.atan2(point.z, point.x);
  const TWO_PI = 2 * Math.PI;
  let nearest = 0;
  let minDiff = Infinity;
  for (let i = 0; i < beads.length; i++) {
    let beadAngle = getBeadAngle(i, beads, radius, extraSpacingPerGap) % TWO_PI;
    if (beadAngle > Math.PI) beadAngle -= TWO_PI;
    let diff = Math.abs(angle - beadAngle);
    if (diff > Math.PI) diff = TWO_PI - diff;
    if (diff < minDiff) { minDiff = diff; nearest = i; }
  }
  return nearest;
}

function nearestSlotLine(point: THREE.Vector3, beads: PlacedBead[]): number {
  let nearest = 0;
  let minDist = Infinity;
  for (let i = 0; i < beads.length; i++) {
    const cx = getBeadTransformLine(i, beads).position[0];
    const dist = Math.abs(point.x - cx);
    if (dist < minDist) { minDist = dist; nearest = i; }
  }
  return nearest;
}

/**
 * Direction-aware insertion index for a bead dropped at `point`.
 * Checks which half of the nearest bead the cursor is on:
 *   left / counter-clockwise half → insert before (slot)
 *   right / clockwise half        → insert after  (slot + 1)
 */
function resolveDropSlot(
  point: THREE.Vector3,
  beads: PlacedBead[],
  radius: number,
  extraSpacingPerGap = 0,
  isLine = false,
): number {
  if (beads.length === 0) return 0;

  if (isLine) {
    const nearest = nearestSlotLine(point, beads);
    const cx = getBeadTransformLine(nearest, beads).position[0];
    return point.x > cx ? nearest + 1 : nearest;
  }

  const TWO_PI = 2 * Math.PI;
  const nearest = nearestSlot(point, beads, radius, extraSpacingPerGap);
  let beadAngle = getBeadAngle(nearest, beads, radius, extraSpacingPerGap) % TWO_PI;
  if (beadAngle > Math.PI) beadAngle -= TWO_PI;
  const cursorAngle = Math.atan2(point.z, point.x);
  let diff = cursorAngle - beadAngle;
  if (diff >  Math.PI) diff -= TWO_PI;
  if (diff < -Math.PI) diff += TWO_PI;
  return diff > 0 ? nearest + 1 : nearest;
}

// ─── Reorder drag (edit-mode, in-canvas) ─────────────────────────────────────

export interface DragState {
  fromIndex: number;
  toIndex: number;
  /** Sorted indices of all selected beads when dragging as a group. */
  groupFromIndices?: number[];
}

export function useBraceletReorderDrag(
  beadsRef: React.RefObject<PlacedBead[]>,
  radiusRef: React.RefObject<number>,
  viewModeRef: React.RefObject<"3D" | "line">,
): { dragState: DragState | null; handleDragStart: (index: number) => void } {
  const { gl, camera } = useThree();
  const [dragState, setDragState] = useState<DragState | null>(null);
  const reorderBeads = useStore((s) => s.reorderBeads);
  const reorderBeadsGroup = useStore((s) => s.reorderBeadsGroup);
  const reorderBeadsRef = useRef(reorderBeads);
  reorderBeadsRef.current = reorderBeads;
  const reorderBeadsGroupRef = useRef(reorderBeadsGroup);
  reorderBeadsGroupRef.current = reorderBeadsGroup;
  const isDragging = dragState !== null;

  function handleDragStart(index: number) {
    const editSelectedIds = useStore.getState().editSelectedIds;
    const beads = beadsRef.current!;
    const draggedBead = beads[index];
    const isGroupDrag =
      draggedBead != null &&
      editSelectedIds.includes(draggedBead.instanceId) &&
      editSelectedIds.length > 1;

    // const dragLabel = isGroupDrag ? (
    //   `${editSelectedIds.length} items`
    // ) : (
    //   draggedBead?.product.bead_type ?? draggedBead?.product.name ?? "Item";
    // useStore.getState().setReorderDragLabel(dragLabel);

    let dragLabel: string = "Item";
    if(isGroupDrag) {
      dragLabel = `${editSelectedIds.length} items`;
    } else if(draggedBead?.product.bead_type) {
      dragLabel = draggedBead?.product.size_mm ? `${draggedBead?.product.bead_type} ${formatMm(draggedBead?.product.size_mm)}mm` : draggedBead?.product.bead_type; 
    } else if(draggedBead?.product.name) {
      dragLabel = draggedBead?.product.name;
    } else {
      dragLabel = "Item";
    }
    useStore.getState().setReorderDragLabel(dragLabel);

    if (isGroupDrag) {
      const groupFromIndices = editSelectedIds
        .map((id) => beads.findIndex((b) => b.instanceId === id))
        .filter((i) => i !== -1)
        .sort((a, b) => a - b);
      setDragState({ fromIndex: index, toIndex: index, groupFromIndices });
    } else {
      setDragState({ fromIndex: index, toIndex: index });
    }
  }

  useEffect(() => {
    if (!dragState) return;

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const target = new THREE.Vector3();
    const fromIndex = dragState.fromIndex;
    const groupFromIndices = dragState.groupFromIndices;
    let toIndex = dragState.toIndex;

    function onMove(e: PointerEvent) {
      const rect = gl.domElement.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      if (raycaster.ray.intersectPlane(plane, target)) {
        const { isEvenlySpaced } = useStore.getState();
        const extraSpacingPerGap = isEvenlySpaced && viewModeRef.current === '3D'
          ? getEvenSpacingBonus(beadsRef.current!, radiusRef.current!)
          : 0;
        toIndex = resolveDropSlot(
          target, beadsRef.current!, radiusRef.current!, extraSpacingPerGap,
          viewModeRef.current === "line",
        );
        // Avoid a no-op micro-swap when hovering either half of the dragged bead itself
        if (!groupFromIndices && (toIndex === fromIndex || toIndex === fromIndex + 1)) {
          toIndex = fromIndex;
        }
        setDragState({ fromIndex, toIndex, ...(groupFromIndices ? { groupFromIndices } : {}) });
      }
    }

    function onUp() {
      if (groupFromIndices && groupFromIndices.length > 1) {
        if (fromIndex !== toIndex) {
          reorderBeadsGroupRef.current(groupFromIndices, fromIndex, toIndex);
        }
        useStore.getState().clearEditSelection();
      } else if (fromIndex !== toIndex) {
        reorderBeadsRef.current(fromIndex, toIndex);
        const state = useStore.getState();
        const draggedBead = beadsRef.current?.[fromIndex];
        if (draggedBead && state.editSelectedIds.includes(draggedBead.instanceId)) {
          state.clearEditSelection();
        }
      }
      setDragState(null);
      gl.domElement.style.cursor = "";
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      gl.domElement.style.cursor = "";
      useStore.getState().setReorderDragLabel(null);
    };
  }, [isDragging]); // eslint-disable-line react-hooks/exhaustive-deps

  return { dragState, handleDragStart };
}

// ─── Panel drop (drag from BeadSelectorPanel) ─────────────────────────────────

export function usePanelDrop(
  beadsRef: React.RefObject<PlacedBead[]>,
  radiusRef: React.RefObject<number>,
  viewModeRef: React.RefObject<"3D" | "line">
): { panelDropSlot: number | null; dragFromPanel: BeadProduct | null } {
  const { gl, camera } = useThree();
  const { dragFromPanel, insertBead, setDragFromPanel } = useStore(useShallow((s) => ({
    dragFromPanel:    s.dragFromPanel,
    insertBead:       s.insertBead,
    setDragFromPanel: s.setDragFromPanel,
  })));
  const [panelDropSlot, setPanelDropSlot] = useState<number | null>(null);

  const dragFromPanelRef = useRef(dragFromPanel);
  dragFromPanelRef.current = dragFromPanel;
  const insertBeadRef = useRef(insertBead);
  insertBeadRef.current = insertBead;
  const setDragFromPanelRef = useRef(setDragFromPanel);
  setDragFromPanelRef.current = setDragFromPanel;

  useEffect(() => {
    if (!dragFromPanel) return;

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const target = new THREE.Vector3();
    let slot: number | null = null;

    function onMove(e: PointerEvent) {
      const rect = gl.domElement.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      if (raycaster.ray.intersectPlane(plane, target)) {
        const { isEvenlySpaced } = useStore.getState();
        const extraSpacingPerGap = isEvenlySpaced && viewModeRef.current === '3D'
          ? getEvenSpacingBonus(beadsRef.current!, radiusRef.current!)
          : 0;
        slot = resolveDropSlot(
          target, beadsRef.current!, radiusRef.current!, extraSpacingPerGap,
          viewModeRef.current === "line",
        );
        setPanelDropSlot(slot);
      }
    }

    function onUp(e: PointerEvent) {
      const rect = gl.domElement.getBoundingClientRect();
      const overCanvas =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom;
      if (overCanvas && slot !== null) {
        insertBeadRef.current(dragFromPanelRef.current!, slot);
      }
      setDragFromPanelRef.current(null);
      setPanelDropSlot(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setPanelDropSlot(null);
    };
  }, [dragFromPanel]); // eslint-disable-line react-hooks/exhaustive-deps

  return { panelDropSlot, dragFromPanel };
}