"use client";

import { useState } from "react";
import { AlertCircle, Check, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useSaveBracelet } from "@/hooks/useSaveBracelet";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function BraceletExporter() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { save } = useSaveBracelet();

  async function handleSave() {
    if (status === "saving") return;
    setStatus("saving");

    try {
      await save();
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
