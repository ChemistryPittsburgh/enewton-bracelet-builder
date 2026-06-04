"use client";
import { ActionButton } from "@/components/ui/ActionButton";

interface ConfirmationPanelProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmationPanel({
  message,
  onConfirm,
  onCancel,
  isPending,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: ConfirmationPanelProps) {
  return (
    <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col gap-3">
      <p className="text-sm text-amber-800">{message}</p>
      <div className="flex items-center gap-2">
        <ActionButton label={confirmLabel} isPending={isPending} onClick={onConfirm} variant="primary" />
        <ActionButton label={cancelLabel} isPending={false} onClick={onCancel} variant="secondary" />
      </div>
    </div>
  );
}
