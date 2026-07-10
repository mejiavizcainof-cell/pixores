import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { analyzeMediaFile } from "@/src/video-render/server/media-analyzer";

/**
 * Local persistent upload endpoint for Video Maker assets.
 *
 * This is the first storage adapter before moving to Supabase Storage or R2.
 * Files are saved under public/uploads/video-maker so Remotion can read them
 * through stable project URLs instead of temporary blob URLs.
 */

export const runtime = "nodejs";

const uploadDir = path.join(process.cwd(), "public", "uploads", "video-maker");
const publicUploadPath = "/uploads/video-maker";

function safeFilename(name: string) {
  const extension = path.extname(name).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const basename = path
    .basename(name, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "asset";

  return `${basename}-${crypto.randomUUID()}${extension}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    await fs.mkdir(uploadDir, { recursive: true });

    const filename = safeFilename(file.name);
    const bytes = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, bytes);
    const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
    const metadata = await analyzeMediaFile(filePath, {
      kind,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });

    return Response.json({
      ok: true,
      assetUrl: `${publicUploadPath}/${filename}`,
      filename,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      metadata,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
