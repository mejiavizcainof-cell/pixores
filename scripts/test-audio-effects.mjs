import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { buildNativeAudioFilters } from "../desktop/electron/services/render-adapter.mjs";

const require = createRequire(import.meta.url);
const ffmpegPath = require("ffmpeg-static");
const filter = buildNativeAudioFilters({
  duration: 1,
  volume: 0.8,
  audioFadeIn: 0.1,
  audioFadeOut: 0.1,
  audioEffects: {
    highPassHz: 80,
    humRemovalHz: 60,
    noiseReduction: 0.4,
    deEsser: 0.3,
    lowGainDb: 2,
    midGainDb: 1,
    highGainDb: -1,
    compressor: 0.5,
    normalize: true,
    pan: 0.2,
    echoEnabled: true,
    echoDelayMs: 120,
    echoDecay: 0.2,
    reverb: "studio",
    limiter: true,
  },
}, 48000);
assert.match(filter, /afftdn/);
assert.match(filter, /loudnorm/);
assert.match(filter, /aecho/);
const result = spawnSync(ffmpegPath, [
  "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=1000:duration=1",
  "-af", filter, "-f", "null", "-",
], { encoding: "utf8" });
assert.equal(result.status, 0, result.stderr);
console.log("Audio effect chain test passed.");
