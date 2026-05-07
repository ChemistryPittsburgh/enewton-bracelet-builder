"use client";

/**
 * BeadReorderPanel.tsx
 *
 * Slides in from the left. Shows all placed beads as a drag-to-reorder list.
 * Uses @dnd-kit/sortable. Reordering immediately updates the 3D scene
 * since both read from the same Zustand store.
 */

import { X, GripVertical, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useStore } from "@/lib/store";
import type { PlacedBead } from "@/types";

interface BeadReorderPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BeadReorderPanel({ isOpen, onClose }: BeadReorderPanelProps) {
  const { beads, reorderBeads, removeBead } = useStore((s) => ({
    beads: s.beads,
    reorderBeads: s.reorderBeads,
    removeBead: s.removeBead,
  }));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a small movement before drag starts so taps still work
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = beads.findIndex((b) => b.instanceId === active.id);
    const toIndex = beads.findIndex((b) => b.instanceId === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderBeads(fromIndex, toIndex);
    }
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
          <div>
            <h2 className="text-sm font-semibold text-neutral-800">
              Edit bead order
            </h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Drag to reorder · changes apply instantly
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sortable list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {beads.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center mt-8">
              No beads added yet.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={beads.map((b) => b.instanceId)}
                strategy={verticalListSortingStrategy}
              >
                {beads.map((bead, index) => (
                  <SortableBeadRow
                    key={bead.instanceId}
                    bead={bead}
                    index={index}
                    onRemove={() => removeBead(bead.instanceId)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-neutral-100 shrink-0">
          <p className="text-[11px] text-neutral-400 text-center">
            {beads.length} bead{beads.length !== 1 ? "s" : ""} on bracelet
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Sortable row ──────────────────────────────────────────────────────────

interface SortableBeadRowProps {
  bead: PlacedBead;
  index: number;
  onRemove: () => void;
}

function SortableBeadRow({ bead, index, onRemove }: SortableBeadRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bead.instanceId });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-1.5 transition-colors ${
        isDragging ? "bg-neutral-100 shadow-md" : "bg-neutral-50 hover:bg-neutral-100"
      }`}
    >
      {/* Position number */}
      <span className="text-[10px] font-mono text-neutral-400 w-4 shrink-0 select-none">
        {index + 1}
      </span>

      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing touch-none text-neutral-300 hover:text-neutral-500 shrink-0"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      {/* Bead info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-neutral-800 truncate">
          {bead.product.name}
        </p>
        <p className="text-[10px] text-neutral-400">
          {((bead.product.diameter ?? 0) * 1000).toFixed(1)} mm
        </p>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 shrink-0 rounded-md p-1 text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-all"
        aria-label={`Remove ${bead.product.name}`}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
