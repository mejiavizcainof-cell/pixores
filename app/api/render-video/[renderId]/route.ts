/**
 * Local render job status endpoint.
 *
 * Web deployments intentionally avoid importing the Remotion render pipeline
 * because its native binaries exceed Vercel's standard function size limit.
 */

export const runtime = "nodejs";

function isServerRenderEnabled() {
  return process.env.VERCEL !== "1" || process.env.PIXORES_ENABLE_SERVER_RENDER === "1";
}

function isSafeRenderId(renderId: string) {
  return /^[a-f0-9-]{36}$/i.test(renderId);
}

export async function GET(_request: Request, context: { params: Promise<{ renderId: string }> }) {
  const { renderId } = await context.params;

  if (!isSafeRenderId(renderId)) {
    return Response.json({ ok: false, error: "Invalid renderId" }, { status: 400 });
  }

  if (isServerRenderEnabled()) {
    const { getRenderJob } = await import("@/src/video-render/server/render-jobs");
    const job = await getRenderJob(renderId);
    if (!job) return Response.json({ ok: false, error: "Render job was not found." }, { status: 404 });
    if (job.status !== "completed" && job.status !== "failed") {
      const { findRenderOutputPath } = await import("@/src/video-render/server/render-video");
      const output = await findRenderOutputPath(renderId);
      if (output) {
        return Response.json({
          ok: true,
          ...job,
          status: "completed",
          progress: 1,
          renderedFrames: job.totalFrames,
          outputUrl: `/api/render-video?renderId=${encodeURIComponent(renderId)}`,
        });
      }
    }
    return Response.json({ ok: true, ...job });
  }

  return Response.json(
    {
      ok: false,
      renderId,
      status: "unavailable",
      progress: 0,
      outputUrl: "",
      error: "Server render status is disabled on the web deployment. Use Desktop local render or MediaRecorder export.",
      warnings: [],
    },
    { status: 501 },
  );
}

export async function DELETE(_request: Request, context: { params: Promise<{ renderId: string }> }) {
  const { renderId } = await context.params;

  if (!isSafeRenderId(renderId)) {
    return Response.json({ ok: false, error: "Invalid renderId" }, { status: 400 });
  }

  return Response.json({
    ok: true,
    renderId,
    status: "cancelled",
    progress: 0,
    outputUrl: "",
    warnings: ["Server render cancellation acknowledged. Web render is disabled on this deployment."],
  });
}
