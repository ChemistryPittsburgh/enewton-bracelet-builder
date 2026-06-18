import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface ApiSeedColor {
  id: number;
  hex: string;
  label: string;
  is_metallic: boolean;
  sort_order: number;
  active: number;
}

export function useSeedColors() {
  return useQuery({
    queryKey: ["seed-colors"],
    queryFn: () => apiFetch<ApiSeedColor[]>("/seed-colors"),
    staleTime: 1000 * 60 * 60,
  });
}