"use client";

import { useRef } from "react";
import { X, Download } from "lucide-react";
import { useStore } from "@/lib/store";
import { usedArc, MAX_BRACELET_ARC } from "@/lib/bead-layout";
import { Check } from "lucide-react";
import { slugify } from "@/lib/utils";

interface BraceletPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BraceletPanel({ isOpen, onClose }: BraceletPanelProps) {
  const {beads, braceletName, setBraceletName } = useStore((s) => ({
    beads: s.beads, 
    setBraceletName: s.setBraceletName, 
    braceletName: s.braceletName,
  }));

  const arcUsed = usedArc(beads);
  const percentUsed = Math.min((arcUsed / MAX_BRACELET_ARC) * 100, 100);
  const remainingMm = Math.max((MAX_BRACELET_ARC - arcUsed) * 1000, 0);

  function handleExport() {
    const data = {
      exportedAt: new Date().toISOString(),
      bracelet: {
        name: braceletName, 
        arcUsedMm: (arcUsed * 1000).toFixed(2),
        arcTotalMm: (MAX_BRACELET_ARC * 1000).toFixed(2),
        percentUsed: percentUsed.toFixed(1),
        beadCount: beads.length,
      },
      beads: beads.map((b, i) => ({
        position: i + 1,
        instanceId: b.instanceId,
        id: b.product.id,
        name: b.product.name,
        diameterMm: ((b.product.diameter ?? 0) * 1000).toFixed(2),
        glbPath: b.product.glbPath,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const braceletNameSlug = slugify(braceletName);
    a.href = url;
    a.download = `bracelet-${braceletNameSlug}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen
            ? "pointer-events-auto opacity-100 bg-black/20"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-72 z-50 bg-white shadow-xl transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 shrink-0">
          <h2 className="text-sm font-semibold text-neutral-800">
            Bracelet Information
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div class="px-5 py-4 border-b border-neutral-100 flex gap-2 items-center">
        <input
            type="text"
            value={braceletName}
            onChange={(e) => setBraceletName(e.target.value)}
            className="bracelet-panel-name-input flex-1 text-sm font-semibold text-neutral-700 bg-transparent outline-none border border-neutral-400 hover:bg-neutral-100 focus:border-yellow-600 transition-all rounded px-3 py-2"
            aria-label="Bracelet name"
          />
          <Check size={20} />
        </div>

        {/* Usage bar */}
        <div className="px-5 py-4 border-b border-neutral-100 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-neutral-500">Bracelet usage</span>
            <span className="text-xs font-medium text-neutral-700">
              {percentUsed.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-neutral-800 transition-all duration-500"
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-neutral-400">
              {(arcUsed * 1000).toFixed(1)} mm used
            </span>
            <span className="text-[10px] text-neutral-400">
              {remainingMm.toFixed(1)} mm remaining
            </span>
          </div>
        </div>

        {/* Bead list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {beads.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center mt-6">
              No beads added yet.
            </p>
          ) : (
            <ol className="space-y-2">
              {beads.map((b, i) => (
                <li
                  key={b.instanceId}
                  className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2"
                >
                  <span className="text-[10px] font-mono text-neutral-400 w-4 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-800 truncate">
                      {b.product.name}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {((b.product.diameter ?? 0) * 1000).toFixed(2)} mm
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Export button */}
        <div className="px-5 py-4 border-t border-neutral-100 shrink-0">
          <button
            onClick={handleExport}
            disabled={beads.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Export as JSON
          </button>
        </div>
      </div>
    </>
  );
}
