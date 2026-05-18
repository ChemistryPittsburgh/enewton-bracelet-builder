"use client";

/**
 * BraceletCord.tsx
 *
 * Renders the static bracelet cord as a torus in the XZ plane.
 * This is a procedural Three.js mesh — no GLB needed.
 *
 * When the freelancer provides a real cord/clasp GLB, swap this out
 * with a useGLTF() call (same as BeadOnBracelet.tsx does).
 *
 * Torus args: [radius, tubeRadius, radialSegments, tubularSegments]
 *   radius      = BRACELET_RADIUS from bead-layout.ts
 *   tubeRadius  = CORD_RADIUS from bead-layout.ts
 */

import { useStore } from "@/lib/store";
import { CORD_MATERIALS, BRACELET_SIZE_RADIUS } from "@/lib/constants";

export function BraceletCord() {
  const { bandMaterial, braceletSize } = useStore((s) => ({
    bandMaterial: s.bandMaterial,
    braceletSize: s.braceletSize,
  }));
  const mat = CORD_MATERIALS[bandMaterial] ?? CORD_MATERIALS["chord"];
  const radius = BRACELET_SIZE_RADIUS[braceletSize] ?? BRACELET_SIZE_RADIUS["small"];

  return (
    // Rotate 90° on X so the torus lies flat in the XZ plane (Y=0)
    <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <torusGeometry args={[radius, mat.tubeRadius, 16, 120]} />
      <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
    </mesh>
  );
}
