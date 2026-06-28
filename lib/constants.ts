import type { BandMaterial, BraceletSize, BeadProduct } from "@/types";

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

/** Default canvas background color. */
export const SCENE_BACKGROUND = "#f5f0eb";
export const SCENE_BACKGROUND_PREVIEW_BEAD = "#f1f3f5"; // currently light-grey

/** Fixed pixel dimensions for saved bracelet thumbnail PNGs (square). */
export const THUMBNAIL_SIZE = 600;

/** Canvas background color when edit mode is active. */
export const EDIT_MODE_BACKGROUND = "#E8EEF3";

/** Color of ring when bead is selected/highlights */
export const HIGHLIGHT_SELECT_COLOR = "#a38d48";  //#a38d48
export const EDIT_MODE_HIGHLIGHT_SELECT_COLOR = "#1F3A5F";

/* Color of Hover Ring */
export const EDIT_MODE_RING_HOVER = "#a38d48";

/**
 * Edit-mode "group beads" feature (saved selection groups in the replace tool).
 * When false, the "+ New group" button is hidden and the replace tool stays in
 * plain select-and-replace mode. Set to false to turn grouping off.
 */
export const EDIT_GROUPING_ENABLED = false;

/** Per-group colors for edit-replace mode. Each entry has a hex value (for the
 *  3D ring in AllBeads) and Tailwind active/inactive classes (for EditReplaceDialog). */
export const EDIT_REPLACE_GROUPS = [
  { hex: "#1F3A5F", active: "bg-navy text-white",      inactive: "text-color-base hover:bg-light-grey" },
  { hex: "#a38d48", active: "bg-gold text-white",      inactive: "text-color-base hover:bg-light-grey" },
  { hex: "#2d7a5e", active: "bg-[#2d7a5e] text-white", inactive: "text-color-base hover:bg-light-grey" },
] as const;

/** Hex colors extracted from EDIT_REPLACE_GROUPS — used for 3D selection ring tints. */
export const EDIT_REPLACE_GROUP_COLORS = EDIT_REPLACE_GROUPS.map((g) => g.hex);

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

/** Radial setback for crystal charms (metres). Negative = pushed back / inward,
 *  toward the bracelet centre, so the bail seats onto the cord instead of
 *  floating in front of the band. Applied radially (like FLOAT_CHARM_DEPTH_OFFSET)
 *  so it holds at every position around the bracelet. Tune to taste; flip the
 *  sign if it moves the wrong way. */
export const CRYSTAL_CHARM_DEPTH_OFFSET = -0.0005;

/** Float charms sit sideways on the cord, presenting only their thin edge.
 *  Their layout arc contribution, collision body width, and hit-box depth are
 *  all scaled by this single factor so the thin profile is treated consistently. */
export const FLOAT_CHARM_THIN_SCALE = 0.35;

/** Fixed camera position for line view — locked, no user controls. */
export const LINE_VIEW_CAMERA_POSITION: [number, number, number] = [0, 0.05, 0.09];

/** Camera Y height for top-down edit mode in line view. */
export const LINE_VIEW_EDIT_HEIGHT = 0.10;

/** Camera position for the side/angled edit mode view — lower and further forward than the default. */
export const CAMERA_EDIT_SIDE_POSITION: [number, number, number] = [0, 0.025, 0.09];

/** Distance from bracelet centre for the side edit view (magnitude of CAMERA_EDIT_SIDE_POSITION). */
export const CAMERA_EDIT_SIDE_DISTANCE = Math.hypot(...CAMERA_EDIT_SIDE_POSITION);

/** Distance step (metres) for each Zoom In / Zoom Out button press in edit mode. */
export const CAMERA_EDIT_ZOOM_STEP = 0.015;

// ─── Cord ─────────────────────────────────────────────────────────────────────

/** Visual properties for the cord torus mesh, keyed by string material.
 *  color      — hex base color of the cord
 *  roughness  — 0 (mirror) → 1 (fully diffuse)
 *  metalness  — 0 (dielectric) → 1 (metal); wire is nearly full metal
 *  tubeRadius — torus tube radius in metres; controls how thick the cord appears
 */
export const CORD_MATERIALS: Record<BandMaterial, { color: string; roughness: number; metalness: number; tubeRadius: number; opacity: number }> = {
  stretchy: { color: "#e8e0d8", roughness: 0.15, metalness: 0.65, tubeRadius: 0.0003, opacity: 0.7 },
  hairtie:  { color: "#000000", roughness: 0.8,  metalness: 0,    tubeRadius: 0.00052, opacity: 1 },
};

// ─── Hairtie ──────────────────────────────────────────────────────────────────

/** Fixed bracelet size when hairtie material is selected (5.25" circumference). */
export const HAIRTIE_DEFAULT_SIZE: BraceletSize = "medium";

/** Available hairtie cord colors — value is persisted, hex drives the 3D cord. */
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
//   color           — hex base color of the metal
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
  gold:        { metalness: 1,    roughness: 0.18, envMapIntensity: 0.1 },
  gold_filled: { metalness: 1,    roughness: 0.18, envMapIntensity: 0.1 },
  silver:      { metalness: 1,    roughness: 0.18, envMapIntensity: 0.35 },
  sterling:    { metalness: 1,    roughness: 0.18, envMapIntensity: 0.35 },
  rose_gold:   { metalness: 0.95, roughness: 0.2,  envMapIntensity: 0.9 },
  gem:         { metalness: 0.5 },
  crystal:     { metalness: 0.5 },
  resin:       { metalness: 0.5 },
};

/** Fallback when product.finish is undefined. Set to null to disable. */
export const DEFAULT_FINISH: string | null = "gold";

export const MIN_BEAD_DIAMETER = 0.2;

/** Maximum iterations when counting how many items fit in freed bar arc. */
export const BAR_REPLACE_FIT_LIMIT = 500;

export const MIN_CHARM_ARC_MM = 1.8;
export const BEAD_CATEGORIES = ["bead", "charm", "letter_charm", "float_charm", "bar"] as const;
export const MATERIAL_OPTIONS = ["gold", "silver", "rose_gold", "gem", "gold_filled", "sterling", "crystal", "resin"] as const;

// ─── Spacer beads ───────────────────────────────────────────────────────────
// Spacers are invisible gap beads with no GLB — they only consume arc space.

/** Preset sizes offered in the spacer picker (millimetres). */
export const SPACER_SIZES_MM = [1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 13, 14];

/**
 * Creates a fake BeadProduct for a spacer of a given size.
 * Uses a deterministic negative ID so the same size always maps to the same
 * "product" — important for deduplication and Select-All behaviour.
 */
export function createSpacerProduct(sizeMm: number): BeadProduct {
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
  };
}

// ─── Seed bead segments ─────────────────────────────────────────────────────

/** Default individual bead diameter range for seed beads (mm). */
export const SEED_BEAD_SIZE_RANGE: [number, number] = [1.2, 2.0];

/**
 * Selectable nominal seed bead sizes (mm) for the "seed" shape — Small (1) and
 * Large (2). Each bead still varies slightly around the chosen nominal (see
 * SEED_BEAD_SIZE_VARIANCE / seedBeadSizeRange).
 */
export const SEED_BEAD_SIZES_MM = [1, 2] as const;

/** Human labels for the selectable seed sizes. */
export const SEED_BEAD_SIZE_LABELS: Record<number, string> = { 1: "Small", 2: "Large" };

/** ± per-bead size variance as a fraction of the nominal size. */
export const SEED_BEAD_SIZE_VARIANCE = 0.15;

/** Per-bead diameter range [min,max] (mm) for a chosen nominal seed size. */
export function seedBeadSizeRange(sizeMm: number): [number, number] {
  const d = sizeMm * SEED_BEAD_SIZE_VARIANCE;
  return [Math.round((sizeMm - d) * 100) / 100, Math.round((sizeMm + d) * 100) / 100];
}

/**
 * Thickness-to-diameter ratio of the seed bead GLB model.
 * Native dimensions: 1.6mm diameter × 1.15mm thick → 0.72.
 * Packing advances by this fraction of the diameter so adjacent beads'
 * flat faces sit flush. Shared by the packing math (seed-bead-utils) and the
 * quantity→arc estimate in the picker so the two never drift apart.
 */
export const SEED_BEAD_THICKNESS_RATIO = 0.72;

/** Thickness-to-diameter ratio for round beads (spherical, so thickness === diameter). */
export const ROUND_BEAD_THICKNESS_RATIO = 1.0;

/** Native cross-section diameter of the seed bead GLB (metres). */
export const SEED_BEAD_NATIVE_DIAMETER = 0.0016;

/** Available sizes for round seed beads (mm). */
export const ROUND_SEED_SIZES_MM = [1, 2] as const;

/** Path to the round seed bead GLB model (Classic Bead 2mm). */
export const ROUND_SEED_BEAD_MODEL = "/models/classic-bead-2mm.glb";

/** Maximum arc length a single seed segment can occupy (mm). */
export const SEED_SEGMENT_MAX_MM = 190;

/**
 * ID offset for seed segment fake products — well below spacer IDs (-100 to -1400)
 * to avoid collisions. Each segment gets a unique negative ID based on its
 * random seed, so Select-All treats each independently.
 */
const SEED_ID_OFFSET = -100_000;

/**
 * Creates a fake BeadProduct for a seed bead segment.
 * `diameter` is set to the total arc length (metres) so the existing layout
 * math works without modification.
 */
export function createSeedSegmentProduct(arcLengthMm: number, randomSeed: number, seedShape?: "seed" | "round", roundSizeMm?: number, material?: string): BeadProduct {
  const isRound = seedShape === "round";
  const label = isRound
    ? `Round ${roundSizeMm ?? 2}mm beads (${arcLengthMm}mm)`
    : `Seed beads (${arcLengthMm}mm)`;
  return {
    id:             SEED_ID_OFFSET - randomSeed,
    name:           label,
    slug:           `seed-segment-${randomSeed}`,
    glb_path:       "",
    bead_category:  "seed_segment" as const,
    bead_type:      isRound ? "Round Seed" : "Seed",
    material:       material ?? "gold",
    diameter:       arcLengthMm / 1000,
    size_mm:        arcLengthMm,
    sku:            null,
    color:          null,
    active:         1,
  };
}