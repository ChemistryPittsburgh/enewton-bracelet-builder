"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { useStore } from "@/lib/store";
import { useLoadDesign } from "@/hooks/useLoadDesign";
import { useSaveBracelet } from "@/hooks/useSaveBracelet";
import { usePermissions } from "@/hooks/usePermissions";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

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

  if (!pendingDesign) return null;

  async function handleSaveAndLoad() {
    if (status === "saving") return;
    setStatus("saving");
    try {
      await save();
      if (pendingDesign!.id !== -1) {
        loadDesign(pendingDesign!);
      }
      pendingOnLoad?.();
      clearPending();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function handleDiscardAndLoad() {
    if (!pendingDesign) return null;
    if (pendingDesign.id === -1) {
      // New bracelet — just reset, don't load a design
    } else {
      loadDesign(pendingDesign!);
    }
    pendingOnLoad?.();
    clearPending();
    setStatus("idle");
  }

  function handleCancel() {
    clearPending();
    setStatus("idle");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="w-[360px] rounded-2xl bg-white p-6 shadow-2xl flex flex-col gap-5">
        <div>
          <h3 className="text-base text-md font-semibold text-neutral-900">
            Replace current bracelet?
          </h3>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            You have beads on{" "}
            <span className="font-medium text-neutral-700">"{braceletName}"</span>.
            {pendingDesign.id === -1
              ? canEdit
                ? " Save before starting a new bracelet?"
                : " Start a new bracelet?"
              : canEdit
                ? <>
                    {" "}Save it before loading{" "}
                    <span className="font-medium text-neutral-700">"{pendingDesign.name}"</span>?
                  </>
                : <>
                    {" "}Load{" "}
                    <span className="font-medium text-neutral-700">"{pendingDesign.name}"</span>?
                  </>
            }
          </p>
        </div>

        {status === "error" && (
          <ErrorAlert message="Save failed — check your connection and try again." />
        )}

        <div className="flex flex-col gap-2">
          {canEdit && (
            <button
              onClick={handleSaveAndLoad}
              disabled={status === "saving"}
              className="flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              {status === "saving" && <Loader2 size={14} className="animate-spin" />}
              Save &amp; Load
            </button>
          )}
          <button
            onClick={handleDiscardAndLoad}
            disabled={status === "saving"}
            className={`rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50 ${!canEdit ? "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-700 hover:border-neutral-700" : ""}`}
          >
            {canEdit ? "Discard & Load" : "Load"}
          </button>
          <button
            onClick={handleCancel}
            disabled={status === "saving"}
            className="rounded-lg text-sm font-medium text-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-50 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
