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
import type { BeadProduct, PlacedBead } from "@/types";
import { beadFits } from "@/lib/bead-layout";

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

  /** Replace the entire bead list — used by the JSON importer. */
  loadBeads: (beads: PlacedBead[]) => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      beads: [],
      selectedBead: null,

      addBead(product) {
        if (!beadFits(get().beads, product.diameter ?? 0.01)) {
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
      loadBeads(beads) {
        set({ beads, selectedBead: null });
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
