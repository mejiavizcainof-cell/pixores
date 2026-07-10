import type { PixoresVideoProject } from "@/src/video-render/types";
import { getPixoresDesktopBridge } from "./runtime";
import type { PixoresRenderJobState, StartRenderOptions, StartRenderResult, VideoRenderAdapter } from "./types";

/**
 * Desktop render adapter.
 *
 * Starts a local Electron render job. No web render endpoint is used in
 * desktop mode.
 */

export const desktopRenderAdapter: VideoRenderAdapter = {
  kind: "desktop",
  async startRender(project: PixoresVideoProject, options: StartRenderOptions = {}): Promise<StartRenderResult> {
    const bridge = getPixoresDesktopBridge();
    const renderVideoLocal = bridge?.renderVideoLocal || bridge?.startRender;

    if (!renderVideoLocal) {
      throw new Error("Desktop local render bridge is not available.");
    }

    return renderVideoLocal(project, options);
  },

  async getRenderStatus(renderId: string): Promise<PixoresRenderJobState> {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.getRenderStatus) {
      throw new Error("Desktop render status bridge is not available.");
    }

    return bridge.getRenderStatus(renderId);
  },
};
