"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";

import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { Button } from "@/components/ui/Button";

import { useTags } from "@/hooks/useTags";
import { useCreateTag } from "@/hooks/useCreateTag";
import { useUpdateTag } from "@/hooks/useUpdateTag";
import { useDeleteTag } from "@/hooks/useDeleteTag";
import { usePermissions } from "@/hooks/usePermissions";
import type { Tag } from "@/types";

// ── Row: view mode ────────────────────────────────────────────────────────────

function TagRow({
  tag,
  onEdit,
  onDelete,
  isDeleting,
  canManage,
}: {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
  canManage: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-white px-4 py-3 group">
      <span className="flex-1 text-sm font-medium text-neutral-800">{tag.name}</span>
      {canManage && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(tag)}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            title="Edit tag"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(tag.id)}
            disabled={isDeleting}
            className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
            title="Delete tag"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Row: edit mode ────────────────────────────────────────────────────────────

function EditRow({
  initialName,
  onSave,
  onCancel,
  isSaving,
  submitLabel,
}: {
  initialName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialName);

  return (
    <div className="rounded-lg border border-neutral-300 bg-white p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center gap-3">
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
          className="flex-1 rounded border border-neutral-200 px-3 py-1.5 text-sm text-neutral-800 outline-none focus:border-neutral-500 transition-colors"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => { if (name.trim()) onSave(name.trim()); }}
          disabled={isSaving || !name.trim()}
          size="sm"
        >
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {submitLabel}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
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
}

export function ManageTagsDialog({ open, onClose }: ManageTagsDialogProps) {
  const { data: tags = [], isLoading } = useTags();
  const { mutate: createTag, isPending: creating } = useCreateTag();
  const { mutate: updateTag, isPending: updating } = useUpdateTag();
  const { mutate: deleteTag, isPending: deleting } = useDeleteTag();
  const { canManageComponents } = usePermissions();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function handleCreate(name: string) {
    createTag(
      { name },
      { onSuccess: () => setIsCreating(false) },
    );
  }

  function handleUpdate(id: number, name: string) {
    updateTag(
      { id, name },
      { onSuccess: () => setEditingId(null) },
    );
  }

  function handleDelete(id: number) {
    setDeletingId(id);
    deleteTag(id, { onSettled: () => setDeletingId(null) });
  }

  return (
    <FullScreenDialog open={open} onClose={onClose} title="Manage Tags" className="max-w-lg">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500">
          Create and manage custom tags to organise saved bracelet designs.
          Tags can be added to a bracelet in the Bracelet Details panel.
        </p>

        {/* Existing tags */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-neutral-400" />
          </div>
        ) : tags.length === 0 && !isCreating ? (
          <p className="py-4 text-center text-sm text-neutral-400">No tags yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tags.map((tag) =>
              editingId === tag.id ? (
                <EditRow
                  key={tag.id}
                  initialName={tag.name}
                  isSaving={updating}
                  submitLabel="Save changes"
                  onSave={(name) => handleUpdate(tag.id, name)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  onEdit={(t) => { setIsCreating(false); setEditingId(t.id); }}
                  onDelete={handleDelete}
                  isDeleting={deleting && deletingId === tag.id}
                  canManage={canManageComponents}
                />
              ),
            )}
          </div>
        )}

        {/* Create new — component admins and above only */}
        {canManageComponents && (
          isCreating ? (
            <EditRow
              initialName=""
              isSaving={creating}
              submitLabel="Create tag"
              onSave={handleCreate}
              onCancel={() => setIsCreating(false)}
            />
          ) : (
            <button
              onClick={() => { setEditingId(null); setIsCreating(true); }}
              className="flex items-center gap-2 self-start rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-700"
            >
              <Plus size={15} /> New tag
            </button>
          )
        )}
      </div>
    </FullScreenDialog>
  );
}