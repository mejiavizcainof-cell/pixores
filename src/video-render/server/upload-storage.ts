import os from "node:os";
import path from "node:path";

export function getPixoresRuntimeDataDirectory() {
  const configuredDirectory = process.env.PIXORES_RUNTIME_DATA_DIR?.trim();
  if (configuredDirectory) return path.resolve(configuredDirectory);
  if (process.env.VERCEL) return path.join(os.tmpdir(), "pixores-runtime-data");
  return path.join(process.cwd(), ".runtime-data");
}

export function getVideoMakerUploadDirectory() {
  return path.join(getPixoresRuntimeDataDirectory(), "uploads", "video-maker");
}
