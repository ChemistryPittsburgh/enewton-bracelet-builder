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