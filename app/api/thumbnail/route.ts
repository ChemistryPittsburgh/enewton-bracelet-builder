/**
 * POST /api/thumbnail
 *
 * DEV-ONLY — writes the bracelet thumbnail PNG to public/thumbnails/ and
 * returns a static URL so the design can be saved with a preview_image_url
 * before S3 upload is wired up.
 *
 * Replace this entire route with a presigned S3 upload in production.
 *
 * Body:   { dataUrl: string; filename: string }
 * Return: { url: string }  e.g. "/thumbnails/bracelet-my-bracelet-1234567890.png"
 */

import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { dataUrl, filename } = (await req.json()) as {
      dataUrl: string;
      filename: string;
    };

    if (!dataUrl || !filename) {
      return NextResponse.json({ error: "dataUrl and filename are required" }, { status: 400 });
    }

    // Strip the data URL prefix and decode to binary
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    // Write to public/thumbnails/ — readable as a static asset
    const dir = path.join(process.cwd(), "public", "thumbnails");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);

    return NextResponse.json({ url: `/thumbnails/${filename}` });
  } catch (err) {
    console.error("[/api/thumbnail]", err);
    return NextResponse.json({ error: "Failed to save thumbnail" }, { status: 500 });
  }
}
