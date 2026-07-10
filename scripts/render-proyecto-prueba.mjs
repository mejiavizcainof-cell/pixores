import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { getVideoMetadata, renderMedia, selectComposition } from "@remotion/renderer";
import sharp from "sharp";

const cwd = process.cwd();
const renderId = `proyecto-prueba-${Date.now()}`;
const publicBase = "/uploads/video-maker/proyecto-prueba-render";
const diskBase = path.join(cwd, "public", "uploads", "video-maker", "proyecto-prueba-render");
const outputPath = path.join(diskBase, `${renderId}.mp4`);

const clips = [
  { id: "intro", name: "Intro", file: "intro.mp4" },
  { id: "video1", name: "Video 1", file: "video1.mp4" },
  { id: "video2", name: "Video 2", file: "video2.mp4" },
  { id: "outtro", name: "Outtro", file: "outtro.mp4" },
];

const metadata = [];
let cursor = 0;

for (const clip of clips) {
  const filePath = path.join(diskBase, clip.file);
  const videoMeta = await getVideoMetadata(filePath);
  metadata.push({ ...clip, ...videoMeta, start: cursor });
  cursor += videoMeta.durationInSeconds;
}

const logoPath = path.join(diskBase, "logo.PNG");
const logoMeta = await sharp(logoPath).metadata();
const projectDuration = Number(cursor.toFixed(3));

const assets = [
  ...metadata.map((clip) => ({
    id: clip.id,
    name: clip.name,
    kind: "video",
    url: `${publicBase}/${clip.file}`,
    persistentUrl: `${publicBase}/${clip.file}`,
    uploadStatus: "ready",
    duration: clip.durationInSeconds,
  })),
  {
    id: "logo",
    name: "Logo",
    kind: "image",
    url: `${publicBase}/logo.PNG`,
    persistentUrl: `${publicBase}/logo.PNG`,
    uploadStatus: "ready",
  },
];

const videoLayers = metadata.map((clip) => ({
    id: `layer-${clip.id}`,
    trackId: `track-${clip.id}`,
    type: "media",
    name: clip.name,
    start: Number(clip.start.toFixed(3)),
    duration: Number(clip.durationInSeconds.toFixed(3)),
    visible: true,
    locked: false,
    opacity: 1,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    src: `${publicBase}/${clip.file}`,
    mediaKind: "video",
    assetKey: clip.id,
    objectFit: "cover",
    volume: 1,
  }));

const layers = [
  {
    id: "layer-logo",
    trackId: "track-logo",
    type: "media",
    name: "Logo top left",
    start: 0,
    duration: projectDuration,
    visible: true,
    locked: false,
    opacity: 1,
    x: 2,
    y: 2,
    width: 16,
    height: Number((16 / Math.max(0.01, (logoMeta.width || 1) / (logoMeta.height || 1))).toFixed(3)),
    src: `${publicBase}/logo.PNG`,
    mediaKind: "image",
    assetKey: "logo",
    objectFit: "contain",
  },
  ...videoLayers,
];

const project = {
  schemaVersion: 1,
  canvas: { width: 1080, height: 990 },
  duration: projectDuration,
  background: "#000000",
  layers,
  transitions: [],
  assets,
  format: { id: "custom", label: "Test 1080x990", width: 1080, height: 990 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const entryPoint = path.join(cwd, "src", "video-render", "remotion", "entry.ts");
const serveUrl = await bundle({
  entryPoint,
  enableCaching: true,
  publicDir: path.join(cwd, "public"),
  rootDir: cwd,
});

const composition = await selectComposition({
  serveUrl,
  id: "PixoresComposition",
  inputProps: { project },
});

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: outputPath,
  inputProps: { project },
  overwrite: true,
  logLevel: "warn",
  onProgress: ({ progress }) => {
    process.stdout.write(`\rRender ${Math.round((progress || 0) * 100)}%`);
  },
});

process.stdout.write("\n");
console.log(JSON.stringify({
  outputPath,
  projectDuration,
  clips: metadata.map((clip) => ({
    name: clip.name,
    width: clip.width,
    height: clip.height,
    fps: clip.fps,
    duration: clip.durationInSeconds,
    supportsSeeking: clip.supportsSeeking,
    colorSpace: clip.colorSpace,
    audioCodec: clip.audioCodec,
  })),
  logo: {
    width: logoMeta.width,
    height: logoMeta.height,
    layer: layers.find((layer) => layer.id === "layer-logo"),
  },
}, null, 2));
