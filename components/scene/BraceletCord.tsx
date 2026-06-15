"use client";
/**
 * BraceletCord.tsx
 *
 * Renders the bracelet cord as a procedural Three.js mesh — no GLB needed.
 *
 * 3D mode:  TorusGeometry in the XZ plane (rotated 90° on X so it lies flat).
 * Line mode: CylinderGeometry along the X axis (rotated 90° on Z).
 *
 * When the band material is "hairtie", the cord colour is driven by
 * the user's selected hairtieColor (from the store) rather than the
 * static CORD_MATERIALS colour.
 */
import { useStore } from "@/lib/store";
import { CORD_MATERIALS, BRACELET_SIZE_RADIUS, HAIRTIE_COLORS } from "@/lib/constants";
import { braceletArc } from "@/lib/bead-layout";

export function BraceletCord() {
  const { bandMaterial, braceletSize, viewMode, hairtieColor } = useStore((s) => ({
    bandMaterial:  s.bandMaterial,
    braceletSize:  s.braceletSize,
    viewMode:      s.viewMode,
    hairtieColor:  s.hairtieColor,
  }));

  const mat    = CORD_MATERIALS[bandMaterial] ?? CORD_MATERIALS["stretchy"];
  const radius = BRACELET_SIZE_RADIUS[braceletSize] ?? BRACELET_SIZE_RADIUS["medium"];

  // For hairtie, override the cord colour with the selected hairtie colour
  const cordColor = bandMaterial === "hairtie"
    ? (HAIRTIE_COLORS.find((c) => c.value === hairtieColor)?.hex ?? mat.color)
    : mat.color;

  const transparent = (mat.opacity ?? 1) < 1;

  if (viewMode === "line") {
    const length = braceletArc(radius);
    return (
      <mesh rotation={[0, 0, Math.PI / 2]} receiveShadow>
        <cylinderGeometry args={[mat.tubeRadius, mat.tubeRadius, length, 16]} />
        <meshStandardMaterial
          color={cordColor}
          roughness={mat.roughness}
          metalness={mat.metalness}
          opacity={mat.opacity ?? 1}
          transparent={transparent}
        />
      </mesh>
    );
  }

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <torusGeometry args={[radius, mat.tubeRadius, 16, 120]} />
      <meshStandardMaterial
        color={cordColor}
        roughness={mat.roughness}
        metalness={mat.metalness}
        opacity={mat.opacity ?? 1}
        transparent={transparent}
      />
    </mesh>
  );
}