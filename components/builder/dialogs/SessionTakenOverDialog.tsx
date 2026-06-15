"use client";

import { ShieldAlert } from "lucide-react";
import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { Button } from "@/components/ui/Button";

interface SessionTakenOverDialogProps {
  takenByName?: string;
  onClose: () => void;
}

export function SessionTakenOverDialog({
  takenByName,
  onClose,
}: SessionTakenOverDialogProps) {
  return (
    <FullScreenDialog open onClose={onClose} title="Session taken over" className="max-w-md">
      <div className="flex flex-col gap-5 py-2">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert size={16} className="text-amber-600" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-neutral-900">
              {takenByName ? (
                <>
                  <span className="text-navy">{takenByName}</span> has taken over this design.
                </>
              ) : (
                "Another user has taken over this design."
              )}
            </p>
            <p className="mt-1 text-xs text-color-base/70 leading-relaxed">
              Your editing session has ended. You can continue viewing this
              design in read-only mode.
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-default pt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Continue in read-only mode
          </Button>
        </div>
      </div>
    </FullScreenDialog>
  );
}
