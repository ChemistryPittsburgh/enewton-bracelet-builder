"use client";

import { useRef, useState, useEffect } from "react";
import { Archive, CheckCircle, Eye, Lock, MoreHorizontal, Send, Trash2, XCircle } from "lucide-react";
import type { Bracelet } from "@/types";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useStore } from "@/lib/store";

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZone: "America/New_York",
  }).format(new Date(dateStr));
}

interface DesignCardProps {
  design: Bracelet;
  onClick?: () => void;
  onDeleteRequest: (design: Bracelet) => void;
  onDiscontinueRequest?: (design: Bracelet) => void;
  onSubmitForReview?: (design: Bracelet) => void;
  onApprove?: (design: Bracelet) => void;
  onRejectRequest?: (design: Bracelet) => void;
}

export function DesignCard({
  design,
  onClick,
  onDeleteRequest,
  onDiscontinueRequest,
  onSubmitForReview,
  onApprove,
  onRejectRequest,
}: DesignCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { canDeleteBracelet, isAdmin, canSubmit, canApprove: hasApprovePermission, canReject: hasRejectPermission } = usePermissions();
  const { data: currentUser } = useCurrentUser();
  const activeDesignId = useStore((s) => s.activeDesignId);
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error" | "empty">(
    design.preview_image_url ? "loading" : "empty",
  );

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const isDiscontinued = design.is_discontinued === 1;
  const effectiveStatus = design.status === "rejected" ? "draft" : design.status;

  const wasRejected = (() => {
    if (!design.rejected_at || design.rejected_at === "0000-00-00 00:00:00") return false;
    if (design.status === "rejected") return true;
    if (design.status === "draft" && design.updated_at > design.rejected_at) return false;
    return design.status === "draft";
  })();

  const lockedByOther =
    design.status !== "published" &&
    design.active_lock != null &&
    design.active_lock.user_id !== currentUser?.id;

  const isCurrentlyEditing =
    design.id === activeDesignId &&
    design.status !== "published";

  // ── Menu action visibility ────────────────────────────────────────────────
  const showSubmit      = effectiveStatus === "draft" && canSubmit && !isDiscontinued;
  const showApprove     = effectiveStatus === "in_review" && hasApprovePermission && !isDiscontinued;
  const showReject      = effectiveStatus === "in_review" && hasRejectPermission && !isDiscontinued;
  const showDiscontinue = isAdmin && design.status === "published" && !isDiscontinued && !!onDiscontinueRequest;
  const showDelete      = canDeleteBracelet;

  const hasWorkflowActions = showSubmit || showApprove || showReject;
  const hasAdminActions    = showDiscontinue || showDelete;

  const menuItemCls = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors";

  return (
    <div
      className={cn(
        "group flex flex-col rounded-lg border overflow-hidden cursor-pointer hover:shadow-sm transition-all",
        isDiscontinued ? "border-default opacity-50 grayscale pointer-events-auto" :
        wasRejected    ? "border-error/40 hover:border-error/60" :
                         "border-default hover:border-default",
      )}
      onClick={onClick}
    >
      <div className="relative aspect-square w-full bg-neutral-50">
        {/* Discontinued badge */}
        {isDiscontinued && (
          <div className="absolute left-2 top-2 z-10 rounded-full bg-error/30 px-2 py-0.5 text-[10px] font-semibold text-error">
            Discontinued
          </div>
        )}
        {/* Rejected badge — clears once the design is edited and re-saved */}
        {wasRejected && (
          <div className="absolute left-2 top-2 z-10 rounded-full bg-error/30 px-2 py-0.5 text-[10px] font-semibold text-error">
            Rejected
          </div>
        )}
        {/* Currently open by this user */}
        {isCurrentlyEditing && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full bg-navy px-2 py-0.5 text-[10px] font-semibold text-white">
            <Lock size={9} />
            Editing
          </div>
        )}
        {/* Locked by another user */}
        {lockedByOther && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            <Lock size={9} />
            {design.active_lock!.user_name}
          </div>
        )}
        {/* Pulse skeleton — visible while the image is loading */}
          {imgState === "loading" && (
            <div className="absolute inset-0 animate-pulse bg-light-grey" />
          )}

          {/* Actual image */}
          {design.preview_image_url && imgState !== "error" && (
            <img
              src={design.preview_image_url}
              alt={design.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imgState === "loaded" ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImgState("loaded")}
              onError={() => setImgState("error")}
            />
          )}

          {/* Fallback — no URL or load error */}
          {(!design.preview_image_url || imgState === "error") && (
            <div className="h-20 w-20 rounded-full border-2 border-dashed" />
          )}

          {/* ── Three-dot menu ── */}
          <div
            ref={menuRef}
            className="absolute right-2 top-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-color-base/70 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-neutral-900",
                menuOpen
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100",
              )}
              aria-label="More options"
            >
              <MoreHorizontal size={15} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 min-w-[180px] rounded-lg border border-default bg-white py-1 shadow-lg">
                {/* ── Open Design ── */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onClick?.();
                  }}
                  className={cn(menuItemCls, "text-navy hover:bg-navy/10")}
                >
                  <Eye size={14} />
                  Open design
                </button>

                {/* ── Workflow actions ── */}
                {hasWorkflowActions && (
                  <div className="my-1 border-t border-default" />
                )}
                {showSubmit && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onSubmitForReview?.(design);
                    }}
                    className={cn(menuItemCls, "text-navy hover:bg-navy/10")}
                  >
                    <Send size={14} />
                    Submit for review
                  </button>
                )}
                {showApprove && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onApprove?.(design);
                    }}
                    className={cn(menuItemCls, "text-green hover:bg-green/10")}
                  >
                    <CheckCircle size={14} />
                    Approve
                  </button>
                )}
                {showReject && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRejectRequest?.(design);
                    }}
                    className={cn(menuItemCls, "text-error hover:bg-error/10")}
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                )}

                {/* ── Admin actions ── */}
                {hasAdminActions && (
                  <div className="my-1 border-t border-default" />
                )}
                {showDiscontinue && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDiscontinueRequest!(design);
                    }}
                    className={cn(menuItemCls, "text-gold hover:bg-gold/10")}
                  >
                    <Archive size={14} />
                    Discontinue
                  </button>
                )}
                {showDelete && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteRequest(design);
                    }}
                    className={cn(menuItemCls, "text-error hover:bg-error/10")}
                  >
                    <Trash2 size={14} />
                    Delete bracelet
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      {/* Card footer */}
      <div className="px-3 py-2.5 flex flex-col gap-2">
        <p className="truncate text-sm font-medium  ">{design.name}</p>
        {design.updated_at && (
          <p className="truncate text-xs text-color-base/70"><span className="text-color-base/70">Last Updated: </span>{formatDate(design.updated_at)}</p>
        )}
      </div>
    </div>
  );
}