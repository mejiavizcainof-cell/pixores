import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { STUDIO_ASSET_BUCKET, type StudioAsset, type StudioAssetKind } from "@/lib/studioAssets";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const ALLOWED_KINDS = new Set<StudioAssetKind>(["background", "image", "frame-image"]);
const MAX_FILE_SIZE = 18 * 1024 * 1024;

async function getAuthorizedUser(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}

function cleanFileName(name: string) {
  const safeName = name
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return safeName || "studio-asset";
}

function publicUrl(path: string | null) {
  if (!path) return null;
  const supabaseAdmin = getSupabaseAdmin();
  return supabaseAdmin.storage.from(STUDIO_ASSET_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function uploadBuffer(path: string, buffer: Buffer, contentType: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.storage.from(STUDIO_ASSET_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });

  if (error) throw error;
}

function serializeAsset(asset: StudioAsset) {
  return {
    id: asset.id,
    kind: asset.kind,
    name: asset.name,
    url: asset.original_url || asset.preview_url || "",
    previewUrl: asset.preview_url || asset.original_url || "",
    thumbnailUrl: asset.thumbnail_url || undefined,
    width: asset.width,
    height: asset.height,
    sizeBytes: asset.size_bytes,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getAuthorizedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const name = String(formData.get("name") || "").trim();
    const projectId = String(formData.get("project_id") || "").trim() || null;
    const requestedKind = String(formData.get("kind") || "image") as StudioAssetKind;
    const kind = ALLOWED_KINDS.has(requestedKind) ? requestedKind : "image";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image file is too large. Please upload an image under 18 MB." }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const image = sharp(bytes, { animated: false }).rotate();
    const metadata = await image.metadata();
    const width = metadata.width || null;
    const height = metadata.height || null;
    const safeName = cleanFileName(name || file.name);
    const basePath = `${user.id}/${Date.now()}-${safeName}`;
    const originalPath = `${basePath}/original.webp`;
    const previewPath = `${basePath}/preview.webp`;
    const thumbnailPath = `${basePath}/thumbnail.webp`;

    const original = await sharp(bytes, { animated: false })
      .rotate()
      .resize({ width: 3000, height: 3000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 92, effort: 4 })
      .toBuffer();

    const preview = await sharp(bytes, { animated: false })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, effort: 4 })
      .toBuffer();

    const thumbnail = await sharp(bytes, { animated: false })
      .rotate()
      .resize({ width: 420, height: 420, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer();

    await uploadBuffer(originalPath, original, "image/webp");
    await uploadBuffer(previewPath, preview, "image/webp");
    await uploadBuffer(thumbnailPath, thumbnail, "image/webp");

    const originalUrl = publicUrl(originalPath);
    const previewUrl = publicUrl(previewPath);
    const thumbnailUrl = publicUrl(thumbnailPath);

    const { data, error } = await supabaseAdmin
      .from("studio_assets")
      .insert({
        user_id: user.id,
        project_id: projectId,
        kind,
        name: name || file.name,
        original_path: originalPath,
        preview_path: previewPath,
        thumbnail_path: thumbnailPath,
        original_url: originalUrl,
        preview_url: previewUrl,
        thumbnail_url: thumbnailUrl,
        mime_type: "image/webp",
        width,
        height,
        size_bytes: file.size,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ asset: serializeAsset(data as StudioAsset) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save Studio asset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
