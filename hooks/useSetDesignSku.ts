import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { Bracelet } from "@/types";

/**
 * PUT /designs/:id/sku — set the Shopify SKU for a design.
 * Requires is_publisher or is_admin.
 * SKU must be unique across all designs.
 * Required before a design can be published.
 *
 * Returns the mutation plus `canSetSku` for conditional UI rendering.
 */
export function useSetDesignSku() {
  const queryClient = useQueryClient();
  const { canSetSku } = usePermissions();

  const mutation = useMutation({
    mutationFn({ id, shopify_sku }: { id: number; shopify_sku: string }) {
      if (!canSetSku) throw new Error("Permission denied: is_publisher or is_admin required.");
      return apiFetch<Bracelet>(`/designs/${id}/sku`, {
        method: "PUT",
        body: JSON.stringify({ shopify_sku }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["designs", data.id] });
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });

  return { ...mutation, canSetSku };
}
