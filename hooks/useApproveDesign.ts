import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Bracelet } from "@/types";

/**
 * POST /designs/:id/approve — approve a design that is in "in_review" status.
 * Requires is_reviewer.
 *
 * Returns the mutation plus `canApprove` for conditional UI rendering.
 */
export function useApproveDesign() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const canApprove = user?.permissions.is_reviewer ?? false;

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canApprove) throw new Error("Permission denied: is_reviewer required.");
      return apiFetch<Bracelet>(`/designs/${id}/approve`, { method: "POST" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["designs", data.id] });
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canApprove };
}
