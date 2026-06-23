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

import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import {
  HIGHLIGHT_SELECT_COLOR,
  EDIT_MODE_HIGHLIGHT_SELECT_COLOR,
} from "@/lib/constants";
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

  const {
    selectBead,
    selectedBead,
    editSelectedIds,
    editSelectionGroups,
    toggleEditBead,
    clearSelectedBead,
    clearEditSelection,
    isEditMode,
    selectAllActive,
  } = useStore(
    useShallow((s) => ({
      selectBead:           s.selectBead,
      selectedBead:         s.selectedBead,
      editSelectedIds:      s.editSelectedIds,
      editSelectionGroups:  s.editSelectionGroups,
      toggleEditBead:       s.toggleEditBead,
      clearSelectedBead:    s.clearSelectedBead,
      clearEditSelection:   s.clearEditSelection,
      isEditMode:           s.isEditMode,
      selectAllActive:      s.selectAllActive,
    })),
  );

  const isSelected = isEditMode
    ? editSelectedIds.includes(bead.instanceId) ||
      editSelectionGroups.some(g => g.includes(bead.instanceId))
    : selectedBead?.instanceId === bead.instanceId ||
      (selectAllOfType && selectAllActive && selectedBead?.product.id === bead.product.id);

  const highlightColor = isEditMode
    ? (selectionColor ?? EDIT_MODE_HIGHLIGHT_SELECT_COLOR)
    : HIGHLIGHT_SELECT_COLOR;

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (isLocked) return;
    if (isEditMode) {
      const ne = e.nativeEvent;
      if (ne && (ne.metaKey || ne.ctrlKey)) {
        // Cmd/Ctrl+click opens the info panel for this item and toggles selection.
        selectBead(bead);
        toggleEditBead(bead.instanceId);
      } else {
        // Plain click toggles edit selection; close info panel if open.
        clearSelectedBead();
        toggleEditBead(bead.instanceId);
      }
    } else {
      selectBead(bead);
    }
  }

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    if (!isEditMode) return;
    e.stopPropagation();

    const startX = e.nativeEvent.clientX;
    const startY = e.nativeEvent.clientY;

    function onMove(moveEvent: PointerEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
        clearEditSelection();
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
    if (!isEditMode) return;
    gl.domElement.style.cursor = "grab";
  }

  function handlePointerLeave() {
    if (!isEditMode) return;
    gl.domElement.style.cursor = "";
  }

  return { isSelected, highlightColor, handleClick, handlePointerDown, handlePointerEnter, handlePointerLeave };
}