export const STUDIO_ASSET_BUCKET = "studio-assets";

export type StudioAssetKind = "background" | "image" | "frame-image";

export type StudioAsset = {
  id: string;
  user_id: string;
  project_id: string | null;
  kind: StudioAssetKind;
  name: string;
  original_path: string | null;
  preview_path: string | null;
  thumbnail_path: string | null;
  original_url: string | null;
  preview_url: string | null;
  thumbnail_url: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  created_at: string;
};
