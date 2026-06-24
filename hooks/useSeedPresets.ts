import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiSeedPresetColor {
  color_id: number;
  hex: string;
  label: string;
  is_metallic: boolean;
  percent: number;
  sort_order: number;
}

export interface ApiSeedPreset {
  id: number;
  name: string;
  sort_order: number;
  active: number;
  colors: ApiSeedPresetColor[];
}

/** A color slot as sent to the API — the server resolves hex/label from color_id. */
export interface SeedPresetColorInput {
  color_id: number;
  percent: number;
  sort_order?: number;
}

export interface CreateSeedPresetRequest {
  name: string;
  sort_order?: number;
  colors: SeedPresetColorInput[];
}

export interface UpdateSeedPresetRequest {
  id: number;
  name?: string;
  sort_order?: number;
  colors?: SeedPresetColorInput[];
}

// ── Query ─────────────────────────────────────────────────────────────────────

/**
 * Seed colorway presets (route is /seed-presets).
 * - Default (picker): active presets only.
 * - `includeInactive` (admin manage dialog): all presets, so deactivated ones
 *   can be shown with a Reactivate action.
 */
export function useSeedPresets({
  includeInactive = false,
  enabled = true,
}: { includeInactive?: boolean; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: includeInactive ? ["seed-presets", "all"] : ["seed-presets"],
    queryFn: () =>
      apiFetch<ApiSeedPreset[]>(`/seed-presets${includeInactive ? "?include_inactive=1" : ""}`),
    staleTime: 1000 * 60 * 60,
    enabled,
  });
}

/** Invalidates both the active-only and include-inactive preset queries. */
function invalidatePresets(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["seed-presets"] });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateSeedPreset() {
  const qc = useQueryClient();
  return useMutation<ApiSeedPreset, Error, CreateSeedPresetRequest>({
    mutationFn: (body) =>
      apiFetch<ApiSeedPreset>("/seed-presets", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidatePresets(qc),
  });
}

export function useUpdateSeedPreset() {
  const qc = useQueryClient();
  return useMutation<ApiSeedPreset, Error, UpdateSeedPresetRequest>({
    mutationFn: ({ id, ...body }) =>
      apiFetch<ApiSeedPreset>(`/seed-presets/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => invalidatePresets(qc),
  });
}

/** Flips a preset's active flag (PUT /seed-presets/:id/status is a pure toggle). */
export function useToggleSeedPresetStatus() {
  const qc = useQueryClient();
  return useMutation<ApiSeedPreset, Error, number>({
    mutationFn: (id) => apiFetch<ApiSeedPreset>(`/seed-presets/${id}/status`, { method: "PUT" }),
    onSuccess: () => invalidatePresets(qc),
  });
}

export function useDeleteSeedPreset() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiFetch<void>(`/seed-presets/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidatePresets(qc),
  });
}