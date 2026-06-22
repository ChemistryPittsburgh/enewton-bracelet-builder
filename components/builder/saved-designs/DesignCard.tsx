"use client";

import { useRef, useState, useEffect } from "react";
import { Archive, CheckCircle, Eye, LayoutTemplate, Loader2, Lock, MoreHorizontal, Send, Trash2, X, XCircle, Radio, Ban } from "lucide-react";
import { z } from "zod";
import type { Bracelet } from "@/types";

import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Tooltip } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

import { usePermissions } from "@/hooks/usePermissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSaveDesignAsPattern } from "@/hooks/useSaveDesignAsPattern";

const patternNameSchema = z.string().min(1, "Name is required");

function SaveAsPatternDialog({
  design,
  onClose,
}: {
  design: Bracelet;
  onClose: () => void;
}) {
  const [name, setName] = useState(design.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const { mutateAsync: saveAsPattern, isPending, error } = useSaveDesignAsPattern();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isPending, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = patternNameSchema.safeParse(name.trim());
    if (!result.success) { setNameError(result.error.issues[0].message); return; }
    setNameError(null);
    await saveAsPattern({ design, name: result.data });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget && !isPending) onClose(); }}
    >
      <div className="w-[420px] rounded-2xl bg-white p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-semibold">Save as Pattern</h3>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-full p-1 text-color-base/70 hover:bg-default/50 transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-color-base/70 -mt-2">
          Creates a new pattern template from <span className="font-medium">"{design.name}"</span>.
        </p>

        {error && <ErrorAlert message="Failed to save pattern — please try again." />}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-color-base/70">Pattern name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(null); }}
              placeholder="Enter pattern name"
              autoFocus
              disabled={isPending}
              className="w-full rounded-[2px] border border-default px-3 py-2 text-sm outline-none focus:border-navy placeholder:text-color-base/40 disabled:opacity-50"
            />
            {nameError && <p className="text-xs text-error">{nameError}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="primary" size="sm" className="w-full" disabled={isPending}>
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Save Pattern
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [saveAsPatternOpen, setSaveAsPatternOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { canDeleteBracelet, isAdmin, canSubmit, canApprove: hasApprovePermission, canReject: hasRejectPermission, canManageComponents, canCreatePattern } = usePermissions();
  const { data: currentUser } = useCurrentUser();
  const activeDesignId = useStore((s) => s.activeDesignId);
  const thumbSrc = design.preview_image_url
    ? `${design.preview_image_url}?v=${new Date(design.updated_at).getTime()}`
    : null;
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error" | "empty">(
    thumbSrc ? "loading" : "empty",
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
  // Published non-discontinued: API blocks delete for everyone.
  // Approved / discontinued: admin only. Draft / in_review / rejected: admin only.
  const showDelete      = canDeleteBracelet && !(design.status === "published" && !isDiscontinued);

  const isLive = design.status === "published" && !isDiscontinued;

  const hasWorkflowActions = showSubmit || showApprove || showReject;
  const hasAdminActions    = showDiscontinue || showDelete;

  const menuItemClasses = "flex w-full items-center gap-2 px-3 py-3 text-left text-sm transition-colors";

  return (
    <div
      className={cn(
        "group flex flex-col rounded-[3px] border cursor-pointer hover:shadow-sm transition-all",
        isDiscontinued ? "border-default opacity-50 grayscale pointer-events-auto" :
        wasRejected    ? "border-error/40 hover:border-error/60" :
                         "border-default hover:border-navy focus:ring-navy",
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
          <div className="absolute left-2 top-2 z-10 rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
            Rejected
          </div>
        )}
        {/* Currently open by this user */}
        {isCurrentlyEditing && (
          <div className="absolute bottom-0 left-0 right-0 w-full z-10 flex items-center gap-1 rounded-[2px] bg-navy px-2 py-0.5 text-[10px] font-semibold text-white bg-orange">
            <Lock size={9} />
            Currently Editing
          </div>
        )}
        {/* Locked by another user */}
        {lockedByOther && (
          <div className="absolute bottom-0 left-0 right-0 w-full z-10 flex items-center gap-1 bg-navy px-2 py-0.5 text-[10px] font-semibold text-white">
            <Lock size={9} />
            {design.active_lock!.user_name}
          </div>
        )}
        {/* Pulse skeleton — visible while the image is loading */}
          {imgState === "loading" && (
            <div className="absolute inset-0 animate-pulse bg-light-grey" />
          )}

          {/* Actual image */}
          {thumbSrc && imgState !== "error" && (
            <img
              src={thumbSrc}
              alt={design.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imgState === "loaded" ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImgState("loaded")}
              onError={() => setImgState("error")}
            />
          )}

          {/* Fallback — no URL or load error */}
          {(!thumbSrc || imgState === "error") && (
            <div className="h-20 w-20 rounded-full border-2 border-dashed" />
          )}

          {/* ── Three-dot menu ── */}
          {!isDiscontinued && !lockedByOther && (
            <div
              ref={menuRef}
              className="absolute right-2 top-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Tooltip content="Bracelet Actions">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-color-base/70 shadow-sm backdrop-blur-sm transition-all hover:bg-mint hover:text-color-base focus:ring focus:ring-navy",
                    menuOpen
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100",
                  )}
                  aria-label="More options"
                >
                  <MoreHorizontal size={15} />
                </button>
              </Tooltip>

              {menuOpen && (
                <div className="absolute right-0 top-8 z-10 min-w-[180px] rounded-[3px] overflow-hidden border border-default bg-white shadow-lg">
                  {/* ── Open Design ── */}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onClick?.();
                    }}
                    className={cn(menuItemClasses, "text-navy hover:bg-mint")}
                  >
                    <Eye size={14} />
                    Open design
                  </button>

                  {/* ── Workflow actions ── */}
                  {hasWorkflowActions && (
                    <div className="border-t border-default" />
                  )}
                  {showSubmit && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onSubmitForReview?.(design);
                      }}
                      className={cn(menuItemClasses, "text-navy hover:bg-mint")}
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
                      className={cn(menuItemClasses, "text-green hover:bg-green/10")}
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
                      className={cn(menuItemClasses, "text-error hover:bg-error/10")}
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  )}

                  {/* ── Pattern actions ── */}
                  {canCreatePattern && (
                    <>
                      <div className="border-t border-default" />
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setSaveAsPatternOpen(true);
                        }}
                        className={cn(menuItemClasses, "text-navy hover:bg-mint")}
                      >
                        <LayoutTemplate size={14} />
                        Save as pattern
                      </button>
                    </>
                  )}

                  {/* ── Admin actions ── */}
                  {hasAdminActions && (
                    <div className="border-t border-default" />
                  )}
                  {showDiscontinue && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDiscontinueRequest!(design);
                      }}
                      className={cn(menuItemClasses, "text-gold hover:bg-gold/10")}
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
                      className={cn(menuItemClasses, "text-error hover:bg-error/10")}
                    >
                      <Trash2 size={14} />
                      Delete bracelet
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      {saveAsPatternOpen && (
        <SaveAsPatternDialog
          design={design}
          onClose={() => setSaveAsPatternOpen(false)}
        />
      )}

      {/* Card footer */}
      <div className="flex gap-2 justify-between px-3 py-3">
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium">{design.name}</p>
          </div>
          {design.updated_at && (
            <p className="truncate text-xs text-color-base/70"><span className="text-color-base/70">Last Updated: </span>{formatDate(design.updated_at)}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          { !isDiscontinued ? (
            <Tooltip content={isLive ? "Bracelet is live" : "Braclet is unpublished"}>
              <Radio size={20} 
                className={`${
                  isLive ? "text-green animate-pulse" : "text-color-base/30"
                }`} />
              </Tooltip>
          ) : (
            <Tooltip content="Bracelet is discontinued">
              <Ban size={20} className="text-error/40" />
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}