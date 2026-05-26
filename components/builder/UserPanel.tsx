"use client";

import { useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { clearToken } from "@/lib/auth";
import type { User } from "@/types";

interface UserPanelProps {
  open: boolean;
  onClose: () => void;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPrimaryRole(permissions: User["permissions"]): string {
  if (permissions.is_admin) return "Admin";
  if (permissions.is_publisher) return "Publisher";
  if (permissions.is_reviewer) return "Reviewer";
  if (permissions.is_bracelet_editor) return "Bracelet Editor";
  if (permissions.is_component_admin) return "Component Admin";
  return "User";
}

export function UserPanel({ open, onClose }: UserPanelProps) {
  const router = useRouter();
  const { data: user } = useCurrentUser();

  function handleSignOut() {
    clearToken();
    onClose();
    router.push("/login");
  }

  return (
    <Panel open={open} onClose={onClose} direction="right">
      <div className="flex flex-col flex-1 overflow-hidden px-8 py-10 gap-6">

        {/* ── Identity row ─────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shrink-0"
              style={{ backgroundColor: "#7F7F7F" }}
            >
              {user ? getInitials(user.name) : "?"}
            </div>
            <span className="text-sm font-semibold text-neutral-900">
              {user ? getPrimaryRole(user.permissions) : ""}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Notifications ────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <p className="text-xs text-neutral-500 mb-1">Notifications</p>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-red-500 text-xs leading-none">●</span>
            <a href="#" className="text-sm text-neutral-800 underline underline-offset-2 hover:text-neutral-600">
              4 bracelets ready for review
            </a>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-red-500 text-xs leading-none">●</span>
            <a href="#" className="text-sm text-neutral-800 underline underline-offset-2 hover:text-neutral-600">
              3 ready to publish
            </a>
          </div>
        </div>

        {/* ── Administration actions ───────────────────── */}
        {user?.permissions.is_admin && (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-neutral-500 mb-1">Administration actions</p>
            {["Users", "Components", "Bracelets"].map((label) => (
              <a
                key={label}
                href="#"
                className="text-sm text-neutral-800 underline underline-offset-2 hover:text-neutral-600"
              >
                {label}
              </a>
            ))}
          </div>
        )}

        {/* ── History ──────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-h-0 gap-1">
          <p className="text-xs text-neutral-500 mb-1">History</p>
          <div className="flex-1 rounded-lg bg-neutral-100 min-h-0" />
        </div>

      </div>

      {/* ── Sign out ─────────────────────────────────── */}
      <div className="shrink-0 border-t border-neutral-100 px-2 py-2">
        <Button
          variant="danger"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleSignOut}
        >
          <LogOut size={16} />
          Sign Out
        </Button>
      </div>
    </Panel>
  );
}
