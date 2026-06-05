"use client";

import { useState } from "react";
import { AlertCircle, Check, Download, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useSaveBracelet } from "@/hooks/useSaveBracelet";
import { useUpdateBracelet } from "@/hooks/useUpdateBracelet";
import { useDesign } from "@/hooks/useDesign";
import { useStore } from "@/lib/store";
import { usePermissions } from "@/hooks/usePermissions";

/** The name assigned to every new bracelet before the user sets one. */
const DEFAULT_BRACELET_NAME = "New Bracelet";

/** Returns true when the user hasn't given the bracelet a real name yet. */
function isDefaultName(name: string) {
  const t = name.trim();
  return t === "" || t === DEFAULT_BRACELET_NAME;
}

type SaveStatus = "idle" | "saving" | "saved" | "error" | "name_required";

interface BraceletExporterProps {
  /**
   * Called when the user tries to save a new bracelet without setting a name.
   * The parent can use this to highlight the "view bracelet details" link.
   */
  onNameRequired?: () => void;
}

export function BraceletExporter({ onNameRequired }: BraceletExporterProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { canEdit } = usePermissions();

  const { activeDesignId, beads, braceletName, braceletDescription, bandMaterial, braceletSize } =
    useStore((s) => ({
      activeDesignId:      s.activeDesignId,
      beads:               s.beads,
      braceletName:        s.braceletName,
      braceletDescription: s.braceletDescription,
      bandMaterial:        s.bandMaterial,
      braceletSize:        s.braceletSize,
    }));

  const { data: savedDesign } = useDesign(activeDesignId);
  const isUpdate = activeDesignId !== null;

  // ── Dirty check ────────────────────────────────────────────────────────────
  const isDirty = (() => {
    if (!isUpdate) return true;
    if (!savedDesign) return false;
    const cfg = savedDesign.configuration;
    if (braceletName        !== savedDesign.name)                              return true;
    if ((braceletDescription || null) !== (savedDesign.description || null))  return true;
    if (braceletSize        !== cfg.bracelet_size)                            return true;
    if (bandMaterial        !== cfg.band_material)                            return true;
    if (beads.length        !== cfg.beads.length)                             return true;
    return beads.some((b, i) => b.product.id !== cfg.beads[i].product_id);
  })();

  const { save }              = useSaveBracelet();
  const { update, canUpdate } = useUpdateBracelet();

  async function handleClick() {
    if (status === "saving") return;

    // Gate new saves on a real name being set
    if (!isUpdate && isDefaultName(braceletName)) {
      setStatus("name_required");
      onNameRequired?.();
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }

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

  if (!canEdit) return null;
  if (isUpdate && !isDirty && status === "idle") return null;

  const designStatus = savedDesign?.status;
  const isLocked     = designStatus === "approved" || designStatus === "published";
  const lockedTitle  = `This design is ${designStatus} and cannot be edited. Reject it first to make changes.`;
  const isDisabled   = status === "saving" || isLocked || (isUpdate && !canUpdate);

  const idleLabel   = isUpdate ? "Update Bracelet" : "Save Bracelet";
  const savingLabel = isUpdate ? "Updating…"       : "Saving…";
  const savedLabel  = isUpdate ? "Updated!"        : "Saved!";

  return (
    <Button
      onClick={handleClick}
      variant="black"
      disabled={isDisabled}
      title={
        isLocked
          ? lockedTitle
          : isUpdate && !canUpdate
            ? "You don't have permission to edit this design."
            : undefined
      }
      className={
        status === "saved"
          ? "bg-green-700 hover:bg-green-700"
          : status === "error" || status === "name_required"
            ? "bg-amber-600 hover:bg-amber-600"
            : ""
      }
    >
      {status === "saving"        && <Loader2     size={14} className="animate-spin" />}
      {status === "saved"         && <Check       size={14} />}
      {status === "error"         && <AlertCircle size={14} />}
      {status === "name_required" && <AlertCircle size={14} />}
      {status === "idle"          && (isUpdate
        ? <RefreshCw size={14} />
        : <Download  size={14} />
      )}
      <span>
        {status === "saving"        ? savingLabel        :
         status === "saved"         ? savedLabel         :
         status === "error"         ? "Failed"           :
         status === "name_required" ? "Set a name first" :
         idleLabel}
      </span>
    </Button>
  );
}