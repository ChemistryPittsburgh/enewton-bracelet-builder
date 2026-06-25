import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { BeadProduct } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a string into a URL-friendly slug.
 */
export const slugify = (str: string): string => {
  return str
    .toLowerCase()                         
    .trim()                                 
    .normalize('NFD')                      
    .replace(/[\u0300-\u036f]/g, '')        
    .replace(/[^a-z0-9 -]/g, '')            
    .replace(/\s+/g, '-')                   
    .replace(/-+/g, '-');                   
};

/**
 * Converts a slug string into a Capitalize string w/ no hyphen
 */
export const unslugify = (slug: string, separator: string = '_'): string => {
  return slug
    .split(separator)
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
    .join(' ');
};

/**
 * Capitalize first letter in string
 */
export const capitalize = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/** Returns up to two uppercase initials from a display name. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Formats an ISO/MySQL datetime string as a relative label (e.g. "3 hours ago")
 * or a full date (e.g. "January 01, 2026") for timestamps older than 24 hours.
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString.replace(" ", "T"));
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins === 1 ? "1 minute ago" : `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Formats an ISO datetime as "mm/dd/yyyy, h:mm am/pm". */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso)).toLowerCase();
}

/**
 * Formats a millimetre value for display, keeping one decimal place
 * only when meaningful.
 *
 *   formatMm(4)     → "4"
 *   formatMm(3.5)   → "3.5"
 *   formatMm(12.0)  → "12"
 *   formatMm(7.25)  → "7.3"   (rounds to 1dp)
 */
export function formatMm(mm: number): string {
  const rounded = Math.round(mm * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}


/**
 * Free-text search match for a bead. Looks beyond the name to the bead's
 * taxonomy — type, category, material, colour — plus its SKU and size, so a
 * query like "gold", "charm", or "4mm" finds beads even when the term isn't in
 * the name. Separators (_ -) are treated as spaces, so "float charm" matches a
 * "float_charm" category. An empty query matches everything.
 */
export function beadMatchesSearch(
  bead: Pick<
    BeadProduct,
    "name" | "bead_type" | "bead_category" | "material" | "color" | "sku" | "size_mm"
  >,
  query: string,
): boolean {
  const q = query.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!q) return true;
  const fields = [
    bead.name,
    bead.bead_type,
    bead.bead_category,
    bead.material,
    bead.color,
    bead.sku,
    bead.size_mm != null ? `${bead.size_mm}mm` : null,
  ];
  return fields.some(
    (f) => f != null && String(f).toLowerCase().replace(/[_-]+/g, " ").includes(q),
  );
}