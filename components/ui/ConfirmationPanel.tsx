"use client";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

// Kept for callers that type the confirmVariant prop explicitly
export type ActionButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "softDanger"
  | "positive";

interface ConfirmationPanelProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Variant for the confirm button — defaults to "primary" (navy). */
  confirmVariant?: ActionButtonVariant;
  /** When set, shows an inline error below the message (e.g. a failed action). */
  error?: string;
}

export function ConfirmationPanel({
  message,
  onConfirm,
  onCancel,
  isPending,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  confirmVariant = "primary",
  error,
}: ConfirmationPanelProps) {
  return (
    <div className="w-full rounded-[2px] border border-gold bg-gold/10 px-4 py-3 flex flex-col gap-3">
      <p className="text-sm text-amber-800">{message}</p>
      {error && <ErrorAlert message={error} />}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={confirmVariant}
          disabled={isPending}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}