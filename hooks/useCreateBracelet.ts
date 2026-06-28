import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { apiFetch } from "@/lib/api";
import { buildBraceletConfig } from "@/lib/build-bracelet-config";
import type { Bracelet, CreateBraceletRequest } from "@/types";

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
  const { beads, braceletName, braceletDescription, bandMaterial, braceletSize, hairtieColor, isEvenlySpaced } = useStore(useShallow((s) => ({
    beads: s.beads,
    braceletName: s.braceletName,
    braceletDescription: s.braceletDescription,
    bandMaterial: s.bandMaterial,
    braceletSize: s.braceletSize,
    hairtieColor: s.hairtieColor,
    isEvenlySpaced: s.isEvenlySpaced,
  })));

  return useMutation({
    mutationFn({ preview_image_url }: { preview_image_url: string | null }) {
      const configuration = buildBraceletConfig(beads, braceletSize, bandMaterial, hairtieColor, isEvenlySpaced);

      // Derive material_tags and bead_types from the placed beads
      const material_tags = uniqueTags(beads.map((b) => b.product.material));
      const bead_types = uniqueTags(beads.map((b) => b.product.bead_type));

      const body: CreateBraceletRequest = {
        name: braceletName,
        description: braceletDescription || null,
        configuration,
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