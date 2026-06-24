"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { Button } from "@/components/ui/Button";

import { useDesigns } from "@/hooks/useDesigns";

import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "@/hooks/useTags";
import { usePermissions } from "@/hooks/usePermissions";
import type { Tag } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function braceletWord(n: number) {
  return n === 1 ? "1 bracelet" : `${n} bracelets`;
}

// ── Tag row: view mode ────────────────────────────────────────────────────────

function TagRow({
  tag,
  count,
  onEdit,
  onDelete,
  isDeleting,
  canManage,
}: {
  tag: Tag;
  count: number;
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
  isDeleting: boolean;
  canManage: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-white px-4 py-3 group">
      {/* color dot */}
      {tag.color && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: tag.color }}
        />
      )}

      <span className="flex-1 text-sm font-medium  ">{tag.name}</span>

      {/* Bracelet count badge */}
      <span className="text-sm text-color-base/70 tabular-nums shrink-0">
        {count > 0 ? braceletWord(count) : "0 bracelets"}
      </span>

      {/* Actions — reveal on hover */}
      {canManage && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(tag)}
            className="icon-only-btn"
            title="Edit tag"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(tag)}
            disabled={isDeleting}
            className="icon-only-btn icon-only-btn--error"
            title="Delete tag"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Delete confirmation row ───────────────────────────────────────────────────

function DeleteConfirmRow({
  tag,
  count,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  tag: Tag;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="rounded-lg border border-error bg-light-grey/50 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={15} className="shrink-0 mt-0.5 text-error/80" />
        <div>
          <p className="text-sm font-medium text-error">
            Delete &ldquo;{tag.name}&rdquo;?
          </p>
          {count > 0 && (
            <p className="mt-0.5 text-sm">
              This tag is applied to {braceletWord(count)}. Deleting this tag will
              remove it from all of them.
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={onConfirm}
          disabled={isDeleting}
          variant="danger"
            size="xs"
        >
          {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Delete tag
        </Button>
        <Button
          onClick={onCancel}
          disabled={isDeleting}
          size="xs"
          variant="ghost"
        >
          <X size={12} /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Tag row: edit mode ────────────────────────────────────────────────────────

function EditRow({
  initialName,
  affectedCount,
  onSave,
  onCancel,
  isSaving,
  submitLabel,
}: {
  initialName: string;
  /** How many bracelets will be affected by a rename (0 for new tags). */
  affectedCount: number;
  onSave: (name: string) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialName);
  const isDirty = name.trim() !== initialName;

  return (
    <div className="rounded-lg border border-default bg-white p-4 flex flex-col gap-3 shadow-sm">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onSave(name.trim());
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Tag name"
        className="w-full rounded border border-default px-3 py-1.5 text-sm outline-none focus:border-grey transition-colors"
      />

      {/* Rename impact warning */}
      {affectedCount > 0 && isDirty && (
        <p className="flex items-center gap-1.5 text-sm text-gold">
          <AlertTriangle size={12} className="shrink-0" />
          This rename will update the tag on {braceletWord(affectedCount)}.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          onClick={() => { if (name.trim()) onSave(name.trim()); }}
          disabled={isSaving || !name.trim()}
          size="sm"
          variant="secondary"
          label="Submit New Collection"
        >
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {submitLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X size={12} /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

interface ManageTagsDialogProps {
  open: boolean;
  onClose: () => void;
  includeBackDropBlur?: boolean;
}

export function ManageTagsDialog({ open, onClose, includeBackDropBlur = true }: ManageTagsDialogProps) {
  const { data: tags = [], isLoading } = useTags();
  const { data: allDesigns = [] } = useDesigns();

  const { mutate: createTag, isPending: creating } = useCreateTag();
  const { mutate: updateTag, isPending: updating } = useUpdateTag();
  const { mutate: deleteTag, isPending: deleting } = useDeleteTag();
  const { canManageComponents } = usePermissions();

  const [isCreating, setIsCreating]         = useState(false);
  const [editingId,  setEditingId]          = useState<number | null>(null);
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<Tag | null>(null);
  const [deletingId, setDeletingId]         = useState<number | null>(null);

  function resetState() {
    setIsCreating(false);
    setEditingId(null);
    setConfirmDeleteTag(null);
  }

  // Close all expanded rows, then close the dialog.
  function handleClose() {
    resetState();
    onClose();
  }

  // Open edit row — collapses create form and any pending delete confirm.
  function openEdit(tag: Tag) {
    setIsCreating(false);
    setConfirmDeleteTag(null);
    setEditingId(tag.id);
  }

  // Open delete confirm — collapses edit row and create form.
  // If the tag has no bracelets, skip the confirm and delete immediately.
  function openDeleteConfirm(tag: Tag) {
    const count = countByTagId.get(tag.id) ?? 0;
    if (count === 0) {
      executeDelete(tag.id);
      return;
    }
    setIsCreating(false);
    setEditingId(null);
    setConfirmDeleteTag(tag);
  }

  // Open create form — collapses any open edit row and delete confirm.
  function openCreate() {
    setEditingId(null);
    setConfirmDeleteTag(null);
    setIsCreating(true);
  }

  // Derive bracelet count per tag from the cached designs list — no extra fetch.
  const countByTagId = new Map<number, number>();
  for (const design of allDesigns) {
    for (const tag of design.tags ?? []) {
      countByTagId.set(tag.id, (countByTagId.get(tag.id) ?? 0) + 1);
    }
  }

  function handleCreate(name: string) {
    createTag({ name }, { onSuccess: () => setIsCreating(false) });
  }

  function handleUpdate(id: number, name: string) {
    updateTag({ id, name }, { onSuccess: () => setEditingId(null) });
  }

  function executeDelete(id: number) {
    setDeletingId(id);
    deleteTag(id, {
      onSuccess: () => {
        setConfirmDeleteTag(null);
        setDeletingId(null);
      },
      onError: () => setDeletingId(null),
    });
  }

  return (
    <FullScreenDialog open={open} onClose={handleClose} title="Manage Tags" className="max-w-lg" includeBackDropBlur={includeBackDropBlur}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-color-base/70">
          Create and manage custom tags to organise saved bracelet designs.
          Tags can be added to a bracelet in the Bracelet Details panel.
        </p>

        {/* Existing tags */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-color-base/70" />
          </div>
        ) : tags.length === 0 && !isCreating ? (
          <p className="py-4 text-center text-sm text-color-base/70">No tags yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tags.map((tag) => {
              const count = countByTagId.get(tag.id) ?? 0;

              if (confirmDeleteTag?.id === tag.id) {
                return (
                  <DeleteConfirmRow
                    key={tag.id}
                    tag={tag}
                    count={count}
                    isDeleting={deleting && deletingId === tag.id}
                    onConfirm={() => executeDelete(tag.id)}
                    onCancel={() => setConfirmDeleteTag(null)}
                  />
                );
              }

              if (editingId === tag.id) {
                return (
                  <EditRow
                    key={tag.id}
                    initialName={tag.name}
                    affectedCount={count}
                    isSaving={updating}
                    submitLabel="Save changes"
                    onSave={(name) => handleUpdate(tag.id, name)}
                    onCancel={() => setEditingId(null)}
                  />
                );
              }

              return (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  count={count}
                  onEdit={openEdit}
                  onDelete={openDeleteConfirm}
                  isDeleting={deleting && deletingId === tag.id}
                  canManage={canManageComponents}
                />
              );
            })}
          </div>
        )}

        {/* Create new — component admins and above only */}
        {canManageComponents && (
          isCreating ? (
            <EditRow
              initialName=""
              affectedCount={0}
              isSaving={creating}
              submitLabel="Create tag"
              onSave={handleCreate}
              onCancel={() => setIsCreating(false)}
            />
          ) : (
            <Button
              onClick={openCreate}
              variant="dashed"
            >
              <Plus size={15} /> New tag
            </Button>
          )
        )}
      </div>
    </FullScreenDialog>
  );
}