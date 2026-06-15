import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useReleaseLock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/designs/${id}/lock`, { method: "DELETE" }).catch(() => {
        // Fire-and-forget — lock TTL handles cleanup if this fails
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });
}
