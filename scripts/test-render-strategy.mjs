import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { inspectDesktopRenderStrategy } from "../desktop/electron/services/render-adapter.mjs";

const existingMediaUrl = pathToFileURL(import.meta.filename).href;

function videoLayer({ id, start, duration, trackId }) {
  return {
    id,
    name: id,
    type: "media",
    mediaKind: "video",
    assetKey: id,
    start,
    duration,
    trackId,
    visible: true,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    angle: 0,
    opacity: 1,
    volume: 1,
    objectFit: "cover",
  };
}

function overlayLayer({ id, start, duration }) {
  return {
    id,
    name: id,
    type: "lower-third",
    start,
    duration,
    trackId: `${id}-track`,
    visible: true,
  };
}

function projectWith({ duration, layers }) {
  const videoLayers = layers.filter((layer) => layer.type === "media");
  return {
    duration,
    background: "#000000",
    canvas: { width: 2560, height: 1440 },
    layers,
    assets: videoLayers.map((layer) => ({
      id: layer.assetKey,
      name: layer.name,
      kind: "video",
      persistentUrl: existingMediaUrl,
    })),
    transitions: [],
  };
}

const crossTrackProject = projectWith({
  duration: 941.8,
  layers: [
    overlayLayer({ id: "social-pill", start: 0, duration: 8.661 }),
    videoLayer({ id: "main-video", start: 0, duration: 933.8, trackId: "track-a" }),
    videoLayer({ id: "outro-video", start: 933.8, duration: 8, trackId: "track-b" }),
  ],
});
const crossTrackStrategy = await inspectDesktopRenderStrategy(crossTrackProject, { includeAudio: true, fps: 30 });
assert.equal(crossTrackStrategy.strategy, "segmented-hybrid");
assert.equal(crossTrackStrategy.segmentCount, 2);
// Segment boundaries are aligned to whole frames, so the 8.661 s overlay
// occupies 8.667 s at 30 fps.
assert.ok(crossTrackStrategy.compositorDuration <= 8.7);
assert.ok(crossTrackStrategy.nativeDuration > 933);

const singleVideoProject = projectWith({
  duration: 120,
  layers: [
    overlayLayer({ id: "intro-title", start: 0, duration: 5 }),
    videoLayer({ id: "single-video", start: 0, duration: 120, trackId: "track-a" }),
  ],
});
const singleVideoStrategy = await inspectDesktopRenderStrategy(singleVideoProject, { includeAudio: true, fps: 30 });
assert.equal(singleVideoStrategy.strategy, "segmented-hybrid");
assert.ok(singleVideoStrategy.nativeDuration >= 115);

const fullOverlayProject = projectWith({
  duration: 120,
  layers: [
    overlayLayer({ id: "full-title", start: 0, duration: 120 }),
    videoLayer({ id: "single-video", start: 0, duration: 120, trackId: "track-a" }),
  ],
});
const fullOverlayStrategy = await inspectDesktopRenderStrategy(fullOverlayProject, { includeAudio: true, fps: 30 });
assert.equal(fullOverlayStrategy.strategy, "hybrid-compositor");
assert.equal(fullOverlayStrategy.nativeDuration, 120);

const nativeProject = projectWith({
  duration: 20,
  layers: [
    videoLayer({ id: "clip-a", start: 0, duration: 10, trackId: "track-a" }),
    videoLayer({ id: "clip-b", start: 10, duration: 10, trackId: "track-b" }),
  ],
});
const nativeStrategy = await inspectDesktopRenderStrategy(nativeProject, { includeAudio: true, fps: 30 });
assert.equal(nativeStrategy.strategy, "native");

console.log("Render strategy tests passed", {
  crossTrackStrategy,
  singleVideoStrategy,
  fullOverlayStrategy,
  nativeStrategy,
});
