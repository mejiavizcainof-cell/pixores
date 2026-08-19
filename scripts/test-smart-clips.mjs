import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: ["src/video-maker/smart-clips.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const {
  createLocalSmartClipTitle,
  createSmartClipProject,
  createSmartClipSegments,
  createSmartClipSourceProject,
  generateLocalSmartClipCandidates,
  getSmartClipPlatform,
  SmartClipExportCoordinator,
} = await import(moduleUrl);

const templateBundle = await build({
  entryPoints: ["src/video-maker/caption-style-presets.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const templateModuleUrl = `data:text/javascript;base64,${Buffer.from(templateBundle.outputFiles[0].text).toString("base64")}`;
const {
  SMART_CLIP_CAPTION_TEMPLATES,
  applySmartClipCaptionTemplate,
  createSmartClipCaptionStyle,
} = await import(templateModuleUrl);

const layoutBundle = await build({
  entryPoints: ["src/video-maker/caption-layout.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const layoutModuleUrl = `data:text/javascript;base64,${Buffer.from(layoutBundle.outputFiles[0].text).toString("base64")}`;
const {
  SMART_CLIP_CAPTION_SIZE_DEFAULT,
  SMART_CLIP_CAPTION_SIZE_MAX,
  SMART_CLIP_CAPTION_SIZE_MIN,
  clampSmartClipCaptionSize,
  getProfessionalCaptionLayout,
} = await import(layoutModuleUrl);

const topCaptionLayout = getProfessionalCaptionLayout(1080, 1920, "top");
const middleCaptionLayout = getProfessionalCaptionLayout(1080, 1920, "middle");
const bottomCaptionLayout = getProfessionalCaptionLayout(1080, 1920, "bottom");
assert.ok(
  topCaptionLayout.y < middleCaptionLayout.y && middleCaptionLayout.y < bottomCaptionLayout.y,
  "Smart Clips must provide distinct top, middle and bottom subtitle safe zones",
);
assert.equal(bottomCaptionLayout.y, 74, "vertical Smart Clip subtitles must default lower than the previous y: 67 position");
assert.ok(bottomCaptionLayout.y + bottomCaptionLayout.height <= 94, "bottom subtitles must remain inside a safe canvas area");
const defaultLargeCaptionLayout = getProfessionalCaptionLayout(1080, 1920, "bottom", SMART_CLIP_CAPTION_SIZE_DEFAULT);
const maximumCaptionLayout = getProfessionalCaptionLayout(1080, 1920, "bottom", SMART_CLIP_CAPTION_SIZE_MAX);
assert(defaultLargeCaptionLayout.fontSize > bottomCaptionLayout.fontSize, "Smart Clip subtitles must start larger than the previous default");
assert(maximumCaptionLayout.fontSize >= defaultLargeCaptionLayout.fontSize, "the size control must allow a visibly larger safe caption");
assert.equal(clampSmartClipCaptionSize(10), SMART_CLIP_CAPTION_SIZE_MIN);
assert.equal(clampSmartClipCaptionSize(999), SMART_CLIP_CAPTION_SIZE_MAX);
for (const [canvasWidth, canvasHeight] of [[1080, 1920], [1080, 1080], [1920, 1080], [320, 7680], [7680, 320]]) {
  for (const position of ["top", "middle", "bottom"]) {
    const layout = getProfessionalCaptionLayout(canvasWidth, canvasHeight, position, SMART_CLIP_CAPTION_SIZE_MAX);
    const canvasScale = canvasWidth / 1280;
    const availableWidth = canvasWidth * (layout.width / 100);
    const availableHeight = canvasHeight * (Math.max(4, 96 - layout.y) / 100);
    const physicalFontSize = layout.fontSize * canvasScale;
    const maxCharacters = canvasHeight / canvasWidth >= 1.3 ? 34 : 44;
    const estimatedLines = Math.max(1, Math.min(4, Math.ceil((maxCharacters * physicalFontSize * 0.62) / Math.max(1, availableWidth))));
    const estimatedHeight = estimatedLines * physicalFontSize * layout.lineHeight + layout.textBgPadding * canvasScale * 2;
    assert(layout.x >= 0 && layout.x + layout.width <= 100, `caption width must stay inside ${canvasWidth}x${canvasHeight}`);
    assert(layout.y >= 0 && layout.y + layout.height <= 100, `caption position must stay inside ${canvasWidth}x${canvasHeight}`);
    assert(estimatedHeight <= availableHeight + 1, `maximum caption size must fit ${position} in ${canvasWidth}x${canvasHeight}`);
  }
}

assert.equal(SMART_CLIP_CAPTION_TEMPLATES.length, 9, "Smart Clips must offer None plus eight caption templates");
assert.equal(SMART_CLIP_CAPTION_TEMPLATES[0].id, "none", "the first template must let creators opt out");
assert.deepEqual(
  SMART_CLIP_CAPTION_TEMPLATES.slice(1).map((template) => template.id),
  ["classic", "minimal", "yellow", "clean", "brand", "outline", "neon", "cinema"],
  "Smart Clips must expose every normal caption style as a template",
);
const customCaption = {
  id: "template-caption", trackId: "captions", type: "text", name: "Caption 1",
  start: 0, duration: 1, visible: true, locked: false, opacity: 1,
  x: 10, y: 65, width: 80, height: 20, text: "Template test",
  fontFamily: "Georgia", color: "#ff0000", hasTextBg: false, glowRadius: 17,
};
assert.equal(
  applySmartClipCaptionTemplate(customCaption, "none"),
  customCaption,
  "None must preserve an existing editable caption without cloning or restyling it",
);
const neonCaption = applySmartClipCaptionTemplate(customCaption, "neon");
assert.deepEqual(
  {
    fontFamily: neonCaption.fontFamily,
    color: neonCaption.color,
    background: neonCaption.textBgColor,
    effect: neonCaption.textEffectPreset,
    glow: neonCaption.glowRadius,
  },
  { fontFamily: "Montserrat", color: "#ecfeff", background: "#172033", effect: "neon", glow: 22 },
  "a selected Smart Clip template must apply its font, colors, background and effect",
);
const generatedCreatorStyle = createSmartClipCaptionStyle("yellow", {
  x: 7, y: 67, width: 86, height: 18, fontSize: 52,
  textBgPadding: 12, textBgRadius: 12, lineHeight: 1.08, letterSpacing: 0.2,
});
assert.deepEqual(
  {
    fontFamily: generatedCreatorStyle.fontFamily,
    color: generatedCreatorStyle.color,
    background: generatedCreatorStyle.textBgColor,
    uppercase: generatedCreatorStyle.isUppercase,
  },
  { fontFamily: "Anton", color: "#facc15", background: "#050505", uppercase: true },
  "newly generated captions must inherit the selected template",
);
assert.equal(generatedCreatorStyle.fontSize, 52, "the safe Smart Clip size must override a template font-size default");

const coordinator = new SmartClipExportCoordinator();
assert.equal(coordinator.tryStart("batch-a"), true, "the first Smart Clips batch must acquire the synchronous lock");
assert.equal(coordinator.tryStart("batch-b"), false, "a repeated click must not start a second batch");
coordinator.registerRender("batch-a", "render-1");
assert.deepEqual(coordinator.requestCancel(), ["render-1"], "cancel must include every render registered by the active batch");
assert.equal(coordinator.shouldCancel("batch-a"), true, "the active batch must observe cancellation immediately");
assert.equal(coordinator.finish("batch-b"), false, "a stale batch must not release another batch's lock");
assert.equal(coordinator.finish("batch-a"), true, "the active batch must release its lock");
assert.equal(coordinator.tryStart("batch-b"), true, "a new batch may start after the previous batch releases the lock");
coordinator.finish("batch-b");

const segments = createSmartClipSegments(548, 60);
assert.equal(segments.length, 10, "9:08 should create ten one-minute clips");
assert.equal(segments.at(-1).duration, 8, "the last clip should keep the remaining duration");

const localTranscript = Array.from({ length: 44 }, (_, index) => ({
  start: index * 8,
  end: index * 8 + 6.5,
  text: index % 7 === 0
    ? "¿Por qué este detalle es importante para lograr un mejor resultado?"
    : `Esta es una explicación completa del tema número ${index + 1}.`,
}));
const localCandidates = generateLocalSmartClipCandidates(localTranscript, 360, 45);
assert.ok(localCandidates.length >= 3, "local analysis must create several reviewable proposals");
assert.ok(localCandidates.every((candidate) => candidate.selected), "new local proposals must start selected for review");
assert.ok(localCandidates.every((candidate) => candidate.title && candidate.transcript), "every proposal must include an editable title and transcript excerpt");
assert.equal(
  new Set(localCandidates.map((candidate) => candidate.title.toLocaleLowerCase())).size,
  localCandidates.length,
  "every local proposal must receive a distinct editable file title",
);
assert.ok(localCandidates.every((candidate) => candidate.duration <= 55), "proposal duration must remain close to the requested length");
for (let index = 1; index < localCandidates.length; index += 1) {
  const previous = localCandidates[index - 1];
  const current = localCandidates[index];
  const overlap = Math.max(0, Math.min(previous.end, current.end) - Math.max(previous.start, current.start));
  assert.ok(overlap / Math.min(previous.duration, current.duration) <= 0.56, "review proposals must not substantially duplicate one another");
}
assert.match(createLocalSmartClipTitle("Bueno, ¿Por qué este cambio es importante para todos? Después explicamos los detalles."), /Por qué este cambio/i, "local titles must remove conversational filler and preserve the hook");

const project = {
  schemaVersion: 1,
  canvas: { width: 1920, height: 1080 },
  duration: 548,
  background: "#000000",
  layers: [
    {
      id: "video-1", trackId: "video-track", type: "media", name: "Source video",
      start: 0, duration: 548, visible: true, locked: false, opacity: 1,
      x: 0, y: 0, width: 100, height: 100, mediaKind: "video", objectFit: "cover",
      src: "file:///C:/media/source.mp4", assetKey: "asset-1",
    },
    {
      id: "caption-1", trackId: "captions-track", type: "text", name: "Caption 1",
      trackName: "AI Captions", start: 2, duration: 2, visible: true, locked: false, opacity: 1,
      x: 11, y: 63, width: 78, height: 21, text: "A professional vertical caption",
      fontSize: 67, fontFamily: "Montserrat", color: "#facc15", isBold: false,
      hasTextBg: false, textBgColor: "#172033", textEffectPreset: "neon",
      glowColor: "#22d3ee", glowRadius: 22, strokeColor: "#cffafe", strokeWidth: 3,
    },
  ],
  assets: [{ id: "asset-1", name: "Source video", kind: "video", url: "file:///C:/media/source.mp4", persistentUrl: "file:///C:/media/source.mp4" }],
  transitions: [],
  format: { id: "16_9", label: "16:9", width: 1920, height: 1080 },
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const isolatedSourceProject = createSmartClipSourceProject({
  id: "master-1",
  name: "Master interview",
  url: "file:///C:/media/master.mp4",
  persistentUrl: "file:///C:/media/master.mp4",
  duration: 548,
  width: 1920,
  height: 1080,
});
assert.deepEqual(isolatedSourceProject.canvas, { width: 1920, height: 1080 }, "the local master must keep its source canvas before a social format is chosen");
assert.equal(isolatedSourceProject.layers.length, 1, "the Smart Clips source project must be isolated from the editor timeline");
assert.equal(isolatedSourceProject.layers[0].sourceEnd, 548, "the isolated master layer must cover the complete source video");

const clip = createSmartClipProject(project, segments[0], getSmartClipPlatform("youtube-shorts"));
assert.deepEqual(clip.canvas, { width: 1080, height: 1920 });
const customPlatform = getSmartClipPlatform("custom", { width: 1440, height: 1080 });
assert.deepEqual(
  { width: customPlatform.width, height: customPlatform.height, aspectRatio: customPlatform.aspectRatio },
  { width: 1440, height: 1080, aspectRatio: "1440:1080" },
  "Smart Clips must preserve valid custom output dimensions",
);
const facebookFeed = getSmartClipPlatform("facebook-feed");
assert.deepEqual(
  { width: facebookFeed.width, height: facebookFeed.height, aspectRatio: facebookFeed.aspectRatio },
  { width: 1080, height: 1350, aspectRatio: "4:5" },
  "Facebook Feed must use its professional portrait dimensions",
);
const video = clip.layers.find((layer) => layer.id === "video-1");
assert.deepEqual(
  { x: video.x, y: video.y, width: video.width, height: video.height, objectFit: video.objectFit },
  { x: 0, y: 0, width: 100, height: 100, objectFit: "cover" },
  "full-canvas media must remain full-canvas in percentage geometry",
);
const caption = clip.layers.find((layer) => layer.id === "caption-1");
assert.deepEqual(
  {
    x: caption.x, y: caption.y, width: caption.width, height: caption.height,
    fontSize: caption.fontSize, fontFamily: caption.fontFamily, color: caption.color,
    isBold: caption.isBold, hasTextBg: caption.hasTextBg,
    textEffectPreset: caption.textEffectPreset, glowRadius: caption.glowRadius,
    strokeWidth: caption.strokeWidth,
  },
  {
    x: 11, y: 63, width: 78, height: 21,
    fontSize: 67, fontFamily: "Montserrat", color: "#facc15",
    isBold: false, hasTextBg: false,
    textEffectPreset: "neon", glowRadius: 22,
    strokeWidth: 3,
  },
  "Smart Clips must preserve every editable caption style and position",
);
assert.equal(
  clip.layers.some((layer) => layer.name === "Smart Clip Title" || String(layer.id).startsWith("smart-title-")),
  false,
  "the editable cut title must never be burned into the exported video",
);

const editorSource = await readFile("components/VideoMaker.tsx", "utf8");
const smartExportStart = editorSource.indexOf("async function exportSmartClips");
const smartExportEnd = editorSource.indexOf("\n  return (", smartExportStart);
const smartExportSource = editorSource.slice(smartExportStart, smartExportEnd);
assert.match(
  smartExportSource,
  /sourceProject\s*=\s*smartClipSourceProjectRef\.current/,
  "Smart Clips export must use the independently imported local master project",
);
assert.doesNotMatch(
  smartExportSource,
  /prepareProjectMediaForRender\(\)/,
  "Smart Clips export must not depend on or mutate the current editor timeline",
);
assert.ok(
  smartExportSource.indexOf("coordinator.tryStart(sessionId)") < smartExportSource.indexOf("addSmartClipFaceReframing"),
  "Smart Clips must acquire its synchronous lock before asynchronous enhancement work",
);
assert.match(
  smartExportSource,
  /concurrencyKey:\s*["']smart-clips["']/,
  "Smart Clips must ask the desktop renderer to reject concurrent batches",
);
assert.match(
  editorSource,
  /SMART_CLIP_CAPTION_TEMPLATES\.map/,
  "Smart Clips must render a visual subtitle template selector",
);
assert.match(
  editorSource,
  /\["top", "middle", "bottom"\]/,
  "Smart Clips must offer top, middle and bottom subtitle positions",
);
assert.match(
  editorSource,
  /getProfessionalCaptionLayout\(platform\.width, platform\.height, smartClipCaptionPosition, smartClipCaptionSize\)/,
  "generated Smart Clip subtitles must use the selected position and safe size",
);
assert.match(
  editorSource,
  /aria-label="Smart Clip subtitle size"/,
  "Smart Clips must expose a dedicated subtitle-size control",
);
assert.match(
  editorSource,
  /project\s*=\s*applySelectedSmartClipTemplateToProject\(project, platform\)/,
  "Smart Clips export must apply the selected template to existing editable captions",
);
assert.match(
  editorSource,
  /generateLocalSmartClipCandidates\(transcriptCues, sourceProject\.duration, safeDuration\)/,
  "Smart Clips must create review proposals from the private local transcript",
);
assert.match(
  editorSource,
  /Analyze Locally/,
  "Smart Clips must analyze before exporting",
);
assert.match(
  editorSource,
  /Export \{selectedCandidateCount\} Selected/,
  "Smart Clips must export only the proposals selected by the creator",
);
assert.match(
  editorSource,
  /File title · not shown in video/,
  "every proposal must clearly identify its title as file metadata instead of an overlay",
);
assert.match(
  editorSource,
  /accept="video\/\*,\.mkv,\.avi,\.wmv"/,
  "Smart Clips must begin with a dedicated local master-video selector",
);
assert.match(
  editorSource,
  /Cut \{candidate\.index \+ 1\}.*of the master video/,
  "the preview must identify the individual cut instead of presenting the full master as the preview",
);
assert.match(
  editorSource,
  /style=\{\{ aspectRatio: `\$\{platform\.width\} \/ \$\{platform\.height\}` \}\}/,
  "the cut preview must use the selected platform or custom dimensions",
);
assert.match(
  smartExportSource,
  /smartClipFastExport \? "fast"/,
  "Smart Clips must offer a fast local social-video render preset",
);

const desktopRenderSource = await readFile("desktop/electron/services/render-adapter.mjs", "utf8");
assert.match(
  desktopRenderSource,
  /concurrentJob[\s\S]*A \$\{concurrencyKey\} export is already running/,
  "the desktop renderer must reject a second active Smart Clips job",
);
assert.match(
  desktopRenderSource,
  /\.pixores-\$\{renderId\}-\$\{outputFileName\}/,
  "renders must use a per-job temporary output instead of writing partial data to the final MP4",
);
assert.match(
  desktopRenderSource,
  /publishRenderedOutput\(outputPath, finalOutputPath\)/,
  "the temporary output must only be published after rendering finishes",
);

console.log("Smart Clips source-first import, unique file titles, cut-only previews, no burned title, locking, caption templates, atomic output, fast export, segmentation, and final geometry tests passed.");
