import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { USER_BRAND_ASSET_BUCKET, type UserBrandAsset } from "@/lib/brandAssets";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

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

  return safeName || "brand-asset";
}

async function uploadBuffer(path: string, buffer: Buffer, contentType: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.storage.from(USER_BRAND_ASSET_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });

  if (error) throw error;
}

async function signedUrl(path: string | null) {
  if (!path) return null;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.storage
    .from(USER_BRAND_ASSET_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24);

  if (error) return null;
  return data.signedUrl;
}

async function serializeAsset(asset: UserBrandAsset) {
  return {
    id: asset.id,
    name: asset.name,
    url: (await signedUrl(asset.preview_path)) || (await signedUrl(asset.original_path)) || "",
    thumbnailUrl: (await signedUrl(asset.thumbnail_path)) || undefined,
    isRemote: true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getAuthorizedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("user_brand_assets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const assets = await Promise.all(((data || []) as UserBrandAsset[]).map(serializeAsset));
    return NextResponse.json({ assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load My Brand assets.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
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
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 92, effort: 4 })
      .toBuffer();

    const preview = await sharp(bytes, { animated: false })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84, effort: 4 })
      .toBuffer();

    const thumbnail = await sharp(bytes, { animated: false })
      .rotate()
      .resize({ width: 360, height: 360, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 76, effort: 4 })
      .toBuffer();

    await uploadBuffer(originalPath, original, "image/webp");
    await uploadBuffer(previewPath, preview, "image/webp");
    await uploadBuffer(thumbnailPath, thumbnail, "image/webp");

    const { data, error } = await supabaseAdmin
      .from("user_brand_assets")
      .insert({
        user_id: user.id,
        name: name || file.name,
        original_path: originalPath,
        preview_path: previewPath,
        thumbnail_path: thumbnailPath,
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

    return NextResponse.json({ asset: await serializeAsset(data as UserBrandAsset) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save My Brand asset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await getAuthorizedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const assetId = request.nextUrl.searchParams.get("id");
    if (!assetId) {
      return NextResponse.json({ error: "Asset id is required." }, { status: 400 });
    }

    const { data: asset, error: findError } = await supabaseAdmin
      .from("user_brand_assets")
      .select("id,user_id,original_path,preview_path,thumbnail_path")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .single();

    if (findError || !asset) {
      return NextResponse.json({ error: findError?.message || "Asset not found." }, { status: 404 });
    }

    const paths = [asset.original_path, asset.preview_path, asset.thumbnail_path].filter(
      (path): path is string => Boolean(path)
    );

    if (paths.length > 0) {
      await supabaseAdmin.storage.from(USER_BRAND_ASSET_BUCKET).remove(paths);
    }

    const { error: deleteError } = await supabaseAdmin
      .from("user_brand_assets")
      .delete()
      .eq("id", assetId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete My Brand asset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
