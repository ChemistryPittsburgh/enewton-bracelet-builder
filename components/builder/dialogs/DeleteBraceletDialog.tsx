"use client";

import { AlertTriangle } from "lucide-react";
import { StandardConfirmDialog } from "@/components/ui/StandardConfirmDialog";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

interface DeleteBraceletDialogProps {
  designName: string;      
  isDeleting: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteBraceletDialog({
  designName,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: DeleteBraceletDialogProps) {
  return (
    <StandardConfirmDialog
      title="Delete bracelet"
      message={
        <>
          <span className="font-semibold text-neutral-900">"{designName}"</span>{" "}
          will be permanently removed from the library. This cannot be undone.
          {error && (
            <div className="mt-3">
              <ErrorAlert message={error} />
            </div>
          )}
        </>
      }
      icon={<AlertTriangle size={16} />}
      iconBgClass="bg-error/50"
      iconColorClass="text-error/80"
      confirmLabel="Delete bracelet"
      confirmVariant="danger"
      cancelLabel="Cancel"
      isLoading={isDeleting}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}