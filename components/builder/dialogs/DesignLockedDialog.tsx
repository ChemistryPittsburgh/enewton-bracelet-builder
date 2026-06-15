"use client";

import { Lock } from "lucide-react";
import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { Button } from "@/components/ui/Button";
import type { DesignLock } from "@/types";

interface DesignLockedDialogProps {
  lock: DesignLock;
  onClose: () => void;
  onTakeOver?: () => void;
  isTakingOver?: boolean;
  error?: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  return `${mins} minutes ago`;
}

export function DesignLockedDialog({
  lock,
  onClose,
  onTakeOver,
  isTakingOver = false,
  error,
}: DesignLockedDialogProps) {
  return (
    <FullScreenDialog open onClose={onClose} title="Design in use" className="max-w-md">
      <div className="flex flex-col gap-5 py-2">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange/20">
            <Lock size={16} className="text-orange" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-neutral-900">
              Currently being edited by{" "}
              <span className="text-navy">{lock.user_name}</span>
            </p>
            <p className="text-xs text-color-base/70">
              Last active {timeAgo(lock.heartbeat_at)}
            </p>
            <p className="mt-1 text-xs text-color-base/70 leading-relaxed">
              Opening this design while someone else is editing it may cause
              conflicting changes. Wait until they are done, or ask an admin to
              take over.
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-blush px-3 py-2 text-xs text-[#8b3040]">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-default pt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Back to designs
          </Button>
          {onTakeOver && (
            <Button
              variant="softDanger"
              size="sm"
              onClick={onTakeOver}
              disabled={isTakingOver}
            >
              {isTakingOver ? "Taking over…" : "Take Over"}
            </Button>
          )}
        </div>
      </div>
    </FullScreenDialog>
  );
}
