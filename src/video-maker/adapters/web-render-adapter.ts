import type { PixoresVideoProject } from "@/src/video-render/types";
import type { PixoresRenderJobState, StartRenderOptions, StartRenderResult, VideoRenderAdapter } from "./types";

/**
 * Web render adapter.
 *
 * Uses the existing Next.js render API and keeps the browser editor decoupled
 * from the server implementation.
 */

type RenderPostResponse = {
  ok?: boolean;
  renderId?: string;
  status?: PixoresRenderJobState["status"];
  progress?: number;
  message?: string;
  error?: string;
};

type RenderStatusResponse = {
  status?: PixoresRenderJobState["status"];
  progress?: number;
  outputUrl?: string;
  error?: string;
  warnings?: string[];
};

export const webRenderAdapter: VideoRenderAdapter = {
  kind: "web",
  async startRender(project: PixoresVideoProject, options: StartRenderOptions = {}): Promise<StartRenderResult> {
    const response = await fetch("/api/render-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project,
        outputFormatId: options.outputFormatId,
      }),
    });
    const payload = await response.json().catch(() => null) as RenderPostResponse | null;

    if (!response.ok || !payload?.ok || !payload.renderId) {
      throw new Error(payload?.error || `Render server failed with ${response.status}`);
    }

    return {
      renderId: payload.renderId,
      status: payload.status || "queued",
      progress: payload.progress || 0,
      message: payload.message,
    };
  },

  async getRenderStatus(renderId: string): Promise<PixoresRenderJobState> {
    const response = await fetch(`/api/render-video/${encodeURIComponent(renderId)}`);
    const payload = await response.json().catch(() => null) as RenderStatusResponse | null;

    if (!response.ok || !payload?.status) {
      throw new Error(payload?.error || `Render status failed with ${response.status}`);
    }

    return {
      renderId,
      status: payload.status,
      progress: payload.progress || 0,
      outputUrl: payload.outputUrl,
      error: payload.error,
      warnings: payload.warnings || [],
    };
  },
};
