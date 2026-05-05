/**
 * A bead/charm product the user can add to their bracelet.
 */
export interface BeadProduct {
  id: string;
  name: string;
  /** Path inside /public/models/ */
  glbPath: string;
  /**
   * Bead diameter in metres — used for spacing on the cord.
   * Measured from the GLB bounding box (X or Z extent).
   * Dignity 4mm beads = 0.00421
   */
  diameter: number;
}

/**
 * A single bead that has been placed on the bracelet.
 */
export interface PlacedBead {
  /** Unique instance ID — same product can appear multiple times */
  instanceId: string;
  product: BeadProduct;
}
