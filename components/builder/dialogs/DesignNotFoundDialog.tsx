"use client";

import { Trash2 } from "lucide-react";
import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { Button } from "@/components/ui/Button";

interface DesignNotFoundDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DesignNotFoundDialog({ open, onClose }: DesignNotFoundDialogProps) {
  if (!open) return null;
  return (
    <FullScreenDialog open onClose={onClose} title="Design not found" className="max-w-md">
      <div className="flex flex-col gap-5 py-2">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Trash2 size={16} className="text-amber-600" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-neutral-900">
              This saved design could not be found.
            </p>
            <p className="mt-1 text-xs text-color-base/70 leading-relaxed">
              It may have been deleted or is no longer accessible. Your canvas has been reset.
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-default pt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Start fresh
          </Button>
        </div>
      </div>
    </FullScreenDialog>
  );
}
