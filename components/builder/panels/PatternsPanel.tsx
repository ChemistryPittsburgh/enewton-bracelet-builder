"use client";

import { useState } from "react";
import { LayoutTemplate, Plus } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { usePatterns } from "@/hooks/usePatterns";
import { useLoadPattern } from "@/hooks/useLoadPattern";
import { usePermissions } from "@/hooks/usePermissions";
import { CreatePatternDialog } from "@/components/builder/dialogs/CreatePatternDialog";
import { PatternCard } from "@/components/builder/saved-designs/PatternCard";
import { useStore } from "@/lib/store";
import { DEFAULT_BRACELET_NAME } from "@/lib/constants";
import type { Bracelet } from "@/types";

interface PatternsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function PatternsPanel({ open, onClose }: PatternsPanelProps) {
  const { data: patterns = [], isLoading } = usePatterns();
  const { loadPattern, editPattern } = useLoadPattern();
  const { canManageComponents } = usePermissions();
  const braceletName = useStore((s) => s.braceletName);
  const [createOpen, setCreateOpen] = useState(false);

  function handleSelect(pattern: Bracelet) {
    loadPattern(pattern);
    onClose();
  }

  function handleEdit(pattern: Bracelet) {
    editPattern(pattern);
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
                <PatternCard
                  key={pattern.id}
                  pattern={pattern}
                  canDelete={canManageComponents}
                  onLoad={() => handleSelect(pattern)}
                  onEdit={canManageComponents ? () => handleEdit(pattern) : undefined}
                />
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

