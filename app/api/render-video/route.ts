import fs from "node:fs/promises";
import { createRenderJob, startRenderJob } from "@/src/video-render/server/render-jobs";
import { findRenderOutputPath } from "@/src/video-render/server/render-video";
import type { PixoresVideoProject } from "@/src/video-render/types";
import { getPixoresVideoExportFormat } from "@/src/video-render/export-formats";

/**
 * Remotion render endpoint for Pixores Video Maker.
 *
 * POST receives PixoresVideoProject JSON, creates an in-memory render job, and
 * starts rendering in the background.
 * GET streams a temporary MP4 by renderId.
 */

export const runtime = "nodejs";

function isPixoresProject(value: unknown): value is PixoresVideoProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<PixoresVideoProject>;
  return (
    project.schemaVersion === 1
    && typeof project.duration === "number"
    && Number.isFinite(project.duration)
    && project.duration > 0
    && !!project.canvas
    && typeof project.canvas.width === "number"
    && Number.isFinite(project.canvas.width)
    && project.canvas.width > 0
    && typeof project.canvas.height === "number"
    && Number.isFinite(project.canvas.height)
    && project.canvas.height > 0
    && Array.isArray(project.layers)
    && Array.isArray(project.assets)
  );
}

function isSafeRenderId(renderId: string) {
  return /^[a-f0-9-]{36}$/i.test(renderId);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = isPixoresProject(body?.project) ? body.project : body;
    const outputFormat = getPixoresVideoExportFormat(body?.outputFormatId);

    if (!isPixoresProject(project)) {
      return Response.json({ ok: false, error: "Invalid PixoresVideoProject JSON" }, { status: 400 });
    }

    const job = createRenderJob();
    startRenderJob(job.renderId, project, { outputFormatId: outputFormat.id });

    return Response.json({
      ok: true,
      renderId: job.renderId,
      status: job.status,
      progress: job.progress,
      outputFormat,
      message: "Render job queued",
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Render failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const renderId = searchParams.get("renderId") || "";

  if (!isSafeRenderId(renderId)) {
    return Response.json({ ok: false, error: "Invalid renderId" }, { status: 400 });
  }

  try {
    const output = await findRenderOutputPath(renderId);
    if (!output) {
      return Response.json({ ok: false, error: "Render output not found" }, { status: 404 });
    }

    const file = await fs.readFile(output.outputPath);
    return new Response(file, {
      headers: {
        "Content-Type": output.contentType,
        "Content-Disposition": `attachment; filename="pixores-render-${renderId}.${output.extension}"`,
      },
    });
  } catch {
    return Response.json({ ok: false, error: "Render output not found" }, { status: 404 });
  }
}
