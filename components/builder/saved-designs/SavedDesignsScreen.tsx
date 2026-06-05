"use client";

import { useMemo, useState, useEffect } from "react";
import { AlertCircle, Search, X, Inbox } from "lucide-react";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { LOGO_SRC, LOGO_ALT } from "@/lib/constants";
import { CATEGORY_STYLES, type CategoryKey } from "@/lib/category-colors";

import { useDesigns, type DesignSortOption } from "@/hooks/useDesigns";
import { useLoadDesign } from "@/hooks/useLoadDesign";
import { useDeleteDesign } from "@/hooks/useDeleteDesign";
import { useDiscontinueDesign } from "@/hooks/useDiscontinueDesign";
import { useTags } from "@/hooks/Tags";
import { useCollections } from "@/hooks/Collections";

import type { Bracelet, BraceletStatus, Collection, Tag } from "@/types";

import { DesignCard } from "./DesignCard";
import { TagPicker, CollectionPicker } from "./Pickers";
import { DeleteBraceletDialog } from "@/components/builder/dialogs/DeleteBraceletDialog";
import { DiscontinueBraceletDialog } from "@/components/builder/dialogs/DiscontinueBraceletDialog";

interface SavedDesignsScreenProps {
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
  { label: "Discontinued", value: "discontinued" },
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

export function SavedDesignsScreen({ isOpen, onClose }: SavedDesignsScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  // ── Status sidebar
  const [selectedStatus, setSelectedStatus] = useState<BraceletStatus | undefined>(undefined);
  const [designToDelete, setDesignToDelete] = useState<Bracelet | null>(null);
  const { mutate: deleteDesign, isPending: isDeleting } = useDeleteDesign();

  const [designToDiscontinue, setDesignToDiscontinue] = useState<Bracelet | null>(null);
  const { mutate: discontinueDesign, isPending: isDiscontinuing } = useDiscontinueDesign();

  // ── Filter bar state
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedTypes,     setSelectedTypes]     = useState<string[]>([]);
  const [selectedCreators,  setSelectedCreators]  = useState<string[]>([]);
  const [selectedTagIds,       setSelectedTagIds]       = useState<number[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  const [sortBy,            setSortBy]            = useState<DesignSortOption>("newest");
  const [search,            setSearch]            = useState("");


  // ── Data
  // Raw list — drives option derivation (no filters, one network request shared with filtered query)
  const { data: allDesigns = [] } = useDesigns();

  // Filtered + sorted list — drives the card grid
  const { data: designs = [], isLoading, isError, refetch } = useDesigns({
    status:       selectedStatus,
    search,
    materials:    selectedMaterials,
    types:        selectedTypes,
    creators:     selectedCreators,
    tagIds:        selectedTagIds,
    collectionIds: selectedCollectionIds,
    sortBy,
  });

  const { loadDesign }    = useLoadDesign();
  const beads             = useStore((s) => s.beads);
  const activeDesignId    = useStore((s) => s.activeDesignId);
  const isDirty           = useStore((s) => s.isDirty);
  const setPendingDesign  = useStore((s) => s.setPendingDesign);
  const { data: allTags = [] }        = useTags();
  const { data: allCollections = [] } = useCollections();

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

  interface ActiveChip {
    category: CategoryKey;
    label: string;
    color?: string | null;
    onRemove: () => void;
  }

  const activeChips: ActiveChip[] = [
    ...selectedMaterials.map((m) => ({
      category: "material" as CategoryKey,
      label: m,
      onRemove: () => setSelectedMaterials((prev) => prev.filter((x) => x !== m)),
    })),
    ...selectedTypes.map((t) => ({
      category: "type" as CategoryKey,
      label: t,
      onRemove: () => setSelectedTypes((prev) => prev.filter((x) => x !== t)),
    })),
    ...selectedCreators.map((c) => ({
      category: "creator" as CategoryKey,
      label: c,
      onRemove: () => setSelectedCreators((prev) => prev.filter((x) => x !== c)),
    })),
    ...selectedTagIds.flatMap((id) => {
      const tag = allTags.find((t) => t.id === id);
      if (!tag) return [];
      return [{
        category: "tag" as CategoryKey,
        label: tag.name,
        color: tag.color,
        onRemove: () => setSelectedTagIds((prev) => prev.filter((x) => x !== id)),
      }];
    }),
    ...selectedCollectionIds.flatMap((id) => {
      const coll = allCollections.find((c) => c.id === id);
      if (!coll) return [];
      return [{
        category: "collection" as CategoryKey,
        label: coll.name,
        onRemove: () => setSelectedCollectionIds((prev) => prev.filter((x) => x !== id)),
      }];
    }),
  ];

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
    // Already on this design — just close the panel, nothing to replace.
    if (design.id === activeDesignId) {
      onClose();
      return;
    }
    if (isDirty) {
      setPendingDesign(design, onClose);
    } else {
      loadDesign(design);
      onClose();
    }
  }

  // -- Panel Open/Close
    useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  function handleAnimationEnd() {
    if (!isOpen) setIsVisible(false);
  }

  if (!isVisible) return null;

  // ── Shared select style
  const selectCls =
    "w-[150px] rounded-lg border border-neutral-200 bg-white px-2 py-2.5 text-sm text-neutral-700 outline-none transition-colors hover:border-neutral-400 focus:border-neutral-500 cursor-pointer";

  // -- Form Label styles
    const formLabel = "form-label text-xs text-neutral-500 uppercase font-semibold tracking-wide";
  return (
    <div 
      className={cn(
        "absolute inset-0 z-50 flex flex-col bg-white transition-all",
        isOpen ? "animate-slide-up" : "animate-slide-down"
      )} 
      onAnimationEnd={handleAnimationEnd}
      >

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex max-md:flex-col flex-1 overflow-hidden">

        {/* Sidebar — status filters */}
        <aside className="w-full md:w-[280px] lg:w-[350px] shrink-0 overflow-y-auto bg-neutral-100 py-6 lg:py-10 px-6">
          {/* Sidebar header */}
          <div className="flex items-center justify-between pb-8">
            <button
              onClick={onClose}
              className="flex items-center rounded px-4.5 py-3.5 text-sm font-semibold text-neutral-700 bg-neutral-300 hover:bg-neutral-200 transition-colors"
              aria-label="Close Saved Designs Screen"
              title="Close Saved Designs Screen"
            >
              <Inbox size={24} />
            </button>
              <img
                src={LOGO_SRC}
                alt={LOGO_ALT}
                className="header-logo w-48"
              />
          </div>

          <nav className="flex max-lg:flex-wrap lg:flex-col gap-3">
            {STATUS_FILTERS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setSelectedStatus(value)}
                className={cn(
                  "rounded-full px-4 py-2 lg:px-6 lg:py-3 text-left text-sm lg:text-base transition-all cursor-pointer pointer-events-auto",
                  selectedStatus === value
                    ? "bg-neutral-500 text-white"
                    : "text-neutral-700 bg-white hover:bg-amber-300",
                )}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Close Panel ────────────────────────────────────────────────────── */}
        <button
            onClick={onClose}
            className="max-md:ml-auto max-md:pt-2.5 max-md:pb-2.5 max-md:pr-6 md:absolute top-8 right-8 flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Return to builder <X size={16} />
        </button>

        {/* Main content */}
        <div className="flex flex-1 flex-col md:pt-14 overflow-scroll lg:overflow-hidden">
          <div className="designs-panel-header px-6 lg:px-10">
            <h2 className="text-xl font-semibold text-neutral-800 pb-3 lg:py-6">Saved designs</h2>

            {/* ── Filter bar ─────────────────────────────────────────────── */}
            <div className="shrink-0 border-b border-neutral-100 flex flex-col gap-1 lg:gap-4 pb-3">

              {/* Row 1: dropdowns · creator avatars · search */}
              <div className="flex flex-col lg:flex-wrap lg:flex-row lg:items-center gap-3 lg:gap-6">

                {/* Dropdowns */}
                <div className="flex flex-col gap-2">
                  <p className={formLabel}>Filter</p>

                  <div className="flex max-lg:flex-wrap items-center gap-2">
                    {/* Material */}
                    <select
                      value=""
                      onChange={(e) => addMaterial(e.target.value)}
                      className={selectCls}
                      aria-label="Filter Bracelets by Material"
                      name="Filter Bracelets by Material"
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
                      aria-label="Filter Bracelets by Type"
                      name="Filter Bracelets by Type"
                    >
                      <option value="">Type</option>
                      {allTypes.map((t) => (
                        <option key={t} value={t} disabled={selectedTypes.includes(t)}>
                          {t}
                        </option>
                      ))}
                    </select>

                    {/* Collection */}
                    <CollectionPicker
                      selectedIds={selectedCollectionIds}
                      onToggle={(c: Collection) =>
                        setSelectedCollectionIds((prev) =>
                          prev.includes(c.id)
                            ? prev.filter((id) => id !== c.id)
                            : [...prev, c.id],
                        )
                      }
                      showManage
                    />

                    {/* Custom Tags */}
                    <TagPicker
                      selectedIds={selectedTagIds}
                      onToggle={(tag: Tag) =>
                        setSelectedTagIds((prev) =>
                          prev.includes(tag.id)
                            ? prev.filter((id) => id !== tag.id)
                            : [...prev, tag.id],
                        )
                      }
                      showManage
                    />
                  </div>
                </div>

                {/* Creator avatar chips */}
                {allCreators.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className={formLabel}>By User</p>
                    <div className="flex items-center gap-1.5 lg:mx-auto">
                      {allCreators.map((creator, i) => {
                        const isActive = selectedCreators.includes(creator);
                        const colour   = AVATAR_COLOURS[i % AVATAR_COLOURS.length];
                        return (
                          <button
                            key={creator}
                            title={creator}
                            aria-label={`Filter bracelets by user ${creator}`}
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
                  </div>
                )}

                {/* Search */}
                <div className="lg:ml-auto max-lg:max-w-[300px] flex flex-col gap-2 min-w-[200px] shrink-0">
                  <p className={formLabel}>Search</p>
                  <div className="flex w-full items-center gap-0 rounded-lg border border-neutral-200 bg-white pr-3 focus-within:border-neutral-500 transition-colors">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Bracelet Name"
                      aria-label="Search by Bracelet Name"
                      name="Search by Bracelet Name"
                      className="w-48 flex-1 border-0 bg-transparent px-2 py-2.5 text-sm text-neutral-700 outline-none ring-0 placeholder:text-neutral-400"
                    />
                    <Search size={15} className="shrink-0 text-neutral-400" />
                  </div>
                </div>
              </div>

              {/* Row 2: active chips · sort */}
              <div className="flex items-center gap-2 min-h-[28px]">
                {/* Active filter chips */}
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {activeChips.map((chip) => {
                    const style = CATEGORY_STYLES[chip.category];
                    // Tag chips use their DB colour; all others use the Tailwind category colour.
                    const useInlineColor = chip.category === "tag" && chip.color;
                    return (
                      <span
                        key={`${chip.category}-${chip.label}`}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          useInlineColor ? "text-white" : `${style.bg} ${style.text}`,
                        )}
                        style={useInlineColor ? { backgroundColor: chip.color! } : undefined}
                      >
                        <span className="opacity-60">{style.label}:</span>
                        {chip.label}
                        <button
                          onClick={chip.onRemove}
                          className="ml-0.5 rounded-full opacity-70 hover:opacity-100 transition-opacity"
                          aria-label={`Remove ${chip.label} filter`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    );
                  })}
                </div>

                {/* Sort */}
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  <p className={cn(
                      formLabel,
                      "py-1"
                  )} >
                    Sort by:
                  </p>
                  <select
                    value={sortBy}
                    aria-label="Sort By Filter"
                    onChange={(e) => setSortBy(e.target.value as DesignSortOption)}
                    className="border-0 bg-transparent text-sm py-1 text-neutral-600 outline-none cursor-pointer hover:text-neutral-900"
                  >
                    {SORT_OPTIONS.map(({ label, value }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div> {/* End filter bar */}
          </div>

          {/* ── Card grid ──────────────────────────────────────────────── */}
          <div className="flex-1 lg:overflow-y-auto p-6 lg:px-10">
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {designs.map((design) => (
                  <DesignCard
                    key={design.id}
                    design={design}
                    onClick={() => handleCardClick(design)}
                    onDeleteRequest={(d) => setDesignToDelete(d)}
                    onDiscontinueRequest={(d) => setDesignToDiscontinue(d)}
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

      {designToDiscontinue && (
        <DiscontinueBraceletDialog
          designName={designToDiscontinue.name}
          isDiscontinuing={isDiscontinuing}
          onCancel={() => setDesignToDiscontinue(null)}
          onConfirm={() => {
            discontinueDesign(designToDiscontinue.id, {
              onSuccess: () => setDesignToDiscontinue(null),
            });
          }}
        />
      )}

    </div>
  );
}