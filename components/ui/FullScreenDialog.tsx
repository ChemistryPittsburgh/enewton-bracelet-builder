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
}

export function FullScreenDialog({
  open,
  onClose,
  title,
  children,
  className,
  includeBackDropBlur = true,
  bodyClasses,
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
          "dialog-backdrop absolute inset-0 z-50",
          includeBackDropBlur ? "backdrop-blur-sm bg-black/30" : "bg-black/10",
        )}
      />
      {/* Panel */}
      <div
        className={cn(
          "absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-neutral-100 overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          {title && (
            <h3 className="text-md font-bold text-neutral-900">{title}</h3>
          )}
          <button
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 hover:bg-neutral-50 hover:ring-2 transition-all"
          >
            <X size={16} />
          </button>
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