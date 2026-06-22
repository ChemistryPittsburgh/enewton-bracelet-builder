"use client";

import { useState } from "react";
import { LayoutTemplate, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { Bracelet } from "@/types";
import { Tooltip } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import { useDeletePattern } from "@/hooks/useDeletePattern";

interface PatternCardProps {
  pattern: Bracelet;
  canDelete: boolean;
  onLoad: () => void;
  onEdit?: () => void;
}

export function PatternCard({ pattern, canDelete, onLoad, onEdit }: PatternCardProps) {
  const [confirming, setConfirming] = useState(false);
  const { mutate: deletePattern, isPending } = useDeletePattern();

  const thumbSrc = pattern.preview_image_url ?? null;
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error" | "empty">(
    thumbSrc ? "loading" : "empty",
  );

  return (
    <div
      className="group flex flex-col rounded-[3px] border border-default cursor-pointer hover:border-navy hover:shadow-sm transition-all"
      onClick={confirming ? undefined : onLoad}
    >
      {/* Image area */}
      <div className="relative aspect-square w-full bg-neutral-50">
        {imgState === "loading" && (
          <div className="absolute inset-0 animate-pulse bg-light-grey" />
        )}

        {thumbSrc && imgState !== "error" && (
          <img
            src={thumbSrc}
            alt={pattern.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imgState === "loaded" ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImgState("loaded")}
            onError={() => setImgState("error")}
          />
        )}

        {(!thumbSrc || imgState === "error") && (
          <div className="absolute inset-0 flex items-center justify-center text-color-base/20">
            <LayoutTemplate size={32} />
          </div>
        )}

        {canDelete && !confirming && (
          <div
            className="absolute right-2 top-2 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {onEdit && (
              <Tooltip content="Edit pattern beads">
                <button
                  onClick={onEdit}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-color-base/70 shadow-sm backdrop-blur-sm transition-all hover:bg-mint hover:text-navy opacity-0 group-hover:opacity-100"
                  aria-label="Edit pattern"
                >
                  <Pencil size={13} />
                </button>
              </Tooltip>
            )}
            <Tooltip content="Delete pattern">
              <button
                onClick={() => setConfirming(true)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-color-base/70 shadow-sm backdrop-blur-sm transition-all hover:bg-error/10 hover:text-error opacity-0 group-hover:opacity-100"
                aria-label="Delete pattern"
              >
                <Trash2 size={14} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center justify-between gap-2 px-3 py-3">
        <p className="truncate text-sm font-medium">{pattern.name}</p>
        <Button
          onClick={(e) => { e.stopPropagation(); onLoad(); }}
          size="xs"
          variant="secondary"
          className="w-full group-hover:bg-white"
        >
          <Plus size={10} />
          create bracelet from pattern
        </Button>
      </div>

      {/* Inline delete confirmation */}
      {confirming && (
        <div
          className="flex items-center justify-between gap-2 border-t border-error/20 bg-blush px-3 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-error font-medium">Delete pattern?</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => deletePattern(pattern.id)}
              disabled={isPending}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-error text-white hover:bg-error/90 disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 size={10} className="animate-spin" />}
              Delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="rounded px-2 py-0.5 text-xs font-semibold text-color-base/70 hover:bg-default/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
