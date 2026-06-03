import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Bracelet, UpdateDesignRequest } from "@/types";

/**
 * PUT /designs/:id — update name, description, or configuration.
 * Requires is_bracelet_editor or is_admin.
 * Cannot edit designs with status "approved" or "published".
 * Editing a rejected design automatically resets its status to "draft".
 *
 * Returns the mutation plus `canUpdate` for conditional UI rendering.
 */
export function useUpdateDesign() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const canUpdate =
    (user?.permissions.is_bracelet_editor || user?.permissions.is_admin) ?? false;

  const mutation = useMutation({
    mutationFn({ id, ...body }: UpdateDesignRequest) {
      if (!canUpdate) throw new Error("Permission denied: is_bracelet_editor or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["designs", data.id] });
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canUpdate };
}
