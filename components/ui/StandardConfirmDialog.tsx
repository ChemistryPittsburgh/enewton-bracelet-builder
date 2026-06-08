"use client";

import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { Button } from "@/components/ui/Button";
import type { ButtonProps } from "@/components/ui/Button";

interface StandardConfirmDialogProps {
  /** Dialog title — e.g. "Delete bracelet" */
  title: string;
  /** Main warning message */
  message: ReactNode;
  /** Icon element (e.g., <AlertTriangle />) */
  icon?: ReactNode;
  /** Icon background color class — e.g. "bg-error/50" */
  iconBgClass?: string;
  /** Icon text color class — e.g. "text-error/80" */
  iconColorClass?: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Confirm button variant */
  confirmVariant?: ButtonProps["variant"];
  /** Cancel button label */
  cancelLabel?: string;
  /** Is confirm action in progress? */
  isLoading?: boolean;
  /** Confirm button onClick handler */
  onConfirm: () => void;
  /** Cancel button onClick handler */
  onCancel: () => void;
}

export function StandardConfirmDialog({
  title,
  message,
  icon,
  iconBgClass = "bg-error/50",
  iconColorClass = "text-error/80",
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  cancelLabel = "Cancel",
  isLoading = false,
  onConfirm,
  onCancel,
}: StandardConfirmDialogProps) {
  return (
    <FullScreenDialog
      open={true}
      onClose={onCancel}
      title={title}
      className="max-w-sm"
    >
      <div className="flex flex-col gap-5">
        {/* Warning */}
        {icon && (
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBgClass}`}>
              <div className={iconColorClass}>
                {icon}
              </div>
            </div>
            <div className="text-sm text-color-base/70 leading-relaxed">
              {message}
            </div>
          </div>
        )}

        {!icon && (
          <div className="text-sm text-color-base/70 leading-relaxed">
            {message}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </FullScreenDialog>
  );
}