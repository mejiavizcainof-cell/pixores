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
  async prepareAsset(input) {
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.prepareAsset) return {};
    return bridge.prepareAsset(input);
  },
  async importAsset(file: File, context: AssetImportContext = {}): Promise<AssetImportResult> {
    const bridge = getPixoresDesktopBridge();
    if (bridge?.copyAssetFileToProject) {
      try {
        return await bridge.copyAssetFileToProject(file, {
          kind: context.kind,
          title: context.projectTitle,
        });
      } catch (error) {
        if (file.size > 256 * 1024 * 1024 || !bridge.copyAssetToProject) {
          throw error;
        }
        // Small generated Files may not expose a disk path. They remain safe
        // to transfer as bytes; large media must always use the native path.
      }
    }
    if (!bridge?.copyAssetToProject) {
      throw new Error("Desktop asset copy bridge is not available.");
    }

    // Compatibility fallback for older desktop shells. Current builds pass the
    // native file path through preload so multi-gigabyte media never enters IPC.
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
