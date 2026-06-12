import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<User>("/me"),
    staleTime: 1000 * 60 * 15, // 15 min — user profile rarely changes mid-session
    retry: false,
  });
}
