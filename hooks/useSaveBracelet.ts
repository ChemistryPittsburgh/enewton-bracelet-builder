import { useStore } from "@/lib/store";
import { useCreateBracelet } from "@/hooks/useCreateBracelet";
import { useGenerateThumbnail } from "@/hooks/useGenerateThumbnail";
import { uploadThumbnail } from "@/hooks/useUploadThumbnail";
import { slugify } from "@/lib/utils";

/**
 * Shared bracelet save logic — capture thumbnail → upload → POST /designs.
 * Used by BraceletExporter (header button) and the SavedDesignsPanel
 * "Save & Load" confirmation flow.
 *
 * Callers are responsible for managing their own loading/error UI state.
 */
export function useSaveBracelet() {
  const braceletName = useStore((s) => s.braceletName);
  const { mutateAsync: createBracelet } = useCreateBracelet();
  const { capture } = useGenerateThumbnail();

  async function save(): Promise<void> {
    const dataUrl = capture();
    const filename = `bracelet-${slugify(braceletName)}-${Date.now()}.png`;

    let preview_image_url: string | null = null;
    if (dataUrl) {
      preview_image_url = await uploadThumbnail(dataUrl, filename);
    }

    await createBracelet({ preview_image_url });
  }

  return { save };
}
