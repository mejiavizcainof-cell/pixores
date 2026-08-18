import { GET as serveVideoMakerAsset } from "@/app/api/video-maker/assets/[filename]/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keeps projects saved before beta 62 working after runtime uploads moved out
 * of the public source tree. New uploads use /api/video-maker/assets instead.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  return serveVideoMakerAsset(request, context);
}
