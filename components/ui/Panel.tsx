"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type SlideDirection = "bottom" | "left" | "right";

/** Default panel width (px) on full-size screens. */
export const PANEL_WIDTH = 450;
/** Narrower panel width (px) used on smaller screens. */
export const PANEL_WIDTH_COMPACT = 380;
/**
 * Below this viewport width the layout is in "compact" mode: the panel uses
 * PANEL_WIDTH_COMPACT, and BuilderLayout allows only one side panel open at a
 * time. Single source for both so they always engage together.
 */
export const PANEL_COMPACT_QUERY = "(max-width: 1279px)";

/**
 * Responsive panel width in px — the single source of truth shared by the
 * slide-out panels (here), the canvas clip offsets in BuilderLayout, and the 3D
 * camera offset (CameraOffset via Scene), so all three stay in lockstep when the
 * width changes. Returns the default on the first (pre-mount/SSR) render, then
 * narrows on smaller screens after mount. Add breakpoints here to taste — every
 * consumer follows automatically.
 */
export function usePanelWidth(): number {
  const [width, setWidth] = useState(PANEL_WIDTH);
  useEffect(() => {
    const mq = window.matchMedia(PANEL_COMPACT_QUERY);
    const apply = () => setWidth(mq.matches ? PANEL_WIDTH_COMPACT : PANEL_WIDTH);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return width;
}

interface PanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  direction?: SlideDirection;
  children: React.ReactNode;
  className?: string;
  /** false = panel pushes the canvas (inline flow). true = panel floats on top (default). */
  fixed?: boolean;
  overflowYScroll?: boolean;
}

const fixedSlideClasses: Record<SlideDirection, { base: string; open: string; closed: string }> = {
  bottom: {
    base: "absolute bottom-0 left-0 right-0 rounded-t-2xl transition-transform duration-300 ease-out",
    open: "translate-y-0",
    closed: "translate-y-full",
  },
  right: {
    base: "absolute right-0 border-l border-default top-0 h-full transition-transform duration-300 ease-out",
    open: "translate-x-0",
    closed: "translate-x-full",
  },
  left: {
    base: "absolute left-0 top-0 border-r border-default  h-full transition-transform duration-300 ease-out",
    open: "translate-x-0",
    closed: "-translate-x-full",
  },
};

export function Panel({
  open,
  onClose,
  title,
  direction = "bottom",
  children,
  className,
  fixed = true,
  overflowYScroll = true,
}: PanelProps) {
  const panelWidth = usePanelWidth();

  // ── Non-fixed (push) variant ──────────────────────────────────────────
  // Outer wrapper animates its width — canvas slides smoothly.
  // Inner div stays at full panelWidth so content never squishes.
  if (!fixed) {
    return (
      <div
        style={{
          width: open ? panelWidth : 0,
          minWidth: 0,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 300ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div
          className={cn("h-full bg-white shadow-xl flex flex-col", className)}
          style={{ width: panelWidth }}
        >
          {title && <PanelHeader title={title} onClose={onClose} />}
          {children}
        </div>
      </div>
    );
  }

  // ── Fixed (overlay) variant ───────────────────────────────────────────
  const slide = fixedSlideClasses[direction];
  return (
    <>
      {/* Panel */}
      <div
        className={cn(
          "fixed z-50 bg-white shadow-xl flex flex-col",
          slide.base,
          open ? slide.open : slide.closed,
          className,
          overflowYScroll && 'overflow-scroll'
        )}
        style={direction !== "bottom" ? { width: panelWidth } : undefined}
      >
        {title && <PanelHeader title={title} onClose={onClose} />}
        {children}
      </div>
    </>
  );
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-default shrink-0">
      <h2>{title}</h2>
      <button
        onClick={onClose}
        className="rounded-md p-1 text-color-base/70 hover:text-color-base/70 hover:bg-light-grey/60 transition-colors"
        aria-label="Close panel"
        title="Close panel"
      >
        <X size={16} />
      </button>
    </div>
  );
}