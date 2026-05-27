import { useStore } from "@/lib/store";

/**
 * Returns a `capture()` function that snapshots the current R3F canvas
 * and returns a base64 PNG data URL, or null if the canvas isn't ready.
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
    return canvasEl.toDataURL("image/png");
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
