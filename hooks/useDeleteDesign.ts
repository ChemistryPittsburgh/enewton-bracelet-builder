import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "@/lib/toast";

export function useDeleteDesign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn(id: number) {
      return apiFetch<void>(`/designs/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
      toast.success("Design deleted");
    },
  });
}