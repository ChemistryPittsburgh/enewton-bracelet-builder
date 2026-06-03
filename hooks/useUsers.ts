import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types";

/** GET /users — admin only. */
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<User[]>("/users"),
  });
}
