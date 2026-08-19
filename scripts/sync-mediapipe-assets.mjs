import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageWasmDirectory = path.join(repositoryRoot, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const publicWasmDirectory = path.join(repositoryRoot, "public", "video-maker-assets", "mediapipe", "wasm");
const faceModelPath = path.join(repositoryRoot, "public", "video-maker-assets", "models", "face_landmarker.task");

await fs.access(packageWasmDirectory);
await fs.access(faceModelPath);
await fs.mkdir(path.dirname(publicWasmDirectory), { recursive: true });
await fs.rm(publicWasmDirectory, { recursive: true, force: true });
await fs.cp(packageWasmDirectory, publicWasmDirectory, { recursive: true });

const copiedFiles = await fs.readdir(publicWasmDirectory);
if (!copiedFiles.some((fileName) => fileName.endsWith(".wasm"))) {
  throw new Error("MediaPipe vision assets were not copied correctly.");
}

console.log(`MediaPipe vision assets ready (${copiedFiles.length} files).`);
