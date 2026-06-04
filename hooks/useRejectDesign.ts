import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

/**
 * POST /designs/:id/reject — reject a design that is in "in_review" status.
 * Requires is_reviewer or is_admin.
 * TODO: add comment/reason field once backend supports it.
 *
 * Returns the mutation plus `canReject` for conditional UI rendering.
 */
export function useRejectDesign() {
  const queryClient = useQueryClient();
  const { canReject } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canReject) throw new Error("Permission denied: is_reviewer or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/reject`, { method: "POST" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["designs", data.id] });
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canReject };
}
