import * as THREE from "three";
import { useStore } from "@/lib/store";
import { THUMBNAIL_SIZE, SCENE_BACKGROUND, CAMERA_DEFAULT_POSITION } from "@/lib/constants";

// ─── Background colour channels (from SCENE_BACKGROUND = "#f5f0eb") ──────────
const BG_R = 0xf5;
const BG_G = 0xf0;
const BG_B = 0xeb;
const BG_THRESHOLD = 20;
const CONTENT_PADDING = 0.10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const pad = Math.round(Math.max(bw, bh) * CONTENT_PADDING);
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  const w = Math.min(sw - 1, maxX + pad) - x + 1;
  const h = Math.min(sh - 1, maxY + pad) - y + 1;
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

/**
 * Renders the scene to a WebGLRenderTarget and returns a data URL.
 * Does not require preserveDrawingBuffer on the main canvas.
 * WebGL uses bottom-left origin; rows are flipped to match 2D canvas convention.
 */
function captureViaRenderTarget(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): string {
  const w = gl.domElement.width;
  const h = gl.domElement.height;

  const target = new THREE.WebGLRenderTarget(w, h);
  gl.setRenderTarget(target);
  gl.render(scene, camera);
  gl.setRenderTarget(null);

  const raw = new Uint8Array(w * h * 4);
  gl.readRenderTargetPixels(target, 0, 0, w, h, raw);
  target.dispose();

  // Flip rows: WebGL origin is bottom-left, Canvas 2D is top-left
  const flipped = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w * 4;
    flipped.set(raw.subarray(src, src + w * 4), y * w * 4);
  }

  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const ctx = tmp.getContext("2d")!;
  ctx.putImageData(new ImageData(new Uint8ClampedArray(flipped.buffer), w, h), 0, 0);
  return captureFixed(tmp);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGenerateThumbnail() {
  const glRenderer  = useStore((s) => s.glRenderer);
  const threeScene  = useStore((s) => s.threeScene);
  const threeCamera = useStore((s) => s.threeCamera);

  async function capture(): Promise<string | null> {
    if (!glRenderer || !threeScene || !threeCamera) {
      console.warn("[useGenerateThumbnail] Canvas not ready — thumbnail skipped.");
      return null;
    }

    // Hide spacer wireframes for the thumbnail
    const { setSpacersHiddenForCapture } = useStore.getState();
    setSpacersHiddenForCapture(true);

    try {
      // Wait two frames so React flushes the spacersHiddenForCapture state change
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

      // Render through a cloned camera at the default view without moving the
      // actual scene camera — avoids any visible jump in the canvas.
      const [cx, cy, cz] = CAMERA_DEFAULT_POSITION;
      const snapCam = (threeCamera as THREE.PerspectiveCamera).clone();
      snapCam.position.set(cx, cy, cz);
      snapCam.lookAt(0, 0, 0);
      snapCam.updateMatrixWorld();

      return captureViaRenderTarget(glRenderer, threeScene, snapCam);
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

  return { capture, download, ready: glRenderer !== null };
}
