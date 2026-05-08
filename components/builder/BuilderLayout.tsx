"use client";

import { useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { BarChart2, GripVertical } from "lucide-react";

import { Scene } from "@/components/scene/Scene";
import { Button } from "@/components/ui/Button";

import { BeadPickerHeader } from "./BeadPickerHeader";
import { BeadPicker } from "./BeadPicker";
import { BeadInfoPanel } from "./BeadInfoPanel";
import { BraceletPanel } from "./BraceletPanel";
import { BraceletImporter } from "./BraceletImporter";
import { BeadReorderPanel } from "./BeadReorderPanel";

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
  const [reorderOpen, setReorderOpen] = useState(false);

  // Only one left panel open at a time
  function openStats() {
    setReorderOpen(false);
    setBraceletPanelOpen((o) => !o);
  }
  function openReorder() {
    setBraceletPanelOpen(false);
    setReorderOpen((o) => !o);
  }

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

          <button
            onClick={openReorder}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
              reorderOpen
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:bg-neutral-100"
            }`}
            title="Edit bead order"
          >
            <GripVertical size={14} />
            <span>Edit order</span>
          </button>

          <BraceletImporter />
        </div>

        <span className="flex-1 justify-center font-semibold tracking-wide text-neutral-700 flex gap-3 items-center">
          <img src="https://enewtondesign.com/cdn/shop/files/enewton_header_logo.png" alt="eNewton Logo" className="header-logo max-w-[200px] border-r border-yellow-600 pr-4" />
          <span>Bracelet Builder</span>
        </span>

        <span className="text-sm text-neutral-400">
          {placedBeads.length} bead{placedBeads.length !== 1 ? "s" : ""} added
          {placedBeads.length > 0 && (
            <Button
              onClick={clearBeads}
              className="ml-4"
            >
              Clear Beads
            </Button>
          )}
        </span>
      </header>

      {/* 3D scene */}
      <div className="canvas-wrapper relative flex-1 flex flex-col">
        <main className="overflow-hidden relative z-40 flex-1">
          <Scene />
        </main>

        {/* Bead picker header */}
        <BeadPickerHeader />
      </div>

      {/* Bead picker */}
      <div className="shrink-0 border-t border-neutral-200 bg-white py-3">
        <BeadPicker beads={resolvedBeads} />
      </div>

      {/* Panels */}
      <BraceletPanel isOpen={braceletPanelOpen} onClose={() => setBraceletPanelOpen(false)} />
      <BeadReorderPanel isOpen={reorderOpen} onClose={() => setReorderOpen(false)} />
      <BeadInfoPanel />

    </div>
  );
}
