"use client";

import { useRef } from "react";
import { useStore } from "@/lib/store";
import { BeadThumbnail } from "@/components/ui/BeadThumbnail";
import type { BeadProduct } from "@/types";

export function BeadCard({ bead, selected, onClick, canEdit, disabled = false }: {
  bead: BeadProduct; selected: boolean; onClick: () => void; canEdit: boolean; disabled?: boolean;
}) {
  const setDragFromPanel = useStore((s) => s.setDragFromPanel);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const size = bead.size_mm ?? 4;

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    didDragRef.current = false;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!startRef.current || didDragRef.current || !canEdit || disabled) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      didDragRef.current = true;
      setDragFromPanel(bead);
    }
  }

  function handlePointerUp() {
    startRef.current = null;
  }

  function handleClick() {
    if (!didDragRef.current && !disabled) onClick();
  }

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      disabled={disabled}
      className={`flex flex-col gap-1 rounded-[2px] border transition-all overflow-hidden h-full ${
        disabled
          ? "border-default bg-light-grey/50 opacity-40 cursor-not-allowed"
          : canEdit
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-default"
      } ${
        selected && !disabled
          ? "ring-2 ring-navy border-navy shadow-sm"
          : !disabled
            ? "border-default bg-white hover:border-neutral-400"
            : ""
      }`}
    >
      <div className="flex flex-col justify-center items-center h-[120px] py-1 overflow-hidden w-full object-cover object-center bg-light-grey">
        <BeadThumbnail bead={bead} className="w-full max-w-24"  />
      </div>
      <div className="flex flex-1 min-h-14 shrink-0 flex-col pt-[2px] pb-2 text-left px-2">
        <span className="text-[12px]">{bead.name}</span>
        <span className="text-[10px] leading-tight text-color-base/70">{size}mm</span>
      </div>
    </button>
  );
}