"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotificationCounts } from "./useNotificationCounts";
import { usePermissions } from "./usePermissions";
import { getPusher } from "@/lib/pusher";

/**
 * Single source of truth for notification badge counts used by BuilderLayout.
 *
 * Fetches a lightweight counts-only endpoint instead of the full designs list.
 * Pusher's `design.status-changed` event invalidates the cache whenever a
 * workflow transition happens.
 */
export function useNotifications() {
  const { canReview, canPublish } = usePermissions();
  const queryClient = useQueryClient();
  const enabled = canReview || canPublish;

  const { data } = useNotificationCounts(enabled);

  useEffect(() => {
    if (!enabled) return;

    const pusher = getPusher();
    const channel = pusher.subscribe("private-designs");

    const onStatusChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["design-counts"] });
    };
    channel.bind("design.status-changed", onStatusChanged);

    let subscribed = false;
    const onResubscribed = () => {
      if (subscribed) onStatusChanged();
      subscribed = true;
    };
    channel.bind("pusher:subscription_succeeded", onResubscribed);

    return () => {
      channel.unbind("design.status-changed", onStatusChanged);
      channel.unbind("pusher:subscription_succeeded", onResubscribed);
      pusher.unsubscribe("private-designs");
    };
  }, [enabled, queryClient]);

  return {
    inReviewCount: (canReview ? data?.in_review : 0) ?? 0,
    approvedCount: (canPublish ? data?.approved : 0) ?? 0,
  };
}
