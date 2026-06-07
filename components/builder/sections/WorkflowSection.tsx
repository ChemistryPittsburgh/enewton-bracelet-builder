"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { z } from "zod";

import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmationPanel } from "@/components/ui/ConfirmationPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

import { ApiError } from "@/lib/api";
import { STATUS_META } from "@/lib/category-colors";
import { useSubmitDesign } from "@/hooks/useSubmitDesign";
import { useApproveDesign } from "@/hooks/useApproveDesign";
import { useRejectDesign } from "@/hooks/useRejectDesign";
import { usePublishDesign } from "@/hooks/usePublishDesign";
import { useUnPublishDesign } from "@/hooks/useUnPublishDesign";
import { useSendToDraft } from "@/hooks/useSendToDraft";
import { useSetDesignSku } from "@/hooks/useSetDesignSku";
import { useDiscontinueDesign } from "@/hooks/useDiscontinueDesign";
import { useUndiscontinueDesign } from "@/hooks/useUndiscontinueDesign";
import { useReopenDesign } from "@/hooks/useReopenDesign";

import type { Bracelet, BraceletStatus } from "@/types";

// ── Status metadata (exported — also used by BraceletDetailsDialog) ───────────

// STATUS_META is defined in @/lib/category-colors — imported above and re-exported
// so existing importers (BraceletDetailsDialog, CanvasWorkflowBar, etc.) need no path change.
export { STATUS_META } from "@/lib/category-colors";

// ── Pipeline ──────────────────────────────────────────────────────────────────

const PIPELINE: { status: BraceletStatus; label: string }[] = [
  { status: "draft",     label: "Draft"     },
  { status: "in_review", label: "In Review" },
  { status: "approved",  label: "Approved"  },
  { status: "published", label: "Published" },
];

const PIPELINE_SET = new Set(PIPELINE.map((s) => s.status));

// ── SKU validation ────────────────────────────────────────────────────────────

const skuSchema = z
  .string()
  .min(1, "SKU is required")
  .max(100, "Must be 100 characters or fewer")
  .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, hyphens, and underscores");

// ── Component ─────────────────────────────────────────────────────────────────

export function WorkflowSection({ savedDesign }: { savedDesign: Bracelet | undefined }) {
  const { mutate: submit,      isPending: submitting,    canSubmit }    = useSubmitDesign();
  const { mutate: approve,     isPending: approving,     canApprove }   = useApproveDesign();
  const { mutate: reject,      isPending: rejecting,     canReject }    = useRejectDesign();
  const { mutate: publish,     isPending: publishing,    isError: publishFailed, error: publishError, canPublish } = usePublishDesign();
  const { mutate: unpublish,   isPending: unpublishing,  canUnPublish } = useUnPublishDesign();
  const { mutate: sendToDraft, isPending: sendingToDraft, canSendToDraft } = useSendToDraft();
  const { mutate: setSku,      isPending: settingSku,    canSetSku }    = useSetDesignSku();
  const { mutate: discontinue,   isPending: discontinuing,   canDiscontinue }   = useDiscontinueDesign();
  const { mutate: undiscontinue, isPending: undiscontinuing, canUndiscontinue } = useUndiscontinueDesign();
  const { mutate: reopen,        isPending: reopening,       canReopen }        = useReopenDesign();

  const [skuInput,            setSkuInput]            = useState("");
  const [skuError,            setSkuError]            = useState<string | null>(null);
  const [skuSaved,            setSkuSaved]            = useState(false);
  const [confirmSendToDraft,  setConfirmSendToDraft]  = useState(false);
  const [confirmUnpublish,    setConfirmUnpublish]    = useState(false);
  const [confirmDiscontinue,  setConfirmDiscontinue]  = useState(false);
  const [confirmReactivate,   setConfirmReactivate]   = useState(false);
  const [confirmReject,       setConfirmReject]       = useState(false);
  const [rejectReason,        setRejectReason]        = useState("");

  useEffect(() => {
    setSkuInput(savedDesign?.shopify_sku ?? "");
  }, [savedDesign?.shopify_sku]);

  useEffect(() => {
    setConfirmSendToDraft(false);
    setConfirmUnpublish(false);
    setConfirmDiscontinue(false);
    setConfirmReactivate(false);
    setConfirmReject(false);
    setRejectReason("");
  }, [savedDesign?.id]);

  if (!savedDesign) return null;

  const { status, id } = savedDesign;

  // ── Discontinued ───────────────────────────────────────────────────────────
  if (savedDesign.is_discontinued === 1) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-neutral-800">
            This design has been discontinued.
          </span>
        </div>
        {canUndiscontinue && (
          confirmReactivate ? (
            <ConfirmationPanel
              message="This will reactivate the bracelet and return it to Published status."
              isPending={undiscontinuing}
              onConfirm={() => undiscontinue(id, { onSuccess: () => setConfirmReactivate(false) })}
              onCancel={() => setConfirmReactivate(false)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <ActionButton
                label="Reactivate"
                isPending={false}
                onClick={() => setConfirmReactivate(true)}
                variant="primary"
              />
            </div>
          )
        )}
      </div>
    );
  }

  // ── Rejected ───────────────────────────────────────────────────────────────
  if (status === "rejected") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-neutral-800">
            This design was rejected and needs revision before resubmitting.
          </span>
        </div>
        {canReopen && (
          <div className="flex items-center gap-2">
            <ActionButton
              label="Return to Draft"
              isPending={reopening}
              onClick={() => reopen(id)}
              variant="secondary"
            />
          </div>
        )}
      </div>
    );
  }

  // ── Out-of-pipeline statuses ───────────────────────────────────────────────
  if (!PIPELINE_SET.has(status)) {
    return (
      <div>
        <SectionHeading>Status</SectionHeading>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_META[status].cls}`}>
            {STATUS_META[status].label}
          </span>
          <span className="text-xs text-neutral-400">
            This design is not in the standard review pipeline.
          </span>
        </div>
      </div>
    );
  }

  const currentIndex = PIPELINE.findIndex((s) => s.status === status);

  const hasActions =
    (status === "draft"     && canSubmit)  ||
    (status === "in_review" && (canApprove || canReject)) ||
    (status === "approved"  && (canPublish || canSendToDraft)) ||
    (status === "published" && (canUnPublish || canDiscontinue));

  const showSkuField = canSetSku && status === "approved";

  function handleSkuSave() {
    const result = skuSchema.safeParse(skuInput.trim());
    if (!result.success) {
      setSkuError(result.error.issues[0].message);
      return;
    }
    setSkuError(null);
    setSku({ id, shopify_sku: result.data }, {
      onSuccess: () => {
        setSkuSaved(true);
        setTimeout(() => setSkuSaved(false), 2000);
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionHeading>Status</SectionHeading>
        <div className="flex items-start">
          {PIPELINE.map((step, i) => {
            const isCompleted = i < currentIndex;
            const isCurrent   = i === currentIndex;
            const isFuture    = i > currentIndex;
            return (
              <div key={step.status} className="flex items-start flex-1">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      isCompleted || isCurrent
                        ? "bg-neutral-900"
                        : "border-2 border-neutral-300 bg-white"
                    }`}
                  >
                    {isCompleted && <Check size={15} className="text-white" />}
                    {isCurrent   && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <span
                    className={`w-16 text-center text-[11px] leading-tight ${
                      isCurrent  ? "font-semibold text-neutral-900"
                      : isFuture ? "text-neutral-400"
                      :             "text-neutral-600"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div
                    className={`mx-1 mt-2.5 h-0.5 flex-1 w-10 shrink-0 ${
                      i < currentIndex ? "bg-neutral-900" : "bg-neutral-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {publishFailed && publishError && (
        <ErrorAlert message={publishError instanceof ApiError ? publishError.message : (publishError as Error).message} />
      )}

      {/* Rejection reason form — replaces the action row while open */}
      {status === "in_review" && canReject && confirmReject && (
        <div className="flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-semibold text-rose-700">Reason for rejection</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Describe why this design is being rejected…"
            rows={3}
            autoFocus
            className="w-full resize-none rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:border-rose-400 placeholder:text-neutral-400"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                reject(
                  { id, reason: rejectReason.trim() || undefined },
                  { onSuccess: () => { setConfirmReject(false); setRejectReason(""); } },
                )
              }
              disabled={rejecting}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
            >
              {rejecting && <Loader2 size={13} className="animate-spin" />}
              Confirm Rejection
            </button>
            <button
              onClick={() => { setConfirmReject(false); setRejectReason(""); }}
              disabled={rejecting}
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {hasActions && !confirmReject && (
        <div className="flex items-center gap-2">
          {status === "draft" && canSubmit && (
            <ActionButton label="Submit for Review" isPending={submitting} onClick={() => submit(id)} variant="primary" />
          )}
          {status === "in_review" && canApprove && (
            <ActionButton label="Approve" isPending={approving} onClick={() => approve(id)} variant="primary" />
          )}
          {status === "in_review" && canReject && (
            <ActionButton label="Reject" isPending={false} onClick={() => setConfirmReject(true)} variant="danger" />
          )}
          {status === "approved" && (canPublish || canSendToDraft) && (
            confirmSendToDraft ? (
              <ConfirmationPanel
                message="Moving this bracelet back to draft will remove its approval and require a new review cycle. Do you want to continue?"
                isPending={sendingToDraft}
                onConfirm={() => sendToDraft(id, { onSuccess: () => setConfirmSendToDraft(false) })}
                onCancel={() => setConfirmSendToDraft(false)}
              />
            ) : (
              <>
                {canPublish && (
                  <ActionButton label="Publish" isPending={publishing} onClick={() => publish(id)} variant="primary" />
                )}
                {canSendToDraft && (
                  <ActionButton label="Edit bracelet" isPending={false} onClick={() => setConfirmSendToDraft(true)} variant="secondary" />
                )}
              </>
            )
          )}
          {status === "published" && canUnPublish && !confirmDiscontinue && (
            confirmUnpublish ? (
              <ConfirmationPanel
                message="Unpublishing this bracelet will remove it from the published catalog and require a new review cycle. Do you want to continue?"
                isPending={unpublishing}
                onConfirm={() => unpublish(id, { onSuccess: () => setConfirmUnpublish(false) })}
                onCancel={() => setConfirmUnpublish(false)}
              />
            ) : (
              <ActionButton label="Unpublish bracelet" isPending={false} onClick={() => setConfirmUnpublish(true)} variant="secondary" />
            )
          )}
          {status === "published" && canDiscontinue && !confirmUnpublish && (
            confirmDiscontinue ? (
              <ConfirmationPanel
                message="Discontinuing this bracelet is permanent and cannot be undone. The bracelet will be moved to the Discontinued (vintage) tab. Do you want to continue?"
                isPending={discontinuing}
                onConfirm={() => discontinue(id, { onSuccess: () => setConfirmDiscontinue(false) })}
                onCancel={() => setConfirmDiscontinue(false)}
              />
            ) : (
              <ActionButton label="Discontinue" isPending={false} onClick={() => setConfirmDiscontinue(true)} variant="danger" />
            )
          )}
        </div>
      )}

      {showSkuField && (
        <div className="flex flex-col gap-1.5">
          <SectionHeading>
            Shopify SKU
          </SectionHeading>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={skuInput}
              onChange={(e) => { setSkuInput(e.target.value); setSkuError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSkuSave(); }}
              placeholder="e.g. BB-SUMMER-001"
              className={`flex-1 rounded-lg max-w-[250px] border px-3 py-1.5 text-sm text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 ${
                skuError ? "border-red-400 focus:border-red-500" : "border-neutral-200 focus:border-neutral-500"
              }`}
            />
            <button
              onClick={handleSkuSave}
              disabled={settingSku}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              {skuSaved ? "Saved!" : settingSku ? "Saving…" : "Save"}
            </button>
          </div>
          {skuError && (
            <p className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle size={12} className="shrink-0" />
              {skuError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}