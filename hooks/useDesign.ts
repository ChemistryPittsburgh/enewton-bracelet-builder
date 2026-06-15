import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
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
    staleTime: 1000 * 60 * 2, // 2 min — Pusher setQueryData keeps this current in real-time
    refetchInterval,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 3;
    },
  });
}
