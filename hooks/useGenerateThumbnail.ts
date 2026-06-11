import { useStore } from "@/lib/store";
import { THUMBNAIL_SIZE, SCENE_BACKGROUND, CAMERA_DEFAULT_POSITION } from "@/lib/constants";

// ─── Background colour channels (from SCENE_BACKGROUND = "#f5f0eb") ──────────
const BG_R = 0xf5;
const BG_G = 0xf0;
const BG_B = 0xeb;
const BG_THRESHOLD = 20;
const CONTENT_PADDING = 0.10;

// ─── Helpers  ─────────────────────────────────────────────────────

function findContentBounds(src: HTMLCanvasElement) {
  const sw = src.width;
  const sh = src.height;
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
      if (data[i + 3] < 128) continue;
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
  if (minX > maxX || minY > maxY) return { x: 0, y: 0, w: sw, h: sh };

  // Build a square crop centred on the content so padding is always symmetric.
  // The old per-side clamp caused the bracelet to clip at whichever edge the
  // content sat closest to (usually the bottom due to camera angle).
  const bw   = maxX - minX + 1;
  const bh   = maxY - minY + 1;
  const side = Math.round(Math.max(bw, bh) * (1 + 2 * CONTENT_PADDING));
  const cx   = (minX + maxX) / 2;
  const cy   = (minY + maxY) / 2;

  // Centre the square on the content, then shift into canvas bounds if needed
  let x = Math.round(cx - side / 2);
  let y = Math.round(cy - side / 2);
  x = Math.max(0, Math.min(x, sw - side));
  y = Math.max(0, Math.min(y, sh - side));

  // Final safety clamp for the rare case where side > canvas dimension
  const w = Math.min(side, sw - x);
  const h = Math.min(side, sh - y);

  return { x, y, w, h };
}

function captureFixed(src: HTMLCanvasElement): string {
  const { x: sx, y: sy, w: sw, h: sh } = findContentBounds(src);
  const out = document.createElement("canvas");
  out.width = THUMBNAIL_SIZE;
  out.height = THUMBNAIL_SIZE;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = SCENE_BACKGROUND;
  ctx.fillRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
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
 * Accepts a controlsRef so it can temporarily move the camera to the
 * standard thumbnail position, snap, then restore the user's camera.
 */
export function useGenerateThumbnail() {
  const canvasEl    = useStore((s) => s.canvasEl);
  const controlsEl  = useStore((s) => s.controlsEl);  // ← from store

  async function capture(): Promise<string | null> {
    if (!canvasEl) {
      console.warn("[useGenerateThumbnail] Canvas not ready — thumbnail skipped.");
      return null;
    }

    // Hide spacer wireframes for the thumbnail
    const { setSpacersHiddenForCapture } = useStore.getState();
    setSpacersHiddenForCapture(true);

    const controls = controlsEl;

    try {
      if (controls) {
        const savedPos    = controls.getPosition(undefined as any);
        const savedTarget = controls.getTarget(undefined as any);

        const [cx, cy, cz] = CAMERA_DEFAULT_POSITION;
        await controls.setLookAt(cx, cy, cz, 0, 0, 0, false);

        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

        const dataUrl = captureFixed(canvasEl);

        await controls.setLookAt(
          savedPos.x,    savedPos.y,    savedPos.z,
          savedTarget.x, savedTarget.y, savedTarget.z,
          false,
        );

        return dataUrl;
      }

      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      return captureFixed(canvasEl);
    } finally {
      setSpacersHiddenForCapture(false);
    }
  }

  async function download(filename: string): Promise<void> {
    const dataUrl = await capture();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  return { capture, download, ready: canvasEl !== null };
}