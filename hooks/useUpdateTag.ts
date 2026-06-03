import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Tag, UpdateTagRequest } from "@/types";

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation<Tag, Error, UpdateTagRequest>({
    mutationFn: ({ id, ...body }) =>
      apiFetch<Tag>(`/tags/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["designs"] });
      qc.invalidateQueries({ queryKey: ["design"] });
    },
  });
}