"use client";

import { AlertTriangle } from "lucide-react";
import { StandardConfirmDialog } from "@/components/ui/StandardConfirmDialog";

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
    <StandardConfirmDialog
      title="Delete bracelet"
      message={
        <>
          <span className="font-semibold text-neutral-900">"{designName}"</span>{" "}
          will be permanently removed from the library. This cannot be undone.
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