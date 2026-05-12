"use client";

import { useState, useMemo } from "react";
import { Download } from "lucide-react";

import { useStore } from "@/lib/store";
import { usedArc, MAX_BRACELET_ARC } from "@/lib/bead-layout";
import { slugify } from "@/lib/utils";

import { BeadSelector } from "@/components/panel/BeadSelector";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

import type { BeadProduct } from "@/types";

interface BraceletPanelProps {
  isOpen: boolean;
  onClose: () => void;
  beads: BeadProduct[];
}

export function BraceletPanel({ isOpen, onClose, beads }: BraceletPanelProps) {
  const { storedBeads, braceletName, setBraceletName, addBead } = useStore((s) => ({
    storedBeads: s.beads,
    setBraceletName: s.setBraceletName,
    braceletName: s.braceletName,
    addBead: s.addBead,
  }));

  const arcUsed = usedArc(storedBeads);
  const percentUsed = Math.min((arcUsed / MAX_BRACELET_ARC) * 100, 100);

  function handleExport() {
    const data = {
      exportedAt: new Date().toISOString(),
      bracelet: {
        name: braceletName,
        arcUsedMm: (arcUsed * 1000).toFixed(2),
        arcTotalMm: (MAX_BRACELET_ARC * 1000).toFixed(2),
        percentUsed: percentUsed.toFixed(1),
        beadCount: storedBeads.length,
      },
      beads: storedBeads.map((b, i) => ({
        position: i + 1,
        instanceId: b.instanceId,
        id: b.product.id,
        name: b.product.name,
        diameterMm: ((b.product.diameter ?? 0) * 1000).toFixed(2),
        glbPath: b.product.glbPath,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bracelet-${slugify(braceletName)}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Panel open={isOpen} onClose={onClose} title="Bracelet Editor" direction="left" fixed={false}>

      {/* Bead selector */}
      <div className="flex-1 min-h-0">
        <BeadSelector beads={beads} />
      </div>

      {/* Export JSON */}
      <div className="border-t border-neutral-100 pt-3 px-4 mt-4">
        <Button
          onClick={handleExport}
          disabled={storedBeads.length === 0}
          className="w-full"
          variant="black"
        >
          <Download size={14} />
          Export as JSON
        </Button>
      </div>

    </Panel>
  );
}