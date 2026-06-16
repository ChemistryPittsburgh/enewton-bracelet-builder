import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VerifyResponse {
  token: string;
  expires_at: string;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** POST /auth/login — request a 6-digit OTP code for the given email. */
export function useRequestCode() {
  return useMutation<void, Error, { email: string }>({
    mutationFn: ({ email }) =>
      apiFetch<void>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
  });
}

/** POST /auth/verify — verify the OTP code and receive a session token. */
export function useVerifyCode() {
  return useMutation<VerifyResponse, Error, { email: string; code: string; remember: boolean }>({
    mutationFn: (args) =>
      apiFetch<VerifyResponse>("/auth/verify", {
        method: "POST",
        body: JSON.stringify(args),
      }),
  });
}