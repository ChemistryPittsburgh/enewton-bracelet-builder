"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type SlideDirection = "bottom" | "left" | "right";

interface PanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  direction?: SlideDirection;
  children: React.ReactNode;
  className?: string;
}

const slideClasses: Record<SlideDirection, { base: string; open: string; closed: string }> = {
  bottom: {
    base: "fixed bottom-0 left-0 right-0 rounded-t-2xl transition-transform duration-300 ease-out",
    open: "translate-y-0",
    closed: "translate-y-full",
  },
  right: {
    base: "fixed right-0 top-0 h-full w-100 transition-transform duration-300 ease-out",
    open: "translate-x-0",
    closed: "translate-x-full",
  },
  left: {
    base: "fixed left-0 top-0 h-full w-100 transition-transform duration-300 ease-out",
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
}: PanelProps) {
  const slide = slideClasses[direction];

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-20 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed z-50 bg-white shadow-xl",
          slide.base,
          open ? slide.open : slide.closed,
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </>
  );
}