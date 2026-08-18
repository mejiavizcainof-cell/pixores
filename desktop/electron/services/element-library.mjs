import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { mediaPathFromUrl, mediaUrlFromPath } from "../media-url.mjs";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function profileId(value) {
  return crypto.createHash("sha256").update(String(value || "local-user").trim().toLowerCase()).digest("hex").slice(0, 24);
}

function safeExtension(sourcePath) {
  const extension = path.extname(sourcePath).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : "";
}

async function readManifest(manifestPath) {
  try {
    const parsed = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeManifest(manifestPath, items) {
  const temporaryPath = `${manifestPath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify({ version: 1, items }, null, 2), "utf8");
  await fs.rename(temporaryPath, manifestPath);
}

export function createElementLibraryHandlers({ app }) {
  function getPaths(userKey) {
    const root = path.join(app.getPath("userData"), "my-library", profileId(userKey));
    return {
      root,
      assets: path.join(root, "assets"),
      manifest: path.join(root, "library.json"),
    };
  }

  async function ensureLibrary(userKey) {
    const paths = getPaths(userKey);
    await fs.mkdir(paths.assets, { recursive: true });
    return paths;
  }

  return {
    async list(userKey) {
      const paths = await ensureLibrary(userKey);
      return { ok: true, items: await readManifest(paths.manifest) };
    },

    async save(payload = {}) {
      const paths = await ensureLibrary(payload.userKey);
      const existingItems = await readManifest(paths.manifest);
      const requestedItem = cloneJson(payload.item || {});
      const id = String(requestedItem.id || crypto.randomUUID());
      const now = new Date().toISOString();
      const storedAssets = [];

      for (const [index, asset] of (Array.isArray(requestedItem.assets) ? requestedItem.assets : []).entries()) {
        const storedAsset = cloneJson(asset);
        const sourceUrl = String(asset?.persistentUrl || asset?.url || "");
        try {
          const sourcePath = mediaPathFromUrl(sourceUrl);
          const destination = path.join(paths.assets, `${id}-${index}${safeExtension(sourcePath)}`);
          if (path.normalize(sourcePath) !== path.normalize(destination)) await fs.copyFile(sourcePath, destination);
          storedAsset.url = mediaUrlFromPath(destination);
          storedAsset.persistentUrl = storedAsset.url;
        } catch {
          // Packaged and web-served assets already have durable URLs. Keep them
          // unchanged when they are not native Pixores media URLs.
        }
        storedAssets.push(storedAsset);
      }

      const previous = existingItems.find((item) => item.id === id);
      const item = {
        ...requestedItem,
        id,
        assets: storedAssets,
        createdAt: previous?.createdAt || requestedItem.createdAt || now,
        updatedAt: now,
      };
      const items = [item, ...existingItems.filter((entry) => entry.id !== id)];
      await writeManifest(paths.manifest, items);
      return { ok: true, item, items };
    },

    async remove(payload = {}) {
      const paths = await ensureLibrary(payload.userKey);
      const id = String(payload.id || "");
      const items = (await readManifest(paths.manifest)).filter((item) => item.id !== id);
      await writeManifest(paths.manifest, items);
      const files = await fs.readdir(paths.assets).catch(() => []);
      await Promise.all(files
        .filter((name) => name.startsWith(`${id}-`))
        .map((name) => fs.rm(path.join(paths.assets, name), { force: true })));
      return { ok: true, items };
    },
  };
}
