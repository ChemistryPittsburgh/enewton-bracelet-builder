"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  ChevronRight,
  LayoutTemplate,
  LogOut,
  MoreVertical,
  Palette,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useStore } from "@/lib/store";
import { clearToken } from "@/lib/auth";
import { disconnectPusher } from "@/lib/pusher";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tooltip } from "@/components/ui/Tooltip";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDesigns } from "@/hooks/useDesigns";
import { useLoadDesign } from "@/hooks/useLoadDesign";
import { useIsDirty } from "@/hooks/useIsDirty";
import { getPrimaryRole } from "@/hooks/usePermissions";
import { useBeads } from "@/hooks/useBeads";

import type { Bracelet } from "@/types";
import type { BeadProduct } from "@/types";

import { PERMISSION_FIELDS } from "@/components/builder/users/PermissionsDropdown";

interface UserPanelProps {
  open: boolean;
  onClose: () => void;
  onEditUsers?: () => void;
  onManageBeads?: () => void;
  onManageSeedColors?: () => void;
  onManagePatterns?: () => void;
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

function buildHistory(designs: Bracelet[], beads: BeadProduct[] = []): HistoryEvent[] {
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

  // Bead events
  for (const b of beads) {
    if (b.created_at) {
      events.push({
        key: `bead-${b.id}-created`,
        label: "Bead uploaded",
        braceletName: b.name,
        date: b.created_at,
        byName: null,
        braceletId: -1,        
      });
    }
    if (b.updated_at && b.updated_at !== b.created_at) {
      events.push({
        key: `bead-${b.id}-updated`,
        label: "Bead updated",
        braceletName: b.name,
        date: b.updated_at,
        byName: null,
        braceletId: -1,
      });
    }
  }

  events.sort((a, b) => b.date.localeCompare(a.date));
  return events.slice(0, 50);
}

// ── Administration action row ────────────────────────────────────────────────

function AdminAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-color-base hover:bg-light-grey transition-colors"
    >
      <Icon size={16} className="shrink-0 text-color-base/60" />
      <span className="flex-1 truncate">{label}</span>
      <ChevronRight size={14} className="shrink-0 text-color-base/40" />
    </button>
  );
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
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-light-grey transition-colors"
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-light-grey flex items-center justify-center">
        {design.preview_image_url ? (
          <img
            src={design.preview_image_url}
            alt={design.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-5 w-5 rounded-full border border-dashed border-color-base/30" />
        )}
      </div>
      <span className="flex-1 truncate text-xs font-medium text-color-base">
        {design.name}
      </span>
      <ChevronRight size={13} className="shrink-0 text-color-base/40" />
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
    <div className="flex flex-col gap-0.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-color-base hover:bg-light-grey transition-colors"
      >
        <span className="text-error text-xs leading-none">●</span>
        <span className="flex-1 text-left">
          <span className="font-semibold">{count}</span> {label}
        </span>
        <ChevronRight
          size={14}
          className={`shrink-0 text-color-base/50 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="ml-4 mt-1 flex flex-col gap-0.5">
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
        className="flex h-5 w-5 items-center justify-center rounded hover:bg-light-grey transition-colors text-color-base/40 hover:text-color-base"
        aria-label="More options"
      >
        <MoreVertical size={13} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-6 z-50 w-36 rounded-lg border border-default bg-white shadow-lg py-1">
          <button
            onClick={() => { onOpen(); setOpenKey(null); }}
            className="w-full px-3 py-1.5 text-left text-xs text-color-base hover:bg-light-grey transition-colors"
          >
            Open design
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function UserPanel({ open, onClose, onEditUsers, onManageBeads, onManageSeedColors, onManagePatterns }: UserPanelProps) {
  const router = useRouter();

  const { data: user }             = useCurrentUser();

  const { data: allDesigns = [] } = useDesigns({ enabled: open });
  const { data: beadList = [] } = useBeads();
  const { loadDesign }    = useLoadDesign();

  const beads            = useStore((s) => s.beads);
  const isDirty          = useIsDirty();
  const setPendingDesign = useStore((s) => s.setPendingDesign);

  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const historyEvents = useMemo(() => buildHistory(allDesigns, beadList), [allDesigns, beadList]);

  const perms      = user?.permissions;
  const showReview = !!(perms?.is_reviewer || perms?.is_admin);
  const showPublish= !!(perms?.is_publisher || perms?.is_admin);

  const inReview = useMemo(
    () => (showReview ? allDesigns.filter((d) => d.status === "in_review") : []),
    [allDesigns, showReview],
  );
  const approved = useMemo(
    () => (showPublish ? allDesigns.filter((d) => d.status === "approved") : []),
    [allDesigns, showPublish],
  );

  // ── Design selection — delegate to global ConfirmReplaceDialog if canvas has unsaved changes ──
  async function requestLoad(design: Bracelet) {
    if (isDirty) {
      setPendingDesign(design, onClose);
    } else {
      const success = await loadDesign(design);
      if (success) onClose();
    }
  }

  function handleHistoryOpen(braceletId: number) {
    const design = allDesigns.find((d) => d.id === braceletId);
    if (design) requestLoad(design);
  }

  function handleSignOut() {
    clearToken();
    disconnectPusher();
    onClose();
    router.push("/login");
  }

  return (
    <Panel open={open} onClose={onClose} direction="right">
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Scrollable content ───────────────────────── */}
        <div className="flex flex-col flex-1 overflow-y-scroll pt-6 pb-4 gap-6">

          {/* Identity row */}
          <div className="border-b border-default">
            {user && (
              <div className="flex items-center justify-between gap-3 px-6 pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={user.name} size="lg" />
                  <h3 className="min-w-0 truncate text-sm font-semibold">
                    {user.name}
                  </h3>
                  {/* Role badge — color driven by PERMISSION_FIELDS in category-colors */}
                  {(() => {
                    const role  = getPrimaryRole(user.permissions);
                    const entry = PERMISSION_FIELDS.find((f) => f.label === role);
                    return (
                      <span className={`shrink-0 text-center rounded-[2px] border border-navy px-3 py-0.5 text-xs font-medium ${entry?.color ?? "bg-gold/30"}`}>
                        {role}
                      </span>
                    );
                    })()}
                </div>
                <Tooltip content="Close User Panel">
                  <button
                    onClick={onClose}
                    className="shrink-0 rounded-md p-1 text-color-base/40 hover:text-color-base hover:bg-light-grey transition-colors"
                    aria-label="Close panel"
                  >
                    <X size={16} />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>

          <div className="px-6 flex flex-col flex-1 gap-6">

            {/* Notifications */}
            {(showReview || showPublish) && (
              <div className="flex flex-col gap-1">
                <SectionHeading>Notifications</SectionHeading>

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
                  <p className="px-2 text-sm text-color-base/50">No new notifications.</p>
                )}
              </div>
            )}

            {/* Administration actions */}
            {(user?.permissions.is_admin || user?.permissions.is_component_admin) && (
              <div className="flex flex-col gap-0.5">
                <SectionHeading>Administration actions</SectionHeading>
                {user?.permissions.is_admin && (
                  <AdminAction icon={Users} label="Manage Users" onClick={() => onEditUsers?.()} />
                )}
                {user?.permissions.is_admin && (
                  <AdminAction icon={Palette} label="Manage Seed Bead Colors" onClick={() => onManageSeedColors?.()} />
                )}
                <AdminAction icon={Boxes} label="Manage Inventory" onClick={() => onManageBeads?.()} />
                <AdminAction icon={LayoutTemplate} label="Manage Patterns" onClick={() => onManagePatterns?.()} />
              </div>
            )}

            {/* History */}
            <div className="flex flex-col flex-1 max-h-[45vh] gap-1">
              <SectionHeading>History</SectionHeading>

              {historyEvents.length === 0 ? (
                <p className="text-sm text-color-base/70">No history yet.</p>
              ) : (
                <div className="flex-1 overflow-y-auto min-h-0 flex flex-col border border-default rounded-[2px] py-2 px-4">
                  {historyEvents.map((ev, i, arr) => (
                    <div key={ev.key} className="flex gap-3">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-navy" />
                        {i < arr.length - 1 && <div className="my-1 w-px flex-1 bg-black/50" />}
                      </div>
                      {/* Content */}
                      <div className="pb-3 flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {ev.braceletName}
                          <span className="font-normal text-color-base/70"> — {ev.label}</span>
                        </p>
                        <div className="flex items-center gap-2 text-xs text-color-base/70">
                          <span>{formatEventDate(ev.date)}</span>
                          <span>{formatEventTime(ev.date)}</span>
                          {ev.byName && <span>By {ev.byName}</span>}
                          {ev.braceletId !== -1 && (
                            <div className="ml-auto">
                              <HistoryMenu
                                eventKey={ev.key}
                                openKey={openMenuKey}
                                setOpenKey={setOpenMenuKey}
                                onOpen={() => handleHistoryOpen(ev.braceletId)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sign out ─────────────────────────────────── */}
        <div className="shrink-0 border-t border-default px-4 lg:px-6 py-3">
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