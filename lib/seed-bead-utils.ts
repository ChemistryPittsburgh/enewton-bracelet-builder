/**
 * seed-bead-utils.ts
 *
 * Utilities for procedurally generating seed bead positions, sizes, and colors
 * within a segment. Uses a deterministic PRNG so the same random_seed always
 * produces the same visual arrangement.
 */

import type { SeedSegmentConfig } from "@/types";

// ─── Seeded PRNG (mulberry32) ──────────────────────────────────────────────

/** Returns a deterministic pseudo-random number generator seeded by `seed`. */
export function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Individual bead data ──────────────────────────────────────────────────

export interface GeneratedSeedBead {
  /** Diameter in metres. */
  diameter: number;
  /** Hex color string. */
  color: string;
  /** Whether this bead uses metallic material. */
  isMetallic: boolean;
  /** Offset along the segment's arc from the segment start, in metres. */
  arcOffset: number;
}

/**
 * Thickness-to-diameter ratio of the seed bead GLB model.
 * Native dimensions: 1.6mm diameter × 1.15mm thick → 0.72.
 * Packing advances by this fraction of the diameter so adjacent
 * beads' flat faces sit flush against each other.
 */
const SEED_BEAD_THICKNESS_RATIO = 0.72;

/**
 * Generates the list of individual tiny beads that compose a seed segment.
 *
 * Packs beads tightly along the arc by their physical thickness (diameter × 0.72),
 * matching the actual GLB model proportions so flat faces sit flush.
 * colors are distributed according to the colorway percentages using a
 * weighted random pick per bead.
 */
export function generateSeedBeads(config: SeedSegmentConfig): GeneratedSeedBead[] {
  const rng = createRng(config.random_seed);

  const [minMm, maxMm] = config.bead_size_range;
  const arcLengthM = config.arc_length_mm / 1000;

  // Build cumulative weight array for color picking
  const cumWeights: number[] = [];
  let cumTotal = 0;
  for (const entry of config.colorway) {
    cumTotal += entry.percent;
    cumWeights.push(cumTotal);
  }

  const beads: GeneratedSeedBead[] = [];
  let cursor = 0; // metres along the arc

  while (cursor < arcLengthM) {
    // Random diameter within the range
    const dMm = minMm + rng() * (maxMm - minMm);
    const dM = dMm / 1000;
    // Physical thickness along the cord
    const thick = dM * SEED_BEAD_THICKNESS_RATIO;

    // Would this bead extend past the segment end?
    if (cursor + thick > arcLengthM + 0.0001) break;

    // Pick a color based on weighted random
    const roll = rng() * cumTotal;
    let colorIdx = 0;
    for (let i = 0; i < cumWeights.length; i++) {
      if (roll <= cumWeights[i]) {
        colorIdx = i;
        break;
      }
    }

    beads.push({
      diameter: dM,
      color: config.colorway[colorIdx].hex,
      isMetallic: config.colorway[colorIdx].is_metallic ?? false,
      arcOffset: cursor + thick / 2,
    });

    cursor += thick;
  }

  return beads;
}

/** Returns a random integer suitable for use as a PRNG seed. */
export function newRandomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}