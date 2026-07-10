import type { PixoresVideoFormat, PixoresVideoProject } from "@/src/video-render/types";

/**
 * Session handoff used by the desktop start screen.
 *
 * The start route stays separate from the editor route, so it passes the
 * chosen format or opened project through sessionStorage before navigating to
 * /video-maker. The web route remains usable without this handoff.
 */

export const PIXORES_VIDEO_START_FORMAT_KEY = "pixores-video-maker-start-format";
export const PIXORES_VIDEO_START_PROJECT_KEY = "pixores-video-maker-start-project";

export type PixoresVideoStartFormatPayload = {
  format: PixoresVideoFormat;
  title?: string;
};

export type PixoresVideoStartProjectPayload = {
  project: PixoresVideoProject;
  title?: string;
  filePath?: string;
};

