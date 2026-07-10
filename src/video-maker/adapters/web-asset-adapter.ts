import type { AssetImportResult, VideoAssetAdapter } from "./types";
import type { PixoresMediaMetadata } from "@/src/video-render/types";

/**
 * Web asset adapter.
 *
 * Uses the current local upload endpoint. Later this can switch to Supabase
 * Storage or R2 without changing the editor component.
 */

type UploadResponse = {
  ok?: boolean;
  assetUrl?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  metadata?: PixoresMediaMetadata;
  error?: string;
};

export const webAssetAdapter: VideoAssetAdapter = {
  kind: "web",
  async importAsset(file: File): Promise<AssetImportResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/video-maker/upload-asset", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null) as UploadResponse | null;

    if (!response.ok || !payload?.ok || !payload.assetUrl || !payload.filename) {
      throw new Error(payload?.error || `Asset upload failed with ${response.status}`);
    }

    return {
      ok: true,
      assetUrl: payload.assetUrl,
      filename: payload.filename,
      mimeType: payload.mimeType || file.type || "application/octet-stream",
      size: payload.size || file.size,
      metadata: payload.metadata,
    };
  },
};
