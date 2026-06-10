"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronsRight, Inbox, Lock, Plus } from "lucide-react";

import { LOGO_SRC, LOGO_ALT, DEFAULT_BRACELET_NAME} from "@/lib/constants";
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
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDesign } from "@/hooks/useDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { useNotifications } from "@/hooks/useNotifications";
import { useLockDesign } from "@/hooks/useLockDesign";
import { useReleaseLock } from "@/hooks/useReleaseLock";
import { useDesignHeartbeat } from "@/hooks/useDesignHeartbeat";
import { useLoadDesign } from "@/hooks/useLoadDesign";

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

  const { data: currentUser } = useCurrentUser();
  const { canEdit, canReview, canPublish } = usePermissions();
  const { data: savedDesign, isFetching: designFetching } = useDesign(
    activeDesignId,
    { refetchInterval: activeDesignId !== null ? 30_000 : false },
  );

  // ── Notification badge (header) ───────────────────────────────────────────
  const [braceletPanelOpen, setBraceletPanelOpen] = useState(false);
  const [savedDesignsOpen, setSavedDesignsOpen] = useState(false);
  const { inReviewCount, approvedCount } = useNotifications();
  const notificationCount = inReviewCount + approvedCount;
  const [braceletDetailsOpen, setBraceletDetailsOpen] = useState(false);
  const [rightPanel,          setRightPanel]          = useState<"user" | "comments" | null>(null);
  const [usersAdminOpen,      setUsersAdminOpen]      = useState(false);

  // ── Design lock ──────────────────────────────────────────────────────────
  const [lockHeld,          setLockHeld]          = useState(false);
  const [kickedNotification, setKickedNotification] = useState(false);
  const prevDesignIdRef = useRef<number | null>(null);
  const lastSyncedAtRef = useRef<string | null>(null);
  const { mutate: releaseLock } = useReleaseLock();
  const { mutateAsync: acquireLock } = useLockDesign();
  const { syncDesign } = useLoadDesign();

  // Release the previous lock and optimistically set lockHeld whenever
  // activeDesignId changes. Setting lockHeld immediately (before savedDesign
  // loads) means the banner appears with no network delay.
  useEffect(() => {
    const prevId = prevDesignIdRef.current;
    prevDesignIdRef.current = activeDesignId;

    if (prevId !== null && prevId !== activeDesignId) {
      releaseLock(prevId);
      setKickedNotification(false);
    }

    if (activeDesignId === null) {
      setLockHeld(false);
    } else if (!lockHeld) {
      setLockHeld(true); // optimistic — confirmed by the server effect below
    }
  }, [activeDesignId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLockableStatus = savedDesign != null && savedDesign.status !== "published";

  // Once savedDesign loads: use active_lock from the GET response to determine
  // lock ownership without an extra network round-trip where possible.
  useEffect(() => {
    if (!activeDesignId || !savedDesign || savedDesign.id !== activeDesignId) return;

    // Stale React Query cache can contain an outdated active_lock or status
    // that would call setLockHeld(false) in the same React batch as the
    // optimistic setLockHeld(true) above — last writer wins, banner never shows.
    // Wait until the GET response is settled before making any lock decisions.
    if (designFetching) return;

    if (!isLockableStatus) {
      setLockHeld(false); // published — release the optimistic lock
      return;
    }

    // Guard: without this, active_lock=null + currentUser=undefined collapses to
    // undefined===undefined → true → skips the POST that would acquire the lock.
    if (!currentUser) return;

    const activeLock = savedDesign.active_lock;

    if (activeLock?.user_id === currentUser.id) {
      // Server confirms we hold the lock. Restore banner if stale data previously
      // set lockHeld=false (e.g. old active_lock showed a different user).
      if (!lockHeld) setLockHeld(true);
      return;
    }

    if (activeLock != null) {
      // Another user holds the lock — release the optimistic assumption.
      setLockHeld(false);
      return;
    }

    // No active lock — acquire it. Explicitly set true/false so a prior false
    // (from stale cached data) is corrected if the POST succeeds.
    acquireLock({ id: activeDesignId })
      .then((result) => { setLockHeld(result.acquired); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDesignId, savedDesign?.id, savedDesign?.status, savedDesign?.active_lock?.user_id, currentUser?.id, designFetching]);

  // Reset tracked updated_at on design change so the first poll always syncs.
  useEffect(() => { lastSyncedAtRef.current = null; }, [activeDesignId]);

  // When another user saves changes, sync the canvas for read-only viewers.
  // The ref guard ensures syncDesign only fires when updated_at genuinely
  // changes — not on every poll or when lockHeld transitions (e.g. after kick).
  useEffect(() => {
    if (!savedDesign || designFetching || lockHeld) return;
    if (savedDesign.updated_at === lastSyncedAtRef.current) return;
    lastSyncedAtRef.current = savedDesign.updated_at;
    syncDesign(savedDesign);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedDesign?.updated_at, designFetching, lockHeld]);

  // Editing is locked by workflow status, by another user holding the lock,
  // or when this user has been kicked off the design. Exclude stale-cache
  // renders (designFetching) to avoid closing the panel before lock state
  // is confirmed from the server.
  const isLocked =
    savedDesign?.status === "approved" ||
    savedDesign?.status === "published" ||
    kickedNotification ||
    (!lockHeld && isLockableStatus && !designFetching);

  useDesignHeartbeat(
    isLockableStatus ? activeDesignId : null,
    () => {
      setLockHeld(false);
      setKickedNotification(true);
    },
  );

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
  }, [braceletName, highlightReason]);

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
      <header className="flex shrink-0 items-center gap-4 py-4 border-b border-default bg-white px-6">
        <div className="flex flex-1 items-center gap-4">
          <button
            onClick={() => setSavedDesignsOpen(true)}
            className="flex items-center rounded border border-default bg-white px-4.5 py-3.5 text-sm font-semibold hover:bg-mint hover:border-black transition-colors"
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

        <span className="flex flex-1 items-center justify-end gap-2 font-semibold tracking-wide">
          <Button onClick={handleNewBracelet}>
            <Plus size={14} />
            New Bracelet
          </Button>
          <BraceletExporter onNameRequired={() => setHighlightReason("name")} />
          {/* Profile icon + notification badge */}
          <div className="relative ml-2 shrink-0">
            <button
              onClick={() => setRightPanel("user")}
              className="flex h-9 w-9 bg-mint items-center justify-center rounded-full text-sm font-bold text-navy border-navy border transition-colors"
              aria-label="Open user profile"
            >
              {currentUser ? getInitials(currentUser.name) : "?"}
            </button>
            {notificationCount > 0 && (
              <span className="pointer-events-none absolute -right-1 -top-1 flex min-w-[1.1rem] h-[1.1rem] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-white">
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
              rounded-br-lg rounded-tr-lg bg-navy text-white
              px-1 py-2
              transition-all
              hover:bg-navy/80 hover:pl-2
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
            <div className="absolute left-2 lg:left-6 lg:top-4 top-2 z-20 flex flex-col gap-0.5">
              {kickedNotification && (
                <div className="mb-1 flex items-center gap-1.5 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white">
                  <Lock size={11} className="shrink-0" />
                  Another user has taken over this design. Your session is read-only.
                  <button
                    onClick={() => setKickedNotification(false)}
                    className="ml-1 opacity-70 hover:opacity-100"
                    aria-label="Dismiss"
                  >×</button>
                </div>
              )}
              {lockHeld && !kickedNotification && (
                <div className="mb-1 flex items-center gap-1.5 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-medium text-white">
                  <Lock size={11} className="shrink-0" />
                  You are editing
                </div>
              )}
              <CanvasWorkflowBar />
              {savedDesign?.status === "rejected" && savedDesign?.rejection_reason && (
                <p className="max-w-[240px] px-2 py-0.5 text-xs leading-relaxed text-rose-600 italic">
                  &ldquo;{savedDesign.rejection_reason}&rdquo;
                </p>
              )}
              <p className="py-2 font-semibold leading-snug">
                <span className="text-color-base/70 font-headline">Bracelet Name:</span> {braceletName}
              </p>

              {/* "view bracelet details" — highlights when a name is required */}
              <button
                onClick={handleDetailsClick}
                className={cn(
                  "text-left text-xs w-fit rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-600",
                  highlightReason !== null
                    ? "px-2.5 py-1 bg-mint text-navy font-semibold border border-navy animate-pulse"
                    : "underline hover:no-underline text-color-base/70",
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
              <BandSelector panelOpen={braceletPanelOpen || rightPanelOpen} />
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
          className="rounded-lg border border-default bg-white shadow-lg px-2 py-1 text-sm flex items-center gap-1.5"
        >
          <span className="text-color-base/70">＋</span>
          {dragFromPanel.bead_type ?? dragFromPanel.name}
        </div>
      )}

    </div>
  );
}