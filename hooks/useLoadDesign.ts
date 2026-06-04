import { useBeads } from "@/hooks/useBeads";
import { useStore } from "@/lib/store";
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

  function loadDesign(design: Bracelet): void {
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
  }

  return { loadDesign };
}