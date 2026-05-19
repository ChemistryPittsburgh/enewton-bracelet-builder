"use client";
import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingDialogProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  // Uncontrolled (collapsible toggle)
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Controlled (externally driven — shows X instead of chevron)
  open?: boolean;
  onClose?: () => void;
  includeTitleBar?: boolean;
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
        "rounded-2xl bg-white shadow-lg border border-neutral-100 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className={cn(
          "transition-transform duration-200 group",
          includeTitleBar
            ? "flex w-full items-center px-3 py-2 justify-between"
            : "absolute right-2 top-2 z-10"
        )}
      >
        {title && (
          <span className="text-sm font-bold text-neutral-900">{title}</span>
        )}
        <div 
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-neutral-400",
            includeTitleBar
              ? "border border-neutral-200 group-hover:bg-neutral-50 group-hover:ring-2"
              : ""
          )}
        >
          {isControlled ? (
            <X size={20} className="transition-all duration-300 group-hover:scale-130" />
          ) : (
            <ChevronDown
              size={15}
              className={cn(
                "transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          )}
        </div>
      </button>

      {/* Body */}
      <div
        className={cn(
          "transition-transform duration-500 ease-out translate-y-full w-auto",
          open
            ? "opacity-100 max-h-[600px]  translate-y-0"
            : "max-h-0 opacity-0 w-[0px] overflow-hidden"
        )}
      >
        <div 
          className={cn(
            "px-4 pb-4 pt-3",
            includeTitleBar
              ? "border-t border-neutral-100"
              : ""
            )} >
          {children}
        </div>
      </div>
    </div>
  );
}