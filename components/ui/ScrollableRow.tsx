"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollableRowProps {
  children: ReactNode;
  /** Applied to the outer row wrapper (e.g. padding). */
  className?: string;
  /** Applied to the inner scrolling track — controls gap between items. */
  trackClassName?: string;
}

/**
 * A single-line horizontal scroller with "auto" scroll buttons: the chevrons
 * appear only when the content overflows, and each greys out at its end.
 * Mirrors MUI's <Tabs variant="scrollable" scrollButtons="auto" /> behaviour
 * without the dependency. Items should be `shrink-0` so they don't compress.
 */
export function ScrollableRow({ children, className, trackClassName = "gap-2" }: ScrollableRowProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setOverflowing(max > 1);
    setCanLeft(scrollLeft > 1);
    setCanRight(scrollLeft < max - 1);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    const content = contentRef.current;
    if (!el || !content) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    // Observe both the viewport (panel resize) and the content (items loading
    // async or changing width) so the buttons re-evaluate on either change.
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(content);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  function page(dir: -1 | 1) {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const arrowClass =
    "shrink-0 grid place-items-center h-9 w-5 xl:w-6.5 rounded-[2px] bg-white text-color-base transition-all hover:bg-mint disabled:opacity-0 disabled:pointer-events-none";

  return (
    <div className={cn("flex items-center gap-1 overflow-hidden", className)}>
      {overflowing && (
        <button type="button" onClick={() => page(-1)} disabled={!canLeft} aria-label="Scroll left" className={arrowClass}>
          <ChevronLeft size={16} />
        </button>
      )}
      <div ref={viewportRef} className="flex-1 overflow-x-auto picker-scroll">
        <div ref={contentRef} className={cn("flex w-max", trackClassName)}>
          {children}
        </div>
      </div>
      {overflowing && (
        <button type="button" onClick={() => page(1)} disabled={!canRight} aria-label="Scroll right" className={arrowClass}>
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}