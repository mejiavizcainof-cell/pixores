import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { analyzeMediaFile } from "./media-analyzer.mjs";

/**
 * Desktop asset adapter.
 *
 * Copies imported browser Files into a local sibling assets folder:
 *
 *   MiProyecto.pixores-video
 *   MiProyecto_assets/
 *     images/
 *     videos/
 *     audio/
 */

function slugify(value, fallback = "untitled-video") {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || fallback;
}

function safeFilename(name) {
  const extension = path.extname(name).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const basename = slugify(path.basename(name, extension), "asset").slice(0, 60);
  return `${basename}-${crypto.randomUUID()}${extension}`;
}

function getAssetKind(payload) {
  const mimeType = String(payload?.mimeType || "");
  if (payload?.kind === "audio" || mimeType.startsWith("audio/")) return "audio";
  if (payload?.kind === "video" || mimeType.startsWith("video/")) return "videos";
  return "images";
}

function getAssetsRootFromPackagePath(packagePath) {
  const parsed = path.parse(packagePath);
  return path.join(parsed.dir, `${parsed.name}_assets`);
}

function fileUrlFromPath(filePath) {
  return `file://${filePath.replaceAll("\\", "/")}`;
}

export function createDesktopAssetHandlers({ app, dialog, state }) {
  async function chooseProjectFolder(payload = {}) {
    const defaultPath = state.projectFolder || path.join(app.getPath("documents"), "Pixores Video Projects");
    await fs.mkdir(defaultPath, { recursive: true });

    const result = await dialog.showOpenDialog({
      title: "Choose Pixores video project folder",
      defaultPath,
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths?.[0]) {
      return { canceled: true };
    }

    const projectFolder = result.filePaths[0];
    const titleSlug = slugify(payload.title, "pixores-video-project");
    state.projectFolder = projectFolder;
    state.assetsRoot = path.join(projectFolder, `${titleSlug}_assets`);

    await fs.mkdir(path.join(state.assetsRoot, "images"), { recursive: true });
    await fs.mkdir(path.join(state.assetsRoot, "videos"), { recursive: true });
    await fs.mkdir(path.join(state.assetsRoot, "audio"), { recursive: true });

    return {
      ok: true,
      canceled: false,
      projectFolder: state.projectFolder,
      assetsRoot: state.assetsRoot,
    };
  }

  async function ensureAssetsRoot(payload = {}) {
    if (state.assetsRoot) return state.assetsRoot;

    const folderResult = await chooseProjectFolder(payload);
    if (folderResult.canceled) {
      throw new Error("Project folder selection was canceled.");
    }

    return state.assetsRoot;
  }

  async function copyAssetToProject(payload) {
    if (!payload?.name || !payload?.bytes) {
      throw new Error("Asset name and bytes are required.");
    }

    const assetsRoot = await ensureAssetsRoot(payload);
    const assetKind = getAssetKind(payload);
    const targetDir = path.join(assetsRoot, assetKind);
    await fs.mkdir(targetDir, { recursive: true });

    const filename = safeFilename(payload.name);
    const destinationPath = path.join(targetDir, filename);
    const bytes = payload.bytes instanceof ArrayBuffer
      ? Buffer.from(payload.bytes)
      : Buffer.from(payload.bytes.buffer || payload.bytes);

    await fs.writeFile(destinationPath, bytes);
    const stat = await fs.stat(destinationPath);
    const mediaKind = assetKind === "videos" ? "video" : assetKind === "audio" ? "audio" : "image";
    const metadata = await analyzeMediaFile(destinationPath, {
      kind: mediaKind,
      mimeType: payload.mimeType || "application/octet-stream",
      size: stat.size,
    });

    return {
      ok: true,
      assetUrl: fileUrlFromPath(destinationPath),
      filename,
      mimeType: payload.mimeType || "application/octet-stream",
      size: stat.size,
      metadata,
      localPath: destinationPath,
      assetsRoot,
    };
  }

  return {
    chooseProjectFolder,
    copyAssetToProject,

    async importAsset(payload) {
      return copyAssetToProject(payload);
    },

    setProjectPackagePath(packagePath) {
      state.packagePath = packagePath;
      state.projectFolder = path.dirname(packagePath);
      state.assetsRoot = getAssetsRootFromPackagePath(packagePath);
    },
  };
}
