"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlignJustify, ChartNoAxesGantt, ArrowUp, ArrowDown, ArrowLeftRight, CopyPlus, Repeat2, Trash2, Info, Undo2, Redo2 } from "lucide-react";

import { useStore } from "@/lib/store";

import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import { beadFits, braceletArc, usedArc } from "@/lib/bead-layout";

import { EditModeHelp } from "./EditModeHelp";
import { Tooltip } from "@/components/ui/Tooltip";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function EditModeToolbar() {
  const {
    isEditMode,
    editSelectedIds,
    beads,
    braceletSize,
    reorderBeads,
    reorderBeadsGroup,
    duplicateBead,
    duplicateGroup,
    removeBead,
    clearEditSelection,
    selectBead,
    selectedBead,
    clearSelectedBead,
    toggleEditMode,
    undo,
    redo,
    editReplaceMode,
    editReplaceNarrowedIds,
    replaceSeedTargetIds,
    setEditReplaceMode,
    viewMode,
    isEvenlySpaced,
    toggleEvenlySpaced,
  } = useStore((s) => ({
    isEditMode: s.isEditMode,
    editSelectedIds: s.editSelectedIds,
    beads: s.beads,
    braceletSize: s.braceletSize,
    reorderBeads: s.reorderBeads,
    reorderBeadsGroup: s.reorderBeadsGroup,
    duplicateBead: s.duplicateBead,
    duplicateGroup: s.duplicateGroup,
    removeBead: s.removeBead,
    clearEditSelection: s.clearEditSelection,
    selectBead: s.selectBead,
    selectedBead: s.selectedBead,
    clearSelectedBead: s.clearSelectedBead,
    toggleEditMode: s.toggleEditMode,
    undo: s.undo,
    redo: s.redo,
    editReplaceMode: s.editReplaceMode,
    editReplaceNarrowedIds: s.editReplaceNarrowedIds,
    replaceSeedTargetIds: s.replaceSeedTargetIds,
    setEditReplaceMode: s.setEditReplaceMode,
    viewMode: s.viewMode,
    isEvenlySpaced: s.isEvenlySpaced,
    toggleEvenlySpaced: s.toggleEvenlySpaced,
  }));

  const n = beads.length;
  const hasSelection = editSelectedIds.length > 0;
  const isSingleSelection = editSelectedIds.length === 1;

  // The set bulk actions (duplicate / delete) act on. In replace mode that's the
  // narrowed target — charms/beads via editReplaceNarrowedIds, seeds via
  // replaceSeedTargetIds (e.g. "Small Seed" picked from the type list) — otherwise
  // the normal edit selection.
  const replaceTargetIds = editReplaceNarrowedIds ?? replaceSeedTargetIds;
  const bulkTargetIds = editReplaceMode && replaceTargetIds ? replaceTargetIds : editSelectedIds;
  const hasDeletable = bulkTargetIds.length > 0;

  // Check whether all target beads fit as duplicates
  const radius = BRACELET_SIZE_RADIUS[braceletSize];
  const gapMm = Math.round((braceletArc(radius) - usedArc(beads)) * 1000 * 10) / 10;
  const hasGap = gapMm > 0;

  const canDuplicate = bulkTargetIds.length > 0 && (() => {
    let tempList = [...beads];
    for (const id of bulkTargetIds) {
      const bead = beads.find(b => b.instanceId === id);
      if (!bead || !beadFits(tempList, bead, radius)) return false;
      tempList = [...tempList, bead];
    }
    return true;
  })();

  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const duplicateErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDuplicate = useCallback(() => {
    const err = duplicateGroup(bulkTargetIds);
    if (err) {
      if (duplicateErrorTimer.current) clearTimeout(duplicateErrorTimer.current);
      setDuplicateError(err);
      duplicateErrorTimer.current = setTimeout(() => setDuplicateError(null), 3000);
    }
  }, [duplicateGroup, bulkTargetIds]);

  // Index of the single selected bead — used for arrow-key reordering
  const singleIdx = isSingleSelection
    ? beads.findIndex((b) => b.instanceId === editSelectedIds[0])
    : -1;

  // Sorted bead indices for the full selection (multi-select move)
  const groupIndices = useMemo(() =>
    editSelectedIds
      .map((id) => beads.findIndex((b) => b.instanceId === id))
      .filter((i) => i !== -1)
      .sort((a, b) => a - b),
    [editSelectedIds, beads],
  );

  // Single-bead move wraps around; multi-select move stops at the boundary
  const canMoveBack    = isSingleSelection ? singleIdx !== -1
    : groupIndices.length > 1 && groupIndices[0] > 0;
  const canMoveForward = isSingleSelection ? singleIdx !== -1
    : groupIndices.length > 1 && groupIndices[groupIndices.length - 1] < n - 1;

  const handleMoveBack = useCallback(() => {
    if (isSingleSelection) {
      reorderBeads(singleIdx, (singleIdx - 1 + n) % n);
    } else if (groupIndices.length > 1) {
      reorderBeadsGroup(groupIndices, groupIndices[0], groupIndices[0] - 1);
    }
  }, [isSingleSelection, reorderBeads, singleIdx, n, groupIndices, reorderBeadsGroup]);

  const handleMoveForward = useCallback(() => {
    if (isSingleSelection) {
      reorderBeads(singleIdx, (singleIdx + 1) % n);
    } else if (groupIndices.length > 1) {
      const last = groupIndices[groupIndices.length - 1];
      reorderBeadsGroup(groupIndices, last, last + 1);
    }
  }, [isSingleSelection, reorderBeads, singleIdx, n, groupIndices, reorderBeadsGroup]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      switch (e.key) {
        case "ArrowUp":
        case "ArrowLeft":
          if (!canMoveBack) return;
          e.preventDefault();
          handleMoveBack();
          break;

        case "ArrowDown":
        case "ArrowRight":
          if (!canMoveForward) return;
          e.preventDefault();
          handleMoveForward();
          break;

        case "Delete":
        case "Backspace":
          if (bulkTargetIds.length === 0) return;
          e.preventDefault();
          bulkTargetIds.forEach((id) => removeBead(id));
          break;

        case "d":
          if (!canDuplicate) return;
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handleDuplicate();
          }
          break;

        case "Escape":
          e.preventDefault();
          clearEditSelection();
          if (e.metaKey || e.ctrlKey) {
            toggleEditMode();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode, editSelectedIds, bulkTargetIds, singleIdx, n, hasSelection, canMoveBack, canMoveForward, canDuplicate, handleMoveBack, handleMoveForward, reorderBeads, removeBead, handleDuplicate, clearEditSelection, undo, redo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isEditMode) return null;

  return (
    <div className="flex flex-col">
      <SectionHeading className="text-[11px] mb-[2px] text-color-base/60">Edit Tools</SectionHeading>
      <div className="flex gap-2 xl:gap-3">
        <div className="pointer-events-auto flex items-center bg-white shadow-sm rounded-[2px] divide-x divide-default shadow-sm rounded-[2px]">
          <Tooltip content={
            !hasSelection ? "Select item(s) to move"
            : !canMoveBack ? "Selection is at the start"
            : isSingleSelection ? "Move item back"
            : "Move selection back"
          } placement="bottom">
            <EditBtn
              onClick={handleMoveBack}
              disabled={!canMoveBack}
              label="Move back"
            >
              <ArrowUp size={22} />
            </EditBtn>
          </Tooltip>
          <Tooltip content={
            !hasSelection ? "Select item(s) to move"
            : !canMoveForward ? "Selection is at the end"
            : isSingleSelection ? "Move item forward"
            : "Move selection forward"
          } placement="bottom">
            <EditBtn
              onClick={handleMoveForward}
              disabled={!canMoveForward}
              label="Move forward"
            >
              <ArrowDown size={22} />
            </EditBtn>
          </Tooltip>
          <Tooltip
            content={
              duplicateError ? duplicateError
              : bulkTargetIds.length > 0 && !canDuplicate ? "Bracelet is too full to duplicate"
              : bulkTargetIds.length === 0 ? "Select item(s) to duplicate"
              : bulkTargetIds.length > 1 ? "Duplicate group"
              : "Duplicate item"
            }
            placement="bottom"
          >
            <EditBtn
              onClick={handleDuplicate}
              disabled={!canDuplicate}
              label={bulkTargetIds.length > 1 ? "Duplicate group" : "Duplicate bead"}
              className={duplicateError ? "bg-red-50" : ""}
            >
              <CopyPlus size={22} className={duplicateError ? "text-red-500" : ""} />
            </EditBtn>
          </Tooltip>
          {viewMode === '3D' && (
            <Tooltip
              content={
                !hasGap
                  ? "No gap to distribute (bracelet is full)"
                  : isEvenlySpaced
                    ? `Revert even bead gap (currently distributing ${gapMm}mm)`
                    : `Distribute ${gapMm}mm gap evenly`
              }
              placement="bottom"
            >
              <EditBtn
                onClick={toggleEvenlySpaced}
                disabled={!hasGap}
                label={isEvenlySpaced ? "Revert even bead gap" : "Distribute spacing evenly"}
              >
                {isEvenlySpaced ? <ChartNoAxesGantt size={22} /> : <AlignJustify size={22} />}
              </EditBtn>
            </Tooltip>
          )}
          <Tooltip content="Replace beads" placement="bottom">
            <EditBtn
              onClick={() => setEditReplaceMode(!editReplaceMode)}
              label="Replace beads"
              className={editReplaceMode ? "bg-navy hover:bg-navy/80" : ""}
            >
              <ArrowLeftRight size={22} className={editReplaceMode ? "text-white" : ""} />
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
          <Tooltip content={hasDeletable ? ( "Delete items" ) : ("Select item(s) to delete")} placement="bottom">
            <EditBtn
              onClick={() => bulkTargetIds.forEach((id) => removeBead(id))}
              disabled={!hasDeletable}
              label="Delete bead"
            >
              <Trash2 size={22} />
            </EditBtn>
          </Tooltip>
        </div>
        <EditModeHelp />
      </div>
    </div>
  );
}

export function EditBtn({
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
      className={`flex items-center justify-center px-3 py-2 xl:px-4 xl:py-3 transition-colors ${
        disabled
          ? "cursor-not-allowed text-grey pointer-events-none"
          : "text-color-base/70 hover:bg-light-blue/50 hover:text-color-base"
      } ${className}`}
    >
      {children}
    </button>
  );
}