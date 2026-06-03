import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { sanitizeComment } from "@/lib/sanitize";
import type { DesignComment } from "@/types";

/** PUT /designs/:id/comments/:commentId — edit own comment. */
export function useEditComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn({ designId, commentId, body }: { designId: number; commentId: number; body: string }) {
      const clean = sanitizeComment(body);
      if (!clean) throw new Error("Comment body is empty.");
      return apiFetch<DesignComment>(`/designs/${designId}/comments/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ body: clean }),
      });
    },
    onSuccess: (_data, { designId }) => {
      queryClient.invalidateQueries({ queryKey: ["designs", designId, "comments"] });
    },
  });
}
