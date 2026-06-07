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
  material:   { bg: "bg-blue-600",    text: "text-blue-50",    label: "material"   },
  type:       { bg: "bg-violet-600",  text: "text-violet-50",  label: "type"       },
  creator:    { bg: "bg-teal-600",    text: "text-teal-50",    label: "user"       },
  tag:        { bg: "bg-amber-500",   text: "text-amber-50",   label: "tag"        },
  collection: { bg: "bg-emerald-600", text: "text-emerald-50", label: "collection" },
} as const;

export type CategoryKey = keyof typeof CATEGORY_STYLES;

// ── Bracelet workflow status ──────────────────────────────────────────────────

export const STATUS_META: Record<BraceletStatus, { label: string; cls: string }> = {
  draft:          { label: "In Progress",    cls: "bg-neutral-100  text-neutral-600" },
  in_review:      { label: "In Review",      cls: "bg-amber-100    text-amber-700"   },
  approved:       { label: "Approved",       cls: "bg-blue-100     text-blue-700"    },
  published:      { label: "Published",      cls: "bg-green-100    text-green-700"   },
  rejected:       { label: "Rejected",       cls: "bg-rose-100     text-rose-700"    },
  discontinued:   { label: "Discontinued",   cls: "bg-red-100      text-red-600"     },
};