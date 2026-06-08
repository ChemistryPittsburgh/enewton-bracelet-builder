import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

/**
 * Moves a rejected design back to "draft" so it can be revised and resubmitted.
 *
 * Requires a dedicated endpoint:
 *   POST /designs/:id/reopen
 * which should set status = "draft".
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canReopen: canEdit };
}