import { desktopAssetAdapter } from "./desktop-asset-adapter";
import { desktopProjectPackageAdapter } from "./desktop-project-package-adapter";
import { desktopRenderAdapter } from "./desktop-render-adapter";
import { isPixoresDesktop } from "./runtime";
import type { VideoAssetAdapter, VideoProjectPackageAdapter, VideoRenderAdapter } from "./types";
import { webAssetAdapter } from "./web-asset-adapter";
import { webProjectPackageAdapter } from "./web-project-package-adapter";
import { webRenderAdapter } from "./web-render-adapter";

export type VideoMakerAdapters = {
  renderAdapter: VideoRenderAdapter;
  assetAdapter: VideoAssetAdapter;
  projectPackageAdapter: VideoProjectPackageAdapter;
  isDesktop: boolean;
};

export function getVideoMakerAdapters(): VideoMakerAdapters {
  if (isPixoresDesktop()) {
    return {
      renderAdapter: desktopRenderAdapter,
      assetAdapter: desktopAssetAdapter,
      projectPackageAdapter: desktopProjectPackageAdapter,
      isDesktop: true,
    };
  }

  return {
    renderAdapter: webRenderAdapter,
    assetAdapter: webAssetAdapter,
    projectPackageAdapter: webProjectPackageAdapter,
    isDesktop: false,
  };
}

export { isPixoresDesktop };
