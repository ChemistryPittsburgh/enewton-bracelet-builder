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
import type { Bracelet, BeadProduct, PlacedBead, BandMaterial, BraceletSize } from "@/types";
import { beadFits } from "@/lib/bead-layout";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";
import type { CameraControls } from "@react-three/drei";

type PersistedState = {
  beads?: PlacedBead[];
  braceletName?: string;
  braceletDescription?: string;
  bandMaterial?: string;
  braceletSize?: string;
  activeDesignId?: number | null;
};

interface Store {
  beads: PlacedBead[];
  braceletName: string;
  braceletDescription: string;

  /** The bead currently tapped in the 3D scene — drives the info panel. */
  selectedBead: PlacedBead | null;

  /** Add a bead to the next available slot. Returns an error string or null. */
  addBead: (product: BeadProduct) => string | null;

  /** Remove a bead by instanceId. Closes the panel if that bead was selected. */
  removeBead: (instanceId: string) => void;

  /** Remove all beads and close the panel. */
  clearBeads: () => void;

  /** Reset to a blank bracelet — clears beads, name, description, and activeDesignId. */
  resetBracelet: () => void;

  /** Open the info panel for a specific bead. */
  selectBead: (bead: PlacedBead) => void;

  /** Close the info panel without removing anything. */
  clearSelectedBead: () => void;

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
  setbandMaterial: (m: BandMaterial) => void;
  setBraceletSize: (s: BraceletSize) => void;

  /** Ephemeral — not persisted. Tracks beads whose GLB failed to load. */
  beadLoadErrors: { instanceId: string; name: string; filename: string }[];
  addBeadLoadError: (instanceId: string, name: string, filename: string) => void;

  /** Ephemeral — not persisted. Bead selected inside edit mode — drives EditModeToolbar only. */
  editSelectedBead: PlacedBead | null;
  setEditSelectedBead: (bead: PlacedBead | null) => void;

  /** Ephemeral — not persisted. True when the canvas is in drag-to-reorder edit mode. */
  isEditMode: boolean;
  toggleEditMode: () => void;

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

  /**
   * Ephemeral — not persisted.
   * ID of the design currently on the canvas (set after a successful save or
   * when a design is loaded from the Saved Designs panel).
   * null means the canvas holds an unsaved / new bracelet.
   * Cleared when the user clears all beads (starting fresh).
   */
  activeDesignId: number | null;
  setActiveDesignId: (id: number | null) => void;

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

  /** True when the bracelet has unsaved changes since the last save/load. */
  isDirty: boolean;
  /** Reset the dirty flag — called after a successful save. */
  markClean: () => void;
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
      bandMaterial: "cord" as BandMaterial,
      braceletSize: "small" as BraceletSize,
      beadLoadErrors: [],
      isEditMode: false,
      editSelectedBead: null,
      editViewMode: 'top' as const,
      selectAllActive: false,
      viewMode: '3D' as const,
      dragFromPanel: null,
      canvasEl: null,
      activeDesignId: null,
      pendingDesign: null,
      pendingDesignOnLoad: null,
      controlsEl: null,
      isDirty: false,
      markClean: () => set({ isDirty: false }),

      addBead(product) {
        const radius = BRACELET_SIZE_RADIUS[get().braceletSize];
        if (!beadFits(get().beads, { product }, radius)) {
          return "Bracelet is full — no room for that bead.";
        }
        set((s) => ({
          beads: [...s.beads, { instanceId: nanoid(), product }],
          isDirty: true,
        }));
        return null;
      },

      removeBead(instanceId) {
        set((s) => ({
          beads: s.beads.filter((b) => b.instanceId !== instanceId),
          selectedBead:
            s.selectedBead?.instanceId === instanceId ? null : s.selectedBead,
          editSelectedBead:
            s.editSelectedBead?.instanceId === instanceId ? null : s.editSelectedBead,
          beadLoadErrors: s.beadLoadErrors.filter((e) => e.instanceId !== instanceId),
          isDirty: true,
        }));
      },

      clearBeads() {
        set({ beads: [], selectedBead: null, beadLoadErrors: [], activeDesignId: null, isDirty: false });
      },

      resetBracelet: () => set({
        beads: [],
        braceletName: "New Bracelet",
        braceletDescription: "",
        activeDesignId: null,
        selectedBead: null,
        isDirty: false,
        braceletSize: "small" as BraceletSize,
        bandMaterial: "cord" as BandMaterial,
      }),

      selectBead(bead) {
        set({ selectedBead: bead, selectAllActive: false });
      },

      clearSelectedBead() {
        set({ selectedBead: null, selectAllActive: false });
      },

      selectAllOfType() {
        set({ selectAllActive: true });
      },

      removeAllOfType() {
        const { beads, selectedBead } = get();
        if (!selectedBead) return;
        const filtered = beads.filter((b) => b.product.id !== selectedBead.product.id);
        set({ beads: filtered, selectedBead: null, selectAllActive: false, isDirty: true });
      },

      loadBeads(beads, name) {
        set({ beads, selectedBead: null, isDirty: false, ...(name ? { braceletName: name } : {}) });
      },

      setBraceletName(name) {
        set({ braceletName: name, isDirty: true });
      },

      setBraceletDescription(description) {
        set({ braceletDescription: description, isDirty: true });
      },

      reorderBeads(fromIndex, toIndex) {
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
        const copy: PlacedBead = { instanceId: nanoid(), product: bead.product };
        set({ beads: [...beads.slice(0, index + 1), copy, ...beads.slice(index + 1)], isDirty: true });
      },

      reverseBracelet() {
        set((s) => ({ beads: [...s.beads].reverse(), isDirty: true }));
      },

      setbandMaterial: (bandMaterial) => set({ bandMaterial, isDirty: true }),
      setBraceletSize: (braceletSize) => set({ braceletSize, isDirty: true }),

      setEditSelectedBead(bead) {
        set({ editSelectedBead: bead });
      },

      toggleEditMode() {
        set((s) => ({
          isEditMode: !s.isEditMode,
          selectedBead: null,
          editSelectedBead: null,
          editViewMode: s.viewMode === 'line' ? 'side' : 'top',
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

      setActiveDesignId(id) {
        set({ activeDesignId: id });
      },

      setPendingDesign(design, onLoad) {
        set({ pendingDesign: design, pendingDesignOnLoad: onLoad });
      },

      clearPendingDesign() {
        set({ pendingDesign: null, pendingDesignOnLoad: null });
      },

      insertBead(product, atIndex) {
        const radius = BRACELET_SIZE_RADIUS[get().braceletSize];
        if (!beadFits(get().beads, { product }, radius)) {
          return "Bracelet is full — no room for that bead.";
        }
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
      version: 3,
      migrate(persistedState: unknown, fromVersion: number) {
        const s = (persistedState ?? {}) as PersistedState;
        if (fromVersion < 1) {
          // Fix "chord" typo stored before the key was corrected to "cord"
          if (s.bandMaterial === "chord") s.bandMaterial = "cord";
          // Fields added in v1 — supply defaults if absent in old snapshots
          s.bandMaterial ??= "cord";
          s.braceletSize   ??= "small";
        }
        if (fromVersion < 2) {
          // BeadProduct fields changed to snake_case; old persisted beads are incompatible
          s.beads = [];
        }
        if (fromVersion < 3) {
          // activeDesignId added to persisted state
          s.activeDesignId ??= null;
        }
        return s;
      },
      partialize: (s) => ({
        beads: s.beads,
        braceletName: s.braceletName,
        braceletDescription: s.braceletDescription,
        bandMaterial: s.bandMaterial,
        braceletSize: s.braceletSize,
        activeDesignId: s.activeDesignId,
      }),
    }
  )
);