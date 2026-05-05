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
import { MAX_BEADS } from "@/lib/bead-layout";
import type { BeadProduct, PlacedBead } from "@/types";

interface Store {
  beads: PlacedBead[];

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
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      beads: [],
      selectedBead: null,

      addBead(product) {
        if (get().beads.length >= MAX_BEADS) {
          return `Bracelet is full (max ${MAX_BEADS} beads).`;
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
        }));
      },

      clearBeads() {
        set({ beads: [], selectedBead: null });
      },

      selectBead(bead) {
        set({ selectedBead: bead });
      },

      clearSelectedBead() {
        set({ selectedBead: null });
      },
    }),
    {
      name: "enewton-beads",
      storage: createJSONStorage(() => localStorage),
      // Only persist the bead list — panel always starts closed
      partialize: (s) => ({ beads: s.beads }),
    }
  )
);
