import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderVideo } from "./render-video";
import type { PixoresVideoExportFormatId } from "../export-formats";
import type { PixoresVideoProject } from "../types";
import type { PixoresExportSettings } from "../export-settings";
import { calculateProjectDuration } from "../timeline";
import { createExportRangeProject } from "../export-range";

/**
 * Local render job store shared by Next.js development workers through temp
 * JSON files. The in-memory map remains the fast path for the worker rendering
 * the job.
 */

export type RenderJobStatus = "queued" | "preparing" | "bundling" | "rendering" | "encoding" | "finalizing" | "completed" | "failed";

export type RenderJob = {
  renderId: string;
  status: RenderJobStatus;
  progress: number;
  outputUrl: string;
  error: string;
  warnings: string[];
  renderedFrames: number;
  totalFrames: number;
  renderFps: number;
  speed: number;
  encoder: string;
  createdAt: string;
  updatedAt: string;
};

const jobs = new Map<string, RenderJob>();
const persistenceQueues = new Map<string, Promise<void>>();
const renderJobsDir = path.join(os.tmpdir(), "pixores-render-jobs");

function getRenderJobPath(renderId: string) {
  return path.join(renderJobsDir, `${renderId}.json`);
}

async function persistRenderJob(job: RenderJob) {
  await fs.mkdir(renderJobsDir, { recursive: true });
  const targetPath = getRenderJobPath(job.renderId);
  await fs.writeFile(targetPath, JSON.stringify(job), "utf8");
}

function queueRenderJobPersistence(job: RenderJob) {
  const previous = persistenceQueues.get(job.renderId) || Promise.resolve();
  const next = previous.catch(() => undefined).then(() => persistRenderJob(job));
  persistenceQueues.set(job.renderId, next);
  void next.finally(() => {
    if (persistenceQueues.get(job.renderId) === next) persistenceQueues.delete(job.renderId);
  }).catch(() => undefined);
}

function now() {
  return new Date().toISOString();
}

function patchRenderJob(renderId: string, patch: Partial<RenderJob>) {
  const current = jobs.get(renderId);
  if (!current) return;
  const nextJob = {
    ...current,
    ...patch,
    updatedAt: now(),
  };
  jobs.set(renderId, nextJob);
  queueRenderJobPersistence(nextJob);
}

export async function createRenderJob() {
  const renderId = crypto.randomUUID();
  const createdAt = now();
  const job: RenderJob = {
    renderId,
    status: "queued",
    progress: 0,
    outputUrl: "",
    error: "",
    warnings: [],
    renderedFrames: 0,
    totalFrames: 0,
    renderFps: 0,
    speed: 0,
    encoder: "H.264",
    createdAt,
    updatedAt: createdAt,
  };
  jobs.set(renderId, job);
  await persistRenderJob(job);
  return job;
}

export async function getRenderJob(renderId: string) {
  const inMemory = jobs.get(renderId);
  if (inMemory) return inMemory;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const job = JSON.parse(await fs.readFile(getRenderJobPath(renderId), "utf8")) as RenderJob;
      return job?.renderId === renderId ? job : null;
    } catch {
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  return null;
}

export function startRenderJob(
  renderId: string,
  project: PixoresVideoProject,
  options: { outputFormatId?: PixoresVideoExportFormatId; exportSettings?: PixoresExportSettings } = {},
) {
  const fps = Number(options.exportSettings?.fps) || 30;
  const renderProject = createExportRangeProject(project, options.exportSettings);
  const renderDuration = Math.max(0.05, Number(renderProject.duration) || calculateProjectDuration(renderProject.layers));
  const totalFrames = Math.max(1, Math.ceil(renderDuration * fps));
  const startedAt = Date.now();
  patchRenderJob(renderId, { status: "preparing", progress: 0.01, totalFrames, renderedFrames: 0 });

  void renderVideo(project, {
    renderId,
    outputFormatId: options.outputFormatId,
    exportSettings: options.exportSettings,
    onStage: (status, progress) => {
      patchRenderJob(renderId, { status, progress });
    },
    onProgress: (progress, renderedFrames = 0) => {
      const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1000);
      const renderFps = renderedFrames / elapsedSeconds;
      patchRenderJob(renderId, {
        status: "rendering",
        progress: renderedFrames > 0
          ? Math.min(0.99, renderedFrames / totalFrames)
          : Math.min(0.99, Math.max(0, progress)),
        renderedFrames,
        totalFrames,
        renderFps,
        speed: renderFps / fps,
      });
    },
  })
    .then((result) => {
      patchRenderJob(renderId, {
        status: "completed",
        progress: 1,
        renderedFrames: totalFrames,
        totalFrames,
        outputUrl: result.outputUrl,
        warnings: result.warnings,
      });
    })
    .catch((error) => {
      patchRenderJob(renderId, {
        status: "failed",
        progress: 1,
        error: error instanceof Error ? error.message : "Render failed",
      });
    });
}
