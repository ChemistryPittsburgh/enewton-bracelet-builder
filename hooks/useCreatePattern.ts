import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import { buildBraceletConfig } from "@/lib/build-bracelet-config";
import { useGenerateThumbnail } from "@/hooks/useGenerateThumbnail";
import { uploadThumbnail } from "@/hooks/useUploadThumbnail";
import { slugify } from "@/lib/utils";
import type { Bracelet, CreateBraceletRequest } from "@/types";

function uniqueTags(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter(Boolean).map((v) => v!.trim().toLowerCase()))];
}

/**
 * Creates a new pattern from the current canvas state.
 * Captures a thumbnail, uploads it, then POSTs to /designs with is_pattern: true.
 * The resulting design is tagged as a pattern and appears in GET /patterns.
 */
export function useCreatePattern() {
  const queryClient = useQueryClient();
  const { capture } = useGenerateThumbnail();
  const { beads, bandMaterial, braceletSize, hairtieColor } = useStore((s) => ({
    beads:         s.beads,
    bandMaterial:  s.bandMaterial,
    braceletSize:  s.braceletSize,
    hairtieColor:  s.hairtieColor,
  }));

  const mutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const dataUrl = await capture();
      const filename = `pattern-${slugify(name)}-${Date.now()}.png`;
      let preview_image_url: string | null = null;
      if (dataUrl) {
        preview_image_url = await uploadThumbnail(dataUrl, filename);
      }

      const configuration = buildBraceletConfig(beads, braceletSize, bandMaterial, hairtieColor);
      const body: CreateBraceletRequest = {
        name,
        configuration,
        material_tags: uniqueTags(beads.map((b) => b.product.material)),
        bead_types:    uniqueTags(beads.map((b) => b.product.bead_type)),
        collection_id: null,
        preview_image_url,
        is_pattern: true,
      };

      return apiFetch<Bracelet>("/designs", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patterns"] });
    },
  });

  return mutation;
}
