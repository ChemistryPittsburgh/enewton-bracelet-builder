"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Search, X } from "lucide-react";

import { useDesigns, type DesignSortOption } from "@/hooks/useDesigns";
import { useLoadDesign } from "@/hooks/useLoadDesign";
import { useDeleteDesign } from "@/hooks/useDeleteDesign";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Bracelet, BraceletStatus } from "@/types";
import { getInitials } from "@/lib/utils";

import { DesignCard } from "./DesignCard";
import { DeleteBraceletDialog } from "./DeleteBraceletDialog";

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

const SORT_OPTIONS: { label: string; value: DesignSortOption }[] = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Name A–Z",     value: "name_asc" },
  { label: "Name Z–A",     value: "name_desc" },
];

// Stable consistent colours for creator avatars (cycles through a small palette)
const AVATAR_COLOURS = [
  "bg-blue-500",
  "bg-teal-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-emerald-500",
];

export function SavedDesignsPanel({ isOpen, onClose }: SavedDesignsPanelProps) {
  // ── Status sidebar
  const [selectedStatus, setSelectedStatus] = useState<BraceletStatus | undefined>(undefined);
  const [designToDelete, setDesignToDelete] = useState<Bracelet | null>(null);
  const { mutate: deleteDesign, isPending: isDeleting } = useDeleteDesign();

  // ── Filter bar state
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedTypes,     setSelectedTypes]     = useState<string[]>([]);
  const [selectedCreators,  setSelectedCreators]  = useState<string[]>([]);
  const [sortBy,            setSortBy]            = useState<DesignSortOption>("newest");
  const [search,            setSearch]            = useState("");


  // ── Data
  // Raw list — drives option derivation (no filters, one network request shared with filtered query)
  const { data: allDesigns = [] } = useDesigns();

  // Filtered + sorted list — drives the card grid
  const { data: designs = [], isLoading, isError, refetch } = useDesigns({
    status: selectedStatus,
    search,
    materials: selectedMaterials,
    types:     selectedTypes,
    creators:  selectedCreators,
    sortBy,
  });

  const { loadDesign }    = useLoadDesign();
  const beads             = useStore((s) => s.beads);
  const setPendingDesign  = useStore((s) => s.setPendingDesign);

  // ── Derived option lists (from full unfiltered dataset)
  const allMaterials = useMemo(
    () =>
      [
        ...new Set(
          allDesigns.flatMap((d) => d.material_tags).filter((v): v is string => !!v),
        ),
      ].sort(),
    [allDesigns],
  );
  const allTypes = useMemo(
    () =>
      [
        ...new Set(
          allDesigns.flatMap((d) => d.bead_types).filter((v): v is string => !!v),
        ),
      ].sort(),
    [allDesigns],
  );
  const allCreators = useMemo(
    () =>
      [
        ...new Set(
          allDesigns.map((d) => d.created_by_name).filter((v): v is string => !!v),
        ),
      ].sort(),
    [allDesigns],
  );

  // Active filter chips = union of all selected filter values
  const activeChips: { label: string; onRemove: () => void }[] = [
    ...selectedMaterials.map((m) => ({
      label: m,
      onRemove: () => setSelectedMaterials((prev) => prev.filter((x) => x !== m)),
    })),
    ...selectedTypes.map((t) => ({
      label: t,
      onRemove: () => setSelectedTypes((prev) => prev.filter((x) => x !== t)),
    })),
    ...selectedCreators.map((c) => ({
      label: c,
      onRemove: () => setSelectedCreators((prev) => prev.filter((x) => x !== c)),
    })),
  ];

  if (!isOpen) return null;

  // ── Dropdown helpers
  function addMaterial(value: string) {
    if (!value || selectedMaterials.includes(value)) return;
    setSelectedMaterials((prev) => [...prev, value]);
  }
  function addType(value: string) {
    if (!value || selectedTypes.includes(value)) return;
    setSelectedTypes((prev) => [...prev, value]);
  }

  // ── Load handler
  function handleCardClick(design: Bracelet) {
    if (beads.length > 0) {
      setPendingDesign(design, onClose);
    } else {
      loadDesign(design);
      onClose();
    }
  }

  // ── Shared select style
  const selectCls =
    "w-[175px] rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none transition-colors hover:border-neutral-400 focus:border-neutral-500 cursor-pointer";

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-8 py-4">
        <h2 className="text-xl font-semibold text-neutral-800">Saved designs</h2>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          Return to builder <X size={16} />
        </button>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
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
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* ── Filter bar ─────────────────────────────────────────────── */}
          <div className="shrink-0 border-b border-neutral-100 px-6 py-3 flex flex-col gap-2">

            {/* Row 1: dropdowns · creator avatars · search */}
            <div className="flex items-center gap-3">

              {/* Dropdowns */}
              <div className="flex items-center gap-2">
                {/* Material */}
                <select
                  value=""
                  onChange={(e) => addMaterial(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Material</option>
                  {allMaterials.map((m) => (
                    <option key={m} value={m} disabled={selectedMaterials.includes(m)}>
                      {m ? m.charAt(0).toUpperCase() + m.slice(1) : m}
                    </option>
                  ))}
                </select>

                {/* Type */}
                <select
                  value=""
                  onChange={(e) => addType(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Type</option>
                  {allTypes.map((t) => (
                    <option key={t} value={t} disabled={selectedTypes.includes(t)}>
                      {t}
                    </option>
                  ))}
                </select>

                {/* Collection — placeholder until collections API is built */}
                <select disabled className={cn(selectCls, "opacity-50 cursor-not-allowed")}>
                  <option>Collection</option>
                </select>
              </div>

              {/* Creator avatar chips */}
              {allCreators.length > 0 && (
                <div className="flex items-center gap-1.5 mx-auto">
                  {allCreators.map((creator, i) => {
                    const isActive = selectedCreators.includes(creator);
                    const colour   = AVATAR_COLOURS[i % AVATAR_COLOURS.length];
                    return (
                      <button
                        key={creator}
                        title={creator}
                        onClick={() =>
                          setSelectedCreators((prev) =>
                            isActive ? prev.filter((c) => c !== creator) : [...prev, creator],
                          )
                        }
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white transition-all",
                          colour,
                          isActive
                            ? "ring-2 ring-offset-1 ring-neutral-800 scale-110"
                            : "opacity-60 hover:opacity-100",
                        )}
                      >
                        {getInitials(creator)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search */}
              <div className="ml-auto flex items-center gap-0 rounded-lg border border-neutral-200 bg-white px-3 focus-within:border-neutral-500 transition-colors">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search bracelet name"
                  className="w-48 border-0 bg-transparent py-1.5 text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
                />
                <Search size={15} className="shrink-0 text-neutral-400" />
              </div>
            </div>

            {/* Row 2: active chips · sort */}
            <div className="flex items-center gap-2 min-h-[28px]">
              {/* Active filter chips */}
              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                {activeChips.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-white"
                  >
                    {chip.label}
                    <button
                      onClick={chip.onRemove}
                      className="ml-0.5 rounded-full hover:text-neutral-300 transition-colors"
                      aria-label={`Remove ${chip.label} filter`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Sort */}
              <div className="ml-auto flex shrink-0 items-center gap-1.5 text-sm text-neutral-600">
                <span className="font-medium">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as DesignSortOption)}
                  className="border-0 bg-transparent text-sm font-medium text-neutral-700 outline-none cursor-pointer hover:text-neutral-900"
                >
                  {SORT_OPTIONS.map(({ label, value }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Card grid ──────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6">
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
                  <DesignCard
                    key={design.id}
                    design={design}
                    onClick={() => handleCardClick(design)}
                    onDeleteRequest={(d) => setDesignToDelete(d)}  // ← add this
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {designToDelete && (
        <DeleteBraceletDialog
          designName={designToDelete.name}
          isDeleting={isDeleting}
          onCancel={() => setDesignToDelete(null)}
          onConfirm={() => {
            deleteDesign(designToDelete.id, {
              onSuccess: () => setDesignToDelete(null),
            });
          }}
        />
      )}

    </div>
  );
}
