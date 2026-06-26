"use client";

import { useState, useEffect } from "react";

/**
 * Tracks whether the viewport is at the "narrow desktop" breakpoint (≤1199px)
 * and collapses the right panel when both panels are open at that width.
 *
 * Returns the current `isNarrow` boolean.
 */
export function useNarrowLayout(
  braceletPanelOpen: boolean,
  rightPanelOpen: boolean,
  setRightPanel: (v: null) => void,
): boolean {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1199px)");
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (isNarrow && braceletPanelOpen && rightPanelOpen) setRightPanel(null);
  }, [isNarrow, braceletPanelOpen, rightPanelOpen, setRightPanel]);

  return isNarrow;
}
