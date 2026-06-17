/**
 * bead-layout.ts
 *
 * Geometry helpers for placing beads in two layouts:
 *   • 3D circular — beads arranged on a torus in the XZ plane (Y = 0)
 *   • Line        — beads laid out along the X axis, centred at world origin
 *
 * Coordinate system (both layouts):
 *   - Y = 0 is the cord centre line
 *   - The bead's hole axis is its local Y axis (GLB convention)
 *
 * Circular layout: outerRotation turns each bead to face radially outward;
 *   the cord (torus in XZ plane) threads through each hole (hole stays on world Y).
 *
 * Line layout: outerRotation [0, -π/2, 0] makes every bead face the camera (+Z);
 *   the cord cylinder runs along X through each bead centre.
 *
 *   - Bead diameter: pulled dynamically from the bead catalog (metres)
 */

// ─── Bracelet constants ───────────────────────────────────────────────────────

type BeadLike = {
  product: {
    diameter: number;
    bead_category?: string | null;
    body_width_mm?: number | null;
  };
};

/** Radius of the bracelet cord centreline, in metres. ~182 mm circumference. */
const BRACELET_RADIUS = 0.029;

/** Visual radius of the cord */
export const CORD_RADIUS = 0.0008;

/**
 * Default gap between adjacent beads (metres).
 * Negative values pull beads closer together.
 * 0 = beads just touching
 * -0.001 = beads slightly overlapping (good for tight stacking)
 * Positive values add space between beads
 */
export const BEAD_SPACING = -0.000025;

/**
 * Per-category spacing overrides (metres).
 * When two adjacent items have different categories the larger
 * (least-negative / most-positive) spacing wins, so items that
 * need extra room always get it.
 *
 * Add new categories here as they appear in the catalog.
 */
const CATEGORY_SPACING: Record<string, number> = {
  bead:        BEAD_SPACING,     
  charm:       0.00004,     
  float_charm: 0.00002,     
  gem:         0.00001,             
  tube:        BEAD_SPACING,    
  spacer:      0,               
  cross: 0.0001              
};

/** Returns the gap (metres) to place between two adjacent beads. */
function getSpacing(a: BeadLike, b: BeadLike): number {
  const sA = CATEGORY_SPACING[a.product.bead_category ?? "bead"] ?? BEAD_SPACING;
  const sB = CATEGORY_SPACING[b.product.bead_category ?? "bead"] ?? BEAD_SPACING;
  return Math.max(sA, sB);
}

/** Controls where beads start (set to 0 to start bead adding on the right) */
const START_ANGLE_OFFSET = Math.PI / 2;

export function braceletArc(radius: number): number {
  return 2 * Math.PI * radius;
}

// Returns the half-arc a bead contributes toward a given neighbor.
// Charm–charm pairs use body_width_mm (disc body width); all others use diameter.
// Float charms sit sideways on the cord, so their arc contribution is scaled
// down to match their thin edge profile (same 0.35 factor as the hit box).
const FLOAT_CHARM_ARC_SCALE = 0.35;

function arcHalf(bead: BeadLike, neighbor: BeadLike): number {
  const bc = bead.product.bead_category;
  const nc = neighbor.product.bead_category;
  if (
    (bc === "charm" || bc === "float_charm") &&
    (nc === "charm" || nc === "float_charm") &&
    bead.product.body_width_mm != null
  ) {
    const half = bead.product.body_width_mm / 2 / 1000;
    return bc === "float_charm" ? half * FLOAT_CHARM_ARC_SCALE : half;
  }
  return bead.product.diameter / 2;
}

/** Total cord length consumed by beads - how much room left */
export function usedArc(beads: BeadLike[]): number {
  if (beads.length === 0) return 0;
  let total = beads[0].product.diameter / 2;
  for (let i = 0; i < beads.length - 1; i++) {
    total += arcHalf(beads[i], beads[i + 1]) + getSpacing(beads[i], beads[i + 1]) + arcHalf(beads[i + 1], beads[i]);
  }
  total += beads[beads.length - 1].product.diameter / 2;
  return total;
}

/** Returns true if a new bead fits on the bracelet when appended */
export function beadFits(
  currentBeads: BeadLike[],
  newBead: BeadLike,
  radius = BRACELET_RADIUS
): boolean {
  return usedArc([...currentBeads, newBead]) <= braceletArc(radius);
}

// ─── Line view geometry ───────────────────────────────────────────────────────

/** Same total length as usedArc — exposed for line-view consumers. */
export function getLineTotalWidth(beads: BeadLike[]): number {
  return usedArc(beads);
}

/**
 * Complete transform for bead at slotIndex when laid out in a straight line
 * along the X axis, centred at world origin.
 *
 * outerRotation [0, -π/2, 0] makes the bead face point toward +Z (the camera),
 * identical to the front-facing bead in the circular layout (angle = π/2).
 * innerRotation [0, 0, 0] keeps the hole on world Y — the cord cylinder along X
 * passes through each bead centre, threading them visually.
 */
export function getBeadTransformLine(
  slotIndex: number,
  beads: BeadLike[]
): {
  position: [number, number, number];
  outerRotation: [number, number, number];
  innerRotation: [number, number, number];
} {
  const totalW = usedArc(beads);
  let x = -totalW / 2 + beads[0].product.diameter / 2;
  for (let i = 0; i < slotIndex; i++) {
    x += arcHalf(beads[i], beads[i + 1]) + getSpacing(beads[i], beads[i + 1]) + arcHalf(beads[i + 1], beads[i]);
  }
  return {
    position:       [x, 0, 0],
    outerRotation:  [0, -Math.PI / 2, 0],
    innerRotation:  [0, 0, 0],
  };
}

// ─── Per-bead geometry ────────────────────────────────────────────────────────

/**
 * Computes the angle for bead at slotIndex based on the actual
 * diameter of every bead before it in the list.
 */
export function getBeadAngle(
  slotIndex: number,
  beads: BeadLike[],
  radius = BRACELET_RADIUS
): number {
  let angle = START_ANGLE_OFFSET + beads[0].product.diameter / 2 / radius;

  for (let i = 0; i < slotIndex; i++) {
    angle += (arcHalf(beads[i], beads[i + 1]) + getSpacing(beads[i], beads[i + 1]) + arcHalf(beads[i + 1], beads[i])) / radius;
  }

  return angle;
}

function getBeadOuterRotationY(angle: number): number {
  return -angle;
}

export function getBeadPosition(angle: number, radius = BRACELET_RADIUS): [number, number, number] {
  return [
    Math.cos(angle) * radius,
    0,
    Math.sin(angle) * radius,
  ];
}

/** Tilt applied to the inner group — lays the bead on its side. */
const BEAD_INNER_TILT_X = 0;

/** Returns the complete transform for a bead at the given slot. */
export function getBeadTransform(
  slotIndex: number,
  beads: BeadLike[],
  radius = BRACELET_RADIUS
): {
  position: [number, number, number];
  outerRotation: [number, number, number];
  innerRotation: [number, number, number];
} {
  const angle = getBeadAngle(slotIndex, beads, radius);
  return {
    position: getBeadPosition(angle, radius),
    outerRotation: [0, getBeadOuterRotationY(angle), 0],
    innerRotation: [BEAD_INNER_TILT_X, 0, 0],
  };
}