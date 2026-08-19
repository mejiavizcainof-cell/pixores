import { spawn } from "node:child_process";
import dns from "node:dns/promises";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { mediaUrlFromPath } from "../media-url.mjs";

const runtimeRequire = createRequire(import.meta.url);
const MAX_DOWNLOAD_BYTES = 250 * 1024 * 1024;
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const MAX_DOWNLOAD_BATCH = 25;
const MAX_CONVERSION_BATCH = 50;

const AUDIO_MIME_BY_EXTENSION = new Map([
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".m4a", "audio/mp4"],
  [".aac", "audio/aac"],
  [".flac", "audio/flac"],
  [".ogg", "audio/ogg"],
  [".opus", "audio/ogg"],
  [".aif", "audio/aiff"],
  [".aiff", "audio/aiff"],
  [".wma", "audio/x-ms-wma"],
]);

const EXTENSION_BY_MIME = new Map([
  ["audio/mpeg", ".mp3"],
  ["audio/mp3", ".mp3"],
  ["audio/wav", ".wav"],
  ["audio/x-wav", ".wav"],
  ["audio/mp4", ".m4a"],
  ["audio/aac", ".aac"],
  ["audio/flac", ".flac"],
  ["audio/ogg", ".ogg"],
  ["audio/opus", ".opus"],
  ["audio/aiff", ".aiff"],
  ["audio/x-aiff", ".aiff"],
  ["audio/x-ms-wma", ".wma"],
]);

const AUDIO_FORMATS = Object.freeze([
  { id: "mp3", label: "MP3", extension: "mp3", mimeType: "audio/mpeg", encoder: "libmp3lame", lossy: true },
  { id: "wav", label: "WAV", extension: "wav", mimeType: "audio/wav", encoder: "pcm_s16le", lossy: false },
  { id: "m4a", label: "M4A / AAC", extension: "m4a", mimeType: "audio/mp4", encoder: "aac", lossy: true },
  { id: "flac", label: "FLAC", extension: "flac", mimeType: "audio/flac", encoder: "flac", lossy: false },
  { id: "ogg", label: "OGG / Vorbis", extension: "ogg", mimeType: "audio/ogg", encoder: "libvorbis", lossy: true },
  { id: "opus", label: "Opus", extension: "opus", mimeType: "audio/ogg", encoder: "libopus", lossy: true },
  { id: "aiff", label: "AIFF", extension: "aiff", mimeType: "audio/aiff", encoder: "pcm_s16be", lossy: false },
  { id: "wma", label: "WMA", extension: "wma", mimeType: "audio/x-ms-wma", encoder: "wmav2", lossy: true },
]);

function resolveFfmpegPath() {
  const packagePath = String(runtimeRequire("ffmpeg-static"));
  return packagePath.includes(`${path.sep}app.asar${path.sep}`)
    ? packagePath.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`)
    : packagePath;
}

function clamp(value, minimum, maximum, fallback = minimum) {
  const number = Number(value);
  return Math.min(maximum, Math.max(minimum, Number.isFinite(number) ? number : fallback));
}

export function sanitizeAudioFilename(value, fallback = "audio") {
  const cleaned = String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 120);
  const safe = cleaned || fallback;
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe) ? `Pixores ${safe}` : safe;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function safeDecodeURIComponent(value) {
  try { return decodeURIComponent(String(value || "")); } catch { return String(value || ""); }
}

export function parseMyInstantsPage(html, pageUrl) {
  const source = String(html || "");
  const titleMatch = source.match(/<h1[^>]*id=["']instant-page-title["'][^>]*>([\s\S]*?)<\/h1>/i)
    || source.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const audioMatch = source.match(/<a[^>]+href=["']([^"']+)["'][^>]+download[^>]*>/i)
    || source.match(/<meta[^>]+property=["']og:audio["'][^>]+content=["']([^"']+)["']/i)
    || source.match(/data-url=["']([^"']*\/media\/sounds\/[^"']+)["']/i)
    || source.match(/preloadAudioUrl\s*=\s*["']([^"']+)["']/i);
  if (!audioMatch?.[1]) throw new Error("Pixores could not find the official MP3 download on this MyInstants page.");
  const rawTitle = decodeHtml(titleMatch?.[1] || "MyInstants audio")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+-\s+(?:Sound Button|Instant Sound Effect Button).*$/i, "")
    .trim();
  return {
    title: sanitizeAudioFilename(rawTitle, "MyInstants audio"),
    audioUrl: new URL(decodeHtml(audioMatch[1]), pageUrl).href,
  };
}

export function isPrivateNetworkAddress(address) {
  const value = String(address || "").toLowerCase().split("%")[0];
  if (value === "::1" || value === "::" || value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) return true;
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = mapped || (net.isIP(value) === 4 ? value : "");
  if (!ipv4) return false;
  const [first, second] = ipv4.split(".").map(Number);
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19))
    || first >= 224;
}

async function validateRemoteUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw new Error("Enter a valid HTTP or HTTPS audio URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only HTTP and HTTPS audio links are supported.");
  if (url.username || url.password) throw new Error("Links containing embedded credentials are not supported.");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Local network addresses cannot be downloaded.");
  }
  const addresses = net.isIP(hostname) ? [{ address: hostname }] : await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateNetworkAddress(address))) {
    throw new Error("Private or local network addresses cannot be downloaded.");
  }
  return url;
}

async function fetchValidated(value, { signal, headers = {}, maximumBytes = MAX_DOWNLOAD_BYTES } = {}) {
  let currentUrl = await validateRemoteUrl(value);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(currentUrl, {
      headers: {
        "Accept": "audio/*,text/html;q=0.8,*/*;q=0.2",
        "User-Agent": "Pixores-Audio-Studio/1.0",
        ...headers,
      },
      redirect: "manual",
      signal,
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The download redirected without a destination.");
      response.body?.cancel().catch(() => undefined);
      currentUrl = await validateRemoteUrl(new URL(location, currentUrl).href);
      continue;
    }
    if (!response.ok) throw new Error(`The audio server returned HTTP ${response.status}.`);
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maximumBytes) throw new Error("The remote file is larger than the Pixores download limit.");
    return { response, finalUrl: currentUrl.href };
  }
  throw new Error("The audio link redirected too many times.");
}

function isMyInstantsPage(url) {
  const hostname = url.hostname.toLowerCase();
  return (hostname === "myinstants.com" || hostname === "www.myinstants.com")
    && /\/instant\/[^/]+\/?$/i.test(url.pathname);
}

async function readLimitedText(response, maximumBytes = MAX_PAGE_BYTES) {
  if (!response.body) return "";
  const chunks = [];
  let total = 0;
  for await (const chunk of Readable.fromWeb(response.body)) {
    total += chunk.length;
    if (total > maximumBytes) throw new Error("The linked web page is too large to inspect safely.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function resolveDownloadSource(sourceUrl, signal) {
  const initialUrl = await validateRemoteUrl(sourceUrl);
  if (!isMyInstantsPage(initialUrl)) return { audioUrl: initialUrl.href, title: "" };
  const { response, finalUrl } = await fetchValidated(initialUrl.href, { signal, maximumBytes: MAX_PAGE_BYTES });
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("text/html")) throw new Error("The MyInstants link did not return a sound page.");
  const parsed = parseMyInstantsPage(await readLimitedText(response), finalUrl);
  const resolvedAudioUrl = await validateRemoteUrl(parsed.audioUrl);
  if (!/(^|\.)myinstants\.com$/i.test(resolvedAudioUrl.hostname)) {
    throw new Error("The MyInstants download points outside the supported provider.");
  }
  return { audioUrl: resolvedAudioUrl.href, title: parsed.title };
}

function extensionFromResponse(response, finalUrl) {
  const mimeType = String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const urlExtension = path.extname(new URL(finalUrl).pathname).toLowerCase();
  const extension = EXTENSION_BY_MIME.get(mimeType) || (AUDIO_MIME_BY_EXTENSION.has(urlExtension) ? urlExtension : "");
  if (!mimeType.startsWith("audio/") && !extension) throw new Error("The link did not return a supported audio file.");
  return { extension: extension || ".mp3", mimeType: mimeType.startsWith("audio/") ? mimeType : AUDIO_MIME_BY_EXTENSION.get(extension) || "audio/mpeg" };
}

function filenameFromContentDisposition(value) {
  const source = String(value || "");
  const encoded = source.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try { return decodeURIComponent(encoded); } catch { return encoded; }
  }
  return source.match(/filename=["']?([^"';]+)["']?/i)?.[1] || "";
}

async function uniqueOutputPath(directory, baseName, extension, reservedPaths = new Set()) {
  const safeBase = sanitizeAudioFilename(baseName.replace(/\.[^.]+$/, ""), "Pixores audio");
  for (let index = 0; index < 10_000; index += 1) {
    const suffix = index ? ` (${index + 1})` : "";
    const candidate = path.join(directory, `${safeBase}${suffix}.${extension.replace(/^\./, "")}`);
    const normalizedCandidate = path.resolve(candidate);
    if (reservedPaths.has(normalizedCandidate)) continue;
    try {
      await fs.access(candidate);
    } catch {
      reservedPaths.add(normalizedCandidate);
      return candidate;
    }
  }
  throw new Error("Pixores could not create a unique output filename.");
}

function createTempPath(outputPath, jobId) {
  const extension = path.extname(outputPath);
  return path.join(path.dirname(outputPath), `${path.basename(outputPath, extension)}.part-${jobId}${extension}`);
}

function runFfmpeg(args, job, onProgress) {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveFfmpegPath(), args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    job.cancel = () => child.kill("SIGTERM");
    let stderr = "";
    let durationSeconds = 0;
    let stdoutBuffer = "";
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderr = `${stderr}${text}`.slice(-24_000);
      const duration = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (duration) durationSeconds = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
    });
    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString("utf8");
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";
      for (const line of lines) {
        const match = line.match(/^out_time_(?:us|ms)=(\d+)$/);
        if (match && durationSeconds > 0) onProgress(Math.min(98, Math.round((Number(match[1]) / 1_000_000 / durationSeconds) * 100)));
      }
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      job.cancel = null;
      if (job.status === "cancelled") return reject(new Error("Audio conversion cancelled."));
      if (code === 0) return resolve();
      reject(new Error(`FFmpeg conversion failed (${signal || code}): ${stderr.trim().split(/\r?\n/).slice(-4).join(" ")}`));
    });
  });
}

async function probeEncoders() {
  return new Promise((resolve) => {
    const child = spawn(resolveFfmpegPath(), ["-hide_banner", "-encoders"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { output += chunk.toString("utf8"); });
    child.on("error", () => resolve(new Set()));
    child.on("exit", () => {
      const encoders = new Set(Array.from(output.matchAll(/^\s*A\S*\s+([\w-]+)/gm), (match) => match[1]));
      resolve(encoders);
    });
  });
}

function conversionArguments(job, format) {
  const bitrate = Math.round(clamp(job.config.bitrateKbps, 32, 320, 192));
  const sampleRate = [44_100, 48_000].includes(Number(job.config.sampleRate)) ? Number(job.config.sampleRate) : 48_000;
  const channels = Number(job.config.channels) === 1 ? 1 : 2;
  const codecArgs = ["-c:a", format.encoder];
  if (format.lossy) codecArgs.push("-b:a", `${bitrate}k`);
  return [
    "-hide_banner", "-nostdin", "-i", job.config.sourcePath, "-vn",
    ...(job.config.normalize ? ["-af", "loudnorm=I=-16:LRA=11:TP=-1.5"] : []),
    "-ar", String(sampleRate), "-ac", String(channels), ...codecArgs,
    "-progress", "pipe:1", "-nostats", "-y", job.tempPath,
  ];
}

function publicJob(job) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    message: job.message,
    name: job.name,
    sourceLabel: job.sourceLabel,
    outputPath: job.outputPath || "",
    outputUrl: job.outputUrl || "",
    mimeType: job.mimeType || "",
    size: job.size || 0,
    error: job.error || "",
    createdAt: job.createdAt,
    startedAt: job.startedAt || "",
    completedAt: job.completedAt || "",
  };
}

export function createAudioStudioService({ app, dialog, shell }) {
  const jobs = new Map();
  const selectedInputPaths = new Set();
  const allowedOutputDirectories = new Set([path.resolve(app.getPath("downloads"))]);
  const generatedOutputs = new Set();
  const reservedOutputPaths = new Set();
  let encoderProbe;
  let activeDownloads = 0;
  let activeConversions = 0;
  let downloadConcurrency = 3;
  let schedulerPending = false;

  const notify = (job) => {
    try { job.notify?.(publicJob(job)); } catch { /* The renderer may have navigated away. */ }
  };

  const setJob = (job, update) => {
    Object.assign(job, update);
    notify(job);
  };

  const resolveOutputDirectory = (value) => {
    const candidate = path.resolve(String(value || app.getPath("downloads")));
    if (!allowedOutputDirectories.has(candidate)) throw new Error("Choose the output folder from Audio Studio before starting.");
    return candidate;
  };

  const executeDownload = async (job) => {
    const abortController = new AbortController();
    job.cancel = () => abortController.abort();
    try {
      setJob(job, { status: "resolving", progress: 2, message: "Resolving audio link…", startedAt: new Date().toISOString() });
      const resolved = await resolveDownloadSource(job.config.sourceUrl, abortController.signal);
      setJob(job, { status: "downloading", progress: 5, message: "Downloading audio…", name: resolved.title || job.name });
      const { response, finalUrl } = await fetchValidated(resolved.audioUrl, { signal: abortController.signal });
      const { extension, mimeType } = extensionFromResponse(response, finalUrl);
      const dispositionName = filenameFromContentDisposition(response.headers.get("content-disposition"));
      const urlName = safeDecodeURIComponent(path.basename(new URL(finalUrl).pathname));
      const baseName = resolved.title || dispositionName || urlName || "Pixores audio";
      const outputDirectory = resolveOutputDirectory(job.config.outputDirectory);
      await fs.mkdir(outputDirectory, { recursive: true });
      job.outputPath = await uniqueOutputPath(outputDirectory, baseName, extension, reservedOutputPaths);
      job.tempPath = createTempPath(job.outputPath, job.id);
      const expectedBytes = Number(response.headers.get("content-length")) || 0;
      let downloadedBytes = 0;
      const progressStream = new Transform({
        transform(chunk, _encoding, callback) {
          downloadedBytes += chunk.length;
          if (downloadedBytes > MAX_DOWNLOAD_BYTES) return callback(new Error("The download exceeded the 250 MB Pixores limit."));
          const progress = expectedBytes > 0 ? Math.min(98, 5 + Math.round((downloadedBytes / expectedBytes) * 93)) : Math.min(95, 5 + Math.round(downloadedBytes / (2 * 1024 * 1024)));
          setJob(job, { progress, message: `Downloading ${Math.max(0.1, downloadedBytes / 1024 / 1024).toFixed(1)} MB…` });
          callback(null, chunk);
        },
      });
      if (!response.body) throw new Error("The audio server returned an empty response.");
      await pipeline(Readable.fromWeb(response.body), progressStream, createWriteStream(job.tempPath, { flags: "wx" }), { signal: abortController.signal });
      if (downloadedBytes <= 0) throw new Error("The downloaded audio file was empty.");
      await fs.rename(job.tempPath, job.outputPath);
      generatedOutputs.add(path.resolve(job.outputPath));
      setJob(job, {
        status: "completed", progress: 100, message: "Download complete", outputUrl: mediaUrlFromPath(job.outputPath),
        mimeType, size: downloadedBytes, completedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (job.tempPath) await fs.rm(job.tempPath, { force: true }).catch(() => undefined);
      const cancelled = job.status === "cancelled" || abortController.signal.aborted;
      setJob(job, cancelled
        ? { status: "cancelled", progress: 0, message: "Download cancelled", error: "" }
        : { status: "failed", message: "Download failed", error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (job.outputPath && job.status !== "completed") reservedOutputPaths.delete(path.resolve(job.outputPath));
      job.cancel = null;
      activeDownloads -= 1;
      schedule();
    }
  };

  const executeConversion = async (job) => {
    try {
      const format = AUDIO_FORMATS.find((item) => item.id === job.config.formatId);
      if (!format) throw new Error("Choose a supported output format.");
      const outputDirectory = resolveOutputDirectory(job.config.outputDirectory);
      await fs.mkdir(outputDirectory, { recursive: true });
      job.outputPath = await uniqueOutputPath(outputDirectory, path.basename(job.config.sourcePath, path.extname(job.config.sourcePath)), format.extension, reservedOutputPaths);
      job.tempPath = createTempPath(job.outputPath, job.id);
      setJob(job, { status: "converting", progress: 1, message: `Converting to ${format.label}…`, startedAt: new Date().toISOString() });
      await runFfmpeg(conversionArguments(job, format), job, (progress) => setJob(job, { progress }));
      await fs.rename(job.tempPath, job.outputPath);
      const stat = await fs.stat(job.outputPath);
      generatedOutputs.add(path.resolve(job.outputPath));
      setJob(job, {
        status: "completed", progress: 100, message: "Conversion complete", outputUrl: mediaUrlFromPath(job.outputPath),
        mimeType: format.mimeType, size: stat.size, name: path.basename(job.outputPath), completedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (job.tempPath) await fs.rm(job.tempPath, { force: true }).catch(() => undefined);
      setJob(job, job.status === "cancelled"
        ? { status: "cancelled", progress: 0, message: "Conversion cancelled", error: "" }
        : { status: "failed", message: "Conversion failed", error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (job.outputPath && job.status !== "completed") reservedOutputPaths.delete(path.resolve(job.outputPath));
      job.cancel = null;
      activeConversions -= 1;
      schedule();
    }
  };

  const runScheduler = () => {
    schedulerPending = false;
    const queued = Array.from(jobs.values()).filter((job) => job.status === "queued");
    while (activeDownloads < downloadConcurrency) {
      const job = queued.find((item) => item.type === "download" && item.status === "queued");
      if (!job) break;
      activeDownloads += 1;
      job.status = "starting";
      void executeDownload(job);
    }
    while (activeConversions < 1) {
      const job = queued.find((item) => item.type === "conversion" && item.status === "queued");
      if (!job) break;
      activeConversions += 1;
      job.status = "starting";
      void executeConversion(job);
    }
  };

  function schedule() {
    if (schedulerPending) return;
    schedulerPending = true;
    queueMicrotask(runScheduler);
  }

  const createJob = (type, config, notifyProgress) => {
    const id = randomUUID();
    const job = {
      id, type, config, notify: notifyProgress, cancel: null, tempPath: "", outputPath: "", outputUrl: "",
      status: "queued", progress: 0, message: "Queued", error: "", name: config.name || "Audio",
      sourceLabel: config.sourceLabel || config.sourceUrl || config.name || "Audio", mimeType: "", size: 0,
      createdAt: new Date().toISOString(), startedAt: "", completedAt: "",
    };
    jobs.set(id, job);
    notify(job);
    return job;
  };

  return {
    async getCapabilities() {
      encoderProbe ||= probeEncoders();
      const encoders = await encoderProbe;
      return {
        ok: true,
        formats: AUDIO_FORMATS.filter((format) => encoders.has(format.encoder)).map((format) => ({
          id: format.id,
          label: format.label,
          extension: format.extension,
          mimeType: format.mimeType,
          lossy: format.lossy,
        })),
        defaultOutputDirectory: app.getPath("downloads"),
        maximumDownloadBytes: MAX_DOWNLOAD_BYTES,
        defaultDownloadConcurrency: 3,
      };
    },

    async chooseFiles() {
      const result = await dialog.showOpenDialog({
        title: "Choose audio files to convert",
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "Audio files", extensions: Array.from(AUDIO_MIME_BY_EXTENSION.keys(), (extension) => extension.slice(1)) }, { name: "All files", extensions: ["*"] }],
      });
      if (result.canceled || !result.filePaths.length) return { canceled: true, files: [] };
      const files = [];
      for (const filePath of result.filePaths.slice(0, MAX_CONVERSION_BATCH)) {
        const normalizedPath = path.resolve(filePath);
        const stat = await fs.stat(normalizedPath);
        if (!stat.isFile()) continue;
        selectedInputPaths.add(normalizedPath);
        files.push({ sourcePath: normalizedPath, name: path.basename(normalizedPath), size: stat.size, mimeType: AUDIO_MIME_BY_EXTENSION.get(path.extname(normalizedPath).toLowerCase()) || "application/octet-stream" });
      }
      return { ok: true, canceled: false, files };
    },

    async chooseOutputDirectory() {
      const result = await dialog.showOpenDialog({
        title: "Choose Audio Studio output folder",
        defaultPath: app.getPath("downloads"),
        properties: ["openDirectory", "createDirectory"],
      });
      if (result.canceled || !result.filePaths[0]) return { canceled: true };
      const directory = path.resolve(result.filePaths[0]);
      allowedOutputDirectories.add(directory);
      return { ok: true, canceled: false, directory };
    },

    async startConversions(payload = {}, notifyProgress) {
      const sources = Array.isArray(payload.files) ? payload.files.slice(0, MAX_CONVERSION_BATCH) : [];
      if (!sources.length) throw new Error("Choose at least one local audio file.");
      const formats = (await this.getCapabilities()).formats;
      if (!formats.some((format) => format.id === payload.formatId)) throw new Error("The selected output format is not available in this FFmpeg build.");
      const outputDirectory = resolveOutputDirectory(payload.outputDirectory);
      const created = [];
      for (const source of sources) {
        const sourcePath = path.resolve(String(source?.sourcePath || ""));
        if (!selectedInputPaths.has(sourcePath)) throw new Error("Choose conversion files through the Audio Studio file picker.");
        const stat = await fs.stat(sourcePath);
        if (!stat.isFile()) throw new Error("A selected audio source is no longer available.");
        created.push(createJob("conversion", {
          sourcePath, sourceLabel: path.basename(sourcePath), name: path.basename(sourcePath), outputDirectory,
          formatId: String(payload.formatId || "mp3"), bitrateKbps: payload.bitrateKbps, sampleRate: payload.sampleRate,
          channels: payload.channels, normalize: Boolean(payload.normalize),
        }, notifyProgress));
      }
      schedule();
      return { ok: true, jobs: created.map(publicJob) };
    },

    async startDownloads(payload = {}, notifyProgress) {
      if (!payload.rightsAccepted) throw new Error("Confirm that you have permission to download the requested audio.");
      const urls = [...new Set((Array.isArray(payload.urls) ? payload.urls : []).map((url) => String(url || "").trim()).filter(Boolean))].slice(0, MAX_DOWNLOAD_BATCH);
      if (!urls.length) throw new Error("Paste at least one audio link.");
      const outputDirectory = resolveOutputDirectory(payload.outputDirectory);
      downloadConcurrency = Math.round(clamp(payload.concurrency, 1, 5, 3));
      const created = [];
      for (const sourceUrl of urls) {
        await validateRemoteUrl(sourceUrl);
        const url = new URL(sourceUrl);
        const fallbackName = sanitizeAudioFilename(safeDecodeURIComponent(path.basename(url.pathname)) || url.hostname, "Audio");
        created.push(createJob("download", { sourceUrl: url.href, outputDirectory, name: fallbackName, sourceLabel: url.href }, notifyProgress));
      }
      schedule();
      return { ok: true, jobs: created.map(publicJob) };
    },

    listJobs() {
      return { ok: true, jobs: Array.from(jobs.values()).sort((first, second) => second.createdAt.localeCompare(first.createdAt)).map(publicJob) };
    },

    cancelJob(jobId) {
      const job = jobs.get(String(jobId || ""));
      if (!job) throw new Error("Audio Studio job not found.");
      if (["completed", "failed", "cancelled"].includes(job.status)) return publicJob(job);
      job.status = "cancelled";
      job.cancel?.();
      notify(job);
      schedule();
      return publicJob(job);
    },

    retryJob(jobId, notifyProgress) {
      const original = jobs.get(String(jobId || ""));
      if (!original || !["failed", "cancelled"].includes(original.status)) throw new Error("Only failed or cancelled Audio Studio jobs can be retried.");
      const retried = createJob(original.type, { ...original.config }, notifyProgress);
      schedule();
      return { ok: true, job: publicJob(retried) };
    },

    async revealOutput(filePath) {
      const normalizedPath = path.resolve(String(filePath || ""));
      if (!generatedOutputs.has(normalizedPath)) throw new Error("Only completed Audio Studio outputs can be revealed.");
      await fs.access(normalizedPath);
      shell.showItemInFolder(normalizedPath);
      return { ok: true };
    },
  };
}
