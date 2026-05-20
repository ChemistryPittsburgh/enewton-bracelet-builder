export interface User {
  id: number;
  name: string;
  email: string;
  permissions: {
    is_admin: boolean;
    is_bracelet_editor: boolean;
    is_reviewer: boolean;
    is_publisher: boolean;
    is_component_admin: boolean;
  };
  active: number;
}

export type BandMaterial = "wire" | "cord" | "elastic";
export type BraceletSize =  "x-small" | "small" | "large";

/**
 * A bead/charm product the user can add to their bracelet.
 */
export interface BeadProduct {
  id: string;
  name: string;
  /** Path inside /public/models/ */
  glbPath: string;
  beadType?: string; 
  sku?: string; 
  diameter: number;
  /** Material: "gold" | "silver" | "pearl" | "gemstones" | "seed" etc */
  material?: string;
  /** Top-level tab: "beads" | "charms" | "tubes" */
  beadCategory?: string;
  /** Size in mm — used for the size filter pills */
  sizeMm?: number;
}

/**
 * A single bead that has been placed on the bracelet.
 */
export interface PlacedBead {
  /** Unique instance ID — same product can appear multiple times */
  instanceId: string;
  product: BeadProduct;
}
