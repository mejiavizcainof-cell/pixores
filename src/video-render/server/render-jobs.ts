import crypto from "node:crypto";
import { renderVideo } from "./render-video";
import type { PixoresVideoExportFormatId } from "../export-formats";
import type { PixoresVideoProject } from "../types";

/**
 * In-memory render job store.
 *
 * This is intentionally simple for local development. It will be swapped for a
 * persistent store such as Supabase or Redis in a later phase.
 */

export type RenderJobStatus = "queued" | "rendering" | "completed" | "failed";

export type RenderJob = {
  renderId: string;
  status: RenderJobStatus;
  progress: number;
  outputUrl: string;
  error: string;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
};

const jobs = new Map<string, RenderJob>();

function now() {
  return new Date().toISOString();
}

function patchRenderJob(renderId: string, patch: Partial<RenderJob>) {
  const current = jobs.get(renderId);
  if (!current) return;
  jobs.set(renderId, {
    ...current,
    ...patch,
    updatedAt: now(),
  });
}

export function createRenderJob() {
  const renderId = crypto.randomUUID();
  const createdAt = now();
  const job: RenderJob = {
    renderId,
    status: "queued",
    progress: 0,
    outputUrl: "",
    error: "",
    warnings: [],
    createdAt,
    updatedAt: createdAt,
  };
  jobs.set(renderId, job);
  return job;
}

export function getRenderJob(renderId: string) {
  return jobs.get(renderId) || null;
}

export function startRenderJob(
  renderId: string,
  project: PixoresVideoProject,
  options: { outputFormatId?: PixoresVideoExportFormatId } = {},
) {
  patchRenderJob(renderId, { status: "rendering", progress: 0.02 });

  void renderVideo(project, {
    renderId,
    outputFormatId: options.outputFormatId,
    onProgress: (progress) => {
      patchRenderJob(renderId, {
        status: "rendering",
        progress: Math.max(0.02, Math.min(0.99, progress)),
      });
    },
  })
    .then((result) => {
      patchRenderJob(renderId, {
        status: "completed",
        progress: 1,
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
