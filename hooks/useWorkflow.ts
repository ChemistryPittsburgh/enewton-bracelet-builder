/**
 * useWorkflow.ts
 *
 * All design workflow action hooks — submit, approve, reject, publish,
 * unpublish, send-to-draft, reopen, discontinue, undiscontinue, and set SKU.
 *
 * Each hook follows the same pattern: permission check → single API call →
 * invalidate the designs cache. The returned object spreads the mutation
 * plus a permission boolean for conditional UI rendering.
 *
 * Workflow transitions:
 *   draft → in_review → approved → published
 *     ↑        │            │
 *     └────────┘            │
 *     (rejected)            ↓
 *                      discontinued ↔ undiscontinued
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Standard onSuccess: invalidate both the per-design and list queries. */
function invalidateDesign(queryClient: ReturnType<typeof useQueryClient>, data: Bracelet) {
  queryClient.invalidateQueries({ queryKey: ["designs", data.id] });
  queryClient.invalidateQueries({ queryKey: ["designs"] });
}

// ── Submit ────────────────────────────────────────────────────────────────────

/**
 * POST /designs/:id/submit — submit a design for review.
 * Requires is_bracelet_editor or is_admin.
 * Design must be in "draft" or "rejected" status.
 */
export function useSubmitDesign() {
  const queryClient = useQueryClient();
  const { canSubmit } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canSubmit) throw new Error("Permission denied: is_bracelet_editor or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/submit`, { method: "POST" });
    },
    onSuccess: (data) => invalidateDesign(queryClient, data),
  });

  return { ...mutation, canSubmit };
}

// ── Approve ───────────────────────────────────────────────────────────────────

/**
 * POST /designs/:id/approve — approve a design that is in "in_review" status.
 * Requires is_reviewer or is_admin.
 */
export function useApproveDesign() {
  const queryClient = useQueryClient();
  const { canApprove } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canApprove) throw new Error("Permission denied: is_reviewer or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/approve`, { method: "POST" });
    },
    onSuccess: (data) => invalidateDesign(queryClient, data),
  });

  return { ...mutation, canApprove };
}

// ── Reject ────────────────────────────────────────────────────────────────────

/**
 * POST /designs/:id/reject — moves a design from in_review → rejected.
 * Accepts an optional reason that is stored and surfaced to the designer.
 */
export function useRejectDesign() {
  const queryClient = useQueryClient();
  const { canReview } = usePermissions();

  const mutation = useMutation({
    mutationFn({ id, reason }: { id: number; reason?: string }) {
      return apiFetch<Bracelet>(`/designs/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason ?? null }),
      });
    },
    onSuccess: (data) => invalidateDesign(queryClient, data),
  });

  return { ...mutation, canReject: canReview };
}

// ── Publish ───────────────────────────────────────────────────────────────────

/**
 * POST /designs/:id/publish — publish an approved design.
 * Requires is_publisher or is_admin.
 * Design must be "approved" and have a shopify_sku set.
 */
export function usePublishDesign() {
  const queryClient = useQueryClient();
  const { canPublish } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canPublish) throw new Error("Permission denied: is_publisher or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/publish`, { method: "POST" });
    },
    onSuccess: (data) => invalidateDesign(queryClient, data),
  });

  return { ...mutation, canPublish };
}

// ── Unpublish ─────────────────────────────────────────────────────────────────

/**
 * POST /designs/:id/unpublish — move a published design back to "draft".
 * Requires is_publisher or is_admin.
 * Design must go through the review cycle again.
 */
export function useUnPublishDesign() {
  const queryClient = useQueryClient();
  const { canUnPublish } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canUnPublish) throw new Error("Permission denied: is_publisher or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/unpublish`, { method: "POST" });
    },
    onSuccess: (data) => invalidateDesign(queryClient, data),
  });

  return { ...mutation, canUnPublish };
}

// ── Send to draft ─────────────────────────────────────────────────────────────

/**
 * POST /designs/:id/send-to-draft — move a design back to "draft" status.
 * Requires is_bracelet_editor or is_admin.
 */
export function useSendToDraft() {
  const queryClient = useQueryClient();
  const { canSendToDraft } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canSendToDraft) throw new Error("Permission denied: is_bracelet_editor or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/send-to-draft`, { method: "POST" });
    },
    onSuccess: (data) => invalidateDesign(queryClient, data),
  });

  return { ...mutation, canSendToDraft };
}

// ── Reopen ────────────────────────────────────────────────────────────────────

/**
 * POST /designs/:id/reopen — moves a rejected design back to "draft"
 * so it can be revised and resubmitted.
 *
 * Note: useSendToDraft (POST /designs/:id/send-to-draft) returns 422 for
 * rejected designs — it only handles the approved → draft transition.
 */
export function useReopenDesign() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      return apiFetch<Bracelet>(`/designs/${id}/reopen`, { method: "POST" });
    },
    onSuccess: (data) => invalidateDesign(queryClient, data),
  });

  return { ...mutation, canReopen: canEdit };
}

// ── Discontinue ───────────────────────────────────────────────────────────────

/**
 * POST /designs/:id/discontinue — sets is_discontinued = 1.
 * Admin-only.
 */
export function useDiscontinueDesign() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!isAdmin) throw new Error("Permission denied: admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/discontinue`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canDiscontinue: isAdmin };
}

// ── Undiscontinue ─────────────────────────────────────────────────────────────

/**
 * Reactivates a discontinued bracelet back to "published".
 * Admin-only.
 */
export function useUndiscontinueDesign() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!isAdmin) throw new Error("Permission denied: admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/undiscontinue`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canUndiscontinue: isAdmin };
}

// ── Set SKU ───────────────────────────────────────────────────────────────────

/**
 * PUT /designs/:id/sku — set the Shopify SKU for a design.
 * Requires is_publisher or is_admin.
 * SKU must be unique across all designs.
 * Required before a design can be published.
 */
export function useSetDesignSku() {
  const queryClient = useQueryClient();
  const { canSetSku } = usePermissions();

  const mutation = useMutation({
    mutationFn({ id, shopify_sku }: { id: number; shopify_sku: string }) {
      if (!canSetSku) throw new Error("Permission denied: is_publisher or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/sku`, {
        method: "PUT",
        body: JSON.stringify({ shopify_sku }),
      });
    },
    onSuccess: (data) => invalidateDesign(queryClient, data),
  });

  return { ...mutation, canSetSku };
}