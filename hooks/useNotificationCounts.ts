import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface NotificationCounts {
  in_review: number;
  approved: number;
}

export function useNotificationCounts(enabled: boolean) {
  return useQuery({
    queryKey: ["design-counts"],
    queryFn: () => apiFetch<NotificationCounts>("/designs/counts"),
    enabled,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}
