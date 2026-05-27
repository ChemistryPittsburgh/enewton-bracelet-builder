import { useStore } from "@/lib/store";
import { useUpdateDesign } from "@/hooks/useUpdateDesign";
import { useGenerateThumbnail } from "@/hooks/useGenerateThumbnail";
import { uploadThumbnail } from "@/hooks/useUploadThumbnail";
import { buildBraceletConfig } from "@/lib/build-bracelet-config";
import { slugify } from "@/lib/utils";

/**
 * Shared bracelet update logic — capture thumbnail → upload → PUT /designs/:id.
 * Requires `store.activeDesignId` to be set (i.e. a design was previously saved
 * or loaded from the Saved Designs panel).
 *
 * Exposes `canUpdate` so callers can conditionally disable the button when the
 * current user lacks the `is_bracelet_editor` permission.
 *
 * Callers are responsible for managing their own loading/error UI state.
 */
export function useUpdateBracelet() {
  const { activeDesignId, beads, braceletName, bandMaterial, braceletSize } = useStore(
    (s) => ({
      activeDesignId: s.activeDesignId,
      beads: s.beads,
      braceletName: s.braceletName,
      bandMaterial: s.bandMaterial,
      braceletSize: s.braceletSize,
    }),
  );

  const { mutateAsync: updateDesign, canUpdate } = useUpdateDesign();
  const { capture } = useGenerateThumbnail();

  async function update(): Promise<void> {
    if (!activeDesignId) {
      throw new Error("[useUpdateBracelet] No active design — call save first.");
    }

    const dataUrl = capture();
    const filename = `bracelet-${slugify(braceletName)}-${Date.now()}.png`;

    let preview_image_url: string | null = null;
    if (dataUrl) {
      preview_image_url = await uploadThumbnail(dataUrl, filename);
    }

    const configuration = buildBraceletConfig(beads, braceletSize, bandMaterial);

    await updateDesign({
      id: activeDesignId,
      name: braceletName,
      configuration,
      preview_image_url,
    });
  }

  return { update, canUpdate };
}
