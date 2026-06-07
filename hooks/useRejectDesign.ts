import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

/**
 * POST /designs/:id/reject
 * Moves a design from in_review → rejected.
 * Accepts an optional reason that is stored and surfaced to the designer.
 *
 * Clinton: the endpoint should accept { reason?: string | null } in the body
 * and write it to the rejection_reason column alongside rejected_at / rejected_by.
 */
export function useRejectDesign() {
  const queryClient = useQueryClient();
  const { isAdmin, canReview } = usePermissions();

  const mutation = useMutation({
    mutationFn({ id, reason }: { id: number; reason?: string }) {
      return apiFetch<Bracelet>(`/designs/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason ?? null }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
      queryClient.invalidateQueries({ queryKey: ["design"] });
    },
  });

  return { ...mutation, canReject: isAdmin || canReview };
}