"use client";

import { useEffect, useState } from "react";
import { ChevronsRight, Inbox, LayoutTemplate, Loader2 } from "lucide-react";

import { LOGO_SRC, LOGO_ALT, DEFAULT_BRACELET_NAME} from "@/lib/constants";
import { cn } from "@/lib/utils";

import { useProgress } from "@react-three/drei";

import { Scene } from "@/components/scene/Scene";
import { Button } from "@/components/ui/Button";
import { PANEL_WIDTH } from "@/components/ui/Panel";
import { Tooltip } from "@/components/ui/Tooltip";

import { BraceletExporter } from "./header/BraceletExporter";
import { HeaderToolbar } from "./header/HeaderToolbar";
import { NewBraceletMenu } from "./header/NewBraceletMenu";

import { BandSelector } from "./canvas/BandSelector";
import { CanvasStatsBar } from "./canvas/CanvasStatsBar";
import { EditModeToolbar } from "./canvas/EditModeToolbar";
import { EditModeHelp } from "./canvas/EditModeHelp";
import { CanvasInfoOverlay } from "./canvas/CanvasInfoOverlay";

import { ConfirmReplaceDialog } from "./dialogs/ConfirmReplaceDialog";
import { BraceletDetailsDialog } from "./dialogs/BraceletDetailsDialog";
import { BeadInfoDialog } from "./dialogs/BeadInfoDialog";
import { EditReplaceDialog } from "./dialogs/EditReplaceDialog";
import { SessionTakenOverDialog } from "./dialogs/SessionTakenOverDialog";
import { DesignStatusLockedDialog } from "./dialogs/DesignStatusLockedDialog";
import { DesignNotFoundDialog } from "./dialogs/DesignNotFoundDialog";
import { ManageBeadsDialog } from "./dialogs/ManageBeadsDialog";
import { ManageSeedColorsDialog } from "./dialogs/ManageSeedColorsDialog";

import { BeadSelectorPanel } from "./panels/BeadSelectorPanel";
import { CommentsPanel } from "./panels/CommentsPanel";

import { SavedDesignsScreen } from "./saved-designs/SavedDesignsScreen";

import { UserPanel } from "./panels/UserPanel";
import { UsersAdminScreen } from "./users/UsersAdminScreen";

import { getInitials } from "@/lib/utils";

import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDesign } from "@/hooks/useDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { useNotifications } from "@/hooks/useNotifications";
import { useDesignLock } from "@/hooks/useDesignLock";
import { useSavePattern } from "@/hooks/useSavePattern";

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
    copyBracelet,
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
    copyBracelet:         s.copyBracelet,
  }));

  const isEditMode    = useStore((s) => s.isEditMode);
  const toggleEditMode = useStore((s) => s.toggleEditMode);
  const replaceTargetInstanceId = useStore((s) => s.replaceTargetInstanceId);
  const replaceAllTargetProductId = useStore((s) => s.replaceAllTargetProductId);
  const editReplaceMode = useStore((s) => s.editReplaceMode);
  const cancelReplaceMode = useStore((s) => s.cancelReplaceMode);

  const activePatternId = useStore((s) => s.activePatternId);

  const { data: currentUser } = useCurrentUser();
  const { canEdit, canManageComponents } = usePermissions();
  const { mutate: savePattern, isPending: isSavingPattern, isError: savePatternFailed } = useSavePattern();
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

  useEffect(() => {
    if (replaceTargetInstanceId !== null || replaceAllTargetProductId !== null || editReplaceMode) setBraceletPanelOpen(true);
  }, [replaceTargetInstanceId, replaceAllTargetProductId, editReplaceMode]); // eslint-disable-line react-hooks/exhaustive-deps
  const [savedDesignsOpen, setSavedDesignsOpen] = useState(false);
  const { inReviewCount, approvedCount } = useNotifications();
  const notificationCount = inReviewCount + approvedCount;
  const [braceletDetailsOpen, setBraceletDetailsOpen] = useState(false);
  const [rightPanel,          setRightPanel]          = useState<"user" | "comments" | null>(null);
  const [usersAdminOpen,      setUsersAdminOpen]      = useState(false);
  const [manageBeadsOpen,     setManageBeadsOpen]     = useState(false);
  const [manageSeedColorsOpen, setManageSeedColorsOpen] = useState(false);

  const [savedDesignsInitialView, setSavedDesignsInitialView] = useState<"designs" | "patterns">("designs");

  // ── Design lock + realtime sync ────────────────────────────────────────────
  const {
    isLocked,
    lockHeld,
    lockedByOther,
    kickedNotification,
    showKickedModal,
    setShowKickedModal,
    showStatusLockedModal,
    statusLockedTo,
    setShowStatusLockedModal,
    handleRetryLock,
  } = useDesignLock({ activeDesignId, savedDesign, designFetching });

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

  useEffect(() => {
    if (isLocked && isEditMode) toggleEditMode();
  }, [isLocked]); // eslint-disable-line react-hooks/exhaustive-deps


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

  function handleCopyBracelet() {
    // Fork the bracelet currently on the canvas into a new, unsaved draft: keeps
    // the beads/band but detaches from the saved design/pattern so the next Save
    // creates a brand-new bracelet rather than overwriting the original.
    copyBracelet();
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
              onClick={() => { setSavedDesignsInitialView("designs"); setSavedDesignsOpen(true); }}
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
          <NewBraceletMenu
            onFromScratch={handleNewBracelet}
            onCopy={handleCopyBracelet}
            onFromPattern={() => { setSavedDesignsInitialView("patterns"); setSavedDesignsOpen(true); }}
          />
          {activePatternId !== null && canManageComponents && (
            <Button
              variant={savePatternFailed ? "danger" : "gold"}
              onClick={() => savePattern()}
              disabled={isSavingPattern}
              className="gap-2"
            >
              <LayoutTemplate size={14} className="shrink-0" />
              {isSavingPattern ? <Loader2 size={14} className="animate-spin" /> : null}
              {savePatternFailed ? "Save failed — retry?" : "Save Pattern"}
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
          onClose={() => { setBraceletPanelOpen(false); cancelReplaceMode(); }}
          onManageSeedColors={() => setManageSeedColorsOpen(true)}
        />

        <BeadInfoDialog isLocked={isLocked} />
        <EditReplaceDialog />

        <UserPanel
          open={rightPanel === "user"}
          onClose={() => setRightPanel(null)}
          onEditUsers={() => { setRightPanel(null); setUsersAdminOpen(true); }}
          onManageBeads={() => { setRightPanel(null); setManageBeadsOpen(true); }}
          onManageSeedColors={() => { setRightPanel(null); setManageSeedColorsOpen(true); }}
          onManagePatterns={() => { setRightPanel(null); setSavedDesignsInitialView("patterns"); setSavedDesignsOpen(true); }}
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

          <HeaderToolbar
            commentsOpen={rightPanel === "comments"}
            onCommentsClick={() => setRightPanel((p) => p === "comments" ? null : "comments")}
            onPublishBlocked={() => setHighlightReason("sku")}
            isReadOnly={isLocked}
            isKicked={kickedNotification}
          />

          <div className={`inner-canvas relative flex-1 ${activePatternId !== null && "border-gold border-2 ring-2 ring-gold"}`}>

            {/* Bracelet info overlay */}
            <CanvasInfoOverlay
              activePatternId={activePatternId}
              kickedNotification={kickedNotification}
              lockedByOther={lockedByOther}
              lockHeld={lockHeld}
              savedDesign={savedDesign}
              braceletName={braceletName}
              highlightReason={highlightReason}
              onDetailsClick={handleDetailsClick}
            />

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
        initialView={savedDesignsInitialView}
        isKickedFromActiveDesign={kickedNotification}
        onRetryLock={handleRetryLock}
        onOpenDetails={() => setBraceletDetailsOpen(true)}
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

      {showStatusLockedModal && statusLockedTo && (
        <DesignStatusLockedDialog
          status={statusLockedTo}
          onClose={() => setShowStatusLockedModal(false)}
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

      <ManageSeedColorsDialog
        open={manageSeedColorsOpen}
        onClose={() => setManageSeedColorsOpen(false)}
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