import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import type { DesignLock } from "@/types";

interface LockAcquired {
  acquired: true;
  expires_at: string;
}

interface LockConflict {
  acquired: false;
  locked_by: DesignLock;
}

export type LockResult = LockAcquired | LockConflict;

export function useLockDesign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      force = false,
    }: {
      id: number;
      force?: boolean;
    }): Promise<LockResult> => {
      try {
        const data = await apiFetch<{ acquired: true; expires_at: string }>(
          `/designs/${id}/lock`,
          { method: "POST", body: JSON.stringify({ force }) },
        );
        return data;
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const body = err.body as { locked_by: DesignLock };
          return { acquired: false, locked_by: body.locked_by };
        }
        throw err;
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["designs"] });
    },
  });
}
