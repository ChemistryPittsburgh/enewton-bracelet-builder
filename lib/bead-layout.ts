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


/** Radius of the bracelet cord centreline, in metres. ~182 mm circumference. */
export const BRACELET_RADIUS = 0.029;

/** Visual radius of the cord */
export const CORD_RADIUS = 0.0008;

/**
 * Negative values pull beads closer together.
 * 0 = beads just touching
 * -0.001 = beads slightly overlapping (good for tight stacking)
 * Positive values add space between beads
 */
export const BEAD_SPACING = -0.00035;

/** Controls where beads start (set to 0 to start bead adding on the right) */
const START_ANGLE_OFFSET = Math.PI / 2;

// Max beads is calculated by bead diameter - check to see if next bead fits
export const MAX_BRACELET_ARC = 2 * Math.PI * BRACELET_RADIUS; // full circumference in metres

export function braceletArc(radius: number): number {
  return 2 * Math.PI * radius;
}

/** Total cord length consumed by beads - how much room left */
export function usedArc(beads: { product: { diameter: number } }[]): number {
  return beads.reduce((sum, b) => sum + b.product.diameter + BEAD_SPACING, 0);
}

/** Returns true if a new bead of the given diameter fits on the bracelet */
export function beadFits(
  currentBeads: { product: { diameter: number } }[],
  newDiameter: number,
  radius = BRACELET_RADIUS
): boolean {
  return usedArc(currentBeads) + newDiameter + BEAD_SPACING <= braceletArc(radius);
}

// ─── Line view geometry ───────────────────────────────────────────────────────

/** Same total length as usedArc — exposed for line-view consumers. */
export function getLineTotalWidth(beads: { product: { diameter: number } }[]): number {
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
  beads: { product: { diameter: number } }[]
): {
  position: [number, number, number];
  outerRotation: [number, number, number];
  innerRotation: [number, number, number];
} {
  const totalW = usedArc(beads);
  let x = -totalW / 2;
  for (let i = 0; i < slotIndex; i++) {
    x += beads[i].product.diameter + BEAD_SPACING;
  }
  x += beads[slotIndex].product.diameter / 2;
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
  beads: { product: { diameter: number } }[],
  radius = BRACELET_RADIUS
): number {
  let angle = START_ANGLE_OFFSET;

  for (let i = 0; i < slotIndex; i++) {
    const arcPerBead = (beads[i].product.diameter + BEAD_SPACING) / radius;
    angle += arcPerBead;
  }

  angle += (beads[slotIndex].product.diameter / 2) / radius;

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
  beads: { product: { diameter: number } }[],
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
