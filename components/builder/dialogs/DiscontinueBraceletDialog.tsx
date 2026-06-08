"use client";

import { AlertTriangle } from "lucide-react";
import { StandardConfirmDialog } from "@/components/ui/StandardConfirmDialog";

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
    <StandardConfirmDialog
      title="Discontinue bracelet"
      message={
        <>
          <span className="font-semibold text-neutral-900">"{designName}"</span>{" "}
          will be permanently discontinued and moved to the Discontinued (vintage) tab.
          This action cannot be undone.
        </>
      }
      icon={<AlertTriangle size={16} />}
      iconBgClass="bg-amber-50"
      iconColorClass="text-amber-600"
      confirmLabel="Discontinue bracelet"
      confirmVariant="softDanger"
      cancelLabel="Cancel"
      isLoading={isDiscontinuing}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}