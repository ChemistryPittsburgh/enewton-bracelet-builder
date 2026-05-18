"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingDialogProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FloatingDialog({
  title,
  children,
  className,
  defaultOpen = false,
  onOpenChange,
}: FloatingDialogProps) {
  const [open, setOpen] = useState(defaultOpen);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    onOpenChange?.(next); 
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-white shadow-lg border border-neutral-100 overflow-hidden",
        className
      )}
    >
      {/* Header — always visible, click to toggle */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-3 py-2 group"
      >
        {title && 
          <span className="text-sm font-bold text-neutral-900">{title}</span>
        }
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 group-hover:bg-neutral-50 group-hover:ring-2">
          <ChevronDown
            size={15}
            className={cn(
              "transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          "transition-all duration-300 ease-out",
          open ? "w-auto opacity-100" : "w-[0px] max-h-0 opacity-0 overflow-hidden"
        )}
      >
        <div className="px-4 pb-4 pt-3 border-t border-neutral-100">
          {children}
        </div>
      </div>
    </div>
  );
}