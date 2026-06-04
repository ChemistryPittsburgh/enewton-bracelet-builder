"use client";

import { useMemo, useState, useEffect } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { z } from "zod";

import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmationPanel } from "@/components/ui/ConfirmationPanel";
import { InfoRow } from "@/components/ui/InfoRow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { TagPicker } from "@/components/builder/saved-designs/TagPicker";

import { useStore } from "@/lib/store";
import { usePermissions } from "@/hooks/usePermissions";
import { ApiError } from "@/lib/api";
import { useDesign } from "@/hooks/useDesign";
import { useSubmitDesign } from "@/hooks/useSubmitDesign";
import { useApproveDesign } from "@/hooks/useApproveDesign";
import { useRejectDesign } from "@/hooks/useRejectDesign";
import { usePublishDesign } from "@/hooks/usePublishDesign";
import { useUnPublishDesign } from "@/hooks/useUnPublishDesign";
import { useSendToDraft } from "@/hooks/useSendToDraft";
import { useSetDesignSku } from "@/hooks/useSetDesignSku";
import { useApplyTag } from "@/hooks/useApplyTag";
import { useRemoveTag } from "@/hooks/useRemoveTag";
import { BRACELET_SIZE_RADIUS, BRACELET_MATERIALS, BRACELET_SIZES } from "@/lib/constants";
import { braceletArc, usedArc } from "@/lib/bead-layout";
import { cn } from "@/lib/utils";

import type { Bracelet, BraceletStatus, Tag } from "@/types";

// ── Status metadata ───────────────────────────────────────────────────────────

const STATUS_META: Record<BraceletStatus, { label: string; cls: string }> = {
  draft:          { label: "In Progress",    cls: "bg-neutral-100 text-neutral-600" },
  in_review:      { label: "In Review",      cls: "bg-amber-100 text-amber-700" },
  approved:       { label: "Approved",       cls: "bg-blue-100 text-blue-700" },
  published:      { label: "Published",      cls: "bg-green-100 text-green-700" },
  design_concept: { label: "Design Concept", cls: "bg-violet-100 text-violet-700" },
  discontinued:   { label: "Discontinued",   cls: "bg-red-100 text-red-600" },
};

// ── Workflow pipeline definition ──────────────────────────────────────────────

const PIPELINE: { status: BraceletStatus; label: string }[] = [
  { status: "draft",     label: "Draft"     },
  { status: "in_review", label: "In Review" },
  { status: "approved",  label: "Approved"  },
  { status: "published", label: "Published" },
];

const PIPELINE_SET = new Set(PIPELINE.map((s) => s.status));

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso)).toLowerCase();
}

// ── SKU validation schema ─────────────────────────────────────────────────────

const skuSchema = z
  .string()
  .min(1, "SKU is required")
  .max(100, "Must be 100 characters or fewer")
  .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, hyphens, and underscores");

// ── Workflow section ──────────────────────────────────────────────────────────

function WorkflowSection({ savedDesign }: { savedDesign: Bracelet | undefined }) {
  const { mutate: submit,  isPending: submitting,  canSubmit }  = useSubmitDesign();
  const { mutate: approve, isPending: approving,   canApprove } = useApproveDesign();
  const { mutate: reject,  isPending: rejecting,   canReject }  = useRejectDesign();
  const { mutate: publish, isPending: publishing,  isError: publishFailed, error: publishError, canPublish } = usePublishDesign();
  const { mutate: unpublish,    isPending: unpublishing,    canUnPublish }   = useUnPublishDesign();
  const { mutate: sendToDraft,  isPending: sendingToDraft,  canSendToDraft } = useSendToDraft();
  const { mutate: setSku,       isPending: settingSku,      canSetSku }      = useSetDesignSku();

  const [skuInput,           setSkuInput]           = useState("");
  const [skuError,           setSkuError]           = useState<string | null>(null);
  const [skuSaved,           setSkuSaved]           = useState(false);
  const [confirmSendToDraft, setConfirmSendToDraft] = useState(false);
  const [confirmUnpublish,   setConfirmUnpublish]   = useState(false);

  // Sync input with saved value when design loads
  useEffect(() => {
    setSkuInput(savedDesign?.shopify_sku ?? "");
  }, [savedDesign?.shopify_sku]);

  // Reset amber confirmation panels when the active design changes
  useEffect(() => {
    setConfirmSendToDraft(false);
    setConfirmUnpublish(false);
  }, [savedDesign?.id]);

  if (!savedDesign) return null;

  const { status, id } = savedDesign;

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
    (status === "published" && canUnPublish);

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

        {/* Pipeline stepper */}
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

      {/* SKU field — shown for approved designs to publishers/admins */}
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

      {/* Publish error */}
      {publishFailed && publishError && (
        <ErrorAlert message={publishError instanceof ApiError ? publishError.message : (publishError as Error).message} />
      )}

      {/* Action buttons */}
      {hasActions && (
        <div className="flex items-center gap-2">
          {status === "draft" && canSubmit && (
            <ActionButton
              label="Submit for Review"
              isPending={submitting}
              onClick={() => submit(id)}
              variant="primary"
            />
          )}
          {status === "in_review" && canApprove && (
            <ActionButton
              label="Approve"
              isPending={approving}
              onClick={() => approve(id)}
              variant="primary"
            />
          )}
          {status === "in_review" && canReject && (
            <ActionButton
              label="Reject"
              isPending={rejecting}
              onClick={() => reject(id)}
              variant="danger"
            />
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
                  <ActionButton
                    label="Publish"
                    isPending={publishing}
                    onClick={() => publish(id)}
                    variant="primary"
                  />
                )}
                {canSendToDraft && (
                  <ActionButton
                    label="Edit bracelet"
                    isPending={false}
                    onClick={() => setConfirmSendToDraft(true)}
                    variant="secondary"
                  />
                )}
              </>
            )
          )}
          {status === "published" && canUnPublish && (
            confirmUnpublish ? (
              <ConfirmationPanel
                message="Unpublishing this bracelet will remove it from the published catalog and require a new review cycle. Do you want to continue?"
                isPending={unpublishing}
                onConfirm={() => unpublish(id, { onSuccess: () => setConfirmUnpublish(false) })}
                onCancel={() => setConfirmUnpublish(false)}
              />
            ) : (
              <ActionButton
                label="Unpublish bracelet"
                isPending={false}
                onClick={() => setConfirmUnpublish(true)}
                variant="secondary"
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Tags section ──────────────────────────────────────────────────────────────

function TagsSection({ design }: { design: Bracelet }) {
  const { canManageComponents } = usePermissions();
  const { mutate: applyTag }    = useApplyTag();
  const { mutate: removeTag }   = useRemoveTag();

  // Optimistic local state — only used when the user can manage tags.
  const [optimisticTags, setOptimisticTags] = useState<Tag[]>(() => design.tags ?? []);
  const [pendingIds, setPendingIds]          = useState<number[]>([]);

  useEffect(() => {
    setOptimisticTags((prev) => {
      const inFlight   = new Set(pendingIds);
      const serverTags = design.tags ?? [];
      const settled    = serverTags.filter((t) => !inFlight.has(t.id));
      const pending    = prev.filter((t) => inFlight.has(t.id));
      return [...settled, ...pending];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.tags]);

  // Non-managers with no tags → hide section entirely.
  if (!canManageComponents && (design.tags ?? []).length === 0) return null;

  // Non-managers with tags → read-only chip cloud.
  if (!canManageComponents) {
    return (
      <div>
        <SectionHeading>Tags</SectionHeading>
        <div className="flex flex-wrap gap-2">
          {(design.tags ?? []).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-white"
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Managers — full picker with optimistic updates.
  function handleToggle(tag: Tag) {
    const isApplied = optimisticTags.some((t) => t.id === tag.id);

    setOptimisticTags((prev) =>
      isApplied ? prev.filter((t) => t.id !== tag.id) : [...prev, tag],
    );
    setPendingIds((prev) => [...prev, tag.id]);

    const settle = () => setPendingIds((prev) => prev.filter((id) => id !== tag.id));

    if (isApplied) {
      removeTag(
        { designId: design.id, tagId: tag.id },
        {
          onError: () => { setOptimisticTags((prev) => [...prev, tag]); settle(); },
          onSuccess: settle,
        },
      );
    } else {
      applyTag(
        { designId: design.id, tagId: tag.id },
        {
          onError: () => { setOptimisticTags((prev) => prev.filter((t) => t.id !== tag.id)); settle(); },
          onSuccess: settle,
        },
      );
    }
  }

  const appliedIds = optimisticTags.map((t) => t.id);

  return (
    <div>
      <SectionHeading>Tags</SectionHeading>
      <div className="flex flex-wrap items-center gap-2">
        {optimisticTags.map((tag) => {
          const isPending = pendingIds.includes(tag.id);
          return (
            <span
              key={tag.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-white transition-opacity",
                isPending && "opacity-50",
              )}
            >
              {isPending && <Loader2 size={10} className="animate-spin" />}
              {tag.name}
            </span>
          );
        })}
        <TagPicker
          selectedIds={appliedIds}
          pendingIds={pendingIds}
          onToggle={handleToggle}
          variant="assign"
          placeholder={appliedIds.length > 0 ? "Edit tags" : "Add tags"}
          showManage
        />
      </div>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

interface BraceletDetailsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BraceletDetailsDialog({ open, onClose }: BraceletDetailsDialogProps) {
  const braceletName   = useStore((s) => s.braceletName);
  const description    = useStore((s) => s.braceletDescription);
  const bandMaterial   = useStore((s) => s.bandMaterial);
  const braceletSize   = useStore((s) => s.braceletSize);
  const placedBeads    = useStore((s) => s.beads);
  const activeDesignId = useStore((s) => s.activeDesignId);

  const { data: savedDesign } = useDesign(activeDesignId);

  // ── Arc / capacity ──────────────────────────────────────────────────────────
  const radius  = BRACELET_SIZE_RADIUS[braceletSize];
  const totalMm = Math.round(braceletArc(radius) * 1000);
  const usedMm  = Math.round(usedArc(placedBeads) * 1000);
  const pct     = totalMm > 0 ? Math.round((usedMm / totalMm) * 100) : 0;

  // ── Labels ─────────────────────────────────────────────────────────────────
  const materialLabel = BRACELET_MATERIALS.find((m) => m.value === bandMaterial)?.label ?? bandMaterial;
  const sizeEntry     = BRACELET_SIZES.find((s) => s.value === braceletSize);
  const sizeLabel     = sizeEntry ? `${sizeEntry.label}" (${braceletSize})` : braceletSize;

  // ── Derived tag lists ───────────────────────────────────────────────────────
  const materialTags = useMemo(
    () => [...new Set(placedBeads.map((b) => b.product.material).filter(Boolean))] as string[],
    [placedBeads],
  );
  const beadTypes = useMemo(
    () => [...new Set(placedBeads.map((b) => b.product.bead_type).filter(Boolean))] as string[],
    [placedBeads],
  );

  const statusMeta = savedDesign?.status ? STATUS_META[savedDesign.status] : null;

  return (
    <FullScreenDialog
      open={open}
      onClose={onClose}
      title={braceletName}
      className="max-w-3xl"
    >
      <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">

        {/* ── Preview + status badge + description ────────────────────────── */}
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 flex items-center justify-center">
            {savedDesign?.preview_image_url ? (
              <img
                src={savedDesign.preview_image_url}
                alt={braceletName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full border-2 border-dashed border-neutral-300" />
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2">
            {statusMeta && (
              <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.cls}`}>
                {statusMeta.label}
              </span>
            )}
            {description ? (
              <p className="text-sm text-neutral-600 leading-relaxed">{description}</p>
            ) : (
              <p className="text-sm italic text-neutral-400">No description</p>
            )}
          </div>
        </div>

        {/* ── Workflow stepper + actions ───────────────────────────────────── */}
        <WorkflowSection savedDesign={savedDesign} />

        {/* ── Tags ────────────────────────────────────────────────────────── */}
        {savedDesign && (
          <TagsSection design={savedDesign} />
        )}

        {/* ── Configuration ───────────────────────────────────────────────── */}
        <div>
          <SectionHeading>Configuration</SectionHeading>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            <InfoRow label="Band" value={materialLabel} />
            <InfoRow label="Size" value={sizeLabel} />
            <InfoRow label="Beads" value={String(placedBeads.length)} />
            <InfoRow label="Arc used" value={`${usedMm} / ${totalMm} mm (${pct}%)`} />
            {materialTags.length > 0 && (
              <InfoRow label="Materials" value={materialTags.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")} />
            )}
            {beadTypes.length > 0 && (
              <InfoRow label="Types" value={beadTypes.join(", ")} />
            )}
          </div>
        </div>

        {/* ── Bead list ───────────────────────────────────────────────────── */}
        {placedBeads.length > 0 && (
          <div>
            <SectionHeading>Beads ({placedBeads.length})</SectionHeading>
            <div className="overflow-hidden rounded-lg border border-neutral-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 text-left text-xs text-neutral-500">
                    <th className="w-8 px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Material</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 text-right font-medium">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {placedBeads.map((b, i) => (
                    <tr key={b.instanceId} className="transition-colors hover:bg-neutral-50">
                      <td className="px-3 py-2 text-neutral-400">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-neutral-800">{b.product.name}</td>
                      <td className="px-3 py-2 capitalize text-neutral-500">{b.product.material ?? "—"}</td>
                      <td className="px-3 py-2 text-neutral-500">{b.product.bead_type ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-neutral-500">
                        {b.product.size_mm != null
                          ? `${b.product.size_mm} mm`
                          : `${Math.round(b.product.diameter * 1000)} mm`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Saved design metadata ────────────────────────────────────────── */}
        {savedDesign && (
          <div>
            <SectionHeading>Details</SectionHeading>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
              <InfoRow label="Created"      value={formatDateTime(savedDesign.created_at)} />
              {savedDesign.created_by_name && (
                <InfoRow label="Created by"   value={savedDesign.created_by_name} />
              )}
              <InfoRow label="Last updated" value={formatDateTime(savedDesign.updated_at)} />
              {savedDesign.reviewed_at && (
                <InfoRow label="Reviewed"    value={formatDateTime(savedDesign.reviewed_at)} />
              )}
              {savedDesign.reviewed_by_name && (
                <InfoRow label="Reviewed by" value={savedDesign.reviewed_by_name} />
              )}
              {savedDesign.published_at && (
                <InfoRow label="Published"   value={formatDateTime(savedDesign.published_at)} />
              )}
              {savedDesign.published_by_name && (
                <InfoRow label="Published by" value={savedDesign.published_by_name} />
              )}
              {savedDesign.shopify_sku && (
                <InfoRow label="Shopify SKU" value={savedDesign.shopify_sku} />
              )}
            </div>
          </div>
        )}

      </div>
    </FullScreenDialog>
  );
}