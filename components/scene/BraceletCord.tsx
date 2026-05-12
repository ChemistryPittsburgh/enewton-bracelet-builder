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

import { BRACELET_RADIUS, CORD_RADIUS } from "@/lib/bead-layout";
import { useStore } from "@/lib/store";
import type { StringMaterial } from "@/types";

const CORD_MATERIALS: Record<StringMaterial, { color: string; roughness: number; metalness: number }> = {
  wire:    { color: "#a8a9ad", roughness: 0.15, metalness: 0.9 },
  chord:   { color: "#c8a97e", roughness: 0.4,  metalness: 0.6 },
  elastic: { color: "#e8e0d8", roughness: 0.8,  metalness: 0.05 },
};

export function BraceletCord() {
  const stringMaterial = useStore((s) => s.stringMaterial);
  const mat = CORD_MATERIALS[stringMaterial];

  return (
    // Rotate 90° on X so the torus lies flat in the XZ plane (Y=0)
    <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <torusGeometry args={[BRACELET_RADIUS, CORD_RADIUS, 16, 120]} />
      <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
    </mesh>
  );
}
