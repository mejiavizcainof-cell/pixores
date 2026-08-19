import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { mediaUrlFromPath } from "../media-url.mjs";
import { mediaPathFromUrl } from "../media-url.mjs";
import { analyzeMediaFile } from "./media-analyzer.mjs";

const runtimeRequire = createRequire(import.meta.url);
const WAVEFORM_BUCKETS = 1200;
const EDITING_PROXY_VERSION = 2;
let mediaPreparationQueue = Promise.resolve();

function enqueueMediaPreparation(task) {
  const result = mediaPreparationQueue.then(task, task);
  mediaPreparationQueue = result.catch(() => undefined);
  return result;
}

function resolveFfmpegPath() {
  const packagePath = String(runtimeRequire("ffmpeg-static"));
  return packagePath.includes(`${path.sep}app.asar${path.sep}`)
    ? packagePath.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`)
    : packagePath;
}

function runFfmpeg(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveFfmpegPath(), args, {
      windowsHide: true,
      stdio: ["ignore", options.captureStdout ? "pipe" : "ignore", "pipe"],
    });
    const stderr = [];
    child.stderr.on("data", (chunk) => {
      stderr.push(chunk);
      if (stderr.length > 32) stderr.shift();
    });
    if (options.onStdout) child.stdout?.on("data", options.onStdout);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg media preparation failed (${code}): ${Buffer.concat(stderr).toString("utf8").slice(-2000)}`));
    });
  });
}

async function createEditingProxy(sourcePath, outputPath) {
  const commonArgs = [
    "-hide_banner", "-loglevel", "error", "-y", "-i", sourcePath,
    "-map", "0:v:0", "-map", "0:a?", "-vf", "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    "-r", "30", "-fps_mode", "cfr", "-pix_fmt", "yuv420p", "-g", "30", "-keyint_min", "15",
  ];
  try {
    await runFfmpeg([...commonArgs, "-c:v", "h264_nvenc", "-preset", "p4", "-cq", "25", "-b:v", "0", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputPath]);
  } catch {
    await fs.rm(outputPath, { force: true }).catch(() => undefined);
    await runFfmpeg([...commonArgs, "-c:v", "libx264", "-preset", "veryfast", "-crf", "25", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputPath]);
  }
}

async function createWaveformPeaks(sourcePath, duration) {
  const peaks = new Float32Array(WAVEFORM_BUCKETS);
  const totalSamples = Math.max(WAVEFORM_BUCKETS, Math.ceil(Math.max(0.01, Number(duration) || 1) * 8000));
  const samplesPerBucket = totalSamples / WAVEFORM_BUCKETS;
  let sampleIndex = 0;
  let carry = Buffer.alloc(0);
  await runFfmpeg([
    "-hide_banner", "-loglevel", "error", "-i", sourcePath, "-map", "0:a:0?",
    "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", "pipe:1",
  ], {
    captureStdout: true,
    onStdout(chunk) {
      const buffer = carry.length ? Buffer.concat([carry, chunk]) : chunk;
      const usableLength = buffer.length - (buffer.length % 2);
      for (let offset = 0; offset < usableLength; offset += 2) {
        const bucket = Math.min(WAVEFORM_BUCKETS - 1, Math.floor(sampleIndex / samplesPerBucket));
        peaks[bucket] = Math.max(peaks[bucket], Math.abs(buffer.readInt16LE(offset)) / 32768);
        sampleIndex += 1;
      }
      carry = usableLength < buffer.length ? buffer.subarray(usableLength) : Buffer.alloc(0);
    },
  });
  return Array.from(peaks, (value) => Number(value.toFixed(4)));
}

async function prepareEditingMedia(sourcePath, assetsRoot, mediaKind, metadata) {
  if (mediaKind !== "video" && mediaKind !== "audio") return {};
  const stat = await fs.stat(sourcePath);
  const cacheKey = crypto.createHash("sha256")
    .update(`${EDITING_PROXY_VERSION}|${path.normalize(sourcePath)}|${stat.size}|${stat.mtimeMs}`)
    .digest("hex")
    .slice(0, 24);
  const cacheDirectory = path.join(assetsRoot, ".pixores-cache");
  await fs.mkdir(cacheDirectory, { recursive: true });
  const waveformPath = path.join(cacheDirectory, `${cacheKey}.waveform.json`);
  let waveformPeaks;
  try {
    waveformPeaks = JSON.parse(await fs.readFile(waveformPath, "utf8"));
  } catch {
    if (metadata?.hasAudio !== false) {
      waveformPeaks = await createWaveformPeaks(sourcePath, metadata?.duration).catch(() => undefined);
      if (waveformPeaks) await fs.writeFile(waveformPath, JSON.stringify(waveformPeaks));
    }
  }

  let previewUrl;
  if (mediaKind === "video") {
    const proxyPath = path.join(cacheDirectory, `${cacheKey}.preview.mp4`);
    const proxyReady = await fs.stat(proxyPath).then((value) => value.size > 1024).catch(() => false);
    if (!proxyReady) await createEditingProxy(sourcePath, proxyPath);
    previewUrl = fileUrlFromPath(proxyPath);
  }
  return { previewUrl, waveformPeaks };
}

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
  return mediaUrlFromPath(filePath);
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

    // Unsaved projects still need stable files for preview, autosave and local
    // render. Keep a durable working-assets folder automatically; Save Project
    // can later point new imports at the package's sibling assets directory.
    state.workingProjectId ||= crypto.randomUUID();
    state.projectFolder ||= path.join(app.getPath("userData"), "video-maker-projects", ".working");
    state.assetsRoot = path.join(
      state.projectFolder,
      `${slugify(payload.title, "untitled-video")}-${state.workingProjectId}_assets`,
    );

    await fs.mkdir(path.join(state.assetsRoot, "images"), { recursive: true });
    await fs.mkdir(path.join(state.assetsRoot, "videos"), { recursive: true });
    await fs.mkdir(path.join(state.assetsRoot, "audio"), { recursive: true });
    return state.assetsRoot;
  }

  async function copyAssetToProject(payload) {
    const sourcePath = typeof payload?.sourcePath === "string" && path.isAbsolute(payload.sourcePath)
      ? path.normalize(payload.sourcePath)
      : "";
    if (!payload?.name || (!sourcePath && !payload?.bytes)) {
      throw new Error("Asset name and a native source path or bytes are required.");
    }

    const assetsRoot = await ensureAssetsRoot(payload);
    const assetKind = getAssetKind(payload);
    const targetDir = path.join(assetsRoot, assetKind);
    await fs.mkdir(targetDir, { recursive: true });

    const filename = safeFilename(payload.name);
    const destinationPath = path.join(targetDir, filename);
    let persistentPath = destinationPath;

    if (sourcePath) {
      const sourceStat = await fs.stat(sourcePath);
      if (!sourceStat.isFile()) throw new Error("The selected desktop media path is not a file.");

      try {
        // A hard link is instant, consumes no additional space and remains
        // available even if the original directory entry is later removed.
        await fs.link(sourcePath, destinationPath);
      } catch {
        // Cross-volume/removable media cannot be hard-linked. Reference the
        // original native file instead of copying gigabytes through memory.
        persistentPath = sourcePath;
      }
    } else {
      const bytes = payload.bytes instanceof ArrayBuffer
        ? Buffer.from(payload.bytes)
        : Buffer.from(payload.bytes.buffer || payload.bytes);
      await fs.writeFile(destinationPath, bytes);
    }

    const stat = await fs.stat(persistentPath);
    const mediaKind = assetKind === "videos" ? "video" : assetKind === "audio" ? "audio" : "image";
    const metadata = await analyzeMediaFile(persistentPath, {
      kind: mediaKind,
      mimeType: payload.mimeType || "application/octet-stream",
      size: stat.size,
    });
    const editingMedia = await enqueueMediaPreparation(
      () => prepareEditingMedia(persistentPath, assetsRoot, mediaKind, metadata),
    ).catch(() => ({}));

    return {
      ok: true,
      assetUrl: fileUrlFromPath(persistentPath),
      filename,
      mimeType: payload.mimeType || "application/octet-stream",
      size: stat.size,
      metadata,
      localPath: persistentPath,
      assetsRoot,
      ...editingMedia,
    };
  }

  return {
    chooseProjectFolder,
    copyAssetToProject,

    async prepareAsset(payload) {
      const sourcePath = mediaPathFromUrl(String(payload?.sourceUrl || ""));
      const assetsRoot = await ensureAssetsRoot();
      return enqueueMediaPreparation(
        () => prepareEditingMedia(sourcePath, assetsRoot, payload?.kind, payload?.metadata || {}),
      );
    },

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
