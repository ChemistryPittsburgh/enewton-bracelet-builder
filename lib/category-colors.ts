/**
 * Visual styles for categorised UI elements (filter chips, badge pills, etc).
 *
 *
 * NOTE: Tailwind class strings must appear in full (no interpolation) so the
 * compiler keeps them. Don't construct them dynamically.
 */

export const CATEGORY_STYLES = {
  material:   { bg: "bg-blue-600",    text: "text-blue-50",    label: "material" },
  type:       { bg: "bg-violet-600",  text: "text-violet-50",  label: "type" },
  creator:    { bg: "bg-teal-600",    text: "text-teal-50",    label: "user" },
  tag:        { bg: "bg-amber-500",   text: "text-amber-50",   label: "tag" },
  collection: { bg: "bg-emerald-600", text: "text-emerald-50", label: "collection" },
} as const;

export type CategoryKey = keyof typeof CATEGORY_STYLES;