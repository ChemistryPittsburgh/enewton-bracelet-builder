import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Bracelet } from "@/types";

/** GET /designs/:id — fetch a single design by ID. Pass null to skip the query. */
export function useDesign(
  id: number | null,
  { refetchInterval }: { refetchInterval?: number | false } = {},
) {
  return useQuery({
    queryKey: ["designs", id],
    queryFn: () => apiFetch<Bracelet>(`/designs/${id}`),
    enabled: id !== null,
    refetchInterval,
  });
}
