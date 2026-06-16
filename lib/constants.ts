import type { BandMaterial, BraceletSize } from "@/types";

/** Cord centreline radius per bracelet size, derived from wrist circumference in inches.
 *  Formula: (circumference_in * 0.0254) / (2π)  →  metres
 */
export const BRACELET_SIZE_RADIUS: Record<BraceletSize, number> = {
  "small":  (5.5  * 0.0254) / (2 * Math.PI), // 5.5"  circumference → ≈ 22.2 mm radius
  "medium": (6.25 * 0.0254) / (2 * Math.PI), // 6.25" circumference → ≈ 25.3 mm radius
  "large":  (7.25 * 0.0254) / (2 * Math.PI), // 7.25" circumference → ≈ 29.3 mm radius
};

/** UI label pairs for the string material toggle buttons. */
export const BRACELET_MATERIALS: { value: BandMaterial; label: string }[] = [
  { value: "stretchy", label: "Stretchy" },
  { value: "hairtie",  label: "Hairtie" },
];

/** UI label pairs for the bracelet size toggle buttons. */
export const BRACELET_SIZES: { value: BraceletSize; label: string }[] = [
  { value: "small",  label: "5.5" },
  { value: "medium", label: "6.25" },
  { value: "large",  label: "7.25" },
];

export const DEFAULT_BRACELET_NAME = "New Bracelet";

/** General enewton logo */
export const LOGO_SRC = "/images/enewton-logo.svg";
export const LOGO_ALT = "eNewton Logo";

// ─── Scene ────────────────────────────────────────────────────────────────────

/** Default canvas background colour. */
export const SCENE_BACKGROUND = "#f5f0eb";
export const SCENE_BACKGROUND_PREVIEW_BEAD = "#f1f3f5"; // currently light-grey

/** Fixed pixel dimensions for saved bracelet thumbnail PNGs (square). */
export const THUMBNAIL_SIZE = 600;

/** Canvas background colour when edit mode is active. */
export const EDIT_MODE_BACKGROUND = "#eff6ff";

/** Color of ring when bead is selected/highlights */
export const HIGHLIGHT_SELECT_COLOR = "#a38d48";  //#a38d48
export const EDIT_MODE_HIGHLIGHT_SELECT_COLOR = "#1F3A5F";

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
export const CHARM_ROTATION: [number, number, number] = [Math.PI / 2, 0, Math.PI * 1.5];

/** Euler rotation for float charms — centred on the cord instead of dangling below.
 *  Tune this single constant to adjust orientation. */
export const FLOAT_CHARM_ROTATION: [number, number, number] = [Math.PI / 2, -0.2, -0.2];

/** Z-axis depth offset for float charms (metres). Positive = forward / outward.
 *  Regular charms default to −0.0005 (slightly inward); float charms sit further
 *  forward so they clear the cord visually. Tune as needed. */
export const FLOAT_CHARM_DEPTH_OFFSET = 0.0008;

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
export const CORD_MATERIALS: Record<BandMaterial, { color: string; roughness: number; metalness: number; tubeRadius: number; opacity: number }> = {
  stretchy: { color: "#e8e0d8", roughness: 0.15, metalness: 0.65, tubeRadius: 0.00025, opacity: 0.7 },
  hairtie:  { color: "#000000", roughness: 0.8,  metalness: 0,    tubeRadius: 0.00052, opacity: 1 },
};

// ─── Hairtie ──────────────────────────────────────────────────────────────────

/** Fixed bracelet size when hairtie material is selected (5.25" circumference). */
export const HAIRTIE_DEFAULT_SIZE: BraceletSize = "medium";

/** Available hairtie cord colours — value is persisted, hex drives the 3D cord. */
export const HAIRTIE_COLORS: { value: string; label: string; hex: string }[] = [
  { value: "gray",          label: "Gray",          hex: "#9CA3AF" },
  { value: "white",         label: "White",         hex: "#F5F5F4" },
  { value: "mint",          label: "Mint",          hex: "#6EE7B7" },
  { value: "pink",          label: "Pink",          hex: "#F9A8D4" },
  { value: "bright red",    label: "Bright Red",    hex: "#EF4444" },
  { value: "navy",          label: "Navy",          hex: "#1E3A5F" },
  { value: "wine",          label: "Wine",          hex: "#722F37" },
  { value: "light blue",    label: "Light Blue",    hex: "#93C5FD" },
  { value: "onyx",          label: "Onyx",          hex: "#1C1C1C" },
  { value: "gold",          label: "Gold",          hex: "#D4A843" },
  { value: "orange",        label: "Orange",        hex: "#F97316" },
  { value: "cobalt",        label: "Cobalt",        hex: "#1D4ED8" },
  { value: "bright orange", label: "Bright Orange", hex: "#FB923C" },
  { value: "purple",        label: "Purple",        hex: "#7C3AED" },
  { value: "dark green",    label: "Dark Green",    hex: "#166534" },
];

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
  gold:      { metalness: 1, roughness: 0.1, envMapIntensity: 0.3 },
  silver:    { metalness: 1,   roughness: 0.12, envMapIntensity: 0.35 },
  rose_gold: { metalness: 0.95, roughness: 0.2, envMapIntensity: 0.9 },
  gem:       { metalness: 0.5 },
};

/** Fallback when product.finish is undefined. Set to null to disable. */
export const DEFAULT_FINISH: string | null = "gold";

export const MIN_BEAD_DIAMETER = 0.2;

export const BEAD_CATEGORIES = ["bead", "charm", "float_charm", "tube", "gem"] as const;
export const MATERIAL_OPTIONS = ["gold", "silver", "rose_gold", "gem"] as const;

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
    sku:            null,
    color:          null,
    active:         1,
    body_width_mm:  null,
    bail_width_mm:  null,
    depth_offset:   null,
  };
}