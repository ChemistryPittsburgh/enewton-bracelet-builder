import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

/**
 * PUT /designs/:id — sets is_discontinued = 1.
 * Admin-only. Irreversible.
 */
export function useDiscontinueDesign() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!isAdmin) throw new Error("Permission denied: admin required.");
      return apiFetch<Bracelet>(`/designs/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_discontinued: 1 }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
      queryClient.invalidateQueries({ queryKey: ["design"] });
    },
  });

  return { ...mutation, canDiscontinue: isAdmin };
}