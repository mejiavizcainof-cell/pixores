import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createDesktopRenderHandlers } from "../desktop/electron/services/render-adapter.mjs";

function getArgument(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const projectFile = path.resolve(getArgument("project"));
const outputDirectory = path.resolve(getArgument("output", path.join(os.tmpdir(), "pixores-project-smoke")));
const appRoot = path.resolve(getArgument("app-root", process.cwd()));
const rangeStart = Number(getArgument("range-start", "0"));
const rangeEndValue = Number(getArgument("range-end", "0"));
const includeAudio = getArgument("include-audio", "true") !== "false";
const payload = JSON.parse(await fs.readFile(projectFile, "utf8"));
const project = payload.project || payload;
const outputWidth = Number(getArgument("width", String(Number(project.canvas?.width) || 1920)));
const outputHeight = Number(getArgument("height", String(Number(project.canvas?.height) || 1080)));
const app = {
  getPath(name) {
    if (name === "userData") return path.join(os.tmpdir(), "pixores-project-smoke-user-data");
    if (name === "temp") return os.tmpdir();
    if (name === "downloads") return outputDirectory;
    return outputDirectory;
  },
};

await fs.mkdir(outputDirectory, { recursive: true });
const handlers = createDesktopRenderHandlers({ app, state: { renderOutputDirectory: outputDirectory }, appRoot });
const fileName = getArgument("file", "project-smoke.mp4");
const started = await handlers.startRender(project, {
  outputFormatId: "mp4-h264",
  exportSettings: {
    fileName,
    outputDirectory,
    width: outputWidth,
    height: outputHeight,
    fps: 30,
    codec: "h264",
    includeAudio,
    audioCodec: "aac",
    audioBitrateKbps: 192,
    audioSampleRate: 48000,
    videoBitrateKbps: 12000,
    qualityPreset: "recommended",
    acceleration: "auto",
    rangeStart: Number.isFinite(rangeStart) ? rangeStart : 0,
    rangeEnd: Number.isFinite(rangeEndValue) && rangeEndValue > rangeStart ? rangeEndValue : project.duration,
  },
});

while (true) {
  const job = await handlers.getRenderStatus(started.renderId);
  process.stdout.write(`\r${job.status} ${Math.round((job.progress || 0) * 100)}%   `);
  if (["completed", "failed", "cancelled"].includes(job.status)) {
    process.stdout.write("\n");
    console.log(JSON.stringify(job, null, 2));
    if (job.status !== "completed") process.exitCode = 1;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
