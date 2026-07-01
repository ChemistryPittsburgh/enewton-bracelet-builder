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
import type { Bracelet, BeadGroup, BeadProduct, PlacedBead, BandMaterial, BraceletSize, SeedSegmentConfig } from "@/types";
import { beadFits, beadFitsAtIndex, usedArc, braceletArc, buildEffectiveGroups, evenFillGapMm } from "@/lib/bead-layout";
import { beadMatchKey } from "@/lib/seed-bead-utils";
import { BRACELET_SIZE_RADIUS, DEFAULT_BRACELET_NAME } from "@/lib/constants";
import type { CameraControls } from "@react-three/drei";
import type { WebGLRenderer, Scene as ThreeScene, Camera } from "three";

const UNDO_LIMIT = 50;

type CanvasSnapshot = {
  beads:               PlacedBead[];
  groups:              BeadGroup[];
  braceletSize:        BraceletSize;
  bandMaterial:        BandMaterial;
  hairtieColor:        string;
  braceletName:        string;
  braceletDescription: string;
};

type PersistedState = {
  beads?: PlacedBead[];
  groups?: BeadGroup[];
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
  /** Insert an evenly-sized seed run between each currently-placed bead, so the
   *  placed beads end up evenly spaced with seed beads filling every gap. */
  fillGapsWithSeeds: (
    makeFiller: (arcMm: number) => { product: BeadProduct; seedConfig: SeedSegmentConfig },
  ) => string | null;

  /** Remove a bead by instanceId. Closes the panel if that bead was selected. */
  removeBead: (instanceId: string) => void;

  /** Remove all beads and close the panel. */
  clearBeads: () => void;

  /** Reset to a blank bracelet — clears beads, name, description, and activeDesignId. */
  resetBracelet: () => void;

  /** Start a new bracelet preserving the current size and material — used by
   *  the "New Bracelet" button so the user's preferred size is not discarded. */
  startNewBracelet: () => void;
  /** Bumped on every fresh-document action (new / copy / from-pattern) so the
   *  builder can auto-open edit mode once per new bracelet. */
  newDocNonce: number;

  copyBracelet: () => void;

  /** Fork the pattern currently being edited into a fresh, unsaved bracelet:
   *  keeps the beads on the canvas but detaches from the pattern (so Save creates
   *  a new design) and drops into edit + replace mode for customising. */
  newBraceletFromPattern: () => void;

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
  /** Persisted — explicit user-defined groups; treated as units for spacing, replace, drag, delete. */
  groups: BeadGroup[];
  setEditReplaceMode: (active: boolean) => void;
  setEditReplaceNarrowedIds: (ids: string[] | null) => void;
  /** Freeze the current editSelectedIds as a new group (pushes undo), then clear the active selection. */
  saveCurrentSelectionAsGroup: () => void;
  /** Remove one saved group by id (pushes undo); leaves other groups and the pending selection intact. */
  removeGroup: (id: string) => void;
  /** Swap all beads whose instanceId is in the provided list. Returns error string or null.
   *  Optional maxToReplace caps total replacements across all runs (used when fewer beads fit than were selected). */
  replaceEditSelectedBeads: (instanceIds: string[], newProduct: BeadProduct, maxToReplace?: number) => string | null;

  /** Remove all items in instanceIds and insert `count` copies of newProduct at the first removed slot.
   *  Used when replacing a bar with multiple smaller items. Returns an error string or null on success. */
  replaceWithBeads: (instanceIds: string[], newProduct: BeadProduct, count: number) => string | null;

  /** Remove bar(s) and insert a single seed segment (with seedConfig) at the first removed slot. */
  replaceBarWithSeedSegment: (instanceIds: string[], product: BeadProduct, seedConfig: SeedSegmentConfig) => string | null;

  /** Ephemeral — instanceIds of seed segments queued for seed→seed replacement; null when not in seed-replace mode. */
  replaceSeedTargetIds: string[] | null;
  /** Enter seed-replace mode for every seed segment matching the given seedMatchKey (size + shape). */
  startReplaceSeedMode: (seedKey: string) => void;
  /** Clear the seed-replace target without leaving replace mode (used when a bead/charm type is picked instead). */
  clearReplaceSeed: () => void;
  /** Enter seed-replace mode for a SINGLE seed segment (clicking one seed) — not the whole size/shape kind. */
  startReplaceSeedSegment: (instanceId: string) => void;
  /** Swap each queued seed segment in place with a freshly-built segment (preserving its own length). */
  replaceSeedSegments: (replacements: { instanceId: string; product: BeadProduct; seedConfig: SeedSegmentConfig }[]) => string | null;

  /** Selecting all of beads with bead info dialog */
  selectAllActive: boolean;
  selectAllOfType: () => void;
  removeAllOfType: () => void;

  /** Replace the entire bead list — used by the JSON importer. */
  loadBeads: (beads: PlacedBead[], name?: string, groups?: BeadGroup[]) => void;

  setBraceletName: (name: string) => void;
  setBraceletDescription: (description: string) => void;

  /** Move a bead from one index to another — drives the reorder panel. **/
  reorderBeads: (fromIndex: number, toIndex: number) => void;
  /** Move a group of beads together; anchorFromIndex is the dragged bead, anchorToIndex is its drop target. */
  reorderBeadsGroup: (fromIndices: number[], anchorFromIndex: number, anchorToIndex: number) => void;

  /** Insert a copy of the bead immediately after it. No-op if bracelet is full. */
  duplicateBead: (instanceId: string) => void;

  /** Duplicate all beads in the selection as a block inserted after the last selected bead.
   *  Returns an error string if the group doesn't fit, null on success. */
  duplicateGroup: (instanceIds: string[]) => string | null;

  /** When true, beads are rendered with equal spacing around the bracelet. Purely visual — does not affect capacity. */
  isEvenlySpaced: boolean;
  toggleEvenlySpaced: () => void;
  /** Set the flag to an explicit value (used when restoring a loaded design). */
  setIsEvenlySpaced: (value: boolean) => void;

  bandMaterial: BandMaterial;
  braceletSize: BraceletSize;
  hairtieColor: string;
  setbandMaterial: (m: BandMaterial) => void;
  setBraceletSize: (s: BraceletSize) => void;
  setHairtieColor: (c: string) => void;

  /** Ephemeral — not persisted. Tracks beads whose GLB failed to load. */
  beadLoadErrors: { instanceId: string; name: string; filename: string }[];
  addBeadLoadError: (instanceId: string, name: string, filename: string) => void;

  /** Ephemeral — not persisted. Transient toast notifications (success/error/info). */
  toasts: { id: string; type: "success" | "error" | "info"; message: string }[];
  addToast: (toast: { type?: "success" | "error" | "info"; message: string; durationMs?: number }) => void;
  removeToast: (id: string) => void;

  /** Ephemeral — not persisted. Bead(s) selected inside edit mode — drives EditModeToolbar. */
  editSelectedIds: string[];
  /** Replace selection with a single bead (normal click). */
  selectEditBead: (instanceId: string) => void;
  /** Toggle a bead in/out of the selection (Cmd/Ctrl+click). */
  toggleEditBead: (instanceId: string) => void;
  /** Clear the entire edit selection. */
  clearEditSelection: () => void;
  /** Replace the entire edit selection with the given instance IDs. */
  setEditSelectedIds: (ids: string[]) => void;

  /** Ephemeral — not persisted. True when the canvas is in drag-to-reorder edit mode. */
  isEditMode: boolean;
  toggleEditMode: () => void;
  /** Enter edit mode with the Replace-bead box already open — used after creating
   *  a bracelet from a pattern so the user can immediately swap beads to customise. */
  enterEditReplaceMode: () => void;

  /** Ephemeral — when true, colliding charms are highlighted with an orange ring. */
  showCharmCollisions: boolean;
  setShowCharmCollisions: (show: boolean) => void;

  /** Ephemeral — not persisted. Which camera view is active in edit mode. */
  editViewMode: 'top' | 'side';
  toggleEditViewMode: () => void;
  /** Active canvas tool in edit mode: 'select' arranges beads, 'pan' grabs/pans the view, 'look' frees the camera (orbit/pan/zoom). 'pan' and 'look' make beads inert. */
  canvasTool: 'select' | 'pan' | 'look';
  setCanvasTool: (tool: 'select' | 'pan' | 'look') => void;

  /** Ephemeral — background color variant driving edit-mode bg + grid colors. */
  editBgVariant: 'blue' | 'beige';

  /** Ephemeral — whether the edit-mode floor grid is shown. Toggled from Canvas Controls. */
  showGrid: boolean;
  toggleGrid: () => void;

  /** Ephemeral — not persisted. Which canvas view is active. */
  viewMode: '3D' | 'line';
  setViewMode: (mode: '3D' | 'line') => void;

  /** Ephemeral — not persisted. Bead being dragged from the selector panel onto the canvas. */
  dragFromPanel: BeadProduct | null;
  setDragFromPanel: (product: BeadProduct | null) => void;

  /** Ephemeral — not persisted. Label of the item(s) being reordered in-canvas;
   *  drives the cursor drag chip. null when no reorder drag is in progress. */
  reorderDragLabel: string | null;
  setReorderDragLabel: (label: string | null) => void;

  /** Insert a new bead at a specific slot index. Returns an error string or null. */
  insertBead: (product: BeadProduct, atIndex: number) => string | null;

  /** Ephemeral — index of the gap selected for filling (gap AFTER beads[i]); null when no gap is selected. */
  selectedGapIndex: number | null;
  setSelectedGapIndex: (i: number | null) => void;

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

/** Reset bundle: clears every "which item(s) are being replaced" pointer, so
 *  the three flags can never drift out of sync. Spread into a set(). */
const CLEAR_REPLACE_TARGETS: Pick<
  Store,
  "replaceTargetInstanceId" | "replaceAllTargetProductId" | "replaceSeedTargetIds"
> = {
  replaceTargetInstanceId: null,
  replaceAllTargetProductId: null,
  replaceSeedTargetIds: null,
};

/** Reset bundle: tears down the transient edit-mode replace UI state.
 *  Groups are intentionally excluded — they are bracelet data, not UI state. */
const CLEAR_EDIT_REPLACE: Pick<
  Store,
  "editReplaceMode" | "editReplaceNarrowedIds" | "editSelectedIds"
> = {
  editReplaceMode: false,
  editReplaceNarrowedIds: null,
  editSelectedIds: [],
};

/** Drop a set of instanceIds from the edit selection, groups, and the
 *  narrowed subset in one place — shared by removeBead and the replace actions. */
function pruneEditSelection(
  s: Pick<Store, "groups" | "editSelectedIds" | "editReplaceNarrowedIds" | "replaceSeedTargetIds">,
  removed: Set<string>,
): Pick<Store, "groups" | "editSelectedIds" | "editReplaceNarrowedIds" | "replaceSeedTargetIds"> {
  const narrowed = s.editReplaceNarrowedIds?.filter((id) => !removed.has(id)) ?? null;
  const seedTargets = s.replaceSeedTargetIds?.filter((id) => !removed.has(id)) ?? null;
  return {
    groups: s.groups
      .map((g) => ({ ...g, instanceIds: g.instanceIds.filter((id) => !removed.has(id)) }))
      .filter((g) => g.instanceIds.length > 0),
    editSelectedIds: s.editSelectedIds.filter((id) => !removed.has(id)),
    editReplaceNarrowedIds: narrowed && narrowed.length ? narrowed : null,
    replaceSeedTargetIds: seedTargets && seedTargets.length ? seedTargets : null,
  };
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
      toasts: [],
      isEditMode: false,

      showCharmCollisions: false,
      setShowCharmCollisions: (show) => set({ showCharmCollisions: show }),
      editSelectedIds: [],
      editViewMode: 'side' as const,
      canvasTool: 'select' as const,
      editBgVariant: 'blue' as const,
      showGrid: true,
      selectAllActive: false,
      viewMode: '3D' as const,
      dragFromPanel: null,
      reorderDragLabel: null,
      replaceTargetInstanceId: null,
      replaceAllTargetProductId: null, replaceSeedTargetIds: null,
      editReplaceMode: false,
      editReplaceNarrowedIds: null,
      groups: [] as BeadGroup[],
      selectedGapIndex: null,
      canvasEl: null,
      activeDesignId: null,
      newDocNonce: 0,
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
          groups:              [...s.groups],
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
        const { undoStack, redoStack, beads, groups, braceletSize, bandMaterial, hairtieColor, braceletName, braceletDescription } = get();
        if (undoStack.length === 0) return;
        const [snapshot, ...rest] = undoStack;
        const current: CanvasSnapshot = { beads: [...beads], groups: [...groups], braceletSize, bandMaterial, hairtieColor, braceletName, braceletDescription };
        set({ ...snapshot, undoStack: rest, redoStack: [current, ...redoStack], isDirty: true, selectedBead: null, selectedGapIndex: null, ...CLEAR_REPLACE_TARGETS, ...CLEAR_EDIT_REPLACE });
      },

      redo() {
        const { undoStack, redoStack, beads, groups, braceletSize, bandMaterial, hairtieColor, braceletName, braceletDescription } = get();
        if (redoStack.length === 0) return;
        const [snapshot, ...rest] = redoStack;
        const current: CanvasSnapshot = { beads: [...beads], groups: [...groups], braceletSize, bandMaterial, hairtieColor, braceletName, braceletDescription };
        set({ ...snapshot, redoStack: rest, undoStack: [current, ...undoStack], isDirty: true, selectedBead: null, selectedGapIndex: null, ...CLEAR_REPLACE_TARGETS, ...CLEAR_EDIT_REPLACE });
      },

      spacersHiddenForCapture: false,
      setSpacersHiddenForCapture: (hidden) => set({ spacersHiddenForCapture: hidden }),

      addBead(product) {
        const s = get();
        const radius = BRACELET_SIZE_RADIUS[s.braceletSize];
        const fits = s.selectedGapIndex !== null
          ? beadFitsAtIndex(s.beads, { product }, s.selectedGapIndex, radius, buildEffectiveGroups(s.groups, s.editSelectedIds), s.isEvenlySpaced)
          : beadFits(s.beads, { product }, radius);
        if (!fits) return "Bracelet is full — no room for that bead.";
        get().pushUndoSnapshot();
        set((st) => {
          const gapIdx = st.selectedGapIndex;
          if (gapIdx !== null) {
            const newBead: PlacedBead = { instanceId: nanoid(), product, isGapFill: true };
            const arr = [...st.beads];
            arr.splice(gapIdx + 1, 0, newBead);
            return { beads: arr, isDirty: true, selectedGapIndex: null };
          }
          return { beads: [...st.beads, { instanceId: nanoid(), product }], isDirty: true };
        });
        return null;
      },

      addSeedSegment(product, seedConfig) {
        const s = get();
        const radius = BRACELET_SIZE_RADIUS[s.braceletSize];
        const fits = s.selectedGapIndex !== null
          ? beadFitsAtIndex(s.beads, { product }, s.selectedGapIndex, radius, buildEffectiveGroups(s.groups, s.editSelectedIds), s.isEvenlySpaced)
          : beadFits(s.beads, { product }, radius);
        if (!fits) return "Bracelet is full — no room for that segment.";
        get().pushUndoSnapshot();
        set((st) => {
          const gapIdx = st.selectedGapIndex;
          if (gapIdx !== null) {
            const newBead: PlacedBead = { instanceId: nanoid(), product, seedConfig, isGapFill: true };
            const arr = [...st.beads];
            arr.splice(gapIdx + 1, 0, newBead);
            return { beads: arr, isDirty: true, selectedGapIndex: null };
          }
          return { beads: [...st.beads, { instanceId: nanoid(), product, seedConfig }], isDirty: true };
        });
        return null;
      },

      fillGapsWithSeeds(makeFiller) {
        const radius = BRACELET_SIZE_RADIUS[get().braceletSize];
        const allBeads = get().beads;
        const anchors = allBeads.filter(b => !b.isGapFill);
        if (anchors.length === 0) {
          return "Place a few beads first, then fill the gaps between them.";
        }
        // Recalculating an even fill discards any beads placed via the separate
        // "select a gap, fill it" flow — they aren't evenly spaced, so there's no
        // way to reconcile them with a fresh even distribution. Warn rather than
        // silently dropping them.
        const discardedGapFillCount = allBeads.length - anchors.length;

        // One seed run after every anchor (the last sits across the seam). Each run
        // reserves an equal arc, so the anchors come out evenly spaced around the loop.
        const build = (mm: number): PlacedBead[] => {
          const seq: PlacedBead[] = [];
          for (const a of anchors) {
            seq.push(a);
            const { product, seedConfig } = makeFiller(mm);
            seq.push({ instanceId: nanoid(), product, seedConfig });
          }
          return seq;
        };

        // Exact per-gap arc — shared with the seed picker's preview (evenFillGapMm)
        // so the two can never diverge. (A flat safety margin left visible slack
        // that pooled at the seam.)
        let gapMm = evenFillGapMm(allBeads, radius);
        if (gapMm <= 0) return "There's no room left to add seed beads between them.";

        let seq = build(gapMm);
        let guard = 0;
        while (usedArc(seq) > braceletArc(radius) && gapMm > 0 && guard < 8) {
          gapMm = Math.max(0, Math.floor((gapMm - 0.1) * 10) / 10);
          seq = build(gapMm);
          guard++;
        }
        if (gapMm <= 0 || usedArc(seq) > braceletArc(radius)) {
          return "There's no room left to add seed beads between them.";
        }

        get().pushUndoSnapshot();
        set({ beads: seq, isDirty: true });
        if (discardedGapFillCount > 0) {
          get().addToast({
            type: "info",
            message: `Replaced ${discardedGapFillCount} previously placed gap bead${discardedGapFillCount === 1 ? "" : "s"} with the even fill.`,
          });
        }
        return null;
      },

      removeBead(instanceId) {
        get().pushUndoSnapshot();
        set((s) => ({
          beads: s.beads.filter((b) => b.instanceId !== instanceId),
          selectedBead: s.selectedBead?.instanceId === instanceId ? null : s.selectedBead,
          beadLoadErrors: s.beadLoadErrors.filter((e) => e.instanceId !== instanceId),
          ...pruneEditSelection(s, new Set([instanceId])),
          isDirty: true,
          selectedGapIndex: null,
        }));
      },

      clearBeads() {
        get().pushUndoSnapshot();
        set({ beads: [], groups: [], selectedBead: null, beadLoadErrors: [], activeDesignId: null, activePatternId: null, isDirty: false, selectedGapIndex: null, ...CLEAR_REPLACE_TARGETS, ...CLEAR_EDIT_REPLACE });
      },

      resetBracelet: () => set({
        beads: [],
        groups: [],
        braceletName: "New Bracelet",
        braceletDescription: "",
        activeDesignId: null,
        activePatternId: null,
        selectedBead: null,
        isDirty: false,
        braceletSize: "medium" as BraceletSize,
        bandMaterial: "stretchy" as BandMaterial,
        undoStack: [],
        redoStack: [],
        selectedGapIndex: null,
        ...CLEAR_REPLACE_TARGETS,
        ...CLEAR_EDIT_REPLACE,
      }),

      startNewBracelet: () => set((s) => ({
        beads: [],
        groups: [],
        braceletName: "New Bracelet",
        braceletDescription: "",
        activeDesignId: null,
        activePatternId: null,
        selectedBead: null,
        isDirty: false,
        undoStack: [],
        redoStack: [],
        newDocNonce: s.newDocNonce + 1, // fresh document → builder auto-opens edit mode
        selectedGapIndex: null,
        ...CLEAR_REPLACE_TARGETS,
        ...CLEAR_EDIT_REPLACE,
        // braceletSize and bandMaterial intentionally preserved
      })),

      copyBracelet: () =>
        set((s) => ({
          activeDesignId: null,      // detach from the saved design
          activePatternId: null,     // and from any pattern
          braceletName:
            s.braceletName && s.braceletName !== DEFAULT_BRACELET_NAME
              ? `Copy of ${s.braceletName}`
              : DEFAULT_BRACELET_NAME,
          isDirty: true,             // so Save creates a new bracelet
          newDocNonce: s.newDocNonce + 1,
        })),

      newBraceletFromPattern: () =>
        set((s) => ({
          activeDesignId: null,      // detach from the saved design
          activePatternId: null,     // stop editing the pattern → Save makes a new design
          braceletName: DEFAULT_BRACELET_NAME, // fresh bracelet, not "Copy of …"
          isDirty: true,             // so Save creates a new bracelet
          newDocNonce: s.newDocNonce + 1,
          // drop straight into edit + replace mode, mirroring create-from-pattern
          isEditMode: true,
          editViewMode: 'side',
          canvasTool: 'select',
          selectedBead: null,
          editReplaceMode: true,
          editReplaceNarrowedIds: null,
          editSelectedIds: [],
          ...CLEAR_REPLACE_TARGETS,
        })),

      selectBead(bead) {
        set({ selectedBead: bead, selectAllActive: false, ...CLEAR_REPLACE_TARGETS });
      },

      clearSelectedBead() {
        set({ selectedBead: null, selectAllActive: false, ...CLEAR_REPLACE_TARGETS });
      },

      startReplaceMode(instanceId) {
        set({ ...CLEAR_REPLACE_TARGETS, replaceTargetInstanceId: instanceId });
      },

      cancelReplaceMode() {
        set({ ...CLEAR_REPLACE_TARGETS, ...CLEAR_EDIT_REPLACE });
      },

      setEditReplaceMode(active) {
        if (active) {
          const hasPreSelection = get().editSelectedIds.length > 0;
          set({ ...CLEAR_REPLACE_TARGETS, editReplaceMode: true, ...(hasPreSelection ? {} : { editSelectedIds: [] }) });
        } else {
          // Close the dialog; groups survive (they are bracelet data). Clear only
          // the transient selection and replace state so beads lose their teal ring.
          set({ editReplaceMode: false, editReplaceNarrowedIds: null, editSelectedIds: [], ...CLEAR_REPLACE_TARGETS });
        }
      },

      saveCurrentSelectionAsGroup() {
        const s = get();
        if (s.editSelectedIds.length === 0) return;
        // A bead being (re)grouped leaves whatever group it was previously in —
        // otherwise re-selecting an existing group (toggleGroup's echo-select)
        // and saving again creates a second group with overlapping instanceIds,
        // which breaks the "groups partition beads" assumption in the group-aware
        // spacing math (getGapFillAwareSpacingBonuses).
        //
        // Only dissolve an existing group when the WHOLE group is covered by the
        // new selection. A partial overlap can happen outside the click-to-echo
        // flow (e.g. "Select All" of one product type inside a mixed-type group,
        // via selectAllOfType) — dissolving in that case would silently strand
        // the group's untouched members with no group at all. Keep those groups
        // intact instead, and drop their ids from the new group so a bead is
        // never claimed by two groups at once.
        const selected = new Set(s.editSelectedIds);
        const groupsToKeep: typeof s.groups = [];
        const idsClaimedByKeptGroups = new Set<string>();
        for (const g of s.groups) {
          const fullyCovered = g.instanceIds.every((id) => selected.has(id));
          if (fullyCovered) continue;
          groupsToKeep.push(g);
          for (const id of g.instanceIds) {
            if (selected.has(id)) idsClaimedByKeptGroups.add(id);
          }
        }
        const newGroupIds = s.editSelectedIds.filter((id) => !idsClaimedByKeptGroups.has(id));
        if (newGroupIds.length === 0) {
          s.addToast({ type: "info", message: "Those beads already belong to an existing group." });
          return;
        }
        get().pushUndoSnapshot();
        set({
          groups: [
            ...groupsToKeep,
            { id: nanoid(), instanceIds: newGroupIds },
          ],
          editSelectedIds: [],
          editReplaceNarrowedIds: null,
        });
      },

      removeGroup(id) {
        get().pushUndoSnapshot();
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
          editReplaceNarrowedIds: null,
        }));
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
        const { groups, editSelectedIds } = pruneEditSelection(s, replacedSet);

        s.pushUndoSnapshot();
        set({
          beads: current,
          beadLoadErrors: s.beadLoadErrors.filter((e) => !replacedSet.has(e.instanceId)),
          groups,
          editSelectedIds,
          // Stay in replace mode after a replace — the user exits explicitly.
          editReplaceMode: true,
          editReplaceNarrowedIds: null,
          isDirty: true,
        });
        return null;
      },

      startReplaceAllMode(productId) {
        set({ ...CLEAR_REPLACE_TARGETS, replaceAllTargetProductId: productId });
      },

      startReplaceSeedMode(seedKey) {
        const { beads, replaceSeedTargetIds } = get();
        const ids = beads
          .filter((b) => b.seedConfig && beadMatchKey(b) === seedKey)
          .map((b) => b.instanceId);
        if (ids.length === 0) return;
        // Toggle: clicking the already-active seed kind clears the selection.
        const sameAsCurrent =
          replaceSeedTargetIds !== null &&
          replaceSeedTargetIds.length === ids.length &&
          ids.every((id) => replaceSeedTargetIds.includes(id));
        if (sameAsCurrent) {
          set({ replaceSeedTargetIds: null, selectedBead: null, selectAllActive: false });
          return;
        }
        set({
          replaceSeedTargetIds: ids,
          // Clear the other replace modes so the selector shows the seed picker.
          // selectedBead + selectAllActive are left as-is so the Bead Info window
          // stays open through the replace, matching the bead "Replace All" flow.
          // editReplaceMode is left as-is so the replace box stays open when seeds
          // are picked from it.
          replaceTargetInstanceId: null,
          replaceAllTargetProductId: null,
          editReplaceNarrowedIds: null,
          // groups are bracelet data — not cleared when switching replace targets
        });
      },

      clearReplaceSeed() {
        set({ replaceSeedTargetIds: null });
      },

      startReplaceSeedSegment(instanceId) {
        const bead = get().beads.find((b) => b.instanceId === instanceId);
        if (!bead?.seedConfig) return;
        set({
          replaceSeedTargetIds: [instanceId],
          replaceTargetInstanceId: null,
          replaceAllTargetProductId: null,
          editReplaceNarrowedIds: null,
          selectAllActive: false,
          // groups are bracelet data — not cleared when switching replace targets
          // selectedBead left as-is so the info window behaves like the regular-bead replace path.
        });
      },

      replaceSeedSegments(replacements) {
        const s = get();
        if (replacements.length === 0) {
          set({ replaceSeedTargetIds: null });
          return null;
        }
        const byId = new Map(replacements.map((r) => [r.instanceId, r]));
        // Same-length swaps, so the bracelet arc is unchanged — no fit check needed.
        const beads = s.beads.map((b) => {
          const r = byId.get(b.instanceId);
          return r ? { ...b, product: r.product, seedConfig: r.seedConfig } : b;
        });
        s.pushUndoSnapshot();
        set({
          beads,
          replaceSeedTargetIds: null,
          selectedBead: null,
          selectAllActive: false,
          // Also exit edit-replace, in case this was triggered from an all-seed
          // edit-mode selection (harmless no-op for the dedicated paths).
          editSelectedIds: [],
          // editReplaceMode left as-is: stays open if replacing from the box,
          // stays closed if triggered from the Bead Info button.
          editReplaceNarrowedIds: null,
          // groups are bracelet data — survived through the seed replace
          isDirty: true,
        });
        return null;
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
          replaceAllTargetProductId: null, replaceSeedTargetIds: null,
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
          selectAllActive: false,
          replaceTargetInstanceId: null,
          beadLoadErrors: s.beadLoadErrors.filter((e) => e.instanceId !== instanceId),
          isDirty: true,
        }));
        return null;
      },

      replaceWithBeads(instanceIds, newProduct, count) {
        const s = get();
        const radius = BRACELET_SIZE_RADIUS[s.braceletSize];

        const positions = instanceIds
          .map(id => ({ id, idx: s.beads.findIndex(b => b.instanceId === id) }))
          .filter(x => x.idx !== -1)
          .sort((a, b) => a.idx - b.idx);

        if (positions.length === 0) return "Target beads not found.";

        const insertAt = positions[0].idx;
        const removedSet = new Set(instanceIds);
        const withoutTargets = s.beads.filter(b => !removedSet.has(b.instanceId));

        // Validate by inserting at the correct slot — not tail-appending — so that
        // charm-adjacency spacing (body_width_mm) is computed against the real neighbors.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const testInserted: any[] = [];
        for (let i = 0; i < count; i++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const next = { instanceId: `__v_${i}`, product: newProduct } as any;
          const checkList = [
            ...withoutTargets.slice(0, insertAt),
            ...testInserted,
            next,
            ...withoutTargets.slice(insertAt),
          ];
          if (usedArc(checkList) > braceletArc(radius)) {
            return i === 0
              ? "No replacement items fit in the available space."
              : `Only ${i} item${i > 1 ? "s" : ""} fit in the available space.`;
          }
          testInserted.push(next);
        }

        const inserted: PlacedBead[] = Array.from({ length: count }, () => ({
          instanceId: nanoid(),
          product: newProduct,
        }));

        const newBeads = [
          ...withoutTargets.slice(0, insertAt),
          ...inserted,
          ...withoutTargets.slice(insertAt),
        ];

        const { groups, editSelectedIds } = pruneEditSelection(s, removedSet);
        const stillHasGroups = groups.length > 0 || editSelectedIds.length > 0;

        s.pushUndoSnapshot();
        set({
          beads: newBeads,
          beadLoadErrors: s.beadLoadErrors.filter(e => !removedSet.has(e.instanceId)),
          selectedBead: null,
          selectAllActive: false,
          replaceTargetInstanceId: null,
          editReplaceMode: stillHasGroups,
          groups,
          editSelectedIds,
          editReplaceNarrowedIds: null,
          isDirty: true,
        });
        return null;
      },

      replaceBarWithSeedSegment(instanceIds, product, seedConfig) {
        const s = get();
        const radius = BRACELET_SIZE_RADIUS[s.braceletSize];

        const positions = instanceIds
          .map(id => ({ id, idx: s.beads.findIndex(b => b.instanceId === id) }))
          .filter(x => x.idx !== -1)
          .sort((a, b) => a.idx - b.idx);

        if (positions.length === 0) return "Target beads not found.";

        const insertAt = positions[0].idx;
        const removedSet = new Set(instanceIds);
        const withoutTargets = s.beads.filter(b => !removedSet.has(b.instanceId));

        if (!beadFits(withoutTargets, { product }, radius)) {
          return "The seed segment doesn't fit in the available space.";
        }

        const newBead: PlacedBead = { instanceId: nanoid(), product, seedConfig };
        const newBeads = [
          ...withoutTargets.slice(0, insertAt),
          newBead,
          ...withoutTargets.slice(insertAt),
        ];

        const { groups, editSelectedIds } = pruneEditSelection(s, removedSet);
        const stillHasGroups = groups.length > 0 || editSelectedIds.length > 0;

        s.pushUndoSnapshot();
        set({
          beads: newBeads,
          beadLoadErrors: s.beadLoadErrors.filter(e => !removedSet.has(e.instanceId)),
          selectedBead: null,
          selectAllActive: false,
          replaceTargetInstanceId: null,
          editReplaceMode: stillHasGroups,
          groups,
          editSelectedIds,
          editReplaceNarrowedIds: null,
          isDirty: true,
        });
        return null;
      },

      selectAllOfType() {
        const { beads, selectedBead, isEditMode } = get();
        if (!selectedBead) return;
        // Match by bead key, not product id: seed segments each carry their own
        // generated product id (a fill run gets a fresh random seed per gap), so
        // product-id matching would only ever catch the one clicked segment.
        const key = beadMatchKey(selectedBead);
        const matchingIds = beads
          .filter((b) => beadMatchKey(b) === key)
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
        // Same keying as selectAllOfType so "Remove all of this kind" clears every
        // matching seed run, not just the segment that happened to be clicked.
        const key = beadMatchKey(selectedBead);
        const filtered = beads.filter((b) => beadMatchKey(b) !== key);
        set({ beads: filtered, selectedBead: null, selectAllActive: false, editSelectedIds: [], isDirty: true });
      },

      loadBeads(beads, name, groups) {
        set({ beads, groups: groups ?? [], selectedBead: null, isDirty: false, undoStack: [], redoStack: [], selectedGapIndex: null, ...CLEAR_REPLACE_TARGETS, ...CLEAR_EDIT_REPLACE, ...(name ? { braceletName: name } : {}) });
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
          return { beads: arr, isDirty: true, selectedGapIndex: null };
        });
      },

      reorderBeadsGroup(fromIndices, anchorFromIndex, anchorToIndex) {
        if (fromIndices.length === 0) return;
        get().pushUndoSnapshot();
        set((s) => {
          const arr = [...s.beads];
          const sortedIndices = [...fromIndices].sort((a, b) => a - b);
          const group = sortedIndices.map(i => arr[i]);
          const indexSet = new Set(sortedIndices);
          const remaining = arr.filter((_, i) => !indexSet.has(i));
          const anchorPositionInGroup = sortedIndices.indexOf(anchorFromIndex);
          const insertPosition = Math.max(0, Math.min(remaining.length, anchorToIndex - anchorPositionInGroup));
          const newArr = [
            ...remaining.slice(0, insertPosition),
            ...group,
            ...remaining.slice(insertPosition),
          ];
          return { beads: newArr, isDirty: true, selectedGapIndex: null };
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
          ...(bead.isGapFill  ? { isGapFill: true } : {}),
        };
        set({ beads: [...beads.slice(0, index + 1), copy, ...beads.slice(index + 1)], isDirty: true });
      },

      duplicateGroup(instanceIds) {
        const { beads, braceletSize } = get();
        const radius = BRACELET_SIZE_RADIUS[braceletSize];

        // Collect selected beads in bracelet order
        const selected = instanceIds
          .map(id => ({ id, idx: beads.findIndex(b => b.instanceId === id) }))
          .filter(x => x.idx !== -1)
          .sort((a, b) => a.idx - b.idx)
          .map(x => beads[x.idx]);

        if (selected.length === 0) return "Selected beads not found.";

        // Check that every copy fits (simulate adding them one by one)
        let tempList = [...beads];
        const copies: PlacedBead[] = [];
        for (const bead of selected) {
          if (!beadFits(tempList, bead, radius)) {
            return copies.length === 0
              ? "No room to duplicate the selection."
              : `Only ${copies.length} of ${selected.length} copies fit — bracelet is too full.`;
          }
          const copy: PlacedBead = {
            instanceId: nanoid(),
            product: bead.product,
            ...(bead.seedConfig ? { seedConfig: bead.seedConfig } : {}),
            ...(bead.isGapFill  ? { isGapFill: true } : {}),
          };
          copies.push(copy);
          tempList = [...tempList, copy];
        }

        // Insert all copies as a block immediately after the last selected bead
        const lastIdx = Math.max(...selected.map(b => beads.findIndex(x => x.instanceId === b.instanceId)));
        get().pushUndoSnapshot();
        set({
          beads: [...beads.slice(0, lastIdx + 1), ...copies, ...beads.slice(lastIdx + 1)],
          isDirty: true,
        });
        return null;
      },

      isEvenlySpaced: false,
      toggleEvenlySpaced: () => set((s) => ({ isEvenlySpaced: !s.isEvenlySpaced })),
      setIsEvenlySpaced: (value) => set({ isEvenlySpaced: value }),

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
        set({ editSelectedIds: [], editReplaceMode: false, editReplaceNarrowedIds: null });
      },

      setEditSelectedIds(ids) {
        set({ editSelectedIds: ids });
      },

      toggleEditMode() {
        set((s) => ({
          isEditMode: !s.isEditMode,
          selectedBead: null,
          editSelectedIds: [],
          editViewMode: 'side',
          canvasTool: 'select',
          editReplaceMode: false,
          editReplaceNarrowedIds: null,
          selectedGapIndex: null,
          // groups are bracelet data — survive mode toggle
        }));
      },

      enterEditReplaceMode() {
        set((s) => ({
          isEditMode: true,
          editViewMode: 'side',
          selectedBead: null,
          editReplaceMode: true,
          editReplaceNarrowedIds: null,
          editSelectedIds: [],
          canvasTool: 'select',
          ...CLEAR_REPLACE_TARGETS,
          // groups are bracelet data — survive entering edit+replace mode
        }));
      },

      toggleEditViewMode() {
        set((s) => ({ editViewMode: s.editViewMode === 'top' ? 'side' : 'top' }));
      },

      setCanvasTool(tool) {
        set({ canvasTool: tool });
      },

      toggleGrid() {
        set((s) => ({ showGrid: !s.showGrid }));
      },

      setViewMode(mode) {
        set((s) => ({
          viewMode: mode,
          editViewMode: s.isEditMode ? 'side' : s.editViewMode,
          canvasTool: 'select',
        }));
      },

      setDragFromPanel(product) {
        set({ dragFromPanel: product });
      },

      setReorderDragLabel(label) {
        set({ reorderDragLabel: label });
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
        const s = get();
        const radius = BRACELET_SIZE_RADIUS[s.braceletSize];
        if (!beadFitsAtIndex(s.beads, { product }, atIndex - 1, radius, buildEffectiveGroups(s.groups, s.editSelectedIds), s.isEvenlySpaced)) {
          return "Bracelet is full — no room for that bead.";
        }
        get().pushUndoSnapshot();
        const newBead: PlacedBead = { instanceId: nanoid(), product };
        set((s) => {
          const arr = [...s.beads];
          arr.splice(atIndex, 0, newBead);
          return { beads: arr, isDirty: true, selectedGapIndex: null };
        });
        return null;
      },

      setSelectedGapIndex(i) {
        set({ selectedGapIndex: i });
      },

      addBeadLoadError(instanceId, name, filename) {
        set((s) => {
          if (s.beadLoadErrors.some((e) => e.instanceId === instanceId)) return s;
          return { beadLoadErrors: [...s.beadLoadErrors, { instanceId, name, filename }] };
        });
      },

      addToast({ type = "success", message, durationMs = 3200 }) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
        if (durationMs > 0 && typeof window !== "undefined") {
          window.setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
          }, durationMs);
        }
      },
      removeToast(id) {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      },
    }),
    {
      name: "enewton-beads",
      storage: createJSONStorage(() => localStorage),
      version: 5,
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
        if (fromVersion < 5) {
          // Band material was renamed to "stretchy" | "hairtie". Coerce any legacy
          // or unknown value ("wire", "cord", "chord", …) back to the default so
          // old persisted snapshots don't render with no material selected.
          if (s.bandMaterial !== "stretchy" && s.bandMaterial !== "hairtie") {
            s.bandMaterial = "stretchy";
          }
          // groups promoted to first-class bracelet data
          s.groups ??= [];
        }

        return s;
      },
      partialize: (s) => ({
        beads: s.beads,
        groups: s.groups,
        braceletName: s.braceletName,
        braceletDescription: s.braceletDescription,
        bandMaterial: s.bandMaterial,
        braceletSize: s.braceletSize,
        hairtieColor: s.hairtieColor,
        activeDesignId: s.activeDesignId,
        activePatternId: s.activePatternId,
        isEvenlySpaced: s.isEvenlySpaced,
      }),
    }
  )
);