/**
 * import-bracelet.ts
 *
 * Parses an exported bracelet JSON file and returns an ordered
 * array of PlacedBeads ready to load into the store.
 *
 * Matches the export format produced by BraceletStatsPanel.tsx.
 */

import { nanoid } from "nanoid";
import type { PlacedBead } from "@/types";

interface ExportedBead {
  position: number;
  instanceId: string;
  id: string;
  name: string;
  diameterMm: string | number;
  glbPath: string;
}

interface ExportedBracelet {
  exportedAt?: string;
  bracelet?: object;
  beads: ExportedBead[];
}

export interface ImportResult {
  beads: PlacedBead[];
  name: string | null;   
  warnings: string[];
}

/**
 * Parse a bracelet JSON file (as text) into PlacedBeads.
 * Returns warnings for any beads that couldn't be fully resolved.
 */
export function parseBraceletJson(jsonText: string): ImportResult {
  const warnings: string[] = [];
  let parsed: ExportedBracelet;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid JSON — could not parse the file.");
  }

  if (!Array.isArray(parsed.beads) || parsed.beads.length === 0) {
    throw new Error('JSON is missing a "beads" array or it is empty.');
  }

  // Sort by position to guarantee correct order
  const sorted = [...parsed.beads].sort((a, b) => a.position - b.position);

  const beads: PlacedBead[] = sorted.map((raw) => {
    if (!raw.glbPath) warnings.push(`Bead at position ${raw.position} has no glbPath — skipped.`);
    if (!raw.diameterMm) warnings.push(`Bead "${raw.name}" has no diameter — defaulting to 5 mm.`);

    const diameterMm = typeof raw.diameterMm === "string"
      ? parseFloat(raw.diameterMm)
      : raw.diameterMm ?? 5;

    return {
      // Give each bead a fresh instanceId so it doesn't clash
      // with any existing beads in the store
      instanceId: nanoid(),
      product: {
        id: raw.id,
        name: raw.name ?? "Unknown Bead",
        glbPath: raw.glbPath,
        diameter: diameterMm / 1000, // mm → metres
      },
    };
  }).filter((b) => b.product.glbPath); // drop any with no GLB path

  return {
    beads,
    name: (parsed.bracelet as any)?.name ?? null,
    warnings,
  };
}
