import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import { usedArc, braceletArc } from "@/lib/bead-layout";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import type { Bracelet, BraceletConfigBead, CreateBraceletRequest } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Unique non-null values from an array, lower-cased and trimmed. */
function uniqueTags(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter(Boolean).map((v) => v!.trim().toLowerCase()))];
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Assembles a CreateBraceletRequest from the current store state and calls
 * POST /bracelets.
 *
 * Usage:
 *   const { mutate: createBracelet, isPending } = useCreateBracelet();
 *   createBracelet({ preview_image_url: "https://s3…/thumb.png" });
 */
export function useCreateBracelet() {
  const queryClient = useQueryClient();
  const { beads, braceletName, bandMaterial, braceletSize } = useStore((s) => ({
    beads: s.beads,
    braceletName: s.braceletName,
    bandMaterial: s.bandMaterial,
    braceletSize: s.braceletSize,
  }));

  return useMutation({
    mutationFn({ preview_image_url }: { preview_image_url: string | null }) {
      const radius = BRACELET_SIZE_RADIUS[braceletSize];
      const maxArc = braceletArc(radius);
      const arcUsed = usedArc(beads);

      const configBeads: BraceletConfigBead[] = beads.map((b, i) => ({
        position: i + 1,
        product_id: b.product.id,
        instance_id: b.instanceId,
      }));

      // Derive material_tags and bead_types from the placed beads
      const material_tags = uniqueTags(beads.map((b) => b.product.material));
      const bead_types = uniqueTags(beads.map((b) => b.product.bead_type));

      const body: CreateBraceletRequest = {
        name: braceletName,
        description: null,

        configuration: {
          band_material: bandMaterial,
          bracelet_size: braceletSize,
          arc_used_mm: parseFloat((arcUsed * 1000).toFixed(2)),
          arc_total_mm: parseFloat((maxArc * 1000).toFixed(2)),
          percent_used: parseFloat(Math.min((arcUsed / maxArc) * 100, 100).toFixed(1)),
          beads: configBeads,
        },

        material_tags,
        bead_types,

        // TBD — no collection concept in the builder yet (see Figma for definition)
        collection_id: null,

        preview_image_url,

        shopify_sku: null,
        // status defaults to "draft" on the server
      };

      return apiFetch<Bracelet>("/designs", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });
}
