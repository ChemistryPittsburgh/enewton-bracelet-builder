"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingDialogProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Uncontrolled: initial open state and change callback */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled: drives open state externally; shows X instead of chevron */
  open?: boolean;
  onClose?: () => void;
  includeTitleBar?: boolean;
  buttonTitle?: string;
  bodyClasses?: string;
}

export function FloatingDialog({
  title,
  children,
  className,
  defaultOpen = false,
  onOpenChange,
  open: controlledOpen,
  onClose,
  includeTitleBar = true,
  buttonTitle = "Dialog",
  bodyClasses,
}: FloatingDialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : internalOpen;

  function handleToggle() {
    if (isControlled) {
      onClose?.();
    } else {
      const next = !internalOpen;
      setInternalOpen(next);
      onOpenChange?.(next);
    }
  }

  return (
    <div
      className={cn(
        "rounded-[3px] bg-white shadow-lg border border-default overflow-hidden",
        className
      )}
    >
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        title={open ? `Close ${buttonTitle}` : `Open ${buttonTitle}`}
        className={cn(
          "toggle-btn group transition-transform duration-200",
          includeTitleBar
            ? "flex w-full items-center justify-between px-3 py-2"
            : "absolute right-2 top-2 z-10 icon-only-btn"
        )}
      >
        {title && (
          <span className="text-sm font-bold text-color-base/80">{title}</span>
        )}

        <div
          className={cn(
            "toggle-btn-icon flex items-center justify-center rounded-full text-color-base/70",
            includeTitleBar ?
              "h-7 w-7 border border-default group-hover:bg-mint group-hover:ring-2 group-hover:ring-navy"
              : ""
          )}
        >
          {isControlled ? (
            <X size={16} className="transition-all duration-300" />
          ) : (
            <ChevronDown
              size={15}
              className={cn("transition-transform duration-200", open && "rotate-180")}
            />
          )}
        </div>
      </button>

      {/* Body */}
      <div
        className={cn(
          "duration-300 ease-out",
          open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0 overflow-hidden",
          includeTitleBar ? "w-[0px] transition-transform translate-y-full" : "transition-all",
          includeTitleBar && open && "w-full translate-y-0",
        )}
      >
        <div
          className={cn(
            "px-4 pb-4 pt-3 lg:px-6",
            bodyClasses,
            includeTitleBar && "border-t border-neutral-100"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}