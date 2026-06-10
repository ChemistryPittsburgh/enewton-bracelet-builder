/**
 * POST /api/upload-bead
 *
 * Accepts a multipart/form-data upload with a single GLB file under field
 * name "file", uploads it to S3 under the "models/beads/" prefix, and
 * returns { url: string } — the public S3 URL of the uploaded model.
 *
 * Validation:
 *   - Only .glb files accepted
 *   - Max 10 MB
 *   - GLB magic-byte check (first 4 bytes = "glTF")
 *
 * Required env vars:
 *   ENEWTON_AWS_ACCESS_KEY_ID
 *   ENEWTON_AWS_SECRET_ACCESS_KEY
 *   ENEWTON_AWS_REGION
 *   S3_BUCKET_NAME
 *
 * Optional env var:
 *   S3_PUBLIC_URL — CloudFront or custom domain base URL (no trailing slash)
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const GLB_MAGIC = 0x46546c67; // "glTF" in little-endian

const s3 = new S3Client({
  region: process.env.ENEWTON_AWS_REGION!,
  credentials: {
    accessKeyId:     process.env.ENEWTON_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.ENEWTON_AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Attach a GLB file under the \"file\" field." },
        { status: 400 },
      );
    }

    // ── Extension check ──────────────────────────────────────────────────────
    if (!file.name.toLowerCase().endsWith(".glb")) {
      return NextResponse.json(
        { error: "Only .glb files are accepted." },
        { status: 400 },
      );
    }

    // ── Size check ───────────────────────────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds the 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Magic-byte check ─────────────────────────────────────────────────────
    if (buffer.length < 4 || buffer.readUInt32LE(0) !== GLB_MAGIC) {
      return NextResponse.json(
        { error: "File does not appear to be a valid GLB (magic bytes mismatch)." },
        { status: 400 },
      );
    }

    // ── Sanitise filename ────────────────────────────────────────────────────
    const baseName = file.name
      .replace(/\.glb$/i, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const key = `models/beads/${baseName}_${Date.now()}.glb`;

    await s3.send(
      new PutObjectCommand({
        Bucket:       process.env.S3_BUCKET_NAME!,
        Key:          key,
        Body:         buffer,
        ContentType:  "model/gltf-binary",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    // Return a relative path — the Next.js rewrite in next.config.mjs proxies
    // /models/* to S3, so the frontend never makes a cross-origin request.
    // This also keeps glb_path consistent with existing beads in /public.
    return NextResponse.json({ url: `/${key}` });
  } catch (err) {
    console.error("[/api/upload-bead]", err);
    return NextResponse.json(
      { error: "Failed to upload bead model." },
      { status: 500 },
    );
  }
}
