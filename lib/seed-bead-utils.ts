/**
 * seed-bead-utils.ts
 *
 * Utilities for procedurally generating seed bead positions, sizes, and colours
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
  /** Hex colour string. */
  color: string;
  /** Offset along the segment's arc from the segment start, in metres. */
  arcOffset: number;
}

/**
 * Generates the list of individual tiny beads that compose a seed segment.
 *
 * Packs beads tightly along the arc by their full diameter.
 * Colours are distributed according to the colorway percentages using a
 * weighted random pick per bead.
 */
export function generateSeedBeads(config: SeedSegmentConfig): GeneratedSeedBead[] {
  const rng = createRng(config.random_seed);

  const [minMm, maxMm] = config.bead_size_range;
  const arcLengthM = config.arc_length_mm / 1000;

  // Build cumulative weight array for colour picking
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
    const halfD = dM / 2;

    // Would this bead extend past the segment end?
    if (cursor + dM > arcLengthM + 0.0001) break;

    // Pick a colour based on weighted random
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
      arcOffset: cursor + halfD,
    });

    cursor += dM;
  }

  return beads;
}

/** Returns a random integer suitable for use as a PRNG seed. */
export function newRandomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}