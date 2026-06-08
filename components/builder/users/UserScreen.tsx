"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  LogOut,
  Minus,
  MoreVertical,
  Plus,
  X,
} from "lucide-react";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDesigns } from "@/hooks/useDesigns";
import { useLoadDesign } from "@/hooks/useLoadDesign";
import { useStore } from "@/lib/store";
import { clearToken } from "@/lib/auth";
import { getInitials } from "@/lib/utils";
import { getPrimaryRole } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

interface UserScreenProps {
  open: boolean;
  onClose: () => void;
  onEditUsers?: () => void;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d).toLowerCase();
}

type HistoryEvent = {
  key: string;
  label: string;
  braceletName: string;
  date: string;
  byName: string | null;
  braceletId: number;
};

function buildHistory(designs: Bracelet[]): HistoryEvent[] {
  const events: HistoryEvent[] = [];

  for (const d of designs) {
    events.push({
      key: `${d.id}-created`,
      label: "Bracelet created",
      braceletName: d.name,
      date: d.created_at,
      byName: d.created_by_name ?? null,
      braceletId: d.id,
    });

    if (d.reviewed_at) {
      events.push({
        key: `${d.id}-reviewed`,
        label: "Submitted for review",
        braceletName: d.name,
        date: d.reviewed_at,
        byName: d.reviewed_by_name ?? null,
        braceletId: d.id,
      });
    }

    if (d.published_at) {
      events.push({
        key: `${d.id}-published`,
        label: "Published",
        braceletName: d.name,
        date: d.published_at,
        byName: d.published_by_name ?? null,
        braceletId: d.id,
      });
    }
  }

  events.sort((a, b) => b.date.localeCompare(a.date));
  return events.slice(0, 50);
}

// ── Notification design mini-row ─────────────────────────────────────────────

function DesignMiniRow({
  design,
  onClick,
}: {
  design: Bracelet;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-sm border-2 border-white px-2 pt-2 pb-3 text-left hover:border-default transition-colors"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-light-grey flex items-center justify-center">
        {design.preview_image_url ? (
          <img
            src={design.preview_image_url}
            alt={design.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-5 w-5 rounded-full border border-dashed border-default" />
        )}
      </div>
      <span className="flex-1 truncate text-sm font-medium text-color-base/70 group-hover:text-color-base ">
        {design.name}
      </span>
      <ChevronRight size={13} className="shrink-0 text-color-base/70" />
    </button>
  );
}

// ── Notification accordion group ─────────────────────────────────────────────

function NotificationGroup({
  label,
  designs,
  onSelect,
}: {
  label: string;
  designs: Bracelet[];
  onSelect: (d: Bracelet) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = designs.length;

  if (count === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-error/80 text-[22px] leading-none">●</span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center justify-between text-sm hover:text-color-base/70 transition-colors"
        >
          <span className="underline underline-offset-2 text-[14px]">
            {count} {label}
          </span>
          {open
            ? <Minus size={17} className="shrink-0 text-color-base/70" />
            : <Plus  size={17} className="shrink-0 text-color-base/70" />}
        </button>
      </div>

      {open && (
        <div className="ml-4 mt-1 flex flex-col gap-2">
          {designs.map((d) => (
            <DesignMiniRow key={d.id} design={d} onClick={() => onSelect(d)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Three-dot context menu ────────────────────────────────────────────────────

function HistoryMenu({
  eventKey,
  openKey,
  setOpenKey,
  onOpen,
}: {
  eventKey: string;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
  onOpen: () => void;
}) {
  const menuRef  = useRef<HTMLDivElement>(null);
  const isOpen   = openKey === eventKey;

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, setOpenKey]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        onClick={() => setOpenKey(isOpen ? null : eventKey)}
        className="flex h-5 w-5 items-center justify-center rounded hover:bg-light-grey transition-colors text-color-base/70 hover:text-color-base"
        aria-label="More options"
      >
        <MoreVertical size={13} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-6 z-50 w-36 rounded-lg border border-default bg-white shadow-lg py-1">
          <button
            onClick={() => { onOpen(); setOpenKey(null); }}
            className="w-full px-3 py-1.5 text-left text-xs hover:bg-light-grey transition-colors"
          >
            Open design
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function UserScreen({ open, onClose, onEditUsers }: UserScreenProps) {
  const router = useRouter();

  const { data: user }             = useCurrentUser();
  /** Poll every 30 s while the panel is visible; stop when closed. */
  const POLL_MS = 30_000;

  const { data: allDesigns = [] } = useDesigns();
  const { data: inReview   = [] } = useDesigns({ status: "in_review", refetchInterval: open ? POLL_MS : false });
  const { data: approved   = [] } = useDesigns({ status: "approved",  refetchInterval: open ? POLL_MS : false });
  const { loadDesign }    = useLoadDesign();

  const beads            = useStore((s) => s.beads);
  const isDirty          = useStore((s) => s.isDirty);
  const setPendingDesign = useStore((s) => s.setPendingDesign);

  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const historyEvents = useMemo(() => buildHistory(allDesigns), [allDesigns]);

  const perms      = user?.permissions;
  const showReview = !!(perms?.is_reviewer || perms?.is_admin);
  const showPublish= !!(perms?.is_publisher || perms?.is_admin);

  // ── Design selection — delegate to global ConfirmReplaceDialog if canvas has unsaved changes ──
  function requestLoad(design: Bracelet) {
    if (isDirty) {
      setPendingDesign(design, onClose);
    } else {
      loadDesign(design);
      onClose();
    }
  }

  function handleHistoryOpen(braceletId: number) {
    const design = allDesigns.find((d) => d.id === braceletId);
    if (design) requestLoad(design);
  }

  function handleSignOut() {
    clearToken();
    onClose();
    router.push("/login");
  }

  return (
    <Panel open={open} onClose={onClose} direction="right">
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Scrollable content ───────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden px-6 py-6 gap-6">

          {/* Identity row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {user && <Avatar name={user.name} size="lg" />}
              <span className="text-sm font-semibold text-neutral-900">
                {user ? getPrimaryRole(user.permissions) : ""}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-color-base/70 hover:text-color-base/70 hover:bg-light-grey transition-colors"
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          </div>

          {/* Notifications */}
          {(showReview || showPublish) && (
            <div className="flex flex-col gap-1">
              <p className="text-color-base/70 mb-1">Notifications</p>

              {showReview && (
                <NotificationGroup
                  label="bracelets ready for review"
                  designs={inReview}
                  onSelect={requestLoad}
                />
              )}

              {showPublish && (
                <NotificationGroup
                  label="ready to publish"
                  designs={approved}
                  onSelect={requestLoad}
                />
              )}

              {(!showReview || inReview.length === 0) &&
               (!showPublish || approved.length === 0) && (
                <p className="text-sm text-color-base/70">No new notifications.</p>
              )}
            </div>
          )}

          {/* Administration actions */}
          {user?.permissions.is_admin && (
            <div className="flex flex-col gap-1">
              <p className="text-color-base/70 mb-1">Administration actions</p>
              <button
                onClick={() => onEditUsers?.()}
                className="text-left text-sm underline underline-offset-2 hover:text-color-base/70"
              >
                Edit users
              </button>
              {["View components", "View bracelets"].map((label) => (
                <button
                  key={label}
                  disabled
                  className="text-left text-sm text-color-base/70 underline underline-offset-2 cursor-not-allowed"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* History */}
          <div className="flex flex-col flex-1 min-h-0 gap-1">
            <p className="text-xs text-color-base/70 mb-1">History</p>

            {historyEvents.length === 0 ? (
              <p className="text-sm text-color-base/70">No history yet.</p>
            ) : (
              <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-0.5 -mx-2">
                {historyEvents.map((ev) => (
                  <div
                    key={ev.key}
                    className="flex flex-col gap-0.5 rounded-lg px-2 py-2 hover:bg-light-grey/50 transition-colors"
                  >
                    <p className="text-xs font-medium truncate">
                      {ev.braceletName}
                      <span className="font-normal text-color-base/70"> — {ev.label}</span>
                    </p>
                    <div className="flex items-center gap-2 text-xs text-color-base/70">
                      <span>{formatEventDate(ev.date)}</span>
                      <span>{formatEventTime(ev.date)}</span>
                      {ev.byName && (
                        <span className="text-color-base/70">By {ev.byName}</span>
                      )}
                      <div className="ml-auto">
                        <HistoryMenu
                          eventKey={ev.key}
                          openKey={openMenuKey}
                          setOpenKey={setOpenMenuKey}
                          onOpen={() => handleHistoryOpen(ev.braceletId)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Sign out ─────────────────────────────────── */}
        <div className="shrink-0 border-t border-default px-2 py-2">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleSignOut}
          >
            <LogOut size={16} />
            Sign Out
          </Button>
        </div>

      </div>
    </Panel>
  );
}