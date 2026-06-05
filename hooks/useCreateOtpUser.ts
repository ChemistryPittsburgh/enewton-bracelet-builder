import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types";

interface CreateOtpUserPayload {
  name: string;
  email: string;
  permissions?: Partial<User["permissions"]>;
  send_email: boolean;
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
