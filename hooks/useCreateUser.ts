import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types";
import { AVATAR_COLORS } from "@/lib/category-colors";

function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

interface CreateUserPayload {
  name: string;
  email: string;
  color?: string | null;
  permissions?: Partial<User["permissions"]>;
}

/** POST /users response includes a one-time plaintext token. */
export interface CreateUserResponse extends User {
  token: string;
}

/** POST /users — admin only. Color is always assigned here if not provided. */
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      apiFetch<CreateUserResponse>("/users", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          color: payload.color ?? randomAvatarColor(),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}