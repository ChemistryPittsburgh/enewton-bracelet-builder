"use client";

/**
 * BeadPicker.tsx
 *
 * Shows available bead products. Clicking one adds it to the bracelet.
 * Click a bead to open BeadInfoPanel
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import Image from 'next/image';

import { useStore } from "@/lib/store";

import type { BeadProduct } from "@/types";

// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// import required modules
import { FreeMode, Pagination, Navigation } from 'swiper/modules';

interface BeadPickerProps {
  beads: BeadProduct[];
}

export function BeadPicker({ beads }: BeadPickerProps) {
  const [error, setError] = useState<string | null>(null);

  const { addBead } = useStore((s) => ({
    addBead: s.addBead,
  }));

  function handleAdd(bead: BeadProduct) {
    const err = addBead(bead);
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 3000);
    }
  }

  function BeadThumbnail({ bead }: { bead: BeadProduct }) {
      const [failed, setFailed] = useState(false);

      if (failed || bead.beadType == null) {
        return (
          <Plus size={16} />
        );
      } else {
        const src = `/images/${bead.beadType.toLowerCase()}-thumbnail.png`;
        return (
          <img
            src={src}
            alt={bead.name}
            width={64}
            height={64}
            onError={() => setFailed(true)}
          />
        );
      }
    }

  return (
    <div>
      <div className="px-[var(--bracelet-picker-gutter)]">
        {/* Hint text */}
        <p className="mt-1 mb-3 text-[11px] text-neutral-400">
          Select a bead to add it · Click a bead on the bracelet to learn more
        </p>

        {/* Error */}
        {error && (
          <p className="mb-2 text-[11px] text-red-500">{error}</p>
        )}
      </div>

      {/* Bead options */}
      <div className="flex gap-3 overflow-x-auto picker-scroll pb-2">
        <Swiper
            slidesPerView={'auto'}
            spaceBetween={12}
            modules={[Navigation]}
            className="bead-picker-slider"
            navigation={true} 
            watchSlidesProgress={true}
            slidesPerGroupAuto={true}
            observeParents={true}
            loop={false}
          >
          {beads.map((bead) => (
            <SwiperSlide key={bead.id}>
              <button
                onClick={() => handleAdd(bead)}
                className="group flex shrink-0 flex-col items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-all hover:border-neutral-400 hover:shadow-sm active:scale-95"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200 transition-colors">
                  <BeadThumbnail bead={bead} />
                </div>
                <span className="max-w-[96px] text-center text-[11px] leading-tight text-neutral-700">
                  {bead.name}
                </span>
              </button>
            </SwiperSlide>
          ))}
          </Swiper>

      </div>

    </div>
  );
}
