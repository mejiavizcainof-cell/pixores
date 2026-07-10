import { getPixoresDesktopBridge } from "./runtime";
import type { AssetImportContext, AssetImportResult, VideoAssetAdapter } from "./types";

/**
 * Desktop asset adapter.
 *
 * The browser File remains available for immediate preview. The desktop bridge
 * will later copy the original file into the local project package.
 */

export const desktopAssetAdapter: VideoAssetAdapter = {
  kind: "desktop",
  async importAsset(file: File, context: AssetImportContext = {}): Promise<AssetImportResult> {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.copyAssetToProject) {
      throw new Error("Desktop asset copy bridge is not available.");
    }

    return bridge.copyAssetToProject({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      kind: context.kind,
      title: context.projectTitle,
      bytes: await file.arrayBuffer(),
    });
  },
};
