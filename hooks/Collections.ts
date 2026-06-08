import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Collection, CreateCollectionRequest, UpdateCollectionRequest } from "@/types";

// ── Query ─────────────────────────────────────────────────────────────────────

export function useCollections() {
  return useQuery<Collection[]>({
    queryKey: ["collections"],
    queryFn: () => apiFetch<Collection[]>("/collections"),
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation<Collection, Error, CreateCollectionRequest>({
    mutationFn: (body) =>
      apiFetch<Collection>("/collections", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation<Collection, Error, UpdateCollectionRequest>({
    mutationFn: ({ id, ...body }) =>
      apiFetch<Collection>(`/collections/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["designs"] });
    },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiFetch<void>(`/collections/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["designs"] });
    },
  });
}

// ── Design↔Collection mutations ───────────────────────────────────────────────

interface DesignCollectionArgs { designId: number; collectionId: number; }

export function useApplyCollection() {
  const qc = useQueryClient();
  return useMutation<void, Error, DesignCollectionArgs>({
    mutationFn: ({ designId, collectionId }) =>
      apiFetch<void>(`/designs/${designId}/collections/${collectionId}`, { method: "POST" }),
    onSuccess: (_data, { designId }) => {
      qc.invalidateQueries({ queryKey: ["designs"] });
      qc.invalidateQueries({ queryKey: ["designs", designId] });
    },
  });
}

export function useRemoveCollection() {
  const qc = useQueryClient();
  return useMutation<void, Error, DesignCollectionArgs>({
    mutationFn: ({ designId, collectionId }) =>
      apiFetch<void>(`/designs/${designId}/collections/${collectionId}`, { method: "DELETE" }),
    onSuccess: (_data, { designId }) => {
      qc.invalidateQueries({ queryKey: ["designs"] });
      qc.invalidateQueries({ queryKey: ["designs", designId] });
    },
  });
}