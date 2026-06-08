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
  draft:        { label: "In Progress",  cls: "bg-stone text-white"       },
  in_review:    { label: "In Review",    cls: "bg-blush"                  },
  approved:     { label: "Approved",     cls: "bg-gold text-white"        },
  published:    { label: "Published",    cls: "bg-green text-white"       },
  rejected:     { label: "Rejected",     cls: "bg-error/20 text-error"    },
  discontinued: { label: "Discontinued", cls: "bg-error text-white"       },
};

// ── User role permission fields ───────────────────────────────────────────────
// `color` drives both the badge chip in UsersAdminScreen and the
// permissions dropdown checkbox accent.
export const PERMISSION_FIELDS: {
  key:   keyof User["permissions"];
  label: string;
  color: string;
}[] = [
  { key: "is_bracelet_editor", label: "Bracelet Editor", color: "bg-mint"       },
  { key: "is_reviewer",        label: "Reviewer",        color: "bg-shell"      },
  { key: "is_publisher",       label: "Publisher",       color: "bg-light-blue" },
  { key: "is_component_admin", label: "Component Admin", color: "bg-blush"      },
  { key: "is_admin",           label: "Admin",           color: "bg-green/30"   },
];