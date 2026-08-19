import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { build } from "esbuild";
import sharp from "sharp";
import { createDesktopRenderHandlers } from "../desktop/electron/services/render-adapter.mjs";

const run = promisify(execFile);
const require = createRequire(import.meta.url);
const ffmpegPath = require("ffmpeg-static");
const projectRoot = path.resolve(import.meta.dirname, "..");
const workDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "pixores-frame-render-"));

const geometryBundle = await build({
  entryPoints: ["src/video-maker/frame-geometry.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const geometryModuleUrl = `data:text/javascript;base64,${Buffer.from(geometryBundle.outputFiles[0].text).toString("base64")}`;
const { containFrameBounds, fitFrameBoundsToMedia } = await import(geometryModuleUrl);

const fittedLandscape = fitFrameBoundsToMedia({ x: 0, y: 0, width: 100, height: 100 }, { x: 0.075, y: 0.09, width: 0.85, height: 0.8 });
const fittedPortrait = fitFrameBoundsToMedia({ x: 18, y: 0, width: 64, height: 100 }, { x: 0.075, y: 0.09, width: 0.85, height: 0.8 });
for (const [name, bounds] of [["landscape", fittedLandscape], ["portrait", fittedPortrait]]) {
  if (bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > 100 || bounds.y + bounds.height > 100) {
    throw new Error(`${name} auto-fitted frame escaped the canvas: ${JSON.stringify(bounds)}`);
  }
}

try {
  const width = 640;
  const height = 360;
  const duration = 0.2;
  const imagePath = path.join(workDirectory, "embedded-blue.png");
  await sharp({ create: { width, height, channels: 3, background: "#1d4ed8" } }).png().toFile(imagePath);
  const imageDataUrl = `data:image/png;base64,${(await fs.readFile(imagePath)).toString("base64")}`;
  const legacyOverflow = { x: -8.824, y: -12.5, width: 117.647, height: 125 };
  const expected = containFrameBounds(legacyOverflow);
  const project = {
    schemaVersion: 1,
    canvas: { width, height },
    duration,
    background: "#000000",
    layers: [
      {
        id: "paper-frame", trackId: "frame-track", trackOrder: 0, type: "shape", name: "Paper Wide",
        start: 0, duration, visible: true, locked: false, opacity: 1, ...legacyOverflow,
        color: "#f59e0b", shapeType: "paperFrame", frameMediaLayerIds: ["embedded-image"],
      },
      {
        id: "embedded-image", trackId: "image-track", trackOrder: 1, type: "media", mediaKind: "image", name: "Blue image",
        start: 0, duration, visible: true, locked: false, opacity: 1, x: 0, y: 0, width: 100, height: 100,
        src: imageDataUrl, objectFit: "cover",
      },
    ],
    assets: [], transitions: [], format: { id: "16_9", label: "16:9", width, height },
    createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(),
  };
  const app = { getPath: () => workDirectory };
  const handlers = createDesktopRenderHandlers({ app, state: { renderOutputDirectory: workDirectory }, appRoot: projectRoot });
  const started = await handlers.startRender(project, {
    outputFormatId: "mp4-h264",
    exportSettings: { fileName: "frame-regression.mp4", outputDirectory: workDirectory, width, height, fps: 15, codec: "h264", includeAudio: false, videoBitrateKbps: 1800, qualityPreset: "recommended", acceleration: "auto", rangeStart: 0, rangeEnd: duration },
  });
  let outputPath = "";
  while (!outputPath) {
    const job = await handlers.getRenderStatus(started.renderId);
    if (job.status === "completed") outputPath = job.outputPath;
    else if (job.status === "failed" || job.status === "cancelled") throw new Error(job.error || job.status);
    else await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const framePath = path.join(workDirectory, "frame-regression.png");
  await run(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-i", outputPath, "-frames:v", "1", "-y", framePath]);
  const { data, info } = await sharp(framePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let orangeLeft = 0;
  let orangeRight = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const [red, green, blue] = [data[offset], data[offset + 1], data[offset + 2]];
      if (red > 170 && green > 75 && green < 190 && blue < 65) {
        if (x < info.width * 0.13) orangeLeft += 1;
        if (x > info.width * 0.87) orangeRight += 1;
      }
    }
  }
  if (orangeLeft < 150 || orangeRight < 150) {
    throw new Error(`Paper frame side margins disappeared after render (left=${orangeLeft}, right=${orangeRight}).`);
  }
  console.log(JSON.stringify({ passed: true, expectedBounds: expected, orangeLeft, orangeRight, outputPath }, null, 2));
} finally {
  await fs.rm(workDirectory, { recursive: true, force: true });
}
