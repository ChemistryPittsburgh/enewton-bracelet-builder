"use client";

import { useMemo } from "react";

import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS, BRACELET_MATERIALS, BRACELET_SIZES } from "@/lib/constants";
import { braceletArc, usedArc } from "@/lib/bead-layout";
import { formatDateTime } from "@/lib/utils";

import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { InfoRow } from "@/components/ui/InfoRow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TagPicker, CollectionPicker } from "@/components/builder/saved-designs/Pickers";

import { useDesign } from "@/hooks/useDesign";
import { useApplyTag, useRemoveTag } from "@/hooks/Tags";
import { useApplyCollection, useRemoveCollection } from "@/hooks/Collections";

import { WorkflowSection, STATUS_META } from "@/components/builder/sections/WorkflowSection";
import { AssignmentSection } from "@/components/builder/sections/AssignmentSection";

import type { Bracelet } from "@/types";

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

  // ── Arc / capacity
  const radius  = BRACELET_SIZE_RADIUS[braceletSize];
  const totalMm = Math.round(braceletArc(radius) * 1000);
  const usedMm  = Math.round(usedArc(placedBeads) * 1000);
  const pct     = totalMm > 0 ? Math.round((usedMm / totalMm) * 100) : 0;

  // ── Labels
  const materialLabel = BRACELET_MATERIALS.find((m) => m.value === bandMaterial)?.label ?? bandMaterial;
  const sizeEntry     = BRACELET_SIZES.find((s) => s.value === braceletSize);
  const sizeLabel     = sizeEntry ? `${sizeEntry.label}" (${braceletSize})` : braceletSize;

  // ── Derived tag lists
  const materialTags = useMemo(
    () => [...new Set(placedBeads.map((b) => b.product.material).filter(Boolean))] as string[],
    [placedBeads],
  );
  const beadTypes = useMemo(
    () => [...new Set(placedBeads.map((b) => b.product.bead_type).filter(Boolean))] as string[],
    [placedBeads],
  );

  const statusMeta = savedDesign?.is_discontinued === 1
    ? STATUS_META.discontinued
    : savedDesign?.status
      ? STATUS_META[savedDesign.status]
      : null;

  return (
    <FullScreenDialog open={open} onClose={onClose} title={braceletName} className="max-w-3xl">
      <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">

        {/* ── Preview + status badge + description ─────────────────────── */}
        <div className="flex items-start gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100 flex items-center justify-center">
            {savedDesign?.preview_image_url ? (
              <img src={savedDesign.preview_image_url} alt={braceletName} className="h-full w-full object-cover" />
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
            {description
              ? <p className="text-sm text-neutral-600 leading-relaxed">{description}</p>
              : <p className="text-sm italic text-neutral-400">No description</p>
            }
          </div>
        </div>

        {/* ── Workflow ─────────────────────────────────────────────────── */}
        <WorkflowSection savedDesign={savedDesign} />

        {/* ── Collections ─────────────────────────────────────────────── */}
        {savedDesign && <CollectionsSection design={savedDesign} />}

        {/* ── Tags ────────────────────────────────────────────────────── */}
        {savedDesign && <TagsSection design={savedDesign} />}

        {/* ── Configuration ───────────────────────────────────────────── */}
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

        {/* ── Bead list ───────────────────────────────────────────────── */}
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

        {/* ── Saved design metadata ───────────────────────────────────── */}
        {savedDesign && (
          <div>
            <SectionHeading>Details</SectionHeading>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
              <InfoRow label="Created" value={formatDateTime(savedDesign.created_at)} />
              {savedDesign.created_by_name && <InfoRow label="Created by" value={savedDesign.created_by_name} />}
              <InfoRow label="Last updated" value={formatDateTime(savedDesign.updated_at)} />
              {savedDesign.reviewed_at && <InfoRow label="Reviewed" value={formatDateTime(savedDesign.reviewed_at)} />}
              {savedDesign.reviewed_by_name && <InfoRow label="Reviewed by" value={savedDesign.reviewed_by_name} />}
              {savedDesign.published_at && <InfoRow label="Published" value={formatDateTime(savedDesign.published_at)} />}
              {savedDesign.published_by_name && <InfoRow label="Published by" value={savedDesign.published_by_name} />}
              {savedDesign.shopify_sku && <InfoRow label="Shopify SKU" value={savedDesign.shopify_sku} />}
            </div>
          </div>
        )}

      </div>
    </FullScreenDialog>
  );
}

// ── Thin wrappers that wire mutations into AssignmentSection ───────────────────

function CollectionsSection({ design }: { design: Bracelet }) {
  const { mutateAsync: apply }  = useApplyCollection();
  const { mutateAsync: remove } = useRemoveCollection();

  return (
    <AssignmentSection
      design={design}
      serverItems={design.collections ?? []}
      categoryKey="collection"
      title="Collections"
      applyFn={(c) => apply({ designId: design.id, collectionId: c.id })}
      removeFn={(c) => remove({ designId: design.id, collectionId: c.id })}
      Picker={CollectionPicker}
      addPlaceholder="Add to collection"
      editPlaceholder="Edit collections"
    />
  );
}

function TagsSection({ design }: { design: Bracelet }) {
  const { mutateAsync: apply }  = useApplyTag();
  const { mutateAsync: remove } = useRemoveTag();

  return (
    <AssignmentSection
      design={design}
      serverItems={design.tags ?? []}
      categoryKey="tag"
      title="Tags"
      applyFn={(t) => apply({ designId: design.id, tagId: t.id })}
      removeFn={(t) => remove({ designId: design.id, tagId: t.id })}
      Picker={TagPicker}
      addPlaceholder="Add tags"
      editPlaceholder="Edit tags"
    />
  );
}