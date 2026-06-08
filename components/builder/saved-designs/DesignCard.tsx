"use client";

import { useRef, useState, useEffect } from "react";
import { Archive, MoreHorizontal, Trash2 } from "lucide-react";
import type { Bracelet } from "@/types";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZone: "America/New_York",
  }).format(new Date(dateStr));
}

interface DesignCardProps {
  design: Bracelet;
  onClick?: () => void;
  onDeleteRequest: (design: Bracelet) => void;
  onDiscontinueRequest?: (design: Bracelet) => void;
}

export function DesignCard({ design, onClick, onDeleteRequest, onDiscontinueRequest }: DesignCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { canDeleteBracelet, isAdmin } = usePermissions();
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error" | "empty">(
    design.preview_image_url ? "loading" : "empty",
  );

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const isDiscontinued = design.is_discontinued === 1;
  const wasRejected    = design.status === "draft"
    && !!design.rejected_at
    && design.rejected_at !== "0000-00-00 00:00:00";
  const showMenu = canDeleteBracelet && isAdmin && !isDiscontinued;

  return (
    <div
      className={cn(
        "group flex flex-col rounded-lg border overflow-hidden cursor-pointer hover:shadow-sm transition-all",
        isDiscontinued ? "border-default opacity-50 grayscale pointer-events-auto" :
        wasRejected    ? "border-error/40 hover:border-error/60" :
                         "border-default hover:border-default",
      )}
      onClick={onClick}
    >
      <div className="relative aspect-square w-full bg-neutral-50">
        {/* Discontinued badge */}
        {isDiscontinued && (
          <div className="absolute left-2 top-2 z-10 rounded-full bg-error/30 px-2 py-0.5 text-[10px] font-semibold text-error">
            Discontinued
          </div>
        )}
        {/* Rejected badge — clears once the design is edited and re-saved */}
        {wasRejected && (
          <div className="absolute left-2 top-2 z-10 rounded-full bg-error/30 px-2 py-0.5 text-[10px] font-semibold text-error">
            Rejected
          </div>
        )}
        {/* Pulse skeleton — visible while the image is loading */}
          {imgState === "loading" && (
            <div className="absolute inset-0 animate-pulse bg-light-grey" />
          )}

          {/* Actual image */}
          {design.preview_image_url && imgState !== "error" && (
            <img
              src={design.preview_image_url}
              alt={design.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imgState === "loaded" ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImgState("loaded")}
              onError={() => setImgState("error")}
            />
          )}

          {/* Fallback — no URL or load error */}
          {(!design.preview_image_url || imgState === "error") && (
            <div className="h-20 w-20 rounded-full border-2 border-dashed" />
          )}

          {/* ── Three-dot menu ── */}
          {showMenu && (
            <div
              ref={menuRef}
              className="absolute right-2 top-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-color-base/70 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-neutral-900",
                  menuOpen
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100",
                )}
                aria-label="More options"
              >
                <MoreHorizontal size={15} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 z-10 min-w-[160px] rounded-lg border border-default bg-white py-1 shadow-lg">
                  {isAdmin && design.status === "published" && !isDiscontinued && onDiscontinueRequest && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDiscontinueRequest(design);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gold hover:bg-gold/10 transition-colors"
                    >
                      <Archive size={14} />
                      Discontinue
                    </button>
                  )}
                  {canDeleteBracelet && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDeleteRequest(design);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error hover:bg-error/10 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete bracelet
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      {/* Card footer */}
      <div className="px-3 py-2.5 flex flex-col gap-2">
        <p className="truncate text-sm font-medium  ">{design.name}</p>
        {design.updated_at && (
          <p className="truncate text-xs text-color-base/70"><span className="text-color-base/70">Last Updated: </span>{formatDate(design.updated_at)}</p>
        )}
        {wasRejected && design.rejection_reason && (
          <p className="truncate text-xs italic text-error">
            &ldquo;{design.rejection_reason}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}