"use client";

import { useMemo, useState } from "react";
import { Check, Eraser, Loader2, Pencil, Trash2, X, AlertTriangle, LayoutTemplate } from "lucide-react";

import { useStore } from "@/lib/store";
import { BRACELET_SIZE_RADIUS, BRACELET_MATERIALS, BRACELET_SIZES } from "@/lib/constants";
import { braceletArc, usedArc } from "@/lib/bead-layout";
import { getCollidingCharmIds } from "@/lib/charm-collision";
import { seedSizeLabel } from "@/lib/seed-bead-utils";
import { formatDateTime, formatMm } from "@/lib/utils";

import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { Button } from "@/components/ui/Button";
import { InfoRow } from "@/components/ui/InfoRow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TagPicker, CollectionPicker } from "@/components/builder/saved-designs/Pickers";
import { Tooltip } from "@/components/ui/Tooltip";

import { useDesign } from "@/hooks/useDesign";
import { usePatterns } from "@/hooks/usePatterns";
import { useUpdateDesign } from "@/hooks/useUpdateDesign";
import { useDeleteDesign } from "@/hooks/useDeleteDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { useApplyTag, useRemoveTag } from "@/hooks/useTags";
import { useApplyCollection, useRemoveCollection } from "@/hooks/useCollections";

import { WorkflowSection } from "@/components/builder/sections/WorkflowSection";
import { DeleteBraceletDialog } from "@/components/builder/dialogs/DeleteBraceletDialog";
import { CreatePatternDialog } from "@/components/builder/dialogs/CreatePatternDialog";
import { STATUS_META } from "@/lib/category-colors";
import { AssignmentSection } from "@/components/builder/sections/AssignmentSection";

import type { Bracelet } from "@/types";

// ── Main dialog ───────────────────────────────────────────────────────────────

interface BraceletDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  isKicked?: boolean;
}

export function BraceletDetailsDialog({ open, onClose, isKicked = false }: BraceletDetailsDialogProps) {
  const {
    braceletName,
    braceletDescription,
    bandMaterial,
    braceletSize,
    placedBeads,
    activeDesignId,
    activePatternId,
    setBraceletName,
    setBraceletDescription,
    clearBeads,
    showCharmCollisions,
    setShowCharmCollisions,
  } = useStore((s) => ({
    braceletName:            s.braceletName,
    braceletDescription:     s.braceletDescription,
    bandMaterial:            s.bandMaterial,
    braceletSize:            s.braceletSize,
    placedBeads:             s.beads,
    activeDesignId:          s.activeDesignId,
    activePatternId:         s.activePatternId,
    setBraceletName:         s.setBraceletName,
    setBraceletDescription:  s.setBraceletDescription,
    clearBeads:              s.clearBeads,
    showCharmCollisions:     s.showCharmCollisions,
    setShowCharmCollisions:  s.setShowCharmCollisions,
  }));

  const { data: savedDesign } = useDesign(activeDesignId);
  const { data: patterns = [] } = usePatterns();
  const activePattern = activePatternId !== null ? patterns.find((p) => p.id === activePatternId) ?? null : null;
  const { canEdit, canDeleteBracelet, isAdmin, canManageComponents, canCreatePattern } = usePermissions();
  const isLocked = savedDesign?.status === "approved" || savedDesign?.status === "published" || isKicked;

  const isPublished = savedDesign?.status === "published";

  // ── Name / description edit state ───────────────────────────────────────────
  const [isEditing,        setIsEditing]        = useState(false);
  const [localName,        setLocalName]        = useState(braceletName);
  const [localDescription, setLocalDescription] = useState(braceletDescription ?? "");

  const { mutate: updateDesign, isPending: saving } = useUpdateDesign();

  // ── Create pattern state ────────────────────────────────────────────────────
  const [createPatternOpen, setCreatePatternOpen] = useState(false);

  // ── Delete state ────────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { mutate: deleteDesign, isPending: isDeleting } = useDeleteDesign();

  const isDiscontinued = savedDesign?.is_discontinued === 1;
  const showDelete = savedDesign && canDeleteBracelet && !(savedDesign.status === "published" && !isDiscontinued) && !isLocked;
  const isDraft = !savedDesign || savedDesign.status === "draft" || savedDesign.status === "rejected";
  const showClearBeads = isDraft && placedBeads.length > 0 && !isLocked;

  // ── Clear beads state ───────────────────────────────────────────────────────
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleEdit = () => {
    setLocalName(braceletName);
    setLocalDescription(braceletDescription ?? "");
    setIsEditing(true);
  };

  const handleCancel = () => setIsEditing(false);

  const handleSave = () => {
    const trimmedName = localName.trim();
    if (!trimmedName) return;

    // New bracelet — no API record exists yet. Update the store directly;
    // the name will be included when the user clicks "Save Bracelet".
    if (!savedDesign) {
      setBraceletName(trimmedName);
      setBraceletDescription(localDescription.trim());
      setIsEditing(false);
      return;
    }

    updateDesign(
      { id: savedDesign.id, name: trimmedName, description: localDescription.trim() },
      {
        onSuccess: () => {
          setBraceletName(trimmedName);
          setBraceletDescription(localDescription.trim());
          setIsEditing(false);
        },
      },
    );
  };

  // ── Arc / capacity ───────────────────────────────────────────────────────────
  const radius  = BRACELET_SIZE_RADIUS[braceletSize];
  const totalMm = Math.round(braceletArc(radius) * 1000 * 10) / 10;
  const usedMm  = Math.round(usedArc(placedBeads) * 1000 * 10) / 10;
  const pct     = totalMm > 0 ? Math.round((usedMm / totalMm) * 100) : 0;

  // ── Labels ───────────────────────────────────────────────────────────────────
  const materialLabel = BRACELET_MATERIALS.find((m) => m.value === bandMaterial)?.label ?? bandMaterial;
  const sizeEntry     = BRACELET_SIZES.find((s) => s.value === braceletSize);
  const sizeLabel     = sizeEntry ? `${sizeEntry.label}" (${braceletSize})` : braceletSize;

  // ── Derived tag lists ────────────────────────────────────────────────────────
  const materialTags = useMemo(
    () => [...new Set(placedBeads.map((b) => b.product.material).filter(Boolean))] as string[],
    [placedBeads],
  );
  const beadTypes = useMemo(
    () => [...new Set(placedBeads.map((b) => b.product.bead_type).filter(Boolean))] as string[],
    [placedBeads],
  );

  const collidingIds = useMemo(
    () => getCollidingCharmIds(placedBeads, BRACELET_SIZE_RADIUS[braceletSize]),
    [placedBeads, braceletSize],
  );
  const hasCharmCollisions = collidingIds.length > 0;

  const dialogSectionClass = "border-b border-default pb-4 pt-2";

  const statusMeta = isDiscontinued
    ? STATUS_META.discontinued
    : savedDesign?.status
      ? STATUS_META[savedDesign.status]
      : null;

  const defaultPatternName = braceletName === "New Bracelet" ? "" : braceletName;

  return (
    <FullScreenDialog
      open={open}
      onClose={onClose}
      title={activePatternId !== null ? "Pattern Details" : "Bracelet Details"}
      className={`max-w-3xl ${activePatternId !== null && "pattern-details-dialog border-2 border-gold"}`}
      bodyClasses="py-0 px-0"
      headerExtra={
        canCreatePattern && activePatternId === null ? (
          <Button
            variant="gold"
            size="xs"
            onClick={() => setCreatePatternOpen(true)}
          >
            <LayoutTemplate size={14} className="shrink-0" />
            Create Pattern
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto py-4 px-4 lg:py-6 md:px-6 lg:px-8">

        {/* ── Preview + status + name + description ────────────────────── */}
        <div className="flex items-start gap-4  border-b border-default pb-6">

          {/* Thumbnail */}
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[2px] bg-light-grey/80 flex items-center justify-center">
            {(activePattern?.preview_image_url ?? savedDesign?.preview_image_url) ? (
              <img src={(activePattern?.preview_image_url ?? savedDesign?.preview_image_url)!} alt={braceletName} className="h-full w-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full border-2 border-dashed" />
            )}
          </div>

          {/* Info column */}
          <div className="flex flex-1 flex-col gap-2">

            {/* Status badge */}
            {statusMeta && (
              <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.cls}`}>
                {statusMeta.label}
              </span>
            )}

            {/* Name / description */}
            {isEditing ? (
              <div className="flex flex-col gap-2 pt-1">
                <input
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="Bracelet name"
                  autoFocus
                  className="w-full rounded-md border border-default px-3 py-1.5 text-base font-semibold text-neutral-900 focus:border-neutral-500 focus:outline-none"
                />
                <textarea
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  placeholder="Add a description…"
                  rows={3}
                  className="w-full resize-none rounded-md border border-default px-3 py-1.5 text-sm text-color-base/70 focus:border-neutral-500 focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !localName.trim()}
                    variant="primary"
                    size="sm"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    Save
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={saving}
                    variant="ghost"
                    size="sm"
                  >
                    <X size={13} />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="group flex flex-col gap-1 pt-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold ">{braceletName}</h3>
                  {(!savedDesign || (canEdit && !isLocked)) && (
                    <Tooltip content="Edit Bracelet Title and Description">
                      <button
                        onClick={handleEdit}
                        className="rounded p-0.5 text-color-base/70 opacity-0 transition-opacity hover:text-color-base/70 group-hover:opacity-100"
                        aria-label="Edit name and description"
                      >
                        <Pencil size={13} />
                      </button>
                    </Tooltip>
                  )}
                </div>
                {braceletDescription
                  ? <p className="text-sm text-color-base/70 leading-relaxed">{braceletDescription}</p>
                  : <p className="text-sm italic text-color-base/70">No description</p>
                }
              </div>
            )}
          </div>
        </div>

        {/* ── Workflow (includes reactivate for discontinued designs) ───── */}
        <WorkflowSection savedDesign={savedDesign} isReadOnly={isKicked} />

        {/* ── Collections ─────────────────────────────────────────────── */}
        {savedDesign && <CollectionsSection design={savedDesign} isReadOnly={isKicked} />}

        {/* ── Tags ────────────────────────────────────────────────────── */}
        {savedDesign && <TagsSection design={savedDesign} isReadOnly={isKicked} />}

        {/* ── Configuration ───────────────────────────────────────────── */}
        <div className={dialogSectionClass}>
          <SectionHeading>Configuration</SectionHeading>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 pb-2">
            <InfoRow label="Band"     value={materialLabel} />
            <InfoRow label="Size"     value={sizeLabel} />
            <InfoRow label="Beads"    value={String(placedBeads.length)} />
            <InfoRow label="Arc used" value={`${usedMm} / ${totalMm} mm (${pct}%)`} />
            {materialTags.length > 0 && (
              <InfoRow label="Materials" value={materialTags.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")} />
            )}
            {beadTypes.length > 0 && (
              <InfoRow label="Types" value={beadTypes.join(", ")} />
            )}
          </div>

          {/* ── Charm collision warning ──────────────────────────────────── */}
          {hasCharmCollisions && !isPublished && (
            <div className="flex flex-col gap-5 my-2 bg-error/5 border border-error rounded-[3px] p-4">
              <div className="flex items-start gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error text-white`}>
                      <AlertTriangle size={16} />
                  </div>
                  <div className="max-w-[80%]">
                    <p className="text-sm font-semibold text-error leading-relaxed mb-1">Charms may be overlapping</p>
                    <p className="text-xs">Before publishing a bracelet, ensure all charms look correct. <br />If two charms are overlapping, add more beads or space between them.</p>
                    <Button
                      variant="ghost"
                      size="xs"
                      className={`w-fit mt-3 ${showCharmCollisions && 'bg-error text-white hover:bg-error/70 hover:text-white hover:border-error focus:border-error focus:ring-error'}`}
                      onClick={() => {
                        setShowCharmCollisions(!showCharmCollisions);
                        onClose();
                      }}
                    >
                      {showCharmCollisions && <X className="text-white" size={15} /> }
                      {!showCharmCollisions ? "Show possible collisions" : "Hide collisions" }
                      
                    </Button>
                  </div>
                </div>
            </div>
          )}
        </div>

        {/* ── Bead list ───────────────────────────────────────────────── */}
        {placedBeads.length > 0 && (
          <div className={dialogSectionClass} >
            <SectionHeading>Beads ({placedBeads.length})</SectionHeading>
            <div className="overflow-hidden rounded-[2px] border border-black/50 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-mint/80 text-left text-xs text-color-base/80">
                    <th className="w-8 px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Material</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 text-right font-medium">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default">
                  {placedBeads.map((b, i) => {
                    const seedConfig = b.seedConfig;
                    return (
                      <tr key={b.instanceId} className="transition-colors">
                        <td className="px-3 py-2 text-color-base/70">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">
                          {seedConfig ? (
                            <>
                              {seedSizeLabel(seedConfig, false)} Seed Beeds
                            </>
                          ) : (
                            <>
                              {b.product.name}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2 capitalize text-color-base/70">
                          {seedConfig ? (
                            <span className="flex items-center gap-1">
                              {seedConfig.colorway.map((c, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-color-base/30"
                                  style={{ backgroundColor: c.hex }}
                                  title={`${c.label ?? ""} ${c.percent}%`.trim()}
                                />
                              ))}
                              {seedConfig.colorway.length === 1 && seedConfig.colorway[0].label && (
                                <span className="ml-1">{seedConfig.colorway[0].label}</span>
                              )}
                            </span>
                          ) : (
                            b.product.material ?? "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-color-base/70">{b.product.bead_type ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-color-base/70">
                          {seedConfig
                            ? `${formatMm(seedConfig.arc_length_mm)} mm`
                            : b.product.size_mm != null
                              ? `${b.product.size_mm} mm`
                              : `${Math.round(b.product.diameter * 1000)} mm`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── History ─────────────────────────────────────────────────── */}
        {savedDesign && (
          <div className={dialogSectionClass} >
            <SectionHeading>History</SectionHeading>
            <div className="flex flex-col">
              {buildDesignHistory(savedDesign).map((event, i, arr) => (
                <div key={event.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-navy" />
                      {i < arr.length - 1 && <div className="my-1 w-px flex-1 bg-black/50" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium  ">{event.label}</p>
                      <p className="text-xs text-color-base/70">
                        {formatDateTime(event.date)}
                        {event.byName && ` · ${event.byName}`}
                      </p>
                      {event.note && (
                        <p className="mt-0.5 text-xs italic text-rose-600">"{event.note}"</p>
                      )}
                    </div>
                  </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Saved design metadata ───────────────────────────────────── */}
        {savedDesign && (
          <div className={(showDelete || showClearBeads) ? dialogSectionClass : "pb-6"}>
            <SectionHeading>Details</SectionHeading>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
              <InfoRow label="Created"       value={formatDateTime(savedDesign.created_at)} />
              {savedDesign.created_by_name   && <InfoRow label="Created by"   value={savedDesign.created_by_name} />}
              <InfoRow label="Last updated"  value={formatDateTime(savedDesign.updated_at)} />
              {savedDesign.reviewed_at       && <InfoRow label="Reviewed"      value={formatDateTime(savedDesign.reviewed_at)} />}
              {savedDesign.reviewed_by_name  && <InfoRow label="Reviewed by"   value={savedDesign.reviewed_by_name} />}
              {savedDesign.published_at      && <InfoRow label="Published"     value={formatDateTime(savedDesign.published_at)} />}
              {savedDesign.published_by_name && <InfoRow label="Published by"  value={savedDesign.published_by_name} />}
              {savedDesign.shopify_sku       && <InfoRow label="Shopify SKU"   value={savedDesign.shopify_sku} />}
            </div>
          </div>
        )}

        {/* ── Danger Zone ─────────────────────────────────────────────── */}
        {(showDelete || showClearBeads) && (
          <div className="pb-6">
            <SectionHeading>Danger Zone</SectionHeading>
            <div className="flex flex-col gap-2">

              {/* Clear all beads — draft/rejected only */}
              {showClearBeads && (
                <div className="flex items-center justify-between rounded-lg border border-error/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Clear all beads</p>
                    <p className="text-xs text-color-base/60">
                      Remove all {placedBeads.length} {placedBeads.length === 1 ? "bead" : "beads"} from the bracelet. The design itself is kept.
                    </p>
                  </div>
                  {showClearConfirm ? (
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          clearBeads();
                          setShowClearConfirm(false);
                        }}
                      >
                        <Eraser size={13} />
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowClearConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="softDanger"
                      size="sm"
                      className="ml-3 shrink-0"
                      onClick={() => setShowClearConfirm(true)}
                    >
                      <Eraser size={14} />
                      Clear
                    </Button>
                  )}
                </div>
              )}

              {/* Delete bracelet */}
              {showDelete && (
                <div className="flex items-center justify-between rounded-lg border border-error/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Delete this bracelet</p>
                    <p className="text-xs text-color-base/60">This action is permanent and cannot be undone.</p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    className="ml-3 shrink-0"
                    onClick={() => { setDeleteError(null); setShowDeleteConfirm(true); }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Create pattern dialog ───────────────────────────────────── */}
      {createPatternOpen && (
        <CreatePatternDialog
          initialName={defaultPatternName}
          onClose={() => setCreatePatternOpen(false)}
          onSaved={() => setCreatePatternOpen(false)}
        />
      )}

      {/* ── Delete confirmation (rendered outside scroll area) ──────── */}
      {showDeleteConfirm && savedDesign && (
        <DeleteBraceletDialog
          designName={savedDesign.name}
          isDeleting={isDeleting}
          error={deleteError}
          onCancel={() => { setDeleteError(null); setShowDeleteConfirm(false); }}
          includeBackDropBlur={false}
          onConfirm={() => {
            setDeleteError(null);
            deleteDesign(savedDesign.id, {
              onSuccess: () => {
                setShowDeleteConfirm(false);
                useStore.getState().resetBracelet();
                onClose();
              },
              onError: (err) => {
                setDeleteError(
                  err instanceof Error ? err.message : "This bracelet cannot be deleted.",
                );
              },
            });
          }}
        />
      )}
    </FullScreenDialog>
  );
}

// ── Per-design history ────────────────────────────────────────────────────────
// Derived from the timestamp fields already on Bracelet — no extra API call.
// Richer event-level history (e.g. multiple review cycles) would require a specific end-point

type HistoryEvent = {
  key: string;
  label: string;
  date: string;
  byName: string | null;
  note?: string | null;
};

function buildDesignHistory(design: Bracelet): HistoryEvent[] {
  const events: HistoryEvent[] = [
    {
      key:    "created",
      label:  "Created",
      date:   design.created_at,
      byName: design.created_by_name,
    },
  ];

  if (design.reviewed_at) {
    events.push({
      key:    "submitted",
      label:  "Submitted for review",
      date:   design.reviewed_at,
      byName: design.reviewed_by_name,
    });
  }

  if (design.approved_at) {
    events.push({
      key:    "approved",
      label:  "Approved",
      date:   design.approved_at,
      byName: design.approved_by_name ?? null,
    });
  }

  if (design.rejected_at) {
    events.push({
      key:    "rejected",
      label:  "Rejected",
      date:   design.rejected_at,
      byName: design.rejected_by_name,
      note:   design.rejection_reason,
    });
  }

  if (design.published_at) {
    events.push({
      key:    "published",
      label:  "Published",
      date:   design.published_at,
      byName: design.published_by_name,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

// ── Assignment section wrappers ───────────────────────────────────────────────

function CollectionsSection({ design, isReadOnly }: { design: Bracelet; isReadOnly?: boolean }) {
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
      isReadOnly={isReadOnly}
    />
  );
}

function TagsSection({ design, isReadOnly }: { design: Bracelet; isReadOnly?: boolean }) {
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
      isReadOnly={isReadOnly}
    />
  );
}