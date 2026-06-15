"use client";
import { usePusherConnectionStatus } from "@/hooks/usePusherConnectionStatus";

export function PusherStatusBadge() {
  const connected = usePusherConnectionStatus();
  if (connected) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2 py-0.5 text-[11px] font-semibold text-error">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-error" />
      Live updates paused
    </span>
  );
}
