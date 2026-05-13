/**
 * bead-layout.ts
 *
 * All geometry for placing beads on a circular bracelet cord.
 *
 * Coordinate system:
 *   - Bracelet lies flat in the XZ plane (Y = 0 is the cord center)
 *   - Beads sit ON the cord — same Y=0, positioned at radius BRACELET_RADIUS
 *   - The bead's hole axis is its local Y axis (from the GLB).
 *     We rotate each bead so its hole aligns with cord
 *
 *   - Bead diameter: Pulled dynamically from page.tsx
 *   - Hole axis height (Y): 3.72 mm
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
const BEAD_SPACING = -0.00035;

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

export function getBeadOuterRotationY(angle: number): number {
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
//export const BEAD_INNER_TILT_X = Math.PI / 2;
export const BEAD_INNER_TILT_X = 0;
