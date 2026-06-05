"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Check } from "lucide-react";
import { z } from "zod";

import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmationPanel } from "@/components/ui/ConfirmationPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

import { ApiError } from "@/lib/api";
import { useSubmitDesign } from "@/hooks/useSubmitDesign";
import { useApproveDesign } from "@/hooks/useApproveDesign";
import { useRejectDesign } from "@/hooks/useRejectDesign";
import { usePublishDesign } from "@/hooks/usePublishDesign";
import { useUnPublishDesign } from "@/hooks/useUnPublishDesign";
import { useSendToDraft } from "@/hooks/useSendToDraft";
import { useSetDesignSku } from "@/hooks/useSetDesignSku";
import { useDiscontinueDesign } from "@/hooks/useDiscontinueDesign";

import type { Bracelet, BraceletStatus } from "@/types";

// ── Status metadata (exported — also used by BraceletDetailsDialog) ───────────

export const STATUS_META: Record<BraceletStatus, { label: string; cls: string }> = {
  draft:          { label: "In Progress",    cls: "bg-neutral-100 text-neutral-600" },
  in_review:      { label: "In Review",      cls: "bg-amber-100 text-amber-700" },
  approved:       { label: "Approved",       cls: "bg-blue-100 text-blue-700" },
  published:      { label: "Published",      cls: "bg-green-100 text-green-700" },
  design_concept: { label: "Design Concept", cls: "bg-violet-100 text-violet-700" },
  discontinued:   { label: "Discontinued",   cls: "bg-red-100 text-red-600" },
};

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
  const { mutate: submit,  isPending: submitting,  canSubmit }  = useSubmitDesign();
  const { mutate: approve, isPending: approving,   canApprove } = useApproveDesign();
  const { mutate: reject,  isPending: rejecting,   canReject }  = useRejectDesign();
  const { mutate: publish, isPending: publishing,  isError: publishFailed, error: publishError, canPublish } = usePublishDesign();
  const { mutate: unpublish,    isPending: unpublishing,    canUnPublish }   = useUnPublishDesign();
  const { mutate: sendToDraft,  isPending: sendingToDraft,  canSendToDraft } = useSendToDraft();
  const { mutate: setSku,       isPending: settingSku,      canSetSku }      = useSetDesignSku();
  const { mutate: discontinue,  isPending: discontinuing,   canDiscontinue } = useDiscontinueDesign();

  const [skuInput,           setSkuInput]           = useState("");
  const [skuError,           setSkuError]           = useState<string | null>(null);
  const [skuSaved,           setSkuSaved]           = useState(false);
  const [confirmSendToDraft, setConfirmSendToDraft] = useState(false);
  const [confirmUnpublish,   setConfirmUnpublish]   = useState(false);
  const [confirmDiscontinue, setConfirmDiscontinue] = useState(false);

  useEffect(() => {
    setSkuInput(savedDesign?.shopify_sku ?? "");
  }, [savedDesign?.shopify_sku]);

  useEffect(() => {
    setConfirmSendToDraft(false);
    setConfirmUnpublish(false);
    setConfirmDiscontinue(false);
  }, [savedDesign?.id]);

  if (!savedDesign) return null;

  const { status, id } = savedDesign;

  // Discontinued — show badge, no actions available.
  if (savedDesign.is_discontinued === 1) {
    return (
      <div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-800 font-bold">
            This design has been discontinued.
          </span>
        </div>
      </div>
    );
  }

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
    (status === "in_review" && (canApprove || canReject || canSendToDraft)) ||
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
              <div key={step.status} className="flex items-start">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      isCompleted || isCurrent
                        ? "bg-neutral-900"
                        : "border-2 border-neutral-300 bg-white"
                    }`}
                  >
                    {isCompleted && <Check size={10} className="text-white" />}
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
                    className={`mx-1 mt-2.5 h-0.5 w-10 shrink-0 ${
                      i < currentIndex ? "bg-neutral-900" : "bg-neutral-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showSkuField && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Shopify SKU
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={skuInput}
              onChange={(e) => { setSkuInput(e.target.value); setSkuError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSkuSave(); }}
              placeholder="e.g. BB-SUMMER-001"
              className={`flex-1 rounded-lg border px-3 py-1.5 text-sm text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 ${
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

      {publishFailed && publishError && (
        <ErrorAlert message={publishError instanceof ApiError ? publishError.message : (publishError as Error).message} />
      )}

      {hasActions && (
        <div className="flex items-center gap-2">
          {status === "draft" && canSubmit && (
            <ActionButton label="Submit for Review" isPending={submitting} onClick={() => submit(id)} variant="primary" />
          )}
          {status === "in_review" && canApprove && (
            <ActionButton label="Approve" isPending={approving} onClick={() => approve(id)} variant="primary" />
          )}
          {status === "in_review" && canReject && (
            <ActionButton label="Reject" isPending={rejecting} onClick={() => reject(id)} variant="danger" />
          )}
          {status === "in_review" && canSendToDraft && (
            confirmSendToDraft ? (
              <ConfirmationPanel
                message="Recalling this bracelet will remove it from review and require resubmission. Do you want to continue?"
                isPending={sendingToDraft}
                onConfirm={() => sendToDraft(id, { onSuccess: () => setConfirmSendToDraft(false) })}
                onCancel={() => setConfirmSendToDraft(false)}
              />
            ) : (
              <ActionButton
                label="Recall for editing"
                isPending={false}
                onClick={() => setConfirmSendToDraft(true)}
                variant="secondary"
              />
            )
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
    </div>
  );
}