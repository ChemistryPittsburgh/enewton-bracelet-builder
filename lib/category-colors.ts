/**
 * category-colors.ts
 *
 * Single source of truth for all colour-coded UI elements:
 *   - Filter chip / badge categories (material, type, creator, tag, collection)
 *   - Bracelet workflow status badges
 *
 * NOTE: Tailwind class strings must appear in full (no interpolation) so the
 * compiler keeps them. Don't construct them dynamically.
 */

import type { BraceletStatus } from "@/types";

// ── Filter chip / badge categories ───────────────────────────────────────────

export const CATEGORY_STYLES = {
  material:   { bg: "bg-navy/20",    text: "text-navy-50",    label: "material"   },
  tag:        { bg: "bg-yellow-600",  text: "text-yellow-50",  label: "tag"       },
  type:       { bg: "bg-blush",   text: "text-blush-50",   label: "type"        },
  collection: { bg: "bg-green", text: "text-green-50", label: "collection" },
} as const;

export type CategoryKey = keyof typeof CATEGORY_STYLES;

// ── Bracelet workflow status ──────────────────────────────────────────────────

export const STATUS_META: Record<BraceletStatus, { label: string; cls: string }> = {
  draft:          { label: "In Progress",    cls: "bg-stone text-white" },
  in_review:      { label: "In Review",      cls: "bg-blush"   },
  approved:       { label: "Approved",       cls: "bg-orange text-white"    },
  published:      { label: "Published",      cls: "bg-green-100    text-green-700"   },
  rejected:       { label: "Rejected",       cls: "bg-rose-100     text-rose-700"    },
  discontinued:   { label: "Discontinued",   cls: "bg-error text-white"     },
};