"use client";

import { useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { Check, ChevronsRight, Inbox } from "lucide-react";

import { Scene } from "@/components/scene/Scene";
import { Button } from "@/components/ui/Button";
import { PANEL_WIDTH } from "@/components/ui/Panel";
import { FullScreenDialog } from "@/components/ui/FullScreenDialog";

import { BraceletImporter } from "./BraceletImporter";

import { BeadSelectorPanel } from "./BeadSelectorPanel";
import { SavedDesignsPanel } from "./SavedDesignsPanel";

import { BeadInfoDialog } from "./BeadInfoDialog";
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
  } = useStore((s) => ({
    placedBeads: s.beads,
    clearBeads: s.clearBeads,
    braceletName: s.braceletName,
    setBraceletName: s.setBraceletName,
  }));

  const [resolvedBeads, setResolvedBeads] = useState<BeadProduct[]>(beads);
  const [braceletPanelOpen, setBraceletPanelOpen] = useState(false);
  const [savedDesignsOpen, setSavedDesignsOpen] = useState(false);
  const [braceletDetailsOpen, setBraceletDetailsOpen] = useState(false);


  // When BraceletPanel opens, clear selected bead (closes BeadInfoDialog)
  function openBraceletPanel() {
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
      <header className="flex shrink-0 items-center gap-4 py-4 border-b border-neutral-200 bg-white px-6">
        <div className="flex flex-1 items-center gap-4">
        <button
          onClick={() => setSavedDesignsOpen(true)}
          className="flex items-center rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
          aria-label="Saved Designs"
        >
          <Inbox size={20} />
        </button>
          <img
            src="https://enewtondesign.com/cdn/shop/files/enewton_header_logo.png"
            alt="eNewton Logo"
            className="header-logo max-w-[200px]"
          />
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

        <BeadInfoDialog />

        {/* Clip container — narrows visible area without resizing the canvas */}
        <div
          className="absolute flex flex-col top-0 bottom-0 right-0 overflow-hidden"
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

          <div className="inner-canvas relative flex-1">
            <div className="absolute left-2 top-2 z-20 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={braceletName}
                  onChange={(e) => setBraceletName(e.target.value)}
                  className="bracelet-panel-name-input flex-1 rounded border-transparent bg-transparent px-2 py-2 font-semibold text-neutral-700 outline-none transition-all hover:bg-neutral-100 focus:border-yellow-600"
                  aria-label="Bracelet name"
                />
                <Check size={20} />
              </div>
              <button 
                className="text-left px-2 text-xs underline hover:no-underline w-fit rounded focus:ring-2 focus:ring-neutral-600"
                onClick={() => setBraceletDetailsOpen(true)}
              >
                view bracelet details
              </button>
            </div>

            <CanvasStatsBar />

            {/* Edit mode action toolbar — floats upper-right over canvas */}
            <div className="absolute right-4 z-20 pointer-events-none shadow-sm rounded-lg">
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
        </div>

      </main>

      <SavedDesignsPanel
        isOpen={savedDesignsOpen}
        onClose={() => setSavedDesignsOpen(false)}
      />

      <FullScreenDialog
        open={braceletDetailsOpen}
        onClose={() => setBraceletDetailsOpen(false)}
        title={`${braceletName} Details`}
      >
        Bracelet Details Here
      </FullScreenDialog>

    </div>
  );
}