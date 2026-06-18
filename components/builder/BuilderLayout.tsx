"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronsRight, Inbox, Loader2, Lock, Plus, ShieldAlert } from "lucide-react";

import { LOGO_SRC, LOGO_ALT, DEFAULT_BRACELET_NAME} from "@/lib/constants";
import { cn } from "@/lib/utils";

import { useProgress } from "@react-three/drei";

import { Scene } from "@/components/scene/Scene";
import { Button } from "@/components/ui/Button";
import { PANEL_WIDTH } from "@/components/ui/Panel";
import { Tooltip } from "@/components/ui/Tooltip";

import { BraceletExporter } from "./canvas/BraceletExporter";
import { BandSelector } from "./canvas/BandSelector";
import { CanvasStatsBar } from "./canvas/CanvasStatsBar";
import { CanvasToolbar } from "./canvas/CanvasToolbar";
import { EditModeToolbar } from "./canvas/EditModeToolbar";
import { EditModeHelp } from "./canvas/EditModeHelp";
import { CanvasWorkflowBar } from "./canvas/CanvasWorkflowBar";

import { ConfirmReplaceDialog } from "./dialogs/ConfirmReplaceDialog";
import { BraceletDetailsDialog } from "./dialogs/BraceletDetailsDialog";
import { BeadInfoDialog } from "./dialogs/BeadInfoDialog";
import { SessionTakenOverDialog } from "./dialogs/SessionTakenOverDialog";
import { DesignNotFoundDialog } from "./dialogs/DesignNotFoundDialog";
import { ManageBeadsDialog } from "./dialogs/ManageBeadsDialog";

import { BeadSelectorPanel } from "./panels/BeadSelectorPanel";
import { CommentsPanel } from "./panels/CommentsPanel";

import { SavedDesignsScreen } from "./saved-designs/SavedDesignsScreen";

import { UserPanel } from "./users/UserPanel";
import { UsersAdminScreen } from "./users/UsersAdminScreen";

import { getInitials } from "@/lib/utils";

import { useQueryClient } from "@tanstack/react-query";

import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDesign } from "@/hooks/useDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { useNotifications } from "@/hooks/useNotifications";
import { useLockDesign } from "@/hooks/useLockDesign";
import { useReleaseLock } from "@/hooks/useReleaseLock";
import { useDesignHeartbeat } from "@/hooks/useDesignHeartbeat";
import { useLoadDesign } from "@/hooks/useLoadDesign";
import { usePusherDesign } from "@/hooks/usePusherDesign";
import { useSavePattern } from "@/hooks/useSavePattern";
import type { DesignComment } from "@/types";

export function BuilderLayout() {
  const {
    placedBeads,
    braceletName,
    braceletDescription,
    clearSelectedBead,
    selectedBead,
    dragFromPanel,
    resetBracelet,
    startNewBracelet,
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
    startNewBracelet:     s.startNewBracelet,
    setPendingDesign:     s.setPendingDesign,
    activeDesignId:       s.activeDesignId,
    isDirty:              s.isDirty,
  }));

  const activePatternId = useStore((s) => s.activePatternId);

  const { data: currentUser } = useCurrentUser();
  const { canEdit, canManageComponents } = usePermissions();
  const { mutate: savePattern, isPending: isSavingPattern } = useSavePattern();
  const { data: savedDesign, isFetching: designFetching, isError: designIsError, error: designErrorObj } = useDesign(activeDesignId);
  const { active: glbsLoading } = useProgress();
  const isCanvasLoading = glbsLoading || (activeDesignId !== null && designFetching);

  // ── Notification badge (header) ───────────────────────────────────────────
  const [showDesignNotFound, setShowDesignNotFound] = useState(false);

  useEffect(() => {
    if (!designIsError) return;
    // Duck-type the status — avoids instanceof fragility across module instances.
    // Any HTTP error (404 deleted, 403 revoked, 410 gone) on a persisted ID means
    // the ID is unrecoverable. Skip errors with no status (transient network failures).
    const status = (designErrorObj as { status?: number } | null)?.status;
    if (!status) return;
    startNewBracelet();
    setShowDesignNotFound(true);
  }, [designIsError, designErrorObj]); // eslint-disable-line react-hooks/exhaustive-deps

  const [braceletPanelOpen, setBraceletPanelOpen] = useState(false);
  const [savedDesignsOpen, setSavedDesignsOpen] = useState(false);
  const { inReviewCount, approvedCount } = useNotifications();
  const notificationCount = inReviewCount + approvedCount;
  const [braceletDetailsOpen, setBraceletDetailsOpen] = useState(false);
  const [rightPanel,          setRightPanel]          = useState<"user" | "comments" | null>(null);
  const [usersAdminOpen,      setUsersAdminOpen]      = useState(false);
  const [manageBeadsOpen,     setManageBeadsOpen]     = useState(false);

  // ── Design lock ──────────────────────────────────────────────────────────
  const queryClient = useQueryClient();
  const [lockHeld,           setLockHeld]           = useState(false);
  const [kickedNotification, setKickedNotification] = useState(false);
  const [showKickedModal,    setShowKickedModal]    = useState(false);
  const prevDesignIdRef = useRef<number | null>(null);
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
      setShowKickedModal(false);
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
      syncDesign(savedDesign);
      return;
    }

    // Guard: without this, active_lock=null + currentUser=undefined collapses to
    // undefined===undefined → true → skips the POST that would acquire the lock.
    if (!currentUser) return;

    // Don't re-acquire after being kicked — the admin still holds the lock and
    // releasing it would re-trigger this effect with active_lock=null, causing
    // the kicked user to silently re-acquire and show both banners at once.
    if (kickedNotification) return;

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
      syncDesign(savedDesign);
      return;
    }

    // No active lock — acquire it. Explicitly set true/false so a prior false
    // (from stale cached data) is corrected if the POST succeeds.
    acquireLock({ id: activeDesignId })
      .then((result) => { setLockHeld(result.acquired); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDesignId, savedDesign?.id, savedDesign?.status, savedDesign?.active_lock?.user_id, currentUser?.id, designFetching, kickedNotification]);

  // Editing is locked by workflow status, by another user holding the lock,
  // or when this user has been kicked off the design.
  // Use active_lock from the API response to determine read-only state rather
  // than relying on !lockHeld && !designFetching, which flashes read-only for
  // one render when cached savedDesign arrives before the optimistic lockHeld
  // effect fires. When active_lock is null the lock is not yet confirmed (may
  // be in acquisition) so we optimistically show the editing state.
  const lockedByOther =
    !lockHeld &&
    isLockableStatus &&
    currentUser != null &&
    savedDesign?.active_lock?.user_id != null &&
    savedDesign.active_lock.user_id !== currentUser.id;

  const isLocked =
    savedDesign?.status === "approved" ||
    savedDesign?.status === "published" ||
    kickedNotification ||
    lockedByOther;

  useDesignHeartbeat(
    (isLockableStatus && !kickedNotification && lockHeld) ? activeDesignId : null,
    () => {
      setLockHeld(false);
      setKickedNotification(true);
      setShowKickedModal(true);
      // Immediately refresh savedDesign so the modal can show who took over.
      if (activeDesignId !== null) {
        queryClient.invalidateQueries({ queryKey: ["designs", activeDesignId] });
      }
    },
  );

  // Real-time design events via Pusher — replaces the 30s polling-based sync.
  usePusherDesign(activeDesignId, {
    onUpdated: (design) => {
      // Keep read-only viewers' canvas in sync when the lock holder saves.
      if (!lockHeld) syncDesign(design);
      // Write the event payload directly into the cache instead of invalidating:
      // avoids a network round-trip and prevents the lock effect re-running
      // (which would call syncDesign a second time for read-only viewers).
      if (activeDesignId !== null) {
        queryClient.setQueryData(["designs", activeDesignId], design);
      }
    },
    onLockTaken: () => {
      // Admin force-took the lock — instant kick without waiting for heartbeat.
      setLockHeld(false);
      setKickedNotification(true);
      setShowKickedModal(true);
      if (activeDesignId !== null) {
        queryClient.invalidateQueries({ queryKey: ["designs", activeDesignId] });
      }
    },
    onLockChanged: () => {
      // Lock acquired or released — invalidate the list so SavedDesignsScreen
      // badge clears, plus the per-design query for the lock state detail.
      queryClient.invalidateQueries({ queryKey: ["designs"] });
      if (activeDesignId !== null) {
        queryClient.invalidateQueries({ queryKey: ["designs", activeDesignId] });
      }
    },
    onReconnected: () => {
      // Re-sync after network outage — events fired while offline are lost.
      // Prefix match also covers ["designs", activeDesignId, "comments"].
      if (activeDesignId !== null) {
        queryClient.invalidateQueries({ queryKey: ["designs", activeDesignId] });
      }
    },
    onCommentCreated: (comment) => {
      if (activeDesignId !== null) {
        queryClient.setQueryData<DesignComment[]>(
          ["designs", activeDesignId, "comments"],
          (prev = []) => [...prev, comment],
        );
      }
    },
    onCommentUpdated: (comment) => {
      if (activeDesignId !== null) {
        queryClient.setQueryData<DesignComment[]>(
          ["designs", activeDesignId, "comments"],
          (prev = []) => prev.map((c) => (c.id === comment.id ? comment : c)),
        );
      }
    },
    onCommentDeleted: (commentId) => {
      if (activeDesignId !== null) {
        queryClient.setQueryData<DesignComment[]>(
          ["designs", activeDesignId, "comments"],
          (prev = []) => prev.filter((c) => c.id !== commentId),
        );
      }
    },
  });

  // ── Visibility-change re-sync ─────────────────────────────────────────────
  // Catch up on missed events immediately when the tab regains focus, without
  // waiting for Pusher's reconnect + re-auth round-trip to complete.
  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState === "visible" && activeDesignId !== null) {
        queryClient.invalidateQueries({ queryKey: ["designs", activeDesignId] });
      }
    }
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, [activeDesignId, queryClient]);

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
      setPendingDesign({ id: -1, name: DEFAULT_BRACELET_NAME } as any, () => startNewBracelet());
    } else {
      startNewBracelet();
    }
  }

  function handleRetryLock() {
    setKickedNotification(false);
    setShowKickedModal(false);
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
        <Tooltip content="Open Saved Designs Panel" placement="bottom-end">
            <button
              onClick={() => setSavedDesignsOpen(true)}
              className="flex items-center rounded-[2px] border border-default bg-white px-4.5 py-3.5 text-sm font-semibold hover:bg-mint hover:border-black transition-colors"
              aria-label="Saved Designs"
            >
              <Inbox size={24} />
            </button>
          </Tooltip>
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
          {activePatternId !== null && canManageComponents && (
            <Button
              variant="secondary"
              onClick={() => savePattern()}
              disabled={isSavingPattern}
            >
              {isSavingPattern ? <Loader2 size={14} className="animate-spin" /> : null}
              Save Pattern
            </Button>
          )}
          {activePatternId === null && <BraceletExporter
            onNameRequired={() => setHighlightReason("name")}
            isKicked={kickedNotification}
            onKickedClick={() => setShowKickedModal(true)}
          />}
          {/* Profile icon + notification badge */}
          <div className="relative ml-2 shrink-0">
          <Tooltip content={rightPanel === "user" ? "Close User Panel" : "Open User Panel"} placement="bottom-start">
            <button
              onClick={() => setRightPanel((p) => p === "user" ? null : "user")}
              className={cn(
                "flex h-9 w-9 bg-mint items-center justify-center rounded-full text-sm font-bold text-navy border-navy border transition-colors",
                rightPanel === "user" && "outline outline-navy focus:ring-default focus:ring focus:ring-offset-2"
              )}
              aria-label="Open user profile"
            >
              {currentUser ? getInitials(currentUser.name) : "?"}
            </button>
            {notificationCount > 0 && (
              <span className="pointer-events-none absolute -right-1 -top-1 flex min-w-[1.1rem] h-[1.1rem] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
            </Tooltip>
          </div>
        </span>
      </header>

      {/* Scene */}
      <main id="bracelet-scene" className="relative flex-1 overflow-hidden">

        <BeadSelectorPanel
          isOpen={braceletPanelOpen}
          onClose={() => setBraceletPanelOpen(false)}
        />

        <BeadInfoDialog isLocked={isLocked} />

        <UserPanel
          open={rightPanel === "user"}
          onClose={() => setRightPanel(null)}
          onEditUsers={() => { setRightPanel(null); setUsersAdminOpen(true); }}
          onManageBeads={() => { setRightPanel(null); setManageBeadsOpen(true); }}
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
            <div className="absolute left-0 top-0 bottom-0 z-40 my-auto h-fit">
              <Tooltip content={braceletPanelOpen ? "Close Bead Selector Panel" : "Open Bead Selector Panel"} placement="right">
                <button
                  onClick={openBraceletPanel}
                  className={`rounded-br-lg rounded-tr-lg bg-navy text-white px-1 py-2 transition-all hover:bg-navy/80 hover:pl-2
                  ${braceletPanelOpen ? "open" : ""}`}
                  aria-label={braceletPanelOpen ? "Close Bead Selector Panel" : "Open Bead Selector Panel"}
                >
                  <ChevronsRight size={25} className={`transition-all ${braceletPanelOpen && "rotate-180"}`} />
                </button>
              </Tooltip>
            </div>
          )}

          <CanvasToolbar
            commentsOpen={rightPanel === "comments"}
            onCommentsClick={() => setRightPanel((p) => p === "comments" ? null : "comments")}
            onPublishBlocked={() => setHighlightReason("sku")}
            isReadOnly={isLocked}
            isKicked={kickedNotification}
          />

          <div className="inner-canvas relative flex-1">

            {/* Bracelet info overlay */}
            <div className="absolute left-2 lg:left-6 lg:top-4 top-2 z-20 flex flex-col gap-0.5">
              {(kickedNotification || lockedByOther) && (
                <div className="mb-1 flex items-center gap-1.5 rounded-[2px] bg-orange px-2.5 py-1 text-xs font-medium text-white">
                  <ShieldAlert size={11} className="shrink-0" />
                  {kickedNotification
                    ? "Read-only — your session was taken over"
                    : `Read-only — being edited by ${savedDesign!.active_lock!.user_name}`}
                </div>
              )}
              {lockHeld && (
                <div className="mb-1 flex items-center gap-1.5 rounded-[2px] w-fit bg-orange px-2.5 py-1 text-xs font-medium text-white">
                  <Lock size={11} className="shrink-0" />
                  <span className="font-bold">Locked:</span> You are editing
                </div>
              )}
              <CanvasWorkflowBar />
              {savedDesign?.status === "rejected" && savedDesign?.rejection_reason && (
                <p className="max-w-[240px] pt-1 text-xs leading-relaxed">
                  <span className="text-color-base/60 font-semibold">Reason: </span>
                  <span className="italic">&ldquo;{savedDesign.rejection_reason}&rdquo;</span>
                </p>
              )}
              <p className="py-2 font-semibold leading-snug">
                <span className="text-color-base/70 font-headline">{activePatternId !== null ? "Pattern Name:" : "Bracelet Name:"}</span> {braceletName}
              </p>

              {/* "view bracelet/pattern details" button*/}
              <button
                onClick={handleDetailsClick}
                className={cn(
                  "text-left text-xs w-fit rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-600",
                  highlightReason !== null
                    ? "px-2.5 py-1 bg-mint text-navy font-semibold border border-navy animate-pulse"
                    : "underline hover:no-underline text-color-base/70",
                )}
              >
                {highlightReason === "name" ? "Set a bracelet name →" : highlightReason === "sku" ? "Add a Shopify SKU →" : activePatternId !== null ? "view pattern details" : "view bracelet details"}
              </button>
            </div>

            <CanvasStatsBar />

            {/* Edit mode action toolbar */}
            <div className="absolute right-4 lg:right-6 top-4 z-20 pointer-events-none shadow-sm rounded-[2px]">
              <EditModeToolbar />
            </div>

            <EditModeHelp />

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
              <Scene panelOpen={braceletPanelOpen} rightPanelOpen={rightPanelOpen} isLocked={isLocked} />
            </div>

            <div
              className={cn(
                "absolute inset-0 z-30 flex items-center justify-center bg-neutral-50/70 backdrop-blur-[2px] transition-opacity duration-500",
                isCanvasLoading ? "opacity-100" : "opacity-0 pointer-events-none",
              )}
            >
              <div className="flex flex-col items-center gap-3 text-color-base/70">
                <Loader2 size={28} className="animate-spin" />
                <span className="text-sm font-medium">Loading…</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SavedDesignsScreen
        isOpen={savedDesignsOpen}
        onClose={() => setSavedDesignsOpen(false)}
        isKickedFromActiveDesign={kickedNotification}
        onRetryLock={handleRetryLock}
      />


      <UsersAdminScreen
        isOpen={usersAdminOpen}
        onClose={() => setUsersAdminOpen(false)}
      />

      <ConfirmReplaceDialog />

      {showKickedModal && (
        <SessionTakenOverDialog
          takenByName={savedDesign?.active_lock?.user_name}
          onClose={() => setShowKickedModal(false)}
        />
      )}

      <DesignNotFoundDialog
        open={showDesignNotFound}
        onClose={() => setShowDesignNotFound(false)}
      />

      <BraceletDetailsDialog
        open={braceletDetailsOpen}
        onClose={() => setBraceletDetailsOpen(false)}
        isKicked={kickedNotification}
      />

      <ManageBeadsDialog
        open={manageBeadsOpen}
        onClose={() => setManageBeadsOpen(false)}
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