"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FullScreenDialog } from "@/components/ui/FullScreenDialog";

interface DiscontinueBraceletDialogProps {
  designName: string;
  isDiscontinuing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DiscontinueBraceletDialog({
  designName,
  isDiscontinuing,
  onConfirm,
  onCancel,
}: DiscontinueBraceletDialogProps) {
  return (
    <FullScreenDialog
      open={true}
      onClose={onCancel}
      title="Discontinue bracelet"
      className="max-w-sm"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed">
            <span className="font-semibold text-neutral-900">"{designName}"</span>{" "}
            will be permanently discontinued and moved to the Discontinued (vintage) tab.
            This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isDiscontinuing}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDiscontinuing}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
              isDiscontinuing
                ? "bg-amber-400 cursor-not-allowed"
                : "bg-amber-600 hover:bg-amber-700",
            )}
          >
            {isDiscontinuing ? "Discontinuing…" : "Discontinue bracelet"}
          </button>
        </div>
      </div>
    </FullScreenDialog>
  );
}