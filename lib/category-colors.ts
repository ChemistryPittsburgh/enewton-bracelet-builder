/**
 * category-colors.ts
 *
 * Single source of truth for all colour-coded UI elements:
 *   - Filter chip / badge categories (material, type, creator, tag, collection)
 *   - Bracelet workflow status badges
 *   - User role badge colours
 *
 * NOTE: Tailwind class strings must appear in full (no interpolation) so the
 * compiler keeps them. Don't construct them dynamically.
 */
import type { BraceletStatus } from "@/types";
import type { User } from "@/types";

// ── Filter chip / badge categories ───────────────────────────────────────────
export const CATEGORY_STYLES = {
  material:   { bg: "bg-mint",       label: "material"   },
  type:       { bg: "bg-blush",      label: "type"       },
  tag:        { bg: "bg-light-blue", label: "tag"        },
  collection: { bg: "bg-shell",      label: "collection" },
} as const;

export type CategoryKey = keyof typeof CATEGORY_STYLES;

// ── Bracelet workflow status ──────────────────────────────────────────────────
export const STATUS_META: Record<BraceletStatus, { label: string; cls: string }> = {
  draft:        { label: "In Progress",  cls: "bg-gold/20 text-[8f7b3d]" },
  in_review:    { label: "In Review",    cls: "bg-[#2471a3]/20 text-[#185278]"},
  approved:     { label: "Approved",     cls: "bg-[#0d5c52]/20 text-[#0d5c52]"},
  published:    { label: "Published",    cls: "bg-[#6c3483]/20 text-[#6c3483]"},
  rejected:     { label: "Rejected",     cls: "bg-error/20 text-error"},
  discontinued: { label: "Discontinued", cls: "bg-color-base/10 text-color-base/80"},
};

// ── Bead / charm category badges ──────────────────────────────────────────────
export const BEAD_CATEGORY_META: Record<string, { label: string; cls: string }> = {
  bead:    { label: "Bead",    cls: "bg-green/20 text-[#1e6b3a]"  },
  charm:   { label: "Charm",   cls: "bg-gold/30 text-color-base/80" },
  spacer:  { label: "Spacer",  cls: "bg-stone/30 text-color-base/60" },
  tube:  { label: "Tube",  cls: "bg-[#2471a3]/20 text-[#0d5c52]" },
  gem:  { label: "Gem",  cls: "bg-[#c0774a]/20 text-[#c0774a]" },
  resin_cross:  { label: "Resin Cross",  cls: "bg-[#6c3483]/20 text-[#6c3483]" }
};

const DEFAULT_BEAD_CATEGORY: { label: string; cls: string } = {
  label: "Bead",
  cls: "bg-light-grey text-color-base/60",
};

export function getBeadCategoryMeta(category: string | null | undefined) {
  return BEAD_CATEGORY_META[category ?? "bead"] ?? DEFAULT_BEAD_CATEGORY;
}

// ── User/Avatar Colors ──────────────────────────────────────────────────
export const AVATAR_COLORS = [
  "#1F3A5F", // navy
  "#a38d48", // gold
  "#0d5c52", // teal
  "#9b3a3a", // terracotta
  "#6c3483", // purple
  "#1e6b3a", // forest
  "#2471a3", // steel blue
  "#c0774a", // copper
  "#8b3040", // rose
  "#5d6d7e", // slate
] as const;