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
    <div className="pointer-events-auto flex items-center bg-white shadow-sm rounded-lg overflow-hidden divide-x divide-default">
      <EditBtn
        onClick={() => reorderBeads(idx, (idx - 1 + n) % n)}
        disabled={!hasSelection}
        label="Move bead back"
        title="Move bead back"
      >
        <ArrowUp size={22} />
      </EditBtn>
      <EditBtn
        onClick={() => reorderBeads(idx, (idx + 1) % n)}
        disabled={!hasSelection}
        label="Move bead forward"
        title="Move bead forward"
      >
        <ArrowDown size={22} />
      </EditBtn>
      <EditBtn
        onClick={() => editSelectedBead && duplicateBead(editSelectedBead.instanceId)}
        disabled={!hasSelection}
        label="Duplicate bead"
        title="Duplicate bead"
      >
        <CopyPlus size={22} />
      </EditBtn>
      <EditBtn onClick={() => reverseBracelet()} label="Reverse bracelet" title="Reverse Bracelet">
        <Repeat2 size={22} />
      </EditBtn>
      <EditBtn
        onClick={() => editSelectedBead && removeBead(editSelectedBead.instanceId)}
        disabled={!hasSelection}
        label="Delete bead"
        title="Delete bead"
      >
        <Trash2 size={22} />
      </EditBtn>
      <EditBtn
        onClick={toggleEditViewMode}
        label={editViewMode === 'top' ? 'Switch to side view' : 'Switch to top view'}
        title={editViewMode === 'top' ? 'Switch to side view' : 'Switch to top view'}
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
  title,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title}
      className={`flex items-center justify-center px-4 py-3 transition-colors ${
        disabled
          ? "cursor-not-allowed text-grey pointer-events-none"
          : "text-color-base/70 hover:bg-light-grey/50 hover:text-color-base"
      }`}
    >
      {children}
    </button>
  );
}
