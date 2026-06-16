import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { sanitizeComment } from "@/lib/sanitize";
import type { DesignComment } from "@/types";

// ── Query ─────────────────────────────────────────────────────────────────────

/** GET /designs/:id/comments — fetch all comments for a design, oldest first. */
export function useComments(designId: number | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["designs", designId, "comments"],
    queryFn: () => apiFetch<DesignComment[]>(`/designs/${designId}/comments`),
    enabled: designId !== null && (options?.enabled ?? true),
    staleTime: 1000 * 30, // 30 s — comment mutations invalidate explicitly
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

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