import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Bracelet } from "@/types";

/**
 * POST /designs/:id/publish — publish an approved design.
 * Requires is_publisher.
 * Design must be "approved" and have a shopify_sku set.
 *
 * Returns the mutation plus `canPublish` for conditional UI rendering.
 */
export function usePublishDesign() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const canPublish = user?.permissions.is_publisher ?? false;

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canPublish) throw new Error("Permission denied: is_publisher required.");
      return apiFetch<Bracelet>(`/designs/${id}/publish`, { method: "POST" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["designs", data.id] });
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canPublish };
}
