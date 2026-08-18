import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { getVideoMetadata } from "@remotion/renderer";
import sharp from "sharp";
import { createDesktopRenderHandlers } from "../desktop/electron/services/render-adapter.mjs";

const execFileAsync = promisify(execFile);
const terminalStatuses = new Set(["completed", "cancelled", "failed"]);
const requiredFiles = ["intro.mp4", "video1.mp4", "video2.mp4", "outtro.mp4", "logo.PNG"];
const clipDefinitions = [
  { id: "intro", name: "Intro", fileName: "intro.mp4" },
  { id: "video1", name: "Video 1", fileName: "video1.mp4" },
  { id: "video2", name: "Video 2", fileName: "video2.mp4" },
  { id: "outtro", name: "Outtro", fileName: "outtro.mp4" },
];

function getArgument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function sanitizeTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function round(value, decimals = 3) {
  const multiplier = 10 ** decimals;
  return Math.round(Number(value) * multiplier) / multiplier;
}

function average(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function maximum(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? Math.max(...valid) : null;
}

function getCpuSnapshot() {
  return os.cpus().reduce((totals, cpu) => {
    const idle = totals.idle + cpu.times.idle;
    const total = totals.total + Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
    return { idle, total };
  }, { idle: 0, total: 0 });
}

function getCpuUsage(previous, current) {
  const total = current.total - previous.total;
  const idle = current.idle - previous.idle;
  return total > 0 ? Math.max(0, Math.min(100, ((total - idle) / total) * 100)) : 0;
}

async function readGpuSample() {
  try {
    const { stdout } = await execFileAsync("nvidia-smi.exe", [
      "--query-gpu=utilization.gpu,utilization.encoder,utilization.decoder,memory.used,memory.total",
      "--format=csv,noheader,nounits",
    ], { windowsHide: true, timeout: 4_000 });
    const [gpu, encoder, decoder, memoryUsed, memoryTotal] = stdout.trim().split(",").map((value) => Number(value.trim()));
    return { gpu, encoder, decoder, memoryUsed, memoryTotal };
  } catch {
    return null;
  }
}

async function analyzeInputs(testDirectory) {
  await Promise.all(requiredFiles.map((fileName) => fs.access(path.join(testDirectory, fileName))));
  const clips = [];
  let cursor = 0;
  for (const definition of clipDefinitions) {
    const filePath = path.join(testDirectory, definition.fileName);
    const metadata = await getVideoMetadata(filePath);
    clips.push({
      ...definition,
      filePath,
      fileUrl: pathToFileURL(filePath).href,
      start: cursor,
      duration: metadata.durationInSeconds,
      metadata,
    });
    cursor += metadata.durationInSeconds;
  }
  const logoPath = path.join(testDirectory, "logo.PNG");
  const logoMetadata = await sharp(logoPath).metadata();
  return { clips, logoPath, logoMetadata, sequentialDuration: cursor };
}

function createAssets(input) {
  return [
    ...input.clips.map((clip) => ({
      id: clip.id,
      name: clip.name,
      kind: "video",
      url: clip.fileUrl,
      persistentUrl: clip.fileUrl,
      uploadStatus: "ready",
      duration: clip.duration,
      metadata: {
        analyzer: "ffprobe",
        analyzedAt: new Date().toISOString(),
        duration: clip.duration,
        width: clip.metadata.width,
        height: clip.metadata.height,
        fps: clip.metadata.fps,
        codec: clip.metadata.videoCodec,
        audioCodec: clip.metadata.audioCodec,
        hasVideo: true,
        hasAudio: Boolean(clip.metadata.audioCodec),
      },
    })),
    {
      id: "logo",
      name: "Pixores logo",
      kind: "image",
      url: pathToFileURL(input.logoPath).href,
      persistentUrl: pathToFileURL(input.logoPath).href,
      uploadStatus: "ready",
      metadata: {
        analyzer: "sharp",
        analyzedAt: new Date().toISOString(),
        width: input.logoMetadata.width,
        height: input.logoMetadata.height,
        imageFormat: input.logoMetadata.format,
        hasAlpha: Boolean(input.logoMetadata.hasAlpha),
      },
    },
  ];
}

function createVideoLayer(clip, start, patch = {}) {
  return {
    id: `layer-${clip.id}`,
    trackId: "track-video",
    trackName: "Video",
    trackOrder: 0,
    type: "media",
    name: clip.name,
    start: round(start),
    duration: round(clip.duration),
    visible: true,
    locked: false,
    opacity: 1,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    src: clip.fileUrl,
    mediaKind: "video",
    assetKey: clip.id,
    objectFit: "cover",
    volume: 1,
    ...patch,
  };
}

function createBaseProject(input, id, label, layers, duration) {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    canvas: { width: 1920, height: 1080 },
    duration: round(duration),
    background: "#000000",
    layers,
    transitions: layers
      .filter((layer) => layer.type === "transition")
      .map((layer) => ({
        id: layer.id,
        type: layer.transitionKind,
        fromLayerId: layer.fromLayerId,
        toLayerId: layer.toLayerId,
        start: layer.start,
        duration: layer.duration,
        cutTime: layer.cutTime,
        color: layer.color,
        easing: layer.easing,
      })),
    assets: createAssets(input),
    format: { id, label, width: 1920, height: 1080 },
    createdAt: now,
    updatedAt: now,
  };
}

function createVariantA(input) {
  const layers = input.clips.map((clip) => createVideoLayer(clip, clip.start));
  return createBaseProject(input, "phase0-a", "Phase 0 A - Simple cuts", layers, input.sequentialDuration);
}

function createVariantB(input) {
  const transitionDuration = 0.6;
  const overlapCuts = new Set([1, 3]);
  const videoLayers = [];
  const transitions = [];
  let cursor = 0;
  input.clips.forEach((clip, index) => {
    const overlap = index > 0 && overlapCuts.has(index) ? transitionDuration : 0;
    const start = Math.max(0, cursor - overlap);
    const layer = createVideoLayer(clip, start);
    videoLayers.push(layer);
    if (overlap > 0) {
      const previous = videoLayers[index - 1];
      transitions.push({
        id: `transition-${previous.id}-${layer.id}`,
        trackId: "track-transitions",
        trackName: "Transitions",
        trackOrder: 3,
        type: "transition",
        name: index === 1 ? "Fade" : "Slide left",
        start: round(start),
        duration: transitionDuration,
        visible: true,
        locked: false,
        opacity: 1,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fromLayerId: previous.id,
        toLayerId: layer.id,
        cutTime: round(start + transitionDuration / 2),
        transitionKind: index === 1 ? "fade" : "slideLeft",
        color: "#000000",
        easing: "easeInOut",
      });
    }
    cursor = start + clip.duration;
  });
  const logoAspect = (input.logoMetadata.width || 1) / (input.logoMetadata.height || 1);
  const layers = [
    ...videoLayers,
    ...transitions,
    {
      id: "layer-logo",
      trackId: "track-brand",
      trackName: "Brand",
      trackOrder: 5,
      type: "media",
      name: "Pixores logo",
      start: 0,
      duration: round(cursor),
      visible: true,
      locked: false,
      opacity: 0.92,
      x: 82,
      y: 3,
      width: 14,
      height: round(14 / logoAspect),
      src: pathToFileURL(input.logoPath).href,
      mediaKind: "image",
      assetKey: "logo",
      objectFit: "contain",
    },
    {
      id: "layer-title",
      trackId: "track-title",
      trackName: "Titles",
      trackOrder: 6,
      type: "text",
      name: "Phase 0 title",
      start: 0.6,
      duration: 3.4,
      visible: true,
      locked: false,
      opacity: 1,
      x: 10,
      y: 73,
      width: 80,
      height: 16,
      text: "PIXORES RENDER BASELINE",
      color: "#FFFFFF",
      fontSize: 68,
      fontFamily: "Arial",
      isBold: true,
      textAlign: "center",
      shadowColor: "#000000",
      shadowBlur: 14,
      shadowOpacity: 0.8,
      shadowPreset: "drop",
    },
  ];
  return createBaseProject(input, "phase0-b", "Phase 0 B - Realistic", layers, cursor);
}

function createVariantC(input) {
  const videoLayers = input.clips.map((clip) => createVideoLayer(
    clip,
    clip.start,
    clip.id === "video1" || clip.id === "video2" ? { audioDetached: true } : {},
  ));
  const detachedAudioLayers = input.clips
    .filter((clip) => clip.id === "video1" || clip.id === "video2")
    .map((clip, index) => ({
      id: `audio-${clip.id}`,
      trackId: `track-audio-${index + 1}`,
      trackName: `Detached audio ${index + 1}`,
      trackOrder: 2 + index,
      type: "audio",
      name: `${clip.name} detached audio`,
      start: round(clip.start),
      duration: round(clip.duration),
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      src: clip.fileUrl,
      mediaKind: "audio",
      assetKey: clip.id,
      linkedVideoLayerId: `layer-${clip.id}`,
      volume: index === 0 ? 0.65 : 0.35,
      audioFadeIn: index === 0 ? 1 : 0.5,
      audioFadeOut: index === 0 ? 1 : 1.5,
    }));
  return createBaseProject(
    input,
    "phase0-c",
    "Phase 0 C - Current audio engine",
    [...videoLayers, ...detachedAudioLayers],
    input.sequentialDuration,
  );
}

async function waitForRender(handlers, renderId, label) {
  const startedAt = performance.now();
  const timeline = [];
  const samples = [];
  let previousStatus = "";
  let previousCpu = getCpuSnapshot();
  let lastSampleAt = 0;

  while (true) {
    const state = await handlers.getRenderStatus(renderId);
    const elapsedSeconds = (performance.now() - startedAt) / 1000;
    if (state.status !== previousStatus) {
      timeline.push({ status: state.status, elapsedSeconds: round(elapsedSeconds) });
      previousStatus = state.status;
    }
    if (elapsedSeconds - lastSampleAt >= 1) {
      const currentCpu = getCpuSnapshot();
      const gpu = await readGpuSample();
      samples.push({
        elapsedSeconds: round(elapsedSeconds),
        cpuPercent: round(getCpuUsage(previousCpu, currentCpu), 1),
        memoryMb: round(process.memoryUsage().rss / 1024 / 1024, 1),
        gpu,
        status: state.status,
        progress: round(state.progress || 0),
        renderFps: round(state.renderFps || 0),
      });
      previousCpu = currentCpu;
      lastSampleAt = elapsedSeconds;
    }
    process.stdout.write(`\r${label}: ${state.status} ${Math.round((state.progress || 0) * 100)}%   `);
    if (terminalStatuses.has(state.status)) {
      process.stdout.write("\n");
      return { state, elapsedSeconds: round(elapsedSeconds), timeline, samples };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function summarizeOutput(outputPath) {
  const stat = await fs.stat(outputPath);
  const metadata = await getVideoMetadata(outputPath);
  return {
    outputPath,
    sizeMb: round(stat.size / 1024 / 1024, 2),
    durationSeconds: round(metadata.durationInSeconds),
    width: metadata.width,
    height: metadata.height,
    fps: metadata.fps,
    videoCodec: metadata.videoCodec,
    audioCodec: metadata.audioCodec,
    supportsSeeking: metadata.supportsSeeking,
  };
}

function summarizeSamples(samples) {
  return {
    averageCpuPercent: round(average(samples.map((sample) => sample.cpuPercent)) || 0, 1),
    peakCpuPercent: round(maximum(samples.map((sample) => sample.cpuPercent)) || 0, 1),
    averageGpuPercent: round(average(samples.map((sample) => sample.gpu?.gpu)) || 0, 1),
    peakGpuPercent: round(maximum(samples.map((sample) => sample.gpu?.gpu)) || 0, 1),
    averageEncoderPercent: round(average(samples.map((sample) => sample.gpu?.encoder)) || 0, 1),
    peakEncoderPercent: round(maximum(samples.map((sample) => sample.gpu?.encoder)) || 0, 1),
    peakGpuMemoryMb: round(maximum(samples.map((sample) => sample.gpu?.memoryUsed)) || 0, 1),
  };
}

const desktopDirectory = path.join(os.homedir(), "Desktop");
const testDirectory = path.resolve(getArgument("source", path.join(desktopDirectory, "preyecto prueba")));
const repetitions = Math.max(1, Math.min(3, Number(getArgument("repetitions", "2")) || 2));
const selectedVariantIds = new Set(getArgument("variants", "A,B,C").toUpperCase().split(",").map((value) => value.trim()));
const phase = Math.max(0, Math.floor(Number(getArgument("phase", "0")) || 0));
const rangeStartArgument = Number(getArgument("range-start", ""));
const rangeStart = Number.isFinite(rangeStartArgument) && rangeStartArgument > 0 ? rangeStartArgument : 0;
const rangeEndArgument = Number(getArgument("range-end", ""));
const rangeEnd = Number.isFinite(rangeEndArgument) && rangeEndArgument > 0 ? rangeEndArgument : null;
const runDirectory = path.join(testDirectory, "resultados-pixores", `fase-${phase}`, sanitizeTimestamp());
const outputDirectory = path.join(runDirectory, "outputs");
const userDataDirectory = path.join(runDirectory, "user-data");
await fs.mkdir(outputDirectory, { recursive: true });
await fs.mkdir(userDataDirectory, { recursive: true });

const app = {
  getPath(name) {
    if (name === "userData") return userDataDirectory;
    if (name === "downloads") return outputDirectory;
    if (name === "temp") return os.tmpdir();
    throw new Error(`Unsupported benchmark app path: ${name}`);
  },
};
const state = { renderOutputDirectory: outputDirectory };
const handlers = createDesktopRenderHandlers({ app, state, appRoot: process.cwd() });
const input = await analyzeInputs(testDirectory);
const variants = [
  { id: "A", label: "Simple cuts", project: createVariantA(input) },
  { id: "B", label: "Realistic composition", project: createVariantB(input) },
  { id: "C", label: "Current audio engine", project: createVariantC(input) },
].filter((variant) => selectedVariantIds.has(variant.id));

await Promise.all(variants.map((variant) => fs.writeFile(
  path.join(runDirectory, `project-${variant.id.toLowerCase()}.json`),
  JSON.stringify(variant.project, null, 2),
  "utf8",
)));

const report = {
  schemaVersion: 1,
  phase,
  startedAt: new Date().toISOString(),
  sourceDirectory: testDirectory,
  runDirectory,
  hardware: {
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model,
    logicalProcessors: os.cpus().length,
    totalMemoryGb: round(os.totalmem() / 1024 / 1024 / 1024, 2),
  },
  inputs: input.clips.map((clip) => ({
    fileName: clip.fileName,
    durationSeconds: round(clip.duration),
    width: clip.metadata.width,
    height: clip.metadata.height,
    fps: clip.metadata.fps,
    videoCodec: clip.metadata.videoCodec,
    audioCodec: clip.metadata.audioCodec,
  })),
  repetitions,
  configuration: {
    rangeStart,
    rangeEnd,
    renderConcurrency: Number(process.env.PIXORES_RENDER_CONCURRENCY) || "adaptive",
    offthreadVideoThreads: Number(process.env.PIXORES_OFFTHREAD_VIDEO_THREADS) || "adaptive",
  },
  runs: [],
};

for (const variant of variants) {
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    const fileName = `phase${phase}-${variant.id.toLowerCase()}-run-${repetition}.mp4`;
    const exportSettings = {
      fileName,
      outputDirectory,
      format: "mp4",
      codec: "h264",
      width: 1920,
      height: 1080,
      aspectMode: "project",
      fps: 30,
      qualityPreset: "recommended",
      crf: 22,
      encoderPreset: "medium",
      pixelFormat: "yuv420p",
      videoBitrateKbps: 8000,
      includeAudio: true,
      audioCodec: "aac",
      audioBitrateKbps: 192,
      audioSampleRate: 48000,
      audioChannels: 2,
      acceleration: "auto",
      renderMethod: "local",
      colorSpace: "rec709",
      ...(rangeEnd ? { rangeStart, rangeEnd } : {}),
    };
    const started = await handlers.startRender(variant.project, {
      outputFormatId: "mp4-h264",
      exportSettings,
    });
    const result = await waitForRender(handlers, started.renderId, `Variant ${variant.id} run ${repetition}`);
    const run = {
      variant: variant.id,
      label: variant.label,
      repetition,
      renderId: started.renderId,
      status: result.state.status,
      elapsedSeconds: result.elapsedSeconds,
      timeline: result.timeline,
      warnings: result.state.warnings || [],
      error: result.state.error || "",
      renderedFrames: result.state.renderedFrames || 0,
      totalFrames: result.state.totalFrames || 0,
      finalRenderFps: round(result.state.renderFps || 0),
      encoder: result.state.encoder || "",
      fastPath: Boolean(result.state.fastPath),
      proxyCount: Number(result.state.proxyCount) || 0,
      proxyFailures: Number(result.state.proxyFailures) || 0,
      resources: summarizeSamples(result.samples),
      samples: result.samples,
      output: result.state.status === "completed" ? await summarizeOutput(result.state.outputPath) : null,
    };
    report.runs.push(run);
    await fs.writeFile(path.join(runDirectory, "baseline-report.json"), JSON.stringify(report, null, 2), "utf8");
    if (run.status !== "completed") throw new Error(`Variant ${variant.id} run ${repetition} failed: ${run.error || run.status}`);
  }
}

report.completedAt = new Date().toISOString();
report.summary = variants.map((variant) => {
  const runs = report.runs.filter((run) => run.variant === variant.id);
  return {
    variant: variant.id,
    label: variant.label,
    averageElapsedSeconds: round(average(runs.map((run) => run.elapsedSeconds)) || 0),
    fastestElapsedSeconds: round(Math.min(...runs.map((run) => run.elapsedSeconds))),
    slowestElapsedSeconds: round(Math.max(...runs.map((run) => run.elapsedSeconds))),
    averageFinalRenderFps: round(average(runs.map((run) => run.finalRenderFps)) || 0),
  };
});
await fs.writeFile(path.join(runDirectory, "baseline-report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ runDirectory, summary: report.summary }, null, 2));
