"use client";

import { useState } from "react";
import { LayoutTemplate, Plus } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { usePatterns } from "@/hooks/usePatterns";
import { useLoadPattern } from "@/hooks/useLoadPattern";
import { usePermissions } from "@/hooks/usePermissions";
import { CreatePatternDialog } from "@/components/builder/dialogs/CreatePatternDialog";
import { useStore } from "@/lib/store";
import { DEFAULT_BRACELET_NAME } from "@/lib/constants";
import type { Bracelet } from "@/types";

interface PatternsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function PatternsPanel({ open, onClose }: PatternsPanelProps) {
  const { data: patterns = [], isLoading } = usePatterns();
  const { loadPattern } = useLoadPattern();
  const { canManageComponents } = usePermissions();
  const braceletName = useStore((s) => s.braceletName);
  const [createOpen, setCreateOpen] = useState(false);

  function handleSelect(pattern: Bracelet) {
    loadPattern(pattern);
    onClose();
  }

  const defaultName = braceletName === DEFAULT_BRACELET_NAME ? "" : braceletName;

  return (
    <>
      <Panel open={open} onClose={onClose} title="Patterns" direction="left" fixed overflowYScroll>
        <div className="flex flex-col gap-4 p-5 h-full">

          {canManageComponents && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="w-full"
            >
              <Plus size={14} />
              Save Current Canvas as Pattern
            </Button>
          )}

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-color-base/50">
              Loading patterns…
            </div>
          ) : patterns.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-color-base/50 py-12">
              <LayoutTemplate size={32} className="opacity-30" />
              <p>No patterns yet.</p>
              {canManageComponents && (
                <p className="text-xs">Save the current canvas as a pattern to get started.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {patterns.map((pattern) => (
                <PatternCard key={pattern.id} pattern={pattern} onSelect={handleSelect} />
              ))}
            </div>
          )}
        </div>
      </Panel>

      {createOpen && (
        <CreatePatternDialog
          initialName={defaultName}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </>
  );
}

function PatternCard({
  pattern,
  onSelect,
}: {
  pattern: Bracelet;
  onSelect: (p: Bracelet) => void;
}) {
  const beadCount = pattern.configuration?.beads?.length ?? 0;

  return (
    <button
      onClick={() => onSelect(pattern)}
      className="group flex flex-col overflow-hidden rounded-xl border border-default bg-white text-left transition-all hover:border-navy hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
    >
      {/* Thumbnail */}
      <div className="aspect-square w-full bg-shell overflow-hidden">
        {pattern.preview_image_url ? (
          <img
            src={pattern.preview_image_url}
            alt={pattern.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-color-base/20">
            <LayoutTemplate size={32} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 p-3">
        <span className="truncate text-sm font-semibold text-color-base leading-snug">
          {pattern.name}
        </span>
        <span className="text-xs text-color-base/50">
          {beadCount} {beadCount === 1 ? "bead" : "beads"}
        </span>
      </div>
    </button>
  );
}
