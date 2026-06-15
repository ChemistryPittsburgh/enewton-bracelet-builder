import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { type ApiBeadProduct, normaliseBeadProduct } from "@/lib/bead-helpers";

export function useBeads() {
  return useQuery({
    queryKey: ["beads"],
    queryFn: async () => {
      const data = await apiFetch<ApiBeadProduct[]>("/beads");
      return data
        .filter((b) => b.active === 1)
        .map(normaliseBeadProduct);
    },
    staleTime: 1000 * 60 * 60, // 1 hour — catalog changes only via admin action
  });
}