import crypto from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { mediaPathFromUrl, PIXORES_MEDIA_SCHEME } from "../media-url.mjs";

const renderJobs = new Map();
const renderCancels = new Map();
const runtimeRequire = createRequire(import.meta.url);
let remotionBundleCache = { key: "", promise: null };
let remotionBrowserCache = null;
let acceleratedBinariesCache = null;
const hardwareEncoderProbeCache = new Map();
const renderProxyPruneCache = new Map();
const sourceDisplayRotationCache = new Map();
const sourceAudioStreamCache = new Map();

const videoExportFormats = [
  { id: "mp4-h264", label: "MP4 H.264", extension: "mp4", codec: "h264" },
  { id: "mp4-h265", label: "MP4 H.265 / HEVC", extension: "mp4", codec: "h265" },
  { id: "mov-prores", label: "MOV ProRes", extension: "mov", codec: "prores" },
  { id: "webm-vp9", label: "WebM VP9", extension: "webm", codec: "vp9" },
  { id: "webm-vp8", label: "WebM VP8", extension: "webm", codec: "vp8" },
];

const qualityCrf = {
  fast: 26,
  recommended: 22,
  high: 19,
  maximum: 17,
  custom: 22,
};

const qualityVideoKbps = {
  fast: 4500,
  recommended: 8000,
  high: 12000,
  maximum: 18000,
  custom: 8000,
};

function calculateProjectDuration(layers) {
  return Array.isArray(layers) ? layers.reduce((latestEnd, layer) => {
    const start = Number(layer?.start);
    const duration = Number(layer?.duration);
    if (!Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0) return latestEnd;
    return Math.max(latestEnd, Math.max(0, start) + duration);
  }, 0) : 0;
}

function timeToFrame(time, fps) {
  return Math.max(0, Math.round((Number(time) || 0) * Math.max(1, fps)));
}

function frameToTime(frame, fps) {
  return Math.max(0, Number(frame) || 0) / Math.max(1, fps);
}

function resolveSmartReframeAtTime(reframe, time) {
  const keyframes = Array.isArray(reframe?.keyframes) ? reframe.keyframes : [];
  if (keyframes.length === 0) return null;
  if (time <= keyframes[0].time) return keyframes[0];
  if (time >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1];
  const nextIndex = keyframes.findIndex((keyframe) => Number(keyframe.time) >= time);
  const next = keyframes[nextIndex];
  const previous = keyframes[Math.max(0, nextIndex - 1)];
  const progress = Math.max(0, Math.min(1, (time - Number(previous.time)) / Math.max(0.001, Number(next.time) - Number(previous.time))));
  const eased = progress * progress * (3 - 2 * progress);
  return {
    time,
    centerX: Number(previous.centerX) + (Number(next.centerX) - Number(previous.centerX)) * eased,
    centerY: Number(previous.centerY) + (Number(next.centerY) - Number(previous.centerY)) * eased,
    zoom: Number(previous.zoom) + (Number(next.zoom) - Number(previous.zoom)) * eased,
    trackId: progress < 0.5 ? previous.trackId : next.trackId,
    confidence: previous.confidence ?? next.confidence,
  };
}

function sliceSmartReframe(reframe, offset, duration) {
  if (!Array.isArray(reframe?.keyframes) || reframe.keyframes.length === 0) return undefined;
  const end = offset + duration;
  const first = resolveSmartReframeAtTime(reframe, offset);
  const last = resolveSmartReframeAtTime(reframe, end);
  const middle = reframe.keyframes
    .filter((keyframe) => Number(keyframe.time) > offset && Number(keyframe.time) < end)
    .map((keyframe) => ({ ...keyframe, time: Number(keyframe.time) - offset }));
  const keyframes = [
    ...(first ? [{ ...first, time: 0 }] : []),
    ...middle,
    ...(last ? [{ ...last, time: duration }] : []),
  ];
  return keyframes.length ? { ...reframe, keyframes } : undefined;
}

function createRangeRenderProject(project, exportSettings = {}) {
  const fullDuration = Math.max(0.05, Number(project?.duration) || calculateProjectDuration(project?.layers));
  const requestedStart = Number(exportSettings?.rangeStart);
  const requestedEnd = Number(exportSettings?.rangeEnd);
  const rangeStart = Number.isFinite(requestedStart) ? Math.max(0, Math.min(requestedStart, fullDuration)) : 0;
  const rangeEnd = Number.isFinite(requestedEnd) ? Math.max(rangeStart, Math.min(requestedEnd, fullDuration)) : fullDuration;
  if (rangeStart <= 0.001 && rangeEnd >= fullDuration - 0.001) {
    return { ...project, duration: fullDuration };
  }

  const rangeDuration = Math.max(0.05, rangeEnd - rangeStart);
  const layers = (project?.layers || []).flatMap((layer) => {
    const layerStart = Number(layer?.start) || 0;
    const layerDuration = Math.max(0, Number(layer?.duration) || 0);
    const layerEnd = layerStart + layerDuration;
    const clippedStart = Math.max(layerStart, rangeStart);
    const clippedEnd = Math.min(layerEnd, rangeEnd);
    const clippedDuration = clippedEnd - clippedStart;
    if (clippedDuration <= 0.001) return [];

    const trimFromStart = Math.max(0, clippedStart - layerStart);
    const timedMedia = layer.type === "media" || layer.type === "audio";
    const originalSourceStart = Number(layer.sourceStart ?? layer.trimStart ?? 0) || 0;
    const sourceStart = timedMedia ? originalSourceStart + trimFromStart : layer.sourceStart;
    const sourceEnd = timedMedia ? sourceStart + clippedDuration : layer.sourceEnd;

    return [{
      ...layer,
      start: Math.max(0, clippedStart - rangeStart),
      duration: clippedDuration,
      cutTime: layer.cutTime === undefined ? undefined : Math.max(0, Math.min(rangeDuration, layer.cutTime - rangeStart)),
      sourceStart,
      trimStart: timedMedia ? sourceStart : layer.trimStart,
      sourceEnd,
      trimEnd: timedMedia ? sourceEnd : layer.trimEnd,
      animations: layer.animations?.map((animation) => ({
        ...animation,
        start: Math.max(0, Number(animation.start || 0) - trimFromStart),
      })),
      keyframes: layer.keyframes?.flatMap((keyframe) => {
        const nextTime = Number(keyframe.time || 0) - trimFromStart;
        return nextTime >= 0 && nextTime <= clippedDuration ? [{ ...keyframe, time: nextTime }] : [];
      }),
      smartReframe: sliceSmartReframe(layer.smartReframe, trimFromStart, clippedDuration),
    }];
  });
  const layerIds = new Set(layers.map((layer) => layer.id));
  const transitions = (project?.transitions || []).flatMap((transition) => {
    const transitionStart = Number(transition.start) || 0;
    const transitionDuration = Math.max(0, Number(transition.duration) || 0);
    const transitionEnd = transitionStart + transitionDuration;
    const clippedStart = Math.max(transitionStart, rangeStart);
    const clippedEnd = Math.min(transitionEnd, rangeEnd);
    if (
      clippedEnd - clippedStart <= 0.001
      || (transition.fromLayerId && !layerIds.has(transition.fromLayerId))
      || (transition.toLayerId && !layerIds.has(transition.toLayerId))
    ) return [];
    return [{
      ...transition,
      start: Math.max(0, clippedStart - rangeStart),
      duration: clippedEnd - clippedStart,
      cutTime: transition.cutTime === undefined
        ? undefined
        : Math.max(0, Math.min(rangeDuration, Number(transition.cutTime) - rangeStart)),
    }];
  });

  return {
    ...project,
    duration: rangeDuration,
    layers,
    transitions,
  };
}

function getVideoExportFormat(formatId) {
  return videoExportFormats.find((format) => format.id === formatId)
    || videoExportFormats.find((format) => format.id === "mp4-h264")
    || videoExportFormats[0];
}

function normalizeExportFileName(fileName, extension) {
  const safeName = String(fileName || "pixores-video")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\.(mp4|webm|mov)$/i, "");
  return `${safeName || "pixores-video"}.${extension}`;
}

async function publishRenderedOutput(temporaryPath, finalPath) {
  if (!temporaryPath || !finalPath || temporaryPath === finalPath) return finalPath;
  const backupPath = `${finalPath}.pixores-backup-${crypto.randomUUID()}`;
  let hasBackup = false;
  try {
    await fs.rename(finalPath, backupPath);
    hasBackup = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  try {
    await fs.rename(temporaryPath, finalPath);
  } catch (error) {
    if (hasBackup) await fs.rename(backupPath, finalPath).catch(() => {});
    throw error;
  }
  if (hasBackup) await fs.rm(backupPath, { force: true });
  return finalPath;
}

function loadRemotionModules() {
  const bundler = runtimeRequire("@remotion/bundler");
  const renderer = runtimeRequire("@remotion/renderer");

  return {
    bundle: bundler.bundle,
    renderMedia: renderer.renderMedia,
    selectComposition: renderer.selectComposition,
    makeCancelSignal: renderer.makeCancelSignal,
    ensureBrowser: renderer.ensureBrowser,
  };
}

function prepareRemotionBrowser({ app, ensureBrowser }) {
  if (!remotionBrowserCache) {
    remotionBrowserCache = (async () => {
      const localAppData = process.env.LOCALAPPDATA || app.getPath("userData");
      const runtimeDirectory = path.join(localAppData, "Pixores Desktop", "runtime");
      await fs.mkdir(runtimeDirectory, { recursive: true });
      const originalDirectory = process.cwd();
      try {
        process.chdir(runtimeDirectory);
        const browser = await ensureBrowser({
          chromeMode: "headless-shell",
          logLevel: "warn",
        });
        if (!browser?.path) throw new Error("Remotion browser could not be prepared in the Pixores runtime cache.");
        await fs.access(browser.path);
        return browser.path;
      } finally {
        if (process.cwd() === runtimeDirectory) process.chdir(originalDirectory);
      }
    })().catch((error) => {
      remotionBrowserCache = null;
      throw error;
    });
  }
  return remotionBrowserCache;
}

async function configurePackagedBinaries(appRoot) {
  const unpackedRoot = appRoot.endsWith(".asar")
    ? path.join(path.dirname(appRoot), "app.asar.unpacked")
    : null;
  const esbuildBinaryPath = unpackedRoot
    ? path.join(unpackedRoot, "node_modules", "@esbuild", "win32-x64", "esbuild.exe")
    : null;
  const remotionBinariesDirectory = unpackedRoot
    ? path.join(unpackedRoot, "node_modules", "@remotion", "compositor-win32-x64-msvc")
    : runtimeRequire("@remotion/compositor-win32-x64-msvc").dir;

  if (esbuildBinaryPath) {
    try {
      await fs.access(esbuildBinaryPath);
      process.env.ESBUILD_BINARY_PATH = esbuildBinaryPath;
    } catch {
      // esbuild will surface its own detailed error if the binary is missing.
    }
  }

  await Promise.all(["ffmpeg.exe", "ffprobe.exe", "remotion.exe"].map((fileName) => (
    fs.access(path.join(remotionBinariesDirectory, fileName))
  )));
  return remotionBinariesDirectory;
}

function runExecutable(executablePath, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(executablePath, args, {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 15_000,
      windowsHide: true,
      ...options,
    }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function parseFfmpegClock(value) {
  const match = /^(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(String(value || "").trim());
  if (!match) return 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function runExecutableWithProgress(executablePath, args, { signal, timeout = 30 * 60 * 1000, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executablePath, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdoutBuffer = "";
    let stderr = "";
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve({ stderr });
    };
    const abort = () => {
      child.kill();
      finish(new Error("Fast render was cancelled."));
    };
    const timeoutId = setTimeout(() => {
      child.kill();
      finish(new Error("Fast render timed out."));
    }, timeout);

    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";
      for (const line of lines) {
        const separator = line.indexOf("=");
        if (separator < 0) continue;
        const key = line.slice(0, separator);
        const value = line.slice(separator + 1);
        if (key === "out_time") onProgress?.(parseFfmpegClock(value));
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-4 * 1024 * 1024);
    });
    child.on("error", finish);
    child.on("close", (code) => {
      if (code === 0) finish();
      else {
        const error = new Error(`Fast render exited with code ${code}.`);
        error.stderr = stderr;
        finish(error);
      }
    });
  });
}

function getHardwareEncoderName(codec) {
  if (process.platform !== "win32" && process.platform !== "linux") return null;
  if (codec === "h264") return "h264_nvenc";
  if (codec === "h265") return "hevc_nvenc";
  return null;
}

function getSoftwareEncoderName(codec) {
  return {
    h264: "libx264",
    h265: "libx265",
    vp8: "libvpx",
    vp9: "libvpx-vp9",
    prores: "prores_ks",
  }[codec] || codec.toUpperCase();
}

function getEncoderLabel(codec, hardwareAccelerated, suffix = "") {
  const encoderName = hardwareAccelerated ? getHardwareEncoderName(codec) : getSoftwareEncoderName(codec);
  const device = hardwareAccelerated ? "NVIDIA GPU" : "CPU";
  return `${encoderName} - ${device}${suffix ? ` (${suffix})` : ""}`;
}

async function probeHardwareEncoder(ffmpegPath, encoderName) {
  if (!encoderName) return false;
  const cacheKey = `${ffmpegPath}|${encoderName}`;
  if (!hardwareEncoderProbeCache.has(cacheKey)) {
    const probe = (async () => {
      try {
        const { stdout } = await runExecutable(ffmpegPath, ["-hide_banner", "-encoders"]);
        if (!new RegExp(`\\b${encoderName}\\b`).test(stdout)) return false;
        await runExecutable(ffmpegPath, [
          "-hide_banner",
          "-loglevel", "error",
          "-f", "lavfi",
          "-i", "color=c=black:s=256x256:r=1",
          "-frames:v", "1",
          "-c:v", encoderName,
          "-f", "null",
          process.platform === "win32" ? "NUL" : "/dev/null",
        ]);
        return true;
      } catch {
        return false;
      }
    })();
    hardwareEncoderProbeCache.set(cacheKey, probe);
  }
  return hardwareEncoderProbeCache.get(cacheKey);
}

async function prepareAcceleratedBinaries({ app, appRoot, remotionBinariesDirectory, codec }) {
  const encoderName = getHardwareEncoderName(codec);
  if (!encoderName) return { binariesDirectory: remotionBinariesDirectory, hardwareAvailable: false };

  if (!acceleratedBinariesCache) {
    acceleratedBinariesCache = (async () => {
      const packageFfmpegPath = String(runtimeRequire("ffmpeg-static"));
      const ffmpegPath = appRoot.endsWith(".asar")
        ? packageFfmpegPath.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`)
        : packageFfmpegPath;
      await fs.access(ffmpegPath);

      const rendererVersion = runtimeRequire("@remotion/renderer/package.json").version;
      const ffmpegStat = await fs.stat(ffmpegPath);
      const cacheKey = crypto.createHash("sha256")
        .update(`${rendererVersion}|${ffmpegStat.size}|${Math.trunc(ffmpegStat.mtimeMs)}`)
        .digest("hex")
        .slice(0, 16);
      const cacheRoot = path.join(app.getPath("userData"), "render-binaries");
      const cacheDirectory = path.join(cacheRoot, cacheKey);
      const readyMarker = path.join(cacheDirectory, ".ready");

      try {
        await Promise.all([
          fs.access(readyMarker),
          fs.access(path.join(cacheDirectory, "remotion.exe")),
          fs.access(path.join(cacheDirectory, "ffprobe.exe")),
          fs.access(path.join(cacheDirectory, "ffmpeg.exe")),
        ]);
      } catch {
        await fs.rm(cacheDirectory, { recursive: true, force: true });
        await fs.mkdir(cacheRoot, { recursive: true });
        const stagingDirectory = `${cacheDirectory}-${crypto.randomUUID()}.tmp`;
        await fs.cp(remotionBinariesDirectory, stagingDirectory, { recursive: true });
        await fs.copyFile(ffmpegPath, path.join(stagingDirectory, "ffmpeg.exe"));
        await fs.writeFile(path.join(stagingDirectory, ".ready"), cacheKey, "utf8");
        await fs.rename(stagingDirectory, cacheDirectory);
      }

      return cacheDirectory;
    })().catch((error) => {
      acceleratedBinariesCache = null;
      throw error;
    });
  }

  try {
    const binariesDirectory = await acceleratedBinariesCache;
    const hardwareAvailable = await probeHardwareEncoder(path.join(binariesDirectory, "ffmpeg.exe"), encoderName);
    return { binariesDirectory, hardwareAvailable };
  } catch {
    return { binariesDirectory: remotionBinariesDirectory, hardwareAvailable: false };
  }
}

function fileUrlFromPath(filePath) {
  return pathToFileURL(filePath).href;
}

function resolveProjectPublicMediaUrls(project, publicRoot) {
  const resolvedPublicRoot = path.resolve(publicRoot);
  const resolveSource = (value) => {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return value;
    const pathname = decodeURIComponent(new URL(value, "http://127.0.0.1").pathname);
    const filePath = path.resolve(resolvedPublicRoot, `.${pathname}`);
    if (!filePath.startsWith(`${resolvedPublicRoot}${path.sep}`)) {
      throw new Error(`Local public media path is outside the Pixores library: ${value}`);
    }
    return fileUrlFromPath(filePath);
  };
  return {
    ...project,
    assets: (project.assets || []).map((asset) => ({
      ...asset,
      url: resolveSource(asset.url),
      persistentUrl: resolveSource(asset.persistentUrl),
    })),
    layers: (project.layers || []).map((layer) => ({
      ...layer,
      src: resolveSource(layer.src),
    })),
  };
}

function getCachedRemotionServeUrl({ app, bundle, entryPoint, renderRoot }) {
  const key = `${renderRoot}|${entryPoint}`;
  if (remotionBundleCache.key !== key || !remotionBundleCache.promise) {
    const promise = (async () => {
      // Remotion only needs the packaged font catalog. Passing Pixores' full
      // public directory would make the bundler scan and copy the complete
      // video/audio library. Project media continues to use the local range
      // server below, while this small cache keeps offline fonts available.
      const publicDir = path.join(app.getPath("temp"), "pixores-remotion-public-cache-v2");
      const fontSource = path.join(renderRoot, "public", "video-maker-assets", "fonts");
      const fontTarget = path.join(publicDir, "video-maker-assets", "fonts");
      await fs.mkdir(path.dirname(fontTarget), { recursive: true });
      await fs.cp(fontSource, fontTarget, { recursive: true, force: true });
      return bundle({
        entryPoint,
        enableCaching: true,
        publicDir,
        rootDir: renderRoot,
      });
    })();
    remotionBundleCache = { key, promise };
    void promise.catch(() => {
      if (remotionBundleCache.promise === promise) remotionBundleCache = { key: "", promise: null };
    });
  }
  return remotionBundleCache.promise;
}

function getMediaContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml; charset=utf-8",
  }[extension] || "application/octet-stream";
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

async function createLocalMediaServer(project, publicRoot) {
  const sourceRouteMap = new Map();
  const routeMap = new Map();
  const candidateUrls = [
    ...(project.assets || []).flatMap((asset) => [asset.persistentUrl, asset.url]),
    ...(project.layers || []).map((layer) => layer.src),
  ].filter((value) => typeof value === "string" && (
    value.startsWith("file:")
    || value.startsWith(`${PIXORES_MEDIA_SCHEME}:`)
    || (value.startsWith("/") && !value.startsWith("//"))
  ));

  for (const sourceUrl of new Set(candidateUrls)) {
    const filePath = sourceUrl.startsWith("file:") || sourceUrl.startsWith(`${PIXORES_MEDIA_SCHEME}:`)
      ? mediaPathFromUrl(sourceUrl)
      : path.resolve(publicRoot, `.${decodeURIComponent(new URL(sourceUrl, "http://127.0.0.1").pathname)}`);
    if (
      !sourceUrl.startsWith("file:")
      && !sourceUrl.startsWith(`${PIXORES_MEDIA_SCHEME}:`)
      && !filePath.startsWith(`${path.resolve(publicRoot)}${path.sep}`)
    ) {
      throw new Error(`Local public media path is outside the Pixores library: ${sourceUrl}`);
    }
    await fs.access(filePath);
    const route = `/media/${routeMap.size}/${encodeURIComponent(path.basename(filePath))}`;
    routeMap.set(route, filePath);
    sourceRouteMap.set(sourceUrl, route);
  }

  if (routeMap.size === 0) {
    return { project, close: async () => undefined };
  }

  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const filePath = routeMap.get(requestUrl.pathname);
      if (!filePath) {
        response.writeHead(404).end("Not found");
        return;
      }

      const stat = await fs.stat(filePath);
      const range = parseByteRange(request.headers.range, stat.size);
      const commonHeaders = {
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "private, max-age=3600",
        "Content-Type": getMediaContentType(filePath),
      };

      if (range) {
        response.writeHead(206, {
          ...commonHeaders,
          "Content-Length": range.end - range.start + 1,
          "Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
        });
        if (request.method === "HEAD") response.end();
        else createReadStream(filePath, range).pipe(response);
        return;
      }

      response.writeHead(200, { ...commonHeaders, "Content-Length": stat.size });
      if (request.method === "HEAD") response.end();
      else createReadStream(filePath).pipe(response);
    } catch {
      if (!response.headersSent) response.writeHead(500);
      response.end("Local media could not be read");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const resolveSource = (sourceUrl) => {
    const route = sourceRouteMap.get(sourceUrl);
    return route ? `http://127.0.0.1:${port}${route}` : sourceUrl;
  };
  const renderProject = {
    ...project,
    assets: (project.assets || []).map((asset) => ({
      ...asset,
      url: resolveSource(asset.url),
      persistentUrl: resolveSource(asset.persistentUrl),
    })),
    layers: (project.layers || []).map((layer) => ({
      ...layer,
      src: resolveSource(layer.src),
    })),
  };

  return {
    project: renderProject,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

function getProgressValue(value) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && typeof value.progress === "number") return value.progress;
  return 0;
}

function getExportsDir({ app, state }) {
  return state?.renderOutputDirectory || app.getPath("downloads");
}

function projectAtOutputResolution(project, width, height) {
  const outputWidth = Math.max(1, Math.round(Number(width) || Number(project?.canvas?.width) || 1920));
  const outputHeight = Math.max(1, Math.round(Number(height) || Number(project?.canvas?.height) || 1080));
  return {
    ...project,
    canvas: { width: outputWidth, height: outputHeight },
    format: project?.format ? { ...project.format, width: outputWidth, height: outputHeight } : project?.format,
  };
}

function getSafeRenderConcurrency(composition) {
  const requestedConcurrency = Number(process.env.PIXORES_RENDER_CONCURRENCY);
  const logicalCores = Math.max(1, os.cpus().length);
  if (Number.isFinite(requestedConcurrency) && requestedConcurrency >= 1) {
    return Math.max(1, Math.min(logicalCores, Math.floor(requestedConcurrency)));
  }
  const pixels = Math.max(1, Number(composition?.width) * Number(composition?.height));
  const resolutionLimit = pixels >= 3840 * 2160 ? 2 : pixels >= 2560 * 1440 ? 4 : pixels >= 1920 * 1080 ? 6 : 8;
  const memoryPerWorker = pixels >= 3840 * 2160 ? 3 * 1024 ** 3 : pixels >= 2560 * 1440 ? 2 * 1024 ** 3 : 1024 ** 3;
  const memoryLimit = Math.max(1, Math.floor(Math.max(0, os.freemem() - 2 * 1024 ** 3) / memoryPerWorker));
  const cpuLimit = Math.max(1, Math.floor(logicalCores * 0.6));
  return Math.max(1, Math.min(resolutionLimit, cpuLimit, memoryLimit));
}

function getOffthreadVideoThreads(renderConcurrency) {
  const requestedThreads = Number(process.env.PIXORES_OFFTHREAD_VIDEO_THREADS);
  if (Number.isFinite(requestedThreads) && requestedThreads >= 1) {
    return Math.max(1, Math.min(8, Math.floor(requestedThreads)));
  }
  return Math.max(1, Math.min(4, renderConcurrency));
}

function isRecoverableCompositorFailure(error) {
  const details = `${error instanceof Error ? error.message : error}\n${error instanceof Error ? error.stack || "" : ""}`.toLowerCase();
  return details.includes("stream was destroyed")
    || details.includes("write after end")
    || details.includes("target closed")
    || details.includes("browser has disconnected")
    || (details.includes("delayrender") && details.includes("timed out"))
    || details.includes("compositor")
    || details.includes("offthread-video-server");
}

function isHardwareEncoderFailure(error) {
  const details = `${error instanceof Error ? error.message : error}\n${error instanceof Error ? error.stack || "" : ""}`.toLowerCase();
  return details.includes("nvenc")
    || details.includes("nvcuda")
    || details.includes("no capable devices")
    || details.includes("hardware encoder")
    || details.includes("initializeencoder failed");
}

async function getReadableRenderRoot(appRoot) {
  if (!appRoot.endsWith(".asar")) return appRoot;

  const unpackedRoot = path.join(path.dirname(appRoot), "app.asar.unpacked");
  try {
    await fs.access(path.join(unpackedRoot, "src", "video-render", "remotion", "entry.ts"));
    return unpackedRoot;
  } catch {
    return appRoot;
  }
}

function getMediaWarnings(project) {
  return (project.layers || [])
    .filter((layer) => (
      (layer.type === "media" && (layer.mediaKind === "image" || layer.mediaKind === "video"))
      || layer.type === "audio"
    ))
    .flatMap((layer) => {
      const asset = layer.assetKey ? project.assets?.find((item) => item.id === layer.assetKey) : undefined;
      const src = asset?.persistentUrl || asset?.url || layer.src || "";
      const label = layer.type === "audio" ? "Audio" : layer.mediaKind === "video" ? "Video" : "Image";
      if (!src) return [`${label} "${layer.name}" was skipped: missing persistent URL.`];
      if (src.startsWith("blob:")) return [`${label} "${layer.name}" was skipped: blob URLs cannot be rendered locally.`];
      return [];
    });
}

function getLocalLayerMediaPath(project, layer) {
  const asset = layer.assetKey ? project.assets?.find((item) => item.id === layer.assetKey) : undefined;
  const sourceUrl = asset?.persistentUrl || asset?.url || layer.src || "";
  if (sourceUrl.startsWith("file:") || sourceUrl.startsWith(PIXORES_MEDIA_SCHEME + ":")) {
    return mediaPathFromUrl(sourceUrl);
  }
  return path.isAbsolute(sourceUrl) ? sourceUrl : null;
}

function isDefaultFullCanvasVideoLayer(layer, includeAudio) {
  const transform = layer.transform;
  const normalizedAngle = ((Number(layer.angle || 0) % 360) + 360) % 360;
  const hasDefaultTransform = !transform
    || (Number(transform.scale ?? 1) === 1 && Number(transform.x || 0) === 0 && Number(transform.y || 0) === 0);
  const hasUnsupportedStyling = layer.crop
    || layer.effect
    || (Array.isArray(layer.animations) && layer.animations.length > 0)
    || (Array.isArray(layer.keyframes) && layer.keyframes.length > 0)
    || (Array.isArray(layer.smartReframe?.keyframes) && layer.smartReframe.keyframes.length > 0)
    || layer.isFlippedH
    || layer.isFlippedV
    || ![0, 90, 180, 270].includes(normalizedAngle)
    || Number(layer.opacity ?? 1) !== 1
    || !Number.isFinite(Number(layer.x ?? 0))
    || !Number.isFinite(Number(layer.y ?? 0))
    || !Number.isFinite(Number(layer.width ?? 100))
    || !Number.isFinite(Number(layer.height ?? 100))
    || Number(layer.width ?? 100) <= 0
    || Number(layer.height ?? 100) <= 0
    || (layer.objectFit && layer.objectFit !== "cover" && layer.objectFit !== "contain")
    || (layer.blendMode && layer.blendMode !== "normal")
    || Number(layer.blur || 0) !== 0
    || Number(layer.borderRadius || 0) !== 0
    || Number(layer.strokeWidth || 0) !== 0
    || (layer.shadowPreset && layer.shadowPreset !== "none")
    || !hasDefaultTransform;
  if (hasUnsupportedStyling) return false;
  if (!includeAudio) return true;
  return Number.isFinite(Number(layer.volume ?? 1));
}

export function buildNativeAudioFilters(clip, sampleRate) {
  const effects = clip.audioEffects?.enabled === false ? {} : (clip.audioEffects || {});
  const filters = [
    `aresample=${sampleRate}`,
    "aformat=sample_fmts=fltp:channel_layouts=stereo",
  ];
  const highPassHz = Math.max(0, Math.min(300, Number(effects.highPassHz) || 0));
  if (highPassHz > 0) filters.push(`highpass=f=${highPassHz}`);
  const hum = [50, 60].includes(Number(effects.humRemovalHz)) ? Number(effects.humRemovalHz) : 0;
  if (hum) filters.push(`bandreject=f=${hum}:width_type=h:w=3`, `bandreject=f=${hum * 2}:width_type=h:w=5`);
  const noiseReduction = Math.max(0, Math.min(1, Number(effects.noiseReduction) || 0));
  if (noiseReduction > 0) filters.push(`afftdn=nr=${(6 + noiseReduction * 18).toFixed(2)}:nf=-45`);
  const deEsser = Math.max(0, Math.min(1, Number(effects.deEsser) || 0));
  if (deEsser > 0) filters.push(`equalizer=f=6500:t=q:w=1:g=${(-deEsser * 8).toFixed(2)}`);
  const bands = [
    [120, Number(effects.lowGainDb) || 0],
    [1200, Number(effects.midGainDb) || 0],
    [8000, Number(effects.highGainDb) || 0],
  ];
  bands.forEach(([frequency, gain]) => {
    if (Math.abs(gain) >= 0.05) filters.push(`equalizer=f=${frequency}:t=q:w=0.8:g=${Math.max(-18, Math.min(18, gain)).toFixed(2)}`);
  });
  const compressor = Math.max(0, Math.min(1, Number(effects.compressor) || 0));
  if (compressor > 0) filters.push(`acompressor=threshold=${(-12 - compressor * 18).toFixed(1)}dB:ratio=${(2 + compressor * 6).toFixed(2)}:attack=15:release=180:makeup=${(1 + compressor * 3).toFixed(2)}`);
  if (effects.normalize) filters.push("loudnorm=I=-16:LRA=11:TP=-1.5");
  const pan = Math.max(-1, Math.min(1, Number(effects.pan) || 0));
  if (Math.abs(pan) >= 0.01) filters.push(`stereotools=balance_out=${pan.toFixed(3)}`);
  const reverbEchoes = {
    studio: "aecho=0.8:0.72:45:0.16",
    room: "aecho=0.8:0.75:75:0.22",
    hall: "aecho=0.8:0.82:140|220:0.28|0.18",
    stage: "aecho=0.8:0.78:95|185:0.25|0.16",
  };
  if (reverbEchoes[effects.reverb]) filters.push(reverbEchoes[effects.reverb]);
  if (effects.echoEnabled) {
    const delay = Math.max(40, Math.min(1000, Number(effects.echoDelayMs) || 180));
    const decay = Math.max(0.05, Math.min(0.9, Number(effects.echoDecay) || 0.3));
    filters.push(`aecho=0.8:0.8:${delay.toFixed(0)}:${decay.toFixed(3)}`);
  }
  const gainDb = Math.max(-24, Math.min(24, Number(effects.gainDb) || 0));
  filters.push(`volume=${clip.volume.toFixed(6)}`, `volume=${gainDb.toFixed(2)}dB`);
  const fadeIn = Math.max(0, Math.min(clip.duration, Number(clip.audioFadeIn) || 0));
  const fadeOut = Math.max(0, Math.min(clip.duration, Number(clip.audioFadeOut) || 0));
  if (fadeIn > 0) filters.push(`afade=t=in:st=0:d=${fadeIn.toFixed(6)}`);
  if (fadeOut > 0) filters.push(`afade=t=out:st=${Math.max(0, clip.duration - fadeOut).toFixed(6)}:d=${fadeOut.toFixed(6)}`);
  if (effects.limiter !== false) filters.push("alimiter=limit=0.97");
  filters.push(`apad=whole_dur=${clip.duration.toFixed(6)}`, `atrim=end=${clip.duration.toFixed(6)}`, "asetpts=N/SR/TB");
  return filters.join(",");
}

function hasAudioProcessing(layer) {
  const effects = layer.audioEffects;
  if (!effects || effects.enabled === false) return false;
  return Boolean(
    effects.normalize || effects.echoEnabled || effects.limiter
    || Number(effects.gainDb) || Number(effects.pan) || Number(effects.highPassHz)
    || Number(effects.humRemovalHz) || Number(effects.noiseReduction) || Number(effects.deEsser)
    || Number(effects.lowGainDb) || Number(effects.midGainDb) || Number(effects.highGainDb)
    || Number(effects.compressor) || (effects.reverb && effects.reverb !== "none")
  );
}

async function preprocessProjectAudioEffects(project, { ffmpegPath, outputDirectory, sampleRate, signal }) {
  const processingLayers = (project.layers || []).filter((layer) => (
    layer.visible !== false
    && !layer.trackMuted
    && !layer.muted
    && !layer.audioDetached
    && (layer.type === "audio" || (layer.type === "media" && layer.mediaKind === "video"))
    && hasAudioProcessing(layer)
  ));
  if (!processingLayers.length) return { project, cleanupDirectory: undefined };
  const cleanupDirectory = path.join(outputDirectory, `.pixores-audio-${crypto.randomUUID()}`);
  await fs.mkdir(cleanupDirectory, { recursive: true });
  const replacements = new Map();
  for (const layer of processingLayers) {
    const sourcePath = getLocalLayerMediaPath(project, layer);
    if (!sourcePath) continue;
    const duration = Math.max(0.05, Number(layer.duration) || 0.05);
    const sourceStart = Math.max(0, Number(layer.sourceStart ?? layer.trimStart ?? 0) || 0);
    const outputPath = path.join(cleanupDirectory, `${String(layer.id).replace(/[^a-z0-9_-]/gi, "-")}.wav`);
    await runExecutable(ffmpegPath, [
      "-hide_banner", "-loglevel", "error", "-ss", sourceStart.toFixed(6), "-t", duration.toFixed(6), "-i", sourcePath,
      "-vn", "-af", buildNativeAudioFilters({
        ...layer,
        duration,
        volume: layer.trackMuted || layer.muted ? 0 : Math.max(0, Number(layer.volume ?? 1)),
      }, sampleRate),
      "-c:a", "pcm_s16le", "-ar", String(sampleRate), "-y", outputPath,
    ], { signal, timeout: 30 * 60 * 1000 });
    replacements.set(layer.id, outputPath);
  }
  if (!replacements.size) {
    await fs.rm(cleanupDirectory, { recursive: true, force: true });
    return { project, cleanupDirectory: undefined };
  }
  const processedLayers = [];
  for (const layer of project.layers || []) {
    const audioPath = replacements.get(layer.id);
    if (!audioPath) {
      processedLayers.push(layer);
      continue;
    }
    const normalizedAudio = {
      ...layer,
      id: layer.type === "audio" ? layer.id : `${layer.id}-processed-audio`,
      type: "audio",
      mediaKind: "audio",
      name: `${layer.name} · processed audio`,
      assetKey: undefined,
      src: fileUrlFromPath(audioPath),
      sourceStart: 0,
      sourceEnd: layer.duration,
      sourceDuration: layer.duration,
      trimStart: 0,
      trimEnd: layer.duration,
      volume: 1,
      muted: false,
      audioFadeIn: 0,
      audioFadeOut: 0,
      audioEffects: undefined,
      linkedVideoLayerId: layer.type === "audio" ? layer.linkedVideoLayerId : layer.id,
    };
    if (layer.type === "audio") processedLayers.push(normalizedAudio);
    else processedLayers.push({ ...layer, audioDetached: true, audioEffects: undefined }, normalizedAudio);
  }
  return { project: { ...project, layers: processedLayers }, cleanupDirectory };
}

const nativeXfadeTransitions = new Map([
  ["fade", "fade"],
  ["fadeBlack", "fadeblack"],
  ["fadeWhite", "fadewhite"],
  ["wipeLeft", "wipeleft"],
  ["wipeRight", "wiperight"],
  ["wipeUp", "wipeup"],
  ["wipeDown", "wipedown"],
  ["slideLeft", "slideleft"],
  ["slideRight", "slideright"],
  ["slideUp", "slideup"],
  ["slideDown", "slidedown"],
  ["zoomFlash", "fadefast"],
  ["zoomIn", "zoomin"],
  ["zoomOut", "distance"],
  ["blurDissolve", "hblur"],
  ["radialReveal", "circleopen"],
  ["diagonalWipe", "diagbr"],
  ["splitReveal", "horzopen"],
  ["glitch", "pixelize"],
  ["doorOpen", "vertopen"],
]);

function getNativeBridgeTransitions(project) {
  const layerTransitions = (project.layers || [])
    .filter((layer) => layer.type === "transition")
    .map((layer) => ({
      id: layer.id,
      type: layer.transitionKind || "fade",
      fromLayerId: layer.fromLayerId,
      toLayerId: layer.toLayerId,
      start: layer.start,
      duration: layer.duration,
      cutTime: layer.cutTime,
    }));
  const seen = new Set();
  return [...(project.transitions || []), ...layerTransitions].filter((transition) => {
    const key = transition.id || `${transition.fromLayerId}:${transition.toLayerId}:${transition.start}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return transition.visible !== false && Number(transition.duration || 0) > 0;
  });
}

async function createDirectConcatPlan(project, { includeAudio, fps }) {
  const layers = (project.layers || []).filter((layer) => layer.visible !== false);
  const videoLayers = layers.filter((layer) => layer.type === "media" && layer.mediaKind === "video");
  const unsupportedLayers = layers.filter((layer) => layer.type !== "transition" && !videoLayers.includes(layer));
  if (
    videoLayers.length === 0
    || unsupportedLayers.length > 0
    || !videoLayers.every((layer) => isDefaultFullCanvasVideoLayer(layer, includeAudio))
  ) return null;

  const sortedLayers = [...videoLayers].sort((left, right) => Number(left.start || 0) - Number(right.start || 0));
  const tolerance = 1 / Math.max(1, fps);
  let expectedStartFrame = 0;
  const clips = [];
  for (const layer of sortedLayers) {
    const start = Math.max(0, Number(layer.start) || 0);
    const duration = Math.max(0, Number(layer.duration) || 0);
    const requestedStartFrame = timeToFrame(start, fps);
    const requestedEndFrame = timeToFrame(start + duration, fps);
    const durationFrames = requestedEndFrame - requestedStartFrame;
    if (durationFrames <= 0 || Math.abs(requestedStartFrame - expectedStartFrame) > 1) return null;
    // Adjacent clips share one canonical boundary. Even if legacy project JSON
    // differs by a sub-frame decimal, the rendered timeline has no gap or
    // overlap and the next clip begins on the exact previous end frame.
    const startFrame = expectedStartFrame;
    const endFrame = startFrame + durationFrames;
    const sourcePath = getLocalLayerMediaPath(project, layer);
    if (!sourcePath) return null;
    await fs.access(sourcePath);
    const sourceStartFrame = timeToFrame(Math.max(0, Number(layer.sourceStart ?? layer.trimStart ?? 0) || 0), fps);
    clips.push({
      layerId: layer.id,
      start: frameToTime(startFrame, fps),
      startFrame,
      endFrame,
      durationFrames,
      sourcePath,
      sourceStart: frameToTime(sourceStartFrame, fps),
      sourceStartFrame,
      duration: frameToTime(durationFrames, fps),
      angle: ((Number(layer.angle || 0) % 360) + 360) % 360,
      x: Number(layer.x ?? 0),
      y: Number(layer.y ?? 0),
      width: Number(layer.width ?? 100),
      height: Number(layer.height ?? 100),
      objectFit: layer.objectFit || "cover",
      // Muting or detaching a clip's audio does not make its video visually
      // complex. Keep the clip on the native FFmpeg/NVENC path and generate
      // silence for it instead of falling back to the browser compositor.
      volume: layer.audioDetached || layer.trackMuted || layer.muted
        ? 0
        : Math.max(0, Number(layer.volume ?? 1)),
      audioFadeIn: Math.max(0, Number(layer.audioFadeIn) || 0),
      audioFadeOut: Math.max(0, Number(layer.audioFadeOut) || 0),
      audioEffects: layer.audioEffects,
    });
    expectedStartFrame = endFrame;
  }

  const projectDuration = Math.max(0, Number(project.duration) || calculateProjectDuration(project.layers));
  const projectDurationFrames = timeToFrame(projectDuration, fps);
  if (Math.abs(expectedStartFrame - projectDurationFrames) > 1) return null;

  const bridgeTransitions = getNativeBridgeTransitions(project);
  if (bridgeTransitions.some((transition) => !nativeXfadeTransitions.has(transition.type))) return null;
  const boundaries = [];
  for (let index = 0; index < clips.length - 1; index += 1) {
    const fromClip = clips[index];
    const toClip = clips[index + 1];
    const cutTime = toClip.start;
    const cutFrame = toClip.startFrame;
    const matches = bridgeTransitions.filter((transition) => (
      (transition.fromLayerId === fromClip.layerId && transition.toLayerId === toClip.layerId)
      || (
        !transition.fromLayerId
        && !transition.toLayerId
        && Math.abs(Number(transition.cutTime ?? (Number(transition.start) + Number(transition.duration) / 2)) - cutTime) <= tolerance
      )
    ));
    if (matches.length > 1) return null;
    const transition = matches[0];
    const duration = transition
      ? Math.max(tolerance, Number(transition.duration) || tolerance)
      : tolerance;
    const resolvedCutTime = transition
      ? Number(transition.cutTime ?? (Number(transition.start) + duration / 2))
      : cutTime;
    if (
      Math.abs(resolvedCutTime - cutTime) > tolerance
      || resolvedCutTime - duration / 2 < -tolerance
      || resolvedCutTime + duration / 2 > projectDuration + tolerance
    ) return null;
    const durationFrames = Math.max(1, timeToFrame(duration, fps));
    const xfadeDurationFrames = transition?.type === "fadeBlack" || transition?.type === "fadeWhite"
      ? 1
      : durationFrames;
    boundaries.push({
      duration: frameToTime(durationFrames, fps),
      durationFrames,
      xfadeDuration: frameToTime(xfadeDurationFrames, fps),
      xfadeDurationFrames,
      cutTime: frameToTime(cutFrame, fps),
      cutFrame,
      ffmpegTransition: transition?.type === "fadeBlack" || transition?.type === "fadeWhite"
        ? "fade"
        : transition ? nativeXfadeTransitions.get(transition.type) : "fade",
      dipColor: transition?.type === "fadeBlack" ? "black" : transition?.type === "fadeWhite" ? "white" : null,
      synthetic: !transition,
    });
  }
  if (bridgeTransitions.length > boundaries.filter((boundary) => !boundary.synthetic).length) return null;

  const background = /^#[0-9a-f]{6}$/i.test(project.background || "") ? project.background : "#000000";
  return {
    clips,
    duration: frameToTime(projectDurationFrames, fps),
    durationFrames: projectDurationFrames,
    transitions: bridgeTransitions.length > 0 ? boundaries : [],
    background,
  };
}

async function createHybridBasePlan(project, { includeAudio, fps }) {
  const visibleVideoLayers = (project.layers || []).filter((layer) => (
    layer.visible !== false
    && layer.type === "media"
    && layer.mediaKind === "video"
    && isDefaultFullCanvasVideoLayer(layer, includeAudio)
  ));
  if (visibleVideoLayers.length < 2) return null;

  const layersByTrack = new Map();
  for (const layer of visibleVideoLayers) {
    const trackKey = layer.trackId || `track-order:${Number(layer.trackOrder ?? 0)}`;
    const trackLayers = layersByTrack.get(trackKey) || [];
    trackLayers.push(layer);
    layersByTrack.set(trackKey, trackLayers);
  }

  const candidates = [...layersByTrack.values()]
    .filter((layers) => layers.length >= 2)
    .sort((left, right) => (
      right.reduce((total, layer) => total + Math.max(0, Number(layer.duration) || 0), 0)
      - left.reduce((total, layer) => total + Math.max(0, Number(layer.duration) || 0), 0)
    ));

  for (const candidateLayers of candidates) {
    const candidateIds = new Set(candidateLayers.map((layer) => layer.id));
    const transitionLayers = (project.layers || []).filter((layer) => (
      layer.type === "transition"
      && candidateIds.has(layer.fromLayerId)
      && candidateIds.has(layer.toLayerId)
    ));
    const candidateTransitions = (project.transitions || []).filter((transition) => (
      candidateIds.has(transition.fromLayerId)
      && candidateIds.has(transition.toLayerId)
    ));
    const baseDuration = candidateLayers.reduce(
      (maximum, layer) => Math.max(maximum, Number(layer.start || 0) + Number(layer.duration || 0)),
      0,
    );
    const baseProject = {
      ...project,
      duration: baseDuration,
      layers: [...candidateLayers, ...transitionLayers],
      transitions: candidateTransitions,
    };
    const plan = await createDirectConcatPlan(baseProject, { includeAudio, fps });
    if (!plan) continue;
    return {
      plan,
      baseLayerIds: candidateIds,
      transitionLayerIds: new Set(transitionLayers.map((layer) => layer.id)),
      transitionIds: new Set(candidateTransitions.map((transition) => transition.id)),
      templateLayer: [...candidateLayers].sort((left, right) => Number(left.start || 0) - Number(right.start || 0))[0],
    };
  }
  return null;
}

function createHybridRenderProject(project, hybridBase, hybridBasePath) {
  const templateLayer = hybridBase.templateLayer;
  const replacementLayer = {
    ...templateLayer,
    id: `hybrid-base-${crypto.randomUUID()}`,
    name: "Pixores hybrid base",
    assetKey: undefined,
    src: fileUrlFromPath(hybridBasePath),
    start: 0,
    duration: hybridBase.plan.duration,
    sourceStart: 0,
    sourceEnd: hybridBase.plan.duration,
    sourceDuration: hybridBase.plan.duration,
    trimStart: 0,
    trimEnd: hybridBase.plan.duration,
    angle: 0,
    volume: 1,
    audioDetached: false,
    muted: false,
    audioFadeIn: 0,
    audioFadeOut: 0,
    renderProxy: true,
  };
  return {
    ...project,
    layers: [
      ...(project.layers || []).filter((layer) => (
        !hybridBase.baseLayerIds.has(layer.id)
        && !hybridBase.transitionLayerIds.has(layer.id)
      )),
      replacementLayer,
    ],
    transitions: (project.transitions || []).filter((transition) => !hybridBase.transitionIds.has(transition.id)),
  };
}

async function createSegmentedHybridPlan(project, { includeAudio, fps }) {
  const hybridBase = await createHybridBasePlan(project, { includeAudio, fps });
  if (!hybridBase) return null;
  const excludedLayerIds = new Set([
    ...hybridBase.baseLayerIds,
    ...hybridBase.transitionLayerIds,
  ]);
  const residualLayers = (project.layers || []).filter((layer) => (
    layer.visible !== false
    && !excludedLayerIds.has(layer.id)
  ));
  if (residualLayers.length === 0) return null;

  const frameDuration = 1 / Math.max(1, fps);
  const projectDuration = Math.max(frameDuration, Number(project.duration) || calculateProjectDuration(project.layers));
  const complexIntervals = [
    ...residualLayers.map((layer) => ({ start: layer.start, duration: layer.duration })),
    ...getNativeBridgeTransitions(project).map((transition) => ({ start: transition.start, duration: transition.duration })),
  ].flatMap((timedItem) => {
    const start = Math.max(0, Math.floor((Number(timedItem.start) || 0) * fps) / fps);
    const end = Math.min(
      projectDuration,
      Math.ceil(((Number(timedItem.start) || 0) + Math.max(0, Number(timedItem.duration) || 0)) * fps) / fps,
    );
    return end - start >= frameDuration ? [{ start, end }] : [];
  }).sort((left, right) => left.start - right.start);
  if (complexIntervals.length === 0) return null;

  const mergedComplexIntervals = [];
  for (const interval of complexIntervals) {
    const previous = mergedComplexIntervals.at(-1);
    if (previous && interval.start <= previous.end + frameDuration / 2) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      mergedComplexIntervals.push({ ...interval });
    }
  }
  const complexDuration = mergedComplexIntervals.reduce((total, interval) => total + interval.end - interval.start, 0);
  if (complexDuration > Math.min(600, projectDuration * 0.5)) return null;

  const segments = [];
  let cursor = 0;
  for (const interval of mergedComplexIntervals) {
    if (interval.start - cursor >= frameDuration) {
      segments.push({ start: cursor, end: interval.start, complex: false });
    }
    segments.push({ start: interval.start, end: interval.end, complex: true });
    cursor = interval.end;
  }
  if (projectDuration - cursor >= frameDuration) {
    segments.push({ start: cursor, end: projectDuration, complex: false });
  }
  if (segments.length < 2 || !segments.some((segment) => !segment.complex)) return null;
  return { hybridBase, segments, projectDuration, complexDuration };
}

async function renderDirectConcat({
  ffmpegPath,
  plan,
  outputPath,
  width,
  height,
  fps,
  encoderName,
  videoBitrateKbps,
  includeAudio,
  audioCodec = "aac",
  audioBitrateKbps,
  audioSampleRate,
  signal,
  onProgress,
}) {
  const preparedClips = [];
  const inputArguments = [];
  for (const clip of plan.clips) {
    const inputIndex = preparedClips.reduce((total, item) => total + (item.usesSilentAudioInput ? 2 : 1), 0);
    inputArguments.push(
      "-ss", clip.sourceStart.toFixed(6),
      // Decode two guard frames. The filter graph performs the authoritative
      // integer-frame trim and prevents a short input from creating black.
      "-t", frameToTime(clip.durationFrames + 2, fps).toFixed(6),
      "-i", clip.sourcePath,
    );
    const hasAudio = includeAudio ? await sourceHasAudioStream(ffmpegPath, clip.sourcePath) : false;
    if (includeAudio && !hasAudio) {
      inputArguments.push(
        "-f", "lavfi",
        "-t", clip.duration.toFixed(3),
        "-i", `anullsrc=r=${audioSampleRate}:cl=stereo`,
      );
    }
    preparedClips.push({
      ...clip,
      inputIndex,
      audioInputIndex: hasAudio ? inputIndex : inputIndex + 1,
      usesSilentAudioInput: includeAudio && !hasAudio,
    });
  }
  const filters = [];
  const hasTransitions = Array.isArray(plan.transitions) && plan.transitions.length > 0;
  const concatInputs = [];
  preparedClips.forEach((clip, index) => {
    const clipFrames = Math.max(1, clip.durationFrames);
    const orientationFilters = clip.angle === 90
      ? ["transpose=clock"]
      : clip.angle === 180
        ? ["hflip", "vflip"]
        : clip.angle === 270
          ? ["transpose=cclock"]
          : [];
    const previousTransition = hasTransitions && index > 0 ? plan.transitions[index - 1] : null;
    const nextTransition = hasTransitions && index < plan.transitions.length ? plan.transitions[index] : null;
    const previousTransitionDuration = previousTransition?.xfadeDuration || 0;
    const nextTransitionDuration = nextTransition?.xfadeDuration || 0;
    const dipFilters = [
      previousTransition?.dipColor
        ? `fade=t=in:st=0:d=${(previousTransition.duration / 2).toFixed(6)}:color=${previousTransition.dipColor}`
        : "",
      nextTransition?.dipColor
        ? `fade=t=out:st=${Math.max(0, clip.duration - nextTransition.duration / 2).toFixed(6)}:d=${(nextTransition.duration / 2).toFixed(6)}:color=${nextTransition.dipColor}`
        : "",
    ].filter(Boolean);
    const transitionPadding = hasTransitions
      ? `,tpad=start_mode=clone:start_duration=${(previousTransitionDuration / 2).toFixed(6)}:stop_mode=clone:stop_duration=${(nextTransitionDuration / 2).toFixed(6)}`
      : "";
    const boxWidth = Math.max(2, Math.round((width * clip.width / 100) / 2) * 2);
    const boxHeight = Math.max(2, Math.round((height * clip.height / 100) / 2) * 2);
    const rotatedWidth = clip.angle === 90 || clip.angle === 270 ? boxHeight : boxWidth;
    const rotatedHeight = clip.angle === 90 || clip.angle === 270 ? boxWidth : boxHeight;
    const centerX = width * (clip.x + clip.width / 2) / 100;
    const centerY = height * (clip.y + clip.height / 2) / 100;
    const overlayX = Math.round(centerX - rotatedWidth / 2);
    const overlayY = Math.round(centerY - rotatedHeight / 2);
    const isDefaultGeometry = clip.angle === 0
      && Math.abs(clip.x) < 0.0001
      && Math.abs(clip.y) < 0.0001
      && Math.abs(clip.width - 100) < 0.0001
      && Math.abs(clip.height - 100) < 0.0001
      && clip.objectFit === "cover";
    const backgroundColor = plan.background.replace("#", "0x");
    const fitFilter = clip.objectFit === "contain"
      ? `scale=${boxWidth}:${boxHeight}:force_original_aspect_ratio=decrease:flags=bilinear,pad=${boxWidth}:${boxHeight}:(ow-iw)/2:(oh-ih)/2:color=${backgroundColor}`
      : `scale=${boxWidth}:${boxHeight}:force_original_aspect_ratio=increase:flags=bilinear,crop=${boxWidth}:${boxHeight}`;
    const commonTail = `setsar=1,format=yuv420p${dipFilters.length ? `,${dipFilters.join(",")}` : ""}${transitionPadding},setpts=N/(${fps}*TB)[v${index}]`;
    if (isDefaultGeometry) {
      filters.push(
        `[${clip.inputIndex}:v:0]setpts=PTS-STARTPTS,fps=${fps}:start_time=0:round=near,tpad=stop_mode=clone:stop_duration=1,trim=start_frame=0:end_frame=${clipFrames},${fitFilter},${commonTail}`,
      );
    } else {
      filters.push(`color=c=${backgroundColor}:s=${width}x${height}:r=${fps}:d=${clip.duration.toFixed(6)}[bg${index}]`);
      filters.push(
        `[${clip.inputIndex}:v:0]setpts=PTS-STARTPTS,fps=${fps}:start_time=0:round=near,tpad=stop_mode=clone:stop_duration=1,trim=start_frame=0:end_frame=${clipFrames},${fitFilter}${orientationFilters.length ? `,${orientationFilters.join(",")}` : ""},setsar=1,setpts=N/(${fps}*TB)[fg${index}]`,
      );
      filters.push(
        `[bg${index}][fg${index}]overlay=x=${overlayX}:y=${overlayY}:shortest=1,${commonTail}`,
      );
    }
    if (includeAudio) {
      filters.push(
        `[${clip.audioInputIndex}:a:0]${buildNativeAudioFilters(clip, audioSampleRate)}[a${index}]`,
      );
    }
  });
  if (hasTransitions) {
    let previousVideo = "[v0]";
    plan.transitions.forEach((transition, index) => {
      const output = index === plan.transitions.length - 1 ? "[video]" : `[vx${index + 1}]`;
      filters.push(
        `${previousVideo}[v${index + 1}]xfade=transition=${transition.ffmpegTransition}:duration=${transition.xfadeDuration.toFixed(6)}:offset=${Math.max(0, transition.cutTime - transition.xfadeDuration / 2).toFixed(6)}${output}`,
      );
      previousVideo = output;
    });
    if (includeAudio) {
      filters.push(`${preparedClips.map((_, index) => `[a${index}]`).join("")}concat=n=${preparedClips.length}:v=0:a=1[audio]`);
    }
  } else {
    plan.clips.forEach((_, index) => {
      concatInputs.push(`[v${index}]`);
      if (includeAudio) concatInputs.push(`[a${index}]`);
    });
    filters.push(`${concatInputs.join("")}concat=n=${plan.clips.length}:v=1:a=${includeAudio ? 1 : 0}[video]${includeAudio ? "[audio]" : ""}`);
  }

  await runExecutableWithProgress(ffmpegPath, [
    "-hide_banner",
    "-loglevel", "error",
    ...inputArguments,
    "-filter_complex", filters.join(";"),
    "-map", "[video]",
    ...(includeAudio ? ["-map", "[audio]"] : []),
    "-c:v", encoderName,
    "-preset", "p4",
    "-b:v", `${videoBitrateKbps}k`,
    "-maxrate", `${Math.round(videoBitrateKbps * 1.35)}k`,
    "-bufsize", `${videoBitrateKbps * 2}k`,
    "-pix_fmt", "yuv420p",
    "-fps_mode", "cfr",
    "-r", String(fps),
    ...(includeAudio ? [
      "-c:a", audioCodec,
      ...(audioCodec === "aac" ? ["-b:a", `${audioBitrateKbps}k`] : []),
      "-ar", String(audioSampleRate),
    ] : ["-an"]),
    ...(/\.(mp4|mov)$/i.test(outputPath) ? [
      "-video_track_timescale", String(Math.round(fps * 1000)),
      "-movflags", "+faststart",
    ] : []),
    "-progress", "pipe:1",
    "-nostats",
    "-y",
    outputPath,
  ], { signal, onProgress });
}

async function sourceHasAudioStream(ffmpegPath, sourcePath) {
  if (sourceAudioStreamCache.has(sourcePath)) return sourceAudioStreamCache.get(sourcePath);
  let hasAudio = false;
  try {
    const ffprobePath = path.join(path.dirname(ffmpegPath), process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
    const { stdout } = await runExecutable(ffprobePath, [
      "-v", "error",
      "-select_streams", "a:0",
      "-show_entries", "stream=index",
      "-of", "csv=p=0",
      sourcePath,
    ]);
    hasAudio = stdout.trim().length > 0;
  } catch {
    hasAudio = false;
  }
  sourceAudioStreamCache.set(sourcePath, hasAudio);
  return hasAudio;
}

function projectHasAudibleMedia(project) {
  return (project.layers || []).some((layer) => {
    if (layer.trackMuted || layer.muted || Number(layer.volume) === 0) return false;
    if (layer.type === "audio") return true;
    return layer.type === "media" && layer.mediaKind === "video" && !layer.audioDetached;
  });
}

function getRenderProxyDimensions(asset, outputWidth, outputHeight) {
  const sourceWidth = Number(asset?.metadata?.width);
  const sourceHeight = Number(asset?.metadata?.height);
  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) return null;
  const scale = Math.min(1, outputWidth / sourceWidth, outputHeight / sourceHeight);
  return {
    width: Math.max(2, Math.round((sourceWidth * scale) / 2) * 2),
    height: Math.max(2, Math.round((sourceHeight * scale) / 2) * 2),
    sourceWidth,
    sourceHeight,
    sourceFps: Number(asset?.metadata?.fps) || 0,
  };
}

async function hasUsableProxy(proxyPath) {
  try {
    return (await fs.stat(proxyPath)).size > 1024;
  } catch {
    return false;
  }
}

function normalizeDisplayRotation(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  const normalized = ((Math.round(numericValue / 90) * 90) % 360 + 360) % 360;
  return normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0;
}

async function getSourceDisplayRotation(ffmpegPath, sourcePath) {
  const cached = sourceDisplayRotationCache.get(sourcePath);
  if (cached !== undefined) return cached;

  let rotation = 0;
  try {
    const ffprobePath = path.join(path.dirname(ffmpegPath), process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
    const { stdout } = await runExecutable(ffprobePath, [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream_tags=rotate:stream_side_data=rotation",
      "-of", "json",
      sourcePath,
    ]);
    const stream = JSON.parse(stdout)?.streams?.[0];
    const sideDataRotation = stream?.side_data_list?.find((item) => Number.isFinite(Number(item?.rotation)))?.rotation;
    rotation = normalizeDisplayRotation(sideDataRotation ?? stream?.tags?.rotate);
  } catch {
    // Missing orientation metadata is equivalent to the default zero-degree display.
  }
  sourceDisplayRotationCache.set(sourcePath, rotation);
  return rotation;
}

function getPhysicalOrientationFilters(rotation) {
  // FFmpeg display-matrix rotation is counter-clockwise; proxies must bake it
  // into pixels because CUDA scaling otherwise drops the metadata.
  if (rotation === 90) return ["transpose=cclock"];
  if (rotation === 180) return ["hflip", "vflip"];
  if (rotation === 270) return ["transpose=clock"];
  return [];
}

function pruneRenderProxyCache(cacheRoot) {
  if (!renderProxyPruneCache.has(cacheRoot)) {
    const prune = (async () => {
      await fs.mkdir(cacheRoot, { recursive: true });
      const now = Date.now();
      const maximumAgeMs = 30 * 24 * 60 * 60 * 1000;
      const maximumCacheBytes = 8 * 1024 ** 3;
      const targetCacheBytes = 6 * 1024 ** 3;
      const entries = [];

      for (const entry of await fs.readdir(cacheRoot, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        const filePath = path.join(cacheRoot, entry.name);
        const stat = await fs.stat(filePath);
        if (entry.name.includes(".tmp.") || now - stat.mtimeMs > maximumAgeMs) {
          await fs.rm(filePath, { force: true });
          continue;
        }
        entries.push({ filePath, size: stat.size, mtimeMs: stat.mtimeMs });
      }

      let totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
      if (totalBytes <= maximumCacheBytes) return;
      for (const entry of entries.sort((left, right) => left.mtimeMs - right.mtimeMs)) {
        await fs.rm(entry.filePath, { force: true });
        totalBytes -= entry.size;
        if (totalBytes <= targetCacheBytes) break;
      }
    })().catch(() => undefined);
    renderProxyPruneCache.set(cacheRoot, prune);
  }
  return renderProxyPruneCache.get(cacheRoot);
}

async function createHardwareRenderProxy({
  cacheRoot,
  ffmpegPath,
  project,
  layer,
  outputWidth,
  outputHeight,
  outputFps,
  signal,
}) {
  const asset = layer.assetKey ? project.assets?.find((item) => item.id === layer.assetKey) : undefined;
  const dimensions = getRenderProxyDimensions(asset, outputWidth, outputHeight);
  if (!dimensions) return null;
  const sourcePath = getLocalLayerMediaPath(project, layer);
  if (!sourcePath) return null;
  const sourceStat = await fs.stat(sourcePath);
  const sourceDisplayRotation = await getSourceDisplayRotation(ffmpegPath, sourcePath);
  const sourceStart = Math.max(0, Number(layer.sourceStart ?? layer.trimStart ?? 0) || 0);
  const duration = Math.max(0.05, Number(layer.duration) || 0.05);
  const proxyGop = Math.max(1, Math.round(outputFps / 2));
  const proxyPixels = dimensions.width * dimensions.height;
  const proxyMaxrateMbps = proxyPixels >= 3840 * 2160 ? 80 : proxyPixels >= 2560 * 1440 ? 45 : proxyPixels >= 1920 * 1080 ? 30 : 18;
  const cacheKey = crypto.createHash("sha256").update(JSON.stringify({
    sourcePath,
    sourceSize: sourceStat.size,
    sourceMtime: Math.trunc(sourceStat.mtimeMs),
    sourceStart,
    duration,
    width: dimensions.width,
    height: dimensions.height,
    fps: outputFps,
    sourceDisplayRotation,
    version: 5,
  })).digest("hex");
  const proxyPath = path.join(cacheRoot, cacheKey + ".mp4");
  if (await hasUsableProxy(proxyPath)) {
    const now = new Date();
    await fs.utimes(proxyPath, now, now).catch(() => undefined);
    return proxyPath;
  }

  await fs.mkdir(cacheRoot, { recursive: true });
  const stagingPath = path.join(cacheRoot, cacheKey + "-" + crypto.randomUUID() + ".tmp.mp4");
  const filter = [
    "scale_cuda=w=" + dimensions.width + ":h=" + dimensions.height + ":format=nv12",
    "hwdownload",
    "format=nv12",
    ...getPhysicalOrientationFilters(sourceDisplayRotation),
    "fps=" + outputFps,
  ].join(",");
  const sourceAudioCodec = String(asset?.metadata?.audioCodec || "").toLowerCase();
  const audioArguments = sourceAudioCodec.includes("aac")
    ? ["-c:a", "copy"]
    : ["-c:a", "aac", "-b:a", "320k", "-ar", "48000"];

  try {
    await runExecutable(ffmpegPath, [
      "-hide_banner",
      "-loglevel", "error",
      "-ss", sourceStart.toFixed(3),
      "-t", duration.toFixed(3),
      "-hwaccel", "cuda",
      "-hwaccel_output_format", "cuda",
      "-i", sourcePath,
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-vf", filter,
      "-c:v", "h264_nvenc",
      "-preset", "p2",
      "-tune", "ll",
      "-rc", "vbr",
      "-cq", "19",
      "-b:v", "0",
      "-maxrate", `${proxyMaxrateMbps}M`,
      "-bufsize", `${proxyMaxrateMbps * 2}M`,
      "-g", String(proxyGop),
      "-bf", "0",
      "-pix_fmt", "yuv420p",
      ...audioArguments,
      "-movflags", "+faststart",
      "-y",
      stagingPath,
    ], {
      signal,
      timeout: 30 * 60 * 1000,
    });
    if (await hasUsableProxy(proxyPath)) {
      await fs.rm(stagingPath, { force: true });
      return proxyPath;
    }
    await fs.rename(stagingPath, proxyPath);
    return proxyPath;
  } catch (error) {
    await fs.rm(stagingPath, { force: true });
    throw error;
  }
}

async function createOptimizedRenderProject({
  app,
  project,
  ffmpegPath,
  outputWidth,
  outputHeight,
  outputFps,
  signal,
  onProgress,
}) {
  const videoLayers = project.layers.filter((layer) => layer.type === "media" && layer.mediaKind === "video");
  if (videoLayers.length === 0) return { project, proxyCount: 0 };
  const cacheRoot = path.join(app.getPath("userData"), "render-proxies");
  await pruneRenderProxyCache(cacheRoot);
  const proxyByLayerId = new Map();
  const failedLayers = [];

  for (let index = 0; index < videoLayers.length; index += 1) {
    if (signal.aborted) throw new Error("Render proxy preparation was cancelled.");
    const layer = videoLayers[index];
    onProgress?.(index, videoLayers.length);
    try {
      const proxyPath = await createHardwareRenderProxy({
        cacheRoot,
        ffmpegPath,
        project,
        layer,
        outputWidth,
        outputHeight,
        outputFps,
        signal,
      });
      if (proxyPath) proxyByLayerId.set(layer.id, proxyPath);
    } catch (error) {
      if (signal.aborted) throw error;
      failedLayers.push(layer.name || layer.id);
    }
  }
  onProgress?.(videoLayers.length, videoLayers.length);

  if (proxyByLayerId.size === 0) return { project, proxyCount: 0, failedLayers };
  return {
    proxyCount: proxyByLayerId.size,
    failedLayers,
    project: {
      ...project,
      layers: project.layers.map((layer) => {
        const proxyPath = proxyByLayerId.get(layer.id);
        if (!proxyPath) return layer;
        return {
          ...layer,
          assetKey: undefined,
          src: fileUrlFromPath(proxyPath),
          sourceStart: 0,
          sourceEnd: layer.duration,
          sourceDuration: layer.duration,
          trimStart: 0,
          trimEnd: layer.duration,
          renderProxy: true,
        };
      }),
    },
  };
}

function updateJob(renderId, patch) {
  const current = renderJobs.get(renderId);
  if (!current) return;
  renderJobs.set(renderId, {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

async function renderComplexSegment({
  app,
  project,
  segmentIndex,
  segmentOutputPath,
  renderRoot,
  serveUrl,
  remotionModules,
  browserExecutable,
  binariesDirectory,
  ffmpegPath,
  outputFormat,
  outputWidth,
  outputHeight,
  outputFps,
  includeAudio,
  exportSettings,
  signal,
  onCancelControl,
  onProgress,
}) {
  let localMediaServer;
  let rawVideoPath;
  let separateAudioPath;
  let audioProcessingDirectory;
  try {
    const optimized = await createOptimizedRenderProject({
      app,
      project,
      ffmpegPath,
      outputWidth,
      outputHeight,
      outputFps,
      signal,
      onProgress: () => {},
    });
    const audioProcessed = includeAudio ? await preprocessProjectAudioEffects(optimized.project, {
      ffmpegPath,
      outputDirectory: path.dirname(segmentOutputPath),
      sampleRate: Number(exportSettings?.audioSampleRate) || 48000,
      signal,
    }) : { project: optimized.project, cleanupDirectory: undefined };
    audioProcessingDirectory = audioProcessed.cleanupDirectory;
    localMediaServer = await createLocalMediaServer(audioProcessed.project, path.join(renderRoot, "public"));
    const renderProject = {
      ...projectAtOutputResolution(localMediaServer.project, outputWidth, outputHeight),
      duration: Math.max(1 / outputFps, Number(localMediaServer.project.duration) || calculateProjectDuration(localMediaServer.project.layers)),
    };
    const inputProps = { project: renderProject };
    const composition = await remotionModules.selectComposition({
      serveUrl,
      id: "PixoresComposition",
      inputProps,
      timeoutInMilliseconds: 600_000,
      binariesDirectory,
      browserExecutable,
    });
    const totalFrames = Math.max(1, Math.ceil(renderProject.duration * outputFps));
    const renderComposition = {
      ...composition,
      width: outputWidth,
      height: outputHeight,
      fps: outputFps,
      durationInFrames: totalFrames,
    };
    const qualityPreset = exportSettings?.qualityPreset || "recommended";
    const baseVideoKbps = Number(exportSettings?.videoBitrateKbps) || qualityVideoKbps[qualityPreset] || qualityVideoKbps.recommended;
    const resolutionFactor = Math.max(0.25, (outputWidth * outputHeight) / (1920 * 1080));
    const fpsFactor = Math.max(0.5, outputFps / 30);
    const videoBitrate = `${Math.round(baseVideoKbps * resolutionFactor * fpsFactor)}k`;
    const hasAudio = includeAudio && projectHasAudibleMedia(renderProject);
    rawVideoPath = `${segmentOutputPath}.video.${outputFormat.extension}`;
    separateAudioPath = hasAudio ? `${segmentOutputPath}.audio.wav` : undefined;
    const cancelControl = remotionModules.makeCancelSignal();
    onCancelControl(cancelControl);
    await remotionModules.renderMedia({
      composition: renderComposition,
      serveUrl,
      codec: outputFormat.codec,
      outputLocation: rawVideoPath,
      inputProps,
      overwrite: true,
      logLevel: "warn",
      crf: null,
      videoBitrate,
      pixelFormat: exportSettings?.pixelFormat || "yuv420p",
      audioBitrate: `${Number(exportSettings?.audioBitrateKbps) || 192}k`,
      audioCodec: hasAudio ? "pcm-16" : "aac",
      separateAudioTo: separateAudioPath,
      sampleRate: Number(exportSettings?.audioSampleRate) || 48000,
      hardwareAcceleration: "required",
      concurrency: getSafeRenderConcurrency(renderComposition),
      offthreadVideoThreads: getOffthreadVideoThreads(getSafeRenderConcurrency(renderComposition)),
      timeoutInMilliseconds: 600_000,
      binariesDirectory,
      browserExecutable,
      cancelSignal: cancelControl.cancelSignal,
      muted: !hasAudio,
      onProgress: (progressValue) => {
        const renderedFrames = Number(progressValue?.renderedFrames) || Math.round(getProgressValue(progressValue) * totalFrames);
        onProgress(Math.min(1, renderedFrames / totalFrames), renderedFrames, totalFrames, segmentIndex);
      },
    });
    const audioArguments = !includeAudio
      ? ["-map", "0:v:0"]
      : hasAudio
        ? ["-i", separateAudioPath, "-map", "0:v:0", "-map", "1:a:0"]
        : [
          "-f", "lavfi",
          "-t", renderProject.duration.toFixed(6),
          "-i", `anullsrc=r=${Number(exportSettings?.audioSampleRate) || 48000}:cl=stereo`,
          "-map", "0:v:0",
          "-map", "1:a:0",
        ];
    await runExecutable(ffmpegPath, [
      "-hide_banner",
      "-loglevel", "error",
      "-i", rawVideoPath,
      ...audioArguments,
      "-c:v", "copy",
      ...(includeAudio ? [
        // Segment audio remains PCM. Encoding AAC only once in the final mux
        // avoids adding an encoder-delay offset at every segment boundary.
        "-c:a", "pcm_s16le",
        ...(hasAudio ? ["-af", `apad=whole_dur=${renderProject.duration.toFixed(6)}`] : []),
        "-ar", String(Number(exportSettings?.audioSampleRate) || 48000),
      ] : ["-an"]),
      "-t", renderProject.duration.toFixed(6),
      "-y",
      segmentOutputPath,
    ], { signal, timeout: 30 * 60 * 1000 });
  } finally {
    onCancelControl(null);
    await localMediaServer?.close();
    await Promise.all([
      rawVideoPath ? fs.rm(rawVideoPath, { force: true }) : Promise.resolve(),
      separateAudioPath ? fs.rm(separateAudioPath, { force: true }) : Promise.resolve(),
      audioProcessingDirectory ? fs.rm(audioProcessingDirectory, { recursive: true, force: true }) : Promise.resolve(),
    ]);
  }
}

async function concatenateRenderedSegments({
  ffmpegPath,
  segmentPaths,
  outputPath,
  duration,
  includeAudio,
  audioBitrateKbps,
  audioSampleRate,
  signal,
}) {
  const listPath = `${outputPath}.segments.txt`;
  const listContents = segmentPaths
    .map((segmentPath) => `file '${segmentPath.replaceAll("'", "'\\''").replaceAll("\\", "/")}'`)
    .join("\n");
  try {
    await fs.writeFile(listPath, listContents, "utf8");
    await runExecutable(ffmpegPath, [
      "-hide_banner",
      "-loglevel", "error",
      "-fflags", "+genpts",
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-c:v", "copy",
      ...(includeAudio ? [
        "-c:a", "aac",
        "-b:a", `${audioBitrateKbps}k`,
        "-ar", String(audioSampleRate),
        "-af", `apad=whole_dur=${Number(duration).toFixed(6)},atrim=end=${Number(duration).toFixed(6)}`,
      ] : ["-an"]),
      "-t", Number(duration).toFixed(6),
      "-y",
      outputPath,
    ], { signal, timeout: 30 * 60 * 1000 });
  } finally {
    await fs.rm(listPath, { force: true });
  }
}

async function renderLocalJob({ app, state, project, renderId, appRoot, outputFormatId, exportSettings }) {
  let localMediaServer;
  let outputPath;
  let finalOutputPath;
  let intermediateVideoPath;
  let separateAudioPath;
  let hybridBasePath;
  let segmentedDirectory;
  let audioProcessingDirectory;
  try {
    updateJob(renderId, { status: "preparing", progress: 0.02 });
    const preparationAbort = new AbortController();
    renderCancels.set(renderId, () => preparationAbort.abort());
    const remotionBinariesDirectory = await configurePackagedBinaries(appRoot);

    const renderRoot = await getReadableRenderRoot(appRoot);
    const rangeRenderProject = resolveProjectPublicMediaUrls(
      createRangeRenderProject(project, exportSettings),
      path.join(renderRoot, "public"),
    );

    const exportsDir = exportSettings?.outputDirectory || getExportsDir({ app, state });
    await fs.mkdir(exportsDir, { recursive: true });

    const outputFormat = getVideoExportFormat(outputFormatId);
    const acceleration = exportSettings?.acceleration || "auto";
    const acceleratedBinaries = acceleration === "software"
      ? { binariesDirectory: remotionBinariesDirectory, hardwareAvailable: false }
      : await prepareAcceleratedBinaries({
        app,
        appRoot,
        remotionBinariesDirectory,
        codec: outputFormat.codec,
      });
    const binariesDirectory = acceleratedBinaries.binariesDirectory;
    const hardwareSupported = Boolean(getHardwareEncoderName(outputFormat.codec));
    if (acceleration === "hardware" && (!hardwareSupported || !acceleratedBinaries.hardwareAvailable)) {
      throw new Error(`Hardware encoding was requested, but ${getHardwareEncoderName(outputFormat.codec) || outputFormat.codec} is not available.`);
    }
    const useHardwareEncoder = hardwareSupported && acceleration !== "software" && acceleratedBinaries.hardwareAvailable;
    const initialHardwareAcceleration = useHardwareEncoder ? "required" : "disable";
    const mediaWarnings = getMediaWarnings(rangeRenderProject);
    if (mediaWarnings.length > 0) {
      throw new Error("Local render needs persistent media files. " + mediaWarnings.join(" "));
    }
    let warnings = [
      ...(acceleration === "auto" && hardwareSupported && !useHardwareEncoder
        ? [getHardwareEncoderName(outputFormat.codec) + " is unavailable; using " + getSoftwareEncoderName(outputFormat.codec) + " on the CPU."]
        : []),
    ];
    const outputFileName = normalizeExportFileName(exportSettings?.fileName || `pixores-render-${renderId}`, outputFormat.extension);
    finalOutputPath = path.join(exportsDir, outputFileName);
    outputPath = path.join(exportsDir, `.pixores-${renderId}-${outputFileName}`);
    const outputWidth = Number(exportSettings?.width) || Number(project?.canvas?.width) || 1920;
    const outputHeight = Number(exportSettings?.height) || Number(project?.canvas?.height) || 1080;
    const outputFps = Number(exportSettings?.fps) || 30;
    const includeAudio = exportSettings?.includeAudio !== false;
    if (useHardwareEncoder && (outputFormat.codec === "h264" || outputFormat.codec === "h265")) {
      const directPlan = await createDirectConcatPlan(rangeRenderProject, { includeAudio, fps: outputFps });
      if (directPlan) {
        const totalFrames = Math.max(1, Math.ceil(directPlan.duration * outputFps));
        const startedAt = Date.now();
        const qualityPreset = exportSettings?.qualityPreset || "recommended";
        const baseVideoKbps = Number(exportSettings?.videoBitrateKbps) || qualityVideoKbps[qualityPreset] || qualityVideoKbps.recommended;
        const resolutionFactor = Math.max(0.25, (outputWidth * outputHeight) / (1920 * 1080));
        const fpsFactor = Math.max(0.5, outputFps / 30);
        try {
          updateJob(renderId, {
            status: "rendering",
            progress: 0,
            totalFrames,
            renderedFrames: 0,
            renderFps: 0,
            speed: 0,
            fastPath: true,
            encoder: getEncoderLabel(outputFormat.codec, true, "fast path"),
          });
          await renderDirectConcat({
            ffmpegPath: path.join(binariesDirectory, "ffmpeg.exe"),
            plan: directPlan,
            outputPath,
            width: outputWidth,
            height: outputHeight,
            fps: outputFps,
            encoderName: getHardwareEncoderName(outputFormat.codec),
            videoBitrateKbps: Math.round(baseVideoKbps * resolutionFactor * fpsFactor),
            includeAudio,
            audioBitrateKbps: Number(exportSettings?.audioBitrateKbps) || 192,
            audioSampleRate: Number(exportSettings?.audioSampleRate) || 48000,
            signal: preparationAbort.signal,
            onProgress: (renderedSeconds) => {
              const renderedFrames = Math.min(totalFrames, Math.round(renderedSeconds * outputFps));
              const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1000);
              const renderFps = renderedFrames / elapsedSeconds;
              updateJob(renderId, {
                status: renderedFrames >= totalFrames ? "encoding" : "rendering",
                progress: Math.min(0.99, renderedFrames / totalFrames),
                renderedFrames,
                totalFrames,
                renderFps,
                speed: renderFps / outputFps,
              });
            },
          });
          updateJob(renderId, { status: "finalizing", progress: 0.995, renderedFrames: totalFrames });
          const publishedOutputPath = await publishRenderedOutput(outputPath, finalOutputPath);
          updateJob(renderId, {
            status: "completed",
            progress: 1,
            outputPath: publishedOutputPath,
            outputUrl: fileUrlFromPath(publishedOutputPath),
            outputFormat,
            warnings,
          });
          renderCancels.delete(renderId);
          return;
        } catch (error) {
          if (preparationAbort.signal.aborted) throw error;
          await fs.rm(outputPath, { force: true });
          warnings = [...warnings, "Fast export was unavailable for this project; Pixores continued with the full compositor."];
          updateJob(renderId, { status: "preparing", progress: 0.02, fastPath: false, warnings });
        }
      }
    }
    // Validate the Remotion browser before spending time precomposing a hybrid
    // base. The executable is cached under LOCALAPPDATA and passed explicitly
    // so Remotion never derives a cache path from the installation directory.
    const remotionModules = loadRemotionModules();
    updateJob(renderId, { status: "preparing", progress: 0.02 });
    const browserExecutable = await prepareRemotionBrowser({ app, ensureBrowser: remotionModules.ensureBrowser });
    if (useHardwareEncoder && (outputFormat.codec === "h264" || outputFormat.codec === "h265")) {
      try {
        const segmentedPlan = await createSegmentedHybridPlan(rangeRenderProject, { includeAudio, fps: outputFps });
        if (segmentedPlan) {
          const ffmpegPath = path.join(binariesDirectory, "ffmpeg.exe");
          const qualityPreset = exportSettings?.qualityPreset || "recommended";
          const baseVideoKbps = Number(exportSettings?.videoBitrateKbps) || qualityVideoKbps[qualityPreset] || qualityVideoKbps.recommended;
          const resolutionFactor = Math.max(0.25, (outputWidth * outputHeight) / (1920 * 1080));
          const fpsFactor = Math.max(0.5, outputFps / 30);
          const videoBitrateKbps = Math.round(baseVideoKbps * resolutionFactor * fpsFactor);
          const totalFrames = Math.max(1, Math.ceil(segmentedPlan.projectDuration * outputFps));
          const startedAt = Date.now();
          const segmentPaths = [];
          let activeSegmentCancel = null;
          segmentedDirectory = path.join(exportsDir, `.pixores-${renderId}-segments`);
          await fs.mkdir(segmentedDirectory, { recursive: true });
          renderCancels.set(renderId, () => {
            preparationAbort.abort();
            activeSegmentCancel?.cancel();
          });
          const entryPoint = path.join(renderRoot, "src", "video-render", "remotion", "entry.ts");
          updateJob(renderId, {
            status: "bundling",
            progress: 0.02,
            segmentedRender: true,
            segmentCount: segmentedPlan.segments.length,
            complexDuration: segmentedPlan.complexDuration,
            encoder: getEncoderLabel(outputFormat.codec, true, "segmented hybrid"),
            warnings,
          });
          const serveUrl = await getCachedRemotionServeUrl({
            app,
            bundle: remotionModules.bundle,
            entryPoint,
            renderRoot,
          });
          const reportSegmentProgress = (timelineSeconds, segmentIndex) => {
            const renderedFrames = Math.min(totalFrames, Math.round(timelineSeconds * outputFps));
            const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1000);
            const renderFps = renderedFrames / elapsedSeconds;
            updateJob(renderId, {
              status: "rendering",
              progress: Math.min(0.98, timelineSeconds / segmentedPlan.projectDuration),
              currentSegment: segmentIndex + 1,
              segmentCount: segmentedPlan.segments.length,
              renderedFrames,
              totalFrames,
              renderFps,
              speed: renderFps / outputFps,
            });
          };

          for (let index = 0; index < segmentedPlan.segments.length; index += 1) {
            if (preparationAbort.signal.aborted) throw new Error("Segmented render was cancelled.");
            const segment = segmentedPlan.segments[index];
            const segmentDuration = segment.end - segment.start;
            const segmentProject = createRangeRenderProject(rangeRenderProject, {
              rangeStart: segment.start,
              rangeEnd: segment.end,
            });
            const segmentPath = path.join(
              segmentedDirectory,
              `segment-${String(index + 1).padStart(3, "0")}.mkv`,
            );
            segmentPaths.push(segmentPath);
            updateJob(renderId, {
              status: segment.complex ? "rendering" : "preparing",
              currentSegment: index + 1,
              segmentCount: segmentedPlan.segments.length,
              segmentType: segment.complex ? "compositor" : "nvidia",
            });
            if (segment.complex) {
              await renderComplexSegment({
                app,
                project: segmentProject,
                segmentIndex: index,
                segmentOutputPath: segmentPath,
                renderRoot,
                serveUrl,
                remotionModules,
                browserExecutable,
                binariesDirectory,
                ffmpegPath,
                outputFormat,
                outputWidth,
                outputHeight,
                outputFps,
                includeAudio,
                exportSettings,
                signal: preparationAbort.signal,
                onCancelControl: (control) => { activeSegmentCancel = control; },
                onProgress: (segmentProgress) => {
                  reportSegmentProgress(segment.start + segmentProgress * segmentDuration, index);
                },
              });
            } else {
              const directPlan = await createDirectConcatPlan(segmentProject, { includeAudio, fps: outputFps });
              if (!directPlan) throw new Error(`Native segment ${index + 1} was not compatible.`);
              await renderDirectConcat({
                ffmpegPath,
                plan: directPlan,
                outputPath: segmentPath,
                width: outputWidth,
                height: outputHeight,
                fps: outputFps,
                encoderName: getHardwareEncoderName(outputFormat.codec),
                videoBitrateKbps,
                includeAudio,
                audioCodec: "pcm_s16le",
                audioBitrateKbps: Number(exportSettings?.audioBitrateKbps) || 192,
                audioSampleRate: Number(exportSettings?.audioSampleRate) || 48000,
                signal: preparationAbort.signal,
                onProgress: (renderedSeconds) => {
                  reportSegmentProgress(segment.start + Math.min(segmentDuration, renderedSeconds), index);
                },
              });
            }
            reportSegmentProgress(segment.end, index);
          }
          updateJob(renderId, { status: "muxing", progress: 0.99 });
          await concatenateRenderedSegments({
            ffmpegPath,
            segmentPaths,
            outputPath,
            duration: segmentedPlan.projectDuration,
            includeAudio,
            audioBitrateKbps: Number(exportSettings?.audioBitrateKbps) || 192,
            audioSampleRate: Number(exportSettings?.audioSampleRate) || 48000,
            signal: preparationAbort.signal,
          });
          const completedSegmentedDirectory = segmentedDirectory;
          segmentedDirectory = undefined;
          void fs.rm(completedSegmentedDirectory, { recursive: true, force: true }).catch(() => {});
          const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1000);
          const completedRenderFps = totalFrames / elapsedSeconds;
          const publishedOutputPath = await publishRenderedOutput(outputPath, finalOutputPath);
          updateJob(renderId, {
            status: "completed",
            progress: 1,
            renderedFrames: totalFrames,
            totalFrames,
            renderFps: completedRenderFps,
            speed: completedRenderFps / outputFps,
            outputPath: publishedOutputPath,
            outputUrl: fileUrlFromPath(publishedOutputPath),
            outputFormat,
            warnings: [
              ...warnings,
              `Segmented hybrid render used NVIDIA for ${Math.max(0, segmentedPlan.projectDuration - segmentedPlan.complexDuration).toFixed(1)}s and the full compositor for only ${segmentedPlan.complexDuration.toFixed(1)}s.`,
            ],
          });
          renderCancels.delete(renderId);
          return;
        }
      } catch (error) {
        if (preparationAbort.signal.aborted) throw error;
        await Promise.all([
          segmentedDirectory ? fs.rm(segmentedDirectory, { recursive: true, force: true }) : Promise.resolve(),
          fs.rm(outputPath, { force: true }),
        ]);
        segmentedDirectory = undefined;
        const segmentedError = error instanceof Error ? error.message : String(error);
        warnings = [
          ...warnings,
          `Segmented hybrid rendering was unavailable (${segmentedError}); Pixores continued with the standard hybrid compositor.`,
        ];
        console.warn("Pixores segmented hybrid render failed:", error);
        renderCancels.set(renderId, () => preparationAbort.abort());
        updateJob(renderId, { status: "preparing", progress: 0.02, segmentedRender: false, warnings });
      }
    }
    let compositorProject = rangeRenderProject;
    if (useHardwareEncoder && (outputFormat.codec === "h264" || outputFormat.codec === "h265")) {
      try {
        const hybridBase = await createHybridBasePlan(rangeRenderProject, { includeAudio, fps: outputFps });
        if (hybridBase) {
          const qualityPreset = exportSettings?.qualityPreset || "recommended";
          const baseVideoKbps = Number(exportSettings?.videoBitrateKbps) || qualityVideoKbps[qualityPreset] || qualityVideoKbps.recommended;
          const resolutionFactor = Math.max(0.25, (outputWidth * outputHeight) / (1920 * 1080));
          const fpsFactor = Math.max(0.5, outputFps / 30);
          const hybridTotalFrames = Math.max(1, Math.ceil(hybridBase.plan.duration * outputFps));
          hybridBasePath = path.join(exportsDir, `.pixores-${renderId}-hybrid-base.mp4`);
          updateJob(renderId, {
            status: "preparing",
            progress: 0.02,
            hybridRender: true,
            hybridPrecomposing: true,
            hybridTotalFrames,
            hybridRenderedFrames: 0,
            encoder: "h264_nvenc - NVIDIA GPU (hybrid base)",
          });
          await renderDirectConcat({
            ffmpegPath: path.join(binariesDirectory, "ffmpeg.exe"),
            plan: hybridBase.plan,
            outputPath: hybridBasePath,
            width: outputWidth,
            height: outputHeight,
            fps: outputFps,
            encoderName: "h264_nvenc",
            videoBitrateKbps: Math.round(baseVideoKbps * resolutionFactor * fpsFactor * 1.25),
            includeAudio,
            audioBitrateKbps: Math.max(192, Number(exportSettings?.audioBitrateKbps) || 192),
            audioSampleRate: Number(exportSettings?.audioSampleRate) || 48000,
            signal: preparationAbort.signal,
            onProgress: (renderedSeconds) => {
              const hybridRenderedFrames = Math.min(hybridTotalFrames, Math.round(renderedSeconds * outputFps));
              updateJob(renderId, {
                status: "preparing",
                progress: 0.02 + (hybridRenderedFrames / hybridTotalFrames) * 0.03,
                hybridRenderedFrames,
                hybridTotalFrames,
              });
            },
          });
          compositorProject = createHybridRenderProject(rangeRenderProject, hybridBase, hybridBasePath);
          warnings = [...warnings, "Hybrid rendering precomposed the base video and transitions with NVIDIA before rendering the remaining layers."];
          updateJob(renderId, { hybridPrecomposing: false, warnings });
        }
      } catch (error) {
        if (preparationAbort.signal.aborted) throw error;
        if (hybridBasePath) await fs.rm(hybridBasePath, { force: true });
        hybridBasePath = undefined;
        const hybridError = error instanceof Error ? error.message : String(error);
        warnings = [
          ...warnings,
          `Hybrid base precomposition was unavailable (${hybridError}); Pixores continued with the full compositor.`,
        ];
        console.warn("Pixores hybrid base precomposition failed:", error);
        updateJob(renderId, { status: "preparing", progress: 0.02, hybridRender: false, hybridPrecomposing: false, warnings });
      }
    }
    let optimizedProject = compositorProject;
    if (acceleratedBinaries.hardwareAvailable) {
      try {
        const optimized = await createOptimizedRenderProject({
          app,
          project: compositorProject,
          ffmpegPath: path.join(binariesDirectory, "ffmpeg.exe"),
          outputWidth,
          outputHeight,
          outputFps,
          signal: preparationAbort.signal,
          onProgress: (proxyPrepared, proxyTotal) => updateJob(renderId, {
            status: "preparing",
            progress: proxyTotal > 0 ? 0.02 + (proxyPrepared / proxyTotal) * 0.02 : 0.02,
            proxyPrepared,
            proxyTotal,
          }),
        });
        optimizedProject = optimized.project;
        updateJob(renderId, {
          proxyCount: optimized.proxyCount,
          proxyFailures: optimized.failedLayers.length,
        });
        if (optimized.failedLayers.length > 0) {
          warnings = [...warnings, `${optimized.failedLayers.length} clip(s) could not use a GPU render proxy and will use the original media.`];
        }
      } catch (error) {
        if (preparationAbort.signal.aborted) throw error;
        warnings = [...warnings, "GPU render proxies could not be prepared; Pixores is rendering the original media."];
      }
    }
    if (renderJobs.get(renderId)?.status === "cancelled") return;
    const audioProcessed = includeAudio ? await preprocessProjectAudioEffects(optimizedProject, {
      ffmpegPath: path.join(binariesDirectory, "ffmpeg.exe"),
      outputDirectory: exportsDir,
      sampleRate: Number(exportSettings?.audioSampleRate) || 48000,
      signal: preparationAbort.signal,
    }) : { project: optimizedProject, cleanupDirectory: undefined };
    audioProcessingDirectory = audioProcessed.cleanupDirectory;
    localMediaServer = await createLocalMediaServer(audioProcessed.project, path.join(renderRoot, "public"));
    const renderSourceProject = localMediaServer.project;
    const requestedAudioCodec = exportSettings?.audioCodec || "aac";
    const hasAudibleMedia = exportSettings?.includeAudio !== false && projectHasAudibleMedia(renderSourceProject);
    const needsCompatibleAacMux = hasAudibleMedia
      && requestedAudioCodec === "aac"
      && (outputFormat.codec === "h264" || outputFormat.codec === "h265");
    intermediateVideoPath = needsCompatibleAacMux
      ? path.join(exportsDir, `.pixores-${renderId}-video.${outputFormat.extension}`)
      : undefined;
    separateAudioPath = needsCompatibleAacMux
      ? path.join(exportsDir, `.pixores-${renderId}-audio.wav`)
      : undefined;
    const renderOutputPath = intermediateVideoPath || outputPath;
    const entryPoint = path.join(renderRoot, "src", "video-render", "remotion", "entry.ts");
    const { bundle, renderMedia, selectComposition, makeCancelSignal } = remotionModules;
    const cancelControl = makeCancelSignal();
    renderCancels.set(renderId, () => {
      preparationAbort.abort();
      cancelControl.cancel();
    });

    updateJob(renderId, { status: "bundling", progress: 0.05, warnings });
    const serveUrl = await getCachedRemotionServeUrl({ app, bundle, entryPoint, renderRoot });
    if (renderJobs.get(renderId)?.status === "cancelled") return;
    updateJob(renderId, { status: "preparing", progress: 0.08, warnings });

    const projectDuration = Math.max(0.05, Number(renderSourceProject?.duration) || calculateProjectDuration(renderSourceProject?.layers));
    const renderProject = {
      ...projectAtOutputResolution(renderSourceProject, exportSettings?.width, exportSettings?.height),
      duration: projectDuration,
    };
    const inputProps = { project: renderProject };
    const composition = await selectComposition({
      serveUrl,
      id: "PixoresComposition",
      inputProps,
      timeoutInMilliseconds: 600_000,
      binariesDirectory,
      browserExecutable,
    });
    const renderFps = Number(exportSettings?.fps) || composition.fps;
    const totalFrames = Math.max(1, Math.ceil(projectDuration * renderFps));
    const renderComposition = {
      ...composition,
      width: Number(exportSettings?.width) || composition.width,
      height: Number(exportSettings?.height) || composition.height,
      fps: renderFps,
      durationInFrames: totalFrames,
    };
    const qualityPreset = exportSettings?.qualityPreset || "recommended";
    const softwareCrf = Number(exportSettings?.crf) || qualityCrf[qualityPreset] || qualityCrf.recommended;
    const baseVideoKbps = Number(exportSettings?.videoBitrateKbps) || qualityVideoKbps[qualityPreset] || qualityVideoKbps.recommended;
    const resolutionFactor = Math.max(0.25, (renderComposition.width * renderComposition.height) / (1920 * 1080));
    const fpsFactor = Math.max(0.5, renderFps / 30);
    const acceleratedVideoBitrate = `${Math.round(baseVideoKbps * resolutionFactor * fpsFactor)}k`;
    const initialConcurrency = getSafeRenderConcurrency(renderComposition);
    const initialOffthreadVideoThreads = getOffthreadVideoThreads(initialConcurrency);
    let renderStartedAt = Date.now();
    let completedWarnings = warnings;

    updateJob(renderId, {
      totalFrames,
      renderedFrames: 0,
      renderFps: 0,
      speed: 0,
      encoder: getEncoderLabel(outputFormat.codec, useHardwareEncoder),
    });

    const runRenderAttempt = async ({ attemptConcurrency, attemptHardwareAcceleration }) => {
      const softwareEncoding = attemptHardwareAcceleration === "disable";
      renderStartedAt = Date.now();
      await renderMedia({
        composition: renderComposition,
        serveUrl,
        codec: outputFormat.codec,
        outputLocation: renderOutputPath,
        inputProps,
        overwrite: true,
        logLevel: "warn",
        crf: softwareEncoding ? softwareCrf : null,
        videoBitrate: softwareEncoding ? null : acceleratedVideoBitrate,
        x264Preset: softwareEncoding ? exportSettings?.encoderPreset || "medium" : null,
        pixelFormat: exportSettings?.pixelFormat || "yuv420p",
        audioBitrate: `${Number(exportSettings?.audioBitrateKbps) || 192}k`,
        audioCodec: needsCompatibleAacMux ? "pcm-16" : requestedAudioCodec,
        separateAudioTo: separateAudioPath,
        sampleRate: Number(exportSettings?.audioSampleRate) || 48000,
        hardwareAcceleration: attemptHardwareAcceleration,
        concurrency: attemptConcurrency,
        offthreadVideoThreads: Math.min(initialOffthreadVideoThreads, attemptConcurrency),
        timeoutInMilliseconds: 600_000,
        binariesDirectory,
        browserExecutable,
        cancelSignal: cancelControl.cancelSignal,
        muted: !hasAudibleMedia,
        onProgress: (progressValue) => {
          if (renderJobs.get(renderId)?.status === "cancelled") return;
          const renderedFrames = Number(progressValue?.renderedFrames) || Math.round(getProgressValue(progressValue) * totalFrames);
          const elapsedSeconds = Math.max(0.001, (Date.now() - renderStartedAt) / 1000);
          const measuredFps = renderedFrames / elapsedSeconds;
          const frameProgress = Math.min(0.99, renderedFrames / totalFrames);
          const renderStatus = progressValue?.stitchStage === "muxing"
            ? "muxing"
            : renderedFrames >= totalFrames
              ? "encoding"
              : "rendering";
          updateJob(renderId, {
            status: renderStatus,
            progress: frameProgress,
            renderedFrames,
            totalFrames,
            renderFps: measuredFps,
            speed: measuredFps / renderFps,
          });
        },
      });
    };

    let attemptHardwareAcceleration = initialHardwareAcceleration;
    let attemptConcurrency = initialConcurrency;
    let usedEncoderFallback = false;
    let usedCompatibilityMode = false;
    while (true) {
      try {
        await runRenderAttempt({ attemptConcurrency, attemptHardwareAcceleration });
        break;
      } catch (error) {
        if (renderJobs.get(renderId)?.status === "cancelled") throw error;
        const failedAttempt = renderJobs.get(renderId);
        const completedFramePass = totalFrames > 0
          && Number(failedAttempt?.renderedFrames) >= totalFrames;

        if (
          acceleration === "auto"
          && attemptHardwareAcceleration === "required"
          && !usedEncoderFallback
          && (isHardwareEncoderFailure(error) || completedFramePass)
        ) {
          usedEncoderFallback = true;
          attemptHardwareAcceleration = "disable";
          completedWarnings = [
            ...completedWarnings,
            completedFramePass
              ? `${getHardwareEncoderName(outputFormat.codec)} did not finalize the completed frame pass; retrying automatically with ${getSoftwareEncoderName(outputFormat.codec)}.`
              : `${getHardwareEncoderName(outputFormat.codec)} failed during export; retrying with ${getSoftwareEncoderName(outputFormat.codec)}.`,
          ];
          updateJob(renderId, {
            status: "preparing",
            progress: 0.08,
            renderedFrames: 0,
            renderFps: 0,
            speed: 0,
            warnings: completedWarnings,
            encoder: getEncoderLabel(outputFormat.codec, false, "automatic fallback"),
          });
          continue;
        }

        if (!usedCompatibilityMode && isRecoverableCompositorFailure(error)) {
          usedCompatibilityMode = true;
          attemptConcurrency = 1;
          completedWarnings = [...completedWarnings, "The video compositor restarted automatically in compatibility mode."];
          updateJob(renderId, {
            status: "preparing",
            progress: 0.08,
            renderedFrames: 0,
            renderFps: 0,
            speed: 0,
            warnings: completedWarnings,
            encoder: getEncoderLabel(outputFormat.codec, attemptHardwareAcceleration === "required", "compatibility mode"),
          });
          continue;
        }

        throw error;
      }
    }

    if (renderJobs.get(renderId)?.status === "cancelled") return;
    if (needsCompatibleAacMux) {
      updateJob(renderId, { status: "muxing", progress: 0.99 });
      await runExecutable(path.join(binariesDirectory, "ffmpeg.exe"), [
        "-hide_banner",
        "-loglevel", "error",
        "-i", intermediateVideoPath,
        "-i", separateAudioPath,
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", `${Number(exportSettings?.audioBitrateKbps) || 192}k`,
        "-ar", String(Number(exportSettings?.audioSampleRate) || 48000),
        "-movflags", "+faststart",
        "-y",
        outputPath,
      ], {
        signal: preparationAbort.signal,
        timeout: 30 * 60 * 1000,
      });
    }
    updateJob(renderId, { status: "finalizing", progress: 0.995 });
    await Promise.all([
      intermediateVideoPath ? fs.rm(intermediateVideoPath, { force: true }) : Promise.resolve(),
      separateAudioPath ? fs.rm(separateAudioPath, { force: true }) : Promise.resolve(),
      hybridBasePath ? fs.rm(hybridBasePath, { force: true }) : Promise.resolve(),
      segmentedDirectory ? fs.rm(segmentedDirectory, { recursive: true, force: true }) : Promise.resolve(),
      audioProcessingDirectory ? fs.rm(audioProcessingDirectory, { recursive: true, force: true }) : Promise.resolve(),
    ]);
    intermediateVideoPath = undefined;
    separateAudioPath = undefined;
    hybridBasePath = undefined;
    segmentedDirectory = undefined;
    audioProcessingDirectory = undefined;
    const publishedOutputPath = await publishRenderedOutput(outputPath, finalOutputPath);
    updateJob(renderId, {
      status: "completed",
      progress: 1,
      outputPath: publishedOutputPath,
      outputUrl: fileUrlFromPath(publishedOutputPath),
      outputFormat,
      warnings: completedWarnings,
    });
    renderCancels.delete(renderId);
  } catch (error) {
    renderCancels.delete(renderId);
    if (renderJobs.get(renderId)?.status === "cancelled") return;
    updateJob(renderId, {
      status: "failed",
      progress: 0,
      error: error instanceof Error ? error.message : "Local render failed.",
    });
  } finally {
    await localMediaServer?.close();
    await Promise.all([
      intermediateVideoPath ? fs.rm(intermediateVideoPath, { force: true }) : Promise.resolve(),
      separateAudioPath ? fs.rm(separateAudioPath, { force: true }) : Promise.resolve(),
      hybridBasePath ? fs.rm(hybridBasePath, { force: true }) : Promise.resolve(),
      segmentedDirectory ? fs.rm(segmentedDirectory, { recursive: true, force: true }) : Promise.resolve(),
      audioProcessingDirectory ? fs.rm(audioProcessingDirectory, { recursive: true, force: true }) : Promise.resolve(),
      outputPath ? fs.rm(outputPath, { force: true }) : Promise.resolve(),
    ]);
  }
}

export async function inspectDesktopRenderStrategy(project, { includeAudio = true, fps = 30 } = {}) {
  const directPlan = await createDirectConcatPlan(project, { includeAudio, fps });
  if (directPlan) {
    return {
      strategy: "native",
      duration: directPlan.duration,
      nativeDuration: directPlan.duration,
      compositorDuration: 0,
    };
  }

  const segmentedPlan = await createSegmentedHybridPlan(project, { includeAudio, fps });
  if (segmentedPlan) {
    return {
      strategy: "segmented-hybrid",
      duration: segmentedPlan.projectDuration,
      nativeDuration: Math.max(0, segmentedPlan.projectDuration - segmentedPlan.complexDuration),
      compositorDuration: segmentedPlan.complexDuration,
      segmentCount: segmentedPlan.segments.length,
    };
  }

  const hybridPlan = await createHybridBasePlan(project, { includeAudio, fps });
  if (hybridPlan) {
    return {
      strategy: "hybrid-compositor",
      duration: Math.max(0, Number(project.duration) || calculateProjectDuration(project.layers)),
      nativeDuration: hybridPlan.plan.duration,
    };
  }

  return {
    strategy: "full-compositor",
    duration: Math.max(0, Number(project.duration) || calculateProjectDuration(project.layers)),
    nativeDuration: 0,
  };
}

export function createDesktopRenderHandlers({ app, state, appRoot = process.cwd() }) {
  return {
    async renderVideoLocal(project, options = {}) {
      const concurrencyKey = String(options.concurrencyKey || "").trim();
      const activeStatuses = new Set(["queued", "analyzing", "preparing", "bundling", "rendering", "encoding", "muxing", "finalizing"]);
      const concurrentJob = concurrencyKey
        ? [...renderJobs.values()].find((job) => job.concurrencyKey === concurrencyKey && activeStatuses.has(job.status))
        : null;
      if (concurrentJob) {
        throw new Error(`A ${concurrencyKey} export is already running. Wait for it to finish or cancel it before starting another batch.`);
      }
      const renderId = crypto.randomUUID();
      const now = new Date().toISOString();
      const outputFormat = getVideoExportFormat(options.outputFormatId);

      renderJobs.set(renderId, {
        renderId,
        status: "queued",
        progress: 0,
        outputPath: "",
        outputUrl: "",
        outputFormat,
        error: "",
        warnings: [],
        concurrencyKey,
        renderSessionId: String(options.renderSessionId || "").trim(),
        createdAt: now,
        updatedAt: now,
      });

      void renderLocalJob({ app, state, project, renderId, appRoot, outputFormatId: outputFormat.id, exportSettings: options.exportSettings });

      return {
        renderId,
        status: "queued",
        progress: 0,
        message: `Desktop local ${outputFormat.label} render queued`,
      };
    },

    async startRender(project, options = {}) {
      return this.renderVideoLocal(project, options);
    },

    async getRenderStatus(renderId) {
      const job = renderJobs.get(renderId);
      if (!job) {
        return {
          renderId,
          status: "failed",
          progress: 0,
          error: "Desktop render job was not found.",
          warnings: [],
        };
      }

      return job;
    },

    async cancelRender(renderId) {
      const job = renderJobs.get(renderId);
      if (!job) {
        return {
          renderId,
          status: "failed",
          progress: 0,
          error: "Desktop render job was not found.",
          warnings: [],
        };
      }

      const activeStatuses = new Set(["queued", "analyzing", "preparing", "bundling", "rendering", "encoding", "muxing", "finalizing"]);
      const targets = job.concurrencyKey
        ? [...renderJobs.values()].filter((candidate) => candidate.concurrencyKey === job.concurrencyKey && activeStatuses.has(candidate.status))
        : [job];
      for (const target of targets) {
        renderCancels.get(target.renderId)?.();
        renderCancels.delete(target.renderId);
        updateJob(target.renderId, {
          status: "cancelled",
          progress: target.progress || 0,
          error: "",
        });
      }

      return renderJobs.get(renderId);
    },
  };
}
