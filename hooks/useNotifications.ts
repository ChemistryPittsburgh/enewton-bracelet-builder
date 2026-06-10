"use client";
import { useMemo } from "react";
import { useDesigns } from "./useDesigns";
import { usePermissions } from "./usePermissions";

/**
 * Single source of truth for notification data used by the header badge
 * (BuilderLayout) and the notification lists (UserScreen).
 *
 * Polls GET /designs every 30 s while the current user is a reviewer or
 * publisher. React Query deduplicates the subscription across callers —
 * one network request, shared cache, both consumers always in sync.
 */
export function useNotifications() {
  const { canReview, canPublish } = usePermissions();
  const { data: allDesigns = [] } = useDesigns({
    enabled: canReview || canPublish,
    refetchInterval: 30_000,
  });

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
