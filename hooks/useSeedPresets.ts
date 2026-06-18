import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

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

export function useSeedPresets() {
  return useQuery({
    queryKey: ["seed-presets"],
    queryFn: () => apiFetch<ApiSeedPreset[]>("/seed-presets"),
    staleTime: 1000 * 60 * 60,
  });
}