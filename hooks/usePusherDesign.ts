import { useEffect, useRef } from "react";
import { getPusher } from "@/lib/pusher";
import type { Bracelet } from "@/types";

interface LockPayload {
  user_id: number | null;
  user_name: string | null;
}

interface LockTakenPayload {
  user_id: number;
  user_name: string;
}

interface PusherDesignCallbacks {
  onUpdated?: (design: Bracelet) => void;
  onLockTaken?: (by: LockTakenPayload) => void;
  onLockChanged?: (lock: LockPayload) => void;
  /** Called when the Pusher connection (re)connects — use to re-fetch any
   *  state that may have been missed while the socket was offline. */
  onReconnected?: () => void;
}

/**
 * Subscribe to the per-design Pusher channel (`private-design-{id}`).
 *
 * Callbacks are ref-wrapped to avoid stale closures — pass them as inline
 * objects without useMemo; the channel subscription won't churn.
 *
 * Events:
 *  - design.updated     → onUpdated (another user saved)
 *  - design.lock-taken  → onLockTaken (admin force-took the lock)
 *  - design.lock-changed → onLockChanged (lock acquired or released)
 *  - pusher connected   → onReconnected (socket reconnected after outage)
 */
export function usePusherDesign(
  designId: number | null,
  callbacks: PusherDesignCallbacks,
): void {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    if (!designId) return;

    const channelName = `private-design-${designId}`;
    const pusher = getPusher();
    const channel = pusher.subscribe(channelName);

    channel.bind("design.updated", (data: { design: Bracelet }) => {
      cbRef.current.onUpdated?.(data.design);
    });

    channel.bind("design.lock-taken", (data: LockTakenPayload) => {
      cbRef.current.onLockTaken?.(data);
    });

    channel.bind("design.lock-changed", (data: LockPayload) => {
      cbRef.current.onLockChanged?.(data);
    });

    const onReconnected = () => cbRef.current.onReconnected?.();
    pusher.connection.bind("connected", onReconnected);

    return () => {
      channel.unbind("design.updated");
      channel.unbind("design.lock-taken");
      channel.unbind("design.lock-changed");
      pusher.connection.unbind("connected", onReconnected);
      pusher.unsubscribe(channelName);
    };
  }, [designId]);
}
