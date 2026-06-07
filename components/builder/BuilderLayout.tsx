"use client";

import { useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { AlertCircle, ChevronsRight, Inbox, Loader2, Plus } from "lucide-react";

import { LOGO_SRC, LOGO_ALT } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Scene } from "@/components/scene/Scene";
import { Button } from "@/components/ui/Button";
import { PANEL_WIDTH } from "@/components/ui/Panel";

import { BraceletExporter } from "./canvas/BraceletExporter";
import { BandSelector } from "./canvas/BandSelector";
import { CanvasStatsBar } from "./canvas/CanvasStatsBar";
import { CanvasToolbar } from "./canvas/CanvasToolbar";
import { EditModeToolbar } from "./canvas/EditModeToolbar";
import { CanvasWorkflowBar } from "./canvas/CanvasWorkflowBar";

import { ConfirmReplaceDialog } from "./dialogs/ConfirmReplaceDialog";
import { BraceletDetailsDialog } from "./dialogs/BraceletDetailsDialog";
import { BeadInfoDialog } from "./dialogs/BeadInfoDialog";

import { BeadSelectorPanel } from "./panels/BeadSelectorPanel";
import { CommentsPanel } from "./panels/CommentsPanel";

import { SavedDesignsScreen } from "./saved-designs/SavedDesignsScreen";

import { UserScreen } from "./users/UserScreen";
import { UsersAdminScreen } from "./users/UsersAdminScreen";

import { getInitials } from "@/lib/utils";

import { useStore } from "@/lib/store";
import { useBeads } from "@/hooks/useBeads";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDesign } from "@/hooks/useDesign";
import { useDesigns } from "@/hooks/useDesigns";
import { usePermissions } from "@/hooks/usePermissions";

/** Matches the default name assigned to every new bracelet. */
const DEFAULT_BRACELET_NAME = "New Bracelet";

export function BuilderLayout() {
  const {
    placedBeads,
    braceletName,
    braceletDescription,
    clearSelectedBead,
    selectedBead,
    dragFromPanel,
    resetBracelet,
    setPendingDesign,
    activeDesignId,
    isDirty,
  } = useStore((s) => ({
    placedBeads:          s.beads,
    braceletName:         s.braceletName,
    braceletDescription:  s.braceletDescription,
    clearSelectedBead:    s.clearSelectedBead,
    selectedBead:         s.selectedBead,
    dragFromPanel:        s.dragFromPanel,
    resetBracelet:        s.resetBracelet,
    setPendingDesign:     s.setPendingDesign,
    activeDesignId:       s.activeDesignId,
    isDirty:              s.isDirty,
  }));

  const { data: beads = [], isLoading: beadsLoading, isError: beadsError, refetch: refetchBeads } = useBeads();
  const { data: currentUser } = useCurrentUser();
  const { canEdit } = usePermissions();
  const { data: savedDesign } = useDesign(activeDesignId);
  const isLocked = savedDesign?.status === "approved" || savedDesign?.status === "published";

  // ── Notification badge ────────────────────────────────────────────────────
  const perms = currentUser?.permissions;
  const { data: inReviewAll = [] } = useDesigns({ status: "in_review", refetchInterval: 60_000 });
  const { data: approvedAll  = [] } = useDesigns({ status: "approved",  refetchInterval: 60_000 });
  const notificationCount =
    ((perms?.is_reviewer || perms?.is_admin) ? inReviewAll.length : 0) +
    ((perms?.is_publisher || perms?.is_admin) ? approvedAll.length  : 0);

  const [braceletPanelOpen,   setBraceletPanelOpen]   = useState(false);
  const [savedDesignsOpen,    setSavedDesignsOpen]    = useState(false);
  const [braceletDetailsOpen, setBraceletDetailsOpen] = useState(false);
  const [rightPanel,          setRightPanel]          = useState<"user" | "comments" | null>(null);
  const [usersAdminOpen,      setUsersAdminOpen]      = useState(false);

  // ── Name-required highlight ───────────────────────────────────────────────
  // Activated by BraceletExporter when the user tries to save without a name.
  // Auto-clears once the bracelet name is changed from the default.
  const [highlightReason, setHighlightReason] = useState<"name" | "sku" | null>(null);

  useEffect(() => {
    const trimmed = braceletName.trim();
    if (highlightReason !== "name") return;
    if (trimmed !== "" && trimmed !== DEFAULT_BRACELET_NAME) {
      setHighlightReason(null);
    }
  }, [braceletName]);

  // Auto-clear the SKU highlight once a SKU is saved on the active design
  useEffect(() => {
    if (highlightReason !== "sku") return;
    if (savedDesign?.shopify_sku?.trim()) {
      setHighlightReason(null);
    }
  }, [savedDesign?.shopify_sku, highlightReason]);

  const rightPanelOpen = rightPanel !== null;
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!dragFromPanel) return;
    document.body.style.cursor = "grabbing";
    const onMove = (e: PointerEvent) => setGhostPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.body.style.cursor = "";
    };
  }, [!!dragFromPanel]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!canEdit || isLocked) setBraceletPanelOpen(false);
  }, [canEdit, isLocked]);

  useEffect(() => {
    beads.forEach((b) => useGLTF.preload(b.glb_path));
  }, [beads]);

  function openBraceletPanel() {
    setBraceletPanelOpen((o) => !o);
  }

  function handleNewBracelet() {
    if (isDirty) {
      setPendingDesign({ id: -1, name: DEFAULT_BRACELET_NAME } as any, () => resetBracelet());
    } else {
      resetBracelet();
    }
  }

  function handleDetailsClick() {
    setBraceletDetailsOpen(true);
    setHighlightReason(null);
  }

  return (
    <div className="flex h-screen flex-col min-h-[500px] overflow-hidden">

      {/* Header */}
      <header className="flex shrink-0 items-center gap-4 py-4 border-b border-neutral-200 bg-white px-6">
        <div className="flex flex-1 items-center gap-4">
          <button
            onClick={() => setSavedDesignsOpen(true)}
            className="flex items-center rounded border border-neutral-300 bg-white px-4.5 py-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Saved Designs"
            title="View All Saved Designs"
          >
            <Inbox size={24} />
          </button>
          <img
            src={LOGO_SRC}
            alt={LOGO_ALT}
            className="header-logo w-48"
          />
        </div>

        <span className="flex flex-1 items-center justify-end gap-2 font-semibold tracking-wide text-neutral-700">
          <Button onClick={handleNewBracelet}>
            <Plus size={14} />
            New Bracelet
          </Button>
          <BraceletExporter onNameRequired={() => setHighlightReason("name")} />
          {/* Profile icon + notification badge */}
          <div className="relative ml-2 shrink-0">
            <button
              onClick={() => setRightPanel("user")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white transition-colors"
              style={{ backgroundColor: "#7F7F7F" }}
              aria-label="Open user profile"
            >
              {currentUser ? getInitials(currentUser.name) : "?"}
            </button>
            {notificationCount > 0 && (
              <span className="pointer-events-none absolute -right-1 -top-1 flex min-w-[1.1rem] h-[1.1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </div>
        </span>
      </header>

      {/* Scene */}
      <main id="bracelet-scene" className="relative flex-1 overflow-hidden">

        <BeadSelectorPanel
          isOpen={braceletPanelOpen}
          onClose={() => setBraceletPanelOpen(false)}
          beads={beads}
        />

        <BeadInfoDialog />

        <UserScreen
          open={rightPanel === "user"}
          onClose={() => setRightPanel(null)}
          onEditUsers={() => { setRightPanel(null); setUsersAdminOpen(true); }}
        />
        <CommentsPanel open={rightPanel === "comments"} onClose={() => setRightPanel(null)} />

        {/* Clip container */}
        <div
          className="absolute flex flex-col top-0 bottom-0 overflow-hidden"
          style={{
            left:  braceletPanelOpen ? PANEL_WIDTH : 0,
            right: rightPanelOpen    ? PANEL_WIDTH : 0,
            transition: "left 300ms ease-out, right 300ms ease-out",
          }}
        >
          {canEdit && !isLocked && (
            <button
              onClick={openBraceletPanel}
              className={`bracelet-panel-toggle-btn absolute left-0 top-0 bottom-0 z-40 my-auto h-fit
              rounded-br-lg rounded-tr-lg bg-neutral-700 text-white
              px-1 py-2
              transition-all
              hover:bg-neutral-600 hover:pl-2
              ${braceletPanelOpen ? "open" : ""}`}
              title={braceletPanelOpen ? "Close Bead Selector Panel" : "Open Bead Selector Panel"}
              aria-label={braceletPanelOpen ? "Close Bead Selector Panel" : "Open Bead Selector Panel"}
            >
              <ChevronsRight size={25} />
            </button>
          )}

          <CanvasToolbar
            commentsOpen={rightPanel === "comments"}
            onCommentsClick={() => setRightPanel((p) => p === "comments" ? null : "comments")}
            onPublishBlocked={() => setHighlightReason("sku")}
          />

          <div className="inner-canvas relative flex-1">

            {/* Bracelet info overlay */}
            <div className="absolute left-2 lg:left-4 top-2 z-20 flex flex-col gap-0.5">
              <CanvasWorkflowBar />
              {savedDesign?.status === "rejected" && savedDesign?.rejection_reason && (
                <p className="max-w-[240px] px-2 py-0.5 text-xs leading-relaxed text-rose-600 italic">
                  &ldquo;{savedDesign.rejection_reason}&rdquo;
                </p>
              )}
              <p className="px-2 py-1.5 font-semibold text-neutral-700 leading-snug">
                <span className="text-neutral-500 font-display">Bracelet Name:</span> {braceletName}
              </p>

              {/* "view bracelet details" — highlights when a name is required */}
              <button
                onClick={handleDetailsClick}
                className={cn(
                  "text-left text-xs w-fit rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-600",
                  highlightReason !== null
                    ? "px-2.5 py-1 bg-amber-100 text-amber-700 font-semibold border border-amber-300 animate-pulse"
                    : "px-2 underline hover:no-underline text-neutral-500",
                )}
              >
                {highlightReason === "name" ? "Set a bracelet name →" : highlightReason === "sku" ? "Add a Shopify SKU →" : "view bracelet details"}
              </button>
            </div>

            <CanvasStatsBar />

            {/* Edit mode action toolbar */}
            <div className="absolute right-4 lg:right-6 top-4 z-20 pointer-events-none shadow-sm rounded-lg">
              <EditModeToolbar />
            </div>

            {canEdit && !isLocked && (
              <BandSelector panelOpen={braceletPanelOpen} />
            )}

            {beadsLoading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-neutral-50/70 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-3 text-neutral-500">
                  <Loader2 size={28} className="animate-spin" />
                  <span className="text-sm font-medium">Loading beads…</span>
                </div>
              </div>
            )}

            {beadsError && !beadsLoading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-neutral-50/70 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-3">
                  <AlertCircle size={28} className="text-red-400" />
                  <p className="text-sm font-medium text-neutral-700">Failed to load bead catalog.</p>
                  <button
                    onClick={() => refetchBeads()}
                    className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            <div
              className="absolute top-0 bottom-0"
              style={{
                left:  braceletPanelOpen ? -PANEL_WIDTH : 0,
                right: rightPanelOpen    ? -PANEL_WIDTH : 0,
                transition: "left 300ms ease-out, right 300ms ease-out",
              }}
            >
              <Scene panelOpen={braceletPanelOpen} rightPanelOpen={rightPanelOpen} />
            </div>
          </div>
        </div>
      </main>

      <SavedDesignsScreen
        isOpen={savedDesignsOpen}
        onClose={() => setSavedDesignsOpen(false)}
      />

      <UsersAdminScreen
        isOpen={usersAdminOpen}
        onClose={() => setUsersAdminOpen(false)}
      />

      <ConfirmReplaceDialog />

      <BraceletDetailsDialog
        open={braceletDetailsOpen}
        onClose={() => setBraceletDetailsOpen(false)}
      />

      {dragFromPanel && (
        <div
          style={{
            position: "fixed",
            left: ghostPos.x + 12,
            top:  ghostPos.y + 12,
            pointerEvents: "none",
            zIndex: 9999,
          }}
          className="rounded-lg border border-neutral-300 bg-white shadow-lg px-2 py-1 text-xs text-neutral-800 flex items-center gap-1.5"
        >
          <span className="text-neutral-400">＋</span>
          {dragFromPanel.bead_type ?? dragFromPanel.name}
        </div>
      )}

    </div>
  );
}