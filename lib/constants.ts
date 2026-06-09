import type { BandMaterial, BraceletSize } from "@/types";

/** Cord centreline radius per bracelet size, derived from wrist circumference in inches.
 *  Formula: (circumference_in * 0.0254) / (2π)  →  metres
 */
export const BRACELET_SIZE_RADIUS: Record<BraceletSize, number> = {
  "x-small": (5.5  * 0.0254) / (2 * Math.PI), // 5.5"  circumference → ≈ 22.2 mm radius
  "small":   (6.25 * 0.0254) / (2 * Math.PI), // 6.25" circumference → ≈ 25.3 mm radius
  "large":   (7.25 * 0.0254) / (2 * Math.PI), // 7.25" circumference → ≈ 29.3 mm radius
};

/** UI label pairs for the string material toggle buttons. */
export const BRACELET_MATERIALS: { value: BandMaterial; label: string }[] = [
  { value: "wire",    label: "Wire" },
  { value: "cord",    label: "Cord" },
  { value: "elastic", label: "Elastic" },
];

/** UI label pairs for the bracelet size toggle buttons. */
export const BRACELET_SIZES: { value: BraceletSize; label: string }[] = [
  { value: "x-small", label: "5.5" },
  { value: "small",   label: "6.25" },
  { value: "large",   label: "7.25" },
];

export const DEFAULT_BRACELET_NAME = "New Bracelet";

/** General enewton logo */
export const LOGO_SRC = "/images/enewton-logo.svg";
export const LOGO_ALT = "eNewton Logo";

// ─── Scene ────────────────────────────────────────────────────────────────────

/** Default canvas background colour. */
export const SCENE_BACKGROUND = "#f5f0eb";

/** Fixed pixel dimensions for saved bracelet thumbnail PNGs (square). */
export const THUMBNAIL_SIZE = 600;

/** Canvas background colour when edit mode is active. */
export const EDIT_MODE_BACKGROUND = "#dbeafe";

// ─── Camera ───────────────────────────────────────────────────────────────────

/** Camera field of view in degrees. */
export const CAMERA_FOV = 50;

/** Default world position [x, y, z] — used for both the Canvas initial camera and the zoom-out target. */
export const CAMERA_DEFAULT_POSITION: [number, number, number] = [0, 0.08, 0.06];

/** Near clipping plane in metres — keep small to avoid z-fighting at bracelet scale. */
export const CAMERA_NEAR = 0.001;

/** Far clipping plane in metres. */
export const CAMERA_FAR = 5;

/** Minimum scroll-zoom distance from bracelet centre, in metres. */
export const CAMERA_MIN_DISTANCE = 0.04;

/** Maximum scroll-zoom distance from bracelet centre, in metres. */
export const CAMERA_MAX_DISTANCE = 0.18;



/** How far the camera sits outside the bracelet along the bead's own radial axis when zoomed in, in metres. */
/** Vertical offset added to the camera Y when zooming in to a bead, in metres. */
export const ZOOM_BEAD_RADIAL_DISTANCE = 0.06;
export const ZOOM_BEAD_Y_OFFSET = 0.015;

/** Camera Y height for the top-down edit mode view, in metres. */
export const CAMERA_EDIT_HEIGHT = 0.12;

/**
 * Minimum arc half-contribution for a charm, in metres.
 * Ensures adjacent charms can't fully overlap even when body_width_mm is
 * missing from the API. 0.008 = 8 mm half-width → 16 mm min bail-to-bail.
 */
export const CHARM_MIN_ARC_HALF = 0.0008;

/** Euler rotation [rx, ry, rz] applied to every charm GLB to orient it hanging from the cord. */
export const CHARM_ROTATION: [number, number, number] = [Math.PI / 2, 0, Math.PI / 1.8];

/** Fixed camera position for line view — locked, no user controls. */
export const LINE_VIEW_CAMERA_POSITION: [number, number, number] = [0, 0.05, 0.09];

/** Camera Y height for top-down edit mode in line view. */
export const LINE_VIEW_EDIT_HEIGHT = 0.10;

/** Camera position for the side/angled edit mode view — lower and further forward than the default. */
export const CAMERA_EDIT_SIDE_POSITION: [number, number, number] = [0, 0.06, 0.09];

// ─── Cord ─────────────────────────────────────────────────────────────────────

/** Visual properties for the cord torus mesh, keyed by string material.
 *  color      — hex base colour of the cord
 *  roughness  — 0 (mirror) → 1 (fully diffuse)
 *  metalness  — 0 (dielectric) → 1 (metal); wire is nearly full metal
 *  tubeRadius — torus tube radius in metres; controls how thick the cord appears
 */
export const CORD_MATERIALS: Record<BandMaterial, { color: string; roughness: number; metalness: number; tubeRadius: number }> = {
  wire:    { color: "#c8a97e", roughness: 0.15, metalness: 0.9,  tubeRadius: 0.0006 }, // silver-grey, ~1.6 mm diameter
  cord:    { color: "#000000", roughness: 1,  metalness: 0.0,  tubeRadius: 0.008 }, // tan/gold, ~2.6 mm diameter
  elastic: { color: "#e8e0d8", roughness: 0.8,  metalness: 0.05, tubeRadius: 0.0004 }, // off-white, ~0.8 mm diameter
};

// ─── Material finish presets ────────────────────────────────────────────────
// Keyed by product.finish — each property is optional and only overrides the
// GLB material when present.  Metallic-only: the traverse in BeadOnBracelet
// skips any mesh whose GLB metalness is < 0.5, so stone, enamel, and other
// non-metal surfaces are never touched.
//
//   color           — hex base colour of the metal
//   metalness       — 0 (dielectric) → 1 (full metal)
//   roughness       — 0 (mirror polish) → 1 (fully matte)
//   envMapIntensity — 0 (no reflections) → 1 (full environment reflections)

export interface FinishPreset {
  color?:           string;
  metalness?:       number;
  roughness?:       number;
  envMapIntensity?: number;
}

export const FINISH_PRESETS: Record<string, FinishPreset> = {
  gold:      { metalness: 0.85, roughness: 0.05, envMapIntensity: 0.3 },
  silver:    { color: "#c0c0c0", metalness: 0.95, roughness: 0.2,  envMapIntensity: 0.9  },
  rose_gold: { color: "#c9a078", metalness: 0.9,  roughness: 0.3,  envMapIntensity: 0.75 },
};

/** Fallback when product.finish is undefined. Set to null to disable. */
export const DEFAULT_FINISH: string | null = "gold";

/** Set the smallest bead diameter possible */
export const MAX_BEAD_DIAMETER = 0.8;

// ─── Spacer beads ───────────────────────────────────────────────────────────
// Spacers are invisible gap beads with no GLB — they only consume arc space.

/** Preset sizes offered in the spacer picker (millimetres). */
export const SPACER_SIZES_MM = [1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 13, 14];

/**
 * Creates a fake BeadProduct for a spacer of a given size.
 * Uses a deterministic negative ID so the same size always maps to the same
 * "product" — important for deduplication and Select-All behaviour.
 */
export function createSpacerProduct(sizeMm: number) {
  return {
    id:             -(Math.round(sizeMm * 100)),
    name:           `${sizeMm}mm Spacer`,
    slug:           `spacer-${sizeMm}mm`,
    glb_path:       "",
    bead_category:  "spacer" as const,
    bead_type:      "Spacer",
    material:       null,
    diameter:       sizeMm / 1000,
    size_mm:        sizeMm,
    body_width_mm:  null,
    bail_width_mm:  null,
    depth_offset:   null,
  };
}