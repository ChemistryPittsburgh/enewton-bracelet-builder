"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";

import { useDesigns } from "@/hooks/useDesigns";
import { cn } from "@/lib/utils";
import type { BraceletStatus } from "@/types";

import { DesignCard } from "./DesignCard";

interface SavedDesignsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_FILTERS: { label: string; value: BraceletStatus | undefined }[] = [
  { label: "All",                    value: undefined },
  { label: "In-progress",            value: "draft" },
  { label: "In-review",              value: "in_review" },
  { label: "Approved",               value: "approved" },
  { label: "Published",              value: "published" },
  { label: "Design concepts",        value: "design_concept" },
  { label: "Discontinued (vintage)", value: "discontinued" },
];

export function SavedDesignsPanel({ isOpen, onClose }: SavedDesignsPanelProps) {
  const [selectedStatus, setSelectedStatus] = useState<BraceletStatus | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useDesigns(
    selectedStatus ? { status: selectedStatus } : undefined,
  );

  if (!isOpen) return null;

  

  const designs = data ?? [];

  console.log(designs)

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-8 py-4">
        <h2 className="text-xl font-semibold text-neutral-800">Saved designs</h2>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          Return to builder <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — status filters */}
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-neutral-200 p-4">
          <nav className="flex flex-col gap-1">
            {STATUS_FILTERS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setSelectedStatus(value)}
                className={cn(
                  "rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors",
                  selectedStatus === value
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-700 hover:bg-neutral-100",
                )}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-y-auto p-8">
          {isLoading && (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col rounded-lg border border-neutral-200 overflow-hidden">
                  <div className="aspect-square w-full bg-neutral-100 animate-pulse" />
                  <div className="px-3 py-2.5 flex flex-col gap-1.5">
                    <div className="h-3.5 w-3/4 rounded bg-neutral-100 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-neutral-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle size={24} className="text-neutral-400" />
              <p className="text-sm text-neutral-500">Failed to load designs.</p>
              <button
                onClick={() => refetch()}
                className="text-sm font-medium text-neutral-700 underline hover:text-neutral-900"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !isError && designs.length === 0 && (
            <p className="text-sm text-neutral-400 py-8 text-center">No designs found.</p>
          )}

          {!isLoading && !isError && designs.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {designs.map((design) => (
                <DesignCard key={design.id} design={design} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
