"use client";

import { useState, useEffect } from "react";

/**
 * Sets the cursor to "grabbing" and tracks the pointer position while a
 * panel-drag is active, so the caller can position a ghost element.
 *
 * @param active - pass `!!dragFromPanel` (already read from the store by the caller)
 */
export function useDragGhostCursor(active: boolean): { x: number; y: number } {
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!active) return;
    document.body.style.cursor = "grabbing";
    const onMove = (e: PointerEvent) => setGhostPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.body.style.cursor = "";
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return ghostPos;
}
