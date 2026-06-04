import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

/**
 * POST /designs/:id/unpublish — move a published design back to "draft".
 * Requires is_publisher or is_admin.
 * Removes the published status so the design must go through the review cycle again.
 *
 * Returns the mutation plus `canUnPublish` for conditional UI rendering.
 */
export function useUnPublishDesign() {
  const queryClient = useQueryClient();
  const { canUnPublish } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!canUnPublish) throw new Error("Permission denied: is_publisher or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/unpublish`, { method: "POST" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["designs", data.id] });
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canUnPublish };
}
