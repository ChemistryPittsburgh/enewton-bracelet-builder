import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { DesignComment } from "@/types";

/** GET /designs/:id/comments — fetch all comments for a design, oldest first. */
export function useComments(designId: number | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["designs", designId, "comments"],
    queryFn: () => apiFetch<DesignComment[]>(`/designs/${designId}/comments`),
    enabled: designId !== null && (options?.enabled ?? true),
  });
}
