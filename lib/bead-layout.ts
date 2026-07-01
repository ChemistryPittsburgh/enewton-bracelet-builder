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

import { FLOAT_CHARM_THIN_SCALE } from "@/lib/constants";
import type { BeadGroup, PlacedBead } from "@/types";

// ─── Bracelet constants ───────────────────────────────────────────────────────

type BeadLike = {
  product: {
    diameter: number;
    bead_category?: string | null;
    body_width_mm?: number | null;
    size_mm?: number | null;
    material?: string | null;
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
export const BEAD_SPACING = -0.000012;

/**
 * Per-category spacing overrides (metres).
 * When two adjacent items have different categories the larger
 * (least-negative / most-positive) spacing wins, so items that
 * need extra room always get it.
 *
 * Add new categories here as they appear in the catalog.
 */
const CATEGORY_SPACING: Record<string, number> = {
  bead:          BEAD_SPACING,     
  charm:         0.00004,     
  float_charm:   0.00002,                 
  spacer:        0,               
  seed_segment:  -0.00002,
  crystal:       0.0008,
  resin:         0.00002
};

/**
 * Returns the gap (metres) to place between two adjacent beads.
 * 
 * Spacing-lookup key for a bead. Crystals are catalogued under the "charm"
 * category but get their own spacing, so material takes precedence here.
 */
function spacingKey(bead: BeadLike): string {
  if (bead.product.bead_category === "charm" && bead.product.material === "crystal") {
    return "crystal";
  } else if (bead.product.bead_category === "bead" && bead.product.material === "resin") {
    return "resin";
  }
  return bead.product.bead_category ?? "bead";
}

/** Returns the gap (metres) to place between two adjacent beads. */
function getSpacing(a: BeadLike, b: BeadLike): number {
  const sA = CATEGORY_SPACING[spacingKey(a)] ?? BEAD_SPACING;
  const sB = CATEGORY_SPACING[spacingKey(b)] ?? BEAD_SPACING;
  return Math.max(sA, sB);
}

/** Controls where beads start (set to 0 to start bead adding on the right) */
const START_ANGLE_OFFSET = Math.PI / 2;

export function braceletArc(radius: number): number {
  return 2 * Math.PI * radius;
}

/** Minimum cord footprint (mm) a charm claims when adjacent to a non-charm. See bead-layout.ts. */
export const MIN_CHARM_ARC_MM = 1.7;

// Half-arc a single bead occupies from its own centre (no neighbor context needed).
// Bars use size_mm (their arc length) rather than diameter (their tube thickness).
export function selfHalf(bead: BeadLike): number {
  if (bead.product.bead_category === "bar") {
    if (bead.product.size_mm == null) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[bead-layout] bar has null size_mm — falling back to diameter; arc accounting will be wrong`);
      }
      return bead.product.diameter / 2;
    }
    return bead.product.size_mm / 2 / 1000;
  }
  const half = bead.product.diameter / 2;
  // Charms thread on the cord by their ring (diameter = bail_width). Floor that
  // footprint so a tiny bail still reserves MIN_CHARM_ARC_MM of cord. Does not
  // touch the charm↔charm body_width path (handled in arcHalf). Float charms are
  // intentionally thin and are exempt.
  if (bead.product.bead_category === "charm" || bead.product.bead_category === "letter_charm") {
    return Math.max(half, MIN_CHARM_ARC_MM / 2 / 1000);
  }
  return half;
}

// Returns the half-arc a bead contributes toward a given neighbor.
// Charm–charm pairs use body_width_mm (disc body width); all others use selfHalf.
// Float charms sit sideways on the cord, so their arc contribution is scaled
// down to match their thin edge profile (FLOAT_CHARM_THIN_SCALE, shared with
// the hit box and collision math).
function arcHalf(bead: BeadLike, neighbor: BeadLike): number {
  const bc = bead.product.bead_category;
  const nc = neighbor.product.bead_category;
  if (
    (bc === "charm" || bc === "float_charm") &&
    (nc === "charm" || nc === "float_charm") &&
    bead.product.body_width_mm != null
  ) {
    const half = bead.product.body_width_mm / 2 / 1000;
    return bc === "float_charm" ? half * FLOAT_CHARM_THIN_SCALE : half;
  }
  return selfHalf(bead);
}

/**
 * Centre-to-centre advance between two adjacent beads along the cord (metres):
 * each bead's half-arc toward the other plus the inter-bead spacing. This is the
 * single per-pair step shared by usedArc, getBeadAngle, and getBeadTransformLine.
 */
function pairAdvance(a: BeadLike, b: BeadLike): number {
  return arcHalf(a, b) + getSpacing(a, b) + arcHalf(b, a);
}

/**
 * Extra arc to add between every adjacent pair so the total gap is spread
 * evenly around the bracelet instead of sitting at the seam.
 * Returns 0 for empty bracelets or bracelets that are already full.
 */
export function getEvenSpacingBonus(beads: BeadLike[], radius: number): number {
  if (beads.length === 0) return 0;
  const bonus = (braceletArc(radius) - usedArc(beads)) / beads.length;
  return Math.max(0, bonus);
}

/**
 * Combines saved groups and the pending (unsaved) selection into a single
 * flat string[][] so the spacing calculation treats the active selection as
 * the next group, matching how the Replace dialog already displays it.
 */
export function buildEffectiveGroups(
  savedGroups: BeadGroup[],
  pendingIds: string[],
): string[][] {
  const saved = savedGroups.map((g) => g.instanceIds);
  return pendingIds.length > 0 ? [...saved, pendingIds] : saved;
}

/**
 * Group-aware variant of getEvenSpacingBonus. When explicit replacement groups
 * are active, beads within the same group are treated as one visual unit — no
 * extra gap is inserted between adjacent same-group beads. The full leftover arc
 * is divided by the number of units (groups + ungrouped beads) and applied only
 * at group boundaries.
 *
 * Returns a per-gap array (index i = extra spacing between bead[i] and bead[i+1]).
 */
export function getGroupSpacingBonuses(
  beads: PlacedBead[],
  groups: string[][],
  radius: number,
): number[] {
  if (beads.length === 0) return [];
  const idToGroup = new Map<string, number>();
  groups.forEach((group, g) => group.forEach((id) => idToGroup.set(id, g)));

  const ungroupedCount = beads.filter((b) => !idToGroup.has(b.instanceId)).length;
  const numUnits = groups.length + ungroupedCount;
  const gapBonus = numUnits > 0
    ? Math.max(0, (braceletArc(radius) - usedArc(beads)) / numUnits)
    : 0;

  return beads.map((bead, i) => {
    if (i === beads.length - 1) return 0;
    const nextBead = beads[i + 1];
    const thisGroup = idToGroup.get(bead.instanceId);
    const nextGroup = idToGroup.get(nextBead.instanceId);
    if (thisGroup !== undefined && nextGroup !== undefined && thisGroup === nextGroup) return 0;
    return gapBonus;
  });
}

/**
 * Unified distribute spacing: handles gap-fill items, explicit groups, or neither.
 *
 * Gap-fill beads (isGapFill=true) sit tight against their neighbors — no bonus
 * spacing is added before or after them. Only the gaps between anchor beads (or
 * between anchor groups) receive the distribute bonus.
 *
 * Degenerate cases match existing functions:
 *   - No gap-fill, no groups → same as getEvenSpacingBonus
 *   - Groups only            → same as getGroupSpacingBonuses
 *
 * The wrap-around gap (last array element, index n-1) participates in bonus
 * distribution when both flanking beads are eligible anchors. getBeadAngle
 * never reads extraSpacingPerGap[n-1], so bead positions are unaffected.
 */
export function getGapFillAwareSpacingBonuses(
  beads: PlacedBead[],
  groups: string[][],
  radius: number,
): number[] {
  const n = beads.length;
  if (n === 0) return [];

  const idToGroup = new Map<string, number>();
  groups.forEach((group, g) => group.forEach((id) => idToGroup.set(id, g)));

  let numDistribute = 0;
  for (let i = 0; i < n; i++) {
    const curr = beads[i];
    const next = beads[(i + 1) % n];
    if (curr.isGapFill || next.isGapFill) continue;
    const tg = idToGroup.get(curr.instanceId);
    const ng = idToGroup.get(next.instanceId);
    if (tg !== undefined && tg === ng) continue;
    numDistribute++;
  }

  const freeArc = Math.max(0, braceletArc(radius) - usedArc(beads));
  const bonus = numDistribute > 0 ? freeArc / numDistribute : 0;

  return beads.map((bead, i) => {
    const next = beads[(i + 1) % n];
    if (bead.isGapFill || next.isGapFill) return 0;
    const tg = idToGroup.get(bead.instanceId);
    const ng = idToGroup.get(next.instanceId);
    if (tg !== undefined && tg === ng) return 0;
    return bonus;
  });
}

/** Total cord length consumed by beads - how much room left */
export function usedArc(beads: BeadLike[]): number {
  if (beads.length === 0) return 0;
  let total = selfHalf(beads[0]);
  for (let i = 0; i < beads.length - 1; i++) {
    total += pairAdvance(beads[i], beads[i + 1]);
  }
  total += selfHalf(beads[beads.length - 1]);
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

/**
 * Like beadFits, but tests inserting newBead after beads[insertAfter] rather
 * than appending to the end. Necessary when gap neighbors have different spacing
 * categories (e.g. two crystals) than the tail bead — append would under-count
 * the real arc cost, silently allowing overflow.
 *
 * When isEvenlySpaced is active, the whole-ring check alone isn't enough: leftover
 * arc is displayed as "bonus" spacing distributed across every eligible gap
 * (getGapFillAwareSpacingBonuses), so a specific gap's true visual size is only
 * its fractional share of that leftover, not the whole ring's slack. Without this
 * second check, a fill could pass the whole-ring test yet visually overflow the
 * one gap it's actually going into.
 */
export function beadFitsAtIndex(
  beads: PlacedBead[],
  newBead: BeadLike,
  insertAfter: number,
  radius = BRACELET_RADIUS,
  groups: string[][] = [],
  isEvenlySpaced = false,
): boolean {
  const arr = [...beads];
  arr.splice(insertAfter + 1, 0, newBead as PlacedBead);
  if (usedArc(arr) > braceletArc(radius)) return false;
  if (!isEvenlySpaced || beads.length < 2) return true;
  const bonuses = getGapFillAwareSpacingBonuses(beads, groups, radius);
  const visualCapM = bonuses[insertAfter] ?? 0;
  const newBeadCostM = usedArc(arr) - usedArc(beads);
  return newBeadCostM <= visualCapM;
}

/**
 * How many copies of `product` fit when appended one-by-one to `beads`,
 * capped at `cap`. Replaces the hand-rolled fit loops in the bead selector;
 * only `.product` is read by the arc math, so the temp beads carry no id.
 */
export function maxFit(
  beads: BeadLike[],
  product: BeadLike["product"],
  radius: number,
  cap: number,
): number {
  let count = 0;
  let list: BeadLike[] = beads;
  while (count < cap && beadFits(list, { product }, radius)) {
    count++;
    list = [...list, { product }];
  }
  return count;
}

// Length-independent stand-ins used only to look up the per-category spacing gap.
const SEED_SPACING_PROBE:   BeadLike = { product: { diameter: 0, bead_category: "seed_segment" } };
const SPACER_SPACING_PROBE: BeadLike = { product: { diameter: 0, bead_category: "spacer"       } };

/**
 * Largest seed-segment arc length (mm) that still fits when a segment is appended
 * to `beads`. Beyond the bare (braceletArc − usedArc) figure, this also subtracts
 * the inter-item spacing gap that usedArc/beadFits insert between the new segment
 * and the current last item. A plain "remaining" figure omits that gap, so a
 * full-length "fill remaining" segment overflows by it — positive after charms
 * (gap > 0), which is why it surfaced there. Returns 0 when nothing fits. The
 * caller should still floor (not round) to its display precision.
 */
export function maxSeedArcMm(beads: BeadLike[], radius = BRACELET_RADIUS): number {
  const free = braceletArc(radius) - usedArc(beads);
  const gap = beads.length > 0
    ? getSpacing(beads[beads.length - 1], SEED_SPACING_PROBE)
    : 0;
  return Math.max(0, (free - gap) * 1000);
}

/**
 * Max seed-segment arc (mm) for inserting at a specific gap position.
 * Uses the actual left/right neighbors of the gap; unlike maxSeedArcMm (which
 * always compares against the last bead), this is correct when gap neighbors
 * differ from the tail bead in spacing category.
 *
 * When isEvenlySpaced is active, this gap's true visual size is only its
 * fractional share of the ring's total leftover arc (see
 * getGapFillAwareSpacingBonuses) — the bare whole-ring figure below would let a
 * fill exceed what's actually shown at this specific gap, so it's capped by that
 * gap's current bonus share.
 */
export function maxSeedArcMmAtGap(
  beads: PlacedBead[],
  insertAfterIndex: number,
  radius = BRACELET_RADIUS,
  groups: string[][] = [],
  isEvenlySpaced = false,
): number {
  if (beads.length < 2) return maxSeedArcMm(beads, radius);
  const L = beads[insertAfterIndex];
  const R = beads[(insertAfterIndex + 1) % beads.length];
  const freeArc = braceletArc(radius) - usedArc(beads);
  // usedArc sums only the forward chain (first→last), never the wrap-around pair.
  // For a mid-bracelet insertion, getSpacing(L,R) is already in usedArc and gets
  // freed by the insertion, so we add it back. For the wrap-around gap the pair
  // cost was never counted, so there is nothing to reclaim.
  const isWrapAround = insertAfterIndex === beads.length - 1;
  const maxArcM = freeArc
    - getSpacing(L, SEED_SPACING_PROBE)
    - getSpacing(SEED_SPACING_PROBE, R)
    + (isWrapAround ? 0 : getSpacing(L, R));
  if (!isEvenlySpaced) return Math.max(0, maxArcM * 1000);
  const visualCapM = getGapFillAwareSpacingBonuses(beads, groups, radius)[insertAfterIndex] ?? 0;
  return Math.max(0, Math.min(maxArcM, visualCapM) * 1000);
}

/** Gap-aware maximum arc (mm) available for a spacer segment appended to `beads`. */
export function maxSpacerArcMm(beads: BeadLike[], radius = BRACELET_RADIUS): number {
  const free = braceletArc(radius) - usedArc(beads);
  const gap = beads.length > 0
    ? getSpacing(beads[beads.length - 1], SPACER_SPACING_PROBE)
    : 0;
  return Math.max(0, (free - gap) * 1000);
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
  let x = -totalW / 2 + selfHalf(beads[0]);
  for (let i = 0; i < slotIndex; i++) {
    x += pairAdvance(beads[i], beads[i + 1]);
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
 *
 * @param extraSpacingPerGap - optional extra arc (metres) to add between every
 *   adjacent pair, used by the "distribute spacing" toggle to spread leftover
 *   gap evenly around the bracelet. Does not affect capacity accounting.
 */
export function getBeadAngle(
  slotIndex: number,
  beads: BeadLike[],
  radius = BRACELET_RADIUS,
  extraSpacingPerGap: number | number[] = 0,
): number {
  let angle = START_ANGLE_OFFSET + selfHalf(beads[0]) / radius;

  for (let i = 0; i < slotIndex; i++) {
    const extra = Array.isArray(extraSpacingPerGap) ? (extraSpacingPerGap[i] ?? 0) : extraSpacingPerGap;
    angle += (pairAdvance(beads[i], beads[i + 1]) + extra) / radius;
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

/**
 * Computes all bead angles in a single O(n) pass.
 * Prefer this over calling getBeadAngle(i, …) n times, which is O(n²).
 */
export function getBeadAngles(
  beads: BeadLike[],
  radius = BRACELET_RADIUS,
  extraSpacingPerGap: number | number[] = 0,
): number[] {
  if (beads.length === 0) return [];
  const angles: number[] = [START_ANGLE_OFFSET + selfHalf(beads[0]) / radius];
  for (let i = 0; i < beads.length - 1; i++) {
    const extra = Array.isArray(extraSpacingPerGap) ? (extraSpacingPerGap[i] ?? 0) : extraSpacingPerGap;
    angles.push(angles[i] + (pairAdvance(beads[i], beads[i + 1]) + extra) / radius);
  }
  return angles;
}

/** Returns the complete transform for a bead at the given slot. */
export function getBeadTransform(
  slotIndex: number,
  beads: BeadLike[],
  radius = BRACELET_RADIUS,
  extraSpacingPerGap: number | number[] = 0,
): {
  position: [number, number, number];
  outerRotation: [number, number, number];
  innerRotation: [number, number, number];
} {
  const angle = getBeadAngle(slotIndex, beads, radius, extraSpacingPerGap);
  return {
    position: getBeadPosition(angle, radius),
    outerRotation: [0, getBeadOuterRotationY(angle), 0],
    innerRotation: [BEAD_INNER_TILT_X, 0, 0],
  };
}

