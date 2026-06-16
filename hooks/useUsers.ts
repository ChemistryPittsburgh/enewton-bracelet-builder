import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { AVATAR_COLORS } from "@/lib/category-colors";
import type { User } from "@/types";

// ── Query ─────────────────────────────────────────────────────────────────────

/** GET /users — admin only. */
export function useUsers({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<User[]>("/users"),
    enabled,
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreateUserPayload {
  name: string;
  email: string;
  color?: string | null;
  permissions?: Partial<User["permissions"]>;
}

interface CreateOtpUserPayload {
  name: string;
  email: string;
  permissions?: Partial<User["permissions"]>;
  send_email: boolean;
}

/** POST /users response includes a one-time plaintext token. */
export interface CreateUserResponse extends User {
  token: string;
}

export interface UpdateUserPayload {
  id: number;
  name?: string;
  email?: string;
  permissions?: Partial<User["permissions"]>;
  active?: 0 | 1;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// ── Mutations ─────────────────────────────────────────────────────────────────

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

/** POST /users for the email-OTP login flow. Returns User (no token). */
export function useCreateOtpUser() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, CreateOtpUserPayload>({
    mutationFn: (payload) =>
      apiFetch<User>("/users", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
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

/** DELETE /users/:id — admin only. */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      console.error("[useDeleteUser]", err);
    },
  });
}