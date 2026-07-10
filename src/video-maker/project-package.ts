import type { PixoresVideoProject } from "@/src/video-render/types";

/**
 * Pixores Video desktop package contract.
 *
 * A `.pixores-video` file is planned as a zipped project folder containing
 * this manifest, project.json, and a local assets directory.
 */

export const PIXORES_VIDEO_PACKAGE_VERSION = 1;
export const PIXORES_VIDEO_PACKAGE_EXTENSION = ".pixores-video";

export type PixoresVideoPackageManifest = {
  format: "pixores-video-package";
  version: typeof PIXORES_VIDEO_PACKAGE_VERSION;
  projectFile: "project.json";
  assetsDir: "assets";
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type PixoresVideoPackageContents = {
  manifest: PixoresVideoPackageManifest;
  project: PixoresVideoProject;
};

export function createPixoresVideoPackageManifest(title: string): PixoresVideoPackageManifest {
  const now = new Date().toISOString();

  return {
    format: "pixores-video-package",
    version: PIXORES_VIDEO_PACKAGE_VERSION,
    projectFile: "project.json",
    assetsDir: "assets",
    title: title.trim() || "Untitled video",
    createdAt: now,
    updatedAt: now,
  };
}
