import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { getVideoMakerUploadDirectory } from "@/src/video-render/server/upload-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".aac": "audio/aac",
  ".aiff": "audio/aiff",
  ".avi": "video/x-msvideo",
  ".flac": "audio/flac",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".m4a": "audio/mp4",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
  ".png": "image/png",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".wmv": "video/x-ms-wmv",
};

function resolveSafeAssetPath(filename: string) {
  if (!/^[a-z0-9][a-z0-9._-]{0,150}$/i.test(filename) || filename.includes("..")) return null;
  const directory = getVideoMakerUploadDirectory();
  const filePath = path.resolve(directory, filename);
  return path.dirname(filePath) === path.resolve(directory) ? filePath : null;
}

function responseHeaders(filename: string, size: number) {
  return new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
    "Content-Disposition": `inline; filename="${filename.replace(/["\\]/g, "_")}"`,
    "Content-Length": String(size),
    "Content-Type": MIME_TYPES[path.extname(filename).toLowerCase()] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const filePath = resolveSafeAssetPath(filename);
  if (!filePath) return new Response("Not found", { status: 404 });

  try {
    const stat = await fsPromises.stat(/* turbopackIgnore: true */ filePath);
    if (!stat.isFile()) return new Response("Not found", { status: 404 });
    const range = request.headers.get("range");
    const headers = responseHeaders(filename, stat.size);

    if (range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      if (!match) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
      const suffixLength = match[1] ? null : Number(match[2]);
      const start = suffixLength === null ? Number(match[1]) : Math.max(0, stat.size - suffixLength);
      const end = suffixLength === null && match[2] ? Math.min(stat.size - 1, Number(match[2])) : stat.size - 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= stat.size) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
      }
      const length = end - start + 1;
      headers.set("Content-Length", String(length));
      headers.set("Content-Range", `bytes ${start}-${end}/${stat.size}`);
      const stream = fs.createReadStream(/* turbopackIgnore: true */ filePath, { start, end });
      return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status: 206, headers });
    }

    const stream = fs.createReadStream(/* turbopackIgnore: true */ filePath);
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status: 200, headers });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response("Not found", { status: 404 });
    return new Response("The media file could not be read", { status: 500 });
  }
}
