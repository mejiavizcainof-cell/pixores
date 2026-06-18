export type AdminAssetCategory =
  | "people"
  | "objects"
  | "shapes"
  | "frames"
  | "backgrounds"
  | "blog"
  | "templates";

export type AdminAsset = {
  id: string;
  category: AdminAssetCategory;
  name: string;
  alt_text: string | null;
  tags: string[] | null;
  original_url: string | null;
  preview_url: string | null;
  thumbnail_url: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  metadata: Record<string, unknown> | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
};

export const ADMIN_ASSET_CATEGORIES: AdminAssetCategory[] = [
  "people",
  "objects",
  "shapes",
  "frames",
  "backgrounds",
  "blog",
  "templates",
];

export const ADMIN_ASSET_BUCKET = "admin-assets";

export function parseTags(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function parseMetadata(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    throw new Error("Metadata must be valid JSON.");
  }
}
