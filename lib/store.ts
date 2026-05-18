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
import type { BeadProduct, PlacedBead, BandMaterial, BraceletSize } from "@/types";
import { beadFits } from "@/lib/bead-layout";
import { BRACELET_SIZE_RADIUS } from "@/lib/constants";

type PersistedState = {
  beads?: PlacedBead[];
  braceletName?: string;
  bandMaterial?: string;
  braceletSize?: string;
};

interface Store {
  beads: PlacedBead[];
  braceletName: string;

  /** The bead currently tapped in the 3D scene — drives the info panel. */
  selectedBead: PlacedBead | null;

  /** Add a bead to the next available slot. Returns an error string or null. */
  addBead: (product: BeadProduct) => string | null;

  /** Remove a bead by instanceId. Closes the panel if that bead was selected. */
  removeBead: (instanceId: string) => void;

  /** Remove all beads and close the panel. */
  clearBeads: () => void;

  /** Open the info panel for a specific bead. */
  selectBead: (bead: PlacedBead) => void;

  /** Close the info panel without removing anything. */
  clearSelectedBead: () => void;

  /** Replace the entire bead list — used by the JSON importer. */
  loadBeads: (beads: PlacedBead[], name?: string) => void;

  setBraceletName: (name: string) => void;

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
}

/** Persist the store to localStorage.
 * If fields change be sure to update the migrate function to convert the old data to the new format.
*/
export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      beads: [],
      selectedBead: null,
      braceletName: "My Bracelet",
      bandMaterial: "cord" as BandMaterial,
      braceletSize: "small" as BraceletSize,
      beadLoadErrors: [],
      isEditMode: false,
      editSelectedBead: null,
      editViewMode: 'top' as const,

      addBead(product) {
        const radius = BRACELET_SIZE_RADIUS[get().braceletSize];
        if (!beadFits(get().beads, product.diameter, radius)) {
          return "Bracelet is full — no room for that bead.";
        }
        set((s) => ({
          beads: [...s.beads, { instanceId: nanoid(), product }],
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
        }));
      },

      clearBeads() {
        set({ beads: [], selectedBead: null, beadLoadErrors: [] });
      },

      selectBead(bead) {
        set({ selectedBead: bead });
      },

      clearSelectedBead() {
        set({ selectedBead: null });
      },
      loadBeads(beads, name) {
        set({ beads, selectedBead: null, ...(name ? { braceletName: name } : {}) });
      },

      setBraceletName(name) {
        set({ braceletName: name });
      },

      reorderBeads(fromIndex, toIndex) {
        set((s) => {
          const arr = [...s.beads];
          const [moved] = arr.splice(fromIndex, 1);
          arr.splice(toIndex, 0, moved);
          return { beads: arr };
        });
      },

      duplicateBead(instanceId) {
        const { beads, braceletSize } = get();
        const index = beads.findIndex((b) => b.instanceId === instanceId);
        if (index === -1) return;
        const bead = beads[index];
        const radius = BRACELET_SIZE_RADIUS[braceletSize];
        if (bead.product.diameter === undefined) return;
        if (!beadFits(beads, bead.product.diameter, radius)) return;
        const copy: PlacedBead = { instanceId: nanoid(), product: bead.product };
        set({ beads: [...beads.slice(0, index + 1), copy, ...beads.slice(index + 1)] });
      },

      reverseBracelet() {
        set((s) => ({ beads: [...s.beads].reverse() }));
      },

      setbandMaterial: (bandMaterial) => set({ bandMaterial }),
      setBraceletSize: (braceletSize) => set({ braceletSize }),

      setEditSelectedBead(bead) {
        set({ editSelectedBead: bead });
      },

      toggleEditMode() {
        set((s) => ({ isEditMode: !s.isEditMode, selectedBead: null, editSelectedBead: null, editViewMode: 'top' }));
      },

      toggleEditViewMode() {
        set((s) => ({ editViewMode: s.editViewMode === 'top' ? 'side' : 'top' }));
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
      version: 1,
      migrate(persistedState: unknown, fromVersion: number) {
        const s = (persistedState ?? {}) as PersistedState;
        if (fromVersion < 1) {
          // Fix "chord" typo stored before the key was corrected to "cord"
          if (s.bandMaterial === "chord") s.bandMaterial = "cord";
          // Fields added in v1 — supply defaults if absent in old snapshots
          s.bandMaterial ??= "cord";
          s.braceletSize   ??= "small";
        }
        return s;
      },
      partialize: (s) => ({
        beads: s.beads,
        braceletName: s.braceletName,
        bandMaterial: s.bandMaterial,
        braceletSize: s.braceletSize,
      }),
    }
  )
);
