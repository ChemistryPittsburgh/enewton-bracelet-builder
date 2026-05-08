"use client";

/**
 * BeadPickerHeader.tsx
 *
 * Displays Bracelet name + contains drawer for bead sorting
 */

import { useStore } from "@/lib/store";
import Image from 'next/image';

export function BeadPickerHeader() {

  const { braceletName } = useStore((s) => ({
    braceletName: s.braceletName,
  }));

  return (
    <div className="px-[var(--bracelet-picker-gutter)] absolute left-0 right-0 bottom-0 w-full z-40 flex items-center">
      { braceletName && 
        <h2 className="mt-1 flex-1 py-2">
          <span className="font-bold">Bracelet Name: </span> 
          {braceletName}
        </h2>
      }
      {/* Bead sorting drawer */}
      <p>Bead Tab</p>
    </div>
  );
}
