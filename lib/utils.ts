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
    .toLowerCase()                         
    .trim()                                 
    .normalize('NFD')                      
    .replace(/[\u0300-\u036f]/g, '')        
    .replace(/[^a-z0-9 -]/g, '')            
    .replace(/\s+/g, '-')                   
    .replace(/-+/g, '-');                   
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