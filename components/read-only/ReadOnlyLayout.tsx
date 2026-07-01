"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProgress } from "@react-three/drei";
import { ArrowLeft, ChevronsRight, Loader2, Lock } from "lucide-react";
import { LOGO_SRC, LOGO_ALT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { usePanelWidth } from "@/components/ui/Panel";
import { Scene } from "@/components/scene/Scene";
import { ReadOnlyBraceletPanel } from "./ReadOnlyBraceletPanel";

/** Below this width the side panel becomes a bottom sheet instead. */
const MOBILE_QUERY = "(max-width: 767px)";

/**
 * `/read-only` — a lightweight, view-only companion to the main builder:
 * browse saved bracelets and preview them on the 3D canvas with no editing
 * capability. Beads are inert (Scene isLocked=true); orbit/zoom/pan still work.
 * Supports tablet and mobile — not gated by DesktopOnly like the main builder.
 *
 * On tablet/desktop the slide-out panel + clip/counter-shift + Scene panelOpen
 * offset mirrors BuilderLayout's bead-selector panel so the canvas re-centers
 * in the remaining space whether the panel is open or closed. On mobile the
 * panel becomes a bottom sheet instead, which doesn't consume horizontal
 * space, so no canvas offset is needed there.
 */
export function ReadOnlyLayout() {
  const router = useRouter();
  const panelWidth = usePanelWidth();
  const [panelOpen, setPanelOpen] = useState(true);
  const [braceletLoading, setBraceletLoading] = useState(false);
  const { active: glbsLoading } = useProgress();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Scene (and its descendant CameraController) reads isEditMode straight from
  // the shared store, not a prop, so a prior desktop session left in edit mode
  // (same browser tab, client-side navigation) can leak in — and it's not
  // enough to flip the flag in an effect here, because React fires effects
  // child-before-parent: CameraController's own effect would still run first
  // against the stale `true` and physically move the camera to the edit-mode
  // framing via setLookAt before this effect gets a chance to correct the
  // flag. Instead, don't mount Scene at all until the reset has happened, so
  // it (and everything inside it) never observes isEditMode as true.
  //
  // Read via getState() rather than a subscribed/closed-over value so this is
  // idempotent under React 18 dev-mode Strict Mode, which invokes effects
  // twice — a naive `if (isEditMode) toggleEditMode()` using the closure value
  // would toggle true→false on the first pass and false→true again on the
  // second (both passes see the same stale closure value), silently undoing
  // the fix. Reading the live store value each time means the second pass
  // correctly sees it's already false and does nothing.
  const toggleEditMode = useStore((s) => s.toggleEditMode);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (useStore.getState().isEditMode) toggleEditMode();
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCanvasLoading = !ready || glbsLoading || braceletLoading;
  const reserveHorizontalSpace = panelOpen && !isMobile;

  return (
    <div className="flex h-screen flex-col min-h-[500px] overflow-hidden">
      <header className="flex shrink-0 items-center gap-2 border-b border-default bg-white px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-6 xl:px-8">
        <img src={LOGO_SRC} alt={LOGO_ALT} className="header-logo w-32 sm:w-48" />
        <span className="flex flex-1 items-center justify-end">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="gap-2">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Return to Editor</span>
          </Button>
        </span>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <ReadOnlyBraceletPanel
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          onLoadingChange={setBraceletLoading}
          direction={isMobile ? "bottom" : "left"}
        />

        {/* Clip container — reserves space for the panel so the canvas area
            below is exactly the remaining width. No-op on mobile, where the
            panel is a bottom sheet rather than a side panel. */}
        <div
          className="absolute flex flex-col top-0 bottom-0 overflow-hidden"
          style={{
            left: reserveHorizontalSpace ? panelWidth : 0,
            right: 0,
            transition: "left 300ms ease-out",
          }}
        >
          {!isMobile && (
            <div className="absolute left-0 top-0 bottom-0 z-40 my-auto h-fit">
              <Tooltip content={panelOpen ? "Close Bracelets Panel" : "Open Bracelets Panel"} placement="right">
                <button
                  onClick={() => setPanelOpen((v) => !v)}
                  className={`rounded-br-lg rounded-tr-lg bg-navy text-white px-1 py-2 transition-all hover:bg-navy/80 hover:pl-2 ${panelOpen ? "open" : ""}`}
                  aria-label={panelOpen ? "Close Bracelets Panel" : "Open Bracelets Panel"}
                >
                  <ChevronsRight size={25} className={`transition-all ${panelOpen && "rotate-180"}`} />
                </button>
              </Tooltip>
            </div>
          )}

          <div className="relative flex-1">
            {/* Mode badge — mirrors CanvasInfoOverlay's "Read-only" banner in
                the main builder (same bg-orange treatment for a locked view). */}
            <div className="absolute left-4 top-2 z-20 flex w-fit items-center gap-1.5 rounded-[2px] bg-orange px-2.5 py-1 text-xs font-medium text-white lg:left-6 lg:top-4 xl:left-8">
              <Lock size={11} className="shrink-0" />
              Read Only
            </div>

            {/* Counter-shift by the same amount so Scene's absolute position is
                unchanged — only what's revealed by the clip container above
                changes — and Scene's own panelOpen-driven CameraOffset keeps
                the bracelet centered in that revealed area. */}
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: reserveHorizontalSpace ? -panelWidth : 0,
                right: 0,
                transition: "left 300ms ease-out",
              }}
            >
              {ready && <Scene panelOpen={reserveHorizontalSpace} rightPanelOpen={false} isLocked={true} />}
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

            {/* Mobile: reopen the bottom sheet once it's been dismissed. */}
            {isMobile && !panelOpen && (
              <button
                onClick={() => setPanelOpen(true)}
                className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
              >
                View Bracelets
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
