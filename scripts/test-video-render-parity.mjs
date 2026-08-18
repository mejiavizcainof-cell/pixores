import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { ensureBrowser } from "@remotion/renderer";
import sharp from "sharp";
import { createDesktopRenderHandlers } from "../desktop/electron/services/render-adapter.mjs";

const run = promisify(execFile);
const require = createRequire(import.meta.url);
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = path.join(require("@remotion/compositor-win32-x64-msvc").dir, "ffprobe.exe");
const projectRoot = path.resolve(import.meta.dirname, "..");
const workDirectory = path.join(os.tmpdir(), "pixores-video-parity");
const width = 640;
const height = 360;
const fps = 30;

async function createColorClip(filePath, color) {
  await run(ffmpegPath, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", `color=c=${color}:s=${width}x${height}:r=${fps}:d=1`,
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-t", "1", "-shortest",
    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", filePath,
  ], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
}

function mediaLayer(id, sourcePath, start) {
  return {
    id,
    trackId: "track-video-1",
    trackOrder: 0,
    type: "media",
    mediaKind: "video",
    name: id,
    src: pathToFileURL(sourcePath).href,
    start,
    duration: 1,
    sourceStart: 0,
    sourceEnd: 1,
    sourceDuration: 1,
    trimStart: 0,
    trimEnd: 1,
    visible: true,
    locked: false,
    opacity: 1,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    angle: 0,
    objectFit: "cover",
    volume: 1,
  };
}

function createProject(sourcePaths) {
  return {
    schemaVersion: 1,
    canvas: { width, height },
    duration: 3,
    background: "#000000",
    layers: [
      ...sourcePaths.map((sourcePath, index) => mediaLayer(`clip-${index + 1}`, sourcePath, index)),
      {
        id: "text-parity",
        trackId: "track-text-1",
        // Lower track-order values are composited later and therefore appear
        // above the base video in the Pixores renderer.
        trackOrder: -1,
        type: "text",
        name: "Text parity",
        text: "A CONTINUACIÓN",
        start: 0,
        duration: 0.75,
        visible: true,
        locked: false,
        opacity: 1,
        x: 0.04,
        y: 7.63,
        width: 46.82,
        height: 10.45,
        angle: 0,
        fontFamily: "Bowlby One SC",
        fontSize: 64,
        color: "#130101",
        textAlign: "right",
        strokeColor: "#ffffff",
        strokeWidth: 15,
      },
    ],
    assets: [],
    transitions: [],
    format: { id: "16_9", label: "16:9", width, height },
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

async function renderProject(project, outputDirectory) {
  const app = {
    getPath(name) {
      if (name === "userData") return path.join(workDirectory, "user-data");
      if (name === "temp") return workDirectory;
      return outputDirectory;
    },
  };
  const handlers = createDesktopRenderHandlers({ app, state: { renderOutputDirectory: outputDirectory }, appRoot: projectRoot });
  const started = await handlers.startRender(project, {
    outputFormatId: "mp4-h264",
    exportSettings: {
      fileName: "parity-output.mp4",
      outputDirectory,
      width,
      height,
      fps,
      codec: "h264",
      includeAudio: true,
      audioCodec: "aac",
      audioBitrateKbps: 128,
      audioSampleRate: 48000,
      videoBitrateKbps: 2500,
      qualityPreset: "recommended",
      acceleration: "auto",
      rangeStart: 0,
      rangeEnd: 3,
    },
  });
  while (true) {
    const job = await handlers.getRenderStatus(started.renderId);
    if (["completed", "failed", "cancelled"].includes(job.status)) {
      if (job.status !== "completed") throw new Error(`Parity render failed: ${job.error || job.status}`);
      return { outputPath: job.outputPath, job };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function createEditorReference(referencePath) {
  const fontSource = path.join(projectRoot, "public", "video-maker-assets", "fonts", "bowlby-one-sc.woff2");
  const localFont = path.join(workDirectory, "bowlby-one-sc.woff2");
  await writeFile(localFont, await readFile(fontSource));
  const htmlPath = path.join(workDirectory, "editor-reference.html");
  const fontSize = 32;
  const strokeWidth = 7.5;
  const html = `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:'Bowlby One SC';src:url('./bowlby-one-sc.woff2') format('woff2');font-display:block}html,body{margin:0;overflow:hidden;background:#b91c1c}</style><canvas id="canvas" width="${width}" height="${height}"></canvas><script>(async()=>{await document.fonts.load('900 ${fontSize}px "Bowlby One SC"');await document.fonts.ready;const c=document.getElementById('canvas');const x=c.getContext('2d');x.fillStyle='#b91c1c';x.fillRect(0,0,c.width,c.height);x.save();x.translate(${0.0004 * width},${0.0763 * height});x.font='normal 900 ${fontSize}px "Bowlby One SC", Arial, sans-serif';x.textBaseline='top';x.textAlign='right';x.shadowColor='rgba(0,0,0,.36)';x.shadowBlur=7;x.strokeStyle='#fff';x.lineWidth=${strokeWidth};x.fillStyle='#130101';const lines=['A','CONTINUACIÓN'];for(let i=0;i<lines.length;i++){const y=i*${fontSize * 1.08};x.strokeText(lines[i],${0.4682 * width},y);x.fillText(lines[i],${0.4682 * width},y)}x.restore();document.body.dataset.ready='1'})()</script>`;
  await writeFile(htmlPath, html, "utf8");
  const browserExecutable = await ensureBrowser({ chromeMode: "headless-shell", logLevel: "warn" });
  await run(browserExecutable.path, [
    "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
    "--allow-file-access-from-files", "--virtual-time-budget=3000",
    `--window-size=${width},${height}`, `--screenshot=${referencePath}`,
    pathToFileURL(htmlPath).href,
  ], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
}

async function getForegroundBounds(imagePath) {
  const { data, info } = await sharp(imagePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const sampleOffset = ((info.height - 2) * info.width + (info.width - 2)) * 3;
  const background = [data[sampleOffset], data[sampleOffset + 1], data[sampleOffset + 2]];
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  let pixels = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * 3;
      const difference = Math.abs(data[offset] - background[0]) + Math.abs(data[offset + 1] - background[1]) + Math.abs(data[offset + 2] - background[2]);
      if (difference < 45) continue;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); pixels += 1;
    }
  }
  if (right < left) throw new Error(`No foreground text found in ${imagePath}`);
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1, pixels };
}

function assertNear(label, actual, expected, tolerance) {
  if (Math.abs(actual - expected) > tolerance) throw new Error(`${label}: expected ${expected} ± ${tolerance}, received ${actual}`);
}

await rm(workDirectory, { recursive: true, force: true });
await mkdir(workDirectory, { recursive: true });
const sources = ["#b91c1c", "#15803d", "#1d4ed8"].map((_, index) => path.join(workDirectory, `source-${index + 1}.mp4`));
await Promise.all(sources.map((sourcePath, index) => createColorClip(sourcePath, ["#b91c1c", "#15803d", "#1d4ed8"][index])));

const { outputPath, job } = await renderProject(createProject(sources), workDirectory);
const exportedFrame = path.join(workDirectory, "exported-frame.png");
const editorReference = path.join(workDirectory, "editor-reference.png");
await run(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", "-ss", "0.5", "-i", outputPath, "-frames:v", "1", exportedFrame], { windowsHide: true });
await createEditorReference(editorReference);

const [exportedBounds, editorBounds] = await Promise.all([getForegroundBounds(exportedFrame), getForegroundBounds(editorReference)]);
assertNear("text left", exportedBounds.left, editorBounds.left, 12);
assertNear("text top", exportedBounds.top, editorBounds.top, 12);
assertNear("text width", exportedBounds.width, editorBounds.width, 14);
assertNear("text height", exportedBounds.height, editorBounds.height, 12);

const { stdout: probeJson } = await run(ffprobePath, [
  "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate,duration,nb_frames", "-of", "json", outputPath,
], { windowsHide: true });
const stream = JSON.parse(probeJson).streams?.[0];
if (Number(stream?.nb_frames) !== 90) throw new Error(`Expected exactly 90 frames, received ${stream?.nb_frames}.`);

const { stdout: frameCsv } = await run(ffprobePath, [
  "-v", "error", "-select_streams", "v:0", "-show_frames", "-show_entries", "frame=best_effort_timestamp_time", "-of", "csv=p=0", outputPath,
], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
const timestamps = frameCsv.trim().split(/\r?\n/).map((line) => Number(line.split(",")[0]));
const gaps = timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]);
const maximumGap = Math.max(...gaps);
if (maximumGap > 0.0341) throw new Error(`Non-contiguous video timestamps detected: maximum gap ${maximumGap.toFixed(6)}s.`);

let blackOutput = "";
try {
  const result = await run(ffmpegPath, [
    "-hide_banner", "-i", outputPath, "-vf", "blackdetect=d=0.001:pix_th=0.10", "-an", "-f", "null", "-",
  ], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  blackOutput = `${result.stdout}\n${result.stderr}`;
} catch (error) {
  blackOutput = `${error.stdout || ""}\n${error.stderr || ""}`;
}
if (/black_start:/i.test(blackOutput)) throw new Error(`Black frame detected at a synthetic cut:\n${blackOutput.match(/.*black_start:.*$/gim)?.join("\n")}`);

const fontCss = await readFile(path.join(projectRoot, "public", "video-maker-assets", "fonts", "pixores-fonts.css"), "utf8");
if (/https?:\/\//i.test(fontCss)) throw new Error("The packaged font stylesheet still contains a remote URL.");

console.log(JSON.stringify({
  passed: true,
  strategy: job.segmentedRender ? "segmented-hybrid" : job.hybridRender ? "hybrid-compositor" : "compositor",
  outputPath,
  frames: Number(stream.nb_frames),
  maximumTimestampGapMs: Number((maximumGap * 1000).toFixed(3)),
  editorBounds,
  exportedBounds,
}, null, 2));
