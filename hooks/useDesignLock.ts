"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLockDesign } from "@/hooks/useLockDesign";
import { useReleaseLock } from "@/hooks/useReleaseLock";
import { useDesignHeartbeat } from "@/hooks/useDesignHeartbeat";
import { useLoadDesign } from "@/hooks/useLoadDesign";
import { usePusherDesign } from "@/hooks/usePusherDesign";

import type { Bracelet, DesignComment } from "@/types";

interface UseDesignLockArgs {
  activeDesignId: number | null;
  savedDesign: Bracelet | undefined;
  designFetching: boolean;
}

/**
 * Owns everything about the active design's lock + realtime state: optimistic
 * lock acquisition, server confirmation via active_lock, heartbeat-based kicks,
 * Pusher events (lock/update/comment cache sync), and approve/publish status
 * transition detection. Returns the derived read-only state plus the modal
 * flags BuilderLayout renders.
 */
export function useDesignLock({ activeDesignId, savedDesign, designFetching }: UseDesignLockArgs) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const [lockHeld,              setLockHeld]              = useState(false);
  const [kickedNotification,    setKickedNotification]    = useState(false);
  const [showKickedModal,       setShowKickedModal]       = useState(false);
  const [showStatusLockedModal, setShowStatusLockedModal] = useState(false);
  const [statusLockedTo,        setStatusLockedTo]        = useState<"approved" | "published" | null>(null);
  const prevDesignIdRef      = useRef<number | null>(null);
  const knownDesignStatusRef = useRef<Map<number, string>>(new Map());
  const { mutate: releaseLock } = useReleaseLock();
  const { mutateAsync: acquireLock } = useLockDesign();
  const { syncDesign } = useLoadDesign();

  // Release the previous lock and optimistically set lockHeld whenever
  // activeDesignId changes. Setting lockHeld immediately (before savedDesign
  // loads) means the banner appears with no network delay.
  useEffect(() => {
    const prevId = prevDesignIdRef.current;
    prevDesignIdRef.current = activeDesignId;

    if (prevId !== null && prevId !== activeDesignId) {
      releaseLock(prevId);
      setKickedNotification(false);
      setShowKickedModal(false);
    }

    if (activeDesignId === null) {
      setLockHeld(false);
    } else if (!lockHeld) {
      setLockHeld(true); // optimistic — confirmed by the server effect below
    }
  }, [activeDesignId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLockableStatus = savedDesign != null && savedDesign.status !== "published";

  // Once savedDesign loads: use active_lock from the GET response to determine
  // lock ownership without an extra network round-trip where possible.
  useEffect(() => {
    if (!activeDesignId || !savedDesign || savedDesign.id !== activeDesignId) return;

    // Stale React Query cache can contain an outdated active_lock or status
    // that would call setLockHeld(false) in the same React batch as the
    // optimistic setLockHeld(true) above — last writer wins, banner never shows.
    // Wait until the GET response is settled before making any lock decisions.
    if (designFetching) return;

    if (!isLockableStatus) {
      setLockHeld(false); // published — release the optimistic lock
      syncDesign(savedDesign);
      return;
    }

    // Guard: without this, active_lock=null + currentUser=undefined collapses to
    // undefined===undefined → true → skips the POST that would acquire the lock.
    if (!currentUser) return;

    // Don't re-acquire after being kicked — the admin still holds the lock and
    // releasing it would re-trigger this effect with active_lock=null, causing
    // the kicked user to silently re-acquire and show both banners at once.
    if (kickedNotification) return;

    const activeLock = savedDesign.active_lock;

    if (activeLock?.user_id === currentUser.id) {
      // Server confirms we hold the lock. Restore banner if stale data previously
      // set lockHeld=false (e.g. old active_lock showed a different user).
      if (!lockHeld) setLockHeld(true);
      return;
    }

    if (activeLock != null) {
      // Another user holds the lock — release the optimistic assumption.
      setLockHeld(false);
      syncDesign(savedDesign);
      return;
    }

    // No active lock — acquire it. Explicitly set true/false so a prior false
    // (from stale cached data) is corrected if the POST succeeds.
    acquireLock({ id: activeDesignId })
      .then((result) => { setLockHeld(result.acquired); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDesignId, savedDesign?.id, savedDesign?.status, savedDesign?.active_lock?.user_id, currentUser?.id, designFetching, kickedNotification]);

  // Editing is locked by workflow status, by another user holding the lock,
  // or when this user has been kicked off the design.
  // Use active_lock from the API response to determine read-only state rather
  // than relying on !lockHeld && !designFetching, which flashes read-only for
  // one render when cached savedDesign arrives before the optimistic lockHeld
  // effect fires. When active_lock is null the lock is not yet confirmed (may
  // be in acquisition) so we optimistically show the editing state.
  const lockedByOther =
    !lockHeld &&
    isLockableStatus &&
    currentUser != null &&
    savedDesign?.active_lock?.user_id != null &&
    savedDesign.active_lock.user_id !== currentUser.id;

const isLocked =
  savedDesign?.status === "in_review" ||   // ← add this line
  savedDesign?.status === "approved" ||
  savedDesign?.status === "published" ||
  kickedNotification ||
  lockedByOther;

  useDesignHeartbeat(
    (isLockableStatus && !kickedNotification && lockHeld) ? activeDesignId : null,
    () => {
      setLockHeld(false);
      setKickedNotification(true);
      setShowKickedModal(true);
      // Immediately refresh savedDesign so the modal can show who took over.
      if (activeDesignId !== null) {
        queryClient.invalidateQueries({ queryKey: ["designs", activeDesignId] });
      }
    },
  );

  // Real-time design events via Pusher — replaces the 30s polling-based sync.
  usePusherDesign(activeDesignId, {
    onUpdated: (design) => {
      // Keep read-only viewers' canvas in sync when the lock holder saves.
      if (!lockHeld) syncDesign(design);
      // Write the event payload directly into the cache instead of invalidating:
      // avoids a network round-trip and prevents the lock effect re-running
      // (which would call syncDesign a second time for read-only viewers).
      if (activeDesignId !== null) {
        queryClient.setQueryData(["designs", activeDesignId], design);
      }
    },
    onLockTaken: () => {
      // Admin force-took the lock — instant kick without waiting for heartbeat.
      setLockHeld(false);
      setKickedNotification(true);
      setShowKickedModal(true);
      if (activeDesignId !== null) {
        queryClient.invalidateQueries({ queryKey: ["designs", activeDesignId] });
      }
    },
    onLockChanged: () => {
      // Lock acquired or released — invalidate the list so SavedDesignsScreen
      // badge clears, plus the per-design query for the lock state detail.
      queryClient.invalidateQueries({ queryKey: ["designs"] });
      if (activeDesignId !== null) {
        queryClient.invalidateQueries({ queryKey: ["designs", activeDesignId] });
      }
    },
    onReconnected: () => {
      // Re-sync after network outage — events fired while offline are lost.
      // Prefix match also covers ["designs", activeDesignId, "comments"].
      if (activeDesignId !== null) {
        queryClient.invalidateQueries({ queryKey: ["designs", activeDesignId] });
      }
    },
    onCommentCreated: (comment) => {
      if (activeDesignId !== null) {
        queryClient.setQueryData<DesignComment[]>(
          ["designs", activeDesignId, "comments"],
          (prev = []) => [...prev, comment],
        );
      }
    },
    onCommentUpdated: (comment) => {
      if (activeDesignId !== null) {
        queryClient.setQueryData<DesignComment[]>(
          ["designs", activeDesignId, "comments"],
          (prev = []) => prev.map((c) => (c.id === comment.id ? comment : c)),
        );
      }
    },
    onCommentDeleted: (commentId) => {
      if (activeDesignId !== null) {
        queryClient.setQueryData<DesignComment[]>(
          ["designs", activeDesignId, "comments"],
          (prev = []) => prev.filter((c) => c.id !== commentId),
        );
      }
    },
  });

  // Detect when the design is approved/published while this user is viewing it.
  // Uses a per-design status map so loading an already-locked design never
  // falsely triggers the modal (only a live transition does).
  useEffect(() => {
    if (!activeDesignId || !savedDesign?.status) return;

    const newStatus = savedDesign.status;
    const knownStatus = knownDesignStatusRef.current.get(activeDesignId);

    if (knownStatus === undefined) {
      knownDesignStatusRef.current.set(activeDesignId, newStatus);
      return;
    }

    knownDesignStatusRef.current.set(activeDesignId, newStatus);
    if (knownStatus === newStatus) return;

    if (
      (newStatus === "approved" || newStatus === "published") &&
      knownStatus !== "approved" && knownStatus !== "published"
    ) {
      setLockHeld(false);
      setShowStatusLockedModal(true);
      setStatusLockedTo(newStatus as "approved" | "published");
    }
  }, [savedDesign?.status, activeDesignId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Visibility-change re-sync ─────────────────────────────────────────────
  // Catch up on missed events immediately when the tab regains focus, without
  // waiting for Pusher's reconnect + re-auth round-trip to complete.
  useEffect(() => {
    function handleVisible() {
      if (document.visibilityState === "visible" && activeDesignId !== null) {
        queryClient.invalidateQueries({ queryKey: ["designs", activeDesignId] });
      }
    }
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, [activeDesignId, queryClient]);

  function handleRetryLock() {
    setKickedNotification(false);
    setShowKickedModal(false);
  }

  return {
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
  };
}