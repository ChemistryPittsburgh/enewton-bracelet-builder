"use client";

import { useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { AlertCircle, Check, ChevronsRight, Inbox, Loader2, Plus } from "lucide-react";

import { Scene } from "@/components/scene/Scene";
import { Button } from "@/components/ui/Button";
import { PANEL_WIDTH } from "@/components/ui/Panel";

import { BraceletExporter } from "./BraceletExporter";
import { ConfirmReplaceDialog } from "./ConfirmReplaceDialog";
import { BraceletDetailsDialog } from "./BraceletDetailsDialog";
import { CanvasWorkflowBar } from "./CanvasWorkflowBar";

import { BeadSelectorPanel } from "./BeadSelectorPanel";
import { SavedDesignsPanel } from "./SavedDesignsPanel";
import { UserPanel } from "./UserPanel";
import { UsersAdminPanel } from "./UsersAdminPanel";
import { getInitials } from "@/lib/utils";

import { BeadInfoDialog } from "./BeadInfoDialog";
import { BandSelector } from "./BandSelector";

import { CanvasStatsBar } from "./CanvasStatsBar";
import { CanvasToolbar } from "./CanvasToolbar";
import { EditModeToolbar } from "./EditModeToolbar";
import { CommentsPanel } from "./CommentsPanel";

import { useStore } from "@/lib/store";
import { useBeads } from "@/hooks/useBeads";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDesigns } from "@/hooks/useDesigns";

export function BuilderLayout() {
  const {
    placedBeads,
    braceletName,
    setBraceletName,
    braceletDescription,
    setBraceletDescription,
    clearSelectedBead,
    selectedBead,
    dragFromPanel,
    resetBracelet,
    setPendingDesign,
  } = useStore((s) => ({
    placedBeads: s.beads,
    braceletName: s.braceletName,
    setBraceletName: s.setBraceletName,
    braceletDescription: s.braceletDescription,
    setBraceletDescription: s.setBraceletDescription,
    clearSelectedBead: s.clearSelectedBead,
    selectedBead: s.selectedBead,
    dragFromPanel: s.dragFromPanel,
    resetBracelet: s.resetBracelet,
    setPendingDesign: s.setPendingDesign,
  }));

  const { data: beads = [], isLoading: beadsLoading, isError: beadsError, refetch: refetchBeads } = useBeads();
  const { data: currentUser } = useCurrentUser();

  // ── Notification badge (header) ───────────────────────────────────────────
  // Poll every 60 s so the badge stays fresh while the app is open.
  // When the UserPanel is also open it polls at 30 s; React Query uses the
  // shorter of all active intervals so no duplicate requests are made.
  const perms = currentUser?.permissions;
  const { data: inReviewAll = [] } = useDesigns({ status: "in_review", refetchInterval: 60_000 });
  const { data: approvedAll  = [] } = useDesigns({ status: "approved",  refetchInterval: 60_000 });
  const notificationCount =
    ((perms?.is_reviewer || perms?.is_admin) ? inReviewAll.length : 0) +
    ((perms?.is_publisher || perms?.is_admin) ? approvedAll.length  : 0);
  const [braceletPanelOpen, setBraceletPanelOpen] = useState(false);
  const [savedDesignsOpen, setSavedDesignsOpen] = useState(false);
  const [braceletDetailsOpen, setBraceletDetailsOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<"user" | "comments" | null>(null);
  const [usersAdminOpen, setUsersAdminOpen] = useState(false);
  const rightPanelOpen = rightPanel !== null;
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });

  // Auto-resize the description textarea whenever its content changes
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [braceletDescription]);

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


  // When BraceletPanel opens, clear selected bead (closes BeadInfoDialog)
  function openBraceletPanel() {
    setBraceletPanelOpen((o) => !o);
  }

  // reset to New Bracelet
  function handleNewBracelet() {
    if (placedBeads.length > 0) {
      setPendingDesign({ id: -1, name: "New Bracelet" } as any, () => resetBracelet());
    } else {
      resetBracelet();
    }
  }

  // Preload GLBs whenever the catalog updates
  useEffect(() => {
    beads.forEach((b) => useGLTF.preload(b.glb_path));
  }, [beads]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">

      {/* Header */}
      <header className="flex shrink-0 items-center gap-4 py-4 border-b border-neutral-200 bg-white px-6">
        <div className="flex flex-1 items-center gap-4">
        <button
          onClick={() => setSavedDesignsOpen(true)}
          className="flex items-center rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
          aria-label="Saved Designs"
          title="View All Saved Designs"
        >
          <Inbox size={20} />
        </button>
          <img
            src="https://enewtondesign.com/cdn/shop/files/enewton_header_logo.png"
            alt="eNewton Logo"
            className="header-logo max-w-[200px]"
          />
        </div>

        <span className="flex flex-1 items-center justify-end gap-2 font-semibold tracking-wide text-neutral-700">
          <Button
            onClick={handleNewBracelet}
          >
            <Plus size={14} />
            New Bracelet
          </Button>
          <BraceletExporter />
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

        <UserPanel
          open={rightPanel === "user"}
          onClose={() => setRightPanel(null)}
          onEditUsers={() => { setRightPanel(null); setUsersAdminOpen(true); }}
        />
        <CommentsPanel open={rightPanel === "comments"} onClose={() => setRightPanel(null)} />

        {/* Clip container — narrows visible area without resizing the canvas */}
        <div
          className="absolute flex flex-col top-0 bottom-0 overflow-hidden"
          style={{
            left:  braceletPanelOpen ? PANEL_WIDTH : 0,
            right: rightPanelOpen    ? PANEL_WIDTH : 0,
            transition: "left 300ms ease-out, right 300ms ease-out",
          }}
        >

          <button
            onClick={openBraceletPanel}
            className=
              {`bracelet-panel-toggle-btn absolute left-0 top-0 bottom-0 z-40 my-auto h-fit 
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

          <CanvasToolbar
            commentsOpen={rightPanel === "comments"}
            onCommentsClick={() => setRightPanel((p) => p === "comments" ? null : "comments")}
          />

          <div className="inner-canvas relative flex-1">
            <div className="absolute left-2 top-2 z-20 flex flex-col gap-1">
            <CanvasWorkflowBar />
              <div className="flex items-center gap-2">
                
                <input
                  type="text"
                  value={braceletName}
                  onChange={(e) => setBraceletName(e.target.value)}
                  className="bracelet-panel-name-input flex-1 rounded border-transparent bg-transparent px-2 py-2 font-semibold text-neutral-700 outline-none transition-all hover:bg-neutral-100 focus:border-yellow-600"
                  aria-label="Bracelet name"
                />
                <Check size={20} />
              </div>
              <textarea
                ref={descriptionRef}
                value={braceletDescription}
                onChange={(e) => setBraceletDescription(e.target.value)}
                placeholder="Add a description…"
                rows={5}
                cols={50}
                className="bracelet-panel-name-input w-full resize-none overflow-hidden rounded border-transparent bg-transparent px-2 py-1 text-xs leading-relaxed text-neutral-500 outline-none transition-all placeholder:text-neutral-400 hover:bg-neutral-100 focus:border-yellow-600"
                aria-label="Bracelet description"
              />
              <button
                className="text-left px-2 text-xs underline hover:no-underline w-fit rounded focus:ring-2 focus:ring-neutral-600"
                onClick={() => setBraceletDetailsOpen(true)}
              >
                view bracelet details
              </button>
            </div>

            <CanvasStatsBar />

            {/* Edit mode action toolbar — floats upper-right over canvas */}
            <div className="absolute right-4 z-20 pointer-events-none shadow-sm rounded-lg">
              <EditModeToolbar />
            </div>
            <BandSelector panelOpen={braceletPanelOpen} />

            {/* Beads loading overlay */}
            {beadsLoading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-neutral-50/70 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-3 text-neutral-500">
                  <Loader2 size={28} className="animate-spin" />
                  <span className="text-sm font-medium">Loading beads…</span>
                </div>
              </div>
            )}

            {/* Beads error overlay */}
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

            {/* Inner canvas — always full screen width, clipped by parent */}
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

      <SavedDesignsPanel
        isOpen={savedDesignsOpen}
        onClose={() => setSavedDesignsOpen(false)}
      />

      <UsersAdminPanel
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
            top: ghostPos.y + 12,
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