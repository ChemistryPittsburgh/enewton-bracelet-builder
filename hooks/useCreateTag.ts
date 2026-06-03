import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Tag, CreateTagRequest } from "@/types";

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation<Tag, Error, CreateTagRequest>({
    mutationFn: (body) =>
      apiFetch<Tag>("/tags", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}