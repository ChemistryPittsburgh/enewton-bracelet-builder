"use client";

import { useState, useEffect } from "react";
import { DEFAULT_BRACELET_NAME } from "@/lib/constants";

type HighlightReason = "name" | "sku" | null;

/**
 * Manages the highlight reason for the bracelet name and SKU fields,
 * auto-clearing each one once the underlying condition is resolved:
 *   "name" — clears when the bracelet name is non-empty and non-default
 *   "sku"  — clears when the active design's Shopify SKU is saved
 */
export function useHighlightReason(
  braceletName: string,
  shopifySku: string | null | undefined,
): [HighlightReason, (r: HighlightReason) => void] {
  const [highlightReason, setHighlightReason] = useState<HighlightReason>(null);

  useEffect(() => {
    if (highlightReason !== "name") return;
    const trimmed = braceletName.trim();
    if (trimmed !== "" && trimmed !== DEFAULT_BRACELET_NAME) setHighlightReason(null);
  }, [braceletName, highlightReason]);

  useEffect(() => {
    if (highlightReason !== "sku") return;
    if (shopifySku?.trim()) setHighlightReason(null);
  }, [shopifySku, highlightReason]);

  return [highlightReason, setHighlightReason];
}
