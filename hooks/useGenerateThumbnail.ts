import { useStore } from "@/lib/store";
import { THUMBNAIL_SIZE, SCENE_BACKGROUND } from "@/lib/constants";

// ─── Background colour channels (from SCENE_BACKGROUND = "#f5f0eb") ──────────
const BG_R = 0xf5; // 245
const BG_G = 0xf0; // 240
const BG_B = 0xeb; // 235

/**
 * Sum-of-channel delta required to classify a pixel as "not background".
 * 20 is loose enough to include anti-aliased bracelet edges while ignoring
 * the very slight noise that can appear in a WebGL framebuffer.
 */
const BG_THRESHOLD = 20;

/**
 * Fraction of the content bounding-box size added as padding on each side
 * before the crop is scaled into the output square.
 * 0.10 = 10 % — gives the bracelet breathing room without wasting space.
 */
const CONTENT_PADDING = 0.10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Scans the WebGL canvas for non-background pixels and returns the bounding
 * box of the bracelet content (plus proportional padding) in source pixels.
 *
 * We can't call getImageData on a WebGL context, so the canvas is first
 * copied to a temporary off-DOM 2D canvas at the same resolution.
 *
 * Falls back to the full canvas if no content is detected.
 */
function findContentBounds(
  src: HTMLCanvasElement,
): { x: number; y: number; w: number; h: number } {
  const sw = src.width;
  const sh = src.height;

  // Copy to 2D canvas so we can read pixel data
  const tmp = document.createElement("canvas");
  tmp.width = sw;
  tmp.height = sh;
  const ctx2d = tmp.getContext("2d")!;
  ctx2d.drawImage(src, 0, 0);

  const { data } = ctx2d.getImageData(0, 0, sw, sh);

  let minX = sw, maxX = 0, minY = sh, maxY = 0;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      if (data[i + 3] < 128) continue; // skip transparent pixels
      const delta =
        Math.abs(data[i]     - BG_R) +
        Math.abs(data[i + 1] - BG_G) +
        Math.abs(data[i + 2] - BG_B);
      if (delta > BG_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Nothing detected — fall back to full canvas
  if (minX > maxX || minY > maxY) {
    return { x: 0, y: 0, w: sw, h: sh };
  }

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const pad = Math.round(Math.max(bw, bh) * CONTENT_PADDING);

  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  const w = Math.min(sw - 1, maxX + pad) - x + 1;
  const h = Math.min(sh - 1, maxY + pad) - y + 1;

  return { x, y, w, h };
}

/**
 * Crops the WebGL canvas to the bracelet's bounding box and draws it
 * centred inside a fixed `THUMBNAIL_SIZE × THUMBNAIL_SIZE` output canvas.
 *
 * Result: the bracelet always fills the frame (with consistent padding)
 * regardless of browser window size or device pixel ratio.
 */
function captureFixed(src: HTMLCanvasElement): string {
  const { x: sx, y: sy, w: sw, h: sh } = findContentBounds(src);

  const out = document.createElement("canvas");
  out.width = THUMBNAIL_SIZE;
  out.height = THUMBNAIL_SIZE;
  const ctx = out.getContext("2d")!;

  // Fill with scene background so any letterbox bars blend in
  ctx.fillStyle = SCENE_BACKGROUND;
  ctx.fillRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

  // Scale cropped content to fit, preserving aspect ratio, centred
  const scale = Math.min(THUMBNAIL_SIZE / sw, THUMBNAIL_SIZE / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (THUMBNAIL_SIZE - dw) / 2;
  const dy = (THUMBNAIL_SIZE - dh) / 2;

  ctx.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh);
  return out.toDataURL("image/png");
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns a `capture()` function that snapshots the current R3F canvas,
 * auto-crops to the bracelet content, and returns a fixed-size 600×600
 * base64 PNG data URL. Returns null if the canvas isn't ready.
 *
 * Requires the Canvas to have `preserveDrawingBuffer: true` (set in Scene.tsx).
 * The canvas element is registered into the store by <CanvasRegistrar /> inside Scene.
 */
export function useGenerateThumbnail() {
  const canvasEl = useStore((s) => s.canvasEl);

  function capture(): string | null {
    if (!canvasEl) {
      console.warn("[useGenerateThumbnail] Canvas not ready — thumbnail skipped.");
      return null;
    }
    return captureFixed(canvasEl);
  }

  /** Downloads the thumbnail as a PNG file. For testing only — real impl pushes to S3. */
  function download(filename: string): void {
    const dataUrl = capture();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  return { capture, download, ready: canvasEl !== null };
}
