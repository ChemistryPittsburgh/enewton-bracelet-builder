/**
 * charm-collision.ts
 *
 * When charms are close together on the bracelet arc, applies two
 * adjustments to prevent visual collision:
 *
 * 1. Layer offset — a subtle radial shift (±0.3 mm) so one charm sits
 *    slightly in front of the other.
 *
 * 2. Bail-pivot swing — a rotation around the bail attachment point so
 *    the hanging body fans to one side while the bail stays on the cord.
 *    The swing is an X rotation in the inner group's local frame, which
 *    tilts the body tangentially along the bracelet arc.
 */

import { getBeadAngle } from "./bead-layout";
import type { PlacedBead, BeadProduct } from "@/types";

// ── Tuning ────────────────────────────────────────────────────────────────────

/** Radial offset for depth layering (metres). */
const LAYER_OFFSET = 0.0003;

/** Maximum bail-pivot swing angle (radians). ~20°. */
const MAX_SWING = Math.PI / 35;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CharmAdjustment {
  /** Radial position offset in metres (positive = outward). */
  layerOffset: number;
  /** Bail-pivot swing angle in radians. */
  swingAngle: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Float charm hit boxes are squashed to 35% depth — use the same factor
 *  so the collision threshold matches the thin visual footprint. */
const FLOAT_CHARM_WIDTH_SCALE = 0.35;

function charmBodyWidth(product: BeadProduct): number {
  const full = (product.body_width_mm ?? product.diameter * 1000) / 1000;
  return product.bead_category === "float_charm" ? full * FLOAT_CHARM_WIDTH_SCALE : full;
}

function cordDistance(angleA: number, angleB: number, radius: number): number {
  return 2 * radius * Math.abs(Math.sin((angleB - angleA) / 2));
}

// ── Core ──────────────────────────────────────────────────────────────────────

interface CharmEntry {
  bead: PlacedBead;
  slotIndex: number;
  angle: number;
  bodyWidth: number;
}

/**
 * Computes layer offset + swing angle for charms in proximity groups.
 * Returns Map<instanceId, CharmAdjustment>.
 *
 * Charms not near any other charm are omitted (both values = 0 implicitly).
 */
export function computeCharmAdjustments(
  beads: readonly PlacedBead[],
  radius: number,
): Map<string, CharmAdjustment> {
  const adjustments = new Map<string, CharmAdjustment>();

  const charms: CharmEntry[] = beads
    .map((b, i) => ({
      bead: b,
      slotIndex: i,
      angle: getBeadAngle(i, beads as PlacedBead[], radius),
      bodyWidth: charmBodyWidth(b.product),
    }))
    .filter(({ bead }) => bead.product.bead_category === "charm" || bead.product.bead_category === "float_charm");

  if (charms.length < 2) return adjustments;

  charms.sort((a, b) => a.angle - b.angle);

  // ── Build proximity groups ──────────────────────────────────────────────
  const groups: CharmEntry[][] = [];
  let currentGroup: CharmEntry[] = [charms[0]];

  for (let i = 1; i < charms.length; i++) {
    const prev = charms[i - 1];
    const curr = charms[i];
    const dist = cordDistance(prev.angle, curr.angle, radius);
    const threshold = Math.max(prev.bodyWidth, curr.bodyWidth);

    if (dist < threshold) {
      currentGroup.push(curr);
    } else {
      if (currentGroup.length > 1) groups.push(currentGroup);
      currentGroup = [curr];
    }
  }
  if (currentGroup.length > 1) groups.push(currentGroup);

  // ── Assign alternating adjustments ──────────────────────────────────────
  // Strict alternation: forward, backward, forward, backward...
  // Float charms are included in collision detection (they appear in the map
  // so the UI shows the overlap warning) but receive zero adjustments since
  // they sit on the cord and don't swing or layer.
  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      const isFloat = group[i].bead.product.bead_category === "float_charm";
      const direction = i % 2 === 0 ? 1 : -1;
      adjustments.set(group[i].bead.instanceId, {
        layerOffset: isFloat ? 0 : direction * LAYER_OFFSET,
        swingAngle:  isFloat ? 0 : direction * MAX_SWING,
      });
    }
  }

  return adjustments;
}

/**
 * Returns the instance IDs of all charms that are in a proximity group.
 * Used by UI components to show a "charms may overlap" warning.
 */
export function getCollidingCharmIds(
  beads: readonly PlacedBead[],
  radius: number,
): string[] {
  const adjustments = computeCharmAdjustments(beads, radius);
  return [...adjustments.keys()];
}