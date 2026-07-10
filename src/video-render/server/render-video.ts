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
  onProgress?: (progress: number) => void;
};

export const pixoresRenderDir = path.join(os.tmpdir(), "pixores-renders");

const runtimeRequire = createRequire(import.meta.url);

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
      const src = layer.src || asset?.persistentUrl || asset?.url || "";
      const label = layer.type === "audio" ? "Audio" : layer.mediaKind === "video" ? "Video" : "Image";
      if (!src) return [`${label} "${layer.name}" was skipped: missing persistent URL.`];
      if (src.startsWith("blob:")) return [`${label} "${layer.name}" was skipped: blob URLs cannot be rendered on the server.`];
      return [];
    });
}

export function prepareRenderVideo(project: PixoresVideoProject): PreparedRenderJob {
  const renderId = crypto.randomUUID();

  return {
    ok: true,
    status: "prepared",
    renderId,
    project: {
      duration: project.duration,
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
  const warnings = getMediaRenderWarnings(project);

  await fs.mkdir(pixoresRenderDir, { recursive: true });

  const { bundle, renderMedia, selectComposition } = loadRemotionServerModules();

  const serveUrl = await bundle({
    entryPoint,
    enableCaching: true,
    publicDir: path.join(process.cwd(), "public"),
    rootDir: process.cwd(),
  });
  const inputProps = { project };
  const composition = await selectComposition({
    serveUrl,
    id: "PixoresComposition",
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: outputFormat.codec,
    outputLocation: outputPath,
    inputProps,
    overwrite: true,
    logLevel: "warn",
    onProgress: (progressValue: unknown) => {
      options.onProgress?.(getProgressValue(progressValue));
    },
  });

  return {
    ok: true,
    renderId,
    outputPath,
    outputUrl: `/api/render-video?renderId=${encodeURIComponent(renderId)}&format=${encodeURIComponent(outputFormat.id)}`,
    message: warnings.length ? "Render complete with warnings" : "Render complete",
    warnings,
  };
}

export async function renderVideoToMp4(project: PixoresVideoProject) {
  return renderVideo(project);
}
