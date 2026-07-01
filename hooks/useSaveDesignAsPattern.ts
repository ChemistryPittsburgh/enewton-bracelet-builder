import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Bracelet, CreateBraceletRequest } from "@/types";
import { toast } from "@/lib/toast";

/**
 * Creates a new pattern from an existing saved design.
 * Copies the design's configuration and preview_image_url — no canvas
 * capture needed since the design already has a thumbnail.
 */
export function useSaveDesignAsPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ design, name }: { design: Bracelet; name: string }) => {
      const body: CreateBraceletRequest = {
        name,
        configuration: design.configuration,
        material_tags: Array.isArray(design.material_tags) ? design.material_tags : [],
        bead_types:    Array.isArray(design.bead_types)    ? design.bead_types    : [],
        collection_id: null,
        preview_image_url: design.preview_image_url ?? null,
        is_pattern: true,
      };

      return apiFetch<Bracelet>("/designs", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patterns"] });
      toast.success("Saved as pattern");
    },
  });
}