import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

/**
 * POST /designs/:id — sets is_discontinued = 1.
 * Admin only can reverse discontinue 
 */
export function useDiscontinueDesign() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermissions();

  const mutation = useMutation({
    mutationFn(id: number) {
      if (!isAdmin) throw new Error("Permission denied: admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/discontinue`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canDiscontinue: isAdmin };
}