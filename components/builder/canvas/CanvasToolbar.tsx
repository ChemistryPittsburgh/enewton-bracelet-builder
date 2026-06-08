"use client";

/**
 * CanvasToolbar.tsx
 *
 * Left:   Workflow action buttons (Submit / Approve / Reject / Publish / Reactivate)
 * Centre: 3D / Line view toggle  (absolutely centred)
 * Right:  Edit + Comments buttons
 */

import { useState } from "react";
import { AlertTriangle, Loader2, List, Pencil, X } from "lucide-react";

import { useStore } from "@/lib/store";
import { useDesign } from "@/hooks/useDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { useSubmitDesign } from "@/hooks/useSubmitDesign";
import { useApproveDesign } from "@/hooks/useApproveDesign";
import { useRejectDesign } from "@/hooks/useRejectDesign";
import { usePublishDesign } from "@/hooks/usePublishDesign";
import { useUndiscontinueDesign } from "@/hooks/useUndiscontinueDesign";
import type { BraceletStatus } from "@/types";

import { Button } from "@/components/ui/Button";

interface CanvasToolbarProps {
  commentsOpen?: boolean;
  onCommentsClick?: () => void;
  /** Called when the user tries to publish without a Shopify SKU set. */
  onPublishBlocked?: () => void;
}

export function CanvasToolbar({ commentsOpen = false, onCommentsClick, onPublishBlocked }: CanvasToolbarProps) {
  const { isEditMode, toggleEditMode, viewMode, setViewMode, activeDesignId } = useStore((s) => ({
    isEditMode:      s.isEditMode,
    toggleEditMode:  s.toggleEditMode,
    viewMode:        s.viewMode,
    setViewMode:     s.setViewMode,
    activeDesignId:  s.activeDesignId,
  }));

  const { canEdit } = usePermissions();
  const { data: savedDesign } = useDesign(activeDesignId);

  const isLocked = savedDesign?.status === "approved" || savedDesign?.status === "published";

  // ── Workflow mutations ──────────────────────────────────────────────────────
  const { mutate: submit,        isPending: submitting,      canSubmit }        = useSubmitDesign();
  const { mutate: approve,       isPending: approving,       canApprove }       = useApproveDesign();
  const { mutate: reject,        isPending: rejecting,       canReject }        = useRejectDesign();
  const { mutate: publish,       isPending: publishing,      canPublish }       = usePublishDesign();
  const { mutate: undiscontinue, isPending: undiscontinuing, canUndiscontinue } = useUndiscontinueDesign();

  const status =
    savedDesign?.is_discontinued === 1 ? ("discontinued" as const) : savedDesign?.status;

  const showSubmit        = status === "draft"        && canSubmit;
  const showApprove       = status === "in_review"    && canApprove;
  const showReject        = status === "in_review"    && canReject;
  const showPublish       = status === "approved"     && canPublish;
  const showUndiscontinue = status === "discontinued" && canUndiscontinue;

  // ── Publish SKU gate ───────────────────────────────────────────────────────
  // Shows an inline warning for a few seconds when the user tries to publish
  // without a Shopify SKU, then auto-dismisses so they can try again.
  const [publishBlocked, setPublishBlocked] = useState(false);

  function handlePublishClick() {
    if (!savedDesign) return;
    if (!savedDesign.shopify_sku?.trim()) {
      setPublishBlocked(true);
      onPublishBlocked?.();
      setTimeout(() => setPublishBlocked(false), 5000);
      return;
    }
    publish(savedDesign.id);
  }

  // ── Reactivate confirmation ────────────────────────────────────────────────
  const [confirmingReactivate, setConfirmingReactivate] = useState(false);

  // ── Reject with reason ────────────────────────────────────────────────────
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [rejectReason,     setRejectReason]     = useState("");

  function handleConfirmReactivate() {
    if (!savedDesign) return;
    undiscontinue(savedDesign.id, {
      onSuccess: () => setConfirmingReactivate(false),
    });
  }

  return (
    <div className="flex flex-col gap-2 pointer-events-none relative z-20">
      <div className="relative flex items-center pointer-events-auto bg-white shadow-sm px-3 lg:px-6 py-3.5">

        {/* ── Left — workflow actions ──────────────────────────────────── */}
        <div className="flex flex-1 items-center gap-1.5">
          {savedDesign && (
            <>
              {showSubmit && (
                <WorkflowButton
                  label="Submit for Review"
                  isPending={submitting}
                  onClick={() => submit(savedDesign.id)}
                  variant="secondary"
                />
              )}
              {showApprove && !confirmingReject && (
                <WorkflowButton
                  label="Approve"
                  isPending={approving}
                  onClick={() => approve(savedDesign.id)}
                  variant="positive"
                />
              )}
              {showReject && (
                confirmingReject ? (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-blush bg-blush/20 px-3 py-2">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection (optional)…"
                      rows={2}
                      autoFocus
                      className="w-56 resize-none rounded border border-blush bg-white px-2 py-1 text-xs   outline-none focus:border-[#8b3040]/50 placeholder:text-color-base/70"
                    />
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="xs"
                        variant="softDanger"
                        disabled={rejecting}
                        onClick={() =>
                          reject(
                            { id: savedDesign.id, reason: rejectReason.trim() || undefined },
                            { onSuccess: () => { setConfirmingReject(false); setRejectReason(""); } },
                          )
                        }
                      >
                        {rejecting && <Loader2 size={11} className="animate-spin" />}
                        Confirm
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={rejecting}
                        onClick={() => { setConfirmingReject(false); setRejectReason(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <WorkflowButton
                    label="Reject"
                    isPending={false}
                    onClick={() => setConfirmingReject(true)}
                    variant="softDanger"
                  />
                )
              )}

              {/* Publish — gated on Shopify SKU being set */}
              {showPublish && (
                publishBlocked ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
                    <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                    <span className="text-xs font-medium text-amber-700">
                      A Shopify SKU is required to publish.
                    </span>
                  </div>
                ) : (
                  <WorkflowButton
                    label="Publish"
                    isPending={publishing}
                    onClick={handlePublishClick}
                    variant="primary"
                  />
                )
              )}

              {/* Reactivate — two-step confirmation */}
              {showUndiscontinue && (
                confirmingReactivate ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
                    <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                    <span className="text-xs font-medium text-amber-700">
                      Reactivating this bracelet will move it to Published.
                    </span>
                    <Button
                      size="xs"
                      variant="positive"
                      disabled={undiscontinuing}
                      onClick={handleConfirmReactivate}
                    >
                      {undiscontinuing && <Loader2 size={11} className="animate-spin" />}
                      Confirm
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={undiscontinuing}
                      onClick={() => setConfirmingReactivate(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <WorkflowButton
                    label="Reactivate"
                    isPending={false}
                    onClick={() => setConfirmingReactivate(true)}
                    variant="positive"
                  />
                )
              )}
            </>
          )}
        </div>

        {/* ── Centre — 3D / Line toggle ────────────────────────────────── */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="flex rounded-xl border border-default bg-white min-w-[140px] overflow-hidden">
            {(["3D", "Line"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode === "3D" ? "3D" : "line")}
                title={`${mode} View`}
                className={`px-5 py-2 flex-1 text-sm font-semibold transition-all ${
                  (mode === "3D" ? "3D" : "line") === viewMode
                    ? "bg-navy text-white"
                    : "hover:bg-mint"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right — Edit + Comments ──────────────────────────────────── */}
        <div className="flex flex-1 items-center gap-2 justify-end border-l border-default pl-3 lg:pl-6 ml-3">
          {canEdit && !isLocked && (
            <button
              onClick={toggleEditMode}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                isEditMode
                  ? "border-navy/30 bg-shell text-navy"
                  : "border-default bg-white   hover:bg-mint"
              }`}
              aria-label={isEditMode ? "Exit edit mode" : "Enter Edit Mode"}
            >
              {isEditMode ? (
                <X size={14} />
              ): (
                <Pencil size={14} />
              )}
              Edit
            </button>
          )}
          <button
            onClick={onCommentsClick}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              commentsOpen
                ? "bg-stone text-white"
                : "bg-grey text-black hover:bg-stone hover:text-white"
            }`}
            aria-label="Open comments"
          >
            {commentsOpen ? (
                <X size={14} />
              ) : (
                <List size={14} />
              )}
            Comments
          </button>
        </div>

      </div>
    </div>
  );
}

function WorkflowButton({
  label,
  isPending,
  onClick,
  variant,
}: {
  label: string;
  isPending: boolean;
  onClick: () => void;
  variant: "primary" | "secondary" | "positive" | "softDanger" | "danger" | "ghost";
}) {
  return (
    <Button
      onClick={onClick}
      disabled={isPending}
      variant={variant}
    >
      {isPending && <Loader2 size={13} className="animate-spin" />}
      {label}
    </Button>
  );
}