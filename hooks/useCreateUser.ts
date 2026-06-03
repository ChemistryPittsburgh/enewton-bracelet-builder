import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types";

interface CreateUserPayload {
  name: string;
  email: string;
  permissions?: Partial<User["permissions"]>;
}

/** POST /users response includes a one-time plaintext token. */
export interface CreateUserResponse extends User {
  token: string;
}

/** POST /users — admin only. */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      apiFetch<CreateUserResponse>("/users", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
