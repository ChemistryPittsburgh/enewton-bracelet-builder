"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import { useStore } from "@/lib/store";
import { useLoadDesign } from "@/hooks/useLoadDesign";
import { useSaveBracelet } from "@/hooks/useSaveBracelet";
import { usePermissions } from "@/hooks/usePermissions";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Button } from "@/components/ui/Button";

type ConfirmStatus = "idle" | "saving" | "error";

/**
 * Global "Replace current bracelet?" modal.
 *
 * Rendered once at the root (BuilderLayout). Any panel that wants to load a
 * design while the canvas has beads should call `store.setPendingDesign(design, onClose)`
 * instead of calling loadDesign() directly — this dialog will handle the rest.
 */
export function ConfirmReplaceDialog() {
  const pendingDesign    = useStore((s) => s.pendingDesign);
  const pendingOnLoad    = useStore((s) => s.pendingDesignOnLoad);
  const clearPending     = useStore((s) => s.clearPendingDesign);
  const braceletName     = useStore((s) => s.braceletName);

  const { loadDesign }   = useLoadDesign();
  const { save }         = useSaveBracelet();
  const { canEdit }      = usePermissions();

  const [status, setStatus] = useState<ConfirmStatus>("idle");

  // Close on Escape — only when not mid-save
  useEffect(() => {
    if (!pendingDesign) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && status !== "saving") handleCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pendingDesign, status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pendingDesign) return null;

  async function handleSaveAndLoad() {
    if (status === "saving") return;
    setStatus("saving");
    try {
      await save();
      if (pendingDesign!.id !== -1) {
        const ok = await loadDesign(pendingDesign!);
        if (!ok) { setStatus("error"); return; }
      }
      pendingOnLoad?.();
      clearPending();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
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
      <div className="w-[360px] rounded-2xl bg-white p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-md font-semibold">
              Replace current bracelet?
            </h3>
            <p className="mt-2 text-sm text-color-base/80 leading-relaxed">
              You have beads on{" "}
              <span className="font-medium  ">"{braceletName}"</span>.
              {pendingDesign.id === -1
                ? canEdit
                  ? " Save before starting a new bracelet?"
                  : " Start a new bracelet?"
                : canEdit
                  ? <>
                      {" "}Save it before loading{" "}
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

        <div className="flex flex-col gap-2">
          {canEdit && (
            <Button
              onClick={handleSaveAndLoad}
              disabled={status === "saving"}
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