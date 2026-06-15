"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FullScreenDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  includeBackDropBlur?: boolean;
  bodyClasses?: string;
  /** Optional content rendered in the header between the title and close button. */
  headerExtra?: React.ReactNode;
}

export function FullScreenDialog({
  open,
  onClose,
  title,
  children,
  className,
  includeBackDropBlur = true,
  bodyClasses,
  headerExtra,
}: FullScreenDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "dialog-backdrop fixed inset-0 z-[100]",
          includeBackDropBlur ? "backdrop-blur-sm bg-black/30" : "bg-black/10",
        )}
      /> 
      {/* Panel */}
      <div
        className={cn(
          "fixed left-1/2 top-1/2 z-[100] -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-2xl rounded-[2px] bg-white shadow-xl border border-neutral-100 overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-default">
          {title && (
            <h2>{title}</h2>
          )}
          <div className="ml-auto flex items-center gap-2">
            {headerExtra}
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-default text-color-base/70 hover:bg-neutral-50 hover:ring-2 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {/* Body */}
        <div
          className={cn(
            bodyClasses ? bodyClasses : "px-5 py-4" 
          )}>
          {children}
        </div>
      </div>
    </>
  );
}