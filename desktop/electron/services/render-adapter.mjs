import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const renderJobs = new Map();
const runtimeRequire = createRequire(import.meta.url);

const videoExportFormats = [
  { id: "mp4-h264", label: "MP4 H.264", extension: "mp4", codec: "h264" },
  { id: "mp4-h265", label: "MP4 H.265 / HEVC", extension: "mp4", codec: "h265" },
  { id: "mov-prores", label: "MOV ProRes", extension: "mov", codec: "prores" },
  { id: "webm-vp9", label: "WebM VP9", extension: "webm", codec: "vp9" },
  { id: "webm-vp8", label: "WebM VP8", extension: "webm", codec: "vp8" },
];

function getVideoExportFormat(formatId) {
  return videoExportFormats.find((format) => format.id === formatId)
    || videoExportFormats.find((format) => format.id === "mp4-h264")
    || videoExportFormats[0];
}

function loadRemotionModules() {
  const bundler = runtimeRequire("@remotion/bundler");
  const renderer = runtimeRequire("@remotion/renderer");

  return {
    bundle: bundler.bundle,
    renderMedia: renderer.renderMedia,
    selectComposition: renderer.selectComposition,
  };
}

async function configurePackagedBinaries(appRoot) {
  if (!appRoot.endsWith(".asar")) return;

  const unpackedRoot = path.join(path.dirname(appRoot), "app.asar.unpacked");
  const esbuildBinaryPath = path.join(unpackedRoot, "node_modules", "@esbuild", "win32-x64", "esbuild.exe");

  try {
    await fs.access(esbuildBinaryPath);
    process.env.ESBUILD_BINARY_PATH = esbuildBinaryPath;
  } catch {
    // esbuild will surface its own detailed error if the binary is missing.
  }
}

function fileUrlFromPath(filePath) {
  return `file://${filePath.replaceAll("\\", "/")}`;
}

function getProgressValue(value) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && typeof value.progress === "number") return value.progress;
  return 0;
}

function getExportsDir({ app, state }) {
  if (state?.packagePath) {
    const parsed = path.parse(state.packagePath);
    return path.join(parsed.dir, `${parsed.name}_exports`);
  }

  return path.join(app.getPath("documents"), "Pixores Video Exports");
}

async function getReadableRenderRoot(appRoot) {
  if (!appRoot.endsWith(".asar")) return appRoot;

  const unpackedRoot = path.join(path.dirname(appRoot), "app.asar.unpacked");
  try {
    await fs.access(path.join(unpackedRoot, "src", "video-render", "remotion", "entry.ts"));
    return unpackedRoot;
  } catch {
    return appRoot;
  }
}

function getMediaWarnings(project) {
  return (project.layers || [])
    .filter((layer) => (
      (layer.type === "media" && (layer.mediaKind === "image" || layer.mediaKind === "video"))
      || layer.type === "audio"
    ))
    .flatMap((layer) => {
      const asset = layer.assetKey ? project.assets?.find((item) => item.id === layer.assetKey) : undefined;
      const src = layer.src || asset?.persistentUrl || asset?.url || "";
      const label = layer.type === "audio" ? "Audio" : layer.mediaKind === "video" ? "Video" : "Image";
      if (!src) return [`${label} "${layer.name}" was skipped: missing persistent URL.`];
      if (src.startsWith("blob:")) return [`${label} "${layer.name}" was skipped: blob URLs cannot be rendered locally.`];
      return [];
    });
}

function updateJob(renderId, patch) {
  const current = renderJobs.get(renderId);
  if (!current) return;
  renderJobs.set(renderId, {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

async function renderLocalJob({ app, state, project, renderId, appRoot, outputFormatId }) {
  try {
    updateJob(renderId, { status: "rendering", progress: 0.02 });
    await configurePackagedBinaries(appRoot);

    const exportsDir = getExportsDir({ app, state });
    await fs.mkdir(exportsDir, { recursive: true });

    const outputFormat = getVideoExportFormat(outputFormatId);
    const outputPath = path.join(exportsDir, `pixores-render-${renderId}.${outputFormat.extension}`);
    const renderRoot = await getReadableRenderRoot(appRoot);
    const entryPoint = path.join(renderRoot, "src", "video-render", "remotion", "entry.ts");
    const warnings = getMediaWarnings(project);
    const { bundle, renderMedia, selectComposition } = loadRemotionModules();

    const serveUrl = await bundle({
      entryPoint,
      enableCaching: true,
      publicDir: path.join(renderRoot, "public"),
      rootDir: renderRoot,
    });
    updateJob(renderId, { progress: 0.08, warnings });

    const inputProps = { project };
    const composition = await selectComposition({
      serveUrl,
      id: "PixoresComposition",
      inputProps,
    });

    await renderMedia({
      composition,
      serveUrl,
      codec: outputFormat.codec,
      outputLocation: outputPath,
      inputProps,
      overwrite: true,
      logLevel: "warn",
      onProgress: (progressValue) => {
        updateJob(renderId, {
          status: "rendering",
          progress: Math.max(0.08, Math.min(0.98, getProgressValue(progressValue))),
        });
      },
    });

    updateJob(renderId, {
      status: "completed",
      progress: 1,
      outputPath,
      outputUrl: fileUrlFromPath(outputPath),
      outputFormat,
      warnings,
    });
  } catch (error) {
    updateJob(renderId, {
      status: "failed",
      progress: 0,
      error: error instanceof Error ? error.message : "Local render failed.",
    });
  }
}

export function createDesktopRenderHandlers({ app, state, appRoot = process.cwd() }) {
  return {
    async renderVideoLocal(project, options = {}) {
      const renderId = crypto.randomUUID();
      const now = new Date().toISOString();
      const outputFormat = getVideoExportFormat(options.outputFormatId);

      renderJobs.set(renderId, {
        renderId,
        status: "queued",
        progress: 0,
        outputPath: "",
        outputUrl: "",
        outputFormat,
        error: "",
        warnings: [],
        createdAt: now,
        updatedAt: now,
      });

      void renderLocalJob({ app, state, project, renderId, appRoot, outputFormatId: outputFormat.id });

      return {
        renderId,
        status: "queued",
        progress: 0,
        message: `Desktop local ${outputFormat.label} render queued`,
      };
    },

    async startRender(project, options = {}) {
      return this.renderVideoLocal(project, options);
    },

    async getRenderStatus(renderId) {
      const job = renderJobs.get(renderId);
      if (!job) {
        return {
          renderId,
          status: "failed",
          progress: 0,
          error: "Desktop render job was not found.",
          warnings: [],
        };
      }

      return job;
    },
  };
}
