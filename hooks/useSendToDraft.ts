import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

/**
 * POST /designs/:id/send-to-draft — move a design back to "draft" status.
 * Requires is_bracelet_editor or is_admin.
 *
 * Returns the mutation plus `canSendToDraft` for conditional UI rendering.
 */
export function useSendToDraft() {
  const queryClient = useQueryClient();
  const { canSendToDraft } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canSendToDraft) throw new Error("Permission denied: is_bracelet_editor or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/send-to-draft`, { method: "POST" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["designs", data.id] });
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canSendToDraft };
}
