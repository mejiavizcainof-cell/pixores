/**
 * In-memory render job status endpoint.
 *
 * Web deployments intentionally avoid importing the Remotion render pipeline
 * because its native binaries exceed Vercel's standard function size limit.
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
