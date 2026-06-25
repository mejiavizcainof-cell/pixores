import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const defaultSourceDir = path.join(rootDir, "admin-bulk-assets");
const sourceDir = path.resolve(process.argv[2] || process.env.ADMIN_ASSET_SYNC_DIR || defaultSourceDir);

const ADMIN_ASSET_BUCKET = "admin-assets";
const CATEGORIES = ["people", "objects", "shapes", "frames", "backgrounds"];
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(path.join(rootDir, ".env.local"));
loadEnvFile(path.join(rootDir, ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function titleFromFileName(fileName) {
  return path
    .basename(fileName, path.extname(fileName))
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Admin Asset";
}

function cleanFileName(name) {
  const safeName = name
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return safeName || "asset";
}

function mimeTypeForExtension(ext) {
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

async function readSidecar(filePath) {
  const sidecarPath = filePath.replace(path.extname(filePath), ".json");
  if (!existsSync(sidecarPath)) return {};

  try {
    const content = await readFile(sidecarPath, "utf8");
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    throw new Error(`Invalid sidecar JSON for ${path.basename(filePath)}: ${error.message}`);
  }
}

async function listImageFiles(dir) {
  if (!existsSync(dir)) return [];

  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listImageFiles(entryPath));
      continue;
    }

    if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }

  return files;
}

async function ensureAdminBucket() {
  const { data } = await supabase.storage.getBucket(ADMIN_ASSET_BUCKET);
  if (data) return;

  const { error } = await supabase.storage.createBucket(ADMIN_ASSET_BUCKET, { public: true });
  if (error) throw error;
}

async function uploadBuffer(storagePath, buffer, contentType) {
  const { error } = await supabase.storage.from(ADMIN_ASSET_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: false,
  });

  if (error) throw error;
}

function publicUrl(storagePath) {
  return supabase.storage.from(ADMIN_ASSET_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function existingHashesForCategory(category) {
  const { data, error } = await supabase
    .from("admin_assets")
    .select("id,name,metadata")
    .eq("category", category);

  if (error) throw error;

  const hashes = new Map();
  for (const asset of data || []) {
    const hash = asset.metadata?.sourceHash;
    if (typeof hash === "string") hashes.set(hash, asset);
  }
  return hashes;
}

async function syncCategory(category) {
  const categoryDir = path.join(sourceDir, category);
  const files = await listImageFiles(categoryDir);
  const existingHashes = await existingHashesForCategory(category);
  let uploaded = 0;
  let skipped = 0;

  for (const filePath of files) {
    const bytes = await readFile(filePath);
    const sourceHash = createHash("sha256").update(bytes).digest("hex");
    const relativeSourcePath = path.relative(sourceDir, filePath).replace(/\\/g, "/");

    if (existingHashes.has(sourceHash)) {
      skipped += 1;
      console.log(`SKIP ${relativeSourcePath} already exists as ${existingHashes.get(sourceHash).name}`);
      continue;
    }

    const sidecar = await readSidecar(filePath);
    const name = String(sidecar.name || titleFromFileName(filePath)).trim();
    const tags = parseTags(sidecar.tags);
    const metadata = {
      ...(sidecar.metadata && typeof sidecar.metadata === "object" && !Array.isArray(sidecar.metadata) ? sidecar.metadata : {}),
      sourceHash,
      sourcePath: relativeSourcePath,
      bulkSyncedAt: new Date().toISOString(),
    };
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypeForExtension(ext);
    const image = sharp(bytes, { animated: false }).rotate();
    const imageMetadata = await image.metadata();
    const basePath = `${category}/bulk-${Date.now()}-${sourceHash.slice(0, 12)}-${cleanFileName(name)}`;
    const originalPath = `${basePath}/original${ext || ".bin"}`;
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

    const { error } = await supabase.from("admin_assets").insert({
      category,
      name,
      alt_text: String(sidecar.alt_text || `${name} Pixores ${category} asset`),
      tags,
      original_url: publicUrl(originalPath),
      preview_url: publicUrl(previewPath),
      thumbnail_url: publicUrl(thumbnailPath),
      mime_type: mimeType,
      width: imageMetadata.width || null,
      height: imageMetadata.height || null,
      size_bytes: bytes.length,
      metadata,
      is_published: sidecar.is_published === undefined ? true : Boolean(sidecar.is_published),
      sort_order: Number.isFinite(Number(sidecar.sort_order)) ? Number(sidecar.sort_order) : 0,
    });

    if (error) throw error;

    uploaded += 1;
    existingHashes.set(sourceHash, { name });
    console.log(`UPLOAD ${relativeSourcePath} -> ${category}/${name}`);
  }

  return { category, uploaded, skipped, found: files.length };
}

async function main() {
  console.log(`Syncing admin assets from: ${sourceDir}`);
  await ensureAdminBucket();

  const results = [];
  for (const category of CATEGORIES) {
    results.push(await syncCategory(category));
  }

  console.log("\nAdmin asset sync complete:");
  for (const result of results) {
    console.log(`${result.category}: ${result.uploaded} uploaded, ${result.skipped} skipped, ${result.found} found`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
