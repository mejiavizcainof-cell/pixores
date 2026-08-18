import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: ["src/video-maker/smart-reframe.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const { buildSmartReframe, resolveSmartReframeAtTime, sliceSmartReframe } = await import(moduleUrl);

const face = (trackId, centerX, area, mouthOpen, mouthMotion) => ({
  trackId,
  centerX,
  centerY: 0.42,
  width: area,
  height: area,
  confidence: 0.95,
  mouthOpen,
  mouthMotion,
});

const samples = [
  { time: 0, faces: [face("host", 0.32, 0.28, 0.05, 0), face("guest", 0.7, 0.22, 0.08, 0)] },
  { time: 0.25, faces: [face("host", 0.33, 0.28, 0.05, 0.01), face("guest", 0.69, 0.22, 0.82, 0.74)] },
  { time: 0.5, faces: [face("host", 0.34, 0.28, 0.04, 0.01), face("guest", 0.68, 0.22, 0.76, 0.67)] },
  { time: 0.75, faces: [face("host", 0.35, 0.28, 0.05, 0.01), face("guest", 0.66, 0.22, 0.68, 0.54)] },
];

const dynamic = buildSmartReframe(samples, {
  mode: "dynamic",
  preferActiveSpeaker: true,
  speechRanges: [{ start: 0.2, end: 0.8 }],
  duration: 1,
});
assert.ok(dynamic, "face samples must produce a dynamic reframe track");
assert.ok(dynamic.keyframes.some((keyframe) => keyframe.trackId === "guest"), "mouth movement must let the active speaker take focus");
assert.ok(dynamic.keyframes.every((keyframe) => keyframe.zoom >= 1 && keyframe.zoom <= 1.42), "automatic zoom must remain comfortable");

const staticReframe = buildSmartReframe(samples, {
  mode: "static",
  preferActiveSpeaker: false,
  duration: 1,
});
assert.equal(staticReframe.keyframes.length, 2, "static framing must hold one composition for the complete clip");
assert.equal(staticReframe.keyframes[0].trackId, "host", "static framing must prefer the most prominent face");

const middle = resolveSmartReframeAtTime(dynamic, 0.4);
assert.ok(middle.centerX > 0 && middle.centerX < 1, "reframe interpolation must stay in normalized coordinates");
const sliced = sliceSmartReframe(dynamic, 0.25, 0.5);
assert.equal(sliced.keyframes[0].time, 0, "a sliced Smart Clip must receive a boundary keyframe at zero");
assert.equal(sliced.keyframes.at(-1).time, 0.5, "a sliced Smart Clip must keep its ending reframe state");

const editorSource = await readFile("components/VideoMaker.tsx", "utf8");
assert.match(editorSource, /addAutomaticSmartClipCaptions\(sourceProject, platform, sessionId\)/, "Smart Clips must generate subtitles before segment rendering");
assert.match(editorSource, /analyzeFaceTracking\(/, "Smart Clips must run local face analysis");
assert.match(editorSource, /preferActiveSpeaker:\s*smartClipSpeakerSelection/, "Smart Clips must expose automatic speaker selection");
assert.match(editorSource, /className=\{styles\.smartClipSourceCard\}/, "Smart Clips must begin with an explicit master-video selection step");
assert.match(editorSource, /smartClipSourceProjectRef\.current/, "Smart Clips must keep the local master isolated from the editor timeline");
const platformSelectionSource = editorSource.slice(
  editorSource.indexOf("function selectSmartClipPlatform"),
  editorSource.indexOf("function openAudioAiDialog"),
);
assert.doesNotMatch(platformSelectionSource, /setIsSmartClipsDialogOpen\(false\)/, "choosing a platform must keep the local configuration and enhancements visible");

const renderSource = await readFile("src/video-render/remotion/PixoresComposition.tsx", "utf8");
assert.match(renderSource, /resolveSmartReframeAtTime\(layer\.smartReframe, currentTime\)/, "the final renderer must interpolate the face trajectory");
const desktopRenderSource = await readFile("desktop/electron/services/render-adapter.mjs", "utf8");
assert.match(desktopRenderSource, /layer\.smartReframe\?\.keyframes/, "face-tracked clips must use the compositor instead of an incompatible fast path");

console.log("Smart Clips subtitles, static framing, smooth face tracking, speaker selection, slicing, and render integration tests passed.");
