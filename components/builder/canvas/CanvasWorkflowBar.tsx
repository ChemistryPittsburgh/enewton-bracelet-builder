"use client";

import { Loader2 } from "lucide-react";

import { useStore } from "@/lib/store";
import { useDesign } from "@/hooks/useDesign";
import { useSubmitDesign } from "@/hooks/useSubmitDesign";
import { useApproveDesign } from "@/hooks/useApproveDesign";
import { useRejectDesign } from "@/hooks/useRejectDesign";
import { usePublishDesign } from "@/hooks/usePublishDesign";
import type { BraceletStatus } from "@/types";

const STATUS_LABEL: Record<BraceletStatus, string> = {
  draft:          "In Progress",
  in_review:      "In Review",
  approved:       "Approved",
  published:      "Published",
  design_concept: "Design Concept",
  discontinued:   "Discontinued",
};

const STATUS_CLS: Record<BraceletStatus, string> = {
  draft:          "bg-neutral-200/70 text-neutral-600",
  in_review:      "bg-amber-100/80  text-amber-700",
  approved:       "bg-blue-100/80   text-blue-700",
  published:      "bg-green-100/80  text-green-700",
  design_concept: "bg-violet-100/80 text-violet-700",
  discontinued:   "bg-red-100/80    text-red-600",
};

/**
 * Compact status + workflow action strip rendered on the canvas overlay,
 * below the description and "view bracelet details" link.
 * Only visible when a saved design is loaded (activeDesignId is set).
 */
export function CanvasWorkflowBar() {
  const activeDesignId = useStore((s) => s.activeDesignId);
  const { data: savedDesign } = useDesign(activeDesignId);

  const { mutate: submit,  isPending: submitting,  canSubmit }  = useSubmitDesign();
  const { mutate: approve, isPending: approving,   canApprove } = useApproveDesign();
  const { mutate: reject,  isPending: rejecting,   canReject }  = useRejectDesign();
  const { mutate: publish, isPending: publishing,  canPublish } = usePublishDesign();

  if (!savedDesign) return null;

  const { status: rawStatus, id } = savedDesign;
  const status = savedDesign.is_discontinued === 1 ? "discontinued" as BraceletStatus : rawStatus;

  const showSubmit  = status === "draft"     && canSubmit;
  const showApprove = status === "in_review" && canApprove;
  const showReject  = status === "in_review" && canReject;
  const showPublish = status === "approved"  && canPublish;
  const hasActions  = showSubmit || showApprove || showReject || showPublish;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
      {/* Status badge */}
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[status]}`}
      >
        {STATUS_LABEL[status]}
      </span>

      {/* Workflow action buttons */}
      {hasActions && (
        <span className="flex items-center gap-1.5">
          {showSubmit && (
            <WorkflowButton
              label="Submit for Review"
              isPending={submitting}
              onClick={() => submit(id)}
              variant="primary"
            />
          )}
          {showApprove && (
            <WorkflowButton
              label="Approve"
              isPending={approving}
              onClick={() => approve(id)}
              variant="primary"
            />
          )}
          {showReject && (
            <WorkflowButton
              label="Reject"
              isPending={rejecting}
              onClick={() => reject(id)}
              variant="danger"
            />
          )}
          {showPublish && (
            <WorkflowButton
              label="Publish"
              isPending={publishing}
              onClick={() => publish(id)}
              variant="primary"
            />
          )}
        </span>
      )}
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
  variant: "primary" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className={`flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
        variant === "primary"
          ? "bg-neutral-800/85 text-white hover:bg-neutral-700"
          : "border border-red-300 bg-white/70 text-red-600 hover:bg-red-50"
      }`}
    >
      {isPending && <Loader2 size={10} className="animate-spin" />}
      {label}
    </button>
  );
}