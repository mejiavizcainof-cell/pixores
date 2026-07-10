import { getRenderJob } from "@/src/video-render/server/render-jobs";

/**
 * In-memory render job status endpoint.
 *
 * Returns queued/rendering/completed/failed state for local render progress.
 */

export const runtime = "nodejs";

function isSafeRenderId(renderId: string) {
  return /^[a-f0-9-]{36}$/i.test(renderId);
}

export async function GET(_request: Request, context: { params: Promise<{ renderId: string }> }) {
  const { renderId } = await context.params;

  if (!isSafeRenderId(renderId)) {
    return Response.json({ ok: false, error: "Invalid renderId" }, { status: 400 });
  }

  const job = getRenderJob(renderId);
  if (!job) {
    return Response.json({ ok: false, error: "Render job not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    renderId: job.renderId,
    status: job.status,
    progress: job.progress,
    outputUrl: job.outputUrl,
    error: job.error,
    warnings: job.warnings,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
