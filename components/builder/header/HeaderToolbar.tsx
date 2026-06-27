"use client";

/**
 * HeaderToolbar.tsx
 *
 * Left:   Undo / Redo (always available) + workflow actions (Submit / Approve / Reject / Publish / Reactivate)
 * Centre: 3D / Line view toggle  (absolutely centred)
 * Right:  Edit + Comments buttons
 */

import { useState } from "react";
import { AlertTriangle, Loader2, List, Pencil, Undo2, Redo2, X, Eye } from "lucide-react";

import { useStore } from "@/lib/store";

import { useDesign } from "@/hooks/useDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { useSubmitDesign, useApproveDesign, useRejectDesign, usePublishDesign, useUndiscontinueDesign } from "@/hooks/useWorkflow";


import { Button } from "@/components/ui/Button";
import { PusherStatusBadge } from "@/components/builder/canvas/PusherStatusBadge";
import { Tooltip } from "@/components/ui/Tooltip";

interface HeaderToolbarProps {
  commentsOpen?: boolean;
  onCommentsClick?: () => void;
  /** Called when the user tries to publish without a Shopify SKU set. */
  onPublishBlocked?: () => void;
  /** When true the design canvas is read-only — hides the Edit button. */
  isReadOnly?: boolean;
  /** When true the user's session was taken over — hides all workflow action buttons. */
  isKicked?: boolean;
}

export function HeaderToolbar({ commentsOpen = false, onCommentsClick, onPublishBlocked, isReadOnly = false, isKicked = false }: HeaderToolbarProps) {
  const { isEditMode, toggleEditMode, viewMode, setViewMode, activeDesignId, undo, redo, undoStack, redoStack } = useStore((s) => ({
    isEditMode:      s.isEditMode,
    toggleEditMode:  s.toggleEditMode,
    viewMode:        s.viewMode,
    setViewMode:     s.setViewMode,
    activeDesignId:  s.activeDesignId,
    undo:            s.undo,
    redo:            s.redo,
    undoStack:       s.undoStack,
    redoStack:       s.redoStack,
  }));

  const { canEdit } = usePermissions();
  const { data: savedDesign } = useDesign(activeDesignId);

  // ── Workflow mutations ──────────────────────────────────────────────────────
  const { mutate: submit,        isPending: submitting,      canSubmit }        = useSubmitDesign();
  const { mutate: approve,       isPending: approving,       canApprove }       = useApproveDesign();
  const { mutate: reject,        isPending: rejecting,       canReject }        = useRejectDesign();
  const { mutate: publish,       isPending: publishing,      canPublish }       = usePublishDesign();
  const { mutate: undiscontinue, isPending: undiscontinuing, canUndiscontinue } = useUndiscontinueDesign();

  const status =
    savedDesign?.is_discontinued === 1 ? ("discontinued" as const) : savedDesign?.status;

  const showSubmit        = status === "draft"        && canSubmit        && !isKicked;
  const showApprove       = status === "in_review"    && canApprove       && !isKicked;
  const showReject        = status === "in_review"    && canReject        && !isKicked;
  const showPublish       = status === "approved"     && canPublish       && !isKicked;
  const showUndiscontinue = status === "discontinued" && canUndiscontinue && !isKicked;

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

  const iconBtnClass =
    "flex items-center justify-center p-3 xl:p-4 h-full text-color-base/70 transition-colors hover:bg-mint hover:text-color-base disabled:opacity-30 disabled:pointer-events-none";

  return (
    <div className="flex flex-col gap-2 pointer-events-none relative z-30">
      <div className="relative flex items-center pointer-events-auto bg-white shadow-sm pr-2 lg:pr-6">

        {/* ── Left — Undo/Redo + workflow actions ──────────────────────── */}
        <div className="flex flex-1 gap-3 divide-x-1 divide-default">
          {/* Undo / Redo — always available, independent of edit mode */}
          <div className="flex divide-x-1 divide-default border-r border-default">
            <Tooltip content={undoStack.length !== 0 && "Undo (⌘Z)"} placement="bottom-end">
              <button onClick={undo} disabled={undoStack.length === 0} aria-label="Undo" className={iconBtnClass}>
                <Undo2 size={20} />
              </button>
            </Tooltip>
            <Tooltip content={redoStack.length !== 0 && "Redo (⌘⇧Z)"} placement="bottom-end">
              <button onClick={redo} disabled={redoStack.length === 0} aria-label="Redo" className={iconBtnClass}>
                <Redo2 size={20} />
              </button>
            </Tooltip>
          </div>

          {savedDesign && (
            <div className="py-2.5 flex gap-2">
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
                  <div className="flex flex-col gap-1.5 rounded-[2px] border border-blush bg-blush/20 px-3 py-2">
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
            </div>
          )}
        </div>

        {/* ── Centre — 3D / Line toggle ────────────────────────────────── */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="flex rounded-[2px] border border-default bg-white min-w-[100px] xl:min-w-[140px]">
            {(["3D", "Line"] as const).map((mode) => (
              <div key={mode} className="flex-1">
                <Tooltip content={`${mode} View`} placement="bottom" className="w-full text-center">
                  <button
                    onClick={() => setViewMode(mode === "3D" ? "3D" : "line")}
                    title={`${mode} View`}
                    className={`w-full px-3 xl:px-5 py-[6.5px] text-[12.5px] font-semibold transition-all ${
                      (mode === "3D" ? "3D" : "line") === viewMode
                        ? "bg-navy text-white"
                        : "hover:bg-mint"
                    }`}
                  >
                    {mode}
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right — Edit + Comments ──────────────────────────────────── */}
        <div className="flex flex-1 items-center gap-2 justify-end pl-3 lg:pl-6 ml-3">
          <PusherStatusBadge />
          {canEdit && !isReadOnly && (
            <Tooltip content={isEditMode ? "Exit edit mode" : "Enter Edit Mode  (E)"} placement="bottom">
              <button
                onClick={toggleEditMode}
                className={`flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  isEditMode
                    ? "border-navy bg-shell"
                    : "border-navy bg-edit"
                }`}
                aria-label={isEditMode ? "Enter View Mode" : "Enter Edit Mode"}
              >
                {isEditMode ? (
                  <Eye size={15} />
                ): (
                  <Pencil size={14} />
                )}
                {isEditMode ? "View Mode" : "Edit Mode"}
              </button>
            </Tooltip>
          )}
          <Tooltip content={!commentsOpen ? "Open Comments" : "Close Comments"} placement="bottom-start">
            <button
              onClick={onCommentsClick}
              className={`flex items-center gap-1.5 rounded-[2px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                commentsOpen
                  ? "bg-navy text-white border-navy border"
                  : "border bg-white border-stone/40 text-color-base/80 hover:border-stone hover:bg-mint hover:text-color-base"
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
          </Tooltip>
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
      className="h-8 xl:h-9 px-3 xl:px-5 text-[10px] xl:text-[11px]"
    >
      {isPending && <Loader2 size={13} className="animate-spin" />}
      {label}
    </Button>
  );
}