"use client";
import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDesigns } from "./useDesigns";
import { usePermissions } from "./usePermissions";
import { getPusher } from "@/lib/pusher";

/**
 * Single source of truth for notification data used by the header badge
 * (BuilderLayout) and the notification lists (UserScreen).
 *
 * React Query fetches the initial state; Pusher's `design.status-changed`
 * event invalidates the cache whenever a workflow transition happens,
 * replacing the old 30-second polling loop.
 */
export function useNotifications() {
  const { canReview, canPublish } = usePermissions();
  const queryClient = useQueryClient();

  const { data: allDesigns = [] } = useDesigns({
    enabled: canReview || canPublish,
  });

  useEffect(() => {
    if (!canReview && !canPublish) return;

    const pusher = getPusher();
    const channel = pusher.subscribe("private-designs");

    channel.bind("design.status-changed", () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    });

    return () => {
      channel.unbind("design.status-changed");
      pusher.unsubscribe("private-designs");
    };
  }, [canReview, canPublish, queryClient]);

  const inReviewDesigns = useMemo(
    () => (canReview ? allDesigns.filter((d) => d.status === "in_review") : []),
    [allDesigns, canReview],
  );
  const approvedDesigns = useMemo(
    () => (canPublish ? allDesigns.filter((d) => d.status === "approved") : []),
    [allDesigns, canPublish],
  );

  return {
    inReviewDesigns,
    approvedDesigns,
    inReviewCount: inReviewDesigns.length,
    approvedCount: approvedDesigns.length,
  };
}
