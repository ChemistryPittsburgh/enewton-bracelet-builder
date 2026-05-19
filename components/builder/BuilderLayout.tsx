"use client";

import { useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { Check, ChevronsRight } from "lucide-react";

import { Scene } from "@/components/scene/Scene";
import { Button } from "@/components/ui/Button";
import { PANEL_WIDTH } from "@/components/ui/Panel";
import { BraceletImporter } from "./BraceletImporter";
import { BeadSelectorPanel } from "./BeadSelectorPanel";
import { BeadInfoPanel } from "./BeadInfoPanel";
import { BandSelector } from "./BandSelector";

import { CanvasStatsBar } from "./CanvasStatsBar";
import { CanvasToolbar } from "./CanvasToolbar";
import { EditModeToolbar } from "./EditModeToolbar";

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
    dragFromPanel,
  } = useStore((s) => ({
    placedBeads: s.beads,
    clearBeads: s.clearBeads,
    braceletName: s.braceletName,
    setBraceletName: s.setBraceletName,
    clearSelectedBead: s.clearSelectedBead,
    selectedBead: s.selectedBead,
    dragFromPanel: s.dragFromPanel,
  }));

  const [resolvedBeads, setResolvedBeads] = useState<BeadProduct[]>(beads);
  const [braceletPanelOpen, setBraceletPanelOpen] = useState(false);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!dragFromPanel) return;
    document.body.style.cursor = "grabbing";
    const onMove = (e: PointerEvent) => setGhostPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.body.style.cursor = "";
    };
  }, [!!dragFromPanel]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a bead is selected (BeadInfoPanel opens), close BraceletPanel
  useEffect(() => {
    if (selectedBead) setBraceletPanelOpen(false);
  }, [selectedBead]);

  // When BraceletPanel opens, clear selected bead (closes BeadInfoPanel)
  function openBraceletPanel() {
    clearSelectedBead();
    setBraceletPanelOpen((o) => !o);
  }

  // Preload GLBs and auto-measure any beads missing a diameter
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

      {/* Scene */}
      <main id="bracelet-scene" className="relative flex-1 overflow-hidden">

        <BeadSelectorPanel
          isOpen={braceletPanelOpen}
          onClose={() => setBraceletPanelOpen(false)}
          beads={resolvedBeads}
        />

        {/* Clip container — narrows visible area without resizing the canvas */}
        <div
          className="absolute top-0 bottom-0 right-0 overflow-hidden"
          style={{
            left: braceletPanelOpen ? PANEL_WIDTH : 0,
            transition: "left 300ms ease-out",
          }}
        >
          <button
            onClick={openBraceletPanel}
            className={`bracelet-panel-toggle-btn absolute left-0 top-0 bottom-0 z-40 my-auto h-fit rounded-br-lg rounded-tr-lg bg-neutral-700 px-1 py-2 text-white ${braceletPanelOpen ? "open" : ""}`}
          >
            <ChevronsRight size={25} />
          </button>

          <CanvasToolbar />
          <CanvasStatsBar />

          {/* Edit mode action toolbar — floats upper-right over canvas */}
          <div className="absolute top-20 right-4 z-20 pointer-events-none shadow-sm rounded-lg">
            <EditModeToolbar />
          </div>
          <BandSelector panelOpen={braceletPanelOpen} />

          {/* Inner canvas — always full screen width, clipped by parent */}
          <div
            className="absolute top-0 bottom-0 right-0"
            style={{
              left: braceletPanelOpen ? -PANEL_WIDTH : 0,
              transition: "left 300ms ease-out",
            }}
          >
            <Scene panelOpen={braceletPanelOpen} />
          </div>
        </div>

      </main>

      <BeadInfoPanel />

      {dragFromPanel && (
        <div
          style={{
            position: "fixed",
            left: ghostPos.x + 12,
            top: ghostPos.y + 12,
            pointerEvents: "none",
            zIndex: 9999,
          }}
          className="rounded-lg border border-neutral-300 bg-white shadow-lg px-2 py-1 text-xs text-neutral-800 flex items-center gap-1.5"
        >
          <span className="text-neutral-400">＋</span>
          {dragFromPanel.beadType ?? dragFromPanel.name}
        </div>
      )}

    </div>
  );
}