import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildYouTubeVideoResource,
  createYouTubePublisher,
  getYouTubeChunkRange,
  getYouTubeUploadedOffset,
} from "../desktop/electron/services/youtube-publisher.mjs";

const resource = buildYouTubeVideoResource({
  title: `  ${"A".repeat(120)}  `,
  description: "Pixores upload",
  tags: " editor, video, ,youtube ",
  categoryId: "27",
  privacyStatus: "unlisted",
  madeForKids: true,
});

assert.equal(resource.snippet.title.length, 100);
assert.deepEqual(resource.snippet.tags, ["editor", "video", "youtube"]);
assert.equal(resource.snippet.categoryId, "27");
assert.equal(resource.status.privacyStatus, "unlisted");
assert.equal(resource.status.selfDeclaredMadeForKids, true);
assert.equal(buildYouTubeVideoResource({ privacyStatus: "invalid" }).status.privacyStatus, "private");

assert.deepEqual(getYouTubeChunkRange(0, 20, 8), { start: 0, endExclusive: 8, end: 7, length: 8 });
assert.deepEqual(getYouTubeChunkRange(16, 20, 8), { start: 16, endExclusive: 20, end: 19, length: 4 });
assert.equal(getYouTubeUploadedOffset("bytes=0-8388607"), 8388608);
assert.equal(getYouTubeUploadedOffset(null), 0);

const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pixores-youtube-test-"));
try {
  const videoPath = path.join(temporaryRoot, "test.mp4");
  await fs.writeFile(videoPath, Buffer.from("pixores-video"));
  await fs.writeFile(path.join(temporaryRoot, "youtube-publisher.json"), JSON.stringify({ clientId: "test.apps.googleusercontent.com" }));
  await fs.writeFile(path.join(temporaryRoot, "youtube-token.bin"), JSON.stringify({ access_token: "test-token", expires_at: Date.now() + 600_000 }));
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), method: options.method || "GET", headers: options.headers });
    if (String(url).includes("upload/youtube/v3/videos")) return new Response("", { status: 200, headers: { location: "https://upload.test/session" } });
    if (String(url) === "https://upload.test/session") return Response.json({ id: "pixores123" });
    if (String(url).includes("youtube/v3/videos?part=status")) return Response.json({ items: [{ status: { uploadStatus: "processed" }, processingDetails: { processingStatus: "succeeded" } }] });
    throw new Error(`Unexpected request: ${url}`);
  };
  const publisher = createYouTubePublisher({
    app: { getPath: () => temporaryRoot },
    dialog: {},
    safeStorage: { isEncryptionAvailable: () => true, encryptString: (value) => Buffer.from(value), decryptString: (value) => Buffer.from(value).toString("utf8") },
    shell: {},
    fetchImpl,
  });
  const events = [];
  const result = await publisher.publish({ jobId: "job-1", videoPath, title: "Test", categoryId: "22", privacyStatus: "private" }, (event) => events.push(event));
  assert.equal(result.videoId, "pixores123");
  assert.equal(result.url, "https://www.youtube.com/watch?v=pixores123");
  assert.equal(events.at(-1).stage, "completed");
  assert.deepEqual(requests.map(({ method }) => method), ["POST", "PUT", "GET"]);
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}

console.log("YouTube publisher metadata, resumable ranges, and upload workflow passed.");
