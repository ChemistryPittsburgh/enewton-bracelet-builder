import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Bracelet, BraceletStatus } from "@/types";

export type DesignSortOption = "newest" | "oldest" | "name_asc" | "name_desc";

interface UseDesignsParams {
  status?: BraceletStatus;
  search?: string;
  /** Filter to designs whose material_tags overlap with any of these values. */
  materials?: string[];
  /** Filter to designs whose bead_types overlap with any of these values. */
  types?: string[];
  /** Filter to designs created by any of these creator names. */
  creators?: string[];
  /** Filter to designs that have all of these tag IDs applied. */
  tagIds?: number[];
  /** Sort order applied after filtering. Defaults to "newest" (updated_at desc). */
  sortBy?: DesignSortOption;
  /**
   * Polling interval in ms. Pass `false` to disable.
   * When multiple subscribers share the same cache entry, React Query uses
   * the shortest active interval — so one polling subscriber is enough.
   */
  refetchInterval?: number | false;
}

/**
 * GET /designs — fetches the full list once and filters + sorts client-side.
 * The API does not support query params; all logic is applied via `select`.
 *
 * Calling this hook twice with different params shares the same cache entry
 * (queryKey: ["designs"]) — only one network request is made.
 */
export function useDesigns(params?: UseDesignsParams) {
  return useQuery({
    queryKey: ["designs"],
    queryFn: () => apiFetch<Bracelet[]>("/designs"),
    refetchInterval: params?.refetchInterval,
    select: (all) => {
      // Ensure we have an array to work with (API may return null/non-array)
      const list = Array.isArray(all) ? all : [];

      let result = list.filter((d) => {
        // Status filter
        if (params?.status && d.status !== params.status) return false;

        // Full-text search on name (guard against null name)
        if (params?.search) {
          const name = d.name ?? "";
          if (!name.toLowerCase().includes(params.search.toLowerCase())) return false;
        }

        // Material tags — any overlap (guard against null/non-array field)
        if (params?.materials?.length) {
          const tags: unknown[] = Array.isArray(d.material_tags) ? d.material_tags : [];
          if (!params.materials.some((m) => tags.includes(m))) return false;
        }

        // Bead types — any overlap (guard against null/non-array field)
        if (params?.types?.length) {
          const types: unknown[] = Array.isArray(d.bead_types) ? d.bead_types : [];
          if (!params.types.some((t) => types.includes(t))) return false;
        }

        // Creator name — any match
        if (
          params?.creators?.length &&
          !params.creators.includes(d.created_by_name)
        )
          return false;

        // Tag IDs — design must have ALL selected tags
        if (params?.tagIds?.length) {
          const designTagIds = Array.isArray(d.tags) ? d.tags.map((t) => t.id) : [];
          if (!params.tagIds.every((id) => designTagIds.includes(id))) return false;
        }

        return true;
      });

      // Sort (guard against null date/name strings)
      const sort = params?.sortBy ?? "newest";
      result = [...result].sort((a, b) => {
        switch (sort) {
          case "newest":
            return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
          case "oldest":
            return (a.updated_at ?? "").localeCompare(b.updated_at ?? "");
          case "name_asc":
            return (a.name ?? "").localeCompare(b.name ?? "");
          case "name_desc":
            return (b.name ?? "").localeCompare(a.name ?? "");
          default:
            return 0;
        }
      });

      return result;
    },
  });
}