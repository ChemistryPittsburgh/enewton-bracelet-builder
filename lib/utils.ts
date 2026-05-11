import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a string into a URL-friendly slug.
 */
export const slugify = (str: string): string => {
  return str
    .toLowerCase()                          // Convert to lowercase [21, 24]
    .trim()                                 // Remove leading/trailing whitespace [4, 21]
    .normalize('NFD')                       // Split accented characters into base + accent [12, 14, 28]
    .replace(/[\u0300-\u036f]/g, '')        // Remove the accent marks [12, 14, 28]
    .replace(/[^a-z0-9 -]/g, '')            // Remove all non-alphanumeric characters [21, 28]
    .replace(/\s+/g, '-')                   // Replace spaces with hyphens [21, 28]
    .replace(/-+/g, '-');                   // Remove consecutive hyphens [21]
};

/**
 * Capitalize first letter in string
 */
export const capitalize = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};