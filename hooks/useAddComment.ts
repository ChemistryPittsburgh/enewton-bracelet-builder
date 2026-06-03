import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { sanitizeComment } from "@/lib/sanitize";
import type { DesignComment } from "@/types";

/** POST /designs/:id/comments — add a new comment to a design. */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn({ designId, body }: { designId: number; body: string }) {
      const clean = sanitizeComment(body);
      if (!clean) throw new Error("Comment body is empty.");
      return apiFetch<DesignComment>(`/designs/${designId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: clean }),
      });
    },
    onSuccess: (_data, { designId }) => {
      queryClient.invalidateQueries({ queryKey: ["designs", designId, "comments"] });
    },
  });
}
