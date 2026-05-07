"use client";

/**
 * BeadPicker.tsx
 *
 * Shows available bead products. Clicking one adds it to the bracelet.
 * Click a bead in the 3D scene to remove it.
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { BeadProduct } from "@/types";
import Image from 'next/image';

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

  const { addBead, braceletName } = useStore((s) => ({
    addBead: s.addBead,
    braceletName: s.braceletName,
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
      <div className="bracelet-panel-gutters">
        { braceletName && 
          <h2 className="mt-1"><span className="font-bold">Bracelet Name:</span> {braceletName}</h2>
        }
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
            observe={true}
            observeParents={true}
            loop={false}
          >
          {beads.map((bead) => (
            <SwiperSlide>
              <button
                key={bead.id}
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
