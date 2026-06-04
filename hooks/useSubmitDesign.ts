import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

/**
 * POST /designs/:id/submit — submit a design for review.
 * Requires is_bracelet_editor or is_admin.
 * Design must be in "draft" or "rejected" status.
 *
 * Returns the mutation plus `canSubmit` for conditional UI rendering.
 */
export function useSubmitDesign() {
  const queryClient = useQueryClient();
  const { canSubmit } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canSubmit) throw new Error("Permission denied: is_bracelet_editor or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/submit`, { method: "POST" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["designs", data.id] });
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canSubmit };
}
