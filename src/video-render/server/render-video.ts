import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import {
  getPixoresVideoExportContentType,
  getPixoresVideoExportFormat,
  PIXORES_VIDEO_EXPORT_FORMATS,
  type PixoresVideoExportFormatId,
} from "../export-formats";
import type { PixoresVideoProject, RenderVideoPreparedResponse } from "../types";
import { calculateProjectDuration } from "../timeline";
import type { PixoresExportSettings } from "../export-settings";
import { createExportRangeProject } from "../export-range";

/**
 * Server render adapter for Remotion.
 *
 * Phase 13 renders a real MP4 with background, text layers, shape layers,
 * image/video media, audio layers, and basic transitions.
 */

export type PreparedRenderJob = RenderVideoPreparedResponse;

export type RenderVideoResult = {
  ok: true;
  renderId: string;
  outputPath: string;
  outputUrl: string;
  message: string;
  warnings: string[];
};

export type RenderVideoOptions = {
  renderId?: string;
  outputFormatId?: PixoresVideoExportFormatId;
  exportSettings?: PixoresExportSettings;
  onProgress?: (progress: number, renderedFrames?: number) => void;
  onStage?: (status: "preparing" | "bundling" | "rendering" | "encoding" | "finalizing", progress: number) => void;
};

export const pixoresRenderDir = path.join(os.tmpdir(), "pixores-renders");

const runtimeRequire = createRequire(import.meta.url);
let remotionServeUrlPromise: Promise<string> | null = null;

function loadRemotionServerModules() {
  const bundler = runtimeRequire("@remotion/bundler") as {
    bundle: (options: Record<string, unknown>) => Promise<string>;
  };
  const renderer = runtimeRequire("@remotion/renderer") as {
    renderMedia: (options: Record<string, unknown>) => Promise<unknown>;
    selectComposition: (options: Record<string, unknown>) => Promise<unknown>;
  };

  return {
    bundle: bundler.bundle,
    renderMedia: renderer.renderMedia,
    selectComposition: renderer.selectComposition,
  };
}

function getRemotionServeUrl(bundle: (options: Record<string, unknown>) => Promise<string>, entryPoint: string) {
  if (!remotionServeUrlPromise) {
    remotionServeUrlPromise = bundle({
      entryPoint,
      enableCaching: true,
      publicDir: path.join(process.cwd(), "public"),
      rootDir: process.cwd(),
    }).catch((error) => {
      remotionServeUrlPromise = null;
      throw error;
    });
  }
  return remotionServeUrlPromise;
}

export function getRenderOutputPath(renderId: string, outputFormatId?: PixoresVideoExportFormatId) {
  const outputFormat = getPixoresVideoExportFormat(outputFormatId);
  return path.join(pixoresRenderDir, `${renderId}.${outputFormat.extension}`);
}

export async function findRenderOutputPath(renderId: string) {
  for (const format of PIXORES_VIDEO_EXPORT_FORMATS) {
    const candidate = path.join(pixoresRenderDir, `${renderId}.${format.extension}`);
    try {
      await fs.access(candidate);
      return {
        outputPath: candidate,
        extension: format.extension,
        contentType: getPixoresVideoExportContentType(format.extension),
      };
    } catch {
      // Try the next known render extension.
    }
  }

  return null;
}

function getMediaRenderWarnings(project: PixoresVideoProject) {
  return project.layers
    .filter((layer) => (
      (layer.type === "media" && (layer.mediaKind === "image" || layer.mediaKind === "video"))
      || layer.type === "audio"
    ))
    .flatMap((layer) => {
      const asset = layer.assetKey ? project.assets.find((item) => item.id === layer.assetKey) : undefined;
      const src = asset?.persistentUrl || asset?.url || layer.src || "";
      const label = layer.type === "audio" ? "Audio" : layer.mediaKind === "video" ? "Video" : "Image";
      if (!src) return [`${label} "${layer.name}" was skipped: missing persistent URL.`];
      if (src.startsWith("blob:")) return [`${label} "${layer.name}" was skipped: blob URLs cannot be rendered on the server.`];
      return [];
    });
}

export function prepareRenderVideo(project: PixoresVideoProject): PreparedRenderJob {
  const renderId = crypto.randomUUID();
  const projectDuration = calculateProjectDuration(project.layers);

  return {
    ok: true,
    status: "prepared",
    renderId,
    project: {
      duration: projectDuration,
      width: project.canvas.width,
      height: project.canvas.height,
      layerCount: project.layers.length,
      assetCount: project.assets.length,
    },
    nextStep: "Render with Remotion MP4 server pipeline.",
  };
}

function getProgressValue(value: unknown) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "progress" in value) {
    const progress = (value as { progress?: unknown }).progress;
    if (typeof progress === "number") return progress;
  }
  return 0;
}

export async function renderVideo(project: PixoresVideoProject, options: RenderVideoOptions = {}): Promise<RenderVideoResult> {
  const renderId = options.renderId || crypto.randomUUID();
  const outputFormat = getPixoresVideoExportFormat(options.outputFormatId);
  const outputPath = getRenderOutputPath(renderId, outputFormat.id);
  const entryPoint = path.join(process.cwd(), "src", "video-render", "remotion", "entry.ts");
  const renderProject = createExportRangeProject(project, options.exportSettings);
  const warnings = getMediaRenderWarnings(renderProject);

  await fs.mkdir(pixoresRenderDir, { recursive: true });

  options.onStage?.("bundling", 0.04);
  const { bundle, renderMedia, selectComposition } = loadRemotionServerModules();

  const serveUrl = await getRemotionServeUrl(bundle, entryPoint);
  const inputProps = { project: renderProject };
  const composition = await selectComposition({
    serveUrl,
    id: "PixoresComposition",
    inputProps,
    timeoutInMilliseconds: 120_000,
  });
  options.onStage?.("preparing", 0.08);

  const settings = options.exportSettings;
  const fps = Number(settings?.fps) || (composition as { fps: number }).fps;
  const durationInFrames = Math.max(1, Math.ceil(renderProject.duration * fps));
  const renderComposition = {
    ...(composition as Record<string, unknown>),
    width: Number(settings?.width) || (composition as { width: number }).width,
    height: Number(settings?.height) || (composition as { height: number }).height,
    fps,
    durationInFrames,
  };
  const acceleration = settings?.acceleration || "auto";
  const hardwareAcceleration = acceleration === "hardware" ? "required" : acceleration === "software" ? "disable" : "if-possible";
  const useCrf = outputFormat.codec === "h264" && acceleration === "software";

  options.onStage?.("rendering", 0.1);
  await renderMedia({
    composition: renderComposition,
    serveUrl,
    codec: outputFormat.codec,
    outputLocation: outputPath,
    inputProps,
    overwrite: true,
    logLevel: "warn",
    crf: useCrf ? Number(settings?.crf) || 22 : null,
    videoBitrate: outputFormat.codec === "h264" && !useCrf ? `${Number(settings?.videoBitrateKbps) || 8000}k` : null,
    x264Preset: useCrf ? settings?.encoderPreset || "medium" : null,
    pixelFormat: settings?.pixelFormat || "yuv420p",
    audioCodec: settings?.audioCodec || "aac",
    audioBitrate: `${Number(settings?.audioBitrateKbps) || 192}k`,
    sampleRate: Number(settings?.audioSampleRate) || 48000,
    hardwareAcceleration,
    muted: settings?.includeAudio === false,
    concurrency: Math.max(1, Math.min(4, os.cpus().length - 1)),
    timeoutInMilliseconds: 120_000,
    onProgress: (progressValue: unknown) => {
      const renderedFrames = progressValue && typeof progressValue === "object" && "renderedFrames" in progressValue
        ? Number((progressValue as { renderedFrames?: unknown }).renderedFrames) || 0
        : 0;
      options.onProgress?.(getProgressValue(progressValue), renderedFrames);
    },
  });
  options.onStage?.("finalizing", 0.99);

  return {
    ok: true,
    renderId,
    outputPath,
    outputUrl: `/api/render-video?renderId=${encodeURIComponent(renderId)}&format=${encodeURIComponent(outputFormat.id)}&fileName=${encodeURIComponent(settings?.fileName || `pixores-video.${outputFormat.extension}`)}`,
    message: warnings.length ? "Render complete with warnings" : "Render complete",
    warnings,
  };
}

export async function renderVideoToMp4(project: PixoresVideoProject) {
  return renderVideo(project);
}
