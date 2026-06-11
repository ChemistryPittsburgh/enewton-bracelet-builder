import { useBeads } from "@/hooks/useBeads";
import { useStore } from "@/lib/store";
import { useLockDesign } from "@/hooks/useLockDesign";
import { useReleaseLock } from "@/hooks/useReleaseLock";
import type { Bracelet, PlacedBead } from "@/types";

/**
 * Returns a `loadDesign()` function that maps a saved `Bracelet` record onto
 * the canvas by:
 *
 *   1. Sorting the configuration beads by position.
 *   2. Resolving each `product_id` against the cached bead catalog.
 *      Beads whose product is no longer in the catalog are silently skipped.
 *   3. Restoring bracelet size and band material from the configuration.
 *   4. Calling `store.loadBeads()` to replace the current canvas state.
 *
 * The bead catalog is read from the existing React Query cache
 * (populated by `useBeads()` in BuilderLayout) — no extra network request.
 */
export function useLoadDesign() {
  const { data: beadCatalog = [] } = useBeads();
  const loadBeads = useStore((s) => s.loadBeads);
  const setBraceletSize = useStore((s) => s.setBraceletSize);
  const setbandMaterial = useStore((s) => s.setbandMaterial);
  const setActiveDesignId = useStore((s) => s.setActiveDesignId);
  const markClean = useStore((s) => s.markClean);
  const setBraceletDescription = useStore((s) => s.setBraceletDescription);
  const startNewBracelet = useStore((s) => s.startNewBracelet);
  const currentActiveDesignId = useStore((s) => s.activeDesignId);

  const { mutateAsync: lockDesign } = useLockDesign();
  const { mutateAsync: releaseLockAsync } = useReleaseLock();

  async function loadDesign(
    design: Bracelet,
    lockAlreadyAcquired = false,
  ): Promise<boolean> {
    // Explicitly release the existing lock before loading the new design so the
    // server receives DELETE before POST — avoids a brief window where the user
    // appears to hold two locks simultaneously.
    if (currentActiveDesignId !== null && currentActiveDesignId !== design.id) {
      await releaseLockAsync(currentActiveDesignId);
    }

    const { configuration, name } = design;

    const placedBeads: PlacedBead[] = configuration.beads
      .slice()
      .sort((a, b) => a.position - b.position)
      .flatMap((configBead) => {
        const product = beadCatalog.find((p) => p.id === configBead.product_id);
        if (!product) return []; // product removed from catalog — skip gracefully
        return [{ instanceId: configBead.instance_id, product }];
      });

    // Restore size + material before loading beads so capacity checks use
    // the correct radius for the saved bracelet.
    setBraceletSize(configuration.bracelet_size);
    setbandMaterial(configuration.band_material);
    loadBeads(placedBeads, name);

    // Restore description (empty string when null so the input stays controlled).
    setBraceletDescription(design.description ?? "");

    // Mark this design as the active one — subsequent saves become updates.
    setActiveDesignId(design.id);

    // All fields restored — clear the dirty flag so loading another design
    // without making changes won't trigger the confirm dialog.
    markClean();

    // Acquire the edit lock (skip for published — already read-only via the API).
    // lockHeld UI state is managed by BuilderLayout's acquisition effect; this
    // call only ensures the server-side lock is held before the canvas opens.
    if (design.status !== "published" && !lockAlreadyAcquired) {
      try {
        const result = await lockDesign({ id: design.id });
        if (!result.acquired) {
          // Race condition: someone else claimed the lock between the list render
          // and this load. Roll back without discarding the user's size/material.
          startNewBracelet();
          return false;
        }
      } catch {
        // Non-conflict errors (network etc.) don't block the load — the heartbeat
        // will reveal if the lock is lost later.
      }
    }

    return true;
  }

  // Syncs the Zustand store from a freshly polled Bracelet without acquiring the
  // lock or changing activeDesignId — used to keep a read-only canvas current.
  function syncDesign(design: Bracelet) {
    const { configuration, name, description } = design;
    const placedBeads: PlacedBead[] = configuration.beads
      .slice()
      .sort((a, b) => a.position - b.position)
      .flatMap((configBead) => {
        const product = beadCatalog.find((p) => p.id === configBead.product_id);
        if (!product) return [];
        return [{ instanceId: configBead.instance_id, product }];
      });

    setBraceletSize(configuration.bracelet_size);
    setbandMaterial(configuration.band_material);
    loadBeads(placedBeads, name);
    setBraceletDescription(description ?? "");
    markClean();
  }

  return { loadDesign, syncDesign };
}
