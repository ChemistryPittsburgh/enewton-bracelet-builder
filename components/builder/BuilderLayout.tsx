"use client";

import { useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { Check, ChevronsRight } from "lucide-react";

import { Scene } from "@/components/scene/Scene";
import { Button } from "@/components/ui/Button";
import { BraceletInfoBar } from "./BraceletInfoBar";
import { BraceletImporter } from "./BraceletImporter";
import { BraceletPanel } from "./BraceletPanel";
import { BeadInfoPanel } from "./BeadInfoPanel";

import { useStore } from "@/lib/store";
import { measureBeadDiameter } from "@/lib/measure-bead";
import type { BeadProduct } from "@/types";

interface BuilderLayoutProps {
  beads: BeadProduct[];
}

export function BuilderLayout({ beads }: BuilderLayoutProps) {
  const {
    placedBeads,
    clearBeads,
    braceletName,
    setBraceletName,
    clearSelectedBead,
    selectedBead,
  } = useStore((s) => ({
    placedBeads: s.beads,
    clearBeads: s.clearBeads,
    braceletName: s.braceletName,
    setBraceletName: s.setBraceletName,
    clearSelectedBead: s.clearSelectedBead,
    selectedBead: s.selectedBead,
  }));

  const [resolvedBeads, setResolvedBeads] = useState<BeadProduct[]>(beads);
  const [braceletPanelOpen, setBraceletPanelOpen] = useState(false);

  // When a bead is selected (BeadInfoPanel opens), close BraceletPanel
  useEffect(() => {
    if (selectedBead) {
      setBraceletPanelOpen(false);
    }
  }, [selectedBead]);

  // When BraceletPanel opens, clear selected bead (closes BeadInfoPanel)
  function openBraceletPanel() {
    clearSelectedBead();
    setBraceletPanelOpen((o) => !o);
  }

  // Preload GLB file
  // Measures each bead diameter if not diameter is provided 
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
        <div className="flex flex-1 items-center gap-3">
          <img
            src="https://enewtondesign.com/cdn/shop/files/enewton_header_logo.png"
            alt="eNewton Logo"
            className="header-logo max-w-[200px] border-r border-yellow-600 pr-4"
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={braceletName}
              onChange={(e) => setBraceletName(e.target.value)}
              className="bracelet-panel-name-input flex-1 rounded border-transparent bg-transparent px-3 py-2 font-semibold text-neutral-700 outline-none transition-all hover:bg-neutral-100 focus:border-yellow-600"
              aria-label="Bracelet name"
            />
            <Check size={20} />
          </div>
        </div>

        <span className="flex flex-1 items-center justify-end gap-2 font-semibold tracking-wide text-neutral-700">
          <BraceletImporter />
          {placedBeads.length > 0 && (
            <Button onClick={clearBeads} className="ml-4">
              Clear Beads
            </Button>
          )}
        </span>
      </header>

      {/* 3D scene */}
      <div className="canvas-wrapper relative flex flex-1 flex-col">
        <button
          onClick={openBraceletPanel}
          className="absolute left-0 top-0 bottom-0 z-40 my-auto h-fit rounded-br-lg rounded-tr-lg bg-neutral-700 px-1 py-2 text-white"
        >
          <ChevronsRight size={25} />
        </button>

        <main className="relative z-10 flex-1 overflow-hidden">
          <Scene />
        </main>

        <BraceletInfoBar />
      </div>

      {/* Panels */}
      <BraceletPanel
        isOpen={braceletPanelOpen}
        onClose={() => setBraceletPanelOpen(false)}
        beads={resolvedBeads}
      />
      <BeadInfoPanel />

    </div>
  );
}