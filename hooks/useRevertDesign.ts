import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Bracelet } from "@/types";

/**
 * POST /designs/:id/revert — move an approved design back to "draft".
 * Requires is_publisher or is_admin.
 * Removes the approval so the design must go through the review cycle again.
 *
 * Returns the mutation plus `canRevert` for conditional UI rendering.
 */
export function useRevertDesign() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const canRevert =
    (user?.permissions.is_publisher || user?.permissions.is_admin) ?? false;

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canRevert) throw new Error("Permission denied: is_publisher or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/revert`, { method: "POST" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["designs", data.id] });
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canRevert };
}
