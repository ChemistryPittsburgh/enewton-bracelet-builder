/**
 * Bead administration hooks — create, update, and toggle-active mutations
 * plus the GLB upload helper.
 *
 * All mutations invalidate the ["beads"] query key so the bead selector
 * and admin list stay in sync.
 *
 * Endpoints:
 *   POST   /beads           → create a new bead product
 *   POST    /beads/:slug       → update an existing bead product ()
 *   POST  /beads/:id/active → toggle active flag (soft delete / restore)
 * 
 *  NEEDED
 *   DELETE    /beads/:id       → delete bead
 *   POST    /beads/:id       → slug needs changed to ID
 */

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { type ApiBeadProduct, normaliseBeadProduct } from "@/lib/bead-helpers";
import { slugify } from "@/lib/utils";
import type { BeadProduct } from "@/types";

export { slugify };

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreateBeadRequest {
  name: string;
  slug: string;
  glb_path: string;
  bead_type: string;
  bead_category: string;      // "bead" | "charm"
  diameter: number;            // in metres (e.g. 0.006)
  size_mm: number | null;
  sku: string | null;
  material: string | null;
  color: string | null;
  bail_width_mm: number | null;
  body_width_mm: number | null;
}

export interface UpdateBeadRequest {
  id: number;
  name?: string;
  slug?: string;
  glb_path?: string;
  bead_type?: string;
  bead_category?: string;
  diameter?: number;
  size_mm?: number | null;
  sku?: string | null;
  material?: string | null;
  color?: string | null;
  bail_width_mm?: number | null;
  body_width_mm?: number | null;
}

// ── GLB upload helper ────────────────────────────────────────────────────────

const GLB_MAGIC = 0x46546c67; // "glTF" little-endian
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Client-side GLB validation — checks extension, size, and magic bytes.
 * Returns null if valid, or an error message string.
 */
export function validateGlbFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".glb")) {
    return "Only .glb files are accepted.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File exceeds 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  return null;
}

/**
 * Reads the first 4 bytes of a File and validates the GLB magic header.
 * Returns true if valid, false otherwise.
 */
export async function validateGlbMagicBytes(file: File): Promise<boolean> {
  const slice = file.slice(0, 4);
  const buffer = await slice.arrayBuffer();
  if (buffer.byteLength < 4) return false;
  const view = new DataView(buffer);
  return view.getUint32(0, true) === GLB_MAGIC;
}

/**
 * Uploads a GLB file to S3 via the /api/upload-bead route.
 * Returns the public S3 URL of the uploaded model.
 */
export async function uploadBeadGlb(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload-bead", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? `Upload failed: ${res.status}`);
  }

  const json = (await res.json()) as { url: string };
  return json.url;
}

/**
 * Uploads a bead thumbnail PNG (captured from the preview canvas) to S3
 * under the "images/" prefix via the /api/thumbnail route.
 *
 * Stored as images/{slug}-thumbnail.png so the existing
 * `/images/${slug}-thumbnail.png` convention works for new beads.
 */
export async function uploadBeadThumbnail(
  dataUrl: string,
  filename: string,
): Promise<string> {
  const res = await fetch("/api/thumbnail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, filename, prefix: "images" }),
  });

  if (!res.ok) {
    throw new Error(`Thumbnail upload failed: ${res.status}`);
  }

  const json = (await res.json()) as { url: string };
  return json.url;
}

// ── Fetch ALL beads (including inactive) for admin view ──────────────────────

/**
 * Fetches the full bead catalog including inactive beads.
 * The standard useBeads() filters to active === 1; this version returns
 * everything so admins can see and manage deactivated beads.
 */
export function useAllBeads() {
  return useQuery({
    queryKey: ["beads", "all"],
    queryFn: async () => {
      const data = await apiFetch<ApiBeadProduct[]>("/beads");
      return data.map(normaliseBeadProduct);
    },
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateBead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBeadRequest) =>
      apiFetch<BeadProduct>("/beads", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beads"] });
    },
  });
}

export function useUpdateBead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateBeadRequest) =>
      apiFetch<BeadProduct>(`/beads/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beads"] });
    },
  });
}

export function useToggleBeadActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, active }: { slug: string; active: boolean }) =>
      apiFetch<void>(`/beads/${slug}/status`, {
        method: "PUT",
        body: JSON.stringify({ active: active ? 1 : 0 }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beads"] });
    },
  });
}