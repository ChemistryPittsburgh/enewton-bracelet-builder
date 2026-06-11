/**
 * POST /api/thumbnail
 *
 * Accepts { dataUrl: string; filename: string; prefix?: string }, uploads
 * the PNG to S3 under the given prefix (defaults to "thumbnails/"), and
 * returns { url: string } — a relative path that the Next.js rewrite
 * proxies to S3.
 *
 * Required env vars:
 *   ENEWTON_AWS_ACCESS_KEY_ID
 *   ENEWTON_AWS_SECRET_ACCESS_KEY
 *   ENEWTON_AWS_REGION
 *   S3_BUCKET_NAME
 *
 * Optional env var:
 *   S3_PUBLIC_URL  — CloudFront or custom domain base URL (no trailing slash)
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.ENEWTON_AWS_REGION!,
  credentials: {
    accessKeyId:     process.env.ENEWTON_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.ENEWTON_AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { dataUrl, filename, prefix = "thumbnails" } = (await req.json()) as {
      dataUrl: string;
      filename: string;
      prefix?: string;
    };

    if (!dataUrl || !filename) {
      return NextResponse.json(
        { error: "dataUrl and filename are required" },
        { status: 400 },
      );
    }

    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    const key    = `${prefix}/${filename}`;

    await s3.send(
      new PutObjectCommand({
        Bucket:       process.env.S3_BUCKET_NAME!,
        Key:          key,
        Body:         buffer,
        ContentType:  "image/png",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    // Return the public S3 URL. Bracelet thumbnails store this as
    // preview_image_url; bead thumbnails are accessed via convention
    // (/images/{slug}-thumbnail.png) through the Next.js rewrite proxy.
    const baseUrl =
      process.env.S3_PUBLIC_URL ??
      `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.ENEWTON_AWS_REGION}.amazonaws.com`;

    return NextResponse.json({ url: `${baseUrl}/${key}` });
  } catch (err) {
    console.error("[/api/thumbnail]", err);
    return NextResponse.json({ error: "Failed to upload thumbnail" }, { status: 500 });
  }
}
