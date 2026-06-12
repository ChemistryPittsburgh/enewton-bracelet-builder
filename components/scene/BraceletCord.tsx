"use client";

/**
 * BraceletCord.tsx
 *
 * Renders the bracelet cord as a procedural Three.js mesh — no GLB needed.
 *
 * 3D mode:  TorusGeometry in the XZ plane (rotated 90° on X so it lies flat).
 *           args: [radius, tubeRadius, radialSegments, tubularSegments]
 *
 * Line mode: CylinderGeometry along the X axis (rotated 90° on Z).
 *            Length = full bracelet circumference for the selected size.
 *
 * Both modes read colour/thickness from CORD_MATERIALS keyed by bandMaterial.
 */

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { CORD_MATERIALS, BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { braceletArc } from "@/lib/bead-layout";

export function BraceletCord() {
  const bandMaterial = useStore((s) => s.bandMaterial);
  const braceletSize = useStore((s) => s.braceletSize);
  const viewMode     = useStore((s) => s.viewMode);

  const mat    = CORD_MATERIALS[bandMaterial] ?? CORD_MATERIALS["cord"];
  const radius = BRACELET_SIZE_RADIUS[braceletSize] ?? BRACELET_SIZE_RADIUS["small"];

  // Memoize args arrays so R3F only reconstructs the geometry when the values
  // actually change, not on every unrelated parent render.
  const torusArgs = useMemo<[number, number, number, number]>(
    () => [radius, mat.tubeRadius, 16, 120],
    [radius, mat.tubeRadius],
  );
  const length = braceletArc(radius);
  const cylinderArgs = useMemo<[number, number, number, number]>(
    () => [mat.tubeRadius, mat.tubeRadius, length, 16],
    [mat.tubeRadius, length],
  );

  if (viewMode === 'line') {
    // CylinderGeometry is along Y by default; rotate 90° on Z to lay along X
    return (
      <mesh rotation={[0, 0, Math.PI / 2]} receiveShadow>
        <cylinderGeometry args={cylinderArgs} />
        <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
      </mesh>
    );
  }

  return (
    // Rotate 90° on X so the torus lies flat in the XZ plane (Y=0)
    <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <torusGeometry args={torusArgs} />
      <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
    </mesh>
  );
}
