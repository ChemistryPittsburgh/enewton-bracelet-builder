import { useBeads } from "@/hooks/useBeads";
import { useStore } from "@/lib/store";
import { DEFAULT_BRACELET_NAME } from "@/lib/constants";
import type { Bracelet, PlacedBead } from "@/types";

/**
 * Returns a `loadPattern()` function that maps a pattern `Bracelet` onto the
 * canvas as a fresh unsaved bracelet — does NOT set activeDesignId or acquire
 * a lock.
 *
 * If the canvas already has beads, calls `setPendingPattern()` instead of
 * loading immediately; ConfirmReplaceDialog handles the confirmation.
 */
export function useLoadPattern() {
  const { data: beadCatalog = [] } = useBeads();
  const loadBeads          = useStore((s) => s.loadBeads);
  const setBraceletSize    = useStore((s) => s.setBraceletSize);
  const setbandMaterial    = useStore((s) => s.setbandMaterial);
  const setHairtieColor    = useStore((s) => s.setHairtieColor);
  const markClean          = useStore((s) => s.markClean);
  const setActiveDesignId  = useStore((s) => s.setActiveDesignId);
  const beads              = useStore((s) => s.beads);
  const setPendingPattern  = useStore((s) => s.setPendingPattern);

  function applyPattern(pattern: Bracelet) {
    setActiveDesignId(null);
    const { configuration } = pattern;

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
    if (configuration.hairtie_color) setHairtieColor(configuration.hairtie_color);
    loadBeads(placedBeads, DEFAULT_BRACELET_NAME);
    markClean();
  }

  function loadPattern(pattern: Bracelet) {
    if (beads.length > 0) {
      setPendingPattern(pattern);
      return;
    }
    applyPattern(pattern);
  }

  return { loadPattern, applyPattern };
}
