"use client";

import { useState } from "react";
import { LayoutTemplate, Loader2, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { usePatterns } from "@/hooks/usePatterns";
import { useLoadPattern } from "@/hooks/useLoadPattern";
import { useDeletePattern } from "@/hooks/useDeletePattern";
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
                <PatternCard key={pattern.id} pattern={pattern} onSelect={handleSelect} canDelete={canManageComponents} />
              ))}
            </div>
          )}
        </div>
      </Panel>

      {createOpen && (
        <CreatePatternDialog
          initialName={defaultName}
          onClose={() => setCreateOpen(false)}
          onSaved={() => setCreateOpen(false)}
        />
      )}
    </>
  );
}

function PatternCard({
  pattern,
  onSelect,
  canDelete,
}: {
  pattern: Bracelet;
  onSelect: (p: Bracelet) => void;
  canDelete: boolean;
}) {
  const beadCount = pattern.configuration?.beads?.length ?? 0;
  const [confirming, setConfirming] = useState(false);
  const { mutate: deletePattern, isPending } = useDeletePattern();

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-default bg-white transition-all hover:border-navy hover:shadow-md">
      {/* Thumbnail */}
      <button
        onClick={() => { if (!confirming) onSelect(pattern); }}
        className="aspect-square w-full bg-shell overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
      >
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
      </button>

      {/* Info + delete */}
      <div className="flex items-start gap-1 p-3">
        <button
          onClick={() => { if (!confirming) onSelect(pattern); }}
          className="flex flex-1 flex-col gap-0.5 text-left min-w-0"
        >
          <span className="truncate text-sm font-semibold text-color-base leading-snug">
            {pattern.name}
          </span>
          <span className="text-xs text-color-base/50">
            {beadCount} {beadCount === 1 ? "bead" : "beads"}
          </span>
        </button>

        {canDelete && !confirming && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            title="Delete pattern"
            className="shrink-0 mt-0.5 flex items-center justify-center rounded-full w-6 h-6 text-color-base/30 hover:text-error hover:bg-error/10 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Inline delete confirmation */}
      {confirming && (
        <div
          className="flex items-center justify-between gap-2 border-t border-error/20 bg-blush px-3 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-error font-medium">Delete pattern?</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => deletePattern(pattern.id)}
              disabled={isPending}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold bg-error text-white hover:bg-error/90 disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 size={10} className="animate-spin" />}
              Delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="rounded px-2 py-0.5 text-xs font-semibold text-color-base/70 hover:bg-default/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
