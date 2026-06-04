"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { Button } from "@/components/ui/Button";

import { useDesigns } from "@/hooks/useDesigns";
import { useCollections, useCreateCollection, useUpdateCollection, useDeleteCollection } from "@/hooks/Collections";
import type { Collection } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function braceletWord(n: number) {
  return n === 1 ? "1 bracelet" : `${n} bracelets`;
}

// ── Collection row: view mode ─────────────────────────────────────────────────

function CollectionRow({
  collection,
  count,
  onEdit,
  onDelete,
  isDeleting,
}: {
  collection: Collection;
  count: number;
  onEdit: (c: Collection) => void;
  onDelete: (c: Collection) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-white px-4 py-3 group">
      <span className="flex-1 text-sm font-medium text-neutral-800">{collection.name}</span>
      <span className="text-xs text-neutral-400 tabular-nums shrink-0">{braceletWord(count)}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(collection)}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          title="Edit collection"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(collection)}
          disabled={isDeleting}
          className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
          title="Delete collection"
        >
          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Delete confirmation row ───────────────────────────────────────────────────

function DeleteConfirmRow({
  collection,
  count,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  collection: Collection;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-500" />
        <div>
          <p className="text-sm font-medium text-red-800">Delete &ldquo;{collection.name}&rdquo;?</p>
          {count > 0 && (
            <p className="mt-0.5 text-xs text-red-600">
              {braceletWord(count)} are in this collection. Deleting it will
              remove them all from it.
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Delete collection
        </button>
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
}

// ── Edit / create row ─────────────────────────────────────────────────────────

function EditRow({
  initialName,
  affectedCount,
  onSave,
  onCancel,
  isSaving,
  submitLabel,
}: {
  initialName: string;
  affectedCount: number;
  onSave: (name: string) => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialName);
  const isDirty = name.trim() !== initialName;

  return (
    <div className="rounded-lg border border-neutral-300 bg-white p-4 flex flex-col gap-3 shadow-sm">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onSave(name.trim());
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Collection name"
        className="w-full rounded border border-neutral-200 px-3 py-1.5 text-sm text-neutral-800 outline-none focus:border-neutral-500 transition-colors"
      />
      {affectedCount > 0 && isDirty && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700">
          <AlertTriangle size={12} className="shrink-0" />
          This rename will update the collection on {braceletWord(affectedCount)}.
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => { if (name.trim()) onSave(name.trim()); }}
          disabled={isSaving || !name.trim()}
          size="sm"
          variant="black"
        >
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {submitLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100">
          <X size={12} /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

interface ManageCollectionsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ManageCollectionsDialog({ open, onClose }: ManageCollectionsDialogProps) {
  const { data: collections = [], isLoading } = useCollections();
  const { data: allDesigns = [] }             = useDesigns();

  const { mutate: createCollection, isPending: creating } = useCreateCollection();
  const { mutate: updateCollection, isPending: updating } = useUpdateCollection();
  const { mutate: deleteCollection, isPending: deleting } = useDeleteCollection();

  const [isCreating,        setIsCreating]        = useState(false);
  const [editingId,         setEditingId]          = useState<number | null>(null);
  const [confirmDeleteColl, setConfirmDeleteColl]  = useState<Collection | null>(null);
  const [deletingId,        setDeletingId]         = useState<number | null>(null);

  function resetState() {
    setIsCreating(false);
    setEditingId(null);
    setConfirmDeleteColl(null);
  }

  function handleClose() { resetState(); onClose(); }
  function openEdit(c: Collection) { setIsCreating(false); setConfirmDeleteColl(null); setEditingId(c.id); }
  function openCreate() { setEditingId(null); setConfirmDeleteColl(null); setIsCreating(true); }

  function openDeleteConfirm(c: Collection) {
    const count = countByCollectionId.get(c.id) ?? 0;
    if (count === 0) { executeDelete(c.id); return; }
    setIsCreating(false);
    setEditingId(null);
    setConfirmDeleteColl(c);
  }

  // Derive bracelet count per collection from design.collections arrays.
  const countByCollectionId = new Map<number, number>();
  for (const design of allDesigns) {
    for (const c of design.collections ?? []) {
      countByCollectionId.set(c.id, (countByCollectionId.get(c.id) ?? 0) + 1);
    }
  }

  function handleCreate(name: string) {
    createCollection({ name }, { onSuccess: () => setIsCreating(false) });
  }

  function handleUpdate(id: number, name: string) {
    updateCollection({ id, name }, { onSuccess: () => setEditingId(null) });
  }

  function executeDelete(id: number) {
    setDeletingId(id);
    deleteCollection(id, {
      onSuccess: () => { setConfirmDeleteColl(null); setDeletingId(null); },
      onError:   () => setDeletingId(null),
    });
  }

  return (
    <FullScreenDialog open={open} onClose={handleClose} title="Manage Collections" className="max-w-lg">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500">
          Collections group bracelet designs together. A design can belong to multiple collections.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-neutral-400" />
          </div>
        ) : collections.length === 0 && !isCreating ? (
          <p className="py-4 text-center text-sm text-neutral-400">No collections yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {collections.map((c) => {
              const count = countByCollectionId.get(c.id) ?? 0;

              if (confirmDeleteColl?.id === c.id) {
                return (
                  <DeleteConfirmRow
                    key={c.id}
                    collection={c}
                    count={count}
                    isDeleting={deleting && deletingId === c.id}
                    onConfirm={() => executeDelete(c.id)}
                    onCancel={() => setConfirmDeleteColl(null)}
                  />
                );
              }

              if (editingId === c.id) {
                return (
                  <EditRow
                    key={c.id}
                    initialName={c.name}
                    affectedCount={count}
                    isSaving={updating}
                    submitLabel="Save changes"
                    onSave={(name) => handleUpdate(c.id, name)}
                    onCancel={() => setEditingId(null)}
                  />
                );
              }

              return (
                <CollectionRow
                  key={c.id}
                  collection={c}
                  count={count}
                  onEdit={openEdit}
                  onDelete={openDeleteConfirm}
                  isDeleting={deleting && deletingId === c.id}
                />
              );
            })}
          </div>
        )}

        {isCreating ? (
          <EditRow
            initialName=""
            affectedCount={0}
            isSaving={creating}
            submitLabel="Create collection"
            onSave={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        ) : (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 self-start rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-700"
          >
            <Plus size={15} /> New collection
          </button>
        )}
      </div>
    </FullScreenDialog>
  );
}