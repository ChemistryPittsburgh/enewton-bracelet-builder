"use client";

import { useState } from "react";
import { AlertCircle, Check, Download, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useSaveBracelet } from "@/hooks/useSaveBracelet";
import { useUpdateBracelet } from "@/hooks/useUpdateBracelet";
import { useStore } from "@/lib/store";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function BraceletExporter() {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const activeDesignId = useStore((s) => s.activeDesignId);
  const isUpdate = activeDesignId !== null;

  const { save } = useSaveBracelet();
  const { update, canUpdate } = useUpdateBracelet();

  async function handleClick() {
    if (status === "saving") return;
    setStatus("saving");

    try {
      if (isUpdate) {
        await update();
      } else {
        await save();
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      console.error("[BraceletExporter]", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  const isDisabled = status === "saving" || (isUpdate && !canUpdate);

  const idleLabel   = isUpdate ? "Update Bracelet" : "Save Bracelet";
  const savingLabel = isUpdate ? "Updating…"       : "Saving…";
  const savedLabel  = isUpdate ? "Updated!"        : "Saved!";

  return (
    <Button
      onClick={handleClick}
      variant="black"
      disabled={isDisabled}
      title={isUpdate && !canUpdate ? "You don't have permission to edit this design." : undefined}
      className={
        status === "saved"
          ? "bg-green-700 hover:bg-green-700"
          : status === "error"
            ? "bg-red-700 hover:bg-red-700"
            : ""
      }
    >
      {status === "saving" && <Loader2   size={14} className="animate-spin" />}
      {status === "saved"  && <Check     size={14} />}
      {status === "error"  && <AlertCircle size={14} />}
      {status === "idle"   && (isUpdate
        ? <RefreshCw size={14} />
        : <Download  size={14} />
      )}

      <span>
        {status === "saving" ? savingLabel :
         status === "saved"  ? savedLabel  :
         status === "error"  ? "Failed"    :
         idleLabel}
      </span>
    </Button>
  );
}
