"use client";

import { useMemo, useState } from "react";
import { Search, LayoutTemplate } from "lucide-react";

import { cn } from "@/lib/utils";
import { type DesignSortOption } from "@/hooks/useDesigns";
import { usePatterns } from "@/hooks/usePatterns";
import { useLoadPattern } from "@/hooks/useLoadPattern";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

import { PatternCard } from "./PatternCard";

const PATTERN_SORT_OPTIONS: { label: string; value: DesignSortOption }[] = [
  { label: "Newest first", value: "newest"   },
  { label: "Oldest first", value: "oldest"   },
  { label: "Name A–Z",     value: "name_asc" },
  { label: "Name Z–A",     value: "name_desc"},
];

export function PatternsGrid({ onClose }: { onClose: () => void }) {
  const { data: patterns = [], isLoading } = usePatterns();
  const { loadPattern, editPattern } = useLoadPattern();
  const { canManageComponents } = usePermissions();
  const [search, setSearch]   = useState("");
  const [sortBy, setSortBy]   = useState<DesignSortOption>("newest");

  const formLabel =
    "form-label text-xs text-color-base/70 uppercase font-semibold tracking-wide";

  const filtered = useMemo(() => {
    let list = [...patterns];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case "oldest":    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc":  return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        default:          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return list;
  }, [patterns, search, sortBy]);

  function handleLoad(pattern: Bracelet) {
    loadPattern(pattern);
    onClose();
  }

  function handleEdit(pattern: Bracelet) {
    editPattern(pattern);
    onClose();
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex gap-3 designs-panel-header px-6 lg:px-10 border-b border-default">
        <h2 className="flex-1 text-xl pb-3 lg:py-6">Patterns</h2>
        <div className="shrink-0 flex flex-col items-end gap-2 pb-3">
          {/* Search — floated right */}
          <div className="flex flex-col gap-2">
            <p className={formLabel}>Search</p>
            <div className="flex items-center gap-0 rounded-[2px] border border-default bg-white pr-3 focus-within:border-navy transition-colors">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pattern name"
                aria-label="Search patterns by name"
                className="w-48 border-0 bg-transparent px-2 py-2.5 text-sm outline-none ring-0 placeholder:text-color-base/70"
              />
              <Search size={15} className="shrink-0 text-color-base/70" />
            </div>
          </div>

          {/* Sort */}
          <div className="flex shrink-0 items-center gap-1.5">
            <p className={cn(formLabel, "py-1")}>Sort by:</p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as DesignSortOption)}
              className="border-0 bg-transparent text-sm py-1 text-color-base/70 focus:ring-navy outline-none cursor-pointer hover:text-neutral-900"
            >
              {PATTERN_SORT_OPTIONS.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 lg:overflow-y-auto p-6 lg:px-10">
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col rounded-[3px] border border-default overflow-hidden">
                <div className="aspect-square w-full bg-light-grey/80 animate-pulse" />
                <div className="px-3 py-3 flex flex-col gap-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-light-grey/80 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && patterns.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 text-center text-sm text-color-base/50 py-16">
            <LayoutTemplate size={36} className="opacity-30" />
            <p>No patterns yet.</p>
            {canManageComponents && (
              <p className="text-xs">Open a design and use the three-dot menu to save it as a pattern.</p>
            )}
          </div>
        )}

        {!isLoading && patterns.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-color-base/70 py-8 text-center">No patterns match your search.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((pattern) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                canDelete={canManageComponents}
                onLoad={() => handleLoad(pattern)}
                onEdit={canManageComponents ? () => handleEdit(pattern) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}