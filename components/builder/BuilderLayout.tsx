"use client";

import { useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { BarChart2 } from "lucide-react";
import { Scene } from "@/components/scene/Scene";
import { BeadPicker } from "./BeadPicker";
import { BeadInfoPanel } from "./BeadInfoPanel";
import { BraceletPanel } from "./BraceletPanel";
import { BraceletImporter } from "./BraceletImporter";
import { useStore } from "@/lib/store";
import { measureBeadDiameter } from "@/lib/measure-bead";
import type { BeadProduct } from "@/types";

interface BuilderLayoutProps {
  beads: BeadProduct[];
}

export function BuilderLayout({ beads }: BuilderLayoutProps) {
  const { placedBeads, clearBeads, braceletName } = useStore((s) => ({
    placedBeads: s.beads,
    clearBeads: s.clearBeads,
    braceletName: s.braceletName,
  }));

  const [resolvedBeads, setResolvedBeads] = useState<BeadProduct[]>(beads);
  const [braceletPanelOpen, setBraceletPanelOpen] = useState(false);

  useEffect(() => {
    beads.forEach((b) => useGLTF.preload(b.glbPath));

    const needsMeasuring = beads.filter((b) => b.diameter === undefined);
    if (needsMeasuring.length === 0) return;

    Promise.all(
      needsMeasuring.map(async (b) => ({
        id: b.id,
        diameter: await measureBeadDiameter(b.glbPath),
      }))
    ).then((measured) => {
      const diameterById = new Map(measured.map((m) => [m.id, m.diameter]));
      setResolvedBeads(
        beads.map((b) => ({
          ...b,
          diameter: b.diameter ?? diameterById.get(b.id) ?? 0.01,
        }))
      );
    });
  }, [beads]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">

      {/* Header */}
      <header className="flex shrink-0 items-center gap-4 py-4 border-b border-neutral-200 bg-white px-10">
        <div className="flex items-center gap-3">
          {/* Bracelet Panel toggle button */}
          <button
            onClick={() => setBraceletPanelOpen((o) => !o)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
              braceletPanelOpen
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:bg-neutral-100"
            }`}
            title="Bracelet Information"
          >
            <BarChart2 size={14} />
            <span>Bracelet Information</span>
          </button>

          <BraceletImporter />
        </div>

        <span className="flex-1 justify-center font-semibold tracking-wide text-neutral-700 flex gap-3 items-center">
          <img src="https://enewtondesign.com/cdn/shop/files/enewton_header_logo.png" alt="eNewton Logo" className="header-logo border-r border-yellow-600 pr-4" />
          <span>Bracelet Builder</span>
        </span>

        <span className="text-sm text-neutral-400">
          {placedBeads.length} bead{placedBeads.length !== 1 ? "s" : ""} added
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

      {/* 3D scene */}
      <main className="flex-1 overflow-hidden relative z-40">
        <Scene />
      </main>

      {/* Bead picker */}
      <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3">
        { braceletName && 
          <h2 className="mt-1"><span className="font-bold">Bracelet Name:</span> {braceletName}</h2>
        }
        <BeadPicker beads={resolvedBeads} />
      </div>

      {/* Panels */}
      <BraceletPanel isOpen={braceletPanelOpen} onClose={() => setBraceletPanelOpen(false)} />
      <BeadInfoPanel />

    </div>
  );
}
