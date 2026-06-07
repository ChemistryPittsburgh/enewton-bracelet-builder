import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Tag, CreateTagRequest, UpdateTagRequest } from "@/types";

// ── Query ─────────────────────────────────────────────────────────────────────

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => apiFetch<Tag[]>("/tags"),
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation<Tag, Error, CreateTagRequest>({
    mutationFn: (body) =>
      apiFetch<Tag>("/tags", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation<Tag, Error, UpdateTagRequest>({
    mutationFn: ({ id, ...body }) =>
      apiFetch<Tag>(`/tags/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["designs"] });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiFetch<void>(`/tags/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["designs"] });
    },
  });
}

// ── Design↔Tag mutations ──────────────────────────────────────────────────────

interface DesignTagArgs { designId: number; tagId: number; }

export function useApplyTag() {
  const qc = useQueryClient();
  return useMutation<void, Error, DesignTagArgs>({
    mutationFn: ({ designId, tagId }) =>
      apiFetch<void>(`/designs/${designId}/tags/${tagId}`, { method: "POST" }),
    onSuccess: (_data, { designId }) => {
      qc.invalidateQueries({ queryKey: ["designs"] });
      qc.invalidateQueries({ queryKey: ["designs", designId] });
    },
  });
}

export function useRemoveTag() {
  const qc = useQueryClient();
  return useMutation<void, Error, DesignTagArgs>({
    mutationFn: ({ designId, tagId }) =>
      apiFetch<void>(`/designs/${designId}/tags/${tagId}`, { method: "DELETE" }),
    onSuccess: (_data, { designId }) => {
      qc.invalidateQueries({ queryKey: ["designs"] });
      qc.invalidateQueries({ queryKey: ["designs", designId] });
    },
  });
}