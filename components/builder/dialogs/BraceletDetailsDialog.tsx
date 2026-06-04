"use client";

import { useMemo, useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";

import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { TagPicker, CollectionPicker } from "@/components/builder/saved-designs/Pickers";


import { useStore } from "@/lib/store";
import { useDesign } from "@/hooks/useDesign";
import { useSubmitDesign } from "@/hooks/useSubmitDesign";
import { useApproveDesign } from "@/hooks/useApproveDesign";
import { useRejectDesign } from "@/hooks/useRejectDesign";
import { usePublishDesign } from "@/hooks/usePublishDesign";
import { useSetDesignSku } from "@/hooks/useSetDesignSku";

import { useApplyTag, useRemoveTag } from "@/hooks/Tags";
import { useApplyCollection, useRemoveCollection } from "@/hooks/Collections";

import { BRACELET_SIZE_RADIUS, BRACELET_MATERIALS, BRACELET_SIZES } from "@/lib/constants";
import { braceletArc, usedArc } from "@/lib/bead-layout";
import { cn } from "@/lib/utils";

import type { Bracelet, BraceletStatus, Collection, Tag } from "@/types";

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className="text-sm text-neutral-700">{value}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
      {children}
    </h3>
  );
}

function ActionButton({
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
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
        variant === "primary"
          ? "bg-neutral-900 text-white hover:bg-neutral-700"
          : "border border-red-200 text-red-600 hover:bg-red-50"
      }`}
    >
      {isPending && <Loader2 size={13} className="animate-spin" />}
      {label}
    </button>
  );
}

// ── Workflow section ──────────────────────────────────────────────────────────

function WorkflowSection({ savedDesign }: { savedDesign: Bracelet | undefined }) {
  const { mutate: submit,  isPending: submitting,  canSubmit }  = useSubmitDesign();
  const { mutate: approve, isPending: approving,   canApprove } = useApproveDesign();
  const { mutate: reject,  isPending: rejecting,   canReject }  = useRejectDesign();
  const { mutate: publish, isPending: publishing,  canPublish } = usePublishDesign();
  const { mutate: setSku,  isPending: settingSku,  canSetSku }  = useSetDesignSku();

  const [skuInput, setSkuInput] = useState("");
  const [skuSaved, setSkuSaved] = useState(false);

  // Sync input with saved value when design loads
  useEffect(() => {
    setSkuInput(savedDesign?.shopify_sku ?? "");
  }, [savedDesign?.shopify_sku]);

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
    (status === "approved"  && canPublish);

  const showSkuField = canSetSku && status === "approved";

  function handleSkuSave() {
    if (!skuInput.trim()) return;
    setSku({ id, shopify_sku: skuInput.trim() }, {
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
              onChange={(e) => setSkuInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSkuSave(); }}
              placeholder="e.g. BB-SUMMER-001"
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 outline-none transition-colors focus:border-neutral-500 placeholder:text-neutral-400"
            />
            <button
              onClick={handleSkuSave}
              disabled={settingSku || !skuInput.trim()}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              {skuSaved ? "Saved!" : settingSku ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
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
          {status === "approved" && canPublish && (
            <ActionButton
              label="Publish"
              isPending={publishing}
              onClick={() => publish(id)}
              variant="primary"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Collection section ────────────────────────────────────────────────────────

function CollectionSection({ design }: { design: Bracelet }) {
  const { mutate: applyCollection }  = useApplyCollection();
  const { mutate: removeCollection } = useRemoveCollection();

  const [optimisticCollections, setOptimisticCollections] = useState<Collection[]>(
    () => design.collections ?? [],
  );
  const [pendingIds, setPendingIds] = useState<number[]>([]);

  // Sync from server once mutations settle
  useEffect(() => {
    setOptimisticCollections((prev) => {
      const inFlight    = new Set(pendingIds);
      const serverColls = design.collections ?? [];
      const settled     = serverColls.filter((c) => !inFlight.has(c.id));
      const pending     = prev.filter((c) => inFlight.has(c.id));
      return [...settled, ...pending];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.collections]);

  function handleToggle(collection: Collection) {
    const isApplied = optimisticCollections.some((c) => c.id === collection.id);

    setOptimisticCollections((prev) =>
      isApplied ? prev.filter((c) => c.id !== collection.id) : [...prev, collection],
    );
    setPendingIds((prev) => [...prev, collection.id]);

    const settle = () => setPendingIds((prev) => prev.filter((id) => id !== collection.id));

    if (isApplied) {
      removeCollection(
        { designId: design.id, collectionId: collection.id },
        {
          onError:   () => { setOptimisticCollections((prev) => [...prev, collection]); settle(); },
          onSuccess: settle,
        },
      );
    } else {
      applyCollection(
        { designId: design.id, collectionId: collection.id },
        {
          onError:   () => { setOptimisticCollections((prev) => prev.filter((c) => c.id !== collection.id)); settle(); },
          onSuccess: settle,
        },
      );
    }
  }

  const appliedIds = optimisticCollections.map((c) => c.id);

  return (
    <div>
      <SectionHeading>Collections</SectionHeading>
      <div className="flex flex-wrap items-center gap-2">
        {optimisticCollections.map((c) => (
          <span
            key={c.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-medium text-white transition-opacity",
              pendingIds.includes(c.id) && "opacity-50",
            )}
          >
            {pendingIds.includes(c.id) && <Loader2 size={10} className="animate-spin" />}
            {c.name}
          </span>
        ))}
        <CollectionPicker
          selectedIds={appliedIds}
          pendingIds={pendingIds}
          onToggle={handleToggle}
          variant="assign"
          placeholder={appliedIds.length > 0 ? "Edit collections" : "Add to collection"}
          showManage
        />
      </div>
    </div>
  );
}

// ── Tags section ──────────────────────────────────────────────────────────────

function TagsSection({ design }: { design: Bracelet }) {
  const { mutate: applyTag }  = useApplyTag();
  const { mutate: removeTag } = useRemoveTag();

  // Optimistic local state: starts from server-confirmed tags, updated instantly on toggle.
  const [optimisticTags, setOptimisticTags] = useState<Tag[]>(() => design.tags ?? []);
  // Which tag IDs have an in-flight mutation right now.
  const [pendingIds, setPendingIds] = useState<number[]>([]);

  // Sync if the server data changes (e.g. after invalidation resolves).
  // Only update tags that are NOT currently being mutated to avoid flickering.
  useEffect(() => {
    setOptimisticTags((prev) => {
      const inFlight = new Set(pendingIds);
      const serverTags = design.tags ?? [];
      // Keep optimistic state for pending tags; use server state for settled ones.
      const settled = serverTags.filter((t) => !inFlight.has(t.id));
      const pending  = prev.filter((t) => inFlight.has(t.id));
      return [...settled, ...pending];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.tags]);

  function handleToggle(tag: Tag) {
    const isApplied = optimisticTags.some((t) => t.id === tag.id);

    // 1. Optimistically update UI immediately.
    setOptimisticTags((prev) =>
      isApplied ? prev.filter((t) => t.id !== tag.id) : [...prev, tag],
    );
    setPendingIds((prev) => [...prev, tag.id]);

    const settle = () =>
      setPendingIds((prev) => prev.filter((id) => id !== tag.id));

    if (isApplied) {
      removeTag(
        { designId: design.id, tagId: tag.id },
        {
          onError: () => {
            // Roll back on error.
            setOptimisticTags((prev) => [...prev, tag]);
            settle();
          },
          onSuccess: settle,
        },
      );
    } else {
      applyTag(
        { designId: design.id, tagId: tag.id },
        {
          onError: () => {
            // Roll back on error.
            setOptimisticTags((prev) => prev.filter((t) => t.id !== tag.id));
            settle();
          },
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
        {/* Optimistic tag chips */}
        {optimisticTags.map((tag) => {
          const isPending = pendingIds.includes(tag.id);
          return (
            <span
              key={tag.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white transition-opacity",
                isPending && "opacity-50",
              )}
            >
              {isPending && <Loader2 size={10} className="animate-spin" />}
              {tag.name}
            </span>
          );
        })}
        {/* Picker */}
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

        {/* ── Collection ──────────────────────────────────────────────────── */}
        {savedDesign && (
          <CollectionSection design={savedDesign} />
        )}

        {/* ── Tags ────────────────────────────────────────────────────────── */}
        {savedDesign && (
          <TagsSection design={savedDesign} />
        )}

        {/* ── Configuration ───────────────────────────────────────────────── */}
        <div>
          <SectionHeading>Configuration</SectionHeading>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            <Row label="Band" value={materialLabel} />
            <Row label="Size" value={sizeLabel} />
            <Row label="Beads" value={String(placedBeads.length)} />
            <Row label="Arc used" value={`${usedMm} / ${totalMm} mm (${pct}%)`} />
            {materialTags.length > 0 && (
              <Row label="Materials" value={materialTags.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")} />
            )}
            {beadTypes.length > 0 && (
              <Row label="Types" value={beadTypes.join(", ")} />
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
              <Row label="Created"      value={formatDateTime(savedDesign.created_at)} />
              {savedDesign.created_by_name && (
                <Row label="Created by"   value={savedDesign.created_by_name} />
              )}
              <Row label="Last updated" value={formatDateTime(savedDesign.updated_at)} />
              {savedDesign.reviewed_at && (
                <Row label="Reviewed"    value={formatDateTime(savedDesign.reviewed_at)} />
              )}
              {savedDesign.reviewed_by_name && (
                <Row label="Reviewed by" value={savedDesign.reviewed_by_name} />
              )}
              {savedDesign.published_at && (
                <Row label="Published"   value={formatDateTime(savedDesign.published_at)} />
              )}
              {savedDesign.published_by_name && (
                <Row label="Published by" value={savedDesign.published_by_name} />
              )}
              {savedDesign.shopify_sku && (
                <Row label="Shopify SKU" value={savedDesign.shopify_sku} />
              )}
            </div>
          </div>
        )}

      </div>
    </FullScreenDialog>
  );
}