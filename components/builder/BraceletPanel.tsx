"use client";

import { Download } from "lucide-react";

import { useStore } from "@/lib/store";
import { useBraceletExport } from "@/hooks/useBraceletExport";

import { BeadSelector } from "@/components/panel/BeadSelector";
import { StringDetailsSelector } from "./StringDetailsSelector";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

import type { BeadProduct } from "@/types";

interface BraceletPanelProps {
  isOpen: boolean;
  onClose: () => void;
  beads: BeadProduct[];
}

export function BraceletPanel({ isOpen, onClose, beads }: BraceletPanelProps) {
  const storedBeads = useStore((s) => s.beads);
  const handleExport = useBraceletExport();

  return (
    <Panel open={isOpen} onClose={onClose} title="Bracelet Editor" direction="left">
      <div className="flex-1 min-h-0 overflow-hidden">
        <BeadSelector beads={beads} />
      </div>
      <div className="shrink-0">
        <StringDetailsSelector />
        <div className="border-t border-neutral-100 pt-3 px-4 pb-4">
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
      </div>
    </Panel>
  );
}
