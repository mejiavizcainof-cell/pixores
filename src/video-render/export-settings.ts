import type { PixoresVideoExportFormatId } from "./export-formats";

export type PixoresExportFormat = "mp4" | "webm" | "mov";
export type PixoresExportCodec = "h264" | "h265" | "vp9" | "av1" | "prores";
export type PixoresExportAspectMode = "fit" | "fill" | "stretch" | "project";
export type PixoresExportQualityPreset = "fast" | "recommended" | "high" | "maximum" | "custom";
export type PixoresExportAcceleration = "auto" | "hardware" | "software";
export type PixoresExportRenderMethod = "local" | "server" | "browser";
export type PixoresExportEncoderPreset = "ultrafast" | "fast" | "medium" | "slow";

export type PixoresExportSettings = {
  fileName: string;
  outputDirectory?: string;
  format: PixoresExportFormat;
  codec: PixoresExportCodec;
  width: number;
  height: number;
  aspectMode: PixoresExportAspectMode;
  fps: number;
  qualityPreset: PixoresExportQualityPreset;
  crf?: number;
  encoderPreset?: PixoresExportEncoderPreset;
  pixelFormat?: "yuv420p";
  videoBitrateKbps?: number;
  maxBitrateKbps?: number;
  includeAudio: boolean;
  audioCodec?: "aac" | "opus";
  audioBitrateKbps?: number;
  audioSampleRate?: 44100 | 48000;
  audioChannels?: 1 | 2;
  acceleration: PixoresExportAcceleration;
  hardwareEncoder?: "nvenc" | "qsv" | "amf" | "videotoolbox";
  renderMethod: PixoresExportRenderMethod;
  rangeStart?: number;
  rangeEnd?: number;
  colorSpace?: "rec709";
};

export const EXPORT_QUALITY_CRF: Record<PixoresExportQualityPreset, number> = {
  fast: 26,
  recommended: 22,
  high: 19,
  maximum: 17,
  custom: 22,
};

export const EXPORT_QUALITY_PRESETS: Record<Exclude<PixoresExportQualityPreset, "custom">, {
  crf: number;
  encoderPreset: PixoresExportEncoderPreset;
  audioBitrateKbps: number;
  description: string;
}> = {
  fast: { crf: 26, encoderPreset: "fast", audioBitrateKbps: 128, description: "Faster render and smaller file; ideal for tests." },
  recommended: { crf: 22, encoderPreset: "medium", audioBitrateKbps: 192, description: "Balanced quality, speed, and file size." },
  high: { crf: 19, encoderPreset: "slow", audioBitrateKbps: 256, description: "More detail with a longer render and larger file." },
  maximum: { crf: 17, encoderPreset: "slow", audioBitrateKbps: 256, description: "Maximum fidelity with a slower render and large file." },
};

export function normalizeExportQualityPreset(value: unknown): PixoresExportQualityPreset {
  return value === "fast" || value === "recommended" || value === "high" || value === "maximum" || value === "custom"
    ? value
    : "recommended";
}

export function applyExportQualityPreset(settings: PixoresExportSettings, qualityPreset: PixoresExportQualityPreset): PixoresExportSettings {
  const normalizedPreset = normalizeExportQualityPreset(qualityPreset);
  if (normalizedPreset === "custom") return { ...settings, qualityPreset: normalizedPreset };
  const preset = EXPORT_QUALITY_PRESETS[normalizedPreset];
  return {
    ...settings,
    qualityPreset: normalizedPreset,
    codec: "h264",
    crf: preset.crf,
    encoderPreset: preset.encoderPreset,
    audioCodec: "aac",
    audioBitrateKbps: preset.audioBitrateKbps,
    pixelFormat: "yuv420p",
  };
}

export function getExportFormatId(settings: PixoresExportSettings): PixoresVideoExportFormatId {
  if (settings.format === "webm") return "webm-vp9";
  if (settings.format === "mov") return "mov-prores";
  if (settings.codec === "h265") return "mp4-h265";
  return "mp4-h264";
}

export function normalizeExportFileName(fileName: string, format: PixoresExportFormat) {
  const base = fileName.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-") || "pixores-video";
  const withoutKnownExtension = base.replace(/\.(mp4|webm|mov)$/i, "");
  return `${withoutKnownExtension}.${format}`;
}

export function createDefaultExportSettings(input: {
  projectTitle: string;
  width: number;
  height: number;
  fps?: number;
  rangeStart?: number;
  rangeEnd?: number;
}): PixoresExportSettings {
  return {
    fileName: normalizeExportFileName(input.projectTitle || "pixores-video", "mp4"),
    format: "mp4",
    codec: "h264",
    width: input.width,
    height: input.height,
    aspectMode: "project",
    fps: input.fps || 30,
    qualityPreset: "recommended",
    crf: EXPORT_QUALITY_CRF.recommended,
    encoderPreset: "medium",
    pixelFormat: "yuv420p",
    includeAudio: true,
    audioCodec: "aac",
    audioBitrateKbps: 192,
    audioSampleRate: 48000,
    audioChannels: 2,
    acceleration: "auto",
    renderMethod: "local",
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    colorSpace: "rec709",
  };
}

export function estimateExportBytes(settings: PixoresExportSettings, durationSeconds: number) {
  const pixels = Math.max(1, settings.width * settings.height);
  const fpsFactor = Math.max(0.8, settings.fps / 30);
  const qualityMultiplier: Record<PixoresExportQualityPreset, number> = {
    fast: 0.06,
    recommended: 0.085,
    high: 0.12,
    maximum: 0.18,
    custom: 0.1,
  };
  const qualityPreset = normalizeExportQualityPreset(settings.qualityPreset);
  const autoVideoKbps = Math.round((pixels / 1000) * fpsFactor * qualityMultiplier[qualityPreset]);
  const videoKbps = Math.max(400, settings.videoBitrateKbps || autoVideoKbps);
  const audioKbps = settings.includeAudio ? settings.audioBitrateKbps || 192 : 0;
  return ((videoKbps + audioKbps) * 1000 * Math.max(0, durationSeconds)) / 8;
}

export function estimateExportBytesRange(settings: PixoresExportSettings, durationSeconds: number) {
  const midpoint = estimateExportBytes(settings, durationSeconds);
  return { minimum: midpoint * 0.72, maximum: midpoint * 1.32 };
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 1 : 2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
