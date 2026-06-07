import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Bracelet } from "@/types";

/**
 * POST /designs/:id/reject
 * Moves a design from in_review → draft, storing the rejection reason
 * and setting rejected_at / rejected_by on the record.
 *
 */

// TODO: Flip to true once POST /designs/:id/reject is live.
const REJECT_ENDPOINT_READY = false;

export function useRejectDesign() {
  const queryClient   = useQueryClient();
  const { isAdmin, canReview } = usePermissions();
  const { data: currentUser }  = useCurrentUser();

  const mutation = useMutation({
    async mutationFn({ id, reason }: { id: number; reason?: string }) {
      if (!REJECT_ENDPOINT_READY) {
        // ── Stub: simulate the server response locally ──────────────────────
        // Replace with the real apiFetch call once the endpoint is ready.
        const existing = queryClient.getQueryData<Bracelet>(["designs", id]);
        if (!existing) throw new Error("[stub] Design not found in cache.");
        return {
          ...existing,
          status:           "draft" as const,
          rejection_reason: reason ?? null,
          rejected_at:      new Date().toISOString(),
          rejected_by_name: currentUser?.name ?? null,
        } as Bracelet;
      }

      return apiFetch<Bracelet>(`/designs/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason ?? null }),
      });
    },

    onSuccess: (data) => {
      if (!REJECT_ENDPOINT_READY) {
        // Write stub result into both caches — don't refetch since the
        // server doesn't have the changes yet.
        queryClient.setQueryData<Bracelet[]>(["designs"], (old) =>
          old?.map((d) => (d.id === data.id ? data : d))
        );
        queryClient.setQueryData<Bracelet>(["designs", data.id], data);
      } else {
        queryClient.invalidateQueries({ queryKey: ["designs"] });
      }
    },
  });

  return { ...mutation, canReject: isAdmin || canReview };
}
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { apiFetch } from "@/lib/api";
// import { usePermissions } from "@/hooks/usePermissions";
// import type { Bracelet } from "@/types";

// /**
//  * POST /designs/:id/reject
//  * Moves a design from in_review → rejected.
//  * Accepts an optional reason that is stored and surfaced to the designer.
//  */
// export function useRejectDesign() {
//   const queryClient = useQueryClient();
//   const { canReview } = usePermissions();

//   const mutation = useMutation({
//     mutationFn({ id, reason }: { id: number; reason?: string }) {
//       return apiFetch<Bracelet>(`/designs/${id}/reject`, {
//         method: "POST",
//         body: JSON.stringify({ reason: reason ?? null }),
//       });
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["designs"] });
//     },
//   });

//   return { ...mutation, canReject: canReview };
// }