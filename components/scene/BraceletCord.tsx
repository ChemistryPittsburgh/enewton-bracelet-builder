"use client";
/**
 * BraceletCord.tsx
 *
 * Renders the bracelet cord as a procedural Three.js mesh — no GLB needed.
 *
 * 3D mode:  TorusGeometry in the XZ plane (rotated 90° on X so it lies flat).
 * Line mode: CylinderGeometry along the X axis (rotated 90° on Z).
 *
 * When the band material is "hairtie", the cord color is driven by
 * the user's selected hairtieColor (from the store) rather than the
 * static CORD_MATERIALS color.
 */

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { CORD_MATERIALS, BRACELET_SIZE_RADIUS, HAIRTIE_COLORS } from "@/lib/constants";
import { braceletArc } from "@/lib/bead-layout";

export function BraceletCord() {

  const bandMaterial = useStore((s) => s.bandMaterial);
  const braceletSize = useStore((s) => s.braceletSize);
  const viewMode     = useStore((s) => s.viewMode);
  const hairtieColor     = useStore((s) => s.hairtieColor);

  const mat    = CORD_MATERIALS[bandMaterial] ?? CORD_MATERIALS["stretchy"];
  const radius = BRACELET_SIZE_RADIUS[braceletSize] ?? BRACELET_SIZE_RADIUS["medium"];

  // For hairtie, override the cord color with the selected hairtie color
  const cordColor = bandMaterial === "hairtie"
    ? (HAIRTIE_COLORS.find((c) => c.value === hairtieColor)?.hex ?? mat.color)
    : mat.color;

  const transparent = (mat.opacity ?? 1) < 1;

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
        <meshStandardMaterial color={cordColor} roughness={mat.roughness} metalness={mat.metalness} opacity={mat.opacity ?? 1}
          transparent={transparent} />
      </mesh>
    );
  }

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <torusGeometry args={torusArgs} />
      <meshStandardMaterial color={cordColor} roughness={mat.roughness} metalness={mat.metalness} opacity={mat.opacity ?? 1}
        transparent={transparent} />
    </mesh>
  );
}