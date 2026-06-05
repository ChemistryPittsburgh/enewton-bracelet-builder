"use client";

/**
 * CanvasToolbar.tsx
 *
 * Toolbar that floats at the top of the 3D canvas.
 *
 * Left:   Workflow action buttons (Submit / Approve / Reject / Publish / Reactivate)
 * Centre: 3D / Line view toggle  (absolutely centred — not affected by side widths)
 * Right:  Edit + Comments buttons
 */

import { useState } from "react";
import { AlertTriangle, Loader2, List, Pencil } from "lucide-react";

import { useStore } from "@/lib/store";
import { useDesign } from "@/hooks/useDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { useSubmitDesign } from "@/hooks/useSubmitDesign";
import { useApproveDesign } from "@/hooks/useApproveDesign";
import { useRejectDesign } from "@/hooks/useRejectDesign";
import { usePublishDesign } from "@/hooks/usePublishDesign";
import { useUndiscontinueDesign } from "@/hooks/useUndiscontinueDesign";
import type { BraceletStatus } from "@/types";

interface CanvasToolbarProps {
  commentsOpen?: boolean;
  onCommentsClick?: () => void;
}

export function CanvasToolbar({ commentsOpen = false, onCommentsClick }: CanvasToolbarProps) {
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

  // ── Inline reactivation confirmation ───────────────────────────────────────
  const [confirmingReactivate, setConfirmingReactivate] = useState(false);

  function handleConfirmReactivate() {
    if (!savedDesign) return;
    undiscontinue(savedDesign.id, {
      onSuccess: () => setConfirmingReactivate(false),
    });
  }

  return (
    <div className="flex flex-col gap-2 pointer-events-none relative z-20">

      {/* Main toolbar row */}
      <div className="relative flex items-center pointer-events-auto bg-white shadow-sm px-3 lg:px-6 py-2">

        {/* ── Left — workflow actions ──────────────────────────────────── */}
        <div className="flex flex-1 items-center gap-1.5">
          {savedDesign && (
            <>
              {showSubmit && (
                <WorkflowButton
                  label="Submit for Review"
                  isPending={submitting}
                  onClick={() => submit(savedDesign.id)}
                  variant="primary"
                />
              )}
              {showApprove && (
                <WorkflowButton
                  label="Approve"
                  isPending={approving}
                  onClick={() => approve(savedDesign.id)}
                  variant="primary"
                />
              )}
              {showReject && (
                <WorkflowButton
                  label="Reject"
                  isPending={rejecting}
                  onClick={() => reject(savedDesign.id)}
                  variant="danger"
                />
              )}
              {showPublish && (
                <WorkflowButton
                  label="Publish"
                  isPending={publishing}
                  onClick={() => publish(savedDesign.id)}
                  variant="primary"
                />
              )}

              {/* Reactivate — shows inline confirmation before mutating */}
              {showUndiscontinue && (
                confirmingReactivate ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
                    <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                    <span className="text-xs font-medium text-amber-700">
                      This will reactivate the bracelet.
                    </span>
                    <button
                      onClick={handleConfirmReactivate}
                      disabled={undiscontinuing}
                      className="flex items-center gap-1 rounded-md bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
                    >
                      {undiscontinuing && <Loader2 size={11} className="animate-spin" />}
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmingReactivate(false)}
                      disabled={undiscontinuing}
                      className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <WorkflowButton
                    label="Reactivate"
                    isPending={false}
                    onClick={() => setConfirmingReactivate(true)}
                    variant="primary"
                  />
                )
              )}
            </>
          )}
        </div>

        {/* ── Centre — 3D / Line toggle (truly centred, independent of sides) ── */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="flex rounded-xl border border-neutral-200 bg-white min-w-[140px] overflow-hidden">
            {(["3D", "Line"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode === "3D" ? "3D" : "line")}
                title={`${mode} View`}
                className={`px-5 py-2 flex-1 text-sm font-semibold transition-all ${
                  (mode === "3D" ? "3D" : "line") === viewMode
                    ? "bg-neutral-600 text-white"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right — Edit + Comments ──────────────────────────────────── */}
        <div className="flex flex-1 items-center gap-2 justify-end border-l border-neutral-200 pl-3 lg:pl-6 ml-3">
          {canEdit && !isLocked && (
            <button
              onClick={toggleEditMode}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                isEditMode
                  ? "border-blue-300 bg-blue-50 text-blue-600"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
              aria-label={isEditMode ? "Exit edit mode" : "Edit bead order"}
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
          <button
            onClick={onCommentsClick}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              commentsOpen
                ? "bg-neutral-700 text-white"
                : "bg-neutral-500 text-white hover:bg-neutral-600"
            }`}
            aria-label="Open comments"
          >
            <List size={14} />
            Comments
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Shared button for workflow actions ────────────────────────────────────────

function WorkflowButton({
  label,
  isPending,
  onClick,
  variant,
}: {
  label: string;
  isPending: boolean;
  onClick: () => void;
  variant: "primary" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
        variant === "primary"
          ? "bg-neutral-800 text-white hover:bg-neutral-700"
          : "border border-red-300 bg-white text-red-600 hover:bg-red-50"
      }`}
    >
      {isPending && <Loader2 size={13} className="animate-spin" />}
      {label}
    </button>
  );
}