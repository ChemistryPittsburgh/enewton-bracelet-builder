import { useEffect, useRef } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { handleQueryError } from "@/lib/query-client";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * While `designId` is non-null, sends a heartbeat POST /designs/:id/lock
 * every 30 seconds to keep the edit lock alive.
 *
 * Calls `onKicked` if the server returns 409 — meaning another user has
 * taken over the lock (e.g. an admin force-took it).
 */
export function useDesignHeartbeat(
  designId: number | null,
  onKicked: () => void,
): void {
  const onKickedRef = useRef(onKicked);
  onKickedRef.current = onKicked;

  useEffect(() => {
    if (!designId) return;

    const tick = async () => {
      try {
        const json = await apiFetch<{ acquired: boolean }>(`/designs/${designId}/lock`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        if (!json.acquired) onKickedRef.current();
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          onKickedRef.current();
        }
        handleQueryError(err); // 401 → terminates session; no-op for other statuses
        // Non-auth, non-409 errors are silently ignored — lock TTL provides the backstop
      }
    };

    const id = setInterval(tick, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [designId]);
}
