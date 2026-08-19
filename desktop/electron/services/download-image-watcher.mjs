import fs from "node:fs/promises";
import path from "node:path";
import { mediaUrlFromPath } from "../media-url.mjs";

const IMAGE_MIME_BY_EXTENSION = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".bmp", "image/bmp"],
  [".avif", "image/avif"],
]);

export function createDownloadImageWatcher({ app }) {
  return {
    async listRecent(payload = {}) {
      const downloadsDirectory = path.resolve(app.getPath("downloads"));
      const since = Math.max(0, Number(payload.since) || 0);
      const now = Date.now();
      const entries = await fs.readdir(downloadsDirectory, { withFileTypes: true });
      const candidates = await Promise.all(entries.flatMap((entry) => {
        if (!entry.isFile()) return [];
        const extension = path.extname(entry.name).toLowerCase();
        const mimeType = IMAGE_MIME_BY_EXTENSION.get(extension);
        if (!mimeType) return [];
        const filePath = path.resolve(downloadsDirectory, entry.name);
        if (path.dirname(filePath) !== downloadsDirectory) return [];
        return [fs.stat(filePath).then((stat) => ({ entry, filePath, mimeType, stat })).catch(() => null)];
      }));

      const files = candidates
        .filter((candidate) => candidate
          && candidate.stat.mtimeMs > since
          && candidate.stat.mtimeMs < now - 750
          && candidate.stat.size > 0
          && candidate.stat.size <= 80 * 1024 * 1024)
        .sort((first, second) => first.stat.mtimeMs - second.stat.mtimeMs)
        .slice(-24)
        .map(({ entry, filePath, mimeType, stat }) => ({
          name: entry.name,
          mimeType,
          size: stat.size,
          lastModified: stat.mtimeMs,
          url: mediaUrlFromPath(filePath),
        }));
      return { ok: true, files, scannedAt: now };
    },
  };
}
