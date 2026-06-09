import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useReleaseLock() {
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/designs/${id}/lock`, { method: "DELETE" }).catch(() => {
        // Fire-and-forget — lock TTL handles cleanup if this fails
      }),
  });
}
