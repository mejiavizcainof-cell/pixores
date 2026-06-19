export const USER_BRAND_ASSET_BUCKET = "user-brand-assets";

export type UserBrandAsset = {
  id: string;
  user_id: string;
  name: string;
  original_path: string | null;
  preview_path: string | null;
  thumbnail_path: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  created_at: string;
};

export type EditorBrandAsset = {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  isRemote?: boolean;
};
