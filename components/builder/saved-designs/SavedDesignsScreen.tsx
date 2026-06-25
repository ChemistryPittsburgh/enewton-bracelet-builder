"use client";

import { useMemo, useState, useEffect } from "react";
import { AlertCircle, Search, X, Inbox } from "lucide-react";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { LOGO_SRC, LOGO_ALT } from "@/lib/constants";
import { CATEGORY_STYLES, type CategoryKey } from "@/lib/category-colors";

import { useDesigns, type DesignSortOption } from "@/hooks/useDesigns";
import { useBeads } from "@/hooks/useBeads";
import { useLoadDesign } from "@/hooks/useLoadDesign";
import { useLockDesign } from "@/hooks/useLockDesign";
import { useDeleteDesign } from "@/hooks/useDeleteDesign";
import { useDiscontinueDesign, useSubmitDesign, useApproveDesign, useRejectDesign } from "@/hooks/useWorkflow";
import { useTags } from "@/hooks/useTags";
import { useCollections } from "@/hooks/useCollections";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermissions } from "@/hooks/usePermissions";

import type { Bracelet, BraceletStatus, Collection, Tag, DesignLock } from "@/types";

import { DesignCard } from "./../cards/DesignCard";
import { PatternsGrid } from "./PatternsGrid";
import { TagPicker, CollectionPicker } from "./Pickers";
import { DeleteBraceletDialog } from "@/components/builder/dialogs/DeleteBraceletDialog";
import { DiscontinueBraceletDialog } from "@/components/builder/dialogs/DiscontinueBraceletDialog";
import { DesignLockedDialog } from "@/components/builder/dialogs/DesignLockedDialog";
import { RejectBraceletDialog } from "@/components/builder/dialogs/RejectBraceletDialog";
import { Tooltip } from "@/components/ui/Tooltip";

interface SavedDesignsScreenProps {
  isOpen: boolean;
  onClose: () => void;
  /** Which sidebar tab to open on. Defaults to the designs list. */
  initialView?: "designs" | "patterns";
  /** True when the current user was kicked from the active design — clicking
   *  the same design card should clear the kicked state (allow re-acquisition). */
  isKickedFromActiveDesign?: boolean;
  onRetryLock?: () => void;
  /** Opens the Bracelet Details dialog (mounted in BuilderLayout) once a design
   *  has been loaded — used by the card's "Open bracelet details" action. */
  onOpenDetails?: () => void;
}

const STATUS_FILTERS: { label: string; value: BraceletStatus | undefined }[] = [
  { label: "All",         value: undefined   },
  { label: "In-progress", value: "draft"     },
  { label: "In-review",   value: "in_review" },
  { label: "Approved",    value: "approved"  },
  { label: "Published",   value: "published" },
];

const SORT_OPTIONS: { label: string; value: DesignSortOption }[] = [
  { label: "Newest first", value: "newest"   },
  { label: "Oldest first", value: "oldest"   },
  { label: "Name A–Z",     value: "name_asc" },
  { label: "Name Z–A",     value: "name_desc"},
];

type BraceletState = "all" | "active" | "inactive";

const BRACELET_STATE_OPTIONS: { label: string; value: BraceletState }[] = [
  { label: "All",      value: "all"      },
  { label: "Active",   value: "active"   },
  { label: "Inactive", value: "inactive" },
];

export function SavedDesignsScreen({ isOpen, onClose, initialView = "designs", isKickedFromActiveDesign, onRetryLock, onOpenDetails }: SavedDesignsScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  // ── Filters ────────────────────────────────────────────────────────────────
  type SidebarView = BraceletStatus | undefined | "patterns";
  const [sidebarView,           setSidebarView]           = useState<SidebarView>(undefined);
  const selectedStatus = sidebarView === "patterns" ? undefined : sidebarView;
  const showPatterns   = sidebarView === "patterns";
  const [braceletState,         setBraceletState]         = useState<BraceletState>("all");
  const [selectedMaterials,     setSelectedMaterials]     = useState<string[]>([]);
  const [selectedTypes,         setSelectedTypes]         = useState<string[]>([]);
  const [selectedTagIds,        setSelectedTagIds]        = useState<number[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  const [sortBy,                setSortBy]                = useState<DesignSortOption>("newest");
  const [search,                setSearch]                = useState("");

  // ── Dialogs ────────────────────────────────────────────────────────────────
  const [designToDelete,      setDesignToDelete]      = useState<Bracelet | null>(null);
  const [deleteError,         setDeleteError]         = useState<string | null>(null);
  const [designToDiscontinue, setDesignToDiscontinue] = useState<Bracelet | null>(null);
  const [lockedDesign,   setLockedDesign]   = useState<{ design: Bracelet; lock: DesignLock } | null>(null);
  const [isTakingOver,   setIsTakingOver]   = useState(false);
  const [takeOverError,  setTakeOverError]  = useState<string | null>(null);
  const [designToReject, setDesignToReject] = useState<Bracelet | null>(null);

  const { mutate: deleteDesign,      isPending: isDeleting      } = useDeleteDesign();
  const { mutate: discontinueDesign, isPending: isDiscontinuing } = useDiscontinueDesign();
  const { mutate: submitDesign     } = useSubmitDesign();
  const { mutate: approveDesign    } = useApproveDesign();
  const { mutate: rejectDesign,      isPending: isRejecting     } = useRejectDesign();
  const { mutateAsync: lockDesign } = useLockDesign();

  // ── Data ───────────────────────────────────────────────────────────────────
  // Raw unfiltered list — drives option derivation only
  const { data: allDesigns = [] } = useDesigns({ enabled: isVisible });

  // Filtered + sorted list — drives the card grid
  // NOTE: useDesigns needs to accept a `discontinued` param:
  //   undefined → no filter, false → active only, true → inactive only
  const discontinued =
    braceletState === "inactive" ? true :
    braceletState === "active"   ? false :
    undefined;

  const { data: designs = [], isLoading, isError, refetch } = useDesigns({
    status:          selectedStatus,
    search,
    materials:       selectedMaterials,
    types:           selectedTypes,
    tagIds:          selectedTagIds,
    collectionIds:   selectedCollectionIds,
    sortBy,
    discontinued,
    enabled:         isVisible,
    refetchInterval: isVisible ? 15_000 : false,
  });

  // Prefetch bead catalog so it's in cache when loadDesign resolves product_ids.
  useBeads();
  const { loadDesign }   = useLoadDesign();
  const beads            = useStore((s) => s.beads);
  const activeDesignId   = useStore((s) => s.activeDesignId);
  const isDirty          = useStore((s) => s.isDirty);
  const setPendingDesign = useStore((s) => s.setPendingDesign);

  const { data: currentUser } = useCurrentUser();
  const { isAdmin } = usePermissions();

  const { data: allTags        = [] } = useTags({ enabled: isVisible });
  const { data: allCollections = [] } = useCollections({ enabled: isVisible });

  // ── Derived option lists (unfiltered dataset) ──────────────────────────────
  const allMaterials = useMemo(
    () => [...new Set(allDesigns.flatMap((d) => d.material_tags).filter((v): v is string => !!v))].sort(),
    [allDesigns],
  );
  const allTypes = useMemo(
    () => [...new Set(allDesigns.flatMap((d) => d.bead_types).filter((v): v is string => !!v))].sort(),
    [allDesigns],
  );

  // ── Active chips ───────────────────────────────────────────────────────────
  interface ActiveChip {
    category: CategoryKey;
    label:    string;
    color?:   string | null;
    onRemove: () => void;
  }

  const activeChips: ActiveChip[] = [
    ...selectedMaterials.map((m) => ({
      category: "material" as CategoryKey,
      label:    m,
      onRemove: () => setSelectedMaterials((prev) => prev.filter((x) => x !== m)),
    })),
    ...selectedTypes.map((t) => ({
      category: "type" as CategoryKey,
      label:    t,
      onRemove: () => setSelectedTypes((prev) => prev.filter((x) => x !== t)),
    })),
    ...selectedTagIds.flatMap((id) => {
      const tag = allTags.find((t) => t.id === id);
      if (!tag) return [];
      return [{
        category: "tag" as CategoryKey,
        label:    tag.name,
        color:    tag.color,
        onRemove: () => setSelectedTagIds((prev) => prev.filter((x) => x !== id)),
      }];
    }),
    ...selectedCollectionIds.flatMap((id) => {
      const coll = allCollections.find((c) => c.id === id);
      if (!coll) return [];
      return [{
        category: "collection" as CategoryKey,
        label:    coll.name,
        onRemove: () => setSelectedCollectionIds((prev) => prev.filter((x) => x !== id)),
      }];
    }),
  ];

  // ── Dropdown helpers ───────────────────────────────────────────────────────
  function addMaterial(value: string) {
    if (!value || selectedMaterials.includes(value)) return;
    setSelectedMaterials((prev) => [...prev, value]);
  }
  function addType(value: string) {
    if (!value || selectedTypes.includes(value)) return;
    setSelectedTypes((prev) => [...prev, value]);
  }

  // ── Load handler ───────────────────────────────────────────────────────────
  async function proceedWithLoad(design: Bracelet, lockAlreadyAcquired = false) {
    // Also prompt when beads exist on an unsaved bracelet (activeDesignId === null)
    // even if isDirty is false — beads restore from localStorage on refresh but
    // the dirty flag resets, so isDirty alone would silently discard them.
    const hasUnsavedWork = isDirty || (beads.length > 0 && activeDesignId === null);
    if (hasUnsavedWork) {
      setPendingDesign(design, onClose);
      return;
    }
    const success = await loadDesign(design, lockAlreadyAcquired);
    if (success) onClose();
  }

  async function handleCopyDesign(design: Bracelet) {
    // Load the chosen design, then fork it into a fresh unsaved draft (same
    // beads/band, new identity) so the next Save creates a separate bracelet.
    // Mirrors proceedWithLoad's unsaved-work guard: when work is pending the
    // confirm dialog loads the design first, then runs this callback to fork it.
    const forkAfterLoad = () => { useStore.getState().copyBracelet(); onClose(); };
    const hasUnsavedWork = isDirty || (beads.length > 0 && activeDesignId === null);
    if (hasUnsavedWork) {
      setPendingDesign(design, forkAfterLoad);
      return;
    }
    const success = await loadDesign(design);
    if (success) forkAfterLoad();
  }

  async function handleShowDetails(design: Bracelet) {
    // The Bracelet Details dialog is store-bound to the active design, so load
    // the chosen design first, then open the dialog (via BuilderLayout) and close
    // this screen. If it's already the active design, skip straight to opening.
    const openDetails = () => { onOpenDetails?.(); onClose(); };
    if (design.id === activeDesignId) { openDetails(); return; }
    const hasUnsavedWork = isDirty || (beads.length > 0 && activeDesignId === null);
    if (hasUnsavedWork) {
      setPendingDesign(design, openDetails);
      return;
    }
    const success = await loadDesign(design);
    if (success) openDetails();
  }

  async function handleCardClick(design: Bracelet) {
    // Check lock before the activeDesignId short-circuit — someone else may
    // have taken the lock on a design you currently have open.
    const lockedByOther =
      design.status !== "published" &&
      design.active_lock != null &&
      design.active_lock.user_id !== currentUser?.id;

    if (lockedByOther) {
      setLockedDesign({ design, lock: design.active_lock! });
      return;
    }

    if (design.id === activeDesignId) {
      // If the user was kicked, clicking their own design re-enables lock acquisition.
      if (isKickedFromActiveDesign) onRetryLock?.();
      onClose();
      return;
    }

    await proceedWithLoad(design);
  }

  async function handleTakeOver(design: Bracelet) {
    setIsTakingOver(true);
    setTakeOverError(null);
    try {
      const result = await lockDesign({ id: design.id, force: true });
      if (!result.acquired) {
        setTakeOverError("Could not take over this design. Please try again.");
        return;
      }
      if (isDirty) {
        // Canvas has unsaved changes — confirm before replacing. The force lock
        // is already held so the subsequent loadDesign call will succeed.
        setLockedDesign(null);
        setPendingDesign(design, onClose);
        return;
      }
      const success = await loadDesign(design, true);
      if (success) {
        setLockedDesign(null);
        onClose();
      } else {
        setTakeOverError("Failed to load the design. Please try again.");
      }
    } finally {
      setIsTakingOver(false);
    }
  }

  // ── Panel visibility ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setSidebarView(initialView === "patterns" ? "patterns" : undefined);
    }
  }, [isOpen, initialView]);
  function handleAnimationEnd() { if (!isOpen) setIsVisible(false); }
  if (!isVisible) return null;

  // ── Shared styles ──────────────────────────────────────────────────────────
  const selectCls =
    "w-[150px] rounded-[2px] border border-default bg-white px-2 py-2.5 text-sm   outline-none transition-colors hover:border-neutral-400 focus:border-neutral-500 cursor-pointer";
  const formLabel =
    "form-label text-xs text-color-base/70 uppercase font-semibold tracking-wide";

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex flex-col bg-white transition-all",
        isOpen ? "animate-slide-up" : "animate-slide-down",
      )}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="flex max-md:flex-col flex-1 overflow-hidden">

        {/* ── Sidebar — status filters ───────────────────────────────────── */}
        <aside className="w-full md:w-[280px] lg:w-[350px] shrink-0 overflow-y-auto bg-light-grey/80 py-6 xl:py-10 px-6">
          <div className="flex items-center justify-between pb-8">
            <Tooltip content="Close Saved Designs" placement="bottom-end">
              <button
                onClick={onClose}
                className="flex items-center rounded-[2px] px-4.5 py-3.5 text-sm font-semibold border border-default bg-white hover:bg-mint hover:border-black transition-colors"
                aria-label="Close Saved Designs Screen"
              >
                <Inbox size={24} />
              </button>
            </Tooltip>
            <img src={LOGO_SRC} alt={LOGO_ALT} className="header-logo w-48" />
          </div>

          <nav className="flex max-lg:flex-wrap lg:flex-col gap-3">
            <p className={cn(formLabel, "max-lg:w-full")}>Status</p>
            {STATUS_FILTERS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => { setSidebarView(value); setBraceletState("all"); }}
                className={cn(
                  "rounded-[3px] border border-navy px-4 py-2 lg:px-4 lg:py-3 text-left text-sm lg:text-[16px] transition-all cursor-pointer",
                  sidebarView === value
                    ? "bg-navy text-white"
                    : "bg-white hover:bg-mint",
                )}
              >
                {label}
              </button>
            ))}
            <p className={cn(formLabel, "max-lg:w-full lg:mt-3")}>Tools</p>
            <button
              onClick={() => { setSidebarView("patterns"); setBraceletState("all"); }}
              className={cn(
                "rounded-[3px] border border-navy px-4 py-2 lg:px-4 lg:py-3 text-left text-sm lg:text-[16px] transition-all cursor-pointer",
                showPatterns ? "bg-navy text-white" : "bg-white hover:bg-mint",
              )}
            >
              Patterns
            </button>
          </nav>
        </aside>

        {/* ── Close button ──────────────────────────────────────────────── */}
        <button
          onClick={onClose}
          className="max-md:ml-auto max-md:pt-2.5 max-md:pb-2.5 max-md:pr-6 md:absolute top-8 right-8 flex items-center gap-2 text-sm font-semibold text-color-base/70 hover:text-neutral-900 transition-colors"
        >
          Return to builder <X size={16} />
        </button>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col md:pt-14 overflow-scroll lg:overflow-hidden">

          {showPatterns ? (
            /* ── Patterns view ──────────────────────────────────────── */
            <PatternsGrid onClose={onClose} />
          ) : (
            /* ── Designs view ───────────────────────────────────────── */
            <>
              <div className="designs-panel-header px-6 xl:px-10 border-b border-default">
                <h2 className="text-xl pb-3 xl:py-6">Saved designs</h2>

                {/* Filter bar */}
                <div className="shrink-0 flex flex-col gap-1 lg:gap-4 pb-3">

                  {/* Row 1: dropdowns · bracelet state · search */}
                  <div className="flex flex-col lg:flex-wrap lg:flex-row lg:items-center gap-3 lg:gap-6">

                    {/* Dropdowns */}
                    <div className="flex flex-col gap-2">
                      <p className={formLabel}>Filter</p>
                      <div className="flex max-lg:flex-wrap items-center gap-2">
                        <select
                          value=""
                          onChange={(e) => addMaterial(e.target.value)}
                          className={selectCls}
                          aria-label="Filter Bracelets by Material"
                        >
                          <option value="">{selectedMaterials.length > 0 ? `Material (${selectedMaterials.length})` : "Material"}</option>
                          {allMaterials.map((m) => (
                            <option key={m} value={m} disabled={selectedMaterials.includes(m)}>
                              {m ? m.charAt(0).toUpperCase() + m.slice(1) : m}
                            </option>
                          ))}
                        </select>

                        <select
                          value=""
                          onChange={(e) => addType(e.target.value)}
                          className={selectCls}
                          aria-label="Filter Bracelets by Type"
                        >
                          <option value="">{selectedTypes.length > 0 ? `Type (${selectedTypes.length})` : "Type"}</option>
                          {allTypes.map((t) => (
                            <option key={t} value={t} disabled={selectedTypes.includes(t)}>
                              {t}
                            </option>
                          ))}
                        </select>

                        <CollectionPicker
                          selectedIds={selectedCollectionIds}
                          onToggle={(c: Collection) =>
                            setSelectedCollectionIds((prev) =>
                              prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                            )
                          }
                          showManage
                        />

                        <TagPicker
                          selectedIds={selectedTagIds}
                          onToggle={(tag: Tag) =>
                            setSelectedTagIds((prev) =>
                              prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
                            )
                          }
                          showManage
                        />
                      </div>
                    </div>

                    {/* Bracelet State segmented control */}
                    {selectedStatus !== "draft" && selectedStatus !== "in_review" && selectedStatus !== "approved" && (
                      <div className="flex flex-col gap-2">
                        <p className={formLabel}>Bracelet State</p>
                        <div className="flex rounded-[2px] border border-default bg-white overflow-hidden w-fit">
                          {BRACELET_STATE_OPTIONS.map(({ label, value }) => (
                            <button
                              key={value}
                              onClick={() => setBraceletState(value)}
                              className={cn(
                                "px-4 py-2 text-sm font-semibold transition-all",
                                braceletState === value
                                  ? "bg-navy text-white"
                                  : "text-color-base hover:bg-mint",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Search */}
                    <div className="lg:ml-auto max-lg:max-w-[300px] flex flex-col gap-2 min-w-[200px] shrink-0">
                      <p className={formLabel}>Search</p>
                      <div className="flex w-full items-center gap-0 rounded-[2px] border border-default bg-white pr-3 focus-within:border-navy transition-colors">
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Bracelet Name"
                          aria-label="Search by Bracelet Name"
                          className="w-48 flex-1 border-0 bg-transparent px-2 py-2.5 text-sm   outline-none ring-0 placeholder:text-color-base/70"
                        />
                        <Search size={15} className="shrink-0 text-color-base/70" />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: active chips · sort */}
                  <div className="flex items-center gap-2 min-h-[28px]">
                    <div className="flex flex-1 flex-wrap items-center gap-1.5">
                      {activeChips.map((chip) => {
                        const style = CATEGORY_STYLES[chip.category];
                        const useInlineColor = chip.category === "tag" && chip.color;
                        return (
                          <span
                            key={`${chip.category}-${chip.label}`}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-[2px] border border-navy px-2.5 py-1 text-xs font-medium",
                              useInlineColor ? "text-navy" : `${style.bg}`,
                            )}
                            style={useInlineColor ? { backgroundColor: chip.color! } : undefined}
                          >
                            <span className="opacity-40">{style.label}:</span>
                            {chip.label}
                            <Tooltip content={`Remove filter ${chip.label}`}>
                              <button
                                onClick={chip.onRemove}
                                className="ml-0.5 rounded-full opacity-70 hover:opacity-100 transition-opacity"
                                aria-label={`Remove ${chip.label} filter`}
                              >
                                <X size={11} />
                              </button>
                            </Tooltip>
                          </span>
                        );
                      })}
                    </div>

                    <div className="ml-auto flex shrink-0 items-center gap-1.5">
                      <p className={cn(formLabel, "py-1")}>Sort by:</p>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as DesignSortOption)}
                        className="border-0 bg-transparent text-sm py-1 text-color-base/70 focus:ring-navy outline-none cursor-pointer hover:text-neutral-900"
                      >
                        {SORT_OPTIONS.map(({ label, value }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Card grid ───────────────────────────────────────── */}
              <div className="flex-1 lg:overflow-y-auto p-6 xl:px-10">
                {isLoading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex flex-col rounded-lg border border-default overflow-hidden">
                        <div className="aspect-square w-full bg-light-grey/80 animate-pulse" />
                        <div className="px-3 py-2.5 flex flex-col gap-1.5">
                          <div className="h-3.5 w-3/4 rounded bg-light-grey/80 animate-pulse" />
                          <div className="h-3 w-1/2 rounded bg-light-grey/80 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isError && (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <AlertCircle size={24} className="text-color-base/70" />
                    <p className="text-sm text-color-base/70">Failed to load designs.</p>
                    <button
                      onClick={() => refetch()}
                      className="text-sm font-medium   underline hover:text-neutral-900"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {!isLoading && !isError && designs.length === 0 && (
                  <p className="text-sm text-color-base/70 py-8 text-center">No designs found.</p>
                )}

                {!isLoading && !isError && designs.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {designs.map((design) => (
                      <DesignCard
                        key={design.id}
                        design={design}
                        onClick={() => handleCardClick(design)}
                        onDeleteRequest={(d) => { setDeleteError(null); setDesignToDelete(d); }}
                        onDiscontinueRequest={(d) => setDesignToDiscontinue(d)}
                        onSubmitForReview={(d) => submitDesign(d.id)}
                        onApprove={(d) => approveDesign(d.id)}
                        onRejectRequest={(d) => setDesignToReject(d)}
                        onCopyRequest={(d) => handleCopyDesign(d)}
                        onDetailsRequest={(d) => handleShowDetails(d)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {designToDelete && (
        <DeleteBraceletDialog
          designName={designToDelete.name}
          isDeleting={isDeleting}
          error={deleteError}
          onCancel={() => { setDeleteError(null); setDesignToDelete(null); }}
          onConfirm={() => {
            setDeleteError(null);
            deleteDesign(designToDelete.id, {
              onSuccess: () => { setDeleteError(null); setDesignToDelete(null); },
              onError: (err) => {
                setDeleteError(
                  err instanceof Error ? err.message : "This bracelet cannot be deleted.",
                );
              },
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

      {lockedDesign && (
        <DesignLockedDialog
          lock={lockedDesign.lock}
          onClose={() => { setLockedDesign(null); setTakeOverError(null); }}
          onTakeOver={isAdmin ? () => handleTakeOver(lockedDesign.design) : undefined}
          isTakingOver={isTakingOver}
          error={takeOverError ?? undefined}
        />
      )}

      {designToReject && (
        <RejectBraceletDialog
          designName={designToReject.name}
          isRejecting={isRejecting}
          onCancel={() => setDesignToReject(null)}
          onConfirm={(reason) => {
            rejectDesign(
              { id: designToReject.id, reason },
              { onSuccess: () => setDesignToReject(null) },
            );
          }}
        />
      )}
    </div>
  );
}