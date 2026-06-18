import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Bracelet } from "@/types";

export function usePatterns() {
  return useQuery({
    queryKey: ["patterns"],
    queryFn: () => apiFetch<Bracelet[]>("/patterns"),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}
