import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { resolveLocalMediaPath } from "./audio-ai.mjs";

const runtimeRequire = createRequire(import.meta.url);

function resolveFfmpegPath() {
  const packagePath = String(runtimeRequire("ffmpeg-static"));
  return packagePath.includes(`${path.sep}app.asar${path.sep}`)
    ? packagePath.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`)
    : packagePath;
}

async function extractEnvelope(inputPath, sourceStart = 0, duration = 180) {
  const sampleRate = 8000;
  const windowSamples = 400;
  const bytes = await new Promise((resolve, reject) => {
    const child = spawn(resolveFfmpegPath(), [
      "-hide_banner", "-loglevel", "error", "-ss", String(Math.max(0, Number(sourceStart) || 0)),
      "-t", String(Math.max(2, Math.min(600, Number(duration) || 180))), "-i", inputPath,
      "-vn", "-ac", "1", "-ar", String(sampleRate), "-f", "s16le", "pipe:1",
    ], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(stderr || `FFmpeg exited with ${code}`)));
  });
  const values = [];
  for (let byteOffset = 0; byteOffset + windowSamples * 2 <= bytes.length; byteOffset += windowSamples * 2) {
    let energy = 0;
    for (let index = 0; index < windowSamples; index += 1) energy += Math.abs(bytes.readInt16LE(byteOffset + index * 2));
    values.push(Math.log1p(energy / windowSamples));
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  return { values: values.map((value) => value - mean), samplesPerSecond: sampleRate / windowSamples };
}

export function estimateAudioOffset(reference, target, samplesPerSecond, maxOffsetSeconds = 120) {
  const maxShift = Math.min(Math.floor(maxOffsetSeconds * samplesPerSecond), Math.max(reference.length, target.length) - 1);
  let best = { score: -1, shift: 0, overlap: 0 };
  for (let shift = -maxShift; shift <= maxShift; shift += 1) {
    const referenceStart = Math.max(0, -shift);
    const targetStart = Math.max(0, shift);
    const overlap = Math.min(reference.length - referenceStart, target.length - targetStart);
    if (overlap < samplesPerSecond * 3) continue;
    let dot = 0;
    let refPower = 0;
    let targetPower = 0;
    for (let index = 0; index < overlap; index += 1) {
      const left = reference[referenceStart + index];
      const right = target[targetStart + index];
      dot += left * right;
      refPower += left * left;
      targetPower += right * right;
    }
    const score = dot / Math.sqrt(Math.max(1e-9, refPower * targetPower));
    if (score > best.score) best = { score, shift, overlap };
  }
  return {
    targetStartDeltaSeconds: Number((-best.shift / samplesPerSecond).toFixed(3)),
    confidence: Number(Math.max(0, Math.min(1, best.score)).toFixed(3)),
    comparedSeconds: Number((best.overlap / samplesPerSecond).toFixed(2)),
  };
}

export function createAudioSyncHandlers() {
  return {
    async synchronize(payload) {
      const [referencePath, targetPath] = await Promise.all([
        resolveLocalMediaPath(payload?.reference),
        resolveLocalMediaPath(payload?.target),
      ]);
      const duration = Math.max(10, Math.min(300, Number(payload?.duration) || 180));
      const [reference, target] = await Promise.all([
        extractEnvelope(referencePath, payload?.reference?.sourceStart, duration),
        extractEnvelope(targetPath, payload?.target?.sourceStart, duration),
      ]);
      const result = estimateAudioOffset(reference.values, target.values, reference.samplesPerSecond, payload?.maxOffsetSeconds || 120);
      if (result.confidence < 0.18) throw new Error("Pixores could not find a reliable waveform match. Choose clips that share at least three seconds of the same sound.");
      return { ok: true, ...result };
    },
  };
}
