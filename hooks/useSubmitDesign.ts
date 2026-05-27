import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Bracelet } from "@/types";

/**
 * POST /designs/:id/submit — submit a design for review.
 * Requires is_bracelet_editor.
 * Design must be in "draft" or "rejected" status.
 *
 * Returns the mutation plus `canSubmit` for conditional UI rendering.
 */
export function useSubmitDesign() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const canSubmit = user?.permissions.is_bracelet_editor ?? false;

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canSubmit) throw new Error("Permission denied: is_bracelet_editor required.");
      return apiFetch<Bracelet>(`/designs/${id}/submit`, { method: "POST" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["designs", data.id] });
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canSubmit };
}
