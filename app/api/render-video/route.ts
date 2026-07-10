/**
 * Web render endpoint for Pixores Video Maker.
 *
 * Remotion rendering depends on native FFmpeg/Chromium binaries that exceed
 * Vercel's standard function bundle limit. Production web builds use the
 * browser recorder and Desktop local render instead.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  await request.json().catch(() => null);
  return Response.json(
    {
      ok: false,
      error: "Server render is disabled on the web deployment. Use Desktop local render or MediaRecorder export.",
    },
    { status: 501 },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const renderId = searchParams.get("renderId") || "";
  return Response.json(
    {
      ok: false,
      renderId,
      error: "Server render downloads are disabled on the web deployment.",
    },
    { status: 501 },
  );
}
