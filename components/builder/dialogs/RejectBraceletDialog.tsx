"use client";

import { useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { FullScreenDialog } from "@/components/ui/FullScreenDialog";
import { Button } from "@/components/ui/Button";

interface RejectBraceletDialogProps {
  designName: string;
  isRejecting: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export function RejectBraceletDialog({
  designName,
  isRejecting,
  onConfirm,
  onCancel,
}: RejectBraceletDialogProps) {
  const [reason, setReason] = useState("");

  return (
    <FullScreenDialog
      open={true}
      onClose={onCancel}
      title="Reject design"
      className="max-w-sm"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error/10">
            <div className="text-error/80">
              <XCircle size={16} />
            </div>
          </div>
          <div className="text-sm text-color-base/70 leading-relaxed">
            <span className="font-semibold text-neutral-900">"{designName}"</span>{" "}
            will be sent back to drafts for revision.
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-color-base/70">Reason for rejection</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe why this design is being rejected…"
            rows={3}
            autoFocus
            className="w-full resize-none rounded-md border border-blush bg-white px-3 py-2 text-sm outline-none focus:border-error/50 placeholder:text-color-base/70"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={isRejecting}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={isRejecting}
            onClick={() => onConfirm(reason.trim() || undefined)}
          >
            {isRejecting && <Loader2 size={13} className="animate-spin" />}
            Reject design
          </Button>
        </div>
      </div>
    </FullScreenDialog>
  );
}