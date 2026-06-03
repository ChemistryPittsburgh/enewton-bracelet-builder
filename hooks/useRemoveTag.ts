import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface RemoveTagArgs {
  designId: number;
  tagId: number;
}

export function useRemoveTag() {
  const qc = useQueryClient();
  return useMutation<void, Error, RemoveTagArgs>({
    mutationFn: ({ designId, tagId }) =>
      apiFetch<void>(`/designs/${designId}/tags/${tagId}`, { method: "DELETE" }),
    onSuccess: (_data, { designId }) => {
      qc.invalidateQueries({ queryKey: ["designs"] });
      qc.invalidateQueries({ queryKey: ["design", designId] });
    },
  });
}