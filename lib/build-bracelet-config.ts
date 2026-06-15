/**
 * build-bracelet-config.ts
 *
 * Pure utility — shared by useCreateBracelet and useUpdateBracelet.
 * Derives a BraceletConfiguration from the current store state.
 */

import { usedArc, braceletArc } from "@/lib/bead-layout";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import type {
  PlacedBead,
  BandMaterial,
  BraceletSize,
  BraceletConfiguration,
  BraceletConfigBead,
} from "@/types";

export function buildBraceletConfig(
  beads: PlacedBead[],
  braceletSize: BraceletSize,
  bandMaterial: BandMaterial,
  hairtieColor?: string | null,
): BraceletConfiguration {
  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const maxArc = braceletArc(radius);
  const arcUsed = usedArc(beads);

  const configBeads: BraceletConfigBead[] = beads.map((b, i) => ({
    position: i + 1,
    product_id: b.product.id,
    instance_id: b.instanceId,
  }));

  return {
    band_material: bandMaterial,
    bracelet_size: braceletSize,
    hairtie_color: bandMaterial === "hairtie" ? (hairtieColor ?? null) : null,
    arc_used_mm: parseFloat((arcUsed * 1000).toFixed(2)),
    arc_total_mm: parseFloat((maxArc * 1000).toFixed(2)),
    percent_used: parseFloat(Math.min((arcUsed / maxArc) * 100, 100).toFixed(1)),
    beads: configBeads,
  };
}