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

import { useStore } from "@/lib/store";
import { CORD_MATERIALS, BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { braceletArc } from "@/lib/bead-layout";

export function BraceletCord() {
  const { bandMaterial, braceletSize, viewMode } = useStore((s) => ({
    bandMaterial: s.bandMaterial,
    braceletSize: s.braceletSize,
    viewMode:     s.viewMode,
  }));
  const mat    = CORD_MATERIALS[bandMaterial] ?? CORD_MATERIALS["cord"];
  const radius = BRACELET_SIZE_RADIUS[braceletSize] ?? BRACELET_SIZE_RADIUS["small"];

  if (viewMode === 'line') {
    // Cylinder along the X axis — full bracelet circumference for the selected size
    const length = braceletArc(radius);
    return (
      // CylinderGeometry is along Y by default; rotate 90° on Z to lay along X
      <mesh rotation={[0, 0, Math.PI / 2]} receiveShadow>
        <cylinderGeometry args={[mat.tubeRadius, mat.tubeRadius, length, 16]} />
        <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
      </mesh>
    );
  }

  return (
    // Rotate 90° on X so the torus lies flat in the XZ plane (Y=0)
    <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <torusGeometry args={[radius, mat.tubeRadius, 16, 120]} />
      <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
    </mesh>
  );
}
