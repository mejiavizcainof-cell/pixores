import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { mediaPathFromUrl } from "../media-url.mjs";

const runtimeRequire = createRequire(import.meta.url);
const WHISPER_CPP_VERSION = "1.5.5";
const MODEL_SIZES = Object.freeze({ tiny: 77_691_713, base: 147_951_465 });
let analysisQueue = Promise.resolve();

function enqueueAnalysis(task) {
  const result = analysisQueue.then(task, task);
  analysisQueue = result.catch(() => undefined);
  return result;
}

function finiteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveFfmpegPath() {
  const packagePath = String(runtimeRequire("ffmpeg-static"));
  return packagePath.includes(`${path.sep}app.asar${path.sep}`)
    ? packagePath.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`)
    : packagePath;
}

async function runProcess(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      windowsHide: true,
      signal: options.signal,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderr += text;
      options.onStderr?.(text);
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    child.on("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(`Audio analysis failed (${signal || code}): ${stderr.trim() || stdout.trim()}`));
    });
  });
}

export async function resolveLocalMediaPath(payload) {
  const candidates = [...new Set([
    payload?.sourceUrl,
    ...(Array.isArray(payload?.sourceUrls) ? payload.sourceUrls : []),
  ].map((value) => String(value || "").trim()).filter(Boolean))];
  let localCandidateFound = false;
  for (const value of candidates) {
    let candidate = value;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      try {
        candidate = new URL(value).searchParams.get("src") || value;
      } catch {
        candidate = value;
      }
    }
    if (!candidate.startsWith("file:") && !candidate.startsWith("pixores-media:") && !path.isAbsolute(candidate)) continue;
    localCandidateFound = true;
    try {
      const filePath = path.isAbsolute(candidate) ? candidate : mediaPathFromUrl(candidate);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) return filePath;
    } catch {
      // Try the next persistent representation of the selected clip.
    }
  }
  if (localCandidateFound) throw new Error("The selected clip's local media file is unavailable. Relink or re-import it and try again.");
  throw new Error("Select local media imported into Pixores Video Maker Pro before using Audio AI.");
}

function parseSilenceRanges(stderr, clipDuration) {
  const events = Array.from(stderr.matchAll(/silence_(start|end):\s*(-?\d+(?:\.\d+)?)/g), (match) => ({
    kind: match[1],
    time: Math.max(0, finiteNumber(match[2], 0)),
  }));
  const ranges = [];
  let openStart = null;
  for (const event of events) {
    if (event.kind === "start") {
      openStart = Math.min(clipDuration, event.time);
    } else if (openStart !== null) {
      const end = Math.min(clipDuration, event.time);
      if (end > openStart) ranges.push({ start: openStart, end, duration: end - openStart });
      openStart = null;
    }
  }
  if (openStart !== null && clipDuration > openStart) ranges.push({ start: openStart, end: clipDuration, duration: clipDuration - openStart });
  return ranges.map((range) => ({
    start: Number(range.start.toFixed(3)),
    end: Number(range.end.toFixed(3)),
    duration: Number(range.duration.toFixed(3)),
  }));
}

async function detectSilences(payload) {
  const inputPath = await resolveLocalMediaPath(payload);
  const sourceStart = Math.max(0, finiteNumber(payload?.sourceStart, 0));
  const sourceEnd = Math.max(sourceStart + 0.05, finiteNumber(payload?.sourceEnd, sourceStart + 0.05));
  const duration = sourceEnd - sourceStart;
  const thresholdDb = Math.min(-5, Math.max(-80, finiteNumber(payload?.thresholdDb, -35)));
  const minimumDuration = Math.min(10, Math.max(0.1, finiteNumber(payload?.minimumDuration, 0.45)));
  const { stderr } = await runProcess(resolveFfmpegPath(), [
    "-hide_banner", "-ss", sourceStart.toFixed(3), "-t", duration.toFixed(3), "-i", inputPath,
    "-vn", "-af", `silencedetect=noise=${thresholdDb}dB:d=${minimumDuration}`,
    "-f", "null", process.platform === "win32" ? "NUL" : "/dev/null",
  ]);
  const silences = parseSilenceRanges(stderr, duration);
  return {
    ok: true,
    silences,
    clipDuration: Number(duration.toFixed(3)),
    silentDuration: Number(silences.reduce((total, range) => total + range.duration, 0).toFixed(3)),
    thresholdDb,
    minimumDuration,
  };
}

async function ensureWhisperRuntime(app, model, { onProgress, signal } = {}) {
  const { downloadWhisperModel, installWhisperCpp } = runtimeRequire("@remotion/install-whisper-cpp");
  const runtimeRoot = path.join(app.getPath("userData"), "audio-ai");
  const whisperPath = path.join(runtimeRoot, `whisper-${WHISPER_CPP_VERSION}`);
  const modelFolder = path.join(runtimeRoot, "models");
  await fs.mkdir(modelFolder, { recursive: true });
  const executablePath = path.join(whisperPath, process.platform === "win32" ? "main.exe" : "main");
  try {
    await fs.access(executablePath);
  } catch {
    onProgress?.({ stage: "installing", progress: 4, message: "Installing the local speech engine…" });
    await fs.rm(whisperPath, { recursive: true, force: true });
    await installWhisperCpp({ version: WHISPER_CPP_VERSION, to: whisperPath, printOutput: false, signal });
  }
  const modelPath = path.join(modelFolder, `ggml-${model}.bin`);
  try {
    const stat = await fs.stat(modelPath);
    if (stat.size !== MODEL_SIZES[model]) await fs.rm(modelPath, { force: true });
  } catch {
    // Downloaded below when absent.
  }
  onProgress?.({ stage: "model", progress: 8, message: "Checking the local speech model…" });
  await downloadWhisperModel({
    model,
    folder: modelFolder,
    printOutput: false,
    signal,
    onProgress: (downloaded, total) => onProgress?.({
      stage: "model",
      progress: Math.round(8 + (downloaded / Math.max(1, total)) * 27),
      message: `Downloading speech model · ${Math.round((downloaded / Math.max(1, total)) * 100)}%`,
    }),
  });
  return { runtimeRoot, whisperPath, modelFolder };
}

async function transcribeMedia(app, payload, { onProgress, signal } = {}) {
  const inputPath = await resolveLocalMediaPath(payload);
  const sourceStart = Math.max(0, finiteNumber(payload?.sourceStart, 0));
  const sourceEnd = Math.max(sourceStart + 0.05, finiteNumber(payload?.sourceEnd, sourceStart + 0.05));
  const model = payload?.model === "tiny" ? "tiny" : "base";
  const language = ["auto", "Spanish", "English"].includes(payload?.language) ? payload.language : "auto";
  const runtimeRoot = path.join(app.getPath("userData"), "audio-ai");
  await fs.mkdir(runtimeRoot, { recursive: true });
  const originalCwd = process.cwd();
  let workDirectory = "";
  try {
    onProgress?.({ stage: "preparing", progress: 2, message: "Preparing local transcription…" });
    process.chdir(runtimeRoot);
    const runtime = await ensureWhisperRuntime(app, model, { onProgress, signal });
    workDirectory = await fs.mkdtemp(path.join(runtime.runtimeRoot, "job-"));
    const wavPath = path.join(workDirectory, "audio.wav");
    onProgress?.({ stage: "extracting", progress: 37, message: "Extracting audio from the selected clip…" });
    await runProcess(resolveFfmpegPath(), [
      "-hide_banner", "-loglevel", "error", "-ss", sourceStart.toFixed(3), "-t", (sourceEnd - sourceStart).toFixed(3),
      "-i", inputPath, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", "-y", wavPath,
    ], { signal });
    await fs.mkdir(path.join(workDirectory, "tmp"), { recursive: true });
    process.chdir(workDirectory);
    onProgress?.({ stage: "transcribing", progress: 40, message: "Transcribing locally · 0%" });
    const outputBase = path.join(workDirectory, "transcription");
    const transcriptionStartedAt = Date.now();
    const estimatedSeconds = Math.max(8, (sourceEnd - sourceStart) * (model === "base" ? 1.4 : 0.7));
    let reportedProgress = 40;
    const heartbeat = setInterval(() => {
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - transcriptionStartedAt) / 1000));
      const estimatedProgress = Math.min(90, Math.round(40 + (elapsedSeconds / estimatedSeconds) * 50));
      reportedProgress = Math.max(reportedProgress, estimatedProgress);
      const minutes = Math.floor(elapsedSeconds / 60);
      const seconds = String(elapsedSeconds % 60).padStart(2, "0");
      onProgress?.({
        stage: "transcribing",
        progress: reportedProgress,
        message: `Transcribing locally · ${minutes}:${seconds} elapsed`,
      });
    }, 1000);
    try {
      await runProcess(path.join(runtime.whisperPath, process.platform === "win32" ? "main.exe" : "main"), [
        "-f", wavPath,
        "--output-file", outputBase,
        "--output-json",
        "--max-len", "10",
        "-ojf",
        "-m", path.join(runtime.modelFolder, `ggml-${model}.bin`),
        "-pp",
        "-l", language.toLowerCase(),
        "--split-on-word", "true",
      ], {
        signal,
        cwd: workDirectory,
        onStderr: (text) => {
          const matches = Array.from(text.matchAll(/progress\s*=\s*(\d+(?:\.\d+)?)/g));
          const parsed = Number(matches.at(-1)?.[1]);
          if (!Number.isFinite(parsed)) return;
          const progress = Math.max(0, Math.min(100, parsed));
          reportedProgress = Math.max(reportedProgress, Math.round(40 + (progress / 100) * 58));
          onProgress?.({
            stage: "transcribing",
            progress: reportedProgress,
            message: `Transcribing locally · ${Math.round(progress)}%`,
          });
        },
      });
    } finally {
      clearInterval(heartbeat);
    }
    const result = JSON.parse(await fs.readFile(`${outputBase}.json`, "utf8"));
    const captions = result.transcription.map((caption) => ({
      text: String(caption.text || "").trim().replace(/^(?:>>|>|\[[^\]]+\])\s*/, ""),
      startMs: Math.max(0, finiteNumber(caption.offsets?.from, 0)),
      endMs: Math.max(0, finiteNumber(caption.offsets?.to, 0)),
      confidence: null,
    })).filter((caption) => caption.text && caption.endMs > caption.startMs);
    onProgress?.({ stage: "complete", progress: 100, message: "Creating editable caption layers…" });
    return { ok: true, captions, language: result.result?.language || language, model };
  } finally {
    process.chdir(originalCwd);
    if (workDirectory) await fs.rm(workDirectory, { recursive: true, force: true });
  }
}

export function createAudioAiHandlers({ app }) {
  const activeTranscriptions = new Map();
  return {
    detectSilences: (payload) => enqueueAnalysis(() => detectSilences(payload)),
    transcribeMedia: (payload, onProgress) => {
      const jobId = String(payload?.jobId || "audio-ai");
      const controller = new AbortController();
      activeTranscriptions.set(jobId, controller);
      return enqueueAnalysis(() => transcribeMedia(app, payload, {
        signal: controller.signal,
        onProgress: (progress) => onProgress?.({ jobId, ...progress }),
      })).finally(() => activeTranscriptions.delete(jobId));
    },
    cancelTranscription: (jobId) => {
      const controller = activeTranscriptions.get(String(jobId || ""));
      controller?.abort();
      return { ok: true, cancelled: Boolean(controller) };
    },
  };
}
