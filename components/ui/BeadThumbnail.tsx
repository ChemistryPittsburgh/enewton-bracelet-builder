"use client";

import { useState, useEffect } from "react";
import type { BeadProduct } from "@/types";

interface BeadThumbnailProps {
  bead: BeadProduct;
  /** Increment to force a re-fetch after a thumbnail is re-uploaded to S3. */
  cacheBust?: number;
  /** Optional CSS classes on the <img> element. Defaults to "w-full h-auto". */
  className?: string;
  /** Size of the fallback gradient circle in px. Defaults to 30. */
  fallbackSize?: number;
}

/**
 * Displays a bead/charm thumbnail image with a gold-gradient fallback.
 *
 * Used in:
 *   - BeadSelectorPanel (bead grid cards)
 *   - ManageBeadsDialog (bead library rows)
 */
export function BeadThumbnail({
  bead,
  cacheBust = 0,
  className = "w-full h-full object-cover object-center",
  fallbackSize = 30,
}: BeadThumbnailProps) {
  const [failed, setFailed] = useState(false);

  // Reset when cacheBust changes (thumbnail was re-uploaded to S3)
  useEffect(() => {
    setFailed(false);
  }, [cacheBust]);

  if (failed || bead.bead_type == null) {
    return (
      <div
        className="rounded-full shrink-0"
        style={{
          width: fallbackSize,
          height: fallbackSize,
          background: "radial-gradient(circle at 35% 35%, #f5d87e, #c8980a)",
        }}
      />
    );
  }

  const src = `/images/${bead.slug}-thumbnail.png${cacheBust ? `?v=${cacheBust}` : ""}`;

  return (
    <img
      src={src}
      alt={bead.name}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}