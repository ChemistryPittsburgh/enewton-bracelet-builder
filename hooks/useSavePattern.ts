import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import { buildBraceletConfig } from "@/lib/build-bracelet-config";
import { useGenerateThumbnail } from "@/hooks/useGenerateThumbnail";
import { uploadThumbnail } from "@/hooks/useUploadThumbnail";
import { slugify } from "@/lib/utils";

/**
 * Saves the current canvas state back to the active pattern (PUT /patterns/:id).
 * Only callable when activePatternId is set in the store.
 * Captures a new thumbnail, uploads it, then sends the full configuration update.
 */
export function useSavePattern() {
  const queryClient = useQueryClient();
  const { capture } = useGenerateThumbnail();
  const markClean = useStore((s) => s.markClean);

  return useMutation({
    mutationFn: async () => {
      // Read live store values at execution time to avoid stale closure issues
      // during the async thumbnail capture + upload window.
      const { activePatternId, beads, bandMaterial, braceletSize, hairtieColor, braceletName } =
        useStore.getState();

      if (activePatternId === null) throw new Error("No active pattern to save");

      const dataUrl = await capture();
      const filename = `pattern-${slugify(braceletName)}-${Date.now()}.png`;
      let preview_image_url: string | null = null;
      if (dataUrl) {
        preview_image_url = await uploadThumbnail(dataUrl, filename);
      }

      const configuration = buildBraceletConfig(beads, braceletSize, bandMaterial, hairtieColor);

      return apiFetch(`/patterns/${activePatternId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: braceletName.trim() || "Untitled Pattern",
          configuration,
          ...(preview_image_url && { preview_image_url }),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patterns"] });
      markClean();
    },
  });
}
