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
  const showMenu = canDeleteBracelet && isAdmin && !isDiscontinued;

  return (
    <div
      className={cn(
        "group flex flex-col rounded-lg border border-neutral-200 overflow-hidden cursor-pointer hover:border-neutral-300 hover:shadow-sm transition-all",
        isDiscontinued && "opacity-50 grayscale pointer-events-auto",
      )}
      onClick={onClick}
    >
      <div className="relative aspect-square w-full bg-neutral-50">
        {/* Discontinued badge */}
        {isDiscontinued && (
          <div className="absolute left-2 top-2 z-10 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
            Discontinued
          </div>
        )}
        {/* Pulse skeleton — visible while the image is loading */}
          {imgState === "loading" && (
            <div className="absolute inset-0 animate-pulse bg-neutral-200" />
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
            <div className="h-20 w-20 rounded-full border-2 border-dashed border-neutral-300" />
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
                  "flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-neutral-600 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-neutral-900",
                  menuOpen
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100",
                )}
                aria-label="More options"
              >
                <MoreHorizontal size={15} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 z-10 min-w-[160px] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                  {isAdmin && design.status === "published" && !isDiscontinued && onDiscontinueRequest && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDiscontinueRequest(design);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50 transition-colors"
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
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
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
        <p className="truncate text-sm font-medium text-neutral-800">{design.name}</p>
        {design.created_by_name && (
          <p className="truncate text-xs text-neutral-400">{design.created_by_name}</p>
        )}
      </div>
    </div>
  );
}