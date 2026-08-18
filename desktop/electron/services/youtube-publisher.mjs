import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const API_ROOT = "https://www.googleapis.com/youtube/v3";
const UPLOAD_ROOT = "https://www.googleapis.com/upload/youtube/v3";
const CHUNK_SIZE = 8 * 1024 * 1024;

function base64Url(bytes) {
  return Buffer.from(bytes).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function buildYouTubeVideoResource(input = {}) {
  const tags = Array.isArray(input.tags)
    ? input.tags
    : String(input.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
  return {
    snippet: {
      title: String(input.title || "Untitled video").trim().slice(0, 100),
      description: String(input.description || "").slice(0, 5000),
      tags: tags.slice(0, 60),
      categoryId: String(input.categoryId || "22"),
      defaultLanguage: input.defaultLanguage || undefined,
    },
    status: {
      privacyStatus: ["public", "unlisted"].includes(input.privacyStatus) ? input.privacyStatus : "private",
      selfDeclaredMadeForKids: Boolean(input.madeForKids),
      embeddable: true,
    },
  };
}

export function getYouTubeChunkRange(offset, total, chunkSize = CHUNK_SIZE) {
  const start = Math.max(0, Number(offset) || 0);
  const endExclusive = Math.min(total, start + chunkSize);
  return { start, endExclusive, end: Math.max(start, endExclusive - 1), length: Math.max(0, endExclusive - start) };
}

export function getYouTubeUploadedOffset(rangeHeader) {
  const end = String(rangeHeader || "").match(/bytes=0-(\d+)/i)?.[1];
  return end === undefined ? 0 : Number(end) + 1;
}

async function readJsonResponse(response, context) {
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
  if (!response.ok) {
    const reason = payload?.error?.message || payload?.message || `${response.status} ${response.statusText}`;
    throw new Error(`${context}: ${reason}`);
  }
  return payload;
}

export function createYouTubePublisher({ app, dialog, safeStorage, shell, fetchImpl = fetch }) {
  const configPath = path.join(app.getPath("userData"), "youtube-publisher.json");
  const tokenPath = path.join(app.getPath("userData"), "youtube-token.bin");
  const jobs = new Map();
  let volatileTokens = null;

  async function readConfig() {
    try { return JSON.parse(await fs.readFile(configPath, "utf8")); } catch { return {}; }
  }

  async function saveConfig(config) {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
  }

  async function readTokens() {
    if (volatileTokens) return volatileTokens;
    try {
      const encrypted = await fs.readFile(tokenPath);
      if (!safeStorage.isEncryptionAvailable()) return null;
      volatileTokens = JSON.parse(safeStorage.decryptString(encrypted));
      return volatileTokens;
    } catch { return null; }
  }

  async function saveTokens(tokens) {
    volatileTokens = tokens;
    if (!safeStorage.isEncryptionAvailable()) return false;
    await fs.mkdir(path.dirname(tokenPath), { recursive: true });
    await fs.writeFile(tokenPath, safeStorage.encryptString(JSON.stringify(tokens)));
    return true;
  }

  async function clearTokens() {
    volatileTokens = null;
    await fs.rm(tokenPath, { force: true });
  }

  async function getClientId(override) {
    const config = await readConfig();
    const clientId = String(override || process.env.PIXORES_YOUTUBE_CLIENT_ID || config.clientId || "").trim();
    if (!clientId) throw new Error("YouTube OAuth Client ID is not configured. Add the Desktop OAuth Client ID from Google Cloud.");
    if (override && override !== config.clientId) await saveConfig({ ...config, clientId: override });
    return clientId;
  }

  async function getStatus() {
    const config = await readConfig();
    const tokens = await readTokens();
    return {
      ok: true,
      configured: Boolean(process.env.PIXORES_YOUTUBE_CLIENT_ID || config.clientId),
      clientId: process.env.PIXORES_YOUTUBE_CLIENT_ID ? "Managed by Pixores" : String(config.clientId || ""),
      connected: Boolean(tokens?.refresh_token || tokens?.access_token),
      secureStorage: safeStorage.isEncryptionAvailable(),
    };
  }

  async function exchangeToken(parameters) {
    const response = await fetchImpl(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(parameters),
    });
    return readJsonResponse(response, "YouTube authorization failed");
  }

  async function connect(payload = {}) {
    const clientId = await getClientId(payload.clientId);
    const state = base64Url(crypto.randomBytes(24));
    const verifier = base64Url(crypto.randomBytes(48));
    const challenge = base64Url(crypto.createHash("sha256").update(verifier).digest());
    let callbackServer;
    let timeoutId;
    const callback = new Promise((resolve, reject) => {
      callbackServer = http.createServer((request, response) => {
        const url = new URL(request.url || "/", "http://127.0.0.1");
        if (url.pathname !== "/oauth2/callback") {
          response.writeHead(404).end();
          return;
        }
        const error = url.searchParams.get("error");
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");
        if (error || !code || returnedState !== state) {
          response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
          response.end("<h2>Pixores could not connect to YouTube.</h2><p>You can close this window.</p>");
          reject(new Error(error || "The YouTube authorization response was invalid."));
          return;
        }
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end("<h2>YouTube connected to Pixores.</h2><p>You can close this window and return to Pixores.</p>");
        resolve(code);
      });
      callbackServer.listen(0, "127.0.0.1");
      timeoutId = setTimeout(() => reject(new Error("YouTube authorization timed out.")), 5 * 60 * 1000);
    });
    try {
      await new Promise((resolve, reject) => {
        callbackServer.once("listening", resolve);
        callbackServer.once("error", reject);
      });
      const address = callbackServer.address();
      const redirectUri = `http://127.0.0.1:${address.port}/oauth2/callback`;
      const authorizationUrl = new URL(AUTH_ENDPOINT);
      authorizationUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: YOUTUBE_SCOPE,
        access_type: "offline",
        prompt: "consent",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
      }).toString();
      await shell.openExternal(authorizationUrl.toString());
      const code = await callback;
      const tokenResponse = await exchangeToken({
        client_id: clientId,
        code,
        code_verifier: verifier,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      });
      const storedSecurely = await saveTokens({
        ...tokenResponse,
        expires_at: Date.now() + Math.max(60, Number(tokenResponse.expires_in) || 3600) * 1000,
      });
      return { ok: true, connected: true, secureStorage: storedSecurely };
    } finally {
      clearTimeout(timeoutId);
      callbackServer?.close();
    }
  }

  async function getAccessToken() {
    const clientId = await getClientId();
    const tokens = await readTokens();
    if (!tokens) throw new Error("Connect a YouTube account before publishing.");
    if (tokens.access_token && Number(tokens.expires_at) > Date.now() + 60_000) return tokens.access_token;
    if (!tokens.refresh_token) throw new Error("The YouTube session expired. Connect the account again.");
    const refreshed = await exchangeToken({ client_id: clientId, refresh_token: tokens.refresh_token, grant_type: "refresh_token" });
    const nextTokens = {
      ...tokens,
      ...refreshed,
      refresh_token: refreshed.refresh_token || tokens.refresh_token,
      expires_at: Date.now() + Math.max(60, Number(refreshed.expires_in) || 3600) * 1000,
    };
    await saveTokens(nextTokens);
    return nextTokens.access_token;
  }

  async function chooseVideo() {
    const result = await dialog.showOpenDialog({ title: "Choose a video to publish on YouTube", properties: ["openFile"], filters: [{ name: "Video", extensions: ["mp4", "mov", "m4v", "webm"] }] });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    return { ok: true, canceled: false, filePath: result.filePaths[0] };
  }

  async function uploadThumbnail(accessToken, videoId, thumbnail) {
    if (!thumbnail?.bytes?.length) return;
    const response = await fetchImpl(`${UPLOAD_ROOT}/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": thumbnail.mimeType || "image/jpeg" },
      body: Buffer.from(thumbnail.bytes),
    });
    await readJsonResponse(response, "YouTube thumbnail upload failed");
  }

  async function pollProcessing(accessToken, videoId, signal, onProgress) {
    for (let attempt = 0; attempt < 180; attempt += 1) {
      if (signal.aborted) throw new Error("YouTube publishing cancelled.");
      const response = await fetchImpl(`${API_ROOT}/videos?part=status,processingDetails&id=${encodeURIComponent(videoId)}`, { headers: { authorization: `Bearer ${accessToken}` }, signal });
      const payload = await readJsonResponse(response, "YouTube processing status failed");
      const item = payload.items?.[0];
      const processingStatus = item?.processingDetails?.processingStatus || item?.status?.uploadStatus || "processing";
      const progress = Number(item?.processingDetails?.processingProgress?.partsProcessed || 0);
      const total = Number(item?.processingDetails?.processingProgress?.partsTotal || 0);
      onProgress({ stage: "processing", progress: total > 0 ? 95 + Math.min(4, (progress / total) * 4) : 96, message: `YouTube processing: ${processingStatus}`, videoId });
      if (["succeeded", "processed"].includes(processingStatus)) return item;
      if (["failed", "terminated", "rejected", "deleted"].includes(processingStatus)) throw new Error(`YouTube processing ended with status: ${processingStatus}`);
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 10_000);
        signal.addEventListener("abort", () => { clearTimeout(timeout); reject(new Error("YouTube publishing cancelled.")); }, { once: true });
      });
    }
    throw new Error("YouTube is still processing the video. Check YouTube Studio for its final status.");
  }

  async function publish(payload, onProgress) {
    const jobId = String(payload.jobId || crypto.randomUUID());
    const controller = new AbortController();
    jobs.set(jobId, controller);
    try {
      const videoPath = path.resolve(String(payload.videoPath || ""));
      const stat = await fs.stat(videoPath);
      if (!stat.isFile()) throw new Error("The selected video file is unavailable.");
      const accessToken = await getAccessToken();
      const resource = buildYouTubeVideoResource(payload);
      onProgress({ jobId, stage: "starting", progress: 1, message: "Starting resumable YouTube upload..." });
      const initResponse = await fetchImpl(`${UPLOAD_ROOT}/videos?uploadType=resumable&part=snippet,status`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json; charset=UTF-8",
          "x-upload-content-length": String(stat.size),
          "x-upload-content-type": payload.mimeType || "video/mp4",
        },
        body: JSON.stringify(resource),
        signal: controller.signal,
      });
      if (!initResponse.ok) await readJsonResponse(initResponse, "YouTube could not start the upload");
      const sessionUrl = initResponse.headers.get("location");
      if (!sessionUrl) throw new Error("YouTube did not return a resumable upload session.");
      const handle = await fs.open(videoPath, "r");
      let offset = 0;
      let videoResponse;
      let transientFailures = 0;
      try {
        while (offset < stat.size) {
          const range = getYouTubeChunkRange(offset, stat.size);
          const buffer = Buffer.allocUnsafe(range.length);
          const { bytesRead } = await handle.read(buffer, 0, range.length, range.start);
          const response = await fetchImpl(sessionUrl, {
            method: "PUT",
            headers: {
              "content-length": String(bytesRead),
              "content-range": `bytes ${range.start}-${range.start + bytesRead - 1}/${stat.size}`,
              "content-type": payload.mimeType || "video/mp4",
            },
            body: buffer.subarray(0, bytesRead),
            signal: controller.signal,
          });
          if (response.status === 429 || response.status >= 500) {
            transientFailures += 1;
            if (transientFailures > 6) await readJsonResponse(response, "YouTube upload could not resume");
            await new Promise((resolve) => setTimeout(resolve, Math.min(16_000, 500 * (2 ** transientFailures))));
            const resumeResponse = await fetchImpl(sessionUrl, {
              method: "PUT",
              headers: { "content-length": "0", "content-range": `bytes */${stat.size}` },
              signal: controller.signal,
            });
            if (resumeResponse.status === 308) {
              offset = getYouTubeUploadedOffset(resumeResponse.headers.get("range"));
              continue;
            }
            videoResponse = await readJsonResponse(resumeResponse, "YouTube upload status could not be recovered");
            offset = stat.size;
            continue;
          }
          transientFailures = 0;
          if (response.status === 308) {
            const receivedOffset = getYouTubeUploadedOffset(response.headers.get("range"));
            offset = receivedOffset || range.start + bytesRead;
          } else {
            videoResponse = await readJsonResponse(response, "YouTube video upload failed");
            offset = stat.size;
          }
          onProgress({ jobId, stage: "uploading", progress: Math.max(2, Math.min(94, (offset / stat.size) * 94)), uploadedBytes: offset, totalBytes: stat.size, message: `Uploading to YouTube - ${Math.round((offset / stat.size) * 100)}%` });
        }
      } finally {
        await handle.close();
      }
      const videoId = videoResponse?.id;
      if (!videoId) throw new Error("YouTube received the file but did not return a video ID.");
      if (payload.thumbnail?.bytes?.length) {
        onProgress({ jobId, stage: "thumbnail", progress: 95, message: "Uploading custom thumbnail...", videoId });
        await uploadThumbnail(accessToken, videoId, payload.thumbnail);
      }
      const processing = await pollProcessing(accessToken, videoId, controller.signal, (progress) => onProgress({ jobId, ...progress }));
      const result = { ok: true, jobId, videoId, url: `https://www.youtube.com/watch?v=${videoId}`, processingStatus: processing?.processingDetails?.processingStatus || "succeeded" };
      onProgress({ jobId, stage: "completed", progress: 100, message: "YouTube upload and processing completed.", videoId, url: result.url });
      return result;
    } finally {
      jobs.delete(jobId);
    }
  }

  return {
    getStatus,
    configure: async (payload) => {
      const clientId = String(payload?.clientId || "").trim();
      if (!clientId.endsWith(".apps.googleusercontent.com")) {
        throw new Error("Enter a valid Google OAuth Desktop Client ID.");
      }
      await saveConfig({ ...(await readConfig()), clientId });
      return getStatus();
    },
    connect,
    disconnect: async () => { await clearTokens(); return getStatus(); },
    chooseVideo,
    publish,
    cancel: async (jobId) => { const controller = jobs.get(String(jobId)); controller?.abort(); return { ok: true, cancelled: Boolean(controller) }; },
  };
}
