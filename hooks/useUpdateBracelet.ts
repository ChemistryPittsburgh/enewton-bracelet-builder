import { useStore } from "@/lib/store";
import { useUpdateDesign } from "@/hooks/useUpdateDesign";
import { useDesign } from "@/hooks/useDesign";
import { useGenerateThumbnail } from "@/hooks/useGenerateThumbnail";
import { uploadThumbnail } from "@/hooks/useUploadThumbnail";
import { buildBraceletConfig } from "@/lib/build-bracelet-config";
import { slugify } from "@/lib/utils";

/**
 * Shared bracelet update logic — capture thumbnail → upload → PUT /designs/:id.
 *
 * The thumbnail is always regenerated on every save so the card image stays in
 * sync regardless of what changed (beads, size, material, or name).
 *
 * Requires `store.activeDesignId` to be set (i.e. a design was previously saved
 * or loaded from the Saved Designs panel).
 *
 * Exposes `canUpdate` so callers can conditionally disable the button when the
 * current user lacks the `is_bracelet_editor` permission.
 */
export function useUpdateBracelet() {
  const { activeDesignId, beads, braceletName, braceletDescription, bandMaterial, braceletSize, hairtieColor } = useStore(
    (s) => ({
      activeDesignId:      s.activeDesignId,
      beads:               s.beads,
      braceletName:        s.braceletName,
      braceletDescription: s.braceletDescription,
      bandMaterial:        s.bandMaterial,
      braceletSize:        s.braceletSize,
      hairtieColor:        s.hairtieColor,
    }),
  );

  const { data: savedDesign }              = useDesign(activeDesignId);
  const { mutateAsync: updateDesign, canUpdate } = useUpdateDesign();
  const { capture }                        = useGenerateThumbnail();
  const markClean                          = useStore((s) => s.markClean);

  async function update(): Promise<void> {
    if (!activeDesignId) {
      throw new Error("[useUpdateBracelet] No active design — call save first.");
    }

    // Always recapture the thumbnail — keep the existing URL only if capture fails
    // (e.g. WebGL context lost).
    let preview_image_url: string | null = savedDesign?.preview_image_url ?? null;
    const dataUrl = await capture();
    if (dataUrl) {
      const filename = `bracelet-${slugify(braceletName)}-${Date.now()}.png`;
      preview_image_url = await uploadThumbnail(dataUrl, filename);
    }

    const configuration = buildBraceletConfig(beads, braceletSize, bandMaterial, hairtieColor);

    await updateDesign({
      id: activeDesignId,
      name: braceletName,
      description: braceletDescription || null,
      configuration,
      preview_image_url,
    });

    markClean();
  }

  return { update, canUpdate };
}