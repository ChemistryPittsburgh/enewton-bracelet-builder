"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { getBeadAngle } from "@/lib/bead-layout";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import type { PlacedBead } from "@/types";
import { BeadOnBracelet } from "./BeadOnBracelet";
import { BeadErrorBoundary } from "./BeadErrorBoundary";

interface DragState {
  fromIndex: number;
  toIndex: number;
}

function nearestSlot(
  point: THREE.Vector3,
  beads: PlacedBead[],
  radius: number
): number {
  const angle = Math.atan2(point.z, point.x);
  const TWO_PI = 2 * Math.PI;
  let nearest = 0;
  let minDiff = Infinity;
  for (let i = 0; i < beads.length; i++) {
    let beadAngle = getBeadAngle(i, beads, radius) % TWO_PI;
    if (beadAngle > Math.PI) beadAngle -= TWO_PI;
    let diff = Math.abs(angle - beadAngle);
    if (diff > Math.PI) diff = TWO_PI - diff;
    if (diff < minDiff) { minDiff = diff; nearest = i; }
  }
  return nearest;
}

export function AllBeads() {
  const { beads, reorderBeads, braceletSize } = useStore((s) => ({
    beads: s.beads,
    reorderBeads: s.reorderBeads,
    braceletSize: s.braceletSize,
  }));
  const { gl, camera } = useThree();
  const radius = BRACELET_SIZE_RADIUS[braceletSize];

  const [dragState, setDragState] = useState<DragState | null>(null);

  // Refs so the effect closure always reads the latest values without re-subscribing
  const beadsRef = useRef(beads);
  beadsRef.current = beads;
  const reorderBeadsRef = useRef(reorderBeads);
  reorderBeadsRef.current = reorderBeads;
  const radiusRef = useRef(radius);
  radiusRef.current = radius;

  function handleDragStart(index: number) {
    setDragState({ fromIndex: index, toIndex: index });
  }

  const isDragging = dragState !== null;

  useEffect(() => {
    if (!dragState) return;

    const horizontalPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const target = new THREE.Vector3();
    const fromIndex = dragState.fromIndex;
    let toIndex = dragState.toIndex;

    function onMove(e: PointerEvent) {
      const rect = gl.domElement.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      if (raycaster.ray.intersectPlane(horizontalPlane, target)) {
        toIndex = nearestSlot(target, beadsRef.current, radiusRef.current);
        setDragState({ fromIndex, toIndex });
      }
    }

    function onUp() {
      if (fromIndex !== toIndex) reorderBeadsRef.current(fromIndex, toIndex);
      setDragState(null);
      gl.domElement.style.cursor = "";
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isDragging]); // eslint-disable-line react-hooks/exhaustive-deps

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
                dragState !== null &&
                dragState.toIndex === index &&
                dragState.fromIndex !== index
              }
              onDragStart={handleDragStart}
            />
          </Suspense>
        </BeadErrorBoundary>
      ))}
    </group>
  );
}
