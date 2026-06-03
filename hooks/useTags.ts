import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Tag } from "@/types";

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => apiFetch<Tag[]>("/tags"),
    staleTime: 1000 * 60 * 5, // 5 min
  });
}