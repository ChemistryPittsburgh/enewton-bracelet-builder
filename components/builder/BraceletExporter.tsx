"use client";

import { useState } from "react";
import { AlertCircle, Check, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useCreateBracelet } from "@/hooks/useCreateBracelet";
import { useGenerateThumbnail } from "@/hooks/useGenerateThumbnail";
import { uploadThumbnail } from "@/hooks/useUploadThumbnail";
import { useStore } from "@/lib/store";
import { slugify } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function BraceletExporter() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const braceletName = useStore((s) => s.braceletName);
  const { mutateAsync: createBracelet } = useCreateBracelet();
  const { capture } = useGenerateThumbnail();

  async function handleSave() {
    if (status === "saving") return;
    setStatus("saving");

    try {
      // 1. Capture thumbnail from the 3D canvas
      const dataUrl = capture();
      const filename = `bracelet-${slugify(braceletName)}-${Date.now()}.png`;

      // 2. Upload to public/thumbnails/ (dev) — replace with S3 in production
      let preview_image_url: string | null = null;
      if (dataUrl) {
        preview_image_url = await uploadThumbnail(dataUrl, filename);
      }

      // 3. POST /designs with full schema
      await createBracelet({ preview_image_url });

      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      console.error("[BraceletExporter]", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <Button
      onClick={handleSave}
      variant="black"
      disabled={status === "saving"}
      className={
        status === "saved"
          ? "bg-green-700 hover:bg-green-700"
          : status === "error"
            ? "bg-red-700 hover:bg-red-700"
            : ""
      }
    >
      {status === "saving" && <Loader2 size={14} className="animate-spin" />}
      {status === "saved"  && <Check size={14} />}
      {status === "error"  && <AlertCircle size={14} />}
      {status === "idle"   && <Download size={14} />}

      <span>
        {status === "saving" ? "Saving…"  :
         status === "saved"  ? "Saved!"   :
         status === "error"  ? "Failed"   :
         "Save Bracelet"}
      </span>
    </Button>
  );
}
