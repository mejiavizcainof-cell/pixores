import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { createRequire } from "node:module";

const execFileAsync = promisify(execFile);
const runtimeRequire = createRequire(import.meta.url);

function parseNumber(value) {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFps(value) {
  if (!value || value === "0/0") return undefined;
  const [num, den] = String(value).split("/").map(Number);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return undefined;
  const fps = num / den;
  return Number.isFinite(fps) && fps > 0 ? Number(fps.toFixed(3)) : undefined;
}

async function findFfprobePath() {
  const candidates = [
    process.env.FFPROBE_PATH,
    path.join(process.cwd(), "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffprobe.exe"),
    path.join(process.resourcesPath || "", "app.asar.unpacked", "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffprobe.exe"),
    "ffprobe",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === "ffprobe") return candidate;
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Keep looking.
    }
  }

  return "ffprobe";
}

function normalizeFfprobeMetadata(output, options) {
  const streams = output.streams || [];
  const videoStream = streams.find((stream) => stream.codec_type === "video");
  const audioStream = streams.find((stream) => stream.codec_type === "audio");
  const warnings = [];
  const duration = parseNumber(output.format?.duration);

  if ((options.kind === "video" || options.kind === "audio") && !duration) warnings.push("Duration could not be detected.");
  if (options.kind === "video" && !videoStream) warnings.push("No video stream detected.");

  return {
    analyzer: "ffprobe",
    analyzedAt: new Date().toISOString(),
    formatName: output.format?.format_name,
    mimeType: options.mimeType,
    size: parseNumber(output.format?.size) ?? options.size,
    duration,
    bitrate: parseNumber(output.format?.bit_rate),
    width: videoStream?.width,
    height: videoStream?.height,
    fps: parseFps(videoStream?.avg_frame_rate || videoStream?.r_frame_rate),
    codec: videoStream?.codec_name,
    pixelFormat: videoStream?.pix_fmt,
    colorSpace: videoStream?.color_space,
    hasVideo: Boolean(videoStream),
    hasAudio: Boolean(audioStream),
    audioCodec: audioStream?.codec_name,
    sampleRate: parseNumber(audioStream?.sample_rate),
    channels: audioStream?.channels,
    warnings: warnings.length ? warnings : undefined,
  };
}

async function analyzeWithFfprobe(filePath, options) {
  const ffprobePath = await findFfprobePath();
  const { stdout } = await execFileAsync(ffprobePath, [
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    filePath,
  ], { maxBuffer: 1024 * 1024 * 10 });
  return normalizeFfprobeMetadata(JSON.parse(stdout), options);
}

async function analyzeImageWithSharp(filePath, options) {
  const sharp = runtimeRequire("sharp");
  const metadata = await sharp(filePath).metadata();
  return {
    analyzer: "sharp",
    analyzedAt: new Date().toISOString(),
    mimeType: options.mimeType,
    size: options.size,
    width: metadata.width,
    height: metadata.height,
    imageFormat: metadata.format,
    hasAlpha: Boolean(metadata.hasAlpha),
    hasVideo: false,
    hasAudio: false,
  };
}

export async function analyzeMediaFile(filePath, options = {}) {
  const statSize = options.size ?? await fs.stat(filePath).then((stat) => stat.size).catch(() => undefined);
  const nextOptions = { ...options, size: statSize };

  if (options.kind === "image" || String(options.mimeType || "").startsWith("image/")) {
    try {
      return await analyzeImageWithSharp(filePath, nextOptions);
    } catch (error) {
      return {
        analyzer: "fallback",
        analyzedAt: new Date().toISOString(),
        mimeType: options.mimeType,
        size: statSize,
        warnings: [error instanceof Error ? error.message : "Image analysis failed."],
      };
    }
  }

  try {
    return await analyzeWithFfprobe(filePath, nextOptions);
  } catch (error) {
    return {
      analyzer: "fallback",
      analyzedAt: new Date().toISOString(),
      mimeType: options.mimeType,
      size: statSize,
      warnings: [error instanceof Error ? error.message : "FFprobe analysis failed."],
    };
  }
}
