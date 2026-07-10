import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import type { PixoresMediaMetadata, PixoresMediaKind } from "../types";

const execFileAsync = promisify(execFile);

type AnalyzeOptions = {
  kind?: PixoresMediaKind;
  mimeType?: string;
  size?: number;
};

type FfprobeStream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
  color_space?: string;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  sample_rate?: string;
  channels?: number;
};

type FfprobeOutput = {
  streams?: FfprobeStream[];
  format?: {
    format_name?: string;
    duration?: string;
    size?: string;
    bit_rate?: string;
  };
};

function parseNumber(value: unknown) {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFps(value?: string) {
  if (!value || value === "0/0") return undefined;
  const [num, den] = value.split("/").map(Number);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return undefined;
  const fps = num / den;
  return Number.isFinite(fps) && fps > 0 ? Number(fps.toFixed(3)) : undefined;
}

async function findFfprobePath() {
  const candidates = [
    process.env.FFPROBE_PATH,
    path.join(process.cwd(), "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffprobe.exe"),
    path.join(process.cwd(), "node_modules", "@remotion", "compositor-darwin-x64", "ffprobe"),
    path.join(process.cwd(), "node_modules", "@remotion", "compositor-darwin-arm64", "ffprobe"),
    path.join(process.cwd(), "node_modules", "@remotion", "compositor-linux-x64-gnu", "ffprobe"),
    "ffprobe",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (candidate === "ffprobe") return candidate;
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next bundled ffprobe candidate.
    }
  }

  return "ffprobe";
}

function normalizeFfprobeMetadata(output: FfprobeOutput, options: AnalyzeOptions): PixoresMediaMetadata {
  const streams = output.streams || [];
  const videoStream = streams.find((stream) => stream.codec_type === "video");
  const audioStream = streams.find((stream) => stream.codec_type === "audio");
  const duration = parseNumber(output.format?.duration);
  const size = parseNumber(output.format?.size) ?? options.size;
  const bitrate = parseNumber(output.format?.bit_rate);

  const warnings: string[] = [];
  if (videoStream && !parseFps(videoStream.avg_frame_rate || videoStream.r_frame_rate)) warnings.push("Video FPS could not be detected.");
  if (options.kind === "video" && !videoStream) warnings.push("No video stream detected.");
  if ((options.kind === "video" || options.kind === "audio") && !duration) warnings.push("Duration could not be detected.");

  return {
    analyzer: "ffprobe",
    analyzedAt: new Date().toISOString(),
    formatName: output.format?.format_name,
    mimeType: options.mimeType,
    size,
    duration,
    bitrate,
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

async function analyzeWithFfprobe(filePath: string, options: AnalyzeOptions) {
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

  return normalizeFfprobeMetadata(JSON.parse(stdout) as FfprobeOutput, options);
}

async function analyzeImageWithSharp(filePath: string, options: AnalyzeOptions): Promise<PixoresMediaMetadata> {
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

export async function analyzeMediaFile(filePath: string, options: AnalyzeOptions = {}): Promise<PixoresMediaMetadata> {
  const statSize = options.size ?? (await fs.stat(filePath).then((stat) => stat.size).catch(() => undefined));
  const nextOptions = { ...options, size: statSize };

  if (options.kind === "image" || options.mimeType?.startsWith("image/")) {
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
