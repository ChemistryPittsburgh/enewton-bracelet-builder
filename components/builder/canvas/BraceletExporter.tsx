"use client";

import { useState, useRef, useEffect } from "react";
import { AlertCircle, Check, Download, Loader2, RefreshCw } from "lucide-react";

import { DEFAULT_BRACELET_NAME } from "@/lib/constants";

import { Button } from "@/components/ui/Button";
import { useSaveBracelet } from "@/hooks/useSaveBracelet";
import { useUpdateBracelet } from "@/hooks/useUpdateBracelet";
import { useDesign } from "@/hooks/useDesign";
import { useStore } from "@/lib/store";
import { usePermissions } from "@/hooks/usePermissions";

/** Returns true when the user hasn't given the bracelet a real name yet. */
function isDefaultName(name: string) {
  const t = name.trim();
  return t === "" || t === DEFAULT_BRACELET_NAME;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface BraceletExporterProps {
  /**
   * Called when the user tries to save a new bracelet without setting a name.
   * Kept for backward-compat — the inline popover now handles this directly,
   * but the parent can still use the callback for secondary visual cues.
   */
  onNameRequired?: () => void;
}

export function BraceletExporter({ onNameRequired }: BraceletExporterProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [showNamePopover, setShowNamePopover] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [pendingSaveAfterName, setPendingSaveAfterName] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
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

  const setBraceletName = useStore((s) => s.setBraceletName);

  const { data: savedDesign } = useDesign(activeDesignId);
  const isUpdate = activeDesignId !== null;

  // ── Close popover on outside click ──────────────────────────────────────────
  useEffect(() => {
    if (!showNamePopover) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowNamePopover(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNamePopover]);

  // ── Auto-save after the name is set ─────────────────────────────────────────
  // setBraceletName updates the Zustand store, but hook subscriptions (and the
  // save/update functions they produce) only reflect the new value after React
  // re-renders.  This effect waits for that re-render, then fires the save with
  // the correct braceletName baked into the hooks.
  useEffect(() => {
    if (!pendingSaveAfterName) return;
    if (isDefaultName(braceletName)) return;
    setPendingSaveAfterName(false);
    doSave();
  }, [pendingSaveAfterName, braceletName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dirty check ─────────────────────────────────────────────────────────────
  const isDirty = (() => {
    if (!isUpdate) return true;
    if (!savedDesign) return false;
    const cfg = savedDesign.configuration;
    if (braceletName        !== savedDesign.name)                              return true;
    if ((braceletDescription || null) !== (savedDesign.description || null))  return true;
    if (braceletSize        !== cfg.bracelet_size)                            return true;
    if (bandMaterial        !== cfg.band_material)                            return true;
    if (beads.length        !== cfg.beads.length)                             return true;
    const sortedCfgBeads = [...cfg.beads].sort((a, b) => a.position - b.position);
    return beads.some((b, i) => b.product.id !== sortedCfgBeads[i].product_id);
  })();

  const { save }              = useSaveBracelet();
  const { update, canUpdate } = useUpdateBracelet();

  async function doSave() {
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

  async function handleClick() {
    if (status === "saving") return;

    // Show the inline name popover for new bracelets without a name
    if (!isUpdate && isDefaultName(braceletName)) {
      setNameInput("");
      setShowNamePopover(true);
      return;
    }

    await doSave();
  }

  function handlePopoverSave() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === DEFAULT_BRACELET_NAME) return;

    setBraceletName(trimmed);
    setShowNamePopover(false);
    // Defer the actual save until hooks pick up the new name (see useEffect above)
    setPendingSaveAfterName(true);
  }

  if (!canEdit) return null;
  if (isUpdate && !isDirty && status === "idle") return null;

  const designStatus = savedDesign?.status;
  const isLocked     = designStatus === 'in_review' || designStatus === "approved" || designStatus === "published";
  const lockedTitle  = `This design is ${designStatus} and cannot be edited. Reject it first to make changes.`;
  const isDisabled   = status === "saving" || isLocked || (isUpdate && !canUpdate);

  const idleLabel   = isUpdate ? "Update Bracelet" : "Save Bracelet";
  const savingLabel = isUpdate ? "Updating…"       : "Saving…";
  const savedLabel  = isUpdate ? "Updated!"        : "Saved!";

  return (
    <div className="relative" ref={popoverRef}>
      <Button
        onClick={handleClick}
        variant="secondary"
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
            ? "bg-green hover:bg-green/50 text-white border-green"
            : status === "error" || showNamePopover
              ? "bg-error hover:bg-error border-error text-white"
              : ""
        }
      >
        {status === "saving"        && <Loader2     size={14} className="animate-spin" />}
        {status === "saved"         && <Check       size={14} />}
        {status === "error"         && <AlertCircle size={14} />}
        {showNamePopover            && <AlertCircle size={14} />}
        {status === "idle" && !showNamePopover && (isUpdate
          ? <RefreshCw size={14} />
          : <Download  size={14} />
        )}
        <span>
          {status === "saving"  ? savingLabel :
           status === "saved"   ? savedLabel  :
           status === "error"   ? "Failed"    :
           showNamePopover      ? "Set a name first" :
           idleLabel}
        </span>
      </Button>

      {/* Floating name popover — appears when saving without a name */}
      {showNamePopover && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-lg border border-default bg-white p-3 shadow-lg">
          <p className="text-xs font-semibold text-color-base/70 mb-2">Name your bracelet to save</p>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handlePopoverSave(); }}
            placeholder="Enter bracelet name"
            autoFocus
            className="w-full rounded-md border border-default px-3 py-1.5 text-sm outline-none transition-colors focus:border-navy placeholder:text-color-base/70"
          />
          <div className="mt-2 flex items-center gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowNamePopover(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!nameInput.trim() || nameInput.trim() === DEFAULT_BRACELET_NAME}
              onClick={handlePopoverSave}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}