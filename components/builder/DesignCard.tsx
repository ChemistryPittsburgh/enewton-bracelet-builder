"use client";

import { useState } from "react";
import type { Bracelet } from "@/types";

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
}

export function DesignCard({ design, onClick }: DesignCardProps) {
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error" | "empty">(
    design.preview_image_url ? "loading" : "empty",
  );

  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-lg border border-neutral-200 bg-white overflow-hidden text-left hover:border-neutral-400 hover:shadow-sm transition-all"
    >
      {/* Thumbnail */}
      <div className="aspect-square w-full bg-neutral-100 flex items-center justify-center overflow-hidden relative">

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
      </div>

      {/* Meta */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-neutral-900 truncate">{design.name}</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          Last updated: {formatDate(design.updated_at)}
        </p>
      </div>
    </button>
  );
}
