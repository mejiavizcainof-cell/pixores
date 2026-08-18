import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { createDesktopRenderHandlers } from "../desktop/electron/services/render-adapter.mjs";

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
const ffprobePath = path.join(require("@remotion/compositor-win32-x64-msvc").dir, "ffprobe.exe");
const projectRoot = path.resolve(import.meta.dirname, "..");
const workDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "pixores-audio-render-"));
const duration = 0.6;

try {
  const project = {
    schemaVersion: 1,
    canvas: { width: 1280, height: 720 },
    duration,
    background: "#111827",
    layers: [{
      id: "audio-regression",
      trackId: "audio-track",
      trackOrder: 0,
      type: "audio",
      mediaKind: "audio",
      name: "Audio regression",
      src: "/video-maker-assets/sound-effects/alexzavesa-swoosh-1-463584.mp3",
      start: 0,
      duration,
      sourceStart: 0,
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 8,
      volume: 1,
      muted: false,
    }],
    assets: [],
    transitions: [],
    format: { id: "16_9", label: "16:9", width: 1280, height: 720 },
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
  const handlers = createDesktopRenderHandlers({ app, state: { renderOutputDirectory: workDirectory }, appRoot: projectRoot });
  const started = await handlers.startRender(project, {
    outputFormatId: "mp4-h264",
    exportSettings: {
      fileName: "audio-regression.mp4",
      outputDirectory: workDirectory,
      width: 640,
      height: 360,
      fps: 15,
      codec: "h264",
      includeAudio: true,
      audioCodec: "aac",
      audioBitrateKbps: 192,
      audioSampleRate: 48000,
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
      if (job.status !== "completed") throw new Error(job.error || `Audio render ended with ${job.status}.`);
      const { stdout } = await execFileAsync(ffprobePath, [
        "-v", "error",
        "-select_streams", "a:0",
        "-show_entries", "stream=codec_name,sample_rate,channels",
        "-of", "json",
        job.outputPath,
      ]);
      const audioStream = JSON.parse(stdout)?.streams?.[0];
      if (audioStream?.codec_name !== "aac") throw new Error(`Expected AAC output, received ${audioStream?.codec_name || "no audio stream"}.`);
      console.log(`Desktop audio render completed with ${audioStream.codec_name}, ${audioStream.sample_rate} Hz, ${audioStream.channels} channels.`);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
} finally {
  await fs.rm(workDirectory, { recursive: true, force: true });
}
