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
  id: number;
  slug: string;
  name: string;
  glb_path: string;
  bead_type: string | null;
  diameter: number;
  sku: string | null;
  bead_category: string | null;
  color: string | null;
  material: string | null;
  size_mm: number | null;
  active: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * A single bead that has been placed on the bracelet.
 */
export interface PlacedBead {
  /** Unique instance ID — same product can appear multiple times */
  instanceId: string;
  product: BeadProduct;
}
