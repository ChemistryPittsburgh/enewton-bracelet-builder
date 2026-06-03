import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface ApplyTagArgs {
  designId: number;
  tagId: number;
}

export function useApplyTag() {
  const qc = useQueryClient();
  return useMutation<void, Error, ApplyTagArgs>({
    mutationFn: ({ designId, tagId }) =>
      apiFetch<void>(`/designs/${designId}/tags/${tagId}`, { method: "POST" }),
    onSuccess: (_data, { designId }) => {
      qc.invalidateQueries({ queryKey: ["designs"] });
      qc.invalidateQueries({ queryKey: ["design", designId] });
    },
  });
}