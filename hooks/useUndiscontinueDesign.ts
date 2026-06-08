import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

/**
 * Reactivates a discontinued bracelet back to "published".
 * Admin-only.
 *
 * Attempts POST /designs/:id with { is_discontinued: 0, status: "published" }.
 */
export function useUndiscontinueDesign() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!isAdmin) throw new Error("Permission denied: admin required.");
      return apiFetch<Bracelet>(`/designs/${id}`, {
        method: "POST",
        body: JSON.stringify({ is_discontinued: 0, status: "published" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canUndiscontinue: isAdmin };
}