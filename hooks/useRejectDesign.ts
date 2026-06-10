import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

/**
 * POST /designs/:id/reject
 * Moves a design from in_review → rejected.
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["designs", data.id] });
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canReject: canReview };
}