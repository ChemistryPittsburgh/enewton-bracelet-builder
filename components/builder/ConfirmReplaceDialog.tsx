"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { useStore } from "@/lib/store";
import { useLoadDesign } from "@/hooks/useLoadDesign";
import { useSaveBracelet } from "@/hooks/useSaveBracelet";

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

  const [status, setStatus] = useState<ConfirmStatus>("idle");

  if (!pendingDesign) return null;

  async function handleSaveAndLoad() {
    if (status === "saving") return;
    setStatus("saving");
    try {
      await save();
      loadDesign(pendingDesign!);
      pendingOnLoad?.();
      clearPending();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function handleDiscardAndLoad() {
    loadDesign(pendingDesign!);
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
          <h3 className="text-base font-semibold text-neutral-900">
            Replace current bracelet?
          </h3>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            You have beads on{" "}
            <span className="font-medium text-neutral-700">"{braceletName}"</span>.
            Save it before loading{" "}
            <span className="font-medium text-neutral-700">"{pendingDesign.name}"</span>?
          </p>
        </div>

        {status === "error" && (
          <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertCircle size={14} className="shrink-0" />
            Save failed — check your connection and try again.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={handleSaveAndLoad}
            disabled={status === "saving"}
            className="flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            {status === "saving" && <Loader2 size={14} className="animate-spin" />}
            Save &amp; Load
          </button>
          <button
            onClick={handleDiscardAndLoad}
            disabled={status === "saving"}
            className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50"
          >
            Discard &amp; Load
          </button>
          <button
            onClick={handleCancel}
            disabled={status === "saving"}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-400 hover:text-neutral-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
