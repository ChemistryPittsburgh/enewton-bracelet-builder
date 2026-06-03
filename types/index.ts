// ─── Bracelet workflow ───────────────────────────────────────────────────────

/**
 * Approval / workflow status for a saved bracelet design.
 * Maps to the sidebar filters in SavedDesignsPanel.
 */
export type BraceletStatus =
  | "draft"          // initial save — shows as "In-progress"
  | "in_review"      // submitted for review — shows as "In-review"
  | "approved"       // approved by reviewer — shows as "Approved"
  | "published"      // live — shows as "Published"
  | "design_concept" // concept stage — shows as "Design concepts"
  | "discontinued";  // retired — shows as "Discontinued (vintage)"

/** One bead slot as stored in the bracelet configuration. */
export interface BraceletConfigBead {
  position: number;
  product_id: number;
  instance_id: string;
}

/**
 * Full bracelet configuration persisted on the server.
 * Extends the legacy { beads: number[] } shape with layout + band metadata.
 */
export interface BraceletConfiguration {
  band_material: BandMaterial;
  bracelet_size: BraceletSize;
  arc_used_mm: number;
  arc_total_mm: number;
  percent_used: number;
  beads: BraceletConfigBead[];
}

/**
 * POST /designs request body.
 *
 * material_tags — unique bead materials in the design (e.g. ["gold", "silver"]).
 *                 Derived client-side from PlacedBead[].product.material.
 *
 * bead_types    — unique bead type labels (e.g. ["Hope", "Dignity"]).
 *                 Derived client-side from PlacedBead[].product.bead_type.
 *
 * collection_id — TBD; placeholder null until collection logic is defined (see Figma).
 *
 * preview_image_url — S3 URL of the generated thumbnail PNG.
 *                     Two-step flow: upload PNG → receive URL → include here.
 *                     Null when thumbnail is not yet available.
 */
export interface CreateBraceletRequest {
  name: string;
  description?: string | null;
  configuration: BraceletConfiguration;
  material_tags: string[];
  bead_types: string[];
  collection_id: number | null;
  preview_image_url: string | null;
  shopify_sku?: string | null;
  /** Defaults to "draft" on the server when omitted. */
  status?: BraceletStatus;
}

/** Full bracelet record returned by GET /designs/:id and POST /designs. */
export interface Bracelet {
  id: number;
  name: string;
  description: string | null;
  configuration: BraceletConfiguration;
  material_tags: string[];
  bead_types: string[];
  collection_id: number | null;
  preview_image_url: string | null;
  shopify_sku: string | null;
  status: BraceletStatus;
  reviewed_by: number | null;
  reviewed_at: string | null;
  published_by: number | null;
  published_at: string | null;
  created_by: number;
  active: number;
  created_at: string;
  updated_at: string;
  reviewed_by_name: string | null;
  published_by_name: string | null;
  created_by_name: string;
}

/** Paginated list response from GET /designs. */
export interface DesignsPage {
  data: Bracelet[];
  total: number;
  per_page: number;
  current_page: number;
}

/**
 * PUT /designs/:id request body.
 * Only editable fields — status transitions use the dedicated action endpoints.
 * Cannot edit designs with status "approved" or "published".
 */
export interface UpdateDesignRequest {
  id: number;
  name?: string;
  description?: string | null;
  configuration?: BraceletConfiguration;
  /** Refreshed thumbnail URL — captured and uploaded before calling PUT /designs/:id. */
  preview_image_url?: string | null;
}

// ─── Users ───────────────────────────────────────────────────────────────────

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
  // ── Charm-specific optional fields ───────────────────────────────────────────
  hang_offset?: number;
  hang_length?: number;
  depth_offset?: number;
  bail_width_mm?: number;
  total_height_mm?: number;
  body_width_mm?: number;
}

/**
 * A single bead that has been placed on the bracelet.
 */
export interface PlacedBead {
  /** Unique instance ID — same product can appear multiple times */
  instanceId: string;
  product: BeadProduct;
}

/** A comment posted on a saved bracelet design. */
export interface DesignComment {
  id: number;
  bracelet_id: number;
  user_id: number;
  user_name: string;
  body: string;
  created_at: string;
  updated_at: string;
}
