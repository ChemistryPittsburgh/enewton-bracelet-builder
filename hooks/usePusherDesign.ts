import { useEffect, useRef } from "react";
import { getPusher } from "@/lib/pusher";
import type { Bracelet, DesignComment } from "@/types";

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
  onCommentCreated?: (comment: DesignComment) => void;
  onCommentUpdated?: (comment: DesignComment) => void;
  onCommentDeleted?: (commentId: number) => void;
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

    channel.bind("comment.created", (data: { design_id: number; comment: DesignComment }) => {
      cbRef.current.onCommentCreated?.(data.comment);
    });

    channel.bind("comment.updated", (data: { design_id: number; comment: DesignComment }) => {
      cbRef.current.onCommentUpdated?.(data.comment);
    });

    channel.bind("comment.deleted", (data: { design_id: number; comment_id: number }) => {
      cbRef.current.onCommentDeleted?.(data.comment_id);
    });

    // Skip the first subscription_succeeded (initial page load — nothing to
    // catch up on). Fire onReconnected on every subsequent confirmation, which
    // covers re-subscriptions after a network outage.
    let subscribed = false;
    channel.bind("pusher:subscription_succeeded", () => {
      if (subscribed) cbRef.current.onReconnected?.();
      subscribed = true;
    });

    return () => {
      channel.unbind("design.updated");
      channel.unbind("design.lock-taken");
      channel.unbind("design.lock-changed");
      channel.unbind("comment.created");
      channel.unbind("comment.updated");
      channel.unbind("comment.deleted");
      channel.unbind("pusher:subscription_succeeded");
      pusher.unsubscribe(channelName);
    };
  }, [designId]);
}
