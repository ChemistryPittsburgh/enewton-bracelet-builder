import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { BraceletStatus, DesignsPage } from "@/types";

interface UseDesignsParams {
  status?: BraceletStatus;
  search?: string;
}

/** GET /designs — paginated list, optionally filtered by status and/or search. */
export function useDesigns(params?: UseDesignsParams) {
  return useQuery({
    queryKey: ["designs", params ?? {}],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.search) qs.set("search", params.search);
      const query = qs.toString() ? `?${qs.toString()}` : "";
      return apiFetch<DesignsPage>(`/designs${query}`);
    },
  });
}
