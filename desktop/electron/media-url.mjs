import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PIXORES_MEDIA_SCHEME = "pixores-media";

export function mediaUrlFromPath(filePath) {
  const normalizedPath = path.resolve(String(filePath || ""));
  const encodedFileUrl = Buffer.from(pathToFileURL(normalizedPath).href, "utf8").toString("base64url");
  return `${PIXORES_MEDIA_SCHEME}://local/${encodedFileUrl}`;
}

export function mediaPathFromUrl(value) {
  const sourceUrl = String(value || "");
  if (sourceUrl.startsWith("file:")) return fileURLToPath(sourceUrl);

  const parsed = new URL(sourceUrl);
  if (parsed.protocol !== `${PIXORES_MEDIA_SCHEME}:` || parsed.hostname !== "local") {
    throw new Error("Unsupported Pixores media URL.");
  }

  const encodedFileUrl = parsed.pathname.replace(/^\/+/, "");
  const fileUrl = Buffer.from(encodedFileUrl, "base64url").toString("utf8");
  if (!fileUrl.startsWith("file:")) throw new Error("Invalid Pixores media URL.");
  return fileURLToPath(fileUrl);
}
