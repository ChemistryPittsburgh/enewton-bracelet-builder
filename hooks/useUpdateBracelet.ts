import { useStore } from "@/lib/store";
import { useUpdateDesign } from "@/hooks/useUpdateDesign";
import { useDesign } from "@/hooks/useDesign";
import { useGenerateThumbnail } from "@/hooks/useGenerateThumbnail";
import { uploadThumbnail } from "@/hooks/useUploadThumbnail";
import { buildBraceletConfig } from "@/lib/build-bracelet-config";
import { slugify } from "@/lib/utils";
import type { PlacedBead, BandMaterial, BraceletSize, BraceletConfiguration } from "@/types";

/**
 * Returns true when the current canvas state would produce a visually different
 * image from the one already stored. Only bead sequence, size, and material
 * affect the render — name, description, instance IDs, and arc stats do not.
 */
function visuallyChanged(
  beads: PlacedBead[],
  braceletSize: BraceletSize,
  bandMaterial: BandMaterial,
  saved: BraceletConfiguration,
): boolean {
  if (braceletSize !== saved.bracelet_size) return true;
  if (bandMaterial !== saved.band_material)  return true;
  if (beads.length  !== saved.beads.length)  return true;
  return beads.some((b, i) => b.product.id !== saved.beads[i].product_id);
}

/**
 * Shared bracelet update logic — optionally capture thumbnail → upload → PUT /designs/:id.
 *
 * The thumbnail is only regenerated when the bracelet's visual appearance has
 * actually changed (different beads, size, or material). Name-only or
 * description-only edits reuse the existing preview_image_url, skipping the
 * pixel-scan and S3 upload entirely.
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

    // Determine whether the visual content changed since the last save.
    // If savedDesign hasn't loaded yet, treat it as changed (safe fallback).
    const changed =
      !savedDesign ||
      visuallyChanged(beads, braceletSize, bandMaterial, savedDesign.configuration);

    // Start with the existing URL; replace only if the bracelet actually changed.
    let preview_image_url: string | null = savedDesign?.preview_image_url ?? null;

    if (changed) {
      const dataUrl = await capture();
      if (dataUrl) {
        const filename = `bracelet-${slugify(braceletName)}-${Date.now()}.png`;
        preview_image_url = await uploadThumbnail(dataUrl, filename);
      }
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