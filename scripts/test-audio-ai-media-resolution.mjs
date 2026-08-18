import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveLocalMediaPath } from "../desktop/electron/services/audio-ai.mjs";
import { mediaUrlFromPath } from "../desktop/electron/media-url.mjs";

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pixores-audio-ai-path-"));
const mediaPath = path.join(directory, "selected clip.mp4");
try {
  await fs.writeFile(mediaPath, "fixture");
  const persistentUrl = mediaUrlFromPath(mediaPath);
  assert.equal(
    await resolveLocalMediaPath({ sourceUrl: "blob:preview", sourceUrls: ["blob:preview", persistentUrl] }),
    mediaPath,
    "Audio AI must fall back from a preview URL to the persistent Pixores media URL",
  );
  assert.equal(
    await resolveLocalMediaPath({ sourceUrl: mediaPath }),
    mediaPath,
    "Audio AI must accept a trusted absolute desktop media path",
  );
  await assert.rejects(
    resolveLocalMediaPath({ sourceUrl: "blob:preview" }),
    /Select local media imported/,
    "temporary-only media must still produce a clear relink error",
  );

  const editorSource = await fs.readFile("components/VideoMaker.tsx", "utf8");
  assert.match(editorSource, /function getAudioAiSources[\s\S]*imported\?\.persistentUrl/);
  assert.match(editorSource, /async function prepareAudioAiSources[\s\S]*await prepareProjectMediaForRender\(\)/);
  assert.match(editorSource, /const sourceUrls = await prepareAudioAiSources\(layer\)/);
  assert.match(editorSource, /transcribeMedia\(\{[\s\S]*sourceUrls,/);
  assert.match(editorSource, /detectSilences\(\{[\s\S]*sourceUrls,/);
  console.log("Audio AI persistent media resolution tests passed.");
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
