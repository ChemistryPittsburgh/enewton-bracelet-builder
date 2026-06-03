"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FullScreenDialog } from "@/components/ui/FullScreenDialog";

interface DeleteBraceletDialogProps {
  designName: string;      
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteBraceletDialog({
  designName,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteBraceletDialogProps) {
  return (
    <FullScreenDialog
      open={true}          
      onClose={onCancel}
      title="Delete bracelet"
      className="max-w-sm"
    >
      <div className="flex flex-col gap-5">
        {/* Warning */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed">
            <span className="font-semibold text-neutral-900">"{designName}"</span>{" "}
            will be permanently removed from the library. This cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
              isDeleting
                ? "bg-red-400 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600",
            )}
          >
            {isDeleting ? "Deleting…" : "Delete bracelet"}
          </button>
        </div>
      </div>
    </FullScreenDialog>
  );
}