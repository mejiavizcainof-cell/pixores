import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { getPixoresVideoExportContentType } from "@/src/video-render/export-formats";

export const runtime = "nodejs";

function isServerRenderEnabled() {
  return process.env.VERCEL !== "1" || process.env.PIXORES_ENABLE_SERVER_RENDER === "1";
}

export async function POST(request: Request) {
  if (!isServerRenderEnabled()) {
    return Response.json({ ok: false, error: "Server render is disabled on this deployment." }, { status: 501 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const project = body?.project as import("@/src/video-render/types").PixoresVideoProject | undefined;
  if (!project || !Array.isArray(project.layers) || !Array.isArray(project.assets) || !project.canvas) {
    return Response.json({ ok: false, error: "Invalid Pixores project." }, { status: 400 });
  }

  const { createRenderJob, getRenderJob, startRenderJob } = await import("@/src/video-render/server/render-jobs");
  const job = await createRenderJob();
  startRenderJob(job.renderId, project, {
    outputFormatId: body?.outputFormatId as import("@/src/video-render/export-formats").PixoresVideoExportFormatId | undefined,
    exportSettings: body?.exportSettings as import("@/src/video-render/export-settings").PixoresExportSettings | undefined,
  });

  return Response.json({ ok: true, ...((await getRenderJob(job.renderId)) || job) }, { status: 202 });
}

export async function GET(request: Request) {
  if (!isServerRenderEnabled()) {
    return Response.json({ ok: false, error: "Server render downloads are disabled on this deployment." }, { status: 501 });
  }

  const { searchParams } = new URL(request.url);
  const renderId = searchParams.get("renderId") || "";
  if (!/^[a-f0-9-]{36}$/i.test(renderId)) {
    return Response.json({ ok: false, error: "Invalid renderId" }, { status: 400 });
  }

  const { findRenderOutputPath } = await import("@/src/video-render/server/render-video");
  const output = await findRenderOutputPath(renderId);
  if (!output) return Response.json({ ok: false, error: "Render output was not found." }, { status: 404 });
  const requestedName = searchParams.get("fileName") || `pixores-video.${output.extension}`;
  const safeName = requestedName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/[\r\n]/g, "-");

  const stream = Readable.toWeb(createReadStream(output.outputPath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": getPixoresVideoExportContentType(output.extension),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  });
}
