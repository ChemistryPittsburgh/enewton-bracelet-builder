import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiSeedColor {
  id: number;
  hex: string;
  label: string;
  is_metallic: boolean;
  sort_order: number;
  active: number;
}

export interface CreateSeedColorRequest {
  hex: string;
  label: string;
  is_metallic: boolean;
  sort_order?: number;
}

export interface UpdateSeedColorRequest {
  id: number;
  hex?: string;
  label?: string;
  is_metallic?: boolean;
  sort_order?: number;
}

// ── Query ─────────────────────────────────────────────────────────────────────

/**
 * Seed color palette.
 * - Default (picker): active colors only.
 * - `includeInactive` (admin manage dialog): all colors, so deactivated ones
 *   can be shown with a Reactivate action. Uses a distinct query key so the two
 *   variants don't overwrite each other in the cache.
 */
export function useSeedColors({
  includeInactive = false,
  enabled = true,
}: { includeInactive?: boolean; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: includeInactive ? ["seed-colors", "all"] : ["seed-colors"],
    queryFn: () =>
      apiFetch<ApiSeedColor[]>(`/seed-colors${includeInactive ? "?include_inactive=1" : ""}`),
    staleTime: 1000 * 60 * 60,
    enabled,
  });
}

/** Invalidates both the active-only and include-inactive color queries. */
function invalidateColors(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["seed-colors"] });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateSeedColor() {
  const qc = useQueryClient();
  return useMutation<ApiSeedColor, Error, CreateSeedColorRequest>({
    mutationFn: (body) =>
      apiFetch<ApiSeedColor>("/seed-colors", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidateColors(qc),
  });
}

export function useUpdateSeedColor() {
  const qc = useQueryClient();
  return useMutation<ApiSeedColor, Error, UpdateSeedColorRequest>({
    mutationFn: ({ id, ...body }) =>
      apiFetch<ApiSeedColor>(`/seed-colors/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidateColors(qc);
      // Presets embed each color's hex/label, so a color edit can change how
      // existing presets render — refresh them too.
      qc.invalidateQueries({ queryKey: ["seed-presets"] });
    },
  });
}

/** Flips a color's active flag (PUT /seed-colors/:id/status is a pure toggle). */
export function useToggleSeedColorStatus() {
  const qc = useQueryClient();
  return useMutation<ApiSeedColor, Error, number>({
    mutationFn: (id) => apiFetch<ApiSeedColor>(`/seed-colors/${id}/status`, { method: "PUT" }),
    onSuccess: () => invalidateColors(qc),
  });
}

/**
 * Permanently deletes a color. The API returns 409 (ApiError with
 * `body.presets`) if any preset still references it — callers should handle
 * that case.
 */
export function useDeleteSeedColor() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiFetch<void>(`/seed-colors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateColors(qc);
      qc.invalidateQueries({ queryKey: ["seed-presets"] });
    },
  });
}