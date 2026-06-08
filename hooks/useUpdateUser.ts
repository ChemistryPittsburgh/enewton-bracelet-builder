import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types";

export interface UpdateUserPayload {
  id: number;
  name?: string;
  email?: string;
  permissions?: Partial<User["permissions"]>;
  active?: 0 | 1;
}

/** PUT /users/:id — admin only. */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateUserPayload) =>
      apiFetch<User>(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}