import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { BeadProduct } from "@/types";

type ApiBeadProduct = Omit<BeadProduct, "diameter"> & { diameter: string };

export function useBeads() {
  return useQuery({
    queryKey: ["beads"],
    queryFn: async () => {
      const data = await apiFetch<ApiBeadProduct[]>("/beads");
      return data
        .filter((b) => b.active === 1)
        .map((b): BeadProduct => ({ ...b, diameter: parseFloat(b.diameter) }));
    },
  });
}
