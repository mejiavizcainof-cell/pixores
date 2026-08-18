import assert from "node:assert/strict";
import { estimateAudioOffset } from "../desktop/electron/services/audio-sync.mjs";

const rate = 20;
const reference = Array.from({ length: 240 }, (_, index) => Math.sin(index * 0.31) + Math.cos(index * 0.071) * 0.6);
const target = [...Array(34).fill(0), ...reference, ...Array(20).fill(0)];
const result = estimateAudioOffset(reference, target, rate, 10);
assert.ok(Math.abs(result.targetStartDeltaSeconds + 1.7) < 0.051, JSON.stringify(result));
assert.ok(result.confidence > 0.9, JSON.stringify(result));
console.log("Audio synchronization correlation test passed.", result);
