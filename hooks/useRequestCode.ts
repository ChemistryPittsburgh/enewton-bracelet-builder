import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useRequestCode() {
  return useMutation<void, Error, { email: string }>({
    mutationFn: ({ email }) =>
      apiFetch<void>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
  });
}
