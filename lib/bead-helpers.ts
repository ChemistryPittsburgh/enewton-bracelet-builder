/**
 * bead-helpers.ts
 *
 * Shared helpers for normalising bead product data from the PHP API.
 * Used by both useBeads (active-only catalog) and useBeadAdmin (all beads).
 *
 * The API returns decimal fields as strings (MySQL behaviour via PHP);
 * these helpers parse them into proper numbers.
 */

import type { BeadProduct } from "@/types";

/**
 * Raw bead shape from the API — decimal fields arrive as strings.
 * Shared between useBeads and useBeadAdmin to avoid duplication.
 */
export type ApiBeadProduct = Omit<
  BeadProduct,
  "diameter" | "size_mm" | "bail_width_mm" | "body_width_mm" | "total_height_mm" | "hang_offset" | "hang_length" | "depth_offset"
> & {
  diameter: string;
  size_mm?: string | number | null;
  bail_width_mm?: string | null;
  body_width_mm?: string | null;
  total_height_mm?: string | null;
  hang_offset?: string | null;
  hang_length?: string | null;
  depth_offset?: string | null;
};

/** Parses a string|number into a number, returning undefined for null/empty/NaN. */
export function parseDecimal(v: string | number | null | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = parseFloat(String(v));
  return isNaN(n) ? undefined : n;
}

/** Normalises an API bead product into the frontend BeadProduct shape. */
export function normaliseBeadProduct(b: ApiBeadProduct): BeadProduct {
  return {
    ...b,
    diameter:        parseFloat(b.diameter),
    size_mm:         parseDecimal(b.size_mm) ?? null,
    bail_width_mm:   parseDecimal(b.bail_width_mm),
    body_width_mm:   parseDecimal(b.body_width_mm),
    total_height_mm: parseDecimal(b.total_height_mm),
    hang_offset:     parseDecimal(b.hang_offset),
    hang_length:     parseDecimal(b.hang_length),
    depth_offset:    parseDecimal(b.depth_offset),
  };
}