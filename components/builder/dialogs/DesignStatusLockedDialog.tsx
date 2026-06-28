"use client";

import { CheckCircle, Radio } from "lucide-react";
import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { Button } from "@/components/ui/Button";

interface DesignStatusLockedDialogProps {
  status: "approved" | "published";
  onClose: () => void;
}

export function DesignStatusLockedDialog({ status, onClose }: DesignStatusLockedDialogProps) {
  const isPublished = status === "published";
  const Icon = isPublished ? Radio : CheckCircle;
  const title = isPublished ? "Design published" : "Design approved";
  const body = isPublished
    ? "This design has been published and is now read-only."
    : "This design has been approved and is now read-only.";

  return (
    <FullScreenDialog open onClose={onClose} title={title} className="max-w-md">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10">
            <Icon size={16} className="text-orange" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="mt-1.5 text-sm font-semibold text-color-base">{title}</p>
            <p className="text-xs text-color-base/70 leading-relaxed">{body}</p>
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
