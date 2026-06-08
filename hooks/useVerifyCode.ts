import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface VerifyArgs {
  email: string;
  code: string;
  remember: boolean;
}

export interface VerifyResponse {
  token: string;
  expires_at: string;
}

export function useVerifyCode() {
  return useMutation<VerifyResponse, Error, VerifyArgs>({
    mutationFn: (args) =>
      apiFetch<VerifyResponse>("/auth/verify", {
        method: "POST",
        body: JSON.stringify(args),
      }),
  });
}
