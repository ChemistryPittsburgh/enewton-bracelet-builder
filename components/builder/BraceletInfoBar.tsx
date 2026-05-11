"use client";

/**
 * BraceletInfoBar.tsx
 *
 * Bar that appears at the bottom of the canvas that gives facts about current bracelet - 
 * - Available mm 
 * - % used
 * - # of beads added 
 * - # of charms added
 */

import { useStore } from "@/lib/store";
import Image from 'next/image';

export function BraceletInfoBar() {

  const { placedBeads, clearBeads, braceletName } = useStore((s) => ({
    placedBeads: s.beads,
    clearBeads: s.clearBeads,
    braceletName: s.braceletName,
  }));

  return (
    <div className="absolute left-4 bottom-4 right-4 z-40 flex items-center justify-center">
      <div className="bg-mauve-50 shadow-xs rounded-2xl flex items-center p-4  m-auto gap-4">
        <span className="rounded-full bg-neutral-200 px-4 py-1 text-sm font-semibold">
          {placedBeads.length} item{placedBeads.length !== 1 ? "s" : ""} added
        </span>
        <span className="rounded-full bg-neutral-200 px-4 py-1 text-sm font-semibold">
          % of bracelet used
        </span>
        <span className="rounded-full bg-neutral-200 px-4 py-1 text-sm font-semibold">
          # of beads added
        </span>
        <span className="rounded-full bg-neutral-200 px-4 py-1 text-sm font-semibold">
          # of charms added
        </span>
      </div>
    </div>
  );
}