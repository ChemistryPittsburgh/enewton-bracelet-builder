// ─── Bracelet workflow ───────────────────────────────────────────────────────

/**
 * Approval / workflow status for a saved bracelet design.
 * Maps to the sidebar filters in SavedDesignsPanel.
 *
 * Note: "discontinued" is not a real DB column value — it is a derived UI
 * status computed from `is_discontinued === 1`. The status column for a
 * discontinued design remains "published". It is included here so that
 * STATUS_META, STATUS_CLS, and similar record maps can be typed exhaustively
 * without a separate DerivedBraceletStatus union.
 */
export type BraceletStatus =
  | "draft"           // initial save — shows as "In-progress"
  | "in_review"       // submitted for review — shows as "In-review"
  | "approved"        // approved by reviewer — shows as "Approved"
  | "published"       // live — shows as "Published"
  | "rejected"        // rejected during review — requires revision before resubmitting
  | "discontinued";   // derived: is_discontinued === 1, status column = "published"

/** One bead slot as stored in the bracelet configuration. */
export interface BraceletConfigBead {
  position: number;
  product_id: number;
  instance_id: string;
  /** Present only for seed_segment items — serialises the colorway + arc config. */
  seed_config?: SeedSegmentConfig;
}

/**
 * Full bracelet configuration persisted on the server.
 * Extends the legacy { beads: number[] } shape with layout + band metadata.
 */
export interface BraceletConfiguration {
  band_material: BandMaterial;
  bracelet_size: BraceletSize;
  hairtie_color?: string | null;
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
 * collection_id — Legacy FK field. Will be removed once the API migrates to
 *                 the many-to-many collections junction table.
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
  /** When true, creates a pattern template instead of a user design. */
  is_pattern?: boolean;
}

/** Who currently holds the edit lock on a design. */
export interface DesignLock {
  user_id:      number;
  user_name:    string;
  heartbeat_at: string;
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
  /** Collections this design belongs to (many-to-many, like tags). */
  collections: Collection[];
  preview_image_url: string | null;
  shopify_sku: string | null;
  /**
   * The status column value from the DB. Never "discontinued" — use
   * `is_discontinued` to check that state.
   */
  status: Exclude<BraceletStatus, "discontinued">;
  reviewed_by: number | null;
  reviewed_at: string | null;
  published_by: number | null;
  published_at: string | null;
  created_by: number;
  active: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  reviewed_by_name: string | null;
  published_by_name: string | null;
  created_by_name: string;
  /** Tags applied to this design */
  tags: Tag[];
  /** 1 = discontinued (admins can reactivate). */
  is_discontinued: number;
  /** 1 = this design is a reusable pattern template. */
  is_pattern: number;
  /** Non-null when another user currently holds an edit lock on this design. */
  active_lock: DesignLock | null;
  /** Reason provided by the reviewer when the design was rejected. */
  rejection_reason: string | null;
  rejected_at: string | null;
  rejected_by_name: string | null;
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
  created_at: string;
  updated_at: string;
  color?: string;
}

export type BandMaterial = "stretchy" | "hairtie";
export type BraceletSize = "small" | "medium" | "large";

export type HairtieColor =
  | "gray" | "white" | "mint" | "pink" | "bright red"
  | "navy" | "wine" | "light blue" | "onyx" | "gold"
  | "orange" | "cobalt" | "bright orange" | "purple" | "dark green";

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

// ─── Seed bead segments ───────────────────────────────────────────────────────

/** One color entry in a seed bead colorway. */
export interface SeedColorEntry {
  hex: string;
  percent: number;
  label?: string;
  is_metallic?: boolean;
}

/**
 * Configuration for a seed bead segment — a run of tiny procedurally-generated
 * beads that fills a specific arc length on the bracelet.
 */
export interface SeedSegmentConfig {
  /** colors and their proportions (must sum to 100). */
  colorway: SeedColorEntry[];
  /** Total arc length this segment occupies, in millimetres. */
  arc_length_mm: number;
  /** Min/max individual bead diameter range in mm — randomised per bead. */
  bead_size_range: [number, number];
  /** Deterministic seed for the PRNG — ensures consistent rendering. */
  random_seed: number;
  /**
   * Shape of the individual beads in this segment.
   * - "seed" (default): flat disc-shaped seed beads with randomised size/color
   * - "round": uniform spherical beads (like Classic Bead) — no size or color variation
   */
  seed_shape?: "seed" | "round";
  /**
   * Fixed bead diameter in mm when seed_shape === "round".
   * Currently 1 or 2 (mm). Ignored for seed_shape === "seed".
   */
  round_size_mm?: number;
  /**
   * Nominal individual bead size in mm when seed_shape === "seed" — 1 (Small)
   * or 2 (Large). Each bead still varies slightly around this value. When set,
   * it drives bead_size_range; absent on legacy configs (which use the stored
   * bead_size_range directly).
   */
  seed_size_mm?: number;
}

/**
 * A single bead that has been placed on the bracelet.
 */
export interface PlacedBead {
  /** Unique instance ID — same product can appear multiple times */
  instanceId: string;
  product: BeadProduct;
  /** Present only when bead_category === "seed_segment". */
  seedConfig?: SeedSegmentConfig;
}

// ─── Collections ──────────────────────────────────────────────────────────────

/**
 * A collection groups bracelet designs (and eventually bead products) together.
 * A design can belong to multiple collections (many-to-many, like tags).
 */
export interface Collection {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionRequest {
  name: string;
}

export interface UpdateCollectionRequest {
  id: number;
  name?: string;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

/** A custom label/tag that can be applied to bracelet designs. */
export interface Tag {
  id: number;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTagRequest {
  name: string;
  color?: string | null;
}

export interface UpdateTagRequest {
  id: number;
  name?: string;
  color?: string | null;
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