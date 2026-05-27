import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Bracelet, BraceletStatus } from "@/types";

interface UseDesignsParams {
  status?: BraceletStatus;
  search?: string;
}

/**
 * GET /designs — fetches the full list once and filters client-side.
 * The API does not support query params; filtering is applied via `select`.
 */
export function useDesigns(params?: UseDesignsParams) {
  return useQuery({
    queryKey: ["designs"],
    queryFn: () => apiFetch<Bracelet[]>("/designs"),
    select: (all) =>
      all.filter((d) => {
        if (params?.status && d.status !== params.status) return false;
        if (params?.search && !d.name.toLowerCase().includes(params.search.toLowerCase()))
          return false;
        return true;
      }),
  });
}
