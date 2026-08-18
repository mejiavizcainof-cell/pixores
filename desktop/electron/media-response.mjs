import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { mediaPathFromUrl } from "./media-url.mjs";

function getMediaContentType(filePath) {
  return {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".opus": "audio/ogg",
    ".aif": "audio/aiff",
    ".aiff": "audio/aiff",
    ".wma": "audio/x-ms-wma",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  }[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function parseByteRange(headerValue, size) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(headerValue || "").trim());
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : size - 1;
  if (!match[1] && match[2]) {
    const suffixLength = Number(match[2]);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

function createStreamBody(filePath, options, signal) {
  const source = createReadStream(filePath, options);
  signal.addEventListener("abort", () => source.destroy(), { once: true });
  return Readable.toWeb(source);
}

export async function createMediaResponse(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Headers": "Range",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const filePath = mediaPathFromUrl(request.url);
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) throw new Error("Pixores media URL is not a file.");
  const range = parseByteRange(request.headers.get("range"), stat.size);
  const commonHeaders = {
    "Accept-Ranges": "bytes",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "private, max-age=3600",
    "Content-Type": getMediaContentType(filePath),
  };

  if (range) {
    return new Response(request.method === "HEAD" ? null : createStreamBody(filePath, range, request.signal), {
      status: 206,
      headers: {
        ...commonHeaders,
        "Content-Length": String(range.end - range.start + 1),
        "Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
      },
    });
  }

  return new Response(request.method === "HEAD" ? null : createStreamBody(filePath, undefined, request.signal), {
    status: 200,
    headers: { ...commonHeaders, "Content-Length": String(stat.size) },
  });
}
