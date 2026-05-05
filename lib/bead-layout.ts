/**
 * bead-layout.ts
 *
 * All geometry for placing beads on a circular bracelet cord.
 *
 * Coordinate system:
 *   - Bracelet lies flat in the XZ plane (Y = 0 is the cord centre)
 *   - Beads sit ON the cord — same Y=0, positioned at radius BRACELET_RADIUS
 *   - The bead's hole axis is its local Y axis (from the GLB).
 *     We rotate each bead so its hole aligns tangentially with the cord.
 *
 * Measured from the Dignity 4mm GLB:
 *   - Bead diameter (XZ): 4.21 mm
 *   - Hole axis height (Y): 3.72 mm
 */

// ─── Bracelet constants ───────────────────────────────────────────────────────

/** Radius of the bracelet cord centreline, in metres. ~182 mm circumference. */
export const BRACELET_RADIUS = 0.029;

/** Visual radius of the cord tube (the string/wire). */
export const CORD_RADIUS = 0.0008;

/** Diameter of a single bead slot, in metres. */
export const BEAD_DIAMETER = 0.005;

/** Gap between adjacent beads, in metres. */
export const BEAD_GAP = 0.0005;

/** Combined space one bead occupies along the cord arc. */
export const BEAD_SLOT = BEAD_DIAMETER + BEAD_GAP;

/** How many beads fit on one full bracelet. */
export const MAX_BEADS = Math.floor(
  (2 * Math.PI * BRACELET_RADIUS) / BEAD_SLOT
); // ~43 with these defaults

// ─── Per-bead geometry ────────────────────────────────────────────────────────

/**
 * Angle (radians) for bead slot i, evenly distributed around the circle.
 * Starts at the front (θ = 0 → positive X axis) and goes counter-clockwise.
 */
export function getBeadAngle(slotIndex: number): number {
  return (slotIndex / MAX_BEADS) * 2 * Math.PI;
}

/**
 * World-space position for a bead at the given angle.
 * Returns [x, y, z] — y is always 0 (cord plane).
 */
export function getBeadPosition(angle: number): [number, number, number] {
  return [
    Math.cos(angle) * BRACELET_RADIUS,
    0,
    Math.sin(angle) * BRACELET_RADIUS,
  ];
}

/**
 * Returns the Y-axis rotation for the OUTER group of a bead.
 *
 * Beads are positioned using two nested groups to apply rotations in the
 * correct order (inner first, outer second):
 *
 *   Outer group → rotation={[0, getBeadOuterRotationY(angle), 0]}
 *     Rotates around world Y to point the bead toward its position on the cord.
 *
 *   Inner group → rotation={[Math.PI / 2, 0, 0]}
 *     Lays the bead on its side so its hole (local Y) aligns with world +Z.
 *
 * Result: hole axis points to (-sin θ, 0, cos θ) — the cord tangent. ✓
 *
 * WHY nested groups?
 * Three.js 'XYZ' Euler applies rotations as M = Rx·Ry·Rz, meaning Rz runs
 * first and Rx last. A single [π/2, -θ, 0] Euler would apply Ry(-θ) before
 * Rx(π/2), not after — so the Y-rotation would have no effect on the hole
 * axis and every bead would point the same direction (+Z).
 */
export function getBeadOuterRotationY(angle: number): number {
  return -angle;
}

/** Tilt applied to the inner group — lays the bead on its side. */
export const BEAD_INNER_TILT_X = Math.PI / 2;
