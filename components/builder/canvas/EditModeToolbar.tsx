"use client";

import { useEffect } from "react";
import { ArrowUp, ArrowDown, CopyPlus, Repeat2, Trash2, SwitchCamera, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { beadFits } from "@/lib/bead-layout";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { Tooltip } from "@/components/ui/Tooltip";

export function EditModeToolbar() {
  const {
    isEditMode,
    editSelectedIds,
    beads,
    braceletSize,
    reorderBeads,
    duplicateBead,
    reverseBracelet,
    removeBead,
    editViewMode,
    toggleEditViewMode,
    clearEditSelection,
    selectBead,
    selectedBead,
    clearSelectedBead,
  } = useStore((s) => ({
    isEditMode: s.isEditMode,
    editSelectedIds: s.editSelectedIds,
    beads: s.beads,
    braceletSize: s.braceletSize,
    reorderBeads: s.reorderBeads,
    duplicateBead: s.duplicateBead,
    reverseBracelet: s.reverseBracelet,
    removeBead: s.removeBead,
    editViewMode: s.editViewMode,
    toggleEditViewMode: s.toggleEditViewMode,
    clearEditSelection: s.clearEditSelection,
    selectBead: s.selectBead,
    selectedBead: s.selectedBead,
    clearSelectedBead: s.clearSelectedBead,
  }));

  const n = beads.length;
  const hasSelection = editSelectedIds.length > 0;
  const isSingleSelection = editSelectedIds.length === 1;

  // Check if any selected bead can actually fit a duplicate on the bracelet
  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const canDuplicate = hasSelection && editSelectedIds.some((id) => {
    const bead = beads.find((b) => b.instanceId === id);
    return bead ? beadFits(beads, bead, radius) : false;
  });

  // Index of the single selected bead — used for arrow-key reordering
  const singleIdx = isSingleSelection
    ? beads.findIndex((b) => b.instanceId === editSelectedIds[0])
    : -1;

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case "ArrowUp":
        case "ArrowLeft":
          if (singleIdx === -1) return;
          e.preventDefault();
          reorderBeads(singleIdx, (singleIdx - 1 + n) % n);
          break;

        case "ArrowDown":
        case "ArrowRight":
          if (singleIdx === -1) return;
          e.preventDefault();
          reorderBeads(singleIdx, (singleIdx + 1) % n);
          break;

        case "Delete":
        case "Backspace":
          if (!hasSelection) return;
          e.preventDefault();
          editSelectedIds.forEach((id) => removeBead(id));
          break;

        case "d":
          if (!canDuplicate) return;
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            editSelectedIds.forEach((id) => duplicateBead(id));
          }
          break;

        case "Escape":
          e.preventDefault();
          clearEditSelection();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode, editSelectedIds, singleIdx, n, hasSelection, canDuplicate, reorderBeads, removeBead, duplicateBead, clearEditSelection]);

  if (!isEditMode) return null;

  return (
    <div className="pointer-events-auto flex items-center bg-white shadow-sm rounded-[3px] divide-x divide-default">
      <Tooltip content={singleIdx !== -1 ? ( "Move item back" ) : ("Select one item to move")} placement="bottom">
        <EditBtn
          onClick={() => reorderBeads(singleIdx, (singleIdx - 1 + n) % n)}
          disabled={singleIdx === -1}
          label="Move item back"
        >
          <ArrowUp size={22} />
        </EditBtn>
      </Tooltip>
      <Tooltip content={singleIdx !== -1 ? ( "Move item forward" ) : ("Select one item to move")} placement="bottom">
        <EditBtn
          onClick={() => reorderBeads(singleIdx, (singleIdx + 1) % n)}
          disabled={singleIdx === -1}
          label="Move item forward"
        >
          <ArrowDown size={22} />
        </EditBtn>
      </Tooltip>
      <Tooltip content={hasSelection && !canDuplicate ? ( "Bracelet is full" ) : !hasSelection ? ("Select item(s) to duplicate") : ("Duplicate item")} placement="bottom">
        <EditBtn
          onClick={() => editSelectedIds.forEach((id) => duplicateBead(id))}
          disabled={!canDuplicate}
          label={hasSelection && !canDuplicate ? "Bracelet is full" : "Duplicate bead"}
        >
          <CopyPlus size={22} />
        </EditBtn>
      </Tooltip>
      <Tooltip content="Reverse order" placement="bottom">
        <EditBtn onClick={() => reverseBracelet()} label="Reverse bracelet">
          <Repeat2 size={22} />
        </EditBtn>
      </Tooltip>
      <Tooltip content={isSingleSelection
        ? selectedBead?.instanceId === editSelectedIds[0]
          ? "Close item info window"
          : "Open item info window"
        : "Select one item to view info"
      } placement="bottom">
        <EditBtn
          onClick={() => {
            if (!isSingleSelection) return;
            const bead = beads.find((b) => b.instanceId === editSelectedIds[0]);
            if (!bead) return;
            
            // If this bead's info is already open, close it — otherwise open it
            if (selectedBead?.instanceId === bead.instanceId) {
              clearSelectedBead();
            } else {
              selectBead(bead);
            }
          }}
          disabled={!isSingleSelection}
          label="Bead info"
          className={`${
                  (selectedBead?.instanceId) && "bg-navy color-white hover:bg-navy/80"
                }`}
        >
          <Info size={22} className={`${selectedBead?.instanceId && "text-white"}`} />
        </EditBtn>
      </Tooltip>
      <Tooltip content={hasSelection ? ( "Delete items" ) : ("Select item(s) to delete")} placement="bottom">
        <EditBtn
          onClick={() => editSelectedIds.forEach((id) => removeBead(id))}
          disabled={!hasSelection}
          label="Delete bead"
        >
          <Trash2 size={22} />
        </EditBtn>
      </Tooltip>
      <Tooltip content={editViewMode === 'top' ? 'Switch to side view' : 'Switch to top view'} placement="bottom-start">
        <EditBtn
          onClick={toggleEditViewMode}
          label={editViewMode === 'top' ? 'Switch to side view' : 'Switch to top view'}
        >
          <SwitchCamera size={22} />
        </EditBtn>
      </Tooltip>
    </div>
  );
}

function EditBtn({
  onClick,
  disabled = false,
  label,
  children,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex items-center justify-center px-4 py-3 transition-colors ${
        disabled
          ? "cursor-not-allowed text-grey pointer-events-none"
          : "text-color-base/70 hover:bg-light-blue/50 hover:text-color-base"
      } ${className}`}
    >
      {children}
    </button>
  );
}