/**
 * seed-bead-utils.ts
 *
 * Utilities for procedurally generating seed bead positions, sizes, and colors
 * within a segment. Uses a deterministic PRNG so the same random_seed always
 * produces the same visual arrangement.
 */

import type { SeedSegmentConfig, PlacedBead } from "@/types";
import {
  SEED_BEAD_THICKNESS_RATIO,
  ROUND_BEAD_THICKNESS_RATIO,
  seedBeadSizeRange,
  SEED_BEAD_SIZE_LABELS,
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

  // Prefer the nominal seed size (Small/Large) when set; fall back to the
  // stored range for legacy configs saved before sizes existed.
  const [minMm, maxMm] = config.seed_size_mm
    ? seedBeadSizeRange(config.seed_size_mm)
    : config.bead_size_range;
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

  // Stretch arc positions to fill the slot so no tail gap is visible at segment boundaries.
  if (beads.length > 0 && cursor < arcLengthM) {
    const scale = arcLengthM / cursor;
    let pos = 0;
    for (const bead of beads) {
      const scaledThick = bead.diameter * SEED_BEAD_THICKNESS_RATIO * scale;
      bead.arcOffset = pos + scaledThick / 2;
      pos += scaledThick;
    }
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

  // Stretch arc positions to fill the slot so no tail gap is visible at segment boundaries.
  if (beads.length > 0 && cursor < arcLengthM) {
    const scale = arcLengthM / cursor;
    let pos = 0;
    for (const bead of beads) {
      const scaledThick = dM * ROUND_BEAD_THICKNESS_RATIO * scale;
      bead.arcOffset = pos + scaledThick / 2;
      pos += scaledThick;
    }
  }

  return beads;
}

/** Returns a random integer suitable for use as a PRNG seed. */
export function newRandomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}
/**
 * Readable size for a seed segment — "Small (1mm)" / "Large (2mm)" for the
 * seed shape, or the millimetre value for round. Prefers the stored nominal
 * size, falling back to the range midpoint for legacy configs.
 *
 * @param includeMM  When false, returns just the word label (e.g. "Small").
 */
export function seedSizeLabel(cfg: SeedSegmentConfig, includeMM: boolean): string {
  if (cfg.seed_shape === "round") {
    const mm = cfg.round_size_mm ?? 2;
    return includeMM ? `${mm}mm` : `${mm}`;
  }
  const size =
    cfg.seed_size_mm ?? Math.round((cfg.bead_size_range[0] + cfg.bead_size_range[1]) / 2);
  const label = SEED_BEAD_SIZE_LABELS[size];
  if (label) return includeMM ? `${label} (${size}mm)` : label;
  return includeMM ? `${size}mm` : `${size}`;
}
/** Nominal size value (1 = Small, 2 = Large) for a seed segment, shape-aware. */
function seedSizeValue(cfg: SeedSegmentConfig): number {
  return cfg.seed_shape === "round"
    ? cfg.round_size_mm ?? 2
    : cfg.seed_size_mm ??
        Math.round((cfg.bead_size_range[0] + cfg.bead_size_range[1]) / 2);
}

/**
 * Identity key for "select all of this kind" / replace grouping.
 *
 * Regular beads group by product id. Seed segments each carry their own
 * generated product id, so they instead group by (shape, nominal size) —
 * matching is by size + shape only, NOT colorway. Every Small Round matches
 * every other Small Round regardless of color.
 */
export function seedMatchKey(cfg: SeedSegmentConfig): string {
  const shape = cfg.seed_shape ?? "seed";
  return `seed:${shape}:${seedSizeValue(cfg)}`;
}

export function beadMatchKey(bead: PlacedBead): string {
  return bead.seedConfig ? seedMatchKey(bead.seedConfig) : `product:${bead.product.id}`;
}

/**
 * Human label for a seed kind — "Small", "Large", "Small Round", "Large Round".
 * Used by the "Select All ___ Seed Beads" button and the replace list.
 */
export function seedKindLabel(cfg: SeedSegmentConfig): string {
  const shape = cfg.seed_shape ?? "seed";
  const sizeVal = seedSizeValue(cfg);
  const sizeWord = SEED_BEAD_SIZE_LABELS[sizeVal] ?? `${sizeVal}mm`;
  return shape === "round" ? `${sizeWord} Round` : sizeWord;
}