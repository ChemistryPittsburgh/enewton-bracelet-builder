"use client";

import { useEffect, useState } from "react";
import { ChevronsRight, Inbox, LayoutTemplate, Loader2 } from "lucide-react";

import { LOGO_SRC, LOGO_ALT, DEFAULT_BRACELET_NAME} from "@/lib/constants";
import { cn } from "@/lib/utils";

import { useProgress } from "@react-three/drei";

import { Scene } from "@/components/scene/Scene";
import { Button } from "@/components/ui/Button";
import { usePanelWidth, PANEL_COMPACT_QUERY } from "@/components/ui/Panel";
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

import { ManageBeadsDialog } from "./dialogs/manage/ManageBeadsDialog";
import { ManageSeedColorsDialog } from "./dialogs/manage/ManageSeedColorsDialog";

import { BeadSelectorPanel } from "./panels/BeadSelectorPanel";
import { CommentsPanel } from "./panels/CommentsPanel";
import { UserPanel } from "./panels/UserPanel";

import { SavedDesignsScreen } from "./saved-designs/SavedDesignsScreen";

import { UsersAdminScreen } from "./users/UsersAdminScreen";

import { getInitials } from "@/lib/utils";

import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDesign } from "@/hooks/useDesign";
import { usePermissions } from "@/hooks/usePermissions";
import { useNotifications } from "@/hooks/useNotifications";
import { useDesignLock } from "@/hooks/useDesignLock";
import { useSavePattern } from "@/hooks/useSavePattern";
import { useIsDirty } from "@/hooks/useIsDirty";

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
    copyBracelet,
    newBraceletFromPattern,
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
    copyBracelet:         s.copyBracelet,
    newBraceletFromPattern: s.newBraceletFromPattern,
  }));

  const isDirty = useIsDirty();
  const isEditMode    = useStore((s) => s.isEditMode);
  const toggleEditMode = useStore((s) => s.toggleEditMode);
  const replaceTargetInstanceId = useStore((s) => s.replaceTargetInstanceId);
  const replaceAllTargetProductId = useStore((s) => s.replaceAllTargetProductId);
  const replaceSeedTargetIds = useStore((s) => s.replaceSeedTargetIds);
  const editReplaceMode = useStore((s) => s.editReplaceMode);
  const cancelReplaceMode = useStore((s) => s.cancelReplaceMode);
  const startReplaceMode = useStore((s) => s.startReplaceMode);
  const startReplaceSeedSegment = useStore((s) => s.startReplaceSeedSegment);

  const activePatternId = useStore((s) => s.activePatternId);

  // Responsive panel width — drives the clip offsets + scene counter-translate below.
  const panelWidth = usePanelWidth();

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
    if (replaceTargetInstanceId !== null || replaceAllTargetProductId !== null || (replaceSeedTargetIds?.length ?? 0) > 0 || editReplaceMode) setBraceletPanelOpen(true);
  }, [replaceTargetInstanceId, replaceAllTargetProductId, replaceSeedTargetIds, editReplaceMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening the bead selector with a bead selected means "replace this bead":
  // drop straight into replace mode for it (seed-replace for seed segments).
  // Keyed on the selected instanceId + panel-open state so it fires on a fresh
  // selection or when the panel opens — but not after the user manually exits
  // replace mode (neither dep changes then), so the exit sticks.
  useEffect(() => {
    if (isLocked || !canEdit || isEditMode) return;
    if (!braceletPanelOpen || !selectedBead) return;
    const alreadyReplacing =
      replaceTargetInstanceId !== null ||
      replaceAllTargetProductId !== null ||
      (replaceSeedTargetIds?.length ?? 0) > 0 ||
      editReplaceMode;
    if (alreadyReplacing) return;
    if (selectedBead.seedConfig) {
      startReplaceSeedSegment(selectedBead.instanceId);
    } else {
      startReplaceMode(selectedBead.instanceId);
    }
  }, [selectedBead?.instanceId, braceletPanelOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const [savedDesignsOpen, setSavedDesignsOpen] = useState(false);
  const { inReviewCount, approvedCount } = useNotifications();
  const notificationCount = inReviewCount + approvedCount;
  const [braceletDetailsOpen, setBraceletDetailsOpen] = useState(false);
  const [rightPanel,          setRightPanel]          = useState<"user" | "comments" | null>(null);
  const [usersAdminOpen,      setUsersAdminOpen]      = useState(false);
  const [manageBeadsOpen,     setManageBeadsOpen]     = useState(false);
  const [manageSeedColorsOpen, setManageSeedColorsOpen] = useState(false);

  // True on smaller desktops; used to keep only one side panel open at a time.
  // Shares PANEL_COMPACT_QUERY with the responsive panel width, so single-panel
  // mode engages exactly when the panels go compact.
  const [isNarrow, setIsNarrow] = useState(false);

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

  const anyPanelOpen = braceletPanelOpen || rightPanelOpen;

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

  // Track the compact-layout breakpoint reactively (shared with the panel width).
  useEffect(() => {
    const mq = window.matchMedia(PANEL_COMPACT_QUERY);
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Safety net: if a resize down to a narrow desktop leaves both panels open,
  // collapse to one. (The open handlers prevent both opening at once otherwise.)
  useEffect(() => {
    if (isNarrow && braceletPanelOpen && rightPanelOpen) setRightPanel(null);
  }, [isNarrow, braceletPanelOpen, rightPanelOpen]);

  // Global shortcut: E → enter edit mode (mirrors Cmd+Esc which exits it)
  useEffect(() => {
    if (isEditMode) return;
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.key === "e" || e.key === "E") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (canEdit && !isLocked) toggleEditMode();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode, canEdit, isLocked, toggleEditMode]);


  function openBraceletPanel() {
    const next = !braceletPanelOpen;
    setBraceletPanelOpen(next);
    if (next && isNarrow) setRightPanel(null); // one panel at a time on small desktops
  }

  function toggleRightPanel(panel: "user" | "comments") {
    const opening = rightPanel !== panel;
    setRightPanel(opening ? panel : null);
    if (opening && isNarrow) setBraceletPanelOpen(false); // one panel at a time on small desktops
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

  function handleNewFromCurrentPattern() {
    // Shown only while editing a pattern. Forks the current canvas into a fresh,
    // unsaved bracelet and opens the replace flow. No dirty-guard: the beads carry
    // forward and the pattern's saved version is untouched, so nothing is lost.
    newBraceletFromPattern();
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
              className="flex items-center rounded-[2px] border border-default bg-white px-3.5 py-2.5 xl:px-4.5 xl:py-3.5 text-sm font-semibold hover:bg-mint hover:border-black transition-colors"
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
            onFromCurrentPattern={activePatternId !== null ? handleNewFromCurrentPattern : undefined}
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
              onClick={() => toggleRightPanel("user")}
              className={cn(
                "flex h-9 w-9 bg-blush hover:bg-white items-center justify-center rounded-full text-sm font-bold text-navy border-navy border transition-colors",
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

        <BeadInfoDialog isLocked={isLocked} beadSelectorOpen={braceletPanelOpen} />
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
            left:  braceletPanelOpen ? panelWidth : 0,
            right: rightPanelOpen    ? panelWidth : 0,
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
            onCommentsClick={() => toggleRightPanel("comments")}
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

            <CanvasStatsBar hidden={anyPanelOpen} />

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
                left:  braceletPanelOpen ? -panelWidth : 0,
                right: rightPanelOpen    ? -panelWidth : 0,
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