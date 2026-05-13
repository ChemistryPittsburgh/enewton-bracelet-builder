import type { StringMaterial, BraceletSize } from "@/types";

/** Cord centreline radius per bracelet size, derived from wrist circumference in inches.
 *  Formula: (circumference_in * 0.0254) / (2π)  →  metres
 */
export const BRACELET_SIZE_RADIUS: Record<BraceletSize, number> = {
  "x-small": (5.5  * 0.0254) / (2 * Math.PI), // 5.5"  circumference → ≈ 22.2 mm radius
  "small":   (6.25 * 0.0254) / (2 * Math.PI), // 6.25" circumference → ≈ 25.3 mm radius
  "large":   (7.25 * 0.0254) / (2 * Math.PI), // 7.25" circumference → ≈ 29.3 mm radius
};

/** UI label pairs for the string material toggle buttons. */
export const BRACELET_MATERIALS: { value: StringMaterial; label: string }[] = [
  { value: "wire",    label: "Wire" },
  { value: "cord",    label: "Cord" },
  { value: "elastic", label: "Elastic" },
];

/** UI label pairs for the bracelet size toggle buttons. */
export const BRACELET_SIZES: { value: BraceletSize; label: string }[] = [
  { value: "x-small", label: "X-Small" },
  { value: "small",   label: "Small" },
  { value: "large",   label: "Large" },
];

/** Visual properties for the cord torus mesh, keyed by string material.
 *  color      — hex base colour of the cord
 *  roughness  — 0 (mirror) → 1 (fully diffuse)
 *  metalness  — 0 (dielectric) → 1 (metal); wire is nearly full metal
 *  tubeRadius — torus tube radius in metres; controls how thick the cord appears
 */
export const CORD_MATERIALS: Record<StringMaterial, { color: string; roughness: number; metalness: number; tubeRadius: number }> = {
  wire:    { color: "#a8a9ad", roughness: 0.15, metalness: 0.9,  tubeRadius: 0.0008 }, // silver-grey, ~1.6 mm diameter
  cord:    { color: "#c8a97e", roughness: 0.4,  metalness: 0.6,  tubeRadius: 0.0013 }, // tan/gold, ~2.6 mm diameter
  elastic: { color: "#e8e0d8", roughness: 0.8,  metalness: 0.05, tubeRadius: 0.0004 }, // off-white, ~0.8 mm diameter
};
