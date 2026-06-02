/**
 * Uploads a base64 PNG data URL to the local /api/thumbnail route and returns
 * a static public URL (e.g. "/thumbnails/bracelet-my-bracelet-1234567890.png").
 *
 * DEV-ONLY — replace with a presigned S3 upload when moving to production.
 */
export async function uploadThumbnail(
  dataUrl: string,
  filename: string,
): Promise<string> {
  const res = await fetch("/api/thumbnail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, filename }),
  });

  if (!res.ok) {
    throw new Error(`Thumbnail upload failed: ${res.status}`);
  }

  const json = (await res.json()) as { url: string };
  return json.url;
}