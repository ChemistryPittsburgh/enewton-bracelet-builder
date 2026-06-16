"use client";

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import type { ReactNode } from "react";

type Placement =
  | "top" | "top-start" | "top-end"
  | "bottom" | "bottom-start" | "bottom-end"
  | "left" | "left-start" | "left-end"
  | "right" | "right-start" | "right-end";

interface TooltipProps {
  /** The tooltip text (or ReactNode for rich content). */
  content: ReactNode;
  /** Which side the tooltip appears on. Default: "top". */
  placement?: Placement;
  /** Delay in ms before showing. Default: 300. */
  delay?: number;
  /** Additional class names on the tooltip bubble. */
  className?: string;
  /** The trigger element(s). */
  children: ReactNode;
}

const VIEWPORT_PADDING = 8; // px from screen edge

/**
 * Lightweight tooltip with 12 MUI-style placements and automatic
 * viewport clamping — repositions if it would overflow the screen.
 *
 * Usage:
 *   <Tooltip content="Edit bead" placement="top-start">
 *     <button><Pencil size={16} /></button>
 *   </Tooltip>
 */
export function Tooltip({
  content,
  placement = "top",
  delay = 300,
  className = "",
  children,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [adjustedPlacement, setAdjustedPlacement] = useState<Placement>(placement);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setVisible(false);
    setAdjustedPlacement(placement);
  }, [placement]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Reset adjusted placement when the prop changes
  useEffect(() => {
    setAdjustedPlacement(placement);
  }, [placement]);

  // After rendering, check if the tooltip overflows the viewport and flip if needed
  useLayoutEffect(() => {
    if (!visible || !tooltipRef.current || !triggerRef.current) return;

    const tip = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let next = placement;

    // Flip primary axis if clipping
    if (placement.startsWith("top") && tip.top < VIEWPORT_PADDING) {
      next = placement.replace("top", "bottom") as Placement;
    } else if (placement.startsWith("bottom") && tip.bottom > vh - VIEWPORT_PADDING) {
      next = placement.replace("bottom", "top") as Placement;
    } else if (placement.startsWith("left") && tip.left < VIEWPORT_PADDING) {
      next = placement.replace("left", "right") as Placement;
    } else if (placement.startsWith("right") && tip.right > vw - VIEWPORT_PADDING) {
      next = placement.replace("right", "left") as Placement;
    }

    // Horizontal overflow for top/bottom placements
    if (next.startsWith("top") || next.startsWith("bottom")) {
      if (tip.left < VIEWPORT_PADDING) {
        next = next.split("-")[0] + "-start" as Placement;
      } else if (tip.right > vw - VIEWPORT_PADDING) {
        next = next.split("-")[0] + "-end" as Placement;
      }
    }

    setAdjustedPlacement(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, placement]);

  // ── Position styles ──────────────────────────────────────────────────────
  const positionStyles: Record<Placement, React.CSSProperties> = {
    // Top
    "top":       { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6 },
    "top-start": { bottom: "100%", left: 0, marginBottom: 6 },
    "top-end":   { bottom: "100%", right: 0, marginBottom: 6 },
    // Bottom
    "bottom":       { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 6 },
    "bottom-start": { top: "100%", left: 0, marginTop: 6 },
    "bottom-end":   { top: "100%", right: 0, marginTop: 6 },
    // Left
    "left":       { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: 6 },
    "left-start": { right: "100%", top: 0, marginRight: 6 },
    "left-end":   { right: "100%", bottom: 0, marginRight: 6 },
    // Right
    "right":       { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: 6 },
    "right-start": { left: "100%", top: 0, marginLeft: 6 },
    "right-end":   { left: "100%", bottom: 0, marginLeft: 6 },
  };

  // ── Arrow styles ─────────────────────────────────────────────────────────
  const arrowStyles: Record<Placement, React.CSSProperties> = {
    "top":       { top: "100%", left: "50%", transform: "translateX(-50%)", borderColor: "rgb(246 243 238) transparent transparent transparent" },
    "top-start": { top: "100%", left: 12, borderColor: "rgb(246 243 238) transparent transparent transparent" },
    "top-end":   { top: "100%", right: 12, borderColor: "rgb(246 243 238) transparent transparent transparent" },
    "bottom":       { bottom: "100%", left: "50%", transform: "translateX(-50%)", borderColor: "transparent transparent rgb(246 243 238) transparent" },
    "bottom-start": { bottom: "100%", left: 12, borderColor: "transparent transparent rgb(246 243 238) transparent" },
    "bottom-end":   { bottom: "100%", right: 12, borderColor: "transparent transparent rgb(246 243 238) transparent" },
    "left":       { left: "100%", top: "50%", transform: "translateY(-50%)", borderColor: "transparent transparent transparent rgb(246 243 238)" },
    "left-start": { left: "100%", top: 8, borderColor: "transparent transparent transparent rgb(246 243 238)" },
    "left-end":   { left: "100%", bottom: 8, borderColor: "transparent transparent transparent rgb(246 243 238)" },
    "right":       { right: "100%", top: "50%", transform: "translateY(-50%)", borderColor: "transparent rgb(246 243 238) transparent transparent" },
    "right-start": { right: "100%", top: 8, borderColor: "transparent rgb(246 243 238) transparent transparent" },
    "right-end":   { right: "100%", bottom: 8, borderColor: "transparent rgb(246 243 238) transparent transparent" },
  };

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {visible && content && (
        <span
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-[500] whitespace-nowrap rounded-[2px] bg-shell px-2 py-1 text-[11px] font-medium text-color-base/70 shadow-lg pointer-events-none ${className}`}
          style={positionStyles[adjustedPlacement]}
        >
          {content}
          <span
            className="absolute border-[4px]"
            style={arrowStyles[adjustedPlacement]}
          />
        </span>
      )}
    </span>
  );
}