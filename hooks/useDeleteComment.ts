import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

/** DELETE /designs/:id/comments/:commentId — delete own comment or any comment if is_admin. */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn({ designId, commentId }: { designId: number; commentId: number }) {
      return apiFetch<void>(`/designs/${designId}/comments/${commentId}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_data, { designId }) => {
      queryClient.invalidateQueries({ queryKey: ["designs", designId, "comments"] });
    },
  });
}
