/**
 * useSceneItemInteraction.ts
 *
 * Shared pointer + selection logic for the three on-cord scene items
 * (BeadOnBracelet, SeedSegmentOnBracelet, SpacerOnBracelet). These previously
 * each carried an identical copy of the click / drag-threshold / cursor
 * handlers and the selection-state derivation.
 *
 * Behaviour (identical across all item types):
 *   • Normal click (view mode):      open the info panel for this item.
 *   • Plain click (edit mode):       toggle edit selection, close info panel.
 *   • Cmd/Ctrl+click (edit mode):    open info panel AND toggle edit selection.
 *   • Pointer down past DRAG_THRESHOLD (edit mode): begin drag-to-reorder.
 *   • Hover (edit mode):             grab / grabbing cursor.
 *
 * The store slice is read via `useShallow` so an item only re-renders when one
 * of these specific fields changes — not on every unrelated store update.
 */

import { useState } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import {
  HIGHLIGHT_SELECT_COLOR,
  EDIT_MODE_HIGHLIGHT_SELECT_COLOR,
} from "@/lib/constants";
import { beadMatchKey } from "@/lib/seed-bead-utils";
import type { PlacedBead } from "@/types";

/** Pixels of pointer movement before a drag initiates (prevents jump on click). */
const DRAG_THRESHOLD = 4;

interface SceneItemInteractionOptions {
  /** When true, clicks are ignored (read-only / locked design). */
  isLocked?: boolean;
  /** Called when a drag past the threshold begins, with this item's slot index. */
  onDragStart?: (index: number) => void;
  /**
   * When true, the item is also highlighted while "select all of type" is active
   * and matches this item's product id. Only meaningful for real beads — spacers
   * and seed segments use unique ids where this never matches.
   */
  selectAllOfType?: boolean;
  /** Overrides the default edit-mode highlight color (e.g. group color in replace mode). */
  selectionColor?: string;
}

export interface SceneItemInteraction {
  isSelected: boolean;
  highlightColor: string;
  showHoverRing: boolean;
  isEditMode: boolean;
  handleClick: (e: ThreeEvent<MouseEvent>) => void;
  handlePointerDown: (e: ThreeEvent<PointerEvent>) => void;
  handlePointerEnter: () => void;
  handlePointerLeave: () => void;
}

export function useSceneItemInteraction(
  bead: PlacedBead,
  slotIndex: number,
  { isLocked = false, onDragStart, selectAllOfType = false, selectionColor }: SceneItemInteractionOptions = {},
): SceneItemInteraction {
  const { gl } = useThree();
  const [isHovered, setIsHovered] = useState(false);


  const {
    selectBead,
    selectedBead,
    editSelectedIds,
    groups,
    editReplaceMode,
    toggleEditBead,
    setEditSelectedIds,
    clearSelectedBead,
    clearEditSelection,
    isEditMode,
    selectAllActive,
    replaceSeedTargetIds,
    canvasTool,
    dragFromPanel,
    reorderDragLabel,
  } = useStore(
    useShallow((s) => ({
      selectBead:           s.selectBead,
      selectedBead:         s.selectedBead,
      editSelectedIds:      s.editSelectedIds,
      groups:               s.groups,
      editReplaceMode:      s.editReplaceMode,
      toggleEditBead:       s.toggleEditBead,
      setEditSelectedIds:   s.setEditSelectedIds,
      clearSelectedBead:    s.clearSelectedBead,
      clearEditSelection:   s.clearEditSelection,
      isEditMode:           s.isEditMode,
      selectAllActive:      s.selectAllActive,
      replaceSeedTargetIds: s.replaceSeedTargetIds,
      canvasTool:           s.canvasTool,
      dragFromPanel:        s.dragFromPanel,
      reorderDragLabel:     s.reorderDragLabel,
    })),
  );

  // Seed segments queued for replacement light up regardless of edit mode.
  const isSeedReplaceTarget = replaceSeedTargetIds?.includes(bead.instanceId) ?? false;

  // "Select all" on a seed in the info window highlights every segment of the
  // same kind (size + shape) — seeds group by seed key, not product id, so the
  // product-id branch below never catches them.
  const isSeedSelectAll =
    selectAllActive &&
    !!bead.seedConfig &&
    !!selectedBead &&
    !!selectedBead.seedConfig &&
    beadMatchKey(bead) === beadMatchKey(selectedBead);

  const isSelected = isSeedReplaceTarget || isSeedSelectAll || (isEditMode
    ? editSelectedIds.includes(bead.instanceId) ||
      (editReplaceMode && groups.some(g => g.instanceIds.includes(bead.instanceId)))
    : selectedBead?.instanceId === bead.instanceId ||
      (selectAllOfType && selectAllActive && selectedBead?.product.id === bead.product.id));

  const highlightColor = isEditMode
    ? (selectionColor ?? EDIT_MODE_HIGHLIGHT_SELECT_COLOR)
    : HIGHLIGHT_SELECT_COLOR;

  function handleClick(e: ThreeEvent<MouseEvent>) {
    if (canvasTool === 'look') return;   // look tool: don't select, let the camera move
    e.stopPropagation();
    if (isLocked) return;
    if (isEditMode) {
      const ne = e.nativeEvent;
      const beadGroup = groups.find(g => g.instanceIds.includes(bead.instanceId));
      // Read live store state — the closure value of editSelectedIds can be stale
      // because handlePointerDown may have mutated it before the click event fires.
      // Also guard allIn against empty selection: [].every(fn) is vacuously true,
      // which would wrongly deselect a group the user is clicking for the first time.
      const currentIds = useStore.getState().editSelectedIds;
      function toggleGroup() {
        const allIn = currentIds.length > 0 && beadGroup!.instanceIds.every(id => currentIds.includes(id));
        setEditSelectedIds(
          allIn
            ? currentIds.filter(id => !beadGroup!.instanceIds.includes(id))
            : [...new Set([...currentIds, ...beadGroup!.instanceIds])],
        );
      }
      if (ne && (ne.metaKey || ne.ctrlKey)) {
        selectBead(bead);
        if (beadGroup) toggleGroup(); else toggleEditBead(bead.instanceId);
      } else {
        clearSelectedBead();
        if (beadGroup) toggleGroup(); else toggleEditBead(bead.instanceId);
      }
    } else {
      selectBead(bead);
    }
  }

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    if (!isEditMode) return;
    if (canvasTool === 'look') return;   // look tool: let camera-controls move the view
    e.stopPropagation();

    const startX = e.nativeEvent.clientX;
    const startY = e.nativeEvent.clientY;

    const beadGroup = groups.find(g => g.instanceIds.includes(bead.instanceId));
    const isInSelection = beadGroup != null || editSelectedIds.includes(bead.instanceId);

    function onMove(moveEvent: PointerEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
        // Prime the group selection now — just before starting the drag —
        // handleDragStart reads getState() so it will see the full group.
        // Done here (not at pointer-down) so it doesn't conflict with handleClick.
        if (beadGroup) setEditSelectedIds(beadGroup.instanceIds);
        // Keep the selection alive when dragging a selected bead so the group
        // can be detected downstream. Clear it only for single-bead drags.
        if (!isInSelection) clearEditSelection();
        clearSelectedBead();
        gl.domElement.style.cursor = "grabbing";
        onDragStart?.(slotIndex);
        cleanup();
      }
    }

    function onUp() {
      cleanup();
    }

    function cleanup() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

    function handlePointerEnter() {
    setIsHovered(true);
    if (!isEditMode || canvasTool === 'look') return;
    gl.domElement.style.cursor = "grab";
  }

  function handlePointerLeave() {
    setIsHovered(false);
    if (!isEditMode || canvasTool === 'look') return;
    gl.domElement.style.cursor = "";
  }

  // Edit-mode rollover ring — suppressed once the item is already selected.
  // Suppress the rollover hint while any drag is in progress, so the only moving
  // highlight on the canvas is the drag/selection indicator itself.
  const isDragActive = dragFromPanel !== null || reorderDragLabel !== null;
  const showHoverRing = isEditMode && isHovered && !isSelected && canvasTool !== 'look' && !isDragActive;

  return { isSelected, isEditMode, highlightColor, showHoverRing, handleClick, handlePointerDown, handlePointerEnter, handlePointerLeave };
}