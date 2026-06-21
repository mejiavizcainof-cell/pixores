import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import {
  ADMIN_ASSET_BUCKET,
  ADMIN_ASSET_CATEGORIES,
  parseMetadata,
  parseTags,
  type AdminAssetCategory,
} from "@/lib/adminAssets";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

async function getAuthorizedAdmin(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) return null;

  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  return roleData?.role === "admin" ? userData.user : null;
}

function cleanFileName(name: string) {
  const safeName = name
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return safeName || "asset";
}

function publicUrl(path: string) {
  const supabaseAdmin = getSupabaseAdmin();
  return supabaseAdmin.storage.from(ADMIN_ASSET_BUCKET).getPublicUrl(path).data.publicUrl;
}

function storagePathFromPublicUrl(url: string | null) {
  if (!url) return null;

  const marker = `/storage/v1/object/public/${ADMIN_ASSET_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  return decodeURIComponent(url.slice(markerIndex + marker.length));
}

async function uploadBuffer(path: string, buffer: Buffer, contentType: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.storage.from(ADMIN_ASSET_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });

  if (error) throw error;
}

export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const category = request.nextUrl.searchParams.get("category");
  const includeDrafts = request.nextUrl.searchParams.get("includeDrafts") === "true";
  const admin = includeDrafts ? await getAuthorizedAdmin(request) : null;

  let query = supabaseAdmin
    .from("admin_assets")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (category && ADMIN_ASSET_CATEGORIES.includes(category as AdminAssetCategory)) {
    query = query.eq("category", category);
  }

  if (!includeDrafts || !admin) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assets: data || [] });
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const admin = await getAuthorizedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const formData = await request.formData();
    const category = String(formData.get("category") || "");
    const name = String(formData.get("name") || "").trim();
    const altText = String(formData.get("alt_text") || "").trim();
    const isPublished = String(formData.get("is_published") || "true") === "true";
    const sortOrder = Number(formData.get("sort_order") || 0);
    const file = formData.get("file");
    const tags = parseTags(formData.get("tags"));
    const metadata = parseMetadata(formData.get("metadata"));

    if (!ADMIN_ASSET_CATEGORIES.includes(category as AdminAssetCategory)) {
      return NextResponse.json({ error: "Invalid asset category." }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Asset name is required." }, { status: 400 });
    }

    let originalUrl: string | null = null;
    let previewUrl: string | null = null;
    let thumbnailUrl: string | null = null;
    let mimeType: string | null = null;
    let width: number | null = null;
    let height: number | null = null;
    let sizeBytes: number | null = null;

    if (file instanceof File && file.size > 0) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const image = sharp(bytes, { animated: false }).rotate();
      const imageMetadata = await image.metadata();
      width = imageMetadata.width || null;
      height = imageMetadata.height || null;
      sizeBytes = file.size;
      mimeType = file.type || "application/octet-stream";

      const basePath = `${category}/${Date.now()}-${cleanFileName(name)}`;
      const originalExt = file.name.split(".").pop()?.toLowerCase() || "bin";
      const originalPath = `${basePath}/original.${originalExt}`;
      const previewPath = `${basePath}/preview.webp`;
      const thumbnailPath = `${basePath}/thumbnail.webp`;

      await uploadBuffer(originalPath, bytes, mimeType);

      const preview = await sharp(bytes, { animated: false })
        .rotate()
        .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84, effort: 4 })
        .toBuffer();

      const thumbnail = await sharp(bytes, { animated: false })
        .rotate()
        .resize({ width: 420, height: 420, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78, effort: 4 })
        .toBuffer();

      await uploadBuffer(previewPath, preview, "image/webp");
      await uploadBuffer(thumbnailPath, thumbnail, "image/webp");

      originalUrl = publicUrl(originalPath);
      previewUrl = publicUrl(previewPath);
      thumbnailUrl = publicUrl(thumbnailPath);
    } else if (!metadata.shapeType && !metadata.assetType) {
      return NextResponse.json(
        { error: "Upload an image or provide metadata JSON for shape/frame assets." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("admin_assets")
      .insert({
        category,
        name,
        alt_text: altText || null,
        tags,
        original_url: originalUrl,
        preview_url: previewUrl,
        thumbnail_url: thumbnailUrl,
        mime_type: mimeType,
        width,
        height,
        size_bytes: sizeBytes,
        metadata,
        is_published: isPublished,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        created_by: admin.id,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ asset: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save asset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const admin = await getAuthorizedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const assetId = request.nextUrl.searchParams.get("id");
    if (!assetId) {
      return NextResponse.json({ error: "Asset id is required." }, { status: 400 });
    }

    const { data: existingAsset, error: findError } = await supabaseAdmin
      .from("admin_assets")
      .select("*")
      .eq("id", assetId)
      .single();

    if (findError || !existingAsset) {
      return NextResponse.json({ error: findError?.message || "Asset not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const category = String(formData.get("category") || existingAsset.category);
    const name = String(formData.get("name") || existingAsset.name).trim();
    const altText = String(formData.get("alt_text") ?? existingAsset.alt_text ?? "").trim();
    const isPublished = formData.has("is_published")
      ? String(formData.get("is_published")) === "true"
      : existingAsset.is_published;
    const sortOrderValue = formData.has("sort_order")
      ? Number(formData.get("sort_order"))
      : existingAsset.sort_order;
    const tags = formData.has("tags") ? parseTags(formData.get("tags")) : existingAsset.tags;
    const metadata = formData.has("metadata") ? parseMetadata(formData.get("metadata")) : existingAsset.metadata;
    const file = formData.get("file");

    if (!ADMIN_ASSET_CATEGORIES.includes(category as AdminAssetCategory)) {
      return NextResponse.json({ error: "Invalid asset category." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Asset name is required." }, { status: 400 });
    }

    let originalUrl = existingAsset.original_url;
    let previewUrl = existingAsset.preview_url;
    let thumbnailUrl = existingAsset.thumbnail_url;
    let mimeType = existingAsset.mime_type;
    let width = existingAsset.width;
    let height = existingAsset.height;
    let sizeBytes = existingAsset.size_bytes;
    const newStoragePaths: string[] = [];

    if (file instanceof File && file.size > 0) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const image = sharp(bytes, { animated: false }).rotate();
      const imageMetadata = await image.metadata();
      width = imageMetadata.width || null;
      height = imageMetadata.height || null;
      sizeBytes = file.size;
      mimeType = file.type || "application/octet-stream";

      const basePath = `${category}/${Date.now()}-${cleanFileName(name)}`;
      const originalExt = file.name.split(".").pop()?.toLowerCase() || "bin";
      const originalPath = `${basePath}/original.${originalExt}`;
      const previewPath = `${basePath}/preview.webp`;
      const thumbnailPath = `${basePath}/thumbnail.webp`;
      newStoragePaths.push(originalPath, previewPath, thumbnailPath);

      await uploadBuffer(originalPath, bytes, mimeType);
      await uploadBuffer(
        previewPath,
        await sharp(bytes, { animated: false })
          .rotate()
          .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 84, effort: 4 })
          .toBuffer(),
        "image/webp",
      );
      await uploadBuffer(
        thumbnailPath,
        await sharp(bytes, { animated: false })
          .rotate()
          .resize({ width: 420, height: 420, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 78, effort: 4 })
          .toBuffer(),
        "image/webp",
      );

      originalUrl = publicUrl(originalPath);
      previewUrl = publicUrl(previewPath);
      thumbnailUrl = publicUrl(thumbnailPath);
    }

    const { data, error } = await supabaseAdmin
      .from("admin_assets")
      .update({
        category,
        name,
        alt_text: altText || null,
        tags,
        original_url: originalUrl,
        preview_url: previewUrl,
        thumbnail_url: thumbnailUrl,
        mime_type: mimeType,
        width,
        height,
        size_bytes: sizeBytes,
        metadata,
        is_published: isPublished,
        sort_order: Number.isFinite(sortOrderValue) ? sortOrderValue : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId)
      .select("*")
      .single();

    if (error) {
      if (newStoragePaths.length > 0) {
        await supabaseAdmin.storage.from(ADMIN_ASSET_BUCKET).remove(newStoragePaths);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (newStoragePaths.length > 0) {
      const oldStoragePaths = [
        storagePathFromPublicUrl(existingAsset.original_url),
        storagePathFromPublicUrl(existingAsset.preview_url),
        storagePathFromPublicUrl(existingAsset.thumbnail_url),
      ].filter((path): path is string => Boolean(path));

      if (oldStoragePaths.length > 0) {
        await supabaseAdmin.storage.from(ADMIN_ASSET_BUCKET).remove(oldStoragePaths);
      }
    }

    return NextResponse.json({ asset: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update asset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const admin = await getAuthorizedAdmin(request);

    if (!admin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const assetId = request.nextUrl.searchParams.get("id");

    if (!assetId) {
      return NextResponse.json({ error: "Asset id is required." }, { status: 400 });
    }

    const { data: asset, error: findError } = await supabaseAdmin
      .from("admin_assets")
      .select("id,original_url,preview_url,thumbnail_url")
      .eq("id", assetId)
      .single();

    if (findError || !asset) {
      return NextResponse.json({ error: findError?.message || "Asset not found." }, { status: 404 });
    }

    const storagePaths = [
      storagePathFromPublicUrl(asset.original_url),
      storagePathFromPublicUrl(asset.preview_url),
      storagePathFromPublicUrl(asset.thumbnail_url),
    ].filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      await supabaseAdmin.storage.from(ADMIN_ASSET_BUCKET).remove(storagePaths);
    }

    const { error: deleteError } = await supabaseAdmin
      .from("admin_assets")
      .delete()
      .eq("id", assetId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete asset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
