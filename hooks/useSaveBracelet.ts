import { useStore } from "@/lib/store";
import { useCreateBracelet } from "@/hooks/useCreateBracelet";
import { useGenerateThumbnail } from "@/hooks/useGenerateThumbnail";
import { uploadThumbnail } from "@/hooks/useUploadThumbnail";
import { slugify } from "@/lib/utils";
import { toast } from "@/lib/toast";

/**
 * Shared bracelet save logic — capture thumbnail → upload → POST /designs.
 * Used by BraceletExporter (header button) and the SavedDesignsScreens
 * "Save & Load" confirmation flow.
 *
 * After a successful POST the returned design's ID is stored in
 * `store.activeDesignId` so subsequent saves become updates.
 *
 * Callers are responsible for managing their own loading/error UI state.
 */
export function useSaveBracelet() {
  const braceletName = useStore((s) => s.braceletName);
  const setActiveDesignId = useStore((s) => s.setActiveDesignId);
  const markClean = useStore((s) => s.markClean);
  const { mutateAsync: createBracelet } = useCreateBracelet();
  const { capture } = useGenerateThumbnail();

  async function save(): Promise<void> {
    const dataUrl = await capture();
    const filename = `bracelet-${slugify(braceletName)}-${Date.now()}.png`;
    let preview_image_url: string | null = null;
    if (dataUrl) {
      preview_image_url = await uploadThumbnail(dataUrl, filename);
    }
    const created = await createBracelet({ preview_image_url });
    setActiveDesignId(created.id);
    markClean();
    toast.success("Bracelet saved");
  }

  return { save };
}