/**
 * import-bracelet.ts
 *
 * Parses an exported bracelet JSON file and returns an ordered
 * array of PlacedBeads ready to load into the store.
 *
 * Matches the export format produced by useBraceletExport.ts.
 */

import { nanoid } from "nanoid";
import type { PlacedBead } from "@/types";

export interface ImportResult {
  beads: PlacedBead[];
  name: string | null;
  warnings: string[];
}

/**
 * Parse a bracelet JSON file (as text) into PlacedBeads.
 * Throws on fatal structural errors. Returns warnings for recoverable per-bead issues.
 */
export function parseBraceletJson(jsonText: string): ImportResult {
  const warnings: string[] = [];

  // ── Top-level validation ──────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid JSON — could not parse the file.");
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Invalid bracelet file — expected a JSON object.");
  }

  const data = raw as Record<string, unknown>;

  if (!Array.isArray(data.beads)) {
    throw new Error('JSON is missing a "beads" array.');
  }
  if (data.beads.length === 0) {
    throw new Error('The "beads" array is empty — nothing to import.');
  }

  // ── Bracelet metadata ─────────────────────────────────────────────────────
  const braceletMeta =
    typeof data.bracelet === "object" && data.bracelet !== null
      ? (data.bracelet as Record<string, unknown>)
      : {};
  const name = typeof braceletMeta.name === "string" ? braceletMeta.name : null;

  // ── Per-bead parsing ──────────────────────────────────────────────────────
  const items = data.beads as unknown[];

  // Sort by position before processing so warnings reference the correct order
  const sorted = [...items].sort((a, b) => {
    const pa = typeof a === "object" && a !== null ? (a as Record<string, unknown>).position : 0;
    const pb = typeof b === "object" && b !== null ? (b as Record<string, unknown>).position : 0;
    return (typeof pa === "number" ? pa : 0) - (typeof pb === "number" ? pb : 0);
  });

  const beads: PlacedBead[] = sorted
    .map((item): PlacedBead | null => {
      const bead =
        typeof item === "object" && item !== null
          ? (item as Record<string, unknown>)
          : {};

      const position = typeof bead.position === "number" ? bead.position : "?";
      const beadName = typeof bead.name === "string" ? bead.name : "Unknown Bead";
      const id = typeof bead.id === "string" ? bead.id : nanoid();
      const glbPath = typeof bead.glbPath === "string" ? bead.glbPath : "";

      if (!glbPath) {
        warnings.push(`Bead at position ${position} ("${beadName}") has no glbPath — skipped.`);
        return null;
      }

      // ── Diameter resolution ───────────────────────────────────────────────
      let diameterMm: number;
      const rawDiam = bead.diameterMm;

      if (typeof rawDiam === "number") {
        if (Number.isFinite(rawDiam) && rawDiam > 0) {
          diameterMm = rawDiam;
        } else {
          warnings.push(`Bead "${beadName}" has an invalid diameter (${rawDiam}) — defaulting to 5 mm.`);
          diameterMm = 5;
        }
      } else if (typeof rawDiam === "string") {
        const parsed = parseFloat(rawDiam);
        if (Number.isFinite(parsed) && parsed > 0) {
          diameterMm = parsed;
        } else {
          warnings.push(`Bead "${beadName}" has an invalid diameter ("${rawDiam}") — defaulting to 5 mm.`);
          diameterMm = 5;
        }
      } else {
        warnings.push(`Bead "${beadName}" has no diameter — defaulting to 5 mm.`);
        diameterMm = 5;
      }

      return {
        instanceId: nanoid(),
        product: {
          id,
          name: beadName,
          glbPath,
          diameter: diameterMm / 1000, // mm → metres
        },
      };
    })
    .filter((b): b is PlacedBead => b !== null);

  return { beads, name, warnings };
}
