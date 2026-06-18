/**
 * seed-bead-utils.ts
 *
 * Utilities for procedurally generating seed bead positions, sizes, and colors
 * within a segment. Uses a deterministic PRNG so the same random_seed always
 * produces the same visual arrangement.
 */

import type { SeedSegmentConfig } from "@/types";
import {
  SEED_BEAD_THICKNESS_RATIO,
  ROUND_BEAD_THICKNESS_RATIO,
} from "@/lib/constants";

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
  /** Finish preset key derived from the colorway label (e.g. "gold", "silver"). */
  finishKey: string;
}

/**
 * Derives a FINISH_PRESETS key from a colorway entry label.
 * Falls back to "gold" for unrecognised or missing labels.
 */
function finishKeyFromLabel(label?: string): string {
  if (!label) return "gold";
  const l = label.toLowerCase();
  if (l.includes("silver")) return "silver";
  if (l.includes("rose")) return "rose_gold";
  return "gold";
}

/**
 * Generates the list of individual tiny beads that compose a seed segment.
 *
 * In "seed" mode (default): packs beads tightly along the arc by their
 * physical thickness (diameter × 0.72), matching the actual GLB model
 * proportions so flat faces sit flush. Colors are distributed according
 * to the colorway percentages using a weighted random pick per bead.
 *
 * In "round" mode: packs uniform spherical beads at a fixed diameter
 * (round_size_mm). All beads share the same color from colorway[0].
 */
export function generateSeedBeads(config: SeedSegmentConfig): GeneratedSeedBead[] {
  const isRound = config.seed_shape === "round";

  if (isRound) {
    return generateRoundBeads(config);
  }

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
      finishKey: finishKeyFromLabel(config.colorway[colorIdx].label),
    });

    cursor += thick;
  }

  return beads;
}

/**
 * Generates uniform round beads for a seed segment.
 * All beads are the same size and color — no randomisation.
 */
function generateRoundBeads(config: SeedSegmentConfig): GeneratedSeedBead[] {
  const dMm = config.round_size_mm ?? 2;
  const dM = dMm / 1000;
  const thick = dM * ROUND_BEAD_THICKNESS_RATIO;
  const arcLengthM = config.arc_length_mm / 1000;

  const color = config.colorway[0]?.hex ?? "#D4AF37";
  const isMetallic = config.colorway[0]?.is_metallic ?? true;
  const finishKey = finishKeyFromLabel(config.colorway[0]?.label);

  const beads: GeneratedSeedBead[] = [];
  let cursor = 0;

  while (cursor < arcLengthM) {
    if (cursor + thick > arcLengthM + 0.0001) break;

    beads.push({
      diameter: dM,
      color,
      isMetallic,
      arcOffset: cursor + thick / 2,
      finishKey,
    });

    cursor += thick;
  }

  return beads;
}

/** Returns a random integer suitable for use as a PRNG seed. */
export function newRandomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}