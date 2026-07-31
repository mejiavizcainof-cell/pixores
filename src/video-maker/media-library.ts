export type PixoresBuiltInMediaAsset = {
  id: string;
  title: string;
  kind: "video" | "audio";
  category: "Video Backgrounds" | "Sound Effects";
  path: string;
  mimeType: "video/mp4" | "audio/mpeg";
  size: number;
};

export type PixoresMediaLibraryManifest = {
  schemaVersion: 1;
  videoBackgrounds: PixoresBuiltInMediaAsset[];
  soundEffects: PixoresBuiltInMediaAsset[];
};

export const EMPTY_MEDIA_LIBRARY: PixoresMediaLibraryManifest = {
  schemaVersion: 1,
  videoBackgrounds: [],
  soundEffects: [],
};

export const VIDEO_MAKER_MEDIA_LIBRARY_BASE_URL = (
  process.env.NEXT_PUBLIC_VIDEO_MAKER_MEDIA_LIBRARY_URL || "/video-maker-assets"
).replace(/\/$/, "");

export function resolveBuiltInMediaUrl(assetPath: string) {
  const encodedPath = assetPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${VIDEO_MAKER_MEDIA_LIBRARY_BASE_URL}/${encodedPath}`;
}

export async function loadBuiltInMediaLibrary(signal?: AbortSignal) {
  const response = await fetch(`${VIDEO_MAKER_MEDIA_LIBRARY_BASE_URL}/library.json`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Media library request failed with ${response.status}`);
  const manifest = await response.json() as PixoresMediaLibraryManifest;
  if (manifest.schemaVersion !== 1) throw new Error("Unsupported media library manifest");
  return manifest;
}
