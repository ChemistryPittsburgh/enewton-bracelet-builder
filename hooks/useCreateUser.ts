import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types";

export const AVATAR_COLORS = [
  "#1F3A5F", // navy
  "#a38d48", // gold
  "#0d5c52", // teal
  "#9b3a3a", // terracotta
  "#6c3483", // purple
  "#1e6b3a", // forest
  "#2471a3", // steel blue
  "#c0774a", // copper
  "#8b3040", // rose
  "#5d6d7e", // slate
] as const;

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