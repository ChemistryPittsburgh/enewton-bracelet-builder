"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { ConfirmationPanel } from "@/components/ui/ConfirmationPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

import { ApiError } from "@/lib/api";
import { STATUS_META } from "@/lib/category-colors";
import { useSubmitDesign }       from "@/hooks/useSubmitDesign";
import { useApproveDesign }      from "@/hooks/useApproveDesign";
import { useRejectDesign }       from "@/hooks/useRejectDesign";
import { usePublishDesign }      from "@/hooks/usePublishDesign";
import { useUnPublishDesign }    from "@/hooks/useUnPublishDesign";
import { useSendToDraft }        from "@/hooks/useSendToDraft";
import { useSetDesignSku }       from "@/hooks/useSetDesignSku";
import { useDiscontinueDesign }  from "@/hooks/useDiscontinueDesign";
import { useUndiscontinueDesign } from "@/hooks/useUndiscontinueDesign";
import { useReopenDesign }       from "@/hooks/useReopenDesign";

import type { Bracelet, BraceletStatus } from "@/types";

export { STATUS_META } from "@/lib/category-colors";

const workflowSectionClasses = "flex flex-col gap-4 border-b border-default pb-5";
const actionBtnClasses = "min-w-[150px]";

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

  const [skuInput,           setSkuInput]           = useState("");
  const [skuError,           setSkuError]           = useState<string | null>(null);
  const [skuSaved,           setSkuSaved]           = useState(false);
  const [confirmSendToDraft, setConfirmSendToDraft] = useState(false);
  const [confirmUnpublish,   setConfirmUnpublish]   = useState(false);
  const [confirmDiscontinue, setConfirmDiscontinue] = useState(false);
  const [confirmReactivate,  setConfirmReactivate]  = useState(false);
  const [confirmReject,      setConfirmReject]      = useState(false);
  const [rejectReason,       setRejectReason]       = useState("");

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
      <div className={workflowSectionClasses}>
        <p className="text-xs font-semibold  ">
          This design has been discontinued.
        </p>
        {canUndiscontinue && (
          confirmReactivate ? (
            <ConfirmationPanel
              message="This will reactivate the bracelet and return it to Published status."
              isPending={undiscontinuing}
              confirmVariant="positive"
              onConfirm={() => undiscontinue(id, { onSuccess: () => setConfirmReactivate(false) })}
              onCancel={() => setConfirmReactivate(false)}
            />
          ) : (
            <Button size="sm" variant="positive" className="w-fit" onClick={() => setConfirmReactivate(true)}>
              Reactivate
            </Button>
          )
        )}
      </div>
    );
  }

  // ── Rejected ───────────────────────────────────────────────────────────────
  if (status === "rejected") {
    return (
      <div className={workflowSectionClasses}>
        <p className="text-xs font-semibold  ">
          This design was rejected and needs revision before resubmitting.
        </p>
        {canReopen && (
          <Button size="sm" variant="ghost" onClick={() => reopen(id)} disabled={reopening}>
            {reopening && <Loader2 size={12} className="animate-spin" />}
            Return to Draft
          </Button>
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
          <span className="text-xs text-color-base/70">
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
    <div className={workflowSectionClasses}>
      {/* Pipeline stepper */}
      <div>
        <SectionHeading>Status</SectionHeading>
        <div className="flex items-start">
          {PIPELINE.map((step, i) => {
            const isCompleted = i < currentIndex;
            const isCurrent   = i === currentIndex;
            const isFuture    = i > currentIndex;
            return (
              <div key={step.status}
                className={`flex items-start ${
                      step.label !== 'Published' && 'flex-1'
                    }`} >
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      isCompleted || isCurrent
                        ? "bg-navy"
                        : "border-2 border-default bg-white"
                    }`}
                  >
                    {isCompleted && <Check size={15} className="text-white" />}
                    {isCurrent   && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <span
                    className={`w-16 text-center text-[11px] leading-tight ${
                      isCurrent  ? "font-semibold text-navy"
                      : isFuture ? "text-color-base/70"
                      :             "text-color-base/70"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div
                    className={`mx-1 mt-2.5 h-0.5 flex-1 w-10 shrink-0 ${
                      i < currentIndex ? "bg-navy" : "bg-light-grey"
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

      {/* Rejection reason form */}
      {status === "in_review" && canReject && confirmReject && (
        <div className="flex flex-col gap-2 rounded-lg border border-blush bg-blush/30 p-3">
          <p className="text-xs font-semibold text-[#8b3040]">Reason for rejection</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Describe why this design is being rejected…"
            rows={3}
            autoFocus
            className="w-full resize-none rounded-md border border-blush bg-white px-3 py-2 text-sm   outline-none focus:border-[#8b3040]/50 placeholder:text-color-base/70"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="softDanger"
              disabled={rejecting}
              onClick={() =>
                reject(
                  { id, reason: rejectReason.trim() || undefined },
                  { onSuccess: () => { setConfirmReject(false); setRejectReason(""); } },
                )
              }
            >
              {rejecting && <Loader2 size={12} className="animate-spin" />}
              {rejecting ? "Rejecting…" : "Confirm Rejection"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setConfirmReject(false); setRejectReason(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {hasActions && !confirmReject && (
        <div className="flex items-center gap-3 flex-wrap">
          {status === "draft" && canSubmit && (
            <Button className={actionBtnClasses} size="sm" variant="secondary" onClick={() => submit(id)} disabled={submitting}>
              {submitting && <Loader2 size={12} className="animate-spin" />}
              Submit for Review
            </Button>
          )}
          {status === "in_review" && canApprove && (
            <Button className={actionBtnClasses} size="sm" variant="positive" onClick={() => approve(id)} disabled={approving}>
              {approving && <Loader2 size={12} className="animate-spin" />}
              Approve
            </Button>
          )}
          {status === "in_review" && canReject && (
            <Button className={actionBtnClasses} size="sm" variant="softDanger" onClick={() => setConfirmReject(true)}>
              Reject
            </Button>
          )}
          {status === "approved" && (canPublish || canSendToDraft) && (
            confirmSendToDraft ? (
              <ConfirmationPanel
                message="Moving this bracelet back to draft will remove its approval and require a new review cycle. Continue?"
                isPending={sendingToDraft}
                confirmVariant="ghost"
                onConfirm={() => sendToDraft(id, { onSuccess: () => setConfirmSendToDraft(false) })}
                onCancel={() => setConfirmSendToDraft(false)}
              />
            ) : (
              <>
                {canPublish && (
                  <Button className={actionBtnClasses} size="sm" variant="primary" onClick={() => publish(id)} disabled={publishing}>
                    {publishing && <Loader2 size={12} className="animate-spin" />}
                    Publish
                  </Button>
                )}
                {canSendToDraft && (
                  <Button className={actionBtnClasses} size="sm" variant="ghost" onClick={() => setConfirmSendToDraft(true)}>
                    Edit bracelet
                  </Button>
                )}
              </>
            )
          )}
          {status === "published" && canUnPublish && !confirmDiscontinue && (
            confirmUnpublish ? (
              <ConfirmationPanel
                message="Unpublishing will remove this bracelet from the catalog and require a new review cycle. Continue?"
                isPending={unpublishing}
                confirmVariant="softDanger"
                onConfirm={() => unpublish(id, { onSuccess: () => setConfirmUnpublish(false) })}
                onCancel={() => setConfirmUnpublish(false)}
              />
            ) : (
              <Button className={actionBtnClasses} size="sm" variant="ghost" onClick={() => setConfirmUnpublish(true)}>
                Unpublish
              </Button>
            )
          )}
          {status === "published" && canDiscontinue && !confirmUnpublish && (
            confirmDiscontinue ? (
              <ConfirmationPanel
                message="Discontinuing will remove this bracelet from inventory. This can only be reversed by an admin. Continue?"
                isPending={discontinuing}
                confirmVariant="softDanger"
                onConfirm={() => discontinue(id, { onSuccess: () => setConfirmDiscontinue(false) })}
                onCancel={() => setConfirmDiscontinue(false)}
              />
            ) : (
              <Button className={actionBtnClasses} size="sm" variant="softDanger" onClick={() => setConfirmDiscontinue(true)}>
                Discontinue
              </Button>
            )
          )}
        </div>
      )}

      {/* SKU input */}
      {showSkuField && (
        <div className="flex flex-col gap-1.5">
          <SectionHeading>Shopify SKU</SectionHeading>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={skuInput}
              onChange={(e) => { setSkuInput(e.target.value); setSkuError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSkuSave(); }}
              placeholder="e.g. BB-SUMMER-001"
              className={`flex-1 rounded-[3px] max-w-[250px] border px-3 py-1.5 text-sm outline-none transition-colors placeholder:text-color-base/70 ${
                skuError ? "border-error/50 focus:border-error" : "border-default focus:border-navy"
              }`}
            />
            <Button className={actionBtnClasses} size="sm" variant="primary" onClick={handleSkuSave} disabled={settingSku}>
              {settingSku && <Loader2 size={12} className="animate-spin" />}
              {skuSaved ? "Saved!" : "Save"}
            </Button>
          </div>
          {skuError && (
            <p className="flex items-center gap-1.5 text-xs text-error/80">
              <AlertCircle size={12} className="shrink-0" />
              {skuError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}