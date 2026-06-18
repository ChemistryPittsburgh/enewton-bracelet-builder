"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import { useStore } from "@/lib/store";
import { useLoadDesign } from "@/hooks/useLoadDesign";
import { useLoadPattern } from "@/hooks/useLoadPattern";
import { useSaveBracelet } from "@/hooks/useSaveBracelet";
import { usePermissions } from "@/hooks/usePermissions";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Button } from "@/components/ui/Button";
import { DEFAULT_BRACELET_NAME } from "@/lib/constants";

function isDefaultName(name: string) {
  const t = name.trim();
  return t === "" || t === DEFAULT_BRACELET_NAME;
}

type ConfirmStatus = "idle" | "saving" | "error";

/**
 * Global "Replace current bracelet?" modal.
 *
 * Rendered once at the root (BuilderLayout). Any panel that wants to load a
 * design while the canvas has beads should call `store.setPendingDesign(design, onClose)`
 * instead of calling loadDesign() directly — this dialog will handle the rest.
 *
 * If the bracelet hasn't been named yet, an inline name input is shown and
 * "Save & Load" is blocked until a name is entered.
 */
export function ConfirmReplaceDialog() {
  const pendingDesign    = useStore((s) => s.pendingDesign);
  const pendingOnLoad    = useStore((s) => s.pendingDesignOnLoad);
  const clearPending     = useStore((s) => s.clearPendingDesign);
  const pendingPattern        = useStore((s) => s.pendingPattern);
  const pendingPatternEditMode = useStore((s) => s.pendingPatternEditMode);
  const clearPendingPattern   = useStore((s) => s.clearPendingPattern);
  const braceletName     = useStore((s) => s.braceletName);
  const activeDesignId   = useStore((s) => s.activeDesignId);
  const setBraceletName  = useStore((s) => s.setBraceletName);

  const { loadDesign }   = useLoadDesign();
  const { applyPattern } = useLoadPattern();
  const { save }         = useSaveBracelet();
  const { canEdit }      = usePermissions();

  const [status, setStatus]                       = useState<ConfirmStatus>("idle");
  const [nameInput, setNameInput]                 = useState("");
  const [pendingSaveAfterName, setPendingSaveAfterName] = useState(false);

  const needsName = isDefaultName(braceletName);

  // Seed the name input when the dialog opens
  useEffect(() => {
    if (pendingDesign) {
      setNameInput(needsName ? "" : braceletName);
      setStatus("idle");
      setPendingSaveAfterName(false);
    }
  }, [pendingDesign]); // eslint-disable-line react-hooks/exhaustive-deps

  // After setBraceletName triggers a re-render with the new name,
  // this effect fires the save with the correct braceletName in the closure.
  useEffect(() => {
    if (!pendingSaveAfterName) return;
    if (isDefaultName(braceletName)) return;
    setPendingSaveAfterName(false);
    doSaveAndLoad();
  }, [pendingSaveAfterName, braceletName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape — only when not mid-save
  useEffect(() => {
    if (!pendingDesign) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && status !== "saving") handleCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pendingDesign, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pattern branch — simpler dialog, no lock or activeDesignId needed.
  if (pendingPattern && !pendingDesign) {
    return (
      <PatternConfirmDialog
        patternName={pendingPattern.name}
        braceletName={braceletName}
        editMode={pendingPatternEditMode}
        onConfirm={() => {
          applyPattern(pendingPattern, pendingPatternEditMode ? pendingPattern.id : null);
          clearPendingPattern();
        }}
        onCancel={() => clearPendingPattern()}
      />
    );
  }

  if (!pendingDesign) return null;

  const canSave = !needsName || (nameInput.trim() !== "" && nameInput.trim() !== DEFAULT_BRACELET_NAME);

  async function doSaveAndLoad() {
    setStatus("saving");
    try {
      await save();
      if (pendingDesign!.id !== -1) {
        // If the pending design is the one already on the canvas, we hold the
        // lock — skip the redundant POST /lock that could race and discard the save.
        const alreadyHeld = pendingDesign!.id === activeDesignId;
        const ok = await loadDesign(pendingDesign!, alreadyHeld);
        if (!ok) { setStatus("error"); return; }
      }
      pendingOnLoad?.();
      clearPending();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function handleSaveAndLoad() {
    if (status === "saving") return;

    if (needsName) {
      const trimmed = nameInput.trim();
      if (!trimmed || trimmed === DEFAULT_BRACELET_NAME) return;
      setBraceletName(trimmed);
      setPendingSaveAfterName(true);
      return;
    }

    doSaveAndLoad();
  }

  async function handleDiscardAndLoad() {
    if (!pendingDesign || status === "saving") return;
    setStatus("saving");
    try {
      if (pendingDesign.id !== -1) {
        const ok = await loadDesign(pendingDesign);
        if (!ok) { setStatus("error"); return; }
      }
      pendingOnLoad?.();
      clearPending();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function handleCancel() {
    clearPending();
    setStatus("idle");
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget && status !== "saving") handleCancel(); }}
    >
      <div className="w-[450px] rounded-2xl bg-white p-6 shadow-2xl flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-semibold">
              Replace current bracelet?
            </h3>
            <p className="mt-2 text-sm text-color-base/80 leading-relaxed">
              You have beads on{" "}
              <span className="font-medium  ">"{braceletName}"</span> that aren't saved and will be lost.<br />
              <span className="pb-1 block" />
              {pendingDesign.id === -1
                ? canEdit
                  ? " Save before starting a new bracelet?"
                  : " Start a new bracelet?"
                : canEdit
                  ? <>
                      {" "}Save before loading{" "}
                      <span className="font-medium">"{pendingDesign.name}"</span>?
                    </>
                  : <>
                      {" "}Load{" "}
                      <span className="font-medium">"{pendingDesign.name}"</span>?
                    </>
              }
            </p>
          </div>
          <button
            onClick={handleCancel}
            disabled={status === "saving"}
            className="mt-0.5 shrink-0 rounded-full p-1 text-color-base/70 hover:bg-default/50 hover:text-color-base transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {status === "error" && (
          <ErrorAlert message="Save failed — check your connection and try again." />
        )}

        {/* Name input — shown when the bracelet hasn't been named yet */}
        {canEdit && needsName && (
          <div className="flex flex-col gap-1.5 pb-1">
            <label className="text-xs font-semibold text-color-base/70">Name your bracelet to save</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canSave) handleSaveAndLoad(); }}
              placeholder="Enter bracelet name"
              autoFocus
              className="w-full rounded-[2px] border border-default px-3 py-2 text-sm outline-none transition-colors focus:border-navy focus:ring-navy placeholder:text-color-base/70"
            />
          </div>
        )}

        <div className="flex max-lg:flex-col gap-2">
          {canEdit && (
            <Button
              onClick={handleSaveAndLoad}
              disabled={status === "saving" || !canSave}
              variant="primary"
              size="sm"
              className="w-full"
            >
              {status === "saving" && <Loader2 size={14} className="animate-spin" />}
              Save &amp; Load
            </Button>
          )}
          <Button
            onClick={handleDiscardAndLoad}
            disabled={status === "saving"}
            variant={canEdit ? "ghost" : "primary"}
            size="sm"
            className="w-full"
          >
            {canEdit ? "Discard & Load" : "Load"}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={status === "saving"}
            variant="danger"
            size="sm"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function PatternConfirmDialog({
  patternName,
  braceletName,
  editMode,
  onConfirm,
  onCancel,
}: {
  patternName: string;
  braceletName: string;
  editMode: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-[420px] rounded-2xl bg-white p-6 shadow-2xl flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-semibold">{editMode ? "Edit pattern?" : "Load pattern?"}</h3>
            <p className="mt-2 text-sm text-color-base/80 leading-relaxed">
              You have unsaved beads on{" "}
              <span className="font-medium">"{braceletName}"</span> that will be discarded.{" "}
              {editMode ? "Edit" : "Load"} the pattern{" "}
              <span className="font-medium">"{patternName}"</span>?
            </p>
          </div>
          <button
            onClick={onCancel}
            className="mt-0.5 shrink-0 rounded-full p-1 text-color-base/70 hover:bg-default/50 hover:text-color-base transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2">
          <Button onClick={onConfirm} variant="primary" size="sm" className="w-full">
            {editMode ? "Discard & Edit Pattern" : "Discard & Load Pattern"}
          </Button>
          <Button onClick={onCancel} variant="danger" size="sm">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}