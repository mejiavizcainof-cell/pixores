import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import sharp from "sharp";
import { createDesktopRenderHandlers } from "../desktop/electron/services/render-adapter.mjs";

const require = createRequire(import.meta.url);
const ffmpegPath = require("ffmpeg-static");
const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(import.meta.dirname, "..");
const socialRoot = path.join(projectRoot, "public", "template-assets", "social");
const workDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "pixores-social-svg-render-"));
const width = 640;
const height = 360;
const duration = 0.5;

try {
  const svgFiles = (await fs.readdir(socialRoot))
    .filter((name) => name.toLowerCase().endsWith(".svg"))
    .sort();
  if (!svgFiles.length) throw new Error("No social SVG assets were found.");

  const assetLayers = svgFiles.map((name, index) => ({
    id: `social-svg-${index}`,
    trackId: `social-track-${index}`,
    trackOrder: index,
    type: "media",
    mediaKind: "image",
    name,
    src: `/template-assets/social/${name}`,
    start: 0,
    duration,
    visible: true,
    locked: false,
    opacity: 1,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    angle: 0,
    objectFit: "contain",
    volume: 0,
  }));
  const project = {
    schemaVersion: 1,
    // Deliberately differs from the output resolution. Percent geometry must
    // still be evaluated against the exported 640x360 composition.
    canvas: { width: 1920, height: 1080 },
    duration,
    background: "#eef2ff",
    layers: [
      ...assetLayers,
      {
        ...assetLayers.find((layer) => layer.name === "youtube.svg"),
        id: "centered-youtube-regression",
        trackId: "centered-youtube-track",
        trackOrder: -1,
        name: "Centered YouTube",
        x: 40,
        y: 30,
        width: 20,
        height: 40,
      },
    ],
    assets: [],
    transitions: [],
    format: { id: "16_9", label: "16:9", width: 1920, height: 1080 },
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };

  const app = {
    getPath(name) {
      if (name === "userData") return path.join(workDirectory, "user-data");
      if (name === "temp") return workDirectory;
      return workDirectory;
    },
  };
  const handlers = createDesktopRenderHandlers({
    app,
    state: { renderOutputDirectory: workDirectory },
    appRoot: projectRoot,
  });
  const started = await handlers.startRender(project, {
    outputFormatId: "mp4-h264",
    exportSettings: {
      fileName: "social-svg-smoke.mp4",
      outputDirectory: workDirectory,
      width,
      height,
      fps: 15,
      codec: "h264",
      includeAudio: false,
      videoBitrateKbps: 1800,
      qualityPreset: "recommended",
      acceleration: "auto",
      rangeStart: 0,
      rangeEnd: duration,
    },
  });

  while (true) {
    const job = await handlers.getRenderStatus(started.renderId);
    if (["completed", "failed", "cancelled"].includes(job.status)) {
      if (job.status !== "completed") throw new Error(job.error || `SVG render ended with ${job.status}.`);
      const stat = await fs.stat(job.outputPath);
      if (!stat.isFile() || stat.size === 0) throw new Error("SVG render produced an empty output file.");
      const framePath = path.join(workDirectory, "social-svg-frame.png");
      await execFileAsync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-i", job.outputPath, "-frames:v", "1", "-y", framePath]);
      const { data, info } = await sharp(framePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let redPixels = 0;
      let redXTotal = 0;
      for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
        const offset = pixel * info.channels;
        const red = data[offset];
        const green = data[offset + 1];
        const blue = data[offset + 2];
        if (red > 145 && green < 125 && blue < 125 && red > green * 1.45) {
          redPixels += 1;
          redXTotal += pixel % info.width;
        }
      }
      if (redPixels < 250) throw new Error("The centered SVG was not visible in the rendered frame.");
      const redCenterX = redXTotal / redPixels;
      if (Math.abs(redCenterX - info.width / 2) > info.width * 0.08) {
        throw new Error(`Centered SVG drifted to x=${redCenterX.toFixed(1)} in a ${info.width}px frame.`);
      }
      console.log(`Rendered ${svgFiles.length} social SVG logos; centered export x=${redCenterX.toFixed(1)}/${info.width}.`);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
} finally {
  await fs.rm(workDirectory, { recursive: true, force: true });
}
