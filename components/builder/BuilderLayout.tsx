"use client";

import { useGLTF } from "@react-three/drei";

import { Scene } from "@/components/scene/Scene";
import { BeadPicker } from "./BeadPicker";
import { BeadInfoPanel } from "./BeadInfoPanel";
import { useStore } from "@/lib/store";
import { MAX_BEADS } from "@/lib/bead-layout";
import type { BeadProduct } from "@/types";

interface BuilderLayoutProps {
  beads: BeadProduct[];
}

export function BuilderLayout({ beads }: BuilderLayoutProps) {
  beads.forEach((b) => useGLTF.preload(b.glbPath));
  const { placedBeads, clearBeads } = useStore((s) => ({
    placedBeads: s.beads,
    clearBeads: s.clearBeads,
  }));

  return (
    <div className="flex h-screen flex-col overflow-hidden">

      {/* Header */}
      <header className="flex shrink-0 items-center gap-4 py-4 border-b border-neutral-200 bg-white px-10">
        <img src="https://enewtondesign.com/cdn/shop/files/enewton_header_logo.png" alt="eNewton Logo" className="header-logo" />
        <span className="text-md font-semibold tracking-wide text-neutral-700 flex-1 text-center">
          Bracelet Builder
        </span>
        <span className="text-sm text-neutral-500 min-w-[200px] shrink-0 text-right">
          {placedBeads.length} / {MAX_BEADS} beads
          {placedBeads.length > 0 && (
            <button
              onClick={clearBeads}
              className="primary-btn transition-colors ml-4"
            >
              Clear Beads
            </button>
          )}
        </span>
      </header>

      {/* 3D scene — fills remaining space */}
      <main className="flex-1 overflow-hidden">
        <Scene />
      </main>

      {/* Bead picker at the bottom */}
      <div className="flex px-8 border-t border-neutral-200 bg-white items-center">
        <div className="shrink-0 flex-1">
          <BeadPicker beads={beads} />
        </div>
        <div className="shrink-0">
          {placedBeads.length > 0 && (
              <button
                onClick={clearBeads}
                className="primary-btn transition-colors"
              >
                Clear Beads
              </button>
            )}
        </div>
      </div>

      {/* Info panel — rendered outside the flex column so it overlays everything */}
      <BeadInfoPanel />

    </div>
  );
}
