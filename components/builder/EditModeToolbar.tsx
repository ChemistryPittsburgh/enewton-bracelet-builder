"use client";

import { ArrowUp, ArrowDown, CopyPlus, Repeat2, Trash2, SwitchCamera } from "lucide-react";
import { useStore } from "@/lib/store";

export function EditModeToolbar() {
  const {
    isEditMode,
    editSelectedBead,
    beads,
    reorderBeads,
    duplicateBead,
    reverseBracelet,
    removeBead,
    editViewMode,
    toggleEditViewMode,
  } = useStore((s) => ({
    isEditMode: s.isEditMode,
    editSelectedBead: s.editSelectedBead,
    beads: s.beads,
    reorderBeads: s.reorderBeads,
    duplicateBead: s.duplicateBead,
    reverseBracelet: s.reverseBracelet,
    removeBead: s.removeBead,
    editViewMode: s.editViewMode,
    toggleEditViewMode: s.toggleEditViewMode,
  }));

  if (!isEditMode) return null;

  const n = beads.length;
  const idx = editSelectedBead
    ? beads.findIndex((b) => b.instanceId === editSelectedBead.instanceId)
    : -1;
  const hasSelection = idx !== -1;

  return (
    <div className="pointer-events-auto flex items-center bg-white shadow-sm rounded-lg overflow-hidden divide-x divide-neutral-200">
      <EditBtn
        onClick={() => reorderBeads(idx, (idx - 1 + n) % n)}
        disabled={!hasSelection}
        label="Move bead back"
      >
        <ArrowUp size={22} />
      </EditBtn>
      <EditBtn
        onClick={() => reorderBeads(idx, (idx + 1) % n)}
        disabled={!hasSelection}
        label="Move bead forward"
      >
        <ArrowDown size={22} />
      </EditBtn>
      <EditBtn
        onClick={() => editSelectedBead && duplicateBead(editSelectedBead.instanceId)}
        disabled={!hasSelection}
        label="Duplicate bead"
      >
        <CopyPlus size={22} />
      </EditBtn>
      <EditBtn onClick={() => reverseBracelet()} label="Reverse bracelet">
        <Repeat2 size={22} />
      </EditBtn>
      <EditBtn
        onClick={() => editSelectedBead && removeBead(editSelectedBead.instanceId)}
        disabled={!hasSelection}
        label="Delete bead"
      >
        <Trash2 size={22} />
      </EditBtn>
      <EditBtn
        onClick={toggleEditViewMode}
        label={editViewMode === 'top' ? 'Switch to side view' : 'Switch to top view'}
      >
        <SwitchCamera size={22} />
      </EditBtn>
    </div>
  );
}

function EditBtn({
  onClick,
  disabled = false,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex items-center justify-center px-4 py-3 transition-colors ${
        disabled
          ? "cursor-not-allowed text-neutral-300"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}
