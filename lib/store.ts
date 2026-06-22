/**
 * store.ts
 *
 * Manages placed beads and the currently selected bead (info panel state).
 * Persists to localStorage so the bracelet survives a page refresh.
 * UI state (selectedBead) is intentionally NOT persisted.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Bracelet, BeadProduct, PlacedBead, BandMaterial, BraceletSize, SeedSegmentConfig } from "@/types";
import { beadFits, usedArc, braceletArc } from "@/lib/bead-layout";
import { BRACELET_SIZE_RADIUS, DEFAULT_BRACELET_NAME } from "@/lib/constants";
import type { CameraControls } from "@react-three/drei";
import type { WebGLRenderer, Scene as ThreeScene, Camera } from "three";

const UNDO_LIMIT = 50;

type CanvasSnapshot = {
  beads:               PlacedBead[];
  braceletSize:        BraceletSize;
  bandMaterial:        BandMaterial;
  hairtieColor:        string;
  braceletName:        string;
  braceletDescription: string;
};

type PersistedState = {
  beads?: PlacedBead[];
  braceletName?: string;
  braceletDescription?: string;
  bandMaterial?: string;
  braceletSize?: string;
  activeDesignId?: number | null;
  activePatternId?: number | null;
};

interface Store {
  beads: PlacedBead[];
  braceletName: string;
  braceletDescription: string;

  /** The bead currently tapped in the 3D scene — drives the info panel. */
  selectedBead: PlacedBead | null;

  /** Add a bead to the next available slot. Returns an error string or null. */
  addBead: (product: BeadProduct) => string | null;

  /** Add a seed bead segment. Returns an error string or null. */
  addSeedSegment: (product: BeadProduct, seedConfig: SeedSegmentConfig) => string | null;

  /** Remove a bead by instanceId. Closes the panel if that bead was selected. */
  removeBead: (instanceId: string) => void;

  /** Remove all beads and close the panel. */
  clearBeads: () => void;

  /** Reset to a blank bracelet — clears beads, name, description, and activeDesignId. */
  resetBracelet: () => void;

  /** Start a new bracelet preserving the current size and material — used by
   *  the "New Bracelet" button so the user's preferred size is not discarded. */
  startNewBracelet: () => void;

  copyBracelet: () => void;

  /** Open the info panel for a specific bead. */
  selectBead: (bead: PlacedBead) => void;

  /** Close the info panel without removing anything. */
  clearSelectedBead: () => void;

  /** Ephemeral — instanceId of the bead currently being replaced; null when not in replace mode. */
  replaceTargetInstanceId: string | null;
  startReplaceMode: (instanceId: string) => void;
  cancelReplaceMode: () => void;
  /** Swap the target bead's product in-place. Returns an error string or null on success. */
  replaceBead: (instanceId: string, newProduct: BeadProduct) => string | null;

  /** Ephemeral — product id of the type being replaced (all instances); null when not in replace-all mode. */
  replaceAllTargetProductId: number | null;
  startReplaceAllMode: (productId: number) => void;
  /** Swap all beads of the given product id in-place. Returns an error string or null on success. */
  replaceAllBeads: (productId: number, newProduct: BeadProduct) => string | null;

  /** Ephemeral — true when edit-mode replace tool is active. */
  editReplaceMode: boolean;
  /** Ephemeral — subset of editSelectedIds being targeted; null = all selected. */
  editReplaceNarrowedIds: string[] | null;
  /** Ephemeral — explicit frozen groups for multi-group replace. Empty = auto product-type grouping. */
  editSelectionGroups: string[][];
  setEditReplaceMode: (active: boolean) => void;
  setEditReplaceNarrowedIds: (ids: string[] | null) => void;
  /** Freeze the current editSelectedIds as a new explicit group, then clear the active selection. */
  saveCurrentSelectionAsGroup: () => void;
  /** Swap all beads whose instanceId is in the provided list. Returns error string or null.
   *  Optional maxToReplace caps total replacements across all runs (used when fewer beads fit than were selected). */
  replaceEditSelectedBeads: (instanceIds: string[], newProduct: BeadProduct, maxToReplace?: number) => string | null;

  /** Selecting all of beads with bead info dialog */
  selectAllActive: boolean;
  selectAllOfType: () => void;
  removeAllOfType: () => void;

  /** Replace the entire bead list — used by the JSON importer. */
  loadBeads: (beads: PlacedBead[], name?: string) => void;

  setBraceletName: (name: string) => void;
  setBraceletDescription: (description: string) => void;

  /** Move a bead from one index to another — drives the reorder panel. **/
  reorderBeads: (fromIndex: number, toIndex: number) => void;

  /** Insert a copy of the bead immediately after it. No-op if bracelet is full. */
  duplicateBead: (instanceId: string) => void;

  /** Reverse the entire bead order. */
  reverseBracelet: () => void;

  bandMaterial: BandMaterial;
  braceletSize: BraceletSize;
  hairtieColor: string;
  setbandMaterial: (m: BandMaterial) => void;
  setBraceletSize: (s: BraceletSize) => void;
  setHairtieColor: (c: string) => void;

  /** Ephemeral — not persisted. Tracks beads whose GLB failed to load. */
  beadLoadErrors: { instanceId: string; name: string; filename: string }[];
  addBeadLoadError: (instanceId: string, name: string, filename: string) => void;

  /** Ephemeral — not persisted. Bead(s) selected inside edit mode — drives EditModeToolbar. */
  editSelectedIds: string[];
  /** Replace selection with a single bead (normal click). */
  selectEditBead: (instanceId: string) => void;
  /** Toggle a bead in/out of the selection (Cmd/Ctrl+click). */
  toggleEditBead: (instanceId: string) => void;
  /** Clear the entire edit selection. */
  clearEditSelection: () => void;

  /** Ephemeral — not persisted. True when the canvas is in drag-to-reorder edit mode. */
  isEditMode: boolean;
  toggleEditMode: () => void;

  /** Ephemeral — when true, colliding charms are highlighted with an orange ring. */
  showCharmCollisions: boolean;
  setShowCharmCollisions: (show: boolean) => void;

  /** Ephemeral — not persisted. Which camera view is active in edit mode. */
  editViewMode: 'top' | 'side';
  toggleEditViewMode: () => void;

  /** Ephemeral — not persisted. Which canvas view is active. */
  viewMode: '3D' | 'line';
  setViewMode: (mode: '3D' | 'line') => void;

  /** Ephemeral — not persisted. Bead being dragged from the selector panel onto the canvas. */
  dragFromPanel: BeadProduct | null;
  setDragFromPanel: (product: BeadProduct | null) => void;

  /** Insert a new bead at a specific slot index. Returns an error string or null. */
  insertBead: (product: BeadProduct, atIndex: number) => string | null;

  /** Ephemeral — not persisted. The WebGL canvas element registered by Scene. */
  canvasEl: HTMLCanvasElement | null;
  setCanvasEl: (el: HTMLCanvasElement | null) => void;

  controlsEl: CameraControls | null;
  setControlsEl: (controls: CameraControls | null) => void;

  /** Ephemeral — not persisted. WebGL renderer, scene, and camera registered by Scene for thumbnail capture. */
  glRenderer: WebGLRenderer | null;
  threeScene: ThreeScene | null;
  threeCamera: Camera | null;
  setGlRenderer: (r: WebGLRenderer | null) => void;
  setThreeScene: (s: ThreeScene | null) => void;
  setThreeCamera: (c: Camera | null) => void;

  /**
   * Persisted (see partialize + migrate, v3).
   * ID of the design currently on the canvas (set after a successful save or
   * when a design is loaded from the Saved Designs panel).
   * null means the canvas holds an unsaved / new bracelet.
   * Cleared when the user clears all beads (starting fresh).
   */
  activeDesignId: number | null;
  setActiveDesignId: (id: number | null) => void;

  /**
   * Persisted (see partialize + migrate, v4).
   * ID of the pattern being edited on the canvas. Set when the user clicks
   * "Edit pattern", cleared when they start a new bracelet or clear beads.
   * When set, the header shows a "Save Pattern" button that writes back to
   * PUT /patterns/:id instead of creating a new design.
   */
  activePatternId: number | null;
  setActivePatternId: (id: number | null) => void;

  /**
   * Ephemeral — not persisted.
   * When a panel tries to load a design while the canvas already has beads,
   * it calls setPendingDesign() instead of loadDesign() directly.
   * ConfirmReplaceDialog (rendered at the root) reads this and shows the
   * "Replace current bracelet?" modal. After the user confirms or discards,
   * pendingDesignOnLoad is called (closes the originating panel) and the
   * pending state is cleared.
   */
  pendingDesign: Bracelet | null;
  pendingDesignOnLoad: (() => void) | null;
  setPendingDesign: (design: Bracelet, onLoad: () => void) => void;
  clearPendingDesign: () => void;

  /**
   * Ephemeral — not persisted.
   * Set when the user clicks a pattern while the canvas already has beads.
   * ConfirmReplaceDialog reads this and shows a "Replace?" prompt.
   * After confirm/cancel the pending state is cleared.
   */
  pendingPattern: Bracelet | null;
  /** When true, confirming the pending pattern load sets activePatternId (edit mode). */
  pendingPatternEditMode: boolean;
  setPendingPattern: (pattern: Bracelet, editMode?: boolean) => void;
  clearPendingPattern: () => void;

  /** True when the bracelet has unsaved changes since the last save/load. */
  isDirty: boolean;
  /** Reset the dirty flag — called after a successful save. */
  markClean: () => void;

  /** Ephemeral — not persisted. Undo/redo history for bead mutations. */
  undoStack: CanvasSnapshot[];
  redoStack: CanvasSnapshot[];
  pushUndoSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  /** Ephemeral — temporarily hides spacer visuals during thumbnail capture. */
  spacersHiddenForCapture: boolean;
  setSpacersHiddenForCapture: (hidden: boolean) => void;
}

/** Persist the store to localStorage.
 * If fields change be sure to update the migrate function to convert the old data to the new format.
*/
export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      beads: [],
      selectedBead: null,
      braceletName: "New Bracelet",
      braceletDescription: "",
      bandMaterial: "stretchy" as BandMaterial,
      braceletSize: "medium" as BraceletSize,
      hairtieColor: "gray",
      beadLoadErrors: [],
      isEditMode: false,

      showCharmCollisions: false,
      setShowCharmCollisions: (show) => set({ showCharmCollisions: show }),
      editSelectedIds: [],
      editViewMode: 'top' as const,
      selectAllActive: false,
      viewMode: '3D' as const,
      dragFromPanel: null,
      replaceTargetInstanceId: null,
      replaceAllTargetProductId: null,
      editReplaceMode: false,
      editReplaceNarrowedIds: null,
      editSelectionGroups: [],
      canvasEl: null,
      activeDesignId: null,
      activePatternId: null,
      pendingDesign: null,
      pendingDesignOnLoad: null,
      pendingPattern: null,
      pendingPatternEditMode: false,
      controlsEl: null,
      glRenderer: null,
      threeScene: null,
      threeCamera: null,
      isDirty: false,
      markClean: () => set({ isDirty: false }),

      undoStack: [],
      redoStack: [],

      pushUndoSnapshot() {
        const s = get();
        const snapshot: CanvasSnapshot = {
          beads:               [...s.beads],
          braceletSize:        s.braceletSize,
          bandMaterial:        s.bandMaterial,
          hairtieColor:        s.hairtieColor,
          braceletName:        s.braceletName,
          braceletDescription: s.braceletDescription,
        };
        set((st) => ({
          undoStack: [snapshot, ...st.undoStack].slice(0, UNDO_LIMIT),
          redoStack: [],
        }));
      },

      undo() {
        const { undoStack, redoStack, beads, braceletSize, bandMaterial, hairtieColor, braceletName, braceletDescription } = get();
        if (undoStack.length === 0) return;
        const [snapshot, ...rest] = undoStack;
        const current: CanvasSnapshot = { beads: [...beads], braceletSize, bandMaterial, hairtieColor, braceletName, braceletDescription };
        set({ ...snapshot, undoStack: rest, redoStack: [current, ...redoStack], isDirty: true, selectedBead: null, editSelectedIds: [], replaceTargetInstanceId: null, replaceAllTargetProductId: null, editReplaceMode: false, editReplaceNarrowedIds: null, editSelectionGroups: [] });
      },

      redo() {
        const { undoStack, redoStack, beads, braceletSize, bandMaterial, hairtieColor, braceletName, braceletDescription } = get();
        if (redoStack.length === 0) return;
        const [snapshot, ...rest] = redoStack;
        const current: CanvasSnapshot = { beads: [...beads], braceletSize, bandMaterial, hairtieColor, braceletName, braceletDescription };
        set({ ...snapshot, redoStack: rest, undoStack: [current, ...undoStack], isDirty: true, selectedBead: null, editSelectedIds: [], replaceTargetInstanceId: null, replaceAllTargetProductId: null, editReplaceMode: false, editReplaceNarrowedIds: null, editSelectionGroups: [] });
      },

      spacersHiddenForCapture: false,
      setSpacersHiddenForCapture: (hidden) => set({ spacersHiddenForCapture: hidden }),

      addBead(product) {
        const radius = BRACELET_SIZE_RADIUS[get().braceletSize];
        if (!beadFits(get().beads, { product }, radius)) {
          return "Bracelet is full — no room for that bead.";
        }
        get().pushUndoSnapshot();
        set((s) => ({
          beads: [...s.beads, { instanceId: nanoid(), product }],
          isDirty: true,
        }));
        return null;
      },

      addSeedSegment(product, seedConfig) {
        const radius = BRACELET_SIZE_RADIUS[get().braceletSize];
        if (!beadFits(get().beads, { product }, radius)) {
          return "Bracelet is full — no room for that segment.";
        }
        get().pushUndoSnapshot();
        set((s) => ({
          beads: [...s.beads, { instanceId: nanoid(), product, seedConfig }],
          isDirty: true,
        }));
        return null;
      },

      removeBead(instanceId) {
        get().pushUndoSnapshot();
        set((s) => ({
          beads: s.beads.filter((b) => b.instanceId !== instanceId),
          selectedBead:
            s.selectedBead?.instanceId === instanceId ? null : s.selectedBead,
          editSelectedIds:
            s.editSelectedIds.filter((id) => id !== instanceId),
          beadLoadErrors: s.beadLoadErrors.filter((e) => e.instanceId !== instanceId),
          isDirty: true,
        }));
      },

      clearBeads() {
        get().pushUndoSnapshot();
        set({ beads: [], selectedBead: null, beadLoadErrors: [], activeDesignId: null, activePatternId: null, isDirty: false, replaceTargetInstanceId: null, replaceAllTargetProductId: null, editReplaceMode: false, editReplaceNarrowedIds: null, editSelectionGroups: [] });
      },

      resetBracelet: () => set({
        beads: [],
        braceletName: "New Bracelet",
        braceletDescription: "",
        activeDesignId: null,
        activePatternId: null,
        selectedBead: null,
        editSelectedIds: [],
        isDirty: false,
        braceletSize: "medium" as BraceletSize,
        bandMaterial: "stretchy" as BandMaterial,
        undoStack: [],
        redoStack: [],
        replaceTargetInstanceId: null,
        replaceAllTargetProductId: null,
        editReplaceMode: false,
        editReplaceNarrowedIds: null,
        editSelectionGroups: [],
      }),

      startNewBracelet: () => set({
        beads: [],
        braceletName: "New Bracelet",
        braceletDescription: "",
        activeDesignId: null,
        activePatternId: null,
        selectedBead: null,
        editSelectedIds: [],
        isDirty: false,
        undoStack: [],
        redoStack: [],
        replaceTargetInstanceId: null,
        replaceAllTargetProductId: null,
        editReplaceMode: false,
        editReplaceNarrowedIds: null,
        editSelectionGroups: [],
        // braceletSize and bandMaterial intentionally preserved
      }),

      copyBracelet: () =>
        set((s) => ({
          activeDesignId: null,      // detach from the saved design
          activePatternId: null,     // and from any pattern
          braceletName:
            s.braceletName && s.braceletName !== DEFAULT_BRACELET_NAME
              ? `Copy of ${s.braceletName}`
              : DEFAULT_BRACELET_NAME,
          isDirty: true,             // so Save creates a new bracelet
        })),

      selectBead(bead) {
        set({ selectedBead: bead, selectAllActive: false, replaceTargetInstanceId: null, replaceAllTargetProductId: null });
      },

      clearSelectedBead() {
        set({ selectedBead: null, selectAllActive: false, replaceTargetInstanceId: null, replaceAllTargetProductId: null });
      },

      startReplaceMode(instanceId) {
        set({ replaceTargetInstanceId: instanceId, replaceAllTargetProductId: null });
      },

      cancelReplaceMode() {
        set({ replaceTargetInstanceId: null, replaceAllTargetProductId: null, editReplaceMode: false, editReplaceNarrowedIds: null, editSelectionGroups: [] });
      },

      setEditReplaceMode(active) {
        if (active) {
          set({ editReplaceMode: true, replaceTargetInstanceId: null, replaceAllTargetProductId: null });
        } else {
          set({ editReplaceMode: false, editReplaceNarrowedIds: null, editSelectionGroups: [] });
        }
      },

      saveCurrentSelectionAsGroup() {
        const s = get();
        if (s.editSelectedIds.length === 0) return;
        set({
          editSelectionGroups: [...s.editSelectionGroups, s.editSelectedIds],
          editSelectedIds: [],
        });
      },

      setEditReplaceNarrowedIds(ids) {
        set({ editReplaceNarrowedIds: ids });
      },

      replaceEditSelectedBeads(instanceIds, newProduct, maxToReplace) {
        const s = get();
        const radius = BRACELET_SIZE_RADIUS[s.braceletSize];
        const limit = maxToReplace ?? instanceIds.length;

        // Sort selected beads by their current position in the array
        const positions = instanceIds
          .map(id => ({ id, idx: s.beads.findIndex(b => b.instanceId === id) }))
          .filter(x => x.idx !== -1)
          .sort((a, b) => a.idx - b.idx);

        if (positions.length === 0) return "Selected beads not found.";

        // Group into contiguous runs (adjacent slots in the bead array)
        const runs: Array<{ ids: string[] }> = [];
        let currentRun = { ids: [positions[0].id] };
        for (let i = 1; i < positions.length; i++) {
          if (positions[i].idx === positions[i - 1].idx + 1) {
            currentRun.ids.push(positions[i].id);
          } else {
            runs.push(currentRun);
            currentRun = { ids: [positions[i].id] };
          }
        }
        runs.push(currentRun);

        // Process last → first so earlier run indices are unaffected by later modifications
        let current = [...s.beads];
        let totalReplaced = 0;

        for (let r = runs.length - 1; r >= 0; r--) {
          const run = runs[r];
          const runIdSet = new Set(run.ids);

          const startIdx = current.findIndex(b => b.instanceId === run.ids[0]);
          if (startIdx === -1) continue;

          const withoutRun = current.filter(b => !runIdSet.has(b.instanceId));

          // Fill the freed arc with as many candidates as fit, capped by run length and remaining limit
          const runMax = Math.min(run.ids.length, limit - totalReplaced);
          const inserted: PlacedBead[] = [];
          let tempList = withoutRun;
          while (inserted.length < runMax && beadFits(tempList, { product: newProduct }, radius)) {
            const newBead: PlacedBead = { instanceId: nanoid(), product: newProduct };
            inserted.push(newBead);
            tempList = [...tempList, newBead];
          }

          totalReplaced += inserted.length;
          current = [
            ...withoutRun.slice(0, startIdx),
            ...inserted,
            ...withoutRun.slice(startIdx),
          ];
        }

        if (totalReplaced === 0) {
          return "No replacement beads fit in the available space.";
        }

        const replacedSet = new Set(instanceIds);
        const newGroups = s.editSelectionGroups
          .map(g => g.filter(id => !replacedSet.has(id)))
          .filter(g => g.length > 0);
        const newSelectedIds = s.editSelectedIds.filter(id => !replacedSet.has(id));
        const stillHasGroups = newGroups.length > 0 || newSelectedIds.length > 0;

        s.pushUndoSnapshot();
        set({
          beads: current,
          beadLoadErrors: s.beadLoadErrors.filter((e) => !replacedSet.has(e.instanceId)),
          editSelectionGroups: newGroups,
          editSelectedIds: newSelectedIds,
          editReplaceMode: stillHasGroups,
          editReplaceNarrowedIds: null,
          isDirty: true,
        });
        return null;
      },

      startReplaceAllMode(productId) {
        set({ replaceAllTargetProductId: productId, replaceTargetInstanceId: null });
      },

      replaceAllBeads(productId, newProduct) {
        const s = get();
        const radius = BRACELET_SIZE_RADIUS[s.braceletSize];
        const swapped = s.beads.map((b) =>
          b.product.id === productId ? { ...b, product: newProduct } : b
        );
        if (usedArc(swapped) > braceletArc(radius)) {
          return "Bracelet is full — no room for those beads.";
        }
        get().pushUndoSnapshot();
        set({
          beads: swapped,
          selectedBead: null,
          selectAllActive: false,
          replaceAllTargetProductId: null,
          isDirty: true,
        });
        return null;
      },

      replaceBead(instanceId, newProduct) {
        const s = get();
        const radius = BRACELET_SIZE_RADIUS[s.braceletSize];
        const withoutTarget = s.beads.filter((b) => b.instanceId !== instanceId);
        if (!beadFits(withoutTarget, { product: newProduct }, radius)) {
          return "Bracelet is full — no room for that bead.";
        }
        get().pushUndoSnapshot();
        set((s) => ({
          beads: s.beads.map((b) =>
            b.instanceId === instanceId ? { instanceId: b.instanceId, product: newProduct } : b
          ),
          selectedBead: null,
          replaceTargetInstanceId: null,
          beadLoadErrors: s.beadLoadErrors.filter((e) => e.instanceId !== instanceId),
          isDirty: true,
        }));
        return null;
      },

      selectAllOfType() {
        const { beads, selectedBead, isEditMode } = get();
        if (!selectedBead) return;
        const matchingIds = beads
          .filter((b) => b.product.id === selectedBead.product.id)
          .map((b) => b.instanceId);
        set({
          selectAllActive: true,
          ...(isEditMode ? { editSelectedIds: matchingIds } : {}),
        });
      },

      removeAllOfType() {
        const { beads, selectedBead } = get();
        if (!selectedBead) return;
        get().pushUndoSnapshot();
        const filtered = beads.filter((b) => b.product.id !== selectedBead.product.id);
        set({ beads: filtered, selectedBead: null, selectAllActive: false, editSelectedIds: [], isDirty: true });
      },

      loadBeads(beads, name) {
        set({ beads, selectedBead: null, editSelectedIds: [], isDirty: false, undoStack: [], redoStack: [], replaceTargetInstanceId: null, replaceAllTargetProductId: null, editReplaceMode: false, editReplaceNarrowedIds: null, editSelectionGroups: [], ...(name ? { braceletName: name } : {}) });
      },

      setBraceletName(name) {
        set({ braceletName: name, isDirty: true });
      },

      setBraceletDescription(description) {
        set({ braceletDescription: description, isDirty: true });
      },

      reorderBeads(fromIndex, toIndex) {
        get().pushUndoSnapshot();
        set((s) => {
          const arr = [...s.beads];
          const [moved] = arr.splice(fromIndex, 1);
          arr.splice(toIndex, 0, moved);
          return { beads: arr, isDirty: true };
        });
      },

      duplicateBead(instanceId) {
        const { beads, braceletSize } = get();
        const index = beads.findIndex((b) => b.instanceId === instanceId);
        if (index === -1) return;
        const bead = beads[index];
        const radius = BRACELET_SIZE_RADIUS[braceletSize];
        if (!beadFits(beads, bead, radius)) return;
        get().pushUndoSnapshot();
        const copy: PlacedBead = {
          instanceId: nanoid(),
          product: bead.product,
          ...(bead.seedConfig ? { seedConfig: bead.seedConfig } : {}),
        };
        set({ beads: [...beads.slice(0, index + 1), copy, ...beads.slice(index + 1)], isDirty: true });
      },

      reverseBracelet() {
        get().pushUndoSnapshot();
        set((s) => ({ beads: [...s.beads].reverse(), isDirty: true }));
      },

      setbandMaterial: (bandMaterial) => set({ bandMaterial, isDirty: true }),
      setBraceletSize: (braceletSize) => set({ braceletSize, isDirty: true }),
      setHairtieColor: (hairtieColor) => set({ hairtieColor, isDirty: true }),

      selectEditBead(instanceId) {
        set({ editSelectedIds: [instanceId] });
      },

      toggleEditBead(instanceId) {
        set((s) => {
          const exists = s.editSelectedIds.includes(instanceId);
          return {
            editSelectedIds: exists
              ? s.editSelectedIds.filter((id) => id !== instanceId)
              : [...s.editSelectedIds, instanceId],
          };
        });
      },

      clearEditSelection() {
        set({ editSelectedIds: [], editReplaceMode: false, editReplaceNarrowedIds: null, editSelectionGroups: [] });
      },

      toggleEditMode() {
        set((s) => ({
          isEditMode: !s.isEditMode,
          selectedBead: null,
          editSelectedIds: [],
          editViewMode: s.viewMode === 'line' ? 'side' : 'top',
          editReplaceMode: false,
          editReplaceNarrowedIds: null,
          editSelectionGroups: [],
        }));
      },

      toggleEditViewMode() {
        set((s) => ({ editViewMode: s.editViewMode === 'top' ? 'side' : 'top' }));
      },

      setViewMode(mode) {
        set((s) => ({
          viewMode: mode,
          editViewMode: s.isEditMode ? (mode === 'line' ? 'side' : 'top') : s.editViewMode,
        }));
      },

      setDragFromPanel(product) {
        set({ dragFromPanel: product });
      },

      setCanvasEl(el) {
        set({ canvasEl: el });
      },

      setControlsEl(controls) {
        set({ controlsEl: controls });
      },

      setGlRenderer(r) { set({ glRenderer: r }); },
      setThreeScene(s) { set({ threeScene: s }); },
      setThreeCamera(c) { set({ threeCamera: c }); },

      setActiveDesignId(id) {
        set({ activeDesignId: id });
      },

      setActivePatternId(id) {
        set({ activePatternId: id });
      },

      setPendingDesign(design, onLoad) {
        set({ pendingDesign: design, pendingDesignOnLoad: onLoad });
      },

      clearPendingDesign() {
        set({ pendingDesign: null, pendingDesignOnLoad: null });
      },

      setPendingPattern(pattern, editMode = false) {
        set({ pendingPattern: pattern, pendingPatternEditMode: editMode });
      },

      clearPendingPattern() {
        set({ pendingPattern: null, pendingPatternEditMode: false });
      },

      insertBead(product, atIndex) {
        const radius = BRACELET_SIZE_RADIUS[get().braceletSize];
        if (!beadFits(get().beads, { product }, radius)) {
          return "Bracelet is full — no room for that bead.";
        }
        get().pushUndoSnapshot();
        const newBead: PlacedBead = { instanceId: nanoid(), product };
        set((s) => {
          const arr = [...s.beads];
          arr.splice(atIndex, 0, newBead);
          return { beads: arr, isDirty: true };
        });
        return null;
      },

      addBeadLoadError(instanceId, name, filename) {
        set((s) => {
          if (s.beadLoadErrors.some((e) => e.instanceId === instanceId)) return s;
          return { beadLoadErrors: [...s.beadLoadErrors, { instanceId, name, filename }] };
        });
      },
    }),
    {
      name: "enewton-beads",
      storage: createJSONStorage(() => localStorage),
      version: 4,
      migrate(persistedState: unknown, fromVersion: number) {
        const s = (persistedState ?? {}) as PersistedState;
        if (fromVersion < 1) {
          // Fix "chord" typo stored before the key was corrected to "cord"
          if (s.bandMaterial === "chord") s.bandMaterial = "cord";
          // Fields added in v1 — supply defaults if absent in old snapshots
          s.bandMaterial ??= "stretchy";
          s.braceletSize   ??= "medium";
        }
        if (fromVersion < 2) {
          // BeadProduct fields changed to snake_case; old persisted beads are incompatible
          s.beads = [];
        }
        if (fromVersion < 3) {
          // activeDesignId added to persisted state
          s.activeDesignId ??= null;
        }
        if (fromVersion < 4) {
          // activePatternId added to persisted state
          s.activePatternId ??= null;
        }
        return s;
      },
      partialize: (s) => ({
        beads: s.beads,
        braceletName: s.braceletName,
        braceletDescription: s.braceletDescription,
        bandMaterial: s.bandMaterial,
        braceletSize: s.braceletSize,
        hairtieColor: s.hairtieColor,
        activeDesignId: s.activeDesignId,
        activePatternId: s.activePatternId,
      }),
    }
  )
);