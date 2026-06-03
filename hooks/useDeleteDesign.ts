import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useDeleteDesign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn(id: number) {
      return apiFetch<void>(`/designs/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });
}