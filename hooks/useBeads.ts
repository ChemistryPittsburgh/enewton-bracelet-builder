import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { BeadProduct } from "@/types";

type ApiBeadProduct = Omit<
  BeadProduct,
  "diameter" | "size_mm" | "bail_width_mm" | "body_width_mm" | "total_height_mm" | "hang_offset" | "hang_length" | "depth_offset"
> & {
  diameter: string;
  size_mm?: string | number | null;
  bail_width_mm?: string | null;
  body_width_mm?: string | null;
  total_height_mm?: string | null;
  hang_offset?: string | null;
  hang_length?: string | null;
  depth_offset?: string | null;
};

function parseDecimal(v: string | number | null | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = parseFloat(String(v));
  return isNaN(n) ? undefined : n;
}

export function useBeads() {
  return useQuery({
    queryKey: ["beads"],
    queryFn: async () => {
      const data = await apiFetch<ApiBeadProduct[]>("/beads");
      return data
        .filter((b) => b.active === 1)
        .map((b): BeadProduct => ({
          ...b,
          diameter:        parseFloat(b.diameter),
          size_mm:         parseDecimal(b.size_mm) ?? null,
          bail_width_mm:   parseDecimal(b.bail_width_mm),
          body_width_mm:   parseDecimal(b.body_width_mm),
          total_height_mm: parseDecimal(b.total_height_mm),
          hang_offset:     parseDecimal(b.hang_offset),
          hang_length:     parseDecimal(b.hang_length),
          depth_offset:    parseDecimal(b.depth_offset),
        }));
    },
  });
}
