import { useBeads } from "@/hooks/useBeads";
import { useStore } from "@/lib/store";
import { DEFAULT_BRACELET_NAME } from "@/lib/constants";
import type { Bracelet, PlacedBead } from "@/types";

/**
 * Returns two functions:
 *
 * `loadPattern(pattern)` — maps the pattern onto the canvas as a fresh
 *   unsaved bracelet (does NOT set activePatternId or activeDesignId).
 *   Used by the "+ create bracelet" action.
 *
 * `editPattern(pattern)` — same mapping, but sets activePatternId so the
 *   header shows a "Save Pattern" button that writes back to PUT /patterns/:id.
 *   Used by the "Edit pattern" pencil action.
 *
 * If the canvas already has beads, calls setPendingPattern() instead of
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
  const setActivePatternId = useStore((s) => s.setActivePatternId);
  const beads              = useStore((s) => s.beads);
  const setPendingPattern  = useStore((s) => s.setPendingPattern);

  function applyPattern(pattern: Bracelet, patternId: number | null = null) {
    setActiveDesignId(null);
    setActivePatternId(patternId);
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
    if (configuration.hairtie_color != null) setHairtieColor(configuration.hairtie_color);
    // When editing a pattern keep its name; when creating a new bracelet reset to default.
    loadBeads(placedBeads, patternId !== null ? pattern.name : DEFAULT_BRACELET_NAME);
    markClean();
  }

  function loadPattern(pattern: Bracelet) {
    if (beads.length > 0) {
      setPendingPattern(pattern, false);
      return;
    }
    applyPattern(pattern, null);
  }

  function editPattern(pattern: Bracelet) {
    if (beads.length > 0) {
      setPendingPattern(pattern, true);
      return;
    }
    applyPattern(pattern, pattern.id);
  }

  return { loadPattern, editPattern, applyPattern };
}
