import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "@/lib/toast";

export function useDeletePattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/patterns/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patterns"] });
      toast.success("Pattern deleted");
    },
  });
}