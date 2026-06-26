import { useStore } from "@/lib/store";
import { useDesign } from "@/hooks/useDesign";

/**
 * Computes whether the current canvas state differs from the last saved design.
 *
 * Bypasses the store's `isDirty` flag (which can be set true by intermediate
 * calls during loadDesign) and instead compares fields directly against the
 * React Query cache for the active design.
 *
 * IMPORTANT: cfg.beads from the API is unsorted. useLoadDesign sorts by
 * position before populating the store, so we must sort here too before
 * comparing — otherwise the index-based comparison always returns true.
 */
export function useIsDirty(): boolean {
  const {
    activeDesignId,
    beads,
    braceletName,
    braceletDescription,
    bandMaterial,
    braceletSize,
    isEvenlySpaced,
  } = useStore((s) => ({
    activeDesignId:      s.activeDesignId,
    beads:               s.beads,
    braceletName:        s.braceletName,
    braceletDescription: s.braceletDescription,
    bandMaterial:        s.bandMaterial,
    braceletSize:        s.braceletSize,
    isEvenlySpaced:      s.isEvenlySpaced,
  }));

  const { data: savedDesign } = useDesign(activeDesignId);

  // New bracelet — only dirty if the user has placed beads
  if (activeDesignId === null) return beads.length > 0;

  // Design not yet in cache — optimistically clean
  if (!savedDesign) return false;

  const cfg = savedDesign.configuration;

  if (braceletName !== savedDesign.name)                                       return true;
  if ((braceletDescription || null) !== (savedDesign.description || null))     return true;
  if (braceletSize !== cfg.bracelet_size)                                       return true;
  if (bandMaterial !== cfg.band_material)                                       return true;
  if (isEvenlySpaced !== (cfg.is_evenly_spaced ?? false))                       return true;
  if (beads.length !== cfg.beads.length)                                        return true;

  // Sort cfg.beads by position to match the order useLoadDesign produces.
  // Without this, index 0 in the store (position-sorted) can differ from
  // index 0 in cfg.beads (API order), making this always return true.
  const sortedCfgBeads = [...cfg.beads].sort((a, b) => a.position - b.position);
  return beads.some((b, i) => b.product.id !== sortedCfgBeads[i].product_id);
}