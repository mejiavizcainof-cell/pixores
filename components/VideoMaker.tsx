"use client";

import { ChangeEvent, DragEvent as ReactDragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import Link from "next/link";
import { AlignCenter, AlignLeft, AlignRight, ArrowLeft, ArrowRight, Baseline, Bold, Camera, CaseSensitive, ClipboardPaste, Copy, Download, Eye, EyeOff, Film, FolderOpen, GripVertical, ImagePlus, Italic, Layers3, List, Lock, Magnet, Maximize2, Minus, Monitor, Music, PanelLeftClose, PanelLeftOpen, Pause, Play, Plus, Redo2, Scissors, Search, Settings, Shapes, SkipBack, SkipForward, SlidersHorizontal, Sparkles, Square, Strikethrough, Trash2, Type, Underline, Undo2, Unlock, Volume2, VolumeX, X } from "lucide-react";
import { buildPixoresProject } from "@/src/video-render/build-project";
import {
  getPixoresVideoExportFormat,
  PIXORES_DEFAULT_VIDEO_EXPORT_FORMAT_ID,
  PIXORES_VIDEO_EXPORT_FORMATS,
  type PixoresVideoExportFormatId,
} from "@/src/video-render/export-formats";
import {
  applyExportQualityPreset,
  createDefaultExportSettings,
  estimateExportBytesRange,
  EXPORT_QUALITY_PRESETS,
  formatBytes,
  getExportFormatId,
  normalizeExportFileName,
  normalizeExportQualityPreset,
  type PixoresExportSettings,
} from "@/src/video-render/export-settings";
import type { PixoresAudioEffectChain, PixoresMediaMetadata, PixoresSmartReframe, PixoresVideoAsset, PixoresVideoLayer, PixoresVideoProject } from "@/src/video-render/types";
import { AUDIO_EFFECT_PRESETS, DEFAULT_AUDIO_EFFECTS, resolveAudioEffects } from "@/src/video-render/audio-effects";
import { calculateProjectDuration, snapTimeToFrame } from "@/src/video-render/timeline";
import { calculateSnappedTime, getSnapCandidates, type SnapResult } from "@/src/video-maker/timeline-snapping";
import {
  createLowerThirdConfig,
  getLowerThirdRenderModel,
  normalizeLowerThirdColor,
  setLowerThirdColor,
  lowerThirdTemplates,
  type LowerThirdConfig,
  type LowerThirdColorKey,
  type LowerThirdTemplate,
} from "@/src/video-render/lower-thirds";
import {
  canvaAnimationPresets,
  legacyAnimationPresets,
  resolveLayerAnimationStyle,
  type LayerAnimationPreset,
  type LayerAnimationType,
  type LayerAnimationVisualStyle,
} from "@/src/video-render/layer-animations";
import { getVideoMakerAdapters } from "@/src/video-maker/adapters/factory";
import { getPixoresDesktopBridge } from "@/src/video-maker/adapters/runtime";
import type { PixoresAudioAiProgress, PixoresCaption, PixoresSilenceAnalysisResult, PixoresSilenceRange, PixoresYouTubePublishProgress, PixoresYouTubeStatus } from "@/src/video-maker/adapters/types";
import {
  PIXORES_FONT_COUNT,
  PIXORES_FONT_GROUPS,
} from "@/src/fonts/pixores-fonts";
import { ensurePixoresFontLoaded, ensurePixoresFontsLoaded } from "@/src/fonts/pixores-font-loader";
import { resolvePixoresTextStyle } from "@/src/fonts/pixores-text-style";
import {
  PIXORES_VIDEO_START_AUDIO_KEY,
  PIXORES_VIDEO_START_FORMAT_KEY,
  PIXORES_VIDEO_START_PROJECT_KEY,
  PIXORES_VIDEO_START_TOOL_KEY,
  type PixoresVideoStartFormatPayload,
  type PixoresVideoStartAudioItem,
  type PixoresVideoStartProjectPayload,
  type PixoresVideoStartTool,
} from "@/src/video-maker/startup";
import {
  createSmartClipProject,
  createSmartClipSegments,
  createSmartClipSourceProject,
  generateLocalSmartClipCandidates,
  getSmartClipPlatform,
  SmartClipExportCoordinator,
  SMART_CLIP_DURATIONS,
  SMART_CLIP_PLATFORMS,
  type SmartClipCandidate,
  type SmartClipPlatform,
  type SmartClipPlatformId,
  type SmartClipTranscriptCue,
} from "@/src/video-maker/smart-clips";
import {
  SMART_CLIP_CAPTION_SIZE_DEFAULT,
  SMART_CLIP_CAPTION_SIZE_MAX,
  SMART_CLIP_CAPTION_SIZE_MIN,
  clampSmartClipCaptionSize,
  getProfessionalCaptionLayout,
  isAiCaptionLayer,
  type SmartClipCaptionPosition,
} from "@/src/video-maker/caption-layout";
import {
  CAPTION_STYLE_PRESETS as captionStylePresets,
  SMART_CLIP_CAPTION_TEMPLATES,
  applySmartClipCaptionTemplate,
  createSmartClipCaptionStyle,
  getCaptionStylePreset,
  resolveCaptionStylePresetPatch,
  type CaptionStylePresetId,
  type SmartClipCaptionTemplateId,
} from "@/src/video-maker/caption-style-presets";
import { analyzeFaceTracking } from "@/src/video-maker/face-tracking";
import {
  buildSmartReframe,
  resolveSmartReframeAtTime,
  type SmartSpeechRange,
} from "@/src/video-maker/smart-reframe";
import { containFrameBounds, fitFrameBoundsToMedia } from "@/src/video-maker/frame-geometry";
import {
  EMPTY_MEDIA_LIBRARY,
  loadBuiltInMediaLibrary,
  resolveBuiltInMediaUrl,
  type PixoresBuiltInMediaAsset,
  type PixoresMediaLibraryManifest,
} from "@/src/video-maker/media-library";
import {
  createPixoresVideoPackageManifest,
  PIXORES_VIDEO_PACKAGE_EXTENSION,
  type PixoresVideoPackageContents,
} from "@/src/video-maker/project-package";
import { useDesktopAuth } from "./DesktopAuthGate";
import { supabase } from "@/lib/supabaseClient";
import styles from "./VideoMaker.module.css";

const TIMELINE_EMPTY_TAIL_SECONDS = 8;
const MIN_VISIBLE_TIMELINE_TRACKS = 5;
const SMART_TRACK_PREFIX = "smart-track-";
const TIMELINE_HEIGHT_STORAGE_KEY = "pixores-video-maker-timeline-height";
const WORKSPACE_MODE_STORAGE_KEY = "pixores-video-maker-workspace-mode";
const CANVAS_TOOLBAR_VISIBLE_STORAGE_KEY = "pixores-video-maker-canvas-toolbar-visible";
const PROJECT_AUTOSAVE_KEY = "pixores-video-maker-autosave-v1";
const PROJECT_AUTOSAVE_ENABLED_KEY = "pixores-video-maker-autosave-enabled";
const PROJECT_MANUAL_SAVE_KEY = "pixores-video-maker-saved-project-v1";
const PERSONAL_ELEMENT_LIBRARY_KEY = "pixores-video-maker-my-library-v1";
const DOWNLOAD_AUTO_IMPORT_KEY = "pixores-video-maker-auto-import-downloads";
const PROJECT_AUTOSAVE_DELAY_MS = 5000;
const MAX_PREVIEW_VIDEO_ELEMENTS = 4;
const MAX_PREVIEW_AUDIO_ELEMENTS = 4;
const MAX_PREVIEW_FRAME_CACHE = 6;
const PREVIEW_FRAME_CACHE_MAX_WIDTH = 960;
const PREVIEW_FRAME_CACHE_MAX_HEIGHT = 540;
const TIMELINE_MAX_ZOOM = 32;
const STAGE_POSITION_LIMIT_PERCENT = 500;
const STAGE_MAX_SIZE_PERCENT = 600;

function releasePreviewMediaElement(element: HTMLMediaElement) {
  element.pause();
  element.removeAttribute("src");
  element.load();
}

function loadPreparedVideoElement(url: string, timeoutMs = 10_000) {
  return new Promise<HTMLVideoElement | null>((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = (result: HTMLVideoElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      video.onloadeddata = null;
      video.onerror = null;
      if (!result) releasePreviewMediaElement(video);
      resolve(result);
    };
    const timeoutId = window.setTimeout(() => finish(null), timeoutMs);
    video.muted = true;
    video.playsInline = true;
    video.loop = false;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.onloadeddata = () => finish(video);
    video.onerror = () => finish(null);
    video.src = new URL(url, window.location.href).href;
    video.load();
  });
}

function createDesktopMediaUrl(sourceUrl: string) {
  if (!sourceUrl.startsWith("file:") || typeof window === "undefined" || !window.pixoresDesktop) return sourceUrl;
  const bytes = new TextEncoder().encode(sourceUrl);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = window.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
  return `pixores-media://local/${encoded}`;
}

type BrowserExportDirectoryHandle = {
  name: string;
  getFileHandle: (name: string, options: { create: true }) => Promise<{
    createWritable: () => Promise<WritableStream<Uint8Array> & { write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
  }>;
};

function triggerBrowserDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function sanitizeProjectFileName(title: string) {
  const normalized = title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .slice(0, 96);
  return normalized || "Untitled video";
}

function isPixoresVideoProject(value: unknown): value is PixoresVideoProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<PixoresVideoProject>;
  return project.schemaVersion === 1
    && !!project.canvas
    && Array.isArray(project.layers)
    && Array.isArray(project.assets)
    && !!project.format;
}

function unpackProjectFile(value: unknown): { project: PixoresVideoProject; title?: string } | null {
  if (isPixoresVideoProject(value)) return { project: value };
  if (!value || typeof value !== "object") return null;

  const packaged = value as {
    project?: unknown;
    manifest?: { title?: unknown };
    metadata?: { title?: unknown };
    title?: unknown;
  };
  if (!isPixoresVideoProject(packaged.project)) return null;

  const candidateTitle = packaged.manifest?.title ?? packaged.metadata?.title ?? packaged.title;
  return {
    project: packaged.project,
    title: typeof candidateTitle === "string" ? candidateTitle : undefined,
  };
}

function createProjectContentFingerprint(project: PixoresVideoProject, title: string) {
  const projectContent = { ...project, createdAt: undefined, updatedAt: undefined };
  return JSON.stringify({
    title: title.trim() || "Untitled video",
    project: projectContent,
  });
}

type FormatOption = {
  id: string;
  label: string;
  width: number;
  height: number;
};

type ShapeType =
  | "rectangle"
  | "circle"
  | "triangle"
  | "star"
  | "badge"
  | "speechBubble"
  | "arrow"
  | "line"
  | "dashedLine"
  | "frame"
  | "roundedFrame"
  | "circleFrame"
  | "triangleFrame"
  | "neonFrame"
  | "neonPulseFrame"
  | "rgbLightsFrame"
  | "lightSweepFrame"
  | "cinemaFrame"
  | "paperFrame"
  | "paperPortraitFrame"
  | "paperSquareFrame"
  | "paperStripFrame"
  | "paperLeftFrame"
  | "paperRightFrame"
  | "phoneFrame"
  | "tabletFrame"
  | "laptopFrame"
  | "vsDividerFrame"
  | "splitScreenFrame"
  | "diagonalSplitFrame"
  | "gridSingle"
  | "gridTwoColumns"
  | "gridTwoRows"
  | "gridThreeColumns"
  | "gridThreeRows"
  | "gridFour"
  | "gridHeroLeft"
  | "gridHeroTop"
  | "gradient";

type TransitionType =
  | "fade"
  | "fadeBlack"
  | "fadeWhite"
  | "wipeLeft"
  | "wipeRight"
  | "wipeUp"
  | "wipeDown"
  | "slideLeft"
  | "slideRight"
  | "slideUp"
  | "slideDown"
  | "zoomFlash"
  | "zoomIn"
  | "zoomOut"
  | "rotateClockwise"
  | "blurDissolve"
  | "radialReveal"
  | "diagonalWipe"
  | "splitReveal"
  | "glitch"
  | "cubeLeft"
  | "cubeRight"
  | "flipHorizontal"
  | "flipVertical"
  | "pageTurnLeft"
  | "pageTurnRight"
  | "doorOpen"
  | "zoomTunnel";

type LayerAnimation = {
  id: string;
  type: LayerAnimationType;
  start: number;
  duration: number;
  phase?: "in" | "out";
  endOffset?: number;
};

type VideoEffectPreset =
  | "none"
  | "chromaKey"
  | "cinematic"
  | "vivid"
  | "warm"
  | "cool"
  | "noir"
  | "vintage"
  | "dream"
  | "vignette"
  | "bodyGlow"
  | "neonOutline"
  | "silhouette"
  | "ghostBody"
  | "objectPop"
  | "bodyHeat";

type LayerEffectConfig = {
  preset: VideoEffectPreset;
  intensity: number;
  chromaKey?: {
    color: string;
    similarity: number;
    smoothness: number;
    spill: number;
  };
};

type KeyframeProperty = "x" | "y" | "width" | "height" | "opacity" | "angle" | "scale";

type LayerKeyframe = {
  id: string;
  time: number;
  property: KeyframeProperty;
  value: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
};

type LayerType = "media" | "text" | "shape" | "audio" | "transition" | "lower-third";

type ShadowPreset = "none" | "glow" | "drop" | "outline" | "curved" | "pageLift" | "angled" | "backdrop";
type StrokePreset = "none" | "thin" | "medium" | "bold" | "light" | "dark";
type TextEffectPreset = "none" | "drop" | "glow" | "echo" | "outline" | "background" | "splice" | "hollow" | "neon" | "glitch" | "curve" | "shadow" | "lift";
type ObjectStylePanel = "stroke" | "shadow";

type VideoLayer = {
  id: string;
  groupId?: string;
  trackId: string;
  type: LayerType;
  name: string;
  start: number;
  duration: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  angle?: number;
  blur?: number;
  borderRadius?: number;
  isFlippedH?: boolean;
  isFlippedV?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokePreset?: StrokePreset;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  shadowPreset?: ShadowPreset;
  textBgColor?: string;
  hasTextBg?: boolean;
  textBgPadding?: number;
  textBgRadius?: number;
  textCurve?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrikethrough?: boolean;
  isUppercase?: boolean;
  hasBullets?: boolean;
  textAlign?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  glowColor?: string;
  glowRadius?: number;
  textEffectPreset?: TextEffectPreset;
  blendMode?: "normal" | "multiply" | "screen" | "darken" | "lighten";
  objectFit?: "cover" | "contain";
  src?: string;
  mediaKind?: "image" | "video" | "audio";
  assetKey?: string;
  trackOrder?: number;
  trackName?: string;
  trackMuted?: boolean;
  zIndex?: number;
  sourceStart?: number;
  sourceEnd?: number;
  trimStart?: number;
  trimEnd?: number;
  sourceDuration?: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    unit: "percent";
  };
  transform?: {
    scale: number;
    x: number;
    y: number;
  };
  smartReframe?: PixoresSmartReframe;
  linkedVideoLayerId?: string;
  audioDetached?: boolean;
  volume?: number;
  muted?: boolean;
  audioFadeIn?: number;
  audioFadeOut?: number;
  audioEffects?: PixoresAudioEffectChain;
  transitionKind?: TransitionType;
  fromLayerId?: string;
  toLayerId?: string;
  cutTime?: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
  animations?: LayerAnimation[];
  keyframes?: LayerKeyframe[];
  shapeType?: ShapeType;
  gradientColor1?: string;
  gradientColor2?: string;
  frameMediaLayerIds?: string[];
  effect?: LayerEffectConfig;
  lowerThird?: LowerThirdConfig;
};

type MediaAsset = {
  kind: "image" | "video" | "audio";
  image?: HTMLImageElement;
  video?: HTMLVideoElement;
  audio?: HTMLAudioElement;
  url: string;
  persistentUrl?: string;
  duration?: number;
  metadata?: PixoresMediaMetadata;
  sourceFile?: File;
};

type PlaybackTarget = {
  layerId: string;
  element: HTMLMediaElement;
  sourceTime: number;
  volume: number;
  shouldPlay: boolean;
  audioEffects?: PixoresAudioEffectChain;
};

type PreviewAudioGraph = {
  highPass: BiquadFilterNode;
  low: BiquadFilterNode;
  mid: BiquadFilterNode;
  high: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  panner: StereoPannerNode;
  gain: GainNode;
  delay: DelayNode;
  feedback: GainNode;
  wet: GainNode;
};

type CachedVideoFrame = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  time: number;
};

type WaveformPeakCache = Record<string, number[]>;

function getBrowserExportVideoBitsPerSecond(settings: PixoresExportSettings) {
  if (settings.videoBitrateKbps) return Math.max(400_000, settings.videoBitrateKbps * 1000);
  const qualityBitsPerPixel: Record<PixoresExportSettings["qualityPreset"], number> = {
    fast: 0.1,
    recommended: 0.14,
    high: 0.2,
    maximum: 0.28,
    custom: 0.18,
  };
  const pixels = Math.max(1, settings.width * settings.height);
  const fps = Math.max(1, settings.fps || 30);
  const qualityPreset = normalizeExportQualityPreset(settings.qualityPreset);
  return Math.round(clamp(pixels * fps * qualityBitsPerPixel[qualityPreset], 2_500_000, 40_000_000));
}

type RenderProgressState = {
  open: boolean;
  renderId: string;
  status: "idle" | "queued" | "analyzing" | "preparing" | "bundling" | "rendering" | "encoding" | "muxing" | "finalizing" | "completed" | "cancelled" | "failed";
  progress: number;
  fileName: string;
  outputUrl: string;
  outputPath: string;
  error: string;
  warnings: string[];
  startedAt: number;
  elapsedSeconds: number;
  etaSeconds: number | null;
  renderedFrames: number;
  totalFrames: number;
  renderFps: number;
  speed: number;
  codec: string;
  resolution: string;
  method: string;
  proxyPrepared: number;
  proxyTotal: number;
  hybridRender: boolean;
  hybridPrecomposing: boolean;
  hybridRenderedFrames: number;
  hybridTotalFrames: number;
  segmentedRender: boolean;
  currentSegment: number;
  segmentCount: number;
  segmentType: "nvidia" | "compositor" | "";
  complexDuration: number;
};

type SmartClipsProgressState = {
  running: boolean;
  cancelling: boolean;
  completed: number;
  total: number;
  currentClip: number;
  progress: number;
  message: string;
  error: string;
};

type SmartClipFaceMode = "off" | "static" | "dynamic";

type SmartClipSourceState = {
  assetId: string;
  name: string;
  duration: number;
  width: number;
  height: number;
};

type AudioAiTab = "subtitles" | "silence";

type CaptionSegment = {
  text: string;
  startMs: number;
  endMs: number;
};

type ImportedAsset = {
  id: string;
  name: string;
  kind: "image" | "video" | "audio";
  url: string;
  persistentUrl?: string;
  uploadStatus?: "local" | "uploading" | "ready" | "error";
  duration?: number;
  size?: number;
  metadata?: PixoresMediaMetadata;
  waveformPeaks?: number[];
  origin?: "local" | "chatgpt";
};

type PersonalLibraryCollection = "general" | "chatgpt";

type PersonalLibraryAsset = {
  id: string;
  name: string;
  kind: "image" | "video" | "audio";
  url: string;
  persistentUrl?: string;
  duration?: number;
  size?: number;
  metadata?: PixoresMediaMetadata;
};

type PersonalLibraryItem = {
  id: string;
  name: string;
  kind: "media" | "lower-third" | "text" | "shape" | "element";
  layer: VideoLayer;
  assets: PersonalLibraryAsset[];
  createdAt: string;
  updatedAt: string;
  collection?: PersonalLibraryCollection;
};

type CloudVideoProject = {
  id: string;
  user_id: string | null;
  title: string;
  project: PixoresVideoProject;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

type SidebarPanel = "imports" | "elements" | "text" | "audio" | "project" | "settings";
type ElementPanelTab = "my-library" | "assets" | "video-backgrounds" | "sound-effects" | "lower-thirds" | "animations" | "effects" | "shapes" | "frames" | "grids" | "social" | "gradients" | "transitions" | "emojis";
type TraditionalMenuName = "file" | "edit" | "tools" | "view" | "advanced" | "help";
type ProjectLifecycleAction = "new" | "open" | "close-project" | "close-app";
type ImportKindFilter = "all" | "video" | "image" | "audio";
type EmptyTrack = {
  id: string;
  name: string;
  order?: number;
  locked?: boolean;
  visible?: boolean;
  muted?: boolean;
};

type TimelineClipboardPayload = {
  layers: VideoLayer[];
  anchorStart: number;
  duration: number;
};
type TimelineContextMenuState = {
  x: number;
  y: number;
  trackId: string;
  layerId?: string;
};
type WorkspaceMode = "edit" | "timeline" | "preview";
type TimelineTrackGroup = {
  trackId: string;
  order: number;
  name: string;
  muted: boolean;
  clips: VideoLayer[];
  emptyTrack?: EmptyTrack;
  isSmartPlaceholder?: boolean;
};

type TrackSettings = {
  id: string;
  order: number;
  name?: string;
  muted: boolean;
  locked?: boolean;
  hidden?: boolean;
};

function loadCanvasPreviewImage(
  image: HTMLImageElement,
  source: string,
  onLoad: () => void,
  onError?: () => void,
) {
  image.decoding = "async";
  image.onload = onLoad;
  image.onerror = onError || null;

  const cleanSource = source.split(/[?#]/, 1)[0].toLowerCase();
  const isSocialSvg = cleanSource.includes("/template-assets/social/") && cleanSource.endsWith(".svg");
  if (!isSocialSvg) {
    image.src = source;
    return;
  }

  void fetch(source)
    .then((response) => {
      if (!response.ok) throw new Error(`SVG request failed with ${response.status}`);
      return response.text();
    })
    .then((svg) => {
      const normalizedSvg = svg.replace(
        /<svg\b/,
        '<svg width="24" height="24" preserveAspectRatio="xMidYMid meet"',
      );
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizedSvg)}`;
    })
    .catch(() => {
      image.src = source;
    });
}

type TrackDragState = {
  trackId: string;
  startY: number;
  targetIndex: number;
  initialSettings: TrackSettings[];
  initialLayers: VideoLayer[];
};

type VolumeDragState = {
  layerId: string;
  initialLayers: VideoLayer[];
  hasChanged: boolean;
};

type ClipEditState = {
  pointerId: number;
  layerId: string;
  movingLayerIds: string[];
  mode: "move" | "trim-start" | "trim-end";
  startX: number;
  initialStart: number;
  initialDuration: number;
  initialSourceStart: number;
  initialSourceEnd: number;
  sourceDuration: number;
  timelineWidth: number;
  initialTrackId: string;
  initialLayers: VideoLayer[];
  hasChanged: boolean;
};

type TransitionResizeState = {
  layerId: string;
  edge: "start" | "end";
  startX: number;
  initialStart: number;
  initialEnd: number;
  cutTime: number;
  currentStart: number;
  currentDuration: number;
  timelineWidth: number;
  initialLayers: VideoLayer[];
  hasChanged: boolean;
};

type ClipDragPreview = {
  layerId: string;
  trackId: string;
  leftPercent: number;
  widthPercent: number;
  isOverlapping?: boolean;
};

type StageEditState = {
  layerId: string;
  mode: "move" | "resize" | "rotate";
  edge?: CanvasResizeEdge;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
  initialAngle: number;
  initialPointerAngle: number;
  centerX: number;
  centerY: number;
  stageWidth: number;
  stageHeight: number;
};

type StageAlignmentGuideState = {
  vertical: boolean;
  horizontal: boolean;
  centerX: number;
  centerY: number;
};

type AnimationPhase = "in" | "out";

type LayoutResizeState = {
  mode: "sidebar" | "timeline";
  startX: number;
  startY: number;
  initialSidebarWidth: number;
  initialTimelineHeight: number;
};

type CanvasResizeEdge = "left" | "right" | "top" | "bottom" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

type LayerHistory = {
  past: VideoLayer[][];
  future: VideoLayer[][];
};

type MediaMatchRequest = {
  itemId: string;
  width: number;
  height: number;
  fps: number;
};

const formats: FormatOption[] = [
  { id: "9_16", label: "9:16", width: 1080, height: 1920 },
  { id: "3_4", label: "3:4", width: 1080, height: 1440 },
  { id: "4_5", label: "4:5", width: 1080, height: 1350 },
  { id: "1_1", label: "1:1", width: 1080, height: 1080 },
  { id: "4_3", label: "4:3", width: 1440, height: 1080 },
  { id: "16_9", label: "16:9", width: 1920, height: 1080 },
  { id: "21_9", label: "21:9", width: 2560, height: 1080 },
  { id: "custom", label: "Custom", width: 1920, height: 1080 },
];

const libraryAssets = [
  { category: "people", name: "Shocked Man", src: "/template-assets/people/shocked-man.png" },
  { category: "people", name: "Shocked Woman", src: "/template-assets/people/shocked-woman.png" },
  { category: "people", name: "Business Man", src: "/template-assets/people/business-man.png" },
  { category: "people", name: "Podcast Host", src: "/template-assets/people/podcast-host.png" },
  { category: "people", name: "Gamer", src: "/template-assets/people/gamer.png" },
  { category: "people", name: "Young Woman", src: "/template-assets/people/young-woman.png" },
  { category: "people", name: "Young Man", src: "/template-assets/people/young-man.png" },
  { category: "people", name: "Professional Woman", src: "/template-assets/people/professional-woman.png" },
  { category: "people", name: "Professional Man", src: "/template-assets/people/professional-man.png" },
  { category: "people", name: "Teen Girl", src: "/template-assets/people/teen-girl.png" },
  { category: "people", name: "Teen Boy", src: "/template-assets/people/teen-boy.png" },
  { category: "people", name: "Girl", src: "/template-assets/people/girl-child.png" },
  { category: "people", name: "Boy", src: "/template-assets/people/boy-child.png" },
  { category: "people", name: "Baseball Player", src: "/template-assets/people/baseball-player.png" },
  { category: "people", name: "Basketball Player", src: "/template-assets/people/basketball-player.png" },
  { category: "people", name: "Soccer Player", src: "/template-assets/people/soccer-player.png" },
  { category: "people", name: "American Football Player", src: "/template-assets/people/american-football-player.png" },
  { category: "people", name: "Tennis Player", src: "/template-assets/people/tennis-player.png" },
  { category: "people", name: "Swimmer", src: "/template-assets/people/swimmer.png" },
  { category: "people", name: "Female Runner", src: "/template-assets/people/female-runner.png" },
  { category: "people", name: "Male Runner", src: "/template-assets/people/male-runner.png" },
  { category: "objects", name: "Red Arrow", src: "/template-assets/objects/red-arrow.png" },
  { category: "objects", name: "Yellow Arrow", src: "/template-assets/objects/yellow-arrow.png" },
  { category: "objects", name: "Circle Highlight", src: "/template-assets/objects/circle-highlight.png" },
  { category: "objects", name: "Money Stack", src: "/template-assets/objects/money-stack.png" },
  { category: "objects", name: "Fire", src: "/template-assets/objects/fire.png" },
  { category: "objects", name: "Brush", src: "/template-assets/objects/brush-black-1.png" },
  { category: "objects", name: "Frames", src: "/template-assets/objects/marcos.png" },
  { category: "objects", name: "Lines", src: "/template-assets/objects/solid-line.png" },
  { category: "objects", name: "YouTube Logo", src: "/template-assets/objects/youtube-logo.png" },
  { category: "objects", name: "Microphone", src: "/template-assets/objects/microphone.png" },
  { category: "objects", name: "Realistic Black Torn Paper", src: "/template-assets/objects/torn-paper-black-realistic.png" },
  { category: "objects", name: "Realistic White Crumpled Paper", src: "/template-assets/objects/crumpled-paper-white-realistic.png" },
  { category: "objects", name: "Blue Torn Paper", src: "/template-assets/objects/torn-paper-blue.png" },
  { category: "objects", name: "White Torn Paper", src: "/template-assets/objects/torn-paper-white.png" },
  { category: "objects", name: "Gold Paper Fold", src: "/template-assets/objects/paper-fold-gold.png" },
  { category: "objects", name: "Black Brush Stroke", src: "/template-assets/objects/brush-stroke-black-2.png" },
  { category: "objects", name: "Orange Brush Stroke", src: "/template-assets/objects/brush-stroke-orange.png" },
  { category: "objects", name: "Black Halftone Circle", src: "/template-assets/objects/halftone-circle-black.png" },
  { category: "objects", name: "Black Halftone Corner", src: "/template-assets/objects/halftone-corner-black.png" },
  { category: "objects", name: "Black Halftone Fade", src: "/template-assets/objects/halftone-fade-black.png" },
  { category: "objects", name: "Black Halftone Wave", src: "/template-assets/objects/halftone-wave-black.png" },
  { category: "objects", name: "Red Halftone Circle", src: "/template-assets/objects/halftone-circle-red.png" },
  { category: "objects", name: "Orange Halftone Corner", src: "/template-assets/objects/halftone-corner-orange.png" },
  { category: "objects", name: "Blue Halftone Fade", src: "/template-assets/objects/halftone-fade-blue.png" },
  { category: "objects", name: "Teal Halftone Wave", src: "/template-assets/objects/halftone-wave-teal.png" },
  { category: "objects", name: "Soft Oval Shadow", src: "/template-assets/objects/shadow-soft-oval.png" },
  { category: "objects", name: "Soft Circle Shadow", src: "/template-assets/objects/shadow-soft-circle.png" },
  { category: "objects", name: "Bottom Edge Shadow", src: "/template-assets/objects/shadow-edge-bottom.png" },
  { category: "objects", name: "Diagonal Shadow", src: "/template-assets/objects/shadow-diagonal.png" },
  { category: "objects", name: "Outline Microphone", src: "/template-assets/objects/icon-microphone-outline.png" },
  { category: "objects", name: "Retro Microphone", src: "/template-assets/objects/icon-retro-microphone.png" },
  { category: "objects", name: "Megaphone", src: "/template-assets/objects/icon-megaphone.png" },
  { category: "objects", name: "Ear and Sound", src: "/template-assets/objects/icon-ear-sound.png" },
  { category: "objects", name: "Radio Tower", src: "/template-assets/objects/icon-radio-tower.png" },
  { category: "objects", name: "Speaking Voice", src: "/template-assets/objects/icon-voice-speaking.png" },
  { category: "objects", name: "Rainbow Sound Wave", src: "/template-assets/objects/sound-wave-rainbow.png" },
  { category: "objects", name: "Teal Plus Pattern", src: "/template-assets/objects/pattern-plus-teal.png" },
  { category: "objects", name: "Dotted Triangle", src: "/template-assets/objects/pattern-dots-triangle.png" },
  { category: "objects", name: "Ellipse Highlight", src: "/template-assets/objects/ellipse-highlight.png" },
  { category: "objects", name: "Line Graph", src: "/template-assets/objects/line-graph.png" },
  { category: "objects", name: "Cracked Glass", src: "/template-assets/objects/cracked-glass.png" },
  { category: "objects", name: "Live Badge", src: "/template-assets/objects/badge-live.png" },
  { category: "objects", name: "Live Play Badge", src: "/template-assets/objects/badge-live-play.png" },
  { category: "objects", name: "Subscribe Badge", src: "/template-assets/objects/badge-subscribe.png" },
  { category: "objects", name: "Stream Now Badge", src: "/template-assets/objects/badge-stream-now.png" },
  { category: "objects", name: "Watch Now Badge", src: "/template-assets/objects/badge-watch-now.png" },
] as const;

const socialAssets = [
  { name: "YouTube", src: "/template-assets/social/youtube.svg", color: "#FF0000" },
  { name: "Instagram", src: "/template-assets/social/instagram.svg", color: "#E4405F" },
  { name: "Facebook", src: "/template-assets/social/facebook.svg", color: "#0866FF" },
  { name: "TikTok", src: "/template-assets/social/tiktok.svg", color: "#000000" },
  { name: "X", src: "/template-assets/social/x.svg", color: "#000000" },
  { name: "LinkedIn", src: "/template-assets/social/linkedin.svg", color: "#0A66C2" },
  { name: "Pinterest", src: "/template-assets/social/pinterest.svg", color: "#BD081C" },
  { name: "Snapchat", src: "/template-assets/social/snapchat.svg", color: "#FFFC00" },
  { name: "WhatsApp", src: "/template-assets/social/whatsapp.svg", color: "#25D366" },
  { name: "Telegram", src: "/template-assets/social/telegram.svg", color: "#26A5E4" },
  { name: "Twitch", src: "/template-assets/social/twitch.svg", color: "#9146FF" },
  { name: "Discord", src: "/template-assets/social/discord.svg", color: "#5865F2" },
  { name: "Reddit", src: "/template-assets/social/reddit.svg", color: "#FF4500" },
  { name: "Threads", src: "/template-assets/social/threads.svg", color: "#000000" },
  { name: "Spotify", src: "/template-assets/social/spotify.svg", color: "#1ED760" },
  { name: "Vimeo", src: "/template-assets/social/vimeo.svg", color: "#1AB7EA" },
  { name: "Bluesky", src: "/template-assets/social/bluesky.svg", color: "#0285FF" },
  { name: "Mastodon", src: "/template-assets/social/mastodon.svg", color: "#6364FF" },
] as const;

const shapePresets = [
  { name: "Blue Box", shapeType: "rectangle", color: "#3B82F6" },
  { name: "Red Box", shapeType: "rectangle", color: "#EF4444" },
  { name: "Yellow Circle", shapeType: "circle", color: "#FACC15" },
  { name: "Green Circle", shapeType: "circle", color: "#22C55E" },
  { name: "Red Triangle", shapeType: "triangle", color: "#EF4444" },
  { name: "Yellow Triangle", shapeType: "triangle", color: "#FACC15" },
  { name: "Star", shapeType: "star", color: "#FACC15" },
  { name: "Badge", shapeType: "badge", color: "#EF4444" },
  { name: "Speech Bubble", shapeType: "speechBubble", color: "#FFFFFF" },
  { name: "Arrow", shapeType: "arrow", color: "#EF4444" },
  { name: "Line", shapeType: "line", color: "#0F172A" },
  { name: "Black Line", shapeType: "line", color: "#0F172A" },
  { name: "Dashed Line", shapeType: "dashedLine", color: "#0F172A" },
] satisfies Array<{ name: string; shapeType: ShapeType; color: string }>;

const framePresets = [
  { name: "Frame", shapeType: "frame", color: "#EF4444" },
  { name: "Rounded Frame", shapeType: "roundedFrame", color: "#3B82F6" },
  { name: "Neon Cyan", shapeType: "neonFrame", color: "#22D3EE" },
  { name: "Neon Pulse", shapeType: "neonPulseFrame", color: "#F472B6" },
  { name: "RGB Lights", shapeType: "rgbLightsFrame", color: "#A78BFA" },
  { name: "Light Sweep", shapeType: "lightSweepFrame", color: "#F8FAFC" },
  { name: "Cinema Gold", shapeType: "cinemaFrame", color: "#F59E0B" },
  { name: "Circle Frame", shapeType: "circleFrame", color: "#FACC15" },
  { name: "Triangle Frame", shapeType: "triangleFrame", color: "#22C55E" },
  { name: "Paper Wide", shapeType: "paperFrame", color: "#F8F1E8" },
  { name: "Paper Portrait", shapeType: "paperPortraitFrame", color: "#F8F1E8" },
  { name: "Paper Square", shapeType: "paperSquareFrame", color: "#F8F1E8" },
  { name: "Torn Paper", shapeType: "paperStripFrame", color: "#F8F1E8" },
  { name: "Paper Left", shapeType: "paperLeftFrame", color: "#F8F1E8" },
  { name: "Paper Right", shapeType: "paperRightFrame", color: "#F8F1E8" },
  { name: "Phone", shapeType: "phoneFrame", color: "#111827" },
  { name: "Tablet", shapeType: "tabletFrame", color: "#111827" },
  { name: "Laptop", shapeType: "laptopFrame", color: "#111827" },
  { name: "VS Divider", shapeType: "vsDividerFrame", color: "#FACC15" },
  { name: "Split Screen", shapeType: "splitScreenFrame", color: "#2563EB" },
  { name: "Diagonal Split", shapeType: "diagonalSplitFrame", color: "#EF4444" },
] satisfies Array<{ name: string; shapeType: ShapeType; color: string }>;

const gridPresets = [
  { name: "Single Photo", shapeType: "gridSingle", color: "#FFFFFF" },
  { name: "Two Columns", shapeType: "gridTwoColumns", color: "#FFFFFF" },
  { name: "Two Rows", shapeType: "gridTwoRows", color: "#FFFFFF" },
  { name: "Three Columns", shapeType: "gridThreeColumns", color: "#FFFFFF" },
  { name: "Three Rows", shapeType: "gridThreeRows", color: "#FFFFFF" },
  { name: "Four Photos", shapeType: "gridFour", color: "#FFFFFF" },
  { name: "Feature Left", shapeType: "gridHeroLeft", color: "#FFFFFF" },
  { name: "Feature Top", shapeType: "gridHeroTop", color: "#FFFFFF" },
] satisfies Array<{ name: string; shapeType: ShapeType; color: string }>;

type FrameMediaSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: "rect" | "rounded" | "ellipse" | "polygon";
  points?: Array<[number, number]>;
  radius?: number;
};

function isMediaContainerShape(shapeType?: ShapeType) {
  return Boolean(shapeType && (
    framePresets.some((frame) => frame.shapeType === shapeType)
    || gridPresets.some((grid) => grid.shapeType === shapeType)
  ));
}

function getFrameMediaSlots(shapeType?: ShapeType): FrameMediaSlot[] {
  if (shapeType === "vsDividerFrame") {
    return [
      { x: 0.02, y: 0.04, width: 0.45, height: 0.92, shape: "polygon", points: [[0, 0], [1, 0], [0.78, 1], [0, 1]] },
      { x: 0.53, y: 0.04, width: 0.45, height: 0.92, shape: "polygon", points: [[0.22, 0], [1, 0], [1, 1], [0, 1]] },
    ];
  }
  if (shapeType === "splitScreenFrame") return [{ x: 0.025, y: 0.04, width: 0.465, height: 0.92 }, { x: 0.51, y: 0.04, width: 0.465, height: 0.92 }];
  if (shapeType === "diagonalSplitFrame") {
    return [
      { x: 0.025, y: 0.04, width: 0.58, height: 0.92, shape: "polygon", points: [[0, 0], [0.7, 0], [1, 1], [0, 1]] },
      { x: 0.395, y: 0.04, width: 0.58, height: 0.92, shape: "polygon", points: [[0, 0], [1, 0], [1, 1], [0.3, 1]] },
    ];
  }
  if (shapeType === "gridTwoColumns") return [{ x: 0.025, y: 0.04, width: 0.465, height: 0.92 }, { x: 0.51, y: 0.04, width: 0.465, height: 0.92 }];
  if (shapeType === "gridTwoRows") return [{ x: 0.025, y: 0.04, width: 0.95, height: 0.45 }, { x: 0.025, y: 0.51, width: 0.95, height: 0.45 }];
  if (shapeType === "gridThreeColumns") return [{ x: 0.02, y: 0.04, width: 0.306, height: 0.92 }, { x: 0.347, y: 0.04, width: 0.306, height: 0.92 }, { x: 0.674, y: 0.04, width: 0.306, height: 0.92 }];
  if (shapeType === "gridThreeRows") return [{ x: 0.025, y: 0.03, width: 0.95, height: 0.3 }, { x: 0.025, y: 0.35, width: 0.95, height: 0.3 }, { x: 0.025, y: 0.67, width: 0.95, height: 0.3 }];
  if (shapeType === "gridFour") return [{ x: 0.025, y: 0.04, width: 0.465, height: 0.45 }, { x: 0.51, y: 0.04, width: 0.465, height: 0.45 }, { x: 0.025, y: 0.51, width: 0.465, height: 0.45 }, { x: 0.51, y: 0.51, width: 0.465, height: 0.45 }];
  if (shapeType === "gridHeroLeft") return [{ x: 0.025, y: 0.04, width: 0.61, height: 0.92 }, { x: 0.655, y: 0.04, width: 0.32, height: 0.45 }, { x: 0.655, y: 0.51, width: 0.32, height: 0.45 }];
  if (shapeType === "gridHeroTop") return [{ x: 0.025, y: 0.04, width: 0.95, height: 0.59 }, { x: 0.025, y: 0.65, width: 0.465, height: 0.31 }, { x: 0.51, y: 0.65, width: 0.465, height: 0.31 }];
  if (shapeType === "circleFrame") return [{ x: 0.04, y: 0.04, width: 0.92, height: 0.92, shape: "ellipse" }];
  if (shapeType === "triangleFrame") return [{ x: 0.05, y: 0.06, width: 0.9, height: 0.88, shape: "polygon", points: [[0.5, 0], [1, 1], [0, 1]] }];
  if (shapeType === "roundedFrame") return [{ x: 0.035, y: 0.055, width: 0.93, height: 0.89, shape: "rounded", radius: 0.12 }];
  if (shapeType === "phoneFrame") return [{ x: 0.055, y: 0.055, width: 0.89, height: 0.89, shape: "rounded", radius: 0.12 }];
  if (shapeType === "tabletFrame") return [{ x: 0.045, y: 0.075, width: 0.91, height: 0.85, shape: "rounded", radius: 0.08 }];
  if (shapeType === "laptopFrame") return [{ x: 0.095, y: 0.04, width: 0.81, height: 0.71, shape: "rounded", radius: 0.04 }];
  if (shapeType?.startsWith("paper") || shapeType === "paperFrame") return [{ x: 0.075, y: 0.09, width: 0.85, height: 0.8, shape: "rounded", radius: 0.025 }];
  return [{ x: 0.035, y: 0.055, width: 0.93, height: 0.89 }];
}

function getAutoFittedFrameBounds(mediaLayer: VideoLayer, shapeType: ShapeType) {
  const slots = getFrameMediaSlots(shapeType);
  if (slots.length !== 1) {
    return { x: mediaLayer.x, y: mediaLayer.y, width: mediaLayer.width, height: mediaLayer.height };
  }
  const slot = slots[0];
  return fitFrameBoundsToMedia(mediaLayer, slot);
}

function traceFrameMediaSlot(
  context: CanvasRenderingContext2D,
  slot: FrameMediaSlot,
  frameWidth: number,
  frameHeight: number,
) {
  const x = slot.x * frameWidth;
  const y = slot.y * frameHeight;
  const width = slot.width * frameWidth;
  const height = slot.height * frameHeight;
  context.beginPath();
  if (slot.shape === "ellipse") {
    context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else if (slot.shape === "polygon" && slot.points?.length) {
    slot.points.forEach(([pointX, pointY], index) => {
      const targetX = x + pointX * width;
      const targetY = y + pointY * height;
      if (index === 0) context.moveTo(targetX, targetY);
      else context.lineTo(targetX, targetY);
    });
    context.closePath();
  } else if (slot.shape === "rounded") {
    context.roundRect(x, y, width, height, Math.min(width, height) * (slot.radius || 0.08));
  } else {
    context.rect(x, y, width, height);
  }
  return { x, y, width, height };
}

const gradientPresets = [
  { name: "Blue Fade", color1: "#FFFFFF", color2: "#1261D6" },
  { name: "Dark Fade", color1: "#0F172A", color2: "#FFFFFF" },
  { name: "Navy Fade", color1: "#FFFFFF", color2: "#172A72" },
  { name: "Purple Side Fade", color1: "#7C3AED", color2: "#FFFFFF" },
  { name: "Orange Fade", color1: "#FFFFFF", color2: "#F97316" },
  { name: "Red Band", color1: "#FFFFFF", color2: "#EF4444" },
  { name: "Pink Glow", color1: "#EC4899", color2: "#FFFFFF" },
  { name: "Blue Glow", color1: "#0284C7", color2: "#FFFFFF" },
  { name: "Lime Glow", color1: "#A3E635", color2: "#FFFFFF" },
  { name: "Black Glow", color1: "#000000", color2: "#FFFFFF" },
] as const;

type CanvasBackgroundPreset = {
  id: string;
  name: string;
  color1: string;
  color2?: string;
};

const canvasBackgroundPresets: CanvasBackgroundPreset[] = [
  { id: "studio-black", name: "Studio Black", color1: "#05070D" },
  { id: "clean-white", name: "Clean White", color1: "#F8FAFC" },
  { id: "creator-red", name: "Creator Red", color1: "#DC2626" },
  { id: "brand-teal", name: "Brand Teal", color1: "#0F766E" },
  { id: "midnight", name: "Midnight", color1: "#020617", color2: "#1E1B4B" },
  { id: "ocean", name: "Ocean", color1: "#0F172A", color2: "#0284C7" },
  { id: "aurora", name: "Aurora", color1: "#312E81", color2: "#14B8A6" },
  { id: "sunset", name: "Sunset", color1: "#7C2D12", color2: "#F97316" },
  { id: "electric", name: "Electric", color1: "#4C1D95", color2: "#DB2777" },
  { id: "lime-night", name: "Lime Night", color1: "#052E16", color2: "#84CC16" },
  { id: "warm-paper", name: "Warm Paper", color1: "#FFF7ED", color2: "#FDBA74" },
  { id: "steel", name: "Steel", color1: "#111827", color2: "#64748B" },
];

type EffectPresetCard = { id: Exclude<VideoEffectPreset, "none">; name: string; description: string; badge: string };

const visualEffectPresets = [
  { id: "chromaKey", name: "Chroma Key", description: "Remove green or any sampled color", badge: "KEY" },
  { id: "cinematic", name: "Cinematic", description: "Deep contrast and controlled color", badge: "FILM" },
  { id: "vivid", name: "Vivid Color", description: "Stronger color and definition", badge: "POP" },
  { id: "warm", name: "Warm Light", description: "Golden, inviting color grade", badge: "SUN" },
  { id: "cool", name: "Cool Tone", description: "Clean blue modern grade", badge: "ICE" },
  { id: "noir", name: "Noir", description: "High-contrast monochrome", badge: "B&W" },
  { id: "vintage", name: "Vintage", description: "Soft faded film character", badge: "RETRO" },
  { id: "dream", name: "Dream Glow", description: "Bright and softly diffused", badge: "GLOW" },
  { id: "vignette", name: "Vignette", description: "Focus attention toward center", badge: "FOCUS" },
] satisfies EffectPresetCard[];

const bodyObjectEffectPresets = [
  { id: "bodyGlow", name: "Body Glow", description: "Cyan aura around a cutout person or object", badge: "AURA" },
  { id: "neonOutline", name: "Neon Outline", description: "Two-color neon edge for transparent subjects", badge: "NEON" },
  { id: "silhouette", name: "Silhouette", description: "Turn the selected person or object into a dark figure", badge: "BODY" },
  { id: "ghostBody", name: "Ghost Body", description: "Transparent spectral treatment for a subject", badge: "GHOST" },
  { id: "objectPop", name: "Object Pop", description: "Extra definition, color and grounded shadow", badge: "3D" },
  { id: "bodyHeat", name: "Body Heat", description: "Warm thermal-style color treatment", badge: "HEAT" },
] satisfies EffectPresetCard[];

const effectPresets: EffectPresetCard[] = [...visualEffectPresets, ...bodyObjectEffectPresets];

const shadowPresetOptions: Array<{ id: ShadowPreset; label: string }> = [
  { id: "none", label: "None" },
  { id: "glow", label: "Glow" },
  { id: "drop", label: "Drop" },
  { id: "outline", label: "Outline" },
  { id: "curved", label: "Curved" },
  { id: "pageLift", label: "Page lift" },
  { id: "angled", label: "Angled" },
  { id: "backdrop", label: "Backdrop" },
];

const strokePresetOptions: Array<{ id: StrokePreset; label: string }> = [
  { id: "none", label: "None" },
  { id: "thin", label: "Thin" },
  { id: "medium", label: "Medium" },
  { id: "bold", label: "Bold" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const textEffectPresetOptions: Array<{ id: TextEffectPreset; label: string }> = [
  { id: "drop", label: "Drop" },
  { id: "glow", label: "Glow" },
  { id: "echo", label: "Echo" },
  { id: "outline", label: "Outline" },
  { id: "background", label: "Background" },
  { id: "splice", label: "Splice" },
  { id: "hollow", label: "Hollow" },
  { id: "neon", label: "Neon" },
  { id: "glitch", label: "Glitch" },
  { id: "curve", label: "Curve" },
];

type TransitionPreset = {
  name: string;
  transitionKind: TransitionType;
  color: string;
  description: string;
  family: "Basic" | "Movement" | "Reveal" | "Dynamic" | "3D";
};

const basicTransitionPresets = [
  { name: "Fade", transitionKind: "fade", color: "#000000", description: "Smooth cross dissolve", family: "Basic" },
  { name: "Fade Black", transitionKind: "fadeBlack", color: "#000000", description: "Dip through black", family: "Basic" },
  { name: "Fade White", transitionKind: "fadeWhite", color: "#FFFFFF", description: "Bright white flash", family: "Basic" },
  { name: "Wipe Left", transitionKind: "wipeLeft", color: "#0F172A", description: "Reveal from the left", family: "Reveal" },
  { name: "Wipe Right", transitionKind: "wipeRight", color: "#0F172A", description: "Reveal from the right", family: "Reveal" },
  { name: "Wipe Up", transitionKind: "wipeUp", color: "#0F172A", description: "Reveal from the bottom", family: "Reveal" },
  { name: "Wipe Down", transitionKind: "wipeDown", color: "#0F172A", description: "Reveal from the top", family: "Reveal" },
  { name: "Slide Left", transitionKind: "slideLeft", color: "#2563EB", description: "Push scenes to the left", family: "Movement" },
  { name: "Slide Right", transitionKind: "slideRight", color: "#2563EB", description: "Push scenes to the right", family: "Movement" },
  { name: "Slide Up", transitionKind: "slideUp", color: "#2563EB", description: "Vertical upward push", family: "Movement" },
  { name: "Slide Down", transitionKind: "slideDown", color: "#2563EB", description: "Vertical downward push", family: "Movement" },
  { name: "Zoom Flash", transitionKind: "zoomFlash", color: "#FFFFFF", description: "Fast zoom with light burst", family: "Dynamic" },
  { name: "Zoom In", transitionKind: "zoomIn", color: "#60A5FA", description: "Camera moves into scene", family: "Movement" },
  { name: "Zoom Out", transitionKind: "zoomOut", color: "#818CF8", description: "Pull back into next scene", family: "Movement" },
  { name: "Spin", transitionKind: "rotateClockwise", color: "#A78BFA", description: "Clockwise rotating swap", family: "Dynamic" },
  { name: "Blur Dissolve", transitionKind: "blurDissolve", color: "#38BDF8", description: "Soft focus cross dissolve", family: "Basic" },
  { name: "Circle Reveal", transitionKind: "radialReveal", color: "#2DD4BF", description: "Circular center expansion", family: "Reveal" },
  { name: "Diagonal Wipe", transitionKind: "diagonalWipe", color: "#F59E0B", description: "Angled cinematic reveal", family: "Reveal" },
  { name: "Center Split", transitionKind: "splitReveal", color: "#EC4899", description: "Open outward from center", family: "Reveal" },
  { name: "Digital Glitch", transitionKind: "glitch", color: "#22D3EE", description: "RGB digital jump cut", family: "Dynamic" },
  { name: "Cube Left", transitionKind: "cubeLeft", color: "#6366F1", description: "3D cube rotation to the left", family: "3D" },
  { name: "Cube Right", transitionKind: "cubeRight", color: "#8B5CF6", description: "3D cube rotation to the right", family: "3D" },
  { name: "Flip Horizontal", transitionKind: "flipHorizontal", color: "#0EA5E9", description: "Horizontal screen flip", family: "3D" },
  { name: "Flip Vertical", transitionKind: "flipVertical", color: "#14B8A6", description: "Vertical screen flip", family: "3D" },
  { name: "Page Turn Left", transitionKind: "pageTurnLeft", color: "#F59E0B", description: "Turn the scene like a page", family: "3D" },
  { name: "Page Turn Right", transitionKind: "pageTurnRight", color: "#F97316", description: "Reverse page turn", family: "3D" },
  { name: "Doors Open", transitionKind: "doorOpen", color: "#EC4899", description: "Open the scene from the center", family: "Reveal" },
  { name: "Zoom Tunnel", transitionKind: "zoomTunnel", color: "#A855F7", description: "Fast cinematic depth zoom", family: "Dynamic" },
] satisfies TransitionPreset[];

const animationPresets = [
  { label: "None", type: "" },
  ...canvaAnimationPresets.map((preset) => ({ label: preset.label, type: preset.type })),
  ...legacyAnimationPresets,
] satisfies Array<{ label: string; type: LayerAnimationType | "" }>;

function getLayerAnimationForPhase(layer: VideoLayer | undefined, phase: AnimationPhase) {
  return layer?.animations?.find((animation) => (animation.phase || "in") === phase);
}

const emojiPresets = [
  { name: "Happy Face", emoji: "\u{1F600}" },
  { name: "Big Smile", emoji: "\u{1F603}" },
  { name: "Laugh", emoji: "\u{1F602}" },
  { name: "Cool", emoji: "\u{1F60E}" },
  { name: "Shocked", emoji: "\u{1F631}" },
  { name: "Mind Blown", emoji: "\u{1F92F}" },
  { name: "Fire", emoji: "\u{1F525}" },
  { name: "Star", emoji: "\u{2B50}" },
  { name: "Sparkles", emoji: "\u{2728}" },
  { name: "Warning", emoji: "\u{26A0}\u{FE0F}" },
  { name: "Money", emoji: "\u{1F4B0}" },
  { name: "Rocket", emoji: "\u{1F680}" },
  { name: "Target", emoji: "\u{1F3AF}" },
  { name: "Eyes", emoji: "\u{1F440}" },
  { name: "Thumbs Up", emoji: "\u{1F44D}" },
  { name: "Heart", emoji: "\u{2764}\u{FE0F}" },
  { name: "Lightning", emoji: "\u{26A1}" },
  { name: "Check", emoji: "\u{2705}" },
  { name: "Cross", emoji: "\u{274C}" },
  { name: "Alarm", emoji: "\u{1F6A8}" },
  { name: "Megaphone", emoji: "\u{1F4E3}" },
  { name: "Crown", emoji: "\u{1F451}" },
  { name: "Trophy", emoji: "\u{1F3C6}" },
  { name: "Camera", emoji: "\u{1F4F8}" },
] as const;

const fontGroups = PIXORES_FONT_GROUPS;

type TextTemplatePreset = {
  id?: string;
  label: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  description?: string;
  previewBackground?: string;
  animation?: LayerAnimationType;
  animationDuration?: number;
  patch?: Partial<VideoLayer>;
};

const textPresets: TextTemplatePreset[] = [
  { id: "bold-title", label: "Bold Title", text: "Bold Title", fontSize: 64, fontFamily: "Anton", color: "#111827" },
  { id: "clean-subtitle", label: "Clean Subtitle", text: "Clean Subtitle", fontSize: 38, fontFamily: "Trebuchet MS", color: "#1F2937" },
  { id: "body-caption", label: "Body Caption", text: "Body Caption", fontSize: 26, fontFamily: "Georgia", color: "#334155" },
];

const animatedTextPresets: TextTemplatePreset[] = [
  { id: "impact-stomp", label: "Impact Stomp", text: "BIG MOMENT", fontSize: 72, fontFamily: "Anton", color: "#FFFFFF", description: "Strong impact entrance", previewBackground: "#DC2626", animation: "stomp", animationDuration: 0.8, patch: { isBold: true, isUppercase: true, strokeColor: "#111827", strokeWidth: 3, strokeOpacity: 1, textAlign: "center" } },
  { id: "neon-night", label: "Neon Night", text: "NEON NIGHT", fontSize: 62, fontFamily: "Montserrat", color: "#ECFEFF", description: "Flicker and electric glow", previewBackground: "#111827", animation: "neon", animationDuration: 1.2, patch: { isBold: true, textAlign: "center", glowColor: "#22D3EE", glowRadius: 24, textEffectPreset: "neon", strokeColor: "#A5F3FC", strokeWidth: 1, strokeOpacity: 1 } },
  { id: "clean-wipe", label: "Clean Wipe", text: "A CLEAN STORY", fontSize: 56, fontFamily: "Montserrat", color: "#0F172A", description: "Editorial left-to-right reveal", previewBackground: "#F8FAFC", animation: "wipe", animationDuration: 0.85, patch: { isBold: true, letterSpacing: 1.4, textAlign: "left" } },
  { id: "creator-pop", label: "Creator Pop", text: "WATCH THIS!", fontSize: 66, fontFamily: "Anton", color: "#111827", description: "Fast social-media pop", previewBackground: "#FACC15", animation: "burst", animationDuration: 0.75, patch: { isBold: true, isUppercase: true, hasTextBg: true, textBgColor: "#FACC15", textBgPadding: 14, textBgRadius: 10, textAlign: "center" } },
  { id: "soft-drift", label: "Soft Drift", text: "A quiet moment", fontSize: 50, fontFamily: "Georgia", color: "#FFFFFF", description: "Soft cinematic movement", previewBackground: "#334155", animation: "drift", animationDuration: 1.35, patch: { isItalic: true, textAlign: "center", shadowColor: "#000000", shadowBlur: 12, shadowOpacity: 0.65, shadowOffsetY: 4 } },
  { id: "tech-block", label: "Tech Block", text: "NEXT // 01", fontSize: 56, fontFamily: "Montserrat", color: "#D9F99D", description: "Structured center reveal", previewBackground: "#052E16", animation: "block", animationDuration: 0.8, patch: { isBold: true, letterSpacing: 2, hasTextBg: true, textBgColor: "#052E16", textBgPadding: 13, textBgRadius: 3, textAlign: "center" } },
];

const backgroundTextPresets: TextTemplatePreset[] = [
  { id: "coral-pill", label: "Coral Pill", text: "NEW EPISODE", fontSize: 48, fontFamily: "Montserrat", color: "#FFFFFF", previewBackground: "#F43F5E", animation: "pop", patch: { isBold: true, hasTextBg: true, textBgColor: "#F43F5E", textBgPadding: 14, textBgRadius: 999, textAlign: "center" } },
  { id: "cyan-label", label: "Cyan Label", text: "FEATURED", fontSize: 48, fontFamily: "Anton", color: "#082F49", previewBackground: "#22D3EE", animation: "slideInLeft", patch: { isBold: true, hasTextBg: true, textBgColor: "#22D3EE", textBgPadding: 12, textBgRadius: 4, textAlign: "center" } },
  { id: "violet-card", label: "Violet Card", text: "YOUR MESSAGE", fontSize: 48, fontFamily: "Montserrat", color: "#FFFFFF", previewBackground: "#7C3AED", animation: "rise", patch: { isBold: true, hasTextBg: true, textBgColor: "#7C3AED", textBgPadding: 15, textBgRadius: 14, textAlign: "center", shadowColor: "#000000", shadowBlur: 14, shadowOpacity: 0.4, shadowOffsetY: 6 } },
  { id: "mono-caption", label: "Mono Caption", text: "THE STORY CONTINUES", fontSize: 45, fontFamily: "Montserrat", color: "#FFFFFF", previewBackground: "#111827", animation: "baseline", patch: { isBold: true, hasTextBg: true, textBgColor: "#111827", textBgPadding: 13, textBgRadius: 0, letterSpacing: 1.5, textAlign: "center" } },
  { id: "lime-tag", label: "Lime Tag", text: "QUICK TIP", fontSize: 50, fontFamily: "Anton", color: "#1A2E05", previewBackground: "#A3E635", animation: "fun", patch: { isBold: true, hasTextBg: true, textBgColor: "#A3E635", textBgPadding: 12, textBgRadius: 8, angle: -2, textAlign: "center" } },
  { id: "white-glass", label: "White Glass", text: "MINIMAL TITLE", fontSize: 46, fontFamily: "Montserrat", color: "#0F172A", previewBackground: "#E2E8F0", animation: "corporate", patch: { isBold: true, hasTextBg: true, textBgColor: "#E2E8F0", textBgPadding: 14, textBgRadius: 18, textAlign: "center" } },
];

const initialLayers: VideoLayer[] = [];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(color: string) {
  const normalized = color.trim().replace(/^#/, "");
  const value = normalized.length === 3
    ? normalized.split("").map((character) => `${character}${character}`).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const numeric = Number.parseInt(value, 16);
  if (!Number.isFinite(numeric)) return { red: 0, green: 255, blue: 0 };
  return {
    red: (numeric >> 16) & 255,
    green: (numeric >> 8) & 255,
    blue: numeric & 255,
  };
}

function colorWithOpacity(color: string, opacity: number) {
  const { red, green, blue } = hexToRgb(color);
  return `rgba(${red}, ${green}, ${blue}, ${clamp(opacity, 0, 1)})`;
}

function getLayerShadowPreset(layer: VideoLayer): ShadowPreset {
  if (layer.shadowPreset) return layer.shadowPreset;
  return (layer.shadowBlur || 0) > 0 ? "drop" : "none";
}

function getLayerShadowSettings(layer: VideoLayer) {
  const preset = getLayerShadowPreset(layer);
  const size = Math.max(0, layer.shadowBlur || 0);
  const opacity = clamp(layer.shadowOpacity ?? 0.6, 0, 1);
  const color = colorWithOpacity(layer.shadowColor || "#000000", opacity);
  if (preset === "none" || size <= 0 || opacity <= 0) return null;

  if (preset === "glow") return { preset, size, color, blur: size, offsetX: 0, offsetY: 0 };
  if (preset === "outline") return { preset, size, color, blur: Math.max(1, size * 0.18), offsetX: 0, offsetY: 0 };
  if (preset === "curved") return { preset, size, color, blur: Math.max(2, size * 0.34), offsetX: 0, offsetY: Math.max(3, size * 0.62) };
  if (preset === "pageLift") return { preset, size, color, blur: Math.max(2, size * 0.42), offsetX: 0, offsetY: Math.max(4, size * 0.7) };
  if (preset === "angled") return { preset, size, color, blur: Math.max(1, size * 0.24), offsetX: Math.max(4, size * 0.72), offsetY: Math.max(3, size * 0.52) };
  if (preset === "backdrop") return { preset, size, color, blur: Math.max(0.5, size * 0.08), offsetX: Math.max(5, size * 0.9), offsetY: Math.max(3, size * 0.48) };
  return {
    preset,
    size,
    color,
    blur: size,
    offsetX: layer.shadowOffsetX ?? Math.max(4, size * 0.4),
    offsetY: layer.shadowOffsetY ?? Math.max(4, size * 0.45),
  };
}

function getLayerShadowFilters(layer: VideoLayer) {
  const shadow = getLayerShadowSettings(layer);
  if (!shadow) return [];
  if (shadow.preset === "outline") {
    const spread = Math.max(1, shadow.size * 0.18);
    return [
      `drop-shadow(${spread}px 0 ${shadow.blur}px ${shadow.color})`,
      `drop-shadow(${-spread}px 0 ${shadow.blur}px ${shadow.color})`,
      `drop-shadow(0 ${spread}px ${shadow.blur}px ${shadow.color})`,
      `drop-shadow(0 ${-spread}px ${shadow.blur}px ${shadow.color})`,
    ];
  }
  if (shadow.preset === "curved") {
    const side = Math.max(2, shadow.size * 0.3);
    return [
      `drop-shadow(${-side}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color})`,
      `drop-shadow(${side}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color})`,
    ];
  }
  return [`drop-shadow(${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color})`];
}

function getLayerCanvasFilter(layer: VideoLayer) {
  const intensity = clamp(layer.effect?.intensity ?? 1, 0, 1);
  const filters: string[] = [];
  if (layer.blur) filters.push(`blur(${layer.blur}px)`);
  filters.push(...getLayerShadowFilters(layer));

  if (layer.effect?.preset === "cinematic") {
    filters.push(`brightness(${1 - 0.1 * intensity})`, `contrast(${1 + 0.28 * intensity})`, `saturate(${1 - 0.14 * intensity})`);
  } else if (layer.effect?.preset === "vivid") {
    filters.push(`contrast(${1 + 0.12 * intensity})`, `saturate(${1 + 0.55 * intensity})`);
  } else if (layer.effect?.preset === "warm") {
    filters.push(`sepia(${0.28 * intensity})`, `saturate(${1 + 0.18 * intensity})`, `hue-rotate(${-8 * intensity}deg)`);
  } else if (layer.effect?.preset === "cool") {
    filters.push(`saturate(${1 + 0.08 * intensity})`, `hue-rotate(${14 * intensity}deg)`, `brightness(${1 - 0.03 * intensity})`);
  } else if (layer.effect?.preset === "noir") {
    filters.push(`grayscale(${intensity})`, `contrast(${1 + 0.32 * intensity})`);
  } else if (layer.effect?.preset === "vintage") {
    filters.push(`sepia(${0.58 * intensity})`, `contrast(${1 - 0.08 * intensity})`, `saturate(${1 - 0.22 * intensity})`);
  } else if (layer.effect?.preset === "dream") {
    filters.push(`brightness(${1 + 0.12 * intensity})`, `saturate(${1 - 0.12 * intensity})`, `blur(${0.9 * intensity}px)`);
  } else if (layer.effect?.preset === "bodyGlow") {
    filters.push(`saturate(${1 + 0.2 * intensity})`, `drop-shadow(0px 0px ${6 + 18 * intensity}px #22d3ee)`);
  } else if (layer.effect?.preset === "neonOutline") {
    filters.push(`contrast(${1 + 0.16 * intensity})`, `drop-shadow(0px 0px ${4 + 10 * intensity}px #22d3ee)`, `drop-shadow(0px 0px ${8 + 16 * intensity}px #a855f7)`);
  } else if (layer.effect?.preset === "silhouette") {
    filters.push(`brightness(${1 - intensity})`, `contrast(${1 + 4 * intensity})`);
  } else if (layer.effect?.preset === "ghostBody") {
    filters.push(`grayscale(${0.65 * intensity})`, `brightness(${1 + 0.25 * intensity})`, `opacity(${1 - 0.45 * intensity})`, `drop-shadow(0px 0px ${5 + 12 * intensity}px #a5f3fc)`);
  } else if (layer.effect?.preset === "objectPop") {
    filters.push(`contrast(${1 + 0.25 * intensity})`, `saturate(${1 + 0.32 * intensity})`, `drop-shadow(0px ${3 + 7 * intensity}px ${4 + 10 * intensity}px rgba(0, 0, 0, 0.72))`);
  } else if (layer.effect?.preset === "bodyHeat") {
    filters.push(`sepia(${0.45 * intensity})`, `saturate(${1 + 1.15 * intensity})`, `hue-rotate(${-24 * intensity}deg)`, `contrast(${1 + 0.12 * intensity})`);
  }

  return filters.length ? filters.join(" ") : "none";
}

function applyChromaKeyToCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  effect: NonNullable<LayerEffectConfig["chromaKey"]>,
  intensity: number,
) {
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const key = hexToRgb(effect.color);
  const similarity = clamp(effect.similarity, 0, 1) * clamp(intensity, 0, 1);
  const smoothness = Math.max(0.005, clamp(effect.smoothness, 0, 1));
  const spill = clamp(effect.spill, 0, 1) * clamp(intensity, 0, 1);
  const maxDistance = Math.sqrt(3 * 255 * 255);

  for (let index = 0; index < pixels.length; index += 4) {
    const redDifference = pixels[index] - key.red;
    const greenDifference = pixels[index + 1] - key.green;
    const blueDifference = pixels[index + 2] - key.blue;
    const distance = Math.sqrt(
      redDifference * redDifference
      + greenDifference * greenDifference
      + blueDifference * blueDifference,
    ) / maxDistance;
    const alphaFactor = clamp((distance - similarity) / smoothness, 0, 1);
    pixels[index + 3] = Math.round(pixels[index + 3] * alphaFactor);

    const greenExcess = Math.max(0, pixels[index + 1] - Math.max(pixels[index], pixels[index + 2]));
    pixels[index + 1] = Math.max(0, Math.round(pixels[index + 1] - greenExcess * spill * (1 - alphaFactor * 0.35)));
  }

  context.putImageData(imageData, 0, 0);
}

function applyTransitionEasing(progress: number, easing: VideoLayer["easing"] = "easeInOut") {
  if (easing === "linear") return progress;
  if (easing === "easeIn") return progress * progress;
  if (easing === "easeOut") return 1 - ((1 - progress) * (1 - progress));
  return progress < 0.5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2;
}

function drawLayerMedia(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  layer: VideoLayer,
  width: number,
  height: number,
  localTime = 0,
) {
  const crop = layer.crop || { x: 0, y: 0, width: 100, height: 100, unit: "percent" as const };
  const transform = layer.transform || { scale: 1, x: 0, y: 0 };
  const smartReframe = resolveSmartReframeAtTime(layer.smartReframe, localTime);
  const cropX = clamp(crop.x, 0, 100) / 100 * sourceWidth;
  const cropY = clamp(crop.y, 0, 100) / 100 * sourceHeight;
  const cropWidth = clamp(crop.width, 1, 100 - crop.x) / 100 * sourceWidth;
  const cropHeight = clamp(crop.height, 1, 100 - crop.y) / 100 * sourceHeight;
  context.save();
  context.translate(width / 2, height / 2);
  const mediaScale = Math.max(0.1, (transform.scale || 1) * (smartReframe?.zoom || 1));
  context.scale(mediaScale, mediaScale);
  context.translate((transform.x || 0) / 100 * width, (transform.y || 0) / 100 * height);
  context.translate(-width / 2, -height / 2);

  if ((layer.objectFit || "contain") === "contain") {
    const scale = Math.min(width / cropWidth, height / cropHeight);
    const drawWidth = cropWidth * scale;
    const drawHeight = cropHeight * scale;
    context.drawImage(source, cropX, cropY, cropWidth, cropHeight, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    context.restore();
    return;
  }

  const scale = Math.max(width / cropWidth, height / cropHeight);
  const drawWidth = cropWidth * scale;
  const drawHeight = cropHeight * scale;
  const positionX = smartReframe?.centerX ?? 0.5;
  const positionY = smartReframe?.centerY ?? 0.5;
  context.drawImage(source, cropX, cropY, cropWidth, cropHeight, (width - drawWidth) * positionX, (height - drawHeight) * positionY, drawWidth, drawHeight);
  context.restore();
}

function ensureVideoMakerFontLoaded(fontFamily?: string) {
  return ensurePixoresFontLoaded(fontFamily);
}

function ensureVideoMakerFontGroupLoaded(groupLabel: string, fontFamilies: readonly string[]) {
  void groupLabel;
  return ensurePixoresFontsLoaded(fontFamilies);
}

function createStarPath(context: CanvasRenderingContext2D, centerX: number, centerY: number, outerRadius: number, innerRadius: number) {
  context.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const angle = (-Math.PI / 2) + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const pointX = centerX + Math.cos(angle) * radius;
    const pointY = centerY + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.closePath();
}

function drawShape(context: CanvasRenderingContext2D, layer: VideoLayer, x: number, y: number, width: number, height: number, timelineTime = 0) {
  const color = layer.color || "#3B82F6";
  const strokeWidth = layer.strokeWidth ?? Math.max(4, Math.min(width, height) * 0.06);
  context.fillStyle = color;
  context.strokeStyle = colorWithOpacity(layer.strokeColor || color, layer.strokeOpacity ?? 1);
  context.lineWidth = Math.max(0.01, strokeWidth);
  const fillAndStroke = () => {
    context.fill();
    if (strokeWidth > 0) context.stroke();
  };

  if (layer.shapeType === "gradient") {
    const gradient = context.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, layer.gradientColor1 || color);
    gradient.addColorStop(1, layer.gradientColor2 || "#FFFFFF");
    context.fillStyle = gradient;
    context.fillRect(x, y, width, height);
    if (strokeWidth > 0) context.strokeRect(x + strokeWidth / 2, y + strokeWidth / 2, width - strokeWidth, height - strokeWidth);
    return;
  }

  if (layer.shapeType === "circle") {
    context.beginPath();
    context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    fillAndStroke();
    return;
  }

  if (layer.shapeType === "triangle") {
    context.beginPath();
    context.moveTo(x + width / 2, y);
    context.lineTo(x + width, y + height);
    context.lineTo(x, y + height);
    context.closePath();
    context.fill();
    return;
  }

  if (layer.shapeType === "star") {
    createStarPath(context, x + width / 2, y + height / 2, Math.min(width, height) / 2, Math.min(width, height) / 4);
    fillAndStroke();
    return;
  }

  if (layer.shapeType === "arrow") {
    context.beginPath();
    context.moveTo(x, y + height * 0.36);
    context.lineTo(x + width * 0.62, y + height * 0.36);
    context.lineTo(x + width * 0.62, y + height * 0.12);
    context.lineTo(x + width, y + height / 2);
    context.lineTo(x + width * 0.62, y + height * 0.88);
    context.lineTo(x + width * 0.62, y + height * 0.64);
    context.lineTo(x, y + height * 0.64);
    context.closePath();
    fillAndStroke();
    return;
  }

  if (layer.shapeType === "line" || layer.shapeType === "dashedLine") {
    context.beginPath();
    context.setLineDash(layer.shapeType === "dashedLine" ? [18, 12] : []);
    context.moveTo(x, y + height / 2);
    context.lineTo(x + width, y + height / 2);
    context.stroke();
    context.setLineDash([]);
    return;
  }

  if (layer.shapeType === "frame") {
    context.strokeRect(x + strokeWidth / 2, y + strokeWidth / 2, width - strokeWidth, height - strokeWidth);
    return;
  }

  if (layer.shapeType === "roundedFrame") {
    context.beginPath();
    context.roundRect(x + strokeWidth / 2, y + strokeWidth / 2, width - strokeWidth, height - strokeWidth, Math.min(width, height) * 0.14);
    context.stroke();
    return;
  }

  if (layer.shapeType === "circleFrame") {
    context.beginPath();
    context.ellipse(x + width / 2, y + height / 2, (width - strokeWidth) / 2, (height - strokeWidth) / 2, 0, 0, Math.PI * 2);
    context.stroke();
    return;
  }

  if (layer.shapeType === "triangleFrame") {
    context.beginPath();
    context.moveTo(x + width / 2, y + strokeWidth / 2);
    context.lineTo(x + width - strokeWidth / 2, y + height - strokeWidth / 2);
    context.lineTo(x + strokeWidth / 2, y + height - strokeWidth / 2);
    context.closePath();
    context.stroke();
    return;
  }

  if (layer.shapeType === "neonFrame" || layer.shapeType === "neonPulseFrame") {
    const pulse = layer.shapeType === "neonPulseFrame" ? 0.72 + Math.sin(timelineTime * Math.PI * 3) * 0.28 : 1;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = Math.max(3, strokeWidth * 0.72);
    context.shadowColor = color;
    context.shadowBlur = Math.max(10, strokeWidth * 3.2) * pulse;
    context.beginPath();
    context.roundRect(x + strokeWidth, y + strokeWidth, width - strokeWidth * 2, height - strokeWidth * 2, Math.min(width, height) * 0.08);
    context.stroke();
    context.globalAlpha = 0.68;
    context.lineWidth = Math.max(1.5, strokeWidth * 0.22);
    context.strokeStyle = "#ffffff";
    context.stroke();
    context.restore();
    return;
  }

  if (layer.shapeType === "rgbLightsFrame") {
    const hueOffset = (timelineTime * 120) % 360;
    const gradient = context.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, `hsl(${hueOffset} 100% 60%)`);
    gradient.addColorStop(0.33, `hsl(${(hueOffset + 120) % 360} 100% 60%)`);
    gradient.addColorStop(0.66, `hsl(${(hueOffset + 240) % 360} 100% 60%)`);
    gradient.addColorStop(1, `hsl(${hueOffset} 100% 60%)`);
    context.save();
    context.strokeStyle = gradient;
    context.lineWidth = Math.max(5, strokeWidth);
    context.shadowColor = color;
    context.shadowBlur = Math.max(8, strokeWidth * 2);
    context.strokeRect(x + strokeWidth, y + strokeWidth, width - strokeWidth * 2, height - strokeWidth * 2);
    context.restore();
    return;
  }

  if (layer.shapeType === "lightSweepFrame") {
    const sweep = ((timelineTime * 0.65) % 1 + 1) % 1;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = Math.max(3, strokeWidth * 0.55);
    context.strokeRect(x + strokeWidth, y + strokeWidth, width - strokeWidth * 2, height - strokeWidth * 2);
    const shine = context.createLinearGradient(x + width * (sweep - 0.18), y, x + width * (sweep + 0.18), y);
    shine.addColorStop(0, "rgba(255,255,255,0)");
    shine.addColorStop(0.5, "rgba(255,255,255,1)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    context.strokeStyle = shine;
    context.lineWidth = Math.max(6, strokeWidth * 1.5);
    context.shadowColor = "#ffffff";
    context.shadowBlur = Math.max(12, strokeWidth * 3);
    context.strokeRect(x + strokeWidth, y + strokeWidth, width - strokeWidth * 2, height - strokeWidth * 2);
    context.restore();
    return;
  }

  if (layer.shapeType === "cinemaFrame") {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = Math.max(3, strokeWidth * 0.5);
    context.strokeRect(x + strokeWidth, y + strokeWidth, width - strokeWidth * 2, height - strokeWidth * 2);
    context.strokeStyle = "rgba(255,255,255,0.72)";
    context.lineWidth = Math.max(1, strokeWidth * 0.14);
    context.strokeRect(x + strokeWidth * 2.1, y + strokeWidth * 2.1, width - strokeWidth * 4.2, height - strokeWidth * 4.2);
    context.restore();
    return;
  }

  if (layer.shapeType?.startsWith("paper") || layer.shapeType === "paperFrame") {
    const inset = Math.max(2, strokeWidth * 0.35);
    context.save();
    context.shadowColor = "rgba(15, 23, 42, 0.24)";
    context.shadowBlur = Math.max(8, strokeWidth * 1.4);
    context.shadowOffsetY = Math.max(3, strokeWidth * 0.5);
    context.fillStyle = color;
    context.beginPath();
    if (layer.shapeType === "paperStripFrame") {
      const tooth = width / 10;
      context.moveTo(x, y + height * 0.12);
      for (let index = 0; index <= 10; index += 1) context.lineTo(x + tooth * index, y + (index % 2 ? 0 : height * 0.12));
      context.lineTo(x + width, y + height * 0.88);
      for (let index = 10; index >= 0; index -= 1) context.lineTo(x + tooth * index, y + (index % 2 ? height : height * 0.88));
    } else if (layer.shapeType === "paperLeftFrame") {
      context.moveTo(x + width * 0.12, y);
      context.lineTo(x + width, y + inset);
      context.lineTo(x + width * 0.9, y + height);
      context.lineTo(x, y + height * 0.88);
    } else if (layer.shapeType === "paperRightFrame") {
      context.moveTo(x, y + inset);
      context.lineTo(x + width * 0.88, y);
      context.lineTo(x + width, y + height * 0.88);
      context.lineTo(x + width * 0.1, y + height);
    } else {
      context.moveTo(x + inset, y);
      context.lineTo(x + width - inset, y + inset * 0.4);
      context.lineTo(x + width, y + height - inset);
      context.lineTo(x + width - inset * 0.5, y + height);
      context.lineTo(x, y + height - inset * 0.5);
    }
    context.closePath();
    context.fill();
    context.restore();
    return;
  }

  if (layer.shapeType === "phoneFrame" || layer.shapeType === "tabletFrame") {
    const radius = layer.shapeType === "phoneFrame" ? Math.min(width, height) * 0.16 : Math.min(width, height) * 0.09;
    context.beginPath();
    context.roundRect(x + strokeWidth / 2, y + strokeWidth / 2, width - strokeWidth, height - strokeWidth, radius);
    context.stroke();
    context.beginPath();
    context.lineWidth = Math.max(2, strokeWidth * 0.42);
    if (layer.shapeType === "phoneFrame") {
      context.moveTo(x + width * 0.4, y + strokeWidth * 1.3);
      context.lineTo(x + width * 0.6, y + strokeWidth * 1.3);
    } else {
      context.arc(x + width - strokeWidth * 1.4, y + height / 2, Math.max(2, strokeWidth * 0.22), 0, Math.PI * 2);
    }
    context.stroke();
    return;
  }

  if (layer.shapeType === "laptopFrame") {
    context.beginPath();
    context.roundRect(x + width * 0.08, y + strokeWidth / 2, width * 0.84, height * 0.78, Math.min(width, height) * 0.05);
    context.stroke();
    context.beginPath();
    context.moveTo(x, y + height * 0.82);
    context.lineTo(x + width, y + height * 0.82);
    context.lineTo(x + width * 0.88, y + height);
    context.lineTo(x + width * 0.12, y + height);
    context.closePath();
    context.stroke();
    return;
  }

  if (layer.shapeType === "vsDividerFrame") {
    context.fillStyle = color;
    context.fillRect(x, y, width * 0.47, height);
    context.fillStyle = layer.strokeColor || "#111827";
    context.fillRect(x + width * 0.53, y, width * 0.47, height);
    context.beginPath();
    context.fillStyle = "#ffffff";
    context.arc(x + width / 2, y + height / 2, Math.min(width, height) * 0.16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#111827";
    context.font = `900 ${Math.max(12, Math.min(width, height) * 0.16)}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("VS", x + width / 2, y + height / 2);
    return;
  }

  if (layer.shapeType === "splitScreenFrame" || layer.shapeType === "diagonalSplitFrame") {
    context.strokeRect(x + strokeWidth / 2, y + strokeWidth / 2, width - strokeWidth, height - strokeWidth);
    context.beginPath();
    if (layer.shapeType === "diagonalSplitFrame") {
      context.moveTo(x + width * 0.32, y);
      context.lineTo(x + width * 0.68, y + height);
    } else {
      context.moveTo(x + width / 2, y);
      context.lineTo(x + width / 2, y + height);
    }
    context.stroke();
    return;
  }

  if (layer.shapeType?.startsWith("grid")) {
    context.strokeRect(x + strokeWidth / 2, y + strokeWidth / 2, width - strokeWidth, height - strokeWidth);
    context.beginPath();
    if (layer.shapeType === "gridTwoColumns" || layer.shapeType === "gridThreeColumns") {
      const divisions = layer.shapeType === "gridTwoColumns" ? 2 : 3;
      for (let index = 1; index < divisions; index += 1) {
        context.moveTo(x + (width / divisions) * index, y);
        context.lineTo(x + (width / divisions) * index, y + height);
      }
    } else if (layer.shapeType === "gridTwoRows" || layer.shapeType === "gridThreeRows") {
      const divisions = layer.shapeType === "gridTwoRows" ? 2 : 3;
      for (let index = 1; index < divisions; index += 1) {
        context.moveTo(x, y + (height / divisions) * index);
        context.lineTo(x + width, y + (height / divisions) * index);
      }
    } else if (layer.shapeType === "gridFour") {
      context.moveTo(x + width / 2, y);
      context.lineTo(x + width / 2, y + height);
      context.moveTo(x, y + height / 2);
      context.lineTo(x + width, y + height / 2);
    } else if (layer.shapeType === "gridHeroLeft") {
      context.moveTo(x + width * 0.64, y);
      context.lineTo(x + width * 0.64, y + height);
      context.moveTo(x + width * 0.64, y + height / 2);
      context.lineTo(x + width, y + height / 2);
    } else if (layer.shapeType === "gridHeroTop") {
      context.moveTo(x, y + height * 0.64);
      context.lineTo(x + width, y + height * 0.64);
      context.moveTo(x + width / 2, y + height * 0.64);
      context.lineTo(x + width / 2, y + height);
    }
    context.stroke();
    return;
  }

  if (layer.shapeType === "speechBubble") {
    context.beginPath();
    context.roundRect(x, y, width, height * 0.78, 18);
    fillAndStroke();
    context.beginPath();
    context.moveTo(x + width * 0.18, y + height * 0.76);
    context.lineTo(x + width * 0.28, y + height);
    context.lineTo(x + width * 0.42, y + height * 0.76);
    context.closePath();
    fillAndStroke();
    return;
  }

  if (layer.shapeType === "badge") {
    createStarPath(context, x + width / 2, y + height / 2, Math.min(width, height) / 2, Math.min(width, height) * 0.42);
    fillAndStroke();
    return;
  }

  context.fillRect(x, y, width, height);
  if (strokeWidth > 0) context.strokeRect(x + strokeWidth / 2, y + strokeWidth / 2, width - strokeWidth, height - strokeWidth);
}

function traceLowerThirdLogoPath(
  context: CanvasRenderingContext2D,
  shape: "rounded" | "circle" | "triangle",
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  if (shape === "triangle") {
    context.moveTo(x + width / 2, y);
    context.lineTo(x + width, y + height);
    context.lineTo(x, y + height);
    context.closePath();
    return;
  }

  context.roundRect(x, y, width, height, shape === "circle" ? Math.min(width, height) / 2 : radius);
}

function drawLowerThird(
  context: CanvasRenderingContext2D,
  layer: VideoLayer,
  layerWidth: number,
  layerHeight: number,
  relativeTime: number,
  resolveLogo: (assetId: string) => HTMLImageElement | undefined,
) {
  if (!layer.lowerThird) return;
  const primitives = getLowerThirdRenderModel(layer.lowerThird, relativeTime, layer.duration);
  primitives.forEach((primitive) => {
    const x = (primitive.x / 100) * layerWidth;
    const y = (primitive.y / 100) * layerHeight;
    const width = (primitive.width / 100) * layerWidth;
    const height = (primitive.height / 100) * layerHeight;
    context.save();
    context.globalAlpha *= primitive.opacity;
    context.translate((primitive.translateX / 100) * layerWidth, 0);
    if (primitive.scale !== 1) {
      context.translate(x + width / 2, y + height / 2);
      context.scale(primitive.scale, primitive.scale);
      context.translate(-(x + width / 2), -(y + height / 2));
    }
    context.fillStyle = primitive.resolvedColor;

    const logoShape = layer.lowerThird?.logo?.shape || (layer.lowerThird?.logo?.circular ? "circle" : "rounded");
    if (primitive.kind === "frame") {
      traceLowerThirdLogoPath(context, logoShape, x, y, width, height, primitive.radius || 0);
      context.fill();
    } else if (primitive.kind === "logo") {
      const logoId = layer.lowerThird?.content.logoSourceId;
      const logo = logoId ? resolveLogo(logoId) : undefined;
      traceLowerThirdLogoPath(context, logoShape, x, y, width, height, primitive.radius || 0);
      context.clip();
      context.fillRect(x, y, width, height);
      if (logo?.complete && logo.naturalWidth > 0) {
        const objectFit = layer.lowerThird?.logo?.objectFit || "contain";
        const scale = objectFit === "cover"
          ? Math.max(width / logo.naturalWidth, height / logo.naturalHeight)
          : Math.min(width / logo.naturalWidth, height / logo.naturalHeight);
        const drawWidth = logo.naturalWidth * scale;
        const drawHeight = logo.naturalHeight * scale;
        context.drawImage(logo, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
      }
    } else if (primitive.kind === "text") {
      const fontSize = Math.max(10, (primitive.fontSize || 22) * (layerWidth / 640));
      context.font = `${primitive.fontWeight || 700} ${fontSize}px "${primitive.fontFamily}", Inter, Arial, sans-serif`;
      context.textBaseline = "middle";
      context.letterSpacing = `${primitive.letterSpacing || 0}px`;
      context.fillText(primitive.resolvedText || "", x, y + height / 2, width);
    } else if (primitive.kind === "rect" && primitive.radius) {
      context.beginPath();
      context.roundRect(x, y, width, height, primitive.radius * (layerWidth / 640));
      context.fill();
    } else {
      context.fillRect(x, y, width, height);
    }
    context.restore();
  });
}

function LowerThirdTemplatePreview({ template }: { template: LowerThirdTemplate }) {
  const config = createLowerThirdConfig(template.id);
  const primitives = getLowerThirdRenderModel(config, 1, 5);
  const logoShape = config.logo?.shape || (config.logo?.circular ? "circle" : "rounded");
  return (
    <span className={styles.lowerThirdPreview} aria-hidden="true">
      {primitives.map((primitive) => (
        <span
          key={primitive.id}
          className={primitive.kind === "text" ? styles.lowerThirdPreviewText : styles.lowerThirdPreviewShape}
          style={{
            left: `${primitive.x}%`,
            top: `${primitive.y}%`,
            width: `${primitive.width}%`,
            height: `${primitive.height}%`,
            borderRadius: primitive.radius,
            clipPath: (primitive.kind === "logo" || primitive.kind === "frame") && logoShape === "triangle" ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
            background: primitive.kind === "text" ? "transparent" : primitive.resolvedColor,
            color: primitive.resolvedColor,
            fontFamily: `"${primitive.fontFamily}", Inter, Arial, sans-serif`,
            fontWeight: primitive.fontWeight,
            letterSpacing: primitive.letterSpacing,
          }}
        >
          {primitive.kind === "text" ? primitive.resolvedText : ""}
        </span>
      ))}
    </span>
  );
}

function LowerThirdColorControl({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const normalizedValue = normalizeLowerThirdColor(value);
  const commitDraft = (input: HTMLInputElement) => {
    const next = normalizeLowerThirdColor(input.value, normalizedValue);
    input.value = next;
    onChange(next);
  };

  return (
    <label className={styles.lowerThirdColorControl}>
      <span>{label}</span>
      <span className={styles.lowerThirdColorInputs}>
        <input
          className={styles.lowerThirdColorSwatch}
          disabled={disabled}
          type="color"
          value={normalizedValue}
          onInput={(event) => onChange(event.currentTarget.value)}
          aria-label={`${label} color picker`}
        />
        <input
          key={normalizedValue}
          className={styles.lowerThirdColorHex}
          disabled={disabled}
          type="text"
          inputMode="text"
          maxLength={7}
          defaultValue={normalizedValue}
          onInput={(event) => { event.currentTarget.value = event.currentTarget.value.toUpperCase(); }}
          onBlur={(event) => commitDraft(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft(event.currentTarget);
              event.currentTarget.blur();
            }
          }}
          aria-label={`${label} hexadecimal color`}
        />
      </span>
    </label>
  );
}

function AnimationPresetThumbnail({ preset, phase = "in" }: { preset: LayerAnimationPreset; phase?: AnimationPhase }) {
  const previewClass = styles[`animationPreview${preset.preview[0].toUpperCase()}${preset.preview.slice(1)}`];
  return (
    <span className={`${styles.animationPresetThumbnail} ${previewClass} ${phase === "out" ? styles.animationExitPreview : ""}`} aria-hidden="true">
      <span className={styles.animationPreviewArtwork}>
        <span className={styles.animationPreviewSun} />
        <span className={styles.animationPreviewMountain} />
      </span>
      <span className={styles.animationPreviewText}>ABC</span>
      <span className={styles.animationPreviewGlyph}>{preset.glyph}</span>
    </span>
  );
}

function TransitionPresetPreview({ preset }: { preset: TransitionPreset }) {
  const previewClass = styles[`transitionPreview${preset.transitionKind[0].toUpperCase()}${preset.transitionKind.slice(1)}`];
  return (
    <span className={`${styles.transitionPreview} ${previewClass}`} data-transition={preset.transitionKind} aria-hidden="true">
      <span className={`${styles.transitionPreviewScene} ${styles.transitionPreviewFrom}`}>
        <i className={styles.transitionPreviewSun} />
        <i className={styles.transitionPreviewLandscape} />
      </span>
      <span className={`${styles.transitionPreviewScene} ${styles.transitionPreviewTo}`}>
        <i className={styles.transitionPreviewMoon} />
        <i className={styles.transitionPreviewCity} />
      </span>
      <span className={styles.transitionPreviewEffect} />
      <span className={styles.transitionPreviewHint}><Play size={10} fill="currentColor" /> Hover preview</span>
    </span>
  );
}

function ElementPresetThumbnail({
  shapeType,
  color,
  category,
}: {
  shapeType: ShapeType;
  color: string;
  category: "shape" | "frame" | "grid";
}) {
  const gridCells = (() => {
    if (shapeType === "gridSingle") return [[12, 12, 136, 72]];
    if (shapeType === "gridTwoColumns") return [[12, 12, 65, 72], [83, 12, 65, 72]];
    if (shapeType === "gridTwoRows") return [[12, 12, 136, 33], [12, 51, 136, 33]];
    if (shapeType === "gridThreeColumns") return [[12, 12, 41, 72], [59, 12, 42, 72], [107, 12, 41, 72]];
    if (shapeType === "gridThreeRows") return [[12, 12, 136, 20], [12, 38, 136, 20], [12, 64, 136, 20]];
    if (shapeType === "gridFour") return [[12, 12, 65, 33], [83, 12, 65, 33], [12, 51, 65, 33], [83, 51, 65, 33]];
    if (shapeType === "gridHeroLeft") return [[12, 12, 86, 72], [104, 12, 44, 33], [104, 51, 44, 33]];
    return [[12, 12, 136, 46], [12, 64, 65, 20], [83, 64, 65, 20]];
  })();

  const artwork = (() => {
    if (category === "grid") {
      const fills = ["#6366f1", "#22d3c5", "#f59e0b", "#ec4899"];
      return gridCells.map(([x, y, width, height], index) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={width} height={height} rx="4" fill={fills[index % fills.length]} opacity="0.92" />
          <circle cx={x + width * 0.72} cy={y + height * 0.28} r={Math.min(5, height * 0.14)} fill="rgba(255,255,255,.72)" />
          <path d={`M ${x + 4} ${y + height - 5} L ${x + width * 0.38} ${y + height * 0.46} L ${x + width * 0.58} ${y + height * 0.72} L ${x + width - 4} ${y + height * 0.35} L ${x + width - 4} ${y + height - 5} Z`} fill="rgba(3,7,18,.3)" />
        </g>
      ));
    }

    if (category === "frame") {
      if (shapeType === "circleFrame") return <ellipse cx="80" cy="48" rx="36" ry="36" fill="none" stroke={color} strokeWidth="8" />;
      if (shapeType === "triangleFrame") return <path d="M80 9 L143 83 L17 83 Z" fill="none" stroke={color} strokeWidth="7" strokeLinejoin="round" />;
      if (shapeType === "roundedFrame") return <rect x="17" y="13" width="126" height="70" rx="17" fill="none" stroke={color} strokeWidth="7" />;
      if (shapeType === "neonFrame" || shapeType === "neonPulseFrame") return <><rect x="17" y="13" width="126" height="70" rx="9" fill="none" stroke={color} strokeWidth="11" opacity="0.24" /><rect x="17" y="13" width="126" height="70" rx="9" fill="none" stroke={color} strokeWidth="5" /><rect x="19" y="15" width="122" height="66" rx="7" fill="none" stroke="#ffffff" strokeWidth="1.5" /></>;
      if (shapeType === "rgbLightsFrame") return <><rect x="15" y="11" width="130" height="74" rx="7" fill="none" stroke="#22d3ee" strokeWidth="7" /><path d="M15 48 V11 H80" fill="none" stroke="#f472b6" strokeWidth="7" /><path d="M80 85 H145 V48" fill="none" stroke="#facc15" strokeWidth="7" /></>;
      if (shapeType === "lightSweepFrame") return <><rect x="16" y="12" width="128" height="72" rx="6" fill="none" stroke={color} strokeWidth="4" /><path d="M45 12 L68 84" stroke="#ffffff" strokeWidth="10" opacity="0.8" /></>;
      if (shapeType === "cinemaFrame") return <><rect x="15" y="11" width="130" height="74" fill="none" stroke={color} strokeWidth="6" /><rect x="23" y="19" width="114" height="58" fill="none" stroke="#fff7d6" strokeWidth="2" /></>;
      if (shapeType === "phoneFrame") return <><rect x="55" y="7" width="50" height="82" rx="11" fill="none" stroke={color} strokeWidth="7" /><line x1="70" y1="14" x2="90" y2="14" stroke={color} strokeWidth="4" strokeLinecap="round" /></>;
      if (shapeType === "tabletFrame") return <><rect x="27" y="11" width="106" height="74" rx="9" fill="none" stroke={color} strokeWidth="7" /><circle cx="124" cy="48" r="2.5" fill={color} /></>;
      if (shapeType === "laptopFrame") return <><rect x="34" y="10" width="92" height="61" rx="5" fill="none" stroke={color} strokeWidth="6" /><path d="M18 77 H142 L132 87 H28 Z" fill="none" stroke={color} strokeWidth="5" strokeLinejoin="round" /></>;
      if (shapeType === "vsDividerFrame") return <><path d="M10 10 H76 L64 86 H10 Z" fill={color} /><path d="M84 10 H150 V86 H96 Z" fill="#ef4444" /><circle cx="80" cy="48" r="16" fill="#f8fafc" /><text x="80" y="53" textAnchor="middle" fontSize="13" fontWeight="900" fill="#111827">VS</text></>;
      if (shapeType === "splitScreenFrame") return <><rect x="12" y="11" width="136" height="74" rx="5" fill="none" stroke={color} strokeWidth="6" /><line x1="80" y1="11" x2="80" y2="85" stroke={color} strokeWidth="6" /></>;
      if (shapeType === "diagonalSplitFrame") return <><rect x="12" y="11" width="136" height="74" rx="5" fill="none" stroke={color} strokeWidth="6" /><line x1="59" y1="11" x2="101" y2="85" stroke={color} strokeWidth="6" /></>;
      if (shapeType === "paperStripFrame") return <path d="M10 24 L20 17 L31 24 L43 17 L55 24 L67 17 L79 24 L91 17 L103 24 L115 17 L127 24 L139 17 L150 24 L144 72 L132 79 L120 72 L108 79 L96 72 L84 79 L72 72 L60 79 L48 72 L36 79 L24 72 L12 79 Z" fill={color} />;
      if (shapeType === "paperPortraitFrame" || shapeType === "paperSquareFrame") return <path d="M11 17 L148 11 L143 83 L16 87 Z" fill={color} />;
      if (shapeType === "paperLeftFrame") return <path d="M29 10 L148 15 L134 86 L12 78 Z" fill={color} />;
      if (shapeType === "paperRightFrame") return <path d="M12 15 L132 9 L148 78 L27 87 Z" fill={color} />;
      if (shapeType === "paperFrame") return <path d="M11 17 L148 11 L143 83 L16 87 Z" fill={color} />;
      return <rect x="14" y="12" width="132" height="72" rx="3" fill="none" stroke={color} strokeWidth="7" />;
    }

    if (shapeType === "circle") return <ellipse cx="80" cy="48" rx="38" ry="35" fill={color} />;
    if (shapeType === "triangle") return <path d="M80 10 L140 84 L20 84 Z" fill={color} />;
    if (shapeType === "star") return <path d="M80 7 L92 34 L122 29 L101 51 L112 81 L80 66 L48 81 L59 51 L38 29 L68 34 Z" fill={color} />;
    if (shapeType === "badge") return <path d="M80 8 L94 19 L112 16 L119 33 L137 41 L130 58 L136 76 L117 79 L104 91 L88 82 L70 89 L58 75 L39 71 L45 53 L35 37 L53 28 L61 11 Z" fill={color} />;
    if (shapeType === "speechBubble") return <path d="M22 17 H138 Q148 17 148 27 V64 Q148 74 138 74 H65 L43 88 L48 74 H22 Q12 74 12 64 V27 Q12 17 22 17 Z" fill={color} />;
    if (shapeType === "arrow") return <path d="M14 36 H99 V18 L148 48 L99 78 V60 H14 Z" fill={color} />;
    if (shapeType === "line" || shapeType === "dashedLine") return <line x1="14" y1="48" x2="146" y2="48" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={shapeType === "dashedLine" ? "16 12" : undefined} />;
    return <rect x="24" y="18" width="112" height="60" rx="8" fill={color} />;
  })();

  return (
    <span className={styles.elementThumbnail} data-frame-type={category === "frame" ? shapeType : undefined} aria-hidden="true">
      <svg viewBox="0 0 160 96" preserveAspectRatio="xMidYMid meet">
        <rect width="160" height="96" rx="12" fill={category === "shape" ? "#0a1020" : "#111827"} />
        {category === "frame" && (
          <>
            <circle cx="126" cy="25" r="10" fill="#fbbf24" opacity="0.86" />
            <path d="M0 82 L41 43 L67 67 L91 35 L160 85 V96 H0 Z" fill="#334155" />
            <path d="M0 88 L54 58 L81 77 L117 51 L160 84 V96 H0 Z" fill="#1e293b" />
          </>
        )}
        {category === "shape" && <path d="M0 75 C35 54 56 90 91 67 C119 48 139 61 160 47 V96 H0 Z" fill="#111c33" />}
        {artwork}
      </svg>
    </span>
  );
}

function VideoBackgroundLibraryCard({
  asset,
  onAdd,
}: {
  asset: PixoresBuiltInMediaAsset;
  onAdd: (asset: PixoresBuiltInMediaAsset) => void;
}) {
  const pausePreview = (button: HTMLButtonElement) => {
    const preview = button.querySelector("video");
    if (!preview) return;
    preview.pause();
    if (Number.isFinite(preview.duration)) preview.currentTime = Math.min(0.08, preview.duration || 0);
  };

  return (
    <button
      type="button"
      className={styles.videoBackgroundCard}
      aria-label={`Add ${asset.title} to timeline`}
      onClick={() => onAdd(asset)}
      onMouseEnter={(event) => {
        const preview = event.currentTarget.querySelector("video");
        if (preview) void preview.play().catch(() => undefined);
      }}
      onMouseLeave={(event) => pausePreview(event.currentTarget)}
      onFocus={(event) => {
        const preview = event.currentTarget.querySelector("video");
        if (preview) void preview.play().catch(() => undefined);
      }}
      onBlur={(event) => pausePreview(event.currentTarget)}
    >
      <span className={styles.videoBackgroundPreview}>
        <video src={resolveBuiltInMediaUrl(asset.path)} muted loop playsInline preload="metadata" />
        <span className={styles.libraryMediaBadge}><Film size={11} /> MP4</span>
        <span className={styles.libraryAddBadge}><Plus size={12} /> Add</span>
      </span>
      <span className={styles.libraryAssetCopy}>
        <strong>{asset.title}</strong>
        <small>Animated canvas background · {formatBytes(asset.size)}</small>
      </span>
    </button>
  );
}

function SoundEffectLibraryCard({
  asset,
  isPreviewing,
  onPreview,
  onAdd,
}: {
  asset: PixoresBuiltInMediaAsset;
  isPreviewing: boolean;
  onPreview: (asset: PixoresBuiltInMediaAsset) => void;
  onAdd: (asset: PixoresBuiltInMediaAsset) => void;
}) {
  return (
    <article className={`${styles.soundEffectCard} ${isPreviewing ? styles.previewingSoundEffect : ""}`}>
      <button
        type="button"
        className={styles.soundEffectPreview}
        aria-label={`${isPreviewing ? "Pause" : "Preview"} ${asset.title}`}
        aria-pressed={isPreviewing}
        onClick={() => onPreview(asset)}
      >
        <span className={styles.soundEffectPlayIcon}>{isPreviewing ? <Pause size={16} /> : <Play size={16} />}</span>
        <span className={styles.soundWaveform} aria-hidden="true">
          {Array.from({ length: 24 }, (_, index) => <i key={index} />)}
        </span>
      </button>
      <span className={styles.libraryAssetCopy}>
        <strong title={asset.title}>{asset.title}</strong>
        <small>Sound effect · {formatBytes(asset.size)}</small>
      </span>
      <button type="button" className={styles.soundEffectAddButton} onClick={() => onAdd(asset)} aria-label={`Add ${asset.title} to timeline`}>
        <Plus size={13} /> Add to Timeline
      </button>
    </article>
  );
}

function drawTransitionOverlay(
  context: CanvasRenderingContext2D,
  layer: VideoLayer,
  canvasWidth: number,
  canvasHeight: number,
  time: number,
) {
  const progress = clamp((time - layer.start) / Math.max(layer.duration, 0.1), 0, 1);
  const middleAlpha = Math.sin(progress * Math.PI);
  const color = layer.color || "#000000";
  context.save();

  if (layer.transitionKind === "fade" || layer.transitionKind === "fadeBlack" || layer.transitionKind === "fadeWhite") {
    context.globalAlpha = (layer.opacity ?? 1) * middleAlpha * 0.92;
    context.fillStyle = layer.transitionKind === "fadeWhite" ? "#ffffff" : color;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (layer.transitionKind === "wipeLeft") {
    context.globalAlpha = (layer.opacity ?? 1) * 0.86;
    context.fillStyle = color;
    context.fillRect(0, 0, canvasWidth * progress, canvasHeight);
  } else if (layer.transitionKind === "wipeRight") {
    context.globalAlpha = (layer.opacity ?? 1) * 0.86;
    context.fillStyle = color;
    context.fillRect(canvasWidth * (1 - progress), 0, canvasWidth * progress, canvasHeight);
  } else if (layer.transitionKind === "wipeUp") {
    context.globalAlpha = (layer.opacity ?? 1) * 0.86;
    context.fillStyle = color;
    context.fillRect(0, canvasHeight * (1 - progress), canvasWidth, canvasHeight * progress);
  } else if (layer.transitionKind === "wipeDown") {
    context.globalAlpha = (layer.opacity ?? 1) * 0.86;
    context.fillStyle = color;
    context.fillRect(0, 0, canvasWidth, canvasHeight * progress);
  } else if (layer.transitionKind === "slideLeft") {
    const gradient = context.createLinearGradient(canvasWidth * (1 - progress), 0, canvasWidth, 0);
    gradient.addColorStop(0, `${color}00`);
    gradient.addColorStop(1, color);
    context.globalAlpha = (layer.opacity ?? 1) * 0.78;
    context.fillStyle = gradient;
    context.fillRect(canvasWidth * (1 - progress), 0, canvasWidth, canvasHeight);
  } else if (layer.transitionKind === "slideRight") {
    const gradient = context.createLinearGradient(0, 0, canvasWidth * progress, 0);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}00`);
    context.globalAlpha = (layer.opacity ?? 1) * 0.78;
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvasWidth * progress, canvasHeight);
  } else if (layer.transitionKind === "slideUp") {
    const gradient = context.createLinearGradient(0, canvasHeight * (1 - progress), 0, canvasHeight);
    gradient.addColorStop(0, `${color}00`);
    gradient.addColorStop(1, color);
    context.globalAlpha = (layer.opacity ?? 1) * 0.78;
    context.fillStyle = gradient;
    context.fillRect(0, canvasHeight * (1 - progress), canvasWidth, canvasHeight * progress);
  } else if (layer.transitionKind === "slideDown") {
    const gradient = context.createLinearGradient(0, 0, 0, canvasHeight * progress);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}00`);
    context.globalAlpha = (layer.opacity ?? 1) * 0.78;
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvasWidth, canvasHeight * progress);
  } else if (layer.transitionKind === "zoomFlash") {
    const radius = Math.max(canvasWidth, canvasHeight) * (0.2 + progress);
    const gradient = context.createRadialGradient(canvasWidth / 2, canvasHeight / 2, radius * 0.1, canvasWidth / 2, canvasHeight / 2, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}00`);
    context.globalAlpha = (layer.opacity ?? 1) * middleAlpha * 0.9;
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (layer.transitionKind === "zoomIn" || layer.transitionKind === "zoomOut") {
    const radiusProgress = layer.transitionKind === "zoomIn" ? progress : 1 - progress;
    const radius = Math.max(canvasWidth, canvasHeight) * (0.18 + radiusProgress * 0.82);
    const gradient = context.createRadialGradient(canvasWidth / 2, canvasHeight / 2, 0, canvasWidth / 2, canvasHeight / 2, radius);
    gradient.addColorStop(0, `${color}00`);
    gradient.addColorStop(0.72, `${color}66`);
    gradient.addColorStop(1, color);
    context.globalAlpha = (layer.opacity ?? 1) * middleAlpha * 0.72;
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (layer.transitionKind === "rotateClockwise") {
    context.translate(canvasWidth / 2, canvasHeight / 2);
    context.rotate(progress * Math.PI * 0.75);
    context.globalAlpha = (layer.opacity ?? 1) * middleAlpha * 0.72;
    context.fillStyle = color;
    context.fillRect(-canvasWidth * 0.045, -canvasHeight, canvasWidth * 0.09, canvasHeight * 2);
  } else if (layer.transitionKind === "blurDissolve") {
    context.globalAlpha = (layer.opacity ?? 1) * middleAlpha * 0.5;
    context.filter = `blur(${Math.max(8, Math.min(canvasWidth, canvasHeight) * 0.035)}px)`;
    context.fillStyle = color;
    context.fillRect(-40, -40, canvasWidth + 80, canvasHeight + 80);
  } else if (layer.transitionKind === "radialReveal") {
    context.globalAlpha = (layer.opacity ?? 1) * 0.78;
    context.fillStyle = color;
    context.beginPath();
    context.arc(canvasWidth / 2, canvasHeight / 2, Math.hypot(canvasWidth, canvasHeight) * 0.55 * progress, 0, Math.PI * 2);
    context.fill();
  } else if (layer.transitionKind === "diagonalWipe") {
    const leadingEdge = canvasWidth * (progress * 1.45 - 0.22);
    context.globalAlpha = (layer.opacity ?? 1) * 0.82;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(leadingEdge + canvasWidth * 0.28, 0);
    context.lineTo(leadingEdge, canvasHeight);
    context.lineTo(0, canvasHeight);
    context.closePath();
    context.fill();
  } else if (layer.transitionKind === "splitReveal") {
    const halfReveal = canvasWidth * 0.5 * progress;
    context.globalAlpha = (layer.opacity ?? 1) * 0.82;
    context.fillStyle = color;
    context.fillRect(canvasWidth / 2 - halfReveal, 0, halfReveal, canvasHeight);
    context.fillRect(canvasWidth / 2, 0, halfReveal, canvasHeight);
  } else if (layer.transitionKind === "glitch") {
    context.globalAlpha = (layer.opacity ?? 1) * middleAlpha * 0.82;
    for (let stripe = 0; stripe < 8; stripe += 1) {
      const stripeHeight = canvasHeight / 22;
      const stripeY = ((stripe * 3 + Math.floor(progress * 20)) % 22) * stripeHeight;
      const stripeOffset = Math.sin((stripe + 1) * 9 + progress * 70) * canvasWidth * 0.08;
      context.fillStyle = stripe % 2 === 0 ? "#22d3ee" : "#f000b8";
      context.fillRect(stripeOffset, stripeY, canvasWidth, stripeHeight * 0.65);
    }
  }

  context.restore();
}

function isBridgeTransitionActive(layer: VideoLayer, time: number) {
  return layer.type === "transition"
    && layer.visible
    && Boolean(layer.fromLayerId)
    && Boolean(layer.toLayerId)
    && time >= layer.start
    && time <= getLayerEnd(layer);
}

function getActiveBridgeTransitionForLayer(layer: VideoLayer, transitions: VideoLayer[], time: number) {
  return transitions.find((transition) => (
    isBridgeTransitionActive(transition, time)
    && (transition.fromLayerId === layer.id || transition.toLayerId === layer.id)
  ));
}

function getSupportedExportType() {
  const exportTypes = [
    { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4", audioCodec: "aac" },
    { mimeType: "video/mp4;codecs=h264,mp4a.40.2", extension: "mp4", audioCodec: "aac" },
    { mimeType: "video/mp4;codecs=h264", extension: "mp4", audioCodec: "browser" },
    { mimeType: "video/mp4", extension: "mp4", audioCodec: "browser" },
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm", audioCodec: "opus" },
    { mimeType: "video/webm", extension: "webm", audioCodec: "opus" },
  ];

  return exportTypes.find((type) => MediaRecorder.isTypeSupported(type.mimeType)) || exportTypes.at(-1)!;
}

function applyLayerTransform(
  context: CanvasRenderingContext2D,
  layer: VideoLayer,
  x: number,
  y: number,
  width: number,
  height: number,
  animationStyle?: LayerAnimationVisualStyle,
) {
  const translateX = ((animationStyle?.translateX || 0) / 100) * width;
  const translateY = ((animationStyle?.translateY || 0) / 100) * height;
  context.translate(x + translateX + width / 2, y + translateY + height / 2);
  context.rotate((((layer.angle || 0) + (animationStyle?.rotate || 0)) * Math.PI) / 180);
  if (animationStyle?.skewX) context.transform(1, 0, Math.tan((animationStyle.skewX * Math.PI) / 180), 1, 0, 0);
  context.scale(
    (layer.isFlippedH ? -1 : 1) * (animationStyle?.scaleX || 1),
    (layer.isFlippedV ? -1 : 1) * (animationStyle?.scaleY || 1),
  );
  context.translate(-width / 2, -height / 2);
}

function applyLayerAnimationClip(context: CanvasRenderingContext2D, animationStyle: LayerAnimationVisualStyle, width: number, height: number) {
  const reveal = clamp(animationStyle.reveal, 0, 1);
  if (reveal >= 0.999) return;
  context.beginPath();
  if (animationStyle.revealOrigin === "center") {
    const revealWidth = width * reveal;
    context.rect((width - revealWidth) / 2, 0, revealWidth, height);
  } else if (animationStyle.revealOrigin === "bottom") {
    const revealHeight = height * reveal;
    context.rect(0, height - revealHeight, width, revealHeight);
  } else {
    context.rect(0, 0, width * reveal, height);
  }
  context.clip();
}

function getLayerAnimationCanvasFilter(animationStyle: LayerAnimationVisualStyle) {
  const filters: string[] = [];
  if (animationStyle.blur > 0.05) filters.push(`blur(${animationStyle.blur}px)`);
  if (animationStyle.glow > 0.05) filters.push(`drop-shadow(0 0 ${animationStyle.glow}px #8b5cf6)`);
  return filters.join(" ");
}

function mergeCanvasFilters(...filters: Array<string | undefined>) {
  const merged = filters.filter((filter) => filter && filter !== "none").join(" ");
  return merged || "none";
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const rawWord of words) {
    const wordParts: string[] = [];
    let wordPart = "";
    for (const character of Array.from(rawWord)) {
      const nextPart = `${wordPart}${character}`;
      if (wordPart && context.measureText(nextPart).width > maxWidth) {
        wordParts.push(wordPart);
        wordPart = character;
      } else {
        wordPart = nextPart;
      }
    }
    if (wordPart) wordParts.push(wordPart);

    for (const word of wordParts) {
      const nextLine = line ? `${line} ${word}` : word;
      if (context.measureText(nextLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = nextLine;
      }
    }
  }

  if (line) lines.push(line);
  return lines;
}

function getLayerEnd(layer: VideoLayer) {
  return layer.start + layer.duration;
}

function isLocalServerRenderHost() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "::1";
}

function getLayerSourceStart(layer: VideoLayer) {
  return Math.max(0, layer.sourceStart ?? layer.trimStart ?? 0);
}

function getLayerSourceEnd(layer: VideoLayer) {
  return Math.max(getLayerSourceStart(layer) + 0.05, layer.sourceEnd ?? layer.trimEnd ?? (getLayerSourceStart(layer) + layer.duration));
}

function normalizeTimelineClip(layer: VideoLayer) {
  if (layer.type !== "media" && layer.type !== "audio") return layer;
  const sourceStart = getLayerSourceStart(layer);
  const sourceEnd = getLayerSourceEnd(layer);
  return {
    ...layer,
    sourceStart,
    trimStart: sourceStart,
    sourceEnd,
    trimEnd: sourceEnd,
    duration: Math.max(0.05, sourceEnd - sourceStart),
  };
}

function isTrackBlockingClip(layer: VideoLayer) {
  return layer.type !== "audio" && layer.type !== "transition";
}

function sortClipsByTime(clips: VideoLayer[]) {
  return [...clips].sort((first, second) => first.start - second.start || getLayerEnd(first) - getLayerEnd(second));
}

function hasTrackOverlap(layers: VideoLayer[], layer: VideoLayer) {
  if (!isTrackBlockingClip(layer)) return false;
  const trackId = layer.trackId || layer.id;
  return layers.some((item) => (
    item.id !== layer.id
    && isTrackBlockingClip(item)
    && (item.trackId || item.id) === trackId
    && layer.start < getLayerEnd(item)
    && getLayerEnd(layer) > item.start
  ));
}

function orderLayersByTrackAndTime(layers: VideoLayer[]) {
  const trackIds = Array.from(new Set(layers.map((layer) => layer.trackId || layer.id)));
  return trackIds.flatMap((trackId) => sortClipsByTime(layers.filter((layer) => (layer.trackId || layer.id) === trackId)));
}

function resolveBlockingTrackOverlaps(layers: VideoLayer[]) {
  const nextStarts = new Map<string, number>();
  const trackIds = Array.from(new Set(layers.filter(isTrackBlockingClip).map(getTrackId)));
  trackIds.forEach((trackId) => {
    let cursor = 0;
    sortClipsByTime(layers.filter((layer) => isTrackBlockingClip(layer) && getTrackId(layer) === trackId)).forEach((layer) => {
      const start = Math.max(cursor, layer.start);
      nextStarts.set(layer.id, Number(start.toFixed(6)));
      cursor = start + layer.duration;
    });
  });
  return orderLayersByTrackAndTime(layers.map((layer) => (
    nextStarts.has(layer.id) ? { ...layer, start: nextStarts.get(layer.id) || 0 } : layer
  )));
}

function normalizeProjectFps(value: number | undefined) {
  const fps = Number(value);
  if (!Number.isFinite(fps) || fps <= 0) return 30;
  const standardRates = [24, 25, 30, 48, 50, 60];
  const nearest = standardRates.reduce((best, candidate) => (
    Math.abs(candidate - fps) < Math.abs(best - fps) ? candidate : best
  ), standardRates[0]);
  return Math.abs(nearest - fps) <= 1.1 ? nearest : clamp(Math.round(fps), 1, 120);
}

function standardizeTimelineLayers(layers: VideoLayer[], fps: number) {
  const safeFps = normalizeProjectFps(fps);
  const patches = new Map<string, Pick<VideoLayer, "start" | "duration" | "sourceEnd" | "trimEnd" | "cutTime">>();
  const blockingTracks = new Map<string, VideoLayer[]>();

  for (const layer of layers) {
    if (!isTrackBlockingClip(layer)) continue;
    const trackId = getTrackId(layer);
    blockingTracks.set(trackId, [...(blockingTracks.get(trackId) || []), layer]);
  }

  blockingTracks.forEach((trackLayers) => {
    let previousEndFrame = 0;
    for (const layer of sortClipsByTime(trackLayers)) {
      const requestedStartFrame = Math.max(0, Math.round(layer.start * safeFps));
      const startFrame = Math.max(requestedStartFrame, previousEndFrame);
      const durationFrames = Math.max(1, Math.round(layer.duration * safeFps));
      const duration = Number((durationFrames / safeFps).toFixed(6));
      const sourceStart = getLayerSourceStart(layer);
      const isTimedMedia = layer.type === "audio"
        || (layer.type === "media" && (layer.mediaKind === "video" || layer.mediaKind === "audio"));
      patches.set(layer.id, {
        start: Number((startFrame / safeFps).toFixed(6)),
        duration,
        sourceEnd: isTimedMedia ? Number((sourceStart + duration).toFixed(6)) : layer.sourceEnd,
        trimEnd: isTimedMedia ? Number((sourceStart + duration).toFixed(6)) : layer.trimEnd,
        cutTime: layer.cutTime,
      });
      previousEndFrame = startFrame + durationFrames;
    }
  });

  return layers.map((layer) => {
    const patch = patches.get(layer.id);
    if (patch) return { ...layer, ...patch };
    const start = Number((Math.max(0, Math.round(layer.start * safeFps)) / safeFps).toFixed(6));
    const duration = Number((Math.max(1, Math.round(layer.duration * safeFps)) / safeFps).toFixed(6));
    const isTimedMedia = layer.type === "audio"
      || (layer.type === "media" && (layer.mediaKind === "video" || layer.mediaKind === "audio"));
    const sourceEnd = isTimedMedia ? Number((getLayerSourceStart(layer) + duration).toFixed(6)) : layer.sourceEnd;
    return {
      ...layer,
      start,
      duration,
      sourceEnd,
      trimEnd: isTimedMedia ? sourceEnd : layer.trimEnd,
      cutTime: layer.cutTime === undefined
        ? undefined
        : Number((Math.max(0, Math.round(layer.cutTime * safeFps)) / safeFps).toFixed(6)),
    };
  });
}

function getTrackId(layer: VideoLayer) {
  return layer.trackId || layer.id;
}

function getTrackSettingsMap(settings: TrackSettings[]) {
  return new Map(settings.map((track) => [track.id, track]));
}

function getTrackOrder(trackId: string, settings: TrackSettings[], fallback: number) {
  return getTrackSettingsMap(settings).get(trackId)?.order ?? fallback;
}

function isLayerTrackMuted(layer: VideoLayer, settings: TrackSettings[]) {
  return Boolean(getTrackSettingsMap(settings).get(getTrackId(layer))?.muted || layer.trackMuted);
}

function isAudioControllableLayer(layer: VideoLayer) {
  return layer.type === "audio" || (layer.type === "media" && layer.mediaKind === "video");
}

function getClipVolume(layer: VideoLayer) {
  return clamp(layer.volume ?? 1, 0, 1);
}

function getClipFadeMultiplier(layer: VideoLayer, localTime: number) {
  const fadeIn = Math.max(0, Math.min(layer.duration, layer.audioFadeIn || 0));
  const fadeOut = Math.max(0, Math.min(layer.duration, layer.audioFadeOut || 0));
  const fadeInMultiplier = fadeIn > 0 ? clamp(localTime / fadeIn, 0, 1) : 1;
  const timeUntilEnd = Math.max(0, layer.duration - localTime);
  const fadeOutMultiplier = fadeOut > 0 ? clamp(timeUntilEnd / fadeOut, 0, 1) : 1;
  return Math.min(fadeInMultiplier, fadeOutMultiplier);
}

function getEffectiveClipVolume(layer: VideoLayer, settings: TrackSettings[], masterVolume = 1, localTime = 0) {
  if (isLayerTrackMuted(layer, settings) || layer.muted) return 0;
  return clamp(masterVolume * getClipVolume(layer) * getClipFadeMultiplier(layer, localTime), 0, 1);
}

function applyTrackSettingsToLayers(layers: VideoLayer[], settings: TrackSettings[]) {
  const settingsById = getTrackSettingsMap(settings);
  return layers.map((layer) => {
    const settingsForLayer = settingsById.get(getTrackId(layer));
    return settingsForLayer
      ? {
        ...layer,
        trackOrder: settingsForLayer.order,
        trackName: settingsForLayer.name,
        trackMuted: settingsForLayer.muted,
        zIndex: Math.max(0, settings.length - settingsForLayer.order - 1),
      }
      : layer;
  });
}

function getTrackNeighborBounds(layers: VideoLayer[], layer: VideoLayer) {
  const trackId = layer.trackId || layer.id;
  const clips = sortClipsByTime(layers.filter((item) => (
    (item.trackId || item.id) === trackId
    && item.id !== layer.id
    && isTrackBlockingClip(item)
  )));

  const previous = [...clips].reverse().find((item) => getLayerEnd(item) <= layer.start);
  const next = clips.find((item) => item.start >= getLayerEnd(layer));
  return {
    previousEnd: previous ? getLayerEnd(previous) : 0,
    nextStart: next ? next.start : Number.POSITIVE_INFINITY,
  };
}

function getInitialMediaBox(asset?: MediaAsset) {
  const naturalWidth = asset?.kind === "image"
    ? (asset.image?.naturalWidth ?? 0)
    : asset?.kind === "video"
      ? (asset.video?.videoWidth ?? 0)
      : 0;
  const naturalHeight = asset?.kind === "image"
    ? (asset.image?.naturalHeight ?? 0)
    : asset?.kind === "video"
      ? (asset.video?.videoHeight ?? 0)
      : 0;
  const ratio = naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 16 / 9;
  const width = 40;
  const height = clamp(width / ratio, 16, 56);

  return {
    x: Number(((100 - width) / 2).toFixed(2)),
    y: Number(((100 - height) / 2).toFixed(2)),
    width,
    height: Number(height.toFixed(2)),
  };
}

function formatTimelineClock(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const totalSeconds = Math.floor(safeSeconds);
  const frames = Math.floor((safeSeconds - totalSeconds) * 100);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(frames).padStart(2, "0")}`;
}

function formatRulerTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatTimecode(seconds: number, fps = 30) {
  const safeSeconds = Math.max(0, seconds);
  const totalSeconds = Math.floor(safeSeconds);
  const frames = Math.min(fps - 1, Math.floor((safeSeconds - totalSeconds) * fps));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatBitrate(bitsPerSecond?: number) {
  if (!bitsPerSecond || bitsPerSecond <= 0) return "";
  if (bitsPerSecond >= 1_000_000) return `${(bitsPerSecond / 1_000_000).toFixed(1)} Mbps`;
  return `${Math.round(bitsPerSecond / 1000)} kbps`;
}

function getMediaMetadataRows(metadata?: PixoresMediaMetadata) {
  if (!metadata) return [];
  const rows: Array<[string, string]> = [];
  if (metadata.width && metadata.height) rows.push(["Size", `${metadata.width}x${metadata.height}`]);
  if (metadata.duration) rows.push(["Duration", formatTimecode(metadata.duration)]);
  if (metadata.fps) rows.push(["FPS", `${metadata.fps}`]);
  if (metadata.codec) rows.push(["Video", metadata.codec.toUpperCase()]);
  if (metadata.audioCodec) rows.push(["Audio", metadata.audioCodec.toUpperCase()]);
  if (metadata.bitrate) rows.push(["Bitrate", formatBitrate(metadata.bitrate)]);
  if (metadata.imageFormat) rows.push(["Image", metadata.imageFormat.toUpperCase()]);
  if (metadata.colorSpace) rows.push(["Color", metadata.colorSpace]);
  rows.push(["Analyzer", metadata.analyzer]);
  return rows;
}

function getAspectRatioLabel(width: number, height: number) {
  const divisor = gcd(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function groupCaptionWords(captions: PixoresCaption[], options: { maxCharacters?: number; maxDurationMs?: number } = {}) {
  const maxCharacters = options.maxCharacters || 44;
  const maxDurationMs = options.maxDurationMs || 3200;
  const groups: CaptionSegment[] = [];
  for (const caption of captions) {
    const text = caption.text.trim();
    if (!text) continue;
    const previous = groups.at(-1);
    const gap = previous ? caption.startMs - previous.endMs : 0;
    const combinedText = previous ? `${previous.text} ${text}`.replace(/\s+/g, " ") : text;
    const shouldStartNew = !previous
      || gap > 650
      || caption.endMs - previous.startMs > maxDurationMs
      || combinedText.length > maxCharacters;
    if (shouldStartNew) groups.push({ text, startMs: caption.startMs, endMs: caption.endMs });
    else {
      previous.text = combinedText;
      previous.endMs = caption.endMs;
    }
  }
  return groups;
}

function getSilenceRemovalRanges(silences: PixoresSilenceRange[], padding: number) {
  return silences.map((range) => ({
    start: Number(Math.min(range.end, range.start + padding).toFixed(3)),
    end: Number(Math.max(range.start, range.end - padding).toFixed(3)),
  })).filter((range) => range.end - range.start >= 0.05);
}

function getKeptAudioRanges(duration: number, removals: Array<{ start: number; end: number }>) {
  const kept = [];
  let cursor = 0;
  for (const removal of removals) {
    if (removal.start > cursor + 0.01) kept.push({ start: cursor, end: removal.start });
    cursor = Math.max(cursor, removal.end);
  }
  if (duration > cursor + 0.01) kept.push({ start: cursor, end: duration });
  return kept;
}

function resolveRippleInsertionTime(
  layers: VideoLayer[],
  trackId: string,
  desiredStart: number,
  excludedLayerIds: Set<string> = new Set(),
) {
  const clips = sortClipsByTime(layers.filter((layer) => (
    getTrackId(layer) === trackId
    && isTrackBlockingClip(layer)
    && !excludedLayerIds.has(layer.id)
  )));
  const overlapping = clips.find((clip) => desiredStart > clip.start && desiredStart < getLayerEnd(clip));
  if (!overlapping) return Math.max(0, desiredStart);
  const midpoint = overlapping.start + overlapping.duration / 2;
  return desiredStart <= midpoint ? overlapping.start : getLayerEnd(overlapping);
}

function isCompactVideoMakerViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 980px)").matches;
}

function calculateAudioPeaks(buffer: AudioBuffer, peakCount = 4096) {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const samplesPerPeak = Math.max(1, Math.floor(buffer.length / peakCount));
  const peaks: number[] = [];

  for (let peakIndex = 0; peakIndex < peakCount; peakIndex += 1) {
    const start = peakIndex * samplesPerPeak;
    const end = Math.min(buffer.length, start + samplesPerPeak);
    let sumSquares = 0;
    let maxPeak = 0;
    let sampleCount = 0;

    for (const channel of channels) {
      for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
        const absolute = Math.abs(channel[sampleIndex] || 0);
        maxPeak = Math.max(maxPeak, absolute);
        sumSquares += absolute * absolute;
        sampleCount += 1;
      }
    }

    const rms = sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0;
    peaks.push(clamp((maxPeak * 0.72) + (rms * 1.55), 0, 1));
  }

  const loudest = peaks.reduce((maximum, peak) => Math.max(maximum, peak), 0.001);
  return peaks.map((peak, index) => {
    const previous = peaks[Math.max(0, index - 1)];
    const next = peaks[Math.min(peaks.length - 1, index + 1)];
    return clamp(((previous * 0.18) + (peak * 0.64) + (next * 0.18)) / loudest, 0, 1);
  });
}

function getWaveformSegmentPeaks(peaks: number[], layer: VideoLayer, pointCount: number) {
  if (!peaks.length) return [];
  const sourceDuration = Math.max(0.05, layer.sourceDuration || getLayerSourceEnd(layer));
  const sourceStart = clamp(getLayerSourceStart(layer), 0, sourceDuration);
  const sourceEnd = clamp(getLayerSourceEnd(layer), sourceStart + 0.05, sourceDuration);
  const startIndex = Math.floor((sourceStart / sourceDuration) * (peaks.length - 1));
  const endIndex = Math.max(startIndex + 1, Math.ceil((sourceEnd / sourceDuration) * (peaks.length - 1)));
  const safePointCount = Math.max(8, pointCount);

  return Array.from({ length: safePointCount }, (_, index) => {
    const windowStart = startIndex + Math.floor((index / safePointCount) * (endIndex - startIndex));
    const windowEnd = startIndex + Math.ceil(((index + 1) / safePointCount) * (endIndex - startIndex));
    let peak = 0;
    for (let peakIndex = windowStart; peakIndex <= windowEnd; peakIndex += 1) {
      peak = Math.max(peak, peaks[clamp(peakIndex, 0, peaks.length - 1)] || 0);
    }
    return peak;
  });
}

function buildWaveformPath(segmentPeaks: number[]) {
  const width = 1000;
  const centerY = 52;
  const maxAmplitude = 47;
  if (!segmentPeaks.length) return `M 0 ${centerY} L ${width} ${centerY}`;

  const topPoints = segmentPeaks.map((peak, index) => {
    const x = segmentPeaks.length === 1 ? 0 : (index / (segmentPeaks.length - 1)) * width;
    const shapedPeak = Math.pow(clamp(peak, 0, 1), 0.62);
    const y = centerY - Math.max(2.4, shapedPeak * maxAmplitude);
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  const bottomPoints = [...segmentPeaks].reverse().map((peak, reverseIndex) => {
    const index = segmentPeaks.length - 1 - reverseIndex;
    const x = segmentPeaks.length === 1 ? 0 : (index / (segmentPeaks.length - 1)) * width;
    const shapedPeak = Math.pow(clamp(peak, 0, 1), 0.62);
    const y = centerY + Math.max(2.4, shapedPeak * maxAmplitude);
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  return `M ${topPoints[0]} L ${topPoints.slice(1).join(" L ")} L ${bottomPoints.join(" L ")} Z`;
}

function ClipWaveform({
  peaks,
  layer,
  timelineZoom,
  volume,
}: {
  peaks?: number[];
  layer: VideoLayer;
  timelineZoom: number;
  volume: number;
}) {
  const pointCount = Math.round(clamp(layer.duration * Math.max(1, timelineZoom) * 52, 80, 520));
  const visualVolume = layer.muted ? 0 : clamp(volume, 0, 1);
  const segmentPeaks = getWaveformSegmentPeaks(peaks || [], layer, pointCount).map((peak) => peak * visualVolume);
  const path = buildWaveformPath(segmentPeaks);

  return (
    <svg className={styles.clipWaveformSvg} viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
      <path className={styles.clipWaveformFill} d={path} />
      <path className={styles.clipWaveformStroke} d={path} />
    </svg>
  );
}

export default function VideoMaker() {
  const { userEmail } = useDesktopAuth();
  const adapters = useMemo(() => getVideoMakerAdapters(), []);
  const personalLibraryUserKey = userEmail.trim().toLowerCase() || "local-user";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineInnerRef = useRef<HTMLDivElement>(null);
  const previewFullResolutionRef = useRef(false);
  const lowerThirdPrimaryInputRef = useRef<HTMLInputElement>(null);
  const textLayerInputRef = useRef<HTMLInputElement>(null);
  const inlineTextEditorRef = useRef<HTMLTextAreaElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const mediaPreviewRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const soundEffectPreviewRef = useRef<HTMLAudioElement | null>(null);
  const mediaAssetsRef = useRef<Map<string, MediaAsset>>(new Map());
  const layerVideoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const layerAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const previewAudioContextRef = useRef<AudioContext | null>(null);
  const previewAudioGraphsRef = useRef<WeakMap<HTMLMediaElement, PreviewAudioGraph>>(new WeakMap());
  const videoSeekTargetsRef = useRef<Map<string, number>>(new Map());
  const videoFrameCacheRef = useRef<Map<string, CachedVideoFrame>>(new Map());
  const layerEffectCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const waveformPeakRequestsRef = useRef<Set<string>>(new Set());
  const waveformPeaksRef = useRef<WaveformPeakCache>({});
  const playbackTargetsRef = useRef<Map<string, PlaybackTarget>>(new Map());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const exportAudioContextRef = useRef<AudioContext | null>(null);
  const exportAudioSourcesRef = useRef<WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>>(new WeakMap());
  const exportSpeakerSourcesRef = useRef<WeakSet<MediaElementAudioSourceNode>>(new WeakSet());
  const exportCancelledRef = useRef(false);
  const browserExportDirectoryRef = useRef<BrowserExportDirectoryHandle | null>(null);
  const automaticallySavedRenderIdsRef = useRef<Set<string>>(new Set());
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const traditionalMenuRef = useRef<HTMLElement>(null);
  const clipEditRef = useRef<ClipEditState | null>(null);
  const transitionResizeRef = useRef<TransitionResizeState | null>(null);
  const timelineViewportDurationRef = useRef(1);
  const trackDragRef = useRef<TrackDragState | null>(null);
  const volumeDragRef = useRef<VolumeDragState | null>(null);
  const stageEditRef = useRef<StageEditState | null>(null);
  const layoutResizeRef = useRef<LayoutResizeState | null>(null);
  const workspacePreferencesLoadedRef = useRef(false);
  const projectAutoSaveReadyRef = useRef(false);
  const lastAutoSaveFingerprintRef = useRef("");
  const allowPageUnloadRef = useRef(false);
  const layersRef = useRef<VideoLayer[]>(initialLayers);
  const importsRef = useRef<ImportedAsset[]>([]);
  const pendingAssetUploadsRef = useRef<Map<string, Promise<boolean>>>(new Map());
  const downloadScanSinceRef = useRef(Date.now());
  const importedDownloadKeysRef = useRef(new Set<string>());
  const playbackPrimeTokenRef = useRef(0);
  const timelineClipboardRef = useRef<TimelineClipboardPayload | null>(null);
  const isDraggingPlayheadRef = useRef(false);
  const [layers, setLayers] = useState<VideoLayer[]>(initialLayers);
  const [history, setHistory] = useState<LayerHistory>({ past: [], future: [] });
  const [imports, setImports] = useState<ImportedAsset[]>([]);
  const [importSearch, setImportSearch] = useState("");
  const [importKindFilter, setImportKindFilter] = useState<ImportKindFilter>("all");
  const [fontSearch, setFontSearch] = useState("");
  const [fontCategory, setFontCategory] = useState("all");
  const [selectedImportId, setSelectedImportId] = useState("");
  const [mediaPreviewTime, setMediaPreviewTime] = useState(0);
  const [mediaPreviewDuration, setMediaPreviewDuration] = useState(0);
  const [mediaLoadTick, setMediaLoadTick] = useState(0);
  const [fontLoadRevision, setFontLoadRevision] = useState(0);
  const [waveformPeaks, setWaveformPeaks] = useState<WaveformPeakCache>({});
  const [isMediaPreviewPlaying, setIsMediaPreviewPlaying] = useState(false);
  const [mediaPreviewVolume, setMediaPreviewVolume] = useState(1);
  const [isMediaPreviewMuted, setIsMediaPreviewMuted] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState("");
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [stageAlignmentGuides, setStageAlignmentGuides] = useState<StageAlignmentGuideState | null>(null);
  const [inlineEditingTextId, setInlineEditingTextId] = useState("");
  const [emptyTracks, setEmptyTracks] = useState<EmptyTrack[]>([]);
  const [trackSettings, setTrackSettings] = useState<TrackSettings[]>([]);
  const [draggingTrackId, setDraggingTrackId] = useState("");
  const [trackDropIndex, setTrackDropIndex] = useState<number | null>(null);
  const [clipDragPreview, setClipDragPreview] = useState<ClipDragPreview | null>(null);
  const [activeVolumeLayerId, setActiveVolumeLayerId] = useState("");
  const [volumeTooltip, setVolumeTooltip] = useState<{ layerId: string; x: number; y: number; value: number } | null>(null);
  const [rangeContextMenu, setRangeContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [timelineContextMenu, setTimelineContextMenu] = useState<TimelineContextMenuState | null>(null);
  const [importContextMenu, setImportContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [timelineClipboardCount, setTimelineClipboardCount] = useState(0);
  const [activePanel, setActivePanel] = useState<SidebarPanel>("imports");
  const [activeTraditionalMenu, setActiveTraditionalMenu] = useState<TraditionalMenuName | null>(null);
  const [activeElementTab, setActiveElementTab] = useState<ElementPanelTab>("my-library");
  const [personalLibraryItems, setPersonalLibraryItems] = useState<PersonalLibraryItem[]>([]);
  const [personalLibraryCollection, setPersonalLibraryCollection] = useState<"all" | PersonalLibraryCollection>("all");
  const [personalLibraryStatus, setPersonalLibraryStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [customGradientColor1, setCustomGradientColor1] = useState("#2563EB");
  const [customGradientColor2, setCustomGradientColor2] = useState("#EC4899");
  const [mediaLibrary, setMediaLibrary] = useState<PixoresMediaLibraryManifest>(EMPTY_MEDIA_LIBRARY);
  const [mediaLibraryStatus, setMediaLibraryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [mediaLibrarySearch, setMediaLibrarySearch] = useState("");
  const [previewingSoundEffectId, setPreviewingSoundEffectId] = useState("");
  const [activeAnimationPhase, setActiveAnimationPhase] = useState<AnimationPhase>("in");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [isMobileTimelineOpen, setIsMobileTimelineOpen] = useState(false);
  const [isTimelineVisible, setIsTimelineVisible] = useState(true);
  const [isCanvasToolbarVisible, setIsCanvasToolbarVisible] = useState(true);
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
  const [formatIndex, setFormatIndex] = useState(5);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [timelineDuration, setTimelineDuration] = useState(6);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const [snappingShortcut, setSnappingShortcut] = useState("n");
  const [snapGuideTime, setSnapGuideTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);
  const [background, setBackground] = useState("#000000");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlaybackPriming, setIsPlaybackPriming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [masterVolume, setMasterVolume] = useState(1);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [serverExportFormatId, setServerExportFormatId] = useState<PixoresVideoExportFormatId>(PIXORES_DEFAULT_VIDEO_EXPORT_FORMAT_ID);
  const [status, setStatus] = useState("Ready");
  const [isPreparingServerRender, setIsPreparingServerRender] = useState(false);
  const [serverRenderId, setServerRenderId] = useState("");
  const [serverRenderProgress, setServerRenderProgress] = useState(0);
  const [projectTitle, setProjectTitle] = useState("Untitled video");
  const [projectLifecycleReady, setProjectLifecycleReady] = useState(false);
  const [savedProjectFingerprint, setSavedProjectFingerprint] = useState("");
  const [pendingProjectAction, setPendingProjectAction] = useState<ProjectLifecycleAction | null>(null);
  const [isSavingBeforeProjectAction, setIsSavingBeforeProjectAction] = useState(false);
  const [isProjectFileSaving, setIsProjectFileSaving] = useState(false);
  const [projectFileNotice, setProjectFileNotice] = useState<{ tone: "working" | "success" | "error"; message: string } | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState<Date | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isYouTubeDialogOpen, setIsYouTubeDialogOpen] = useState(false);
  const [isThumbnailDialogOpen, setIsThumbnailDialogOpen] = useState(false);
  const [thumbnailTemplate, setThumbnailTemplate] = useState<"clean" | "bold" | "cinema" | "social">("bold");
  const [thumbnailTitle, setThumbnailTitle] = useState("");
  const [autoImportDownloads, setAutoImportDownloads] = useState(true);
  const [isRemovingImageBackground, setIsRemovingImageBackground] = useState(false);
  const [isSmartClipsDialogOpen, setIsSmartClipsDialogOpen] = useState(false);
  const [smartClipPlatformId, setSmartClipPlatformId] = useState<SmartClipPlatformId>("instagram-reels");
  const [smartClipDuration, setSmartClipDuration] = useState(60);
  const [smartClipCustomWidth, setSmartClipCustomWidth] = useState(1080);
  const [smartClipCustomHeight, setSmartClipCustomHeight] = useState(1920);
  const [smartClipAutoCaptions, setSmartClipAutoCaptions] = useState(true);
  const [smartClipCaptionTemplateId, setSmartClipCaptionTemplateId] = useState<SmartClipCaptionTemplateId>("none");
  const [smartClipCaptionPosition, setSmartClipCaptionPosition] = useState<SmartClipCaptionPosition>("bottom");
  const [smartClipCaptionSize, setSmartClipCaptionSize] = useState(SMART_CLIP_CAPTION_SIZE_DEFAULT);
  const [smartClipFaceMode, setSmartClipFaceMode] = useState<SmartClipFaceMode>("dynamic");
  const [smartClipSpeakerSelection, setSmartClipSpeakerSelection] = useState(true);
  const [smartClipFastExport, setSmartClipFastExport] = useState(true);
  const [smartClipSource, setSmartClipSource] = useState<SmartClipSourceState | null>(null);
  const [isSmartClipSourceLoading, setIsSmartClipSourceLoading] = useState(false);
  const [smartClipCandidates, setSmartClipCandidates] = useState<SmartClipCandidate[]>([]);
  const [smartClipActiveCandidateId, setSmartClipActiveCandidateId] = useState("");
  const [smartClipPreviewSource, setSmartClipPreviewSource] = useState("");
  const [smartClipPreviewOffset, setSmartClipPreviewOffset] = useState(0);
  const [smartClipsProgress, setSmartClipsProgress] = useState<SmartClipsProgressState>({
    running: false,
    cancelling: false,
    completed: 0,
    total: 0,
    currentClip: 0,
    progress: 0,
    message: "Choose a platform and clip length.",
    error: "",
  });
  const [isLocalServerRenderAvailable, setIsLocalServerRenderAvailable] = useState(false);
  const [browserExportDirectoryName, setBrowserExportDirectoryName] = useState("");
  const [isMediaToolsDialogOpen, setIsMediaToolsDialogOpen] = useState(false);
  const [mediaMatchRequest, setMediaMatchRequest] = useState<MediaMatchRequest | null>(null);
  const [skipFutureMediaMatchPrompts, setSkipFutureMediaMatchPrompts] = useState(false);
  const [isAudioAiDialogOpen, setIsAudioAiDialogOpen] = useState(false);
  const [audioAiTab, setAudioAiTab] = useState<AudioAiTab>("subtitles");
  const [audioAiBusy, setAudioAiBusy] = useState(false);
  const [audioAiProgress, setAudioAiProgress] = useState<PixoresAudioAiProgress | null>(null);
  const [audioAiError, setAudioAiError] = useState("");
  const [isSynchronizingAudio, setIsSynchronizingAudio] = useState(false);
  const [subtitleLanguage, setSubtitleLanguage] = useState<"auto" | "Spanish" | "English">("auto");
  const [subtitleModel, setSubtitleModel] = useState<"tiny" | "base">("base");
  const [silenceThresholdDb, setSilenceThresholdDb] = useState(-35);
  const [silenceMinimumDuration, setSilenceMinimumDuration] = useState(0.45);
  const [silencePadding, setSilencePadding] = useState(0.12);
  const [silenceAnalysis, setSilenceAnalysis] = useState<PixoresSilenceAnalysisResult | null>(null);
  const [cropZoomLayerId, setCropZoomLayerId] = useState("");
  const [activeObjectStylePanel, setActiveObjectStylePanel] = useState<ObjectStylePanel | null>(null);
  const [isTextEffectsPanelOpen, setIsTextEffectsPanelOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState<PixoresExportSettings>(() => ({
    ...createDefaultExportSettings({ projectTitle: "Untitled video", width: 1080, height: 1920, fps: 30 }),
    renderMethod: adapters.isDesktop ? "local" : "browser",
  }));
  const [renderProgress, setRenderProgress] = useState<RenderProgressState>({
    open: false,
    renderId: "",
    status: "idle",
    progress: 0,
    fileName: "",
    outputUrl: "",
    outputPath: "",
    error: "",
    warnings: [],
    startedAt: 0,
    elapsedSeconds: 0,
    etaSeconds: null,
    renderedFrames: 0,
    totalFrames: 0,
    renderFps: 0,
    speed: 0,
    codec: "H.264",
    resolution: "1080 x 1920",
    method: adapters.isDesktop ? "Local render" : "Server render",
    proxyPrepared: 0,
    proxyTotal: 0,
    hybridRender: false,
    hybridPrecomposing: false,
    hybridRenderedFrames: 0,
    hybridTotalFrames: 0,
    segmentedRender: false,
    currentSegment: 0,
    segmentCount: 0,
    segmentType: "",
    complexDuration: 0,
  });
  const [cloudProjects, setCloudProjects] = useState<CloudVideoProject[]>([]);
  const [currentCloudProjectId, setCurrentCloudProjectId] = useState("");
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [sidePanelWidth, setSidePanelWidth] = useState(400);
  const [timelineHeight, setTimelineHeight] = useState(368);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("edit");
  const [manualCanvasWidth, setManualCanvasWidth] = useState<number | null>(null);
  const [canvasZoom, setCanvasZoom] = useState("fit");
  const [markInTime, setMarkInTime] = useState<number | null>(null);
  const [markOutTime, setMarkOutTime] = useState<number | null>(null);
  const [markTrackId, setMarkTrackId] = useState("");
  const rangeMarkerDragRef = useRef<"in" | "out" | null>(null);
  const smartClipExportCoordinatorRef = useRef(new SmartClipExportCoordinator());
  const smartClipAudioAiJobIdRef = useRef("");
  const smartClipCaptionPreparationRef = useRef("");
  const smartClipSourceProjectRef = useRef<PixoresVideoProject | null>(null);
  const smartClipPreparedProjectRef = useRef<PixoresVideoProject | null>(null);
  const smartClipSpeechRangesRef = useRef<Map<string, SmartSpeechRange[]>>(new Map());
  const audioAiJobIdRef = useRef("");
  const selectedFormat = useMemo(() => {
    const selectedPreset = formats[formatIndex] || formats[5];
    return selectedPreset.id === "custom"
      ? { ...selectedPreset, width: customWidth, height: customHeight }
      : selectedPreset;
  }, [customHeight, customWidth, formatIndex]);
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
  const selectedLayerIdSet = useMemo(() => new Set(selectedLayerIds), [selectedLayerIds]);
  const selectedLayers = useMemo(
    () => layers.filter((layer) => selectedLayerIdSet.has(layer.id)),
    [layers, selectedLayerIdSet],
  );
  const selectedAudioEffects = resolveAudioEffects(selectedLayer?.audioEffects);
  const selectedImport = imports.find((item) => item.id === selectedImportId) || imports[0];
  const normalizedMediaLibrarySearch = mediaLibrarySearch.trim().toLowerCase();
  const filteredVideoBackgrounds = mediaLibrary.videoBackgrounds.filter((asset) => (
    !normalizedMediaLibrarySearch || asset.title.toLowerCase().includes(normalizedMediaLibrarySearch)
  ));
  const filteredSoundEffects = mediaLibrary.soundEffects.filter((asset) => (
    !normalizedMediaLibrarySearch || asset.title.toLowerCase().includes(normalizedMediaLibrarySearch)
  ));
  const cropZoomLayer = layers.find((layer) => layer.id === cropZoomLayerId);
  const cropZoomAsset = cropZoomLayer ? mediaAssetsRef.current.get(cropZoomLayer.assetKey || cropZoomLayer.id) : undefined;
  const projectDuration = useMemo(() => calculateProjectDuration(layers), [layers]);
  const currentProjectFingerprint = useMemo(() => createProjectContentFingerprint(buildPixoresProject({
    canvas: {
      width: selectedFormat.width,
      height: selectedFormat.height,
    },
    duration: projectDuration,
    background,
    layers: applyTrackSettingsToLayers(layers, trackSettings),
    assets: imports.map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      url: item.url,
      persistentUrl: item.persistentUrl,
      uploadStatus: item.uploadStatus,
      duration: item.duration,
      metadata: item.metadata,
    })),
    format: selectedFormat,
  }), projectTitle), [background, imports, layers, projectDuration, projectTitle, selectedFormat, trackSettings]);
  const isProjectDirty = projectLifecycleReady
    && savedProjectFingerprint.length > 0
    && currentProjectFingerprint !== savedProjectFingerprint;
  const timelineViewportDuration = Math.max(1, timelineDuration, projectDuration + TIMELINE_EMPTY_TAIL_SECONDS);
  timelineViewportDurationRef.current = timelineViewportDuration;
  const hasActiveRange = markTrackId.length > 0 && markInTime !== null && markOutTime !== null && markOutTime > markInTime;
  const previewRangeStart = hasActiveRange ? (markInTime ?? 0) : 0;
  const previewRangeEnd = hasActiveRange ? (markOutTime ?? projectDuration) : projectDuration;
  const exportRangeStart = exportSettings.rangeStart ?? 0;
  const exportRangeEnd = Math.min(exportSettings.rangeEnd ?? projectDuration, projectDuration);
  const exportDuration = Math.max(0.05, exportRangeEnd - exportRangeStart);
  const saveExportToDestination = useCallback(async (url: string, fileName: string, outputDirectory?: string) => {
    if (adapters.isDesktop) {
      const bridge = getPixoresDesktopBridge();
      if (!bridge?.saveRenderedOutput) throw new Error("Desktop automatic save is unavailable.");
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Export read failed with ${response.status}`);
      const result = await bridge.saveRenderedOutput({
        fileName,
        outputDirectory,
        bytes: await response.arrayBuffer(),
      });
      setStatus(`Export saved automatically: ${result.outputPath}`);
      return;
    }
    const directory = browserExportDirectoryRef.current;
    if (directory) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Download failed with ${response.status}`);
        const fileHandle = await directory.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        if (response.body) {
          await response.body.pipeTo(writable);
        } else {
          await writable.write(await response.blob());
          await writable.close();
        }
        setStatus(`Export saved automatically in ${directory.name}`);
        return;
      } catch (error) {
        setStatus(`Could not save in the selected folder. Using browser Downloads: ${error instanceof Error ? error.message : "write failed"}`);
      }
    }

    triggerBrowserDownload(url, fileName);
  }, [adapters.isDesktop]);
  const selectedServerExportFormat = getPixoresVideoExportFormat(serverExportFormatId);
  const projectAspectLabel = useMemo(
    () => getAspectRatioLabel(selectedFormat.width, selectedFormat.height),
    [selectedFormat.height, selectedFormat.width],
  );
  const projectStats = useMemo(() => ({
    tracks: new Set(layers.filter((layer) => layer.type !== "transition").map((layer) => layer.trackId || layer.id)).size,
    media: layers.filter((layer) => layer.type === "media").length,
    audio: layers.filter((layer) => layer.type === "audio").length,
    text: layers.filter((layer) => layer.type === "text").length,
    transitions: layers.filter((layer) => layer.type === "transition").length,
  }), [layers]);
  const filteredImports = useMemo(() => {
    const query = importSearch.trim().toLowerCase();
    return imports.filter((item) => (
      (importKindFilter === "all" || item.kind === importKindFilter)
      && (!query || item.name.toLowerCase().includes(query))
    ));
  }, [importKindFilter, importSearch, imports]);
  const filteredPersonalLibraryItems = useMemo(() => personalLibraryItems.filter((item) => (
    personalLibraryCollection === "all"
    || (personalLibraryCollection === "general" ? (item.collection || "general") === "general" : item.collection === "chatgpt")
  )), [personalLibraryCollection, personalLibraryItems]);
  const filteredFontGroups = useMemo(() => {
    const query = fontSearch.trim().toLowerCase();
    return fontGroups
      .filter((group) => fontCategory === "all" || group.label === fontCategory)
      .map((group) => ({
        ...group,
        fonts: group.fonts.filter((font) => !query || font.toLowerCase().includes(query)),
      }))
      .filter((group) => group.fonts.length > 0);
  }, [fontCategory, fontSearch]);
  const trackGroups = useMemo(() => {
    const settingsById = getTrackSettingsMap(trackSettings);
    const groups: TimelineTrackGroup[] = [];
    for (const track of emptyTracks) {
      const settings = settingsById.get(track.id);
      groups.push({ trackId: track.id, order: settings?.order ?? track.order ?? groups.length, name: settings?.name || track.name, muted: settings?.muted ?? !!track.muted, clips: [], emptyTrack: track });
    }
    for (const layer of layers) {
      if (layer.type === "transition") continue;
      const trackId = layer.trackId || layer.id;
      const settings = settingsById.get(trackId);
      const group = groups.find((item) => item.trackId === trackId);
      if (group) group.clips.push(layer);
      else groups.push({ trackId, order: settings?.order ?? layer.trackOrder ?? groups.length, name: settings?.name || layer.trackName || layer.name, muted: settings?.muted ?? !!layer.trackMuted, clips: [layer] });
    }
    return groups
      .map((group) => ({ ...group, clips: sortClipsByTime(group.clips) }))
      .sort((first, second) => first.order - second.order);
  }, [emptyTracks, layers, trackSettings]);
  const visibleTrackGroups = useMemo(() => {
    const occupiedTrackIds = new Set(trackGroups.map((group) => group.trackId));
    const highestTrackOrder = trackGroups.reduce((highest, group) => Math.max(highest, group.order), -1);
    const slotCount = Math.max(MIN_VISIBLE_TIMELINE_TRACKS, trackGroups.length + 1, highestTrackOrder + 1);
    const slots: Array<TimelineTrackGroup | undefined> = Array.from({ length: slotCount });
    let smartTrackIndex = 1;

    trackGroups.forEach((group) => {
      let slotIndex = clamp(Math.round(group.order), 0, Math.max(0, slots.length - 1));
      while (slots[slotIndex] && slotIndex < slots.length) slotIndex += 1;
      if (slotIndex >= slots.length) slots.push({ ...group, order: slotIndex });
      else slots[slotIndex] = { ...group, order: slotIndex };
    });

    return slots.map((group, slotIndex) => {
      if (group) return group;
      let trackId = `${SMART_TRACK_PREFIX}${smartTrackIndex}`;
      while (occupiedTrackIds.has(trackId)) {
        smartTrackIndex += 1;
        trackId = `${SMART_TRACK_PREFIX}${smartTrackIndex}`;
      }
      occupiedTrackIds.add(trackId);
      smartTrackIndex += 1;
      return {
        trackId,
        order: slotIndex,
        name: `Track ${slotIndex + 1}`,
        muted: false,
        clips: [],
        isSmartPlaceholder: true,
      };
    });
  }, [trackGroups]);
  const readyTrackCount = visibleTrackGroups.filter((group) => group.isSmartPlaceholder).length;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const embeddedMediaLayerIds = useMemo(() => new Set(
    layers
      .filter((layer) => (
        layer.type === "shape"
        && isMediaContainerShape(layer.shapeType)
      ))
      .flatMap((layer) => layer.frameMediaLayerIds || []),
  ), [layers]);
  const visibleStageLayers = layers.filter((layer) => (
    layer.visible
    && layer.type !== "audio"
    && layer.type !== "transition"
    && !embeddedMediaLayerIds.has(layer.id)
    && currentTime >= layer.start
    && currentTime <= getLayerEnd(layer)
  )).sort((first, second) => (
    getTrackOrder(getTrackId(first), trackSettings, 0) - getTrackOrder(getTrackId(second), trackSettings, 0)
  ));

  const canvasStyle = useMemo(() => {
    const ratio = selectedFormat.width / selectedFormat.height;
    const availableWidth = Math.max(240, previewSize.width > 0 ? previewSize.width - 28 : 1120);
    const availableHeight = Math.max(180, previewSize.height > 0 ? previewSize.height - 32 : 720);
    const fitWidth = Math.min(availableWidth, availableHeight * ratio);
    const zoomScale = canvasZoom === "fit" ? 1 : Number(canvasZoom) / 100;
    const displayWidth = manualCanvasWidth ?? clamp(fitWidth * zoomScale, 180, 1800);
    const displayHeight = displayWidth / ratio;

    return {
      width: `${displayWidth}px`,
      height: `${displayHeight}px`,
      aspectRatio: `${selectedFormat.width} / ${selectedFormat.height}`,
    };
  }, [canvasZoom, manualCanvasWidth, previewSize.height, previewSize.width, selectedFormat.height, selectedFormat.width]);

  const timelineInnerStyle = useMemo(
    () => ({
      width: `${Math.round(timelineZoom * 100)}%`,
      "--pixores-playhead-left": `${(currentTime / timelineViewportDuration) * 100}%`,
    } as CSSProperties),
    [currentTime, timelineViewportDuration, timelineZoom],
  );

  const createLayerVideoElement = useCallback((url: string) => {
    const video = document.createElement("video");
    video.src = new URL(url, window.location.href).href;
    video.muted = true;
    video.playsInline = true;
    video.loop = false;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.onloadeddata = () => setMediaLoadTick((value) => value + 1);
    video.oncanplay = () => setMediaLoadTick((value) => value + 1);
    video.onseeked = () => setMediaLoadTick((value) => value + 1);
    video.load();
    return video;
  }, []);

  const getLayerVideoElement = useCallback((layer: VideoLayer, asset: MediaAsset) => {
    if (asset.kind !== "video" || !asset.video) return null;
    const cacheKey = layer.id;
    const existing = layerVideoElementsRef.current.get(cacheKey);
    const resolvedUrl = new URL(asset.url, window.location.href).href;
    if (existing && existing.src === resolvedUrl) {
      layerVideoElementsRef.current.delete(cacheKey);
      layerVideoElementsRef.current.set(cacheKey, existing);
      return existing;
    }

    if (existing) {
      releasePreviewMediaElement(existing);
      layerVideoElementsRef.current.delete(cacheKey);
    }

    while (layerVideoElementsRef.current.size >= MAX_PREVIEW_VIDEO_ELEMENTS) {
      const oldestKey = layerVideoElementsRef.current.keys().next().value;
      if (typeof oldestKey !== "string") break;
      const oldest = layerVideoElementsRef.current.get(oldestKey);
      if (oldest) releasePreviewMediaElement(oldest);
      layerVideoElementsRef.current.delete(oldestKey);
      videoSeekTargetsRef.current.delete(oldestKey);
    }

    const reusableAssetVideo = asset.video
      && asset.video.readyState >= 2
      && asset.video.src === resolvedUrl
      && !Array.from(layerVideoElementsRef.current.values()).includes(asset.video)
      ? asset.video
      : null;
    const video = reusableAssetVideo || createLayerVideoElement(resolvedUrl);
    video.onerror = () => {
      const fallbackUrl = asset.persistentUrl;
      if (!fallbackUrl || asset.url === fallbackUrl) return;
      asset.url = fallbackUrl;
      if (asset.video) {
        asset.video.onerror = null;
        asset.video.pause();
        asset.video.src = fallbackUrl;
        asset.video.load();
      }
      if (video !== asset.video) releasePreviewMediaElement(video);
      layerVideoElementsRef.current.delete(cacheKey);
      videoSeekTargetsRef.current.delete(cacheKey);
      setImports((current) => current.map((item) => item.id === (layer.assetKey || layer.id)
        ? { ...item, url: fallbackUrl }
        : item));
      setStatus("The editing proxy could not be decoded. Pixores restored the original video.");
      setMediaLoadTick((value) => value + 1);
    };
    layerVideoElementsRef.current.set(cacheKey, video);
    return video;
  }, [createLayerVideoElement]);

  const createLayerAudioElement = useCallback((url: string) => {
    const audio = document.createElement("audio");
    audio.src = new URL(url, window.location.href).href;
    audio.loop = false;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    return audio;
  }, []);

  const getLayerAudioElement = useCallback((layer: VideoLayer, asset: MediaAsset) => {
    if (asset.kind !== "audio" || !asset.audio) return null;
    const cacheKey = layer.id;
    const existing = layerAudioElementsRef.current.get(cacheKey);
    const resolvedUrl = new URL(asset.url, window.location.href).href;
    if (existing && existing.src === resolvedUrl) {
      layerAudioElementsRef.current.delete(cacheKey);
      layerAudioElementsRef.current.set(cacheKey, existing);
      return existing;
    }

    if (existing) {
      releasePreviewMediaElement(existing);
      layerAudioElementsRef.current.delete(cacheKey);
    }

    while (layerAudioElementsRef.current.size >= MAX_PREVIEW_AUDIO_ELEMENTS) {
      const oldestKey = layerAudioElementsRef.current.keys().next().value;
      if (typeof oldestKey !== "string") break;
      const oldest = layerAudioElementsRef.current.get(oldestKey);
      if (oldest) releasePreviewMediaElement(oldest);
      layerAudioElementsRef.current.delete(oldestKey);
    }

    const audio = createLayerAudioElement(resolvedUrl);
    layerAudioElementsRef.current.set(cacheKey, audio);
    return audio;
  }, [createLayerAudioElement]);

  const getLayerPlaybackElement = useCallback((layer: VideoLayer, asset: MediaAsset) => {
    if (asset.kind === "video" && asset.video) return getLayerVideoElement(layer, asset);
    if (asset.kind === "audio" && asset.audio) return getLayerAudioElement(layer, asset);
    return null;
  }, [getLayerAudioElement, getLayerVideoElement]);

  const playbackTargets = useMemo(() => {
    const targets = new Map<string, PlaybackTarget>();
    const activeBridgeTransitions = layers.filter((layer) => isBridgeTransitionActive(layer, currentTime));

    for (const layer of layers) {
      const naturallyActive = currentTime >= layer.start && currentTime <= getLayerEnd(layer);
      const activeLinkedTransition = layer.type === "media"
        ? activeBridgeTransitions.find((transition) => (
          transition.fromLayerId === layer.id || transition.toLayerId === layer.id
        ))
        : undefined;
      if (!layer.visible || (!naturallyActive && !activeLinkedTransition)) continue;
      if (layer.type !== "media" && layer.type !== "audio") continue;
      const trackMuted = isLayerTrackMuted(layer, trackSettings);
      if ((trackMuted || layer.muted) && layer.type === "audio") continue;

      const asset = mediaAssetsRef.current.get(layer.assetKey || layer.id);
      if (!asset) continue;

      const shouldUseVisualVideo =
        layer.type === "media"
        && layer.mediaKind === "video"
        && asset.kind === "video"
        && Boolean(asset.video);
      const shouldUseIntegratedVideoAudio =
        shouldUseVisualVideo
        && !layer.audioDetached
        && !trackMuted
        && !layer.muted;
      const shouldUseAudioTrack = layer.type === "audio" && Boolean(asset.audio || asset.video);
      if (!shouldUseVisualVideo && !shouldUseAudioTrack) continue;

      const element = getLayerPlaybackElement(layer, asset);
      if (!element) continue;
      const localTime = clamp(currentTime - layer.start, 0, Math.max(0.1, layer.duration));
      const sourceTime = getLayerSourceStart(layer) + localTime;
      const layerVolume = naturallyActive && (shouldUseIntegratedVideoAudio || shouldUseAudioTrack)
        ? getEffectiveClipVolume(layer, trackSettings, masterVolume, localTime)
        : 0;
      const shouldPlay = naturallyActive && (shouldUseVisualVideo || layerVolume > 0);
      const target = targets.get(layer.id);

      if (target) {
        target.volume = Math.max(target.volume, layerVolume);
        target.shouldPlay = target.shouldPlay || shouldPlay;
      } else {
        targets.set(layer.id, {
          layerId: layer.id,
          element,
          sourceTime,
          volume: layerVolume,
          shouldPlay,
          audioEffects: layer.audioEffects,
        });
      }
    }

    return targets;
  }, [currentTime, getLayerPlaybackElement, layers, masterVolume, trackSettings]);
  playbackTargetsRef.current = playbackTargets;

  useEffect(() => {
    if (isPlaying || isRecording) return;
    const nextLayer = layers
      .filter((layer) => layer.visible && layer.type === "media" && layer.mediaKind === "video" && layer.start > currentTime && layer.start <= currentTime + 2)
      .sort((first, second) => first.start - second.start)[0];
    if (!nextLayer) return;
    const asset = mediaAssetsRef.current.get(nextLayer.assetKey || nextLayer.id);
    if (!asset || asset.kind !== "video" || !asset.video) return;
    if (!layerVideoElementsRef.current.has(nextLayer.id) && layerVideoElementsRef.current.size >= MAX_PREVIEW_VIDEO_ELEMENTS) return;
    const element = getLayerVideoElement(nextLayer, asset);
    if (!element || element.readyState === 0) return;
    const preloadTime = clamp(getLayerSourceStart(nextLayer), 0, Number.isFinite(element.duration) ? Math.max(0, element.duration - 0.05) : getLayerSourceStart(nextLayer));
    if (Math.abs(element.currentTime - preloadTime) > 0.08 && !element.seeking) element.currentTime = preloadTime;
  }, [currentTime, getLayerVideoElement, isPlaying, isRecording, layers]);

  const timelineMarks = useMemo(() => {
    const niceMajorSteps = [0.5, 1, 2, 5, 10, 15, 30, 60, 150, 300, 600, 900, 1800];
    const rawMajorStep = (timelineViewportDuration / timelineZoom) / 8;
    const majorStep = niceMajorSteps.find((step) => step >= rawMajorStep) || niceMajorSteps[niceMajorSteps.length - 1];
    const minorStep = majorStep / 5;
    const count = Math.floor(timelineViewportDuration / minorStep) + 1;
    return Array.from({ length: count }, (_, index) => {
      const time = Number((index * minorStep).toFixed(3));
      const isMajor = Math.abs(time / majorStep - Math.round(time / majorStep)) < 0.001;
      return {
        time,
        label: isMajor ? formatRulerTime(time) : "",
        isMajor,
      };
    }).filter((mark) => mark.time <= timelineViewportDuration);
  }, [timelineViewportDuration, timelineZoom]);

  const drawScene = useCallback((context: CanvasRenderingContext2D, time: number) => {
    if (projectDuration > 0 && time >= projectDuration) {
      time = Math.max(0, projectDuration - (1 / 30));
    }
    const canvas = context.canvas;
    const outputWidth = selectedFormat.width;
    const outputHeight = selectedFormat.height;
    const previewScale = Math.min(1, 1280 / outputWidth, 720 / outputHeight);
    const width = previewFullResolutionRef.current ? outputWidth : Math.max(2, Math.round(outputWidth * previewScale));
    const height = previewFullResolutionRef.current ? outputHeight : Math.max(2, Math.round(outputHeight * previewScale));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = previewFullResolutionRef.current ? "high" : "medium";

    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    const bridgeTransitions = layers.filter((layer) => isBridgeTransitionActive(layer, time));
    const activeEmbeddedMediaIds = new Set(
      layers
        .filter((layer) => (
          layer.type === "shape"
          && isMediaContainerShape(layer.shapeType)
        ))
        .flatMap((layer) => layer.frameMediaLayerIds || []),
    );

    const drawMediaLayerAtTime = (
      layer: VideoLayer,
      layerTime: number,
      opacity = 1,
      clip?: { x: number; y: number; width: number; height: number },
      translateX = 0,
      scale = 1,
      translateY = 0,
      rotation = 0,
      transitionFilter = "",
      transitionScaleX = scale,
      transitionScaleY = scale,
    ) => {
      if (layer.type !== "media") return;
      const asset = mediaAssetsRef.current.get(layer.assetKey || layer.id);
      if (!asset) return;

      const x = (layer.x / 100) * width;
      const y = (layer.y / 100) * height;
      const layerWidth = (layer.width / 100) * width;
      const layerHeight = (layer.height / 100) * height;
      const animationStyle = resolveLayerAnimationStyle(layer.animations, layerTime - layer.start, layer.duration);
      context.save();
      if (clip) {
        context.beginPath();
        context.rect(clip.x, clip.y, clip.width, clip.height);
        context.clip();
      }
      context.globalAlpha = (layer.opacity ?? 1) * opacity * animationStyle.opacityMultiplier;
      applyLayerTransform(context, layer, x + translateX, y + translateY, layerWidth, layerHeight, animationStyle);
      if (transitionScaleX !== 1 || transitionScaleY !== 1 || rotation !== 0) {
        context.translate(layerWidth / 2, layerHeight / 2);
        if (rotation !== 0) context.rotate((rotation * Math.PI) / 180);
        if (transitionScaleX !== 1 || transitionScaleY !== 1) context.scale(transitionScaleX, transitionScaleY);
        context.translate(-layerWidth / 2, -layerHeight / 2);
      }
      applyLayerAnimationClip(context, animationStyle, layerWidth, layerHeight);
      if (layer.blendMode && layer.blendMode !== "normal") context.globalCompositeOperation = layer.blendMode;
      context.beginPath();
      if (layer.borderRadius) {
        context.roundRect(0, 0, layerWidth, layerHeight, layer.borderRadius);
      } else {
        context.rect(0, 0, layerWidth, layerHeight);
      }
      context.clip();

      const drawMediaSource = (source: CanvasImageSource, sourceWidth: number, sourceHeight: number) => {
        const canvasFilter = mergeCanvasFilters(
          getLayerCanvasFilter(layer),
          getLayerAnimationCanvasFilter(animationStyle),
          transitionFilter,
        );
        const chromaKey = layer.effect?.preset === "chromaKey" ? layer.effect.chromaKey : undefined;
        if (!chromaKey) {
          context.filter = canvasFilter;
          try {
            drawLayerMedia(context, source, sourceWidth, sourceHeight, layer, layerWidth, layerHeight, Math.max(0, layerTime - layer.start));
          } catch {
            // A decoder can briefly lose its frame while a large project is restoring.
            // Keep the canvas alive and redraw when loadeddata/seeked fires.
          }
          context.filter = "none";
          return;
        }

        const processingScale = Math.min(1, 1920 / Math.max(layerWidth, layerHeight, 1));
        const effectWidth = Math.max(1, Math.round(layerWidth * processingScale));
        const effectHeight = Math.max(1, Math.round(layerHeight * processingScale));
        let effectCanvas = layerEffectCanvasesRef.current.get(layer.id);
        if (!effectCanvas) {
          effectCanvas = document.createElement("canvas");
          layerEffectCanvasesRef.current.set(layer.id, effectCanvas);
        }
        if (effectCanvas.width !== effectWidth || effectCanvas.height !== effectHeight) {
          effectCanvas.width = effectWidth;
          effectCanvas.height = effectHeight;
        }
        const effectContext = effectCanvas.getContext("2d", { willReadFrequently: true });
        if (!effectContext) return;
        effectContext.clearRect(0, 0, effectWidth, effectHeight);
        effectContext.filter = canvasFilter;
        drawLayerMedia(effectContext, source, sourceWidth, sourceHeight, layer, effectWidth, effectHeight, Math.max(0, layerTime - layer.start));
        effectContext.filter = "none";

        try {
          applyChromaKeyToCanvas(effectContext, effectWidth, effectHeight, chromaKey, layer.effect?.intensity ?? 1);
          context.filter = "none";
          context.drawImage(effectCanvas, 0, 0, effectWidth, effectHeight, 0, 0, layerWidth, layerHeight);
        } catch {
          context.filter = canvasFilter;
          try {
            drawLayerMedia(context, source, sourceWidth, sourceHeight, layer, layerWidth, layerHeight, Math.max(0, layerTime - layer.start));
          } catch {
            // Keep rendering the remaining layers while the media frame recovers.
          }
          context.filter = "none";
        }
      };

      if (asset.kind === "image" && asset.image?.complete) {
        drawMediaSource(asset.image, asset.image.naturalWidth, asset.image.naturalHeight);
      }

      if (asset.kind === "video") {
        const video = getLayerVideoElement(layer, asset);
        if (!video || video.readyState < 2) {
          const cached = videoFrameCacheRef.current.get(layer.id);
          if (cached) drawMediaSource(cached.canvas, cached.width, cached.height);
          context.restore();
          return;
        }
        const frameCacheKey = layer.id;
        const localTime = clamp(layerTime - layer.start, 0, Math.max(0.1, layer.duration));
        const sourceTime = getLayerSourceStart(layer) + localTime;
        const sourceDuration = Number.isFinite(video.duration) ? video.duration : 0;
        const targetTime = sourceDuration > 0 ? Math.min(sourceTime, Math.max(0, sourceDuration - 0.05)) : sourceTime;
        const shouldSeekSource = !isRecording && !isPlaying;
        const drawCachedFrame = () => {
          const cached = videoFrameCacheRef.current.get(frameCacheKey);
          if (!cached) return false;
          videoFrameCacheRef.current.delete(frameCacheKey);
          videoFrameCacheRef.current.set(frameCacheKey, cached);
          drawMediaSource(cached.canvas, cached.width, cached.height);
          return true;
        };
        const rememberStableFrame = () => {
          const sourceFrameWidth = video.videoWidth || width;
          const sourceFrameHeight = video.videoHeight || height;
          if (sourceFrameWidth <= 0 || sourceFrameHeight <= 0) return;
          const cacheScale = Math.min(
            1,
            PREVIEW_FRAME_CACHE_MAX_WIDTH / sourceFrameWidth,
            PREVIEW_FRAME_CACHE_MAX_HEIGHT / sourceFrameHeight,
          );
          const frameWidth = Math.max(1, Math.round(sourceFrameWidth * cacheScale));
          const frameHeight = Math.max(1, Math.round(sourceFrameHeight * cacheScale));

          try {
            let cached = videoFrameCacheRef.current.get(frameCacheKey);
            if (!cached || cached.width !== frameWidth || cached.height !== frameHeight) {
              videoFrameCacheRef.current.delete(frameCacheKey);
              while (videoFrameCacheRef.current.size >= MAX_PREVIEW_FRAME_CACHE) {
                const oldestKey = videoFrameCacheRef.current.keys().next().value;
                if (typeof oldestKey !== "string") break;
                videoFrameCacheRef.current.delete(oldestKey);
              }
              const cacheCanvas = document.createElement("canvas");
              cacheCanvas.width = frameWidth;
              cacheCanvas.height = frameHeight;
              cached = { canvas: cacheCanvas, width: frameWidth, height: frameHeight, time: video.currentTime || 0 };
              videoFrameCacheRef.current.set(frameCacheKey, cached);
            } else {
              videoFrameCacheRef.current.delete(frameCacheKey);
              videoFrameCacheRef.current.set(frameCacheKey, cached);
            }
            const cacheContext = cached.canvas.getContext("2d");
            if (!cacheContext) return;
            cacheContext.clearRect(0, 0, cached.width, cached.height);
            cacheContext.drawImage(video, 0, 0, cached.width, cached.height);
            cached.time = video.currentTime || 0;
          } catch {
            // Some browser-decoded frames can be temporarily unavailable during a seek.
          }
        };

        let didDrawVideo = false;
        if (shouldSeekSource && sourceDuration > 0) {
          const drift = Math.abs((video.currentTime || 0) - targetTime);
          const pendingTarget = videoSeekTargetsRef.current.get(frameCacheKey);
          if (
            drift > 0.08
            && !video.seeking
            && (pendingTarget === undefined || Math.abs(pendingTarget - targetTime) > 0.03)
          ) {
            videoSeekTargetsRef.current.set(frameCacheKey, targetTime);
            try {
              video.currentTime = targetTime;
            } catch {
              // Ignore precise seek failures while metadata is settling.
            }
          }

          if (video.seeking || Math.abs((video.currentTime || 0) - targetTime) > 0.08) {
            didDrawVideo = drawCachedFrame();
          } else {
            videoSeekTargetsRef.current.delete(frameCacheKey);
          }
        } else if (!video.seeking) {
          videoSeekTargetsRef.current.delete(frameCacheKey);
        }

        if (!didDrawVideo && video.seeking) {
          didDrawVideo = drawCachedFrame();
        }

        if (!didDrawVideo) {
          drawMediaSource(video, video.videoWidth || width, video.videoHeight || height);
          if (!video.seeking) rememberStableFrame();
        }
      }

      if (layer.effect?.preset === "vignette") {
        const intensity = clamp(layer.effect.intensity ?? 1, 0, 1);
        const vignette = context.createRadialGradient(
          layerWidth / 2,
          layerHeight / 2,
          Math.min(layerWidth, layerHeight) * 0.18,
          layerWidth / 2,
          layerHeight / 2,
          Math.max(layerWidth, layerHeight) * 0.72,
        );
        vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
        vignette.addColorStop(0.58, `rgba(0, 0, 0, ${0.05 * intensity})`);
        vignette.addColorStop(1, `rgba(0, 0, 0, ${0.82 * intensity})`);
        context.filter = "none";
        context.fillStyle = vignette;
        context.fillRect(0, 0, layerWidth, layerHeight);
      }

      if ((layer.strokeWidth || 0) > 0) {
        context.strokeStyle = colorWithOpacity(layer.strokeColor || "#ffffff", layer.strokeOpacity ?? 1);
        context.lineWidth = layer.strokeWidth || 0;
        const strokeInset = (layer.strokeWidth || 0) / 2;
        context.strokeRect(strokeInset, strokeInset, layerWidth - strokeInset * 2, layerHeight - strokeInset * 2);
      }
      context.restore();
    };

    const drawFrameMediaContents = (frameLayer: VideoLayer, frameWidth: number, frameHeight: number) => {
      const slots = getFrameMediaSlots(frameLayer.shapeType);
      slots.forEach((slot, slotIndex) => {
        const mediaLayerId = frameLayer.frameMediaLayerIds?.[slotIndex];
        const mediaLayer = mediaLayerId ? layers.find((item) => item.id === mediaLayerId && item.type === "media") : undefined;
        if (!mediaLayer) return;
        const asset = mediaAssetsRef.current.get(mediaLayer.assetKey || mediaLayer.id);
        if (!asset) return;

        let source: CanvasImageSource | undefined;
        let sourceWidth = 0;
        let sourceHeight = 0;
        if (asset.kind === "image" && asset.image?.complete && asset.image.naturalWidth > 0) {
          source = asset.image;
          sourceWidth = asset.image.naturalWidth;
          sourceHeight = asset.image.naturalHeight;
        } else if (asset.kind === "video") {
          const video = getLayerVideoElement(mediaLayer, asset);
          if (video?.readyState && video.readyState >= 2) {
            const frameLocalTime = clamp(time - frameLayer.start, 0, Math.max(0.1, frameLayer.duration));
            const sourceTime = getLayerSourceStart(mediaLayer) + frameLocalTime;
            const targetTime = Number.isFinite(video.duration)
              ? Math.min(sourceTime, Math.max(0, video.duration - 0.05))
              : sourceTime;
            if (!isPlaying && !isRecording && !video.seeking && Math.abs((video.currentTime || 0) - targetTime) > 0.08) {
              try {
                video.currentTime = targetTime;
              } catch {
                // Keep the last available video frame while the source is loading.
              }
            }
            const cached = videoFrameCacheRef.current.get(mediaLayer.id);
            if (video.seeking && cached) {
              source = cached.canvas;
              sourceWidth = cached.width;
              sourceHeight = cached.height;
            } else {
              source = video;
              sourceWidth = video.videoWidth || width;
              sourceHeight = video.videoHeight || height;
            }
          }
        }
        if (!source || sourceWidth <= 0 || sourceHeight <= 0) return;

        context.save();
        const bounds = traceFrameMediaSlot(context, slot, frameWidth, frameHeight);
        context.clip();
        context.translate(bounds.x, bounds.y);
        const mediaAnimationStyle = resolveLayerAnimationStyle(mediaLayer.animations, time - frameLayer.start, frameLayer.duration);
        context.globalAlpha *= (mediaLayer.opacity ?? 1) * mediaAnimationStyle.opacityMultiplier;
        applyLayerTransform(context, { ...mediaLayer, angle: 0 }, 0, 0, bounds.width, bounds.height, mediaAnimationStyle);
        applyLayerAnimationClip(context, mediaAnimationStyle, bounds.width, bounds.height);
        context.filter = mergeCanvasFilters(getLayerCanvasFilter(mediaLayer), getLayerAnimationCanvasFilter(mediaAnimationStyle));
        drawLayerMedia(
          context,
          source,
          sourceWidth,
          sourceHeight,
          { ...mediaLayer, objectFit: "cover" },
          bounds.width,
          bounds.height,
          Math.max(0, time - frameLayer.start),
        );
        context.restore();
      });
    };

    const drawMediaContainer = (frameLayer: VideoLayer, frameWidth: number, frameHeight: number) => {
      const isPaperFrame = frameLayer.shapeType?.startsWith("paper") || frameLayer.shapeType === "paperFrame";
      const isVersusFrame = frameLayer.shapeType === "vsDividerFrame";
      if (isPaperFrame || isVersusFrame) drawShape(context, frameLayer, 0, 0, frameWidth, frameHeight, time - frameLayer.start);
      drawFrameMediaContents(frameLayer, frameWidth, frameHeight);

      if (isVersusFrame) {
        context.save();
        context.beginPath();
        context.fillStyle = "#ffffff";
        context.arc(frameWidth / 2, frameHeight / 2, Math.min(frameWidth, frameHeight) * 0.16, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#111827";
        context.font = `900 ${Math.max(12, Math.min(frameWidth, frameHeight) * 0.16)}px Arial`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("VS", frameWidth / 2, frameHeight / 2);
        context.restore();
      } else if (!isPaperFrame) {
        drawShape(context, frameLayer, 0, 0, frameWidth, frameHeight, time - frameLayer.start);
      }
    };

    const layerDrawOrder = [...layers].sort((first, second) => (
      getTrackOrder(getTrackId(second), trackSettings, 0) - getTrackOrder(getTrackId(first), trackSettings, 0)
    ));

    for (const layer of layerDrawOrder) {
      const active = layer.visible && time >= layer.start && time <= getLayerEnd(layer);
      if (!active) continue;
      if (layer.type === "transition") continue;
      if (layer.type === "media" && activeEmbeddedMediaIds.has(layer.id)) continue;
      if (getActiveBridgeTransitionForLayer(layer, bridgeTransitions, time)) continue;

      const x = (layer.x / 100) * width;
      const y = (layer.y / 100) * height;
      const layerWidth = (layer.width / 100) * width;
      const layerHeight = (layer.height / 100) * height;
      const animationStyle = resolveLayerAnimationStyle(layer.animations, time - layer.start, layer.duration);
      context.save();
      context.globalAlpha = layer.opacity * animationStyle.opacityMultiplier;
      applyLayerTransform(context, layer, x, y, layerWidth, layerHeight, animationStyle);
      applyLayerAnimationClip(context, animationStyle, layerWidth, layerHeight);
      context.filter = mergeCanvasFilters(layer.blur ? `blur(${layer.blur}px)` : undefined, getLayerAnimationCanvasFilter(animationStyle));
      if (layer.blendMode && layer.blendMode !== "normal") context.globalCompositeOperation = layer.blendMode;
      const layerShadow = layer.type !== "text" ? getLayerShadowSettings(layer) : null;
      if (layerShadow) {
        context.shadowColor = layerShadow.color;
        context.shadowBlur = layerShadow.blur;
        context.shadowOffsetX = layerShadow.offsetX;
        context.shadowOffsetY = layerShadow.offsetY;
      }

      if (layer.type === "media") {
        context.restore();
        drawMediaLayerAtTime(layer, time);
        continue;
      }

      if (layer.type === "text") {
        const textStyle = resolvePixoresTextStyle(layer, width);
        const fontSize = textStyle.fontSize;
        const textEffect = layer.textEffectPreset || "none";
        context.font = `${textStyle.fontStyle} ${textStyle.fontWeight} ${fontSize}px ${layer.fontFamily || "Arial"}, Arial, sans-serif`;
        context.letterSpacing = `${textStyle.letterSpacing}px`;
        context.fillStyle = textEffect === "hollow" ? "rgba(0, 0, 0, 0)" : layer.color || "#ffffff";
        context.textBaseline = "top";
        context.shadowColor = layer.shadowColor
          ? colorWithOpacity(layer.shadowColor, layer.shadowOpacity ?? 0.6)
          : "rgba(0, 0, 0, 0.36)";
        context.shadowBlur = textStyle.shadowBlur;
        context.shadowOffsetX = textStyle.shadowOffsetX;
        context.shadowOffsetY = textStyle.shadowOffsetY;
        const textValue = layer.isUppercase ? (layer.text || "").toUpperCase() : layer.text || "";
        const lines = wrapText(context, textValue, layerWidth).slice(0, 4).map((line) => (layer.hasBullets ? `• ${line.replace(/^•\s?/, "")}` : line));
        const align = layer.textAlign || "left";
        context.textAlign = align;
        const textX = align === "center" ? layerWidth / 2 : align === "right" ? layerWidth : 0;
        if (layer.hasTextBg) {
          context.save();
          context.shadowBlur = 0;
          context.fillStyle = layer.textBgColor || "#8b5cf6";
          const padding = textStyle.textBgPadding;
          const backgroundWidth = Math.min(layerWidth, Math.max(1, ...lines.map((line) => context.measureText(line).width)));
          const backgroundX = align === "center" ? (layerWidth - backgroundWidth) / 2 : align === "right" ? layerWidth - backgroundWidth : 0;
          const backgroundHeight = Math.max(1, lines.length) * fontSize * (layer.lineHeight || 1.08);
          const boxX = backgroundX - padding;
          const boxY = -padding;
          const boxWidth = backgroundWidth + padding * 2;
          const boxHeight = backgroundHeight + padding * 2;
          const radius = Math.min(textStyle.textBgRadius, boxWidth / 2, boxHeight / 2);
          context.beginPath();
          context.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
          context.fill();
          context.restore();
        }

        const drawStyledText = (line: string, lineX: number, lineY: number) => {
          if (textEffect === "echo") {
            context.save();
            context.shadowColor = "transparent";
            context.shadowBlur = 0;
            context.fillStyle = colorWithOpacity(layer.glowColor || "#8b5cf6", 0.38);
            context.fillText(line, lineX + 7, lineY + 7);
            context.fillStyle = colorWithOpacity(layer.glowColor || "#8b5cf6", 0.2);
            context.fillText(line, lineX + 14, lineY + 14);
            context.restore();
          }
          if (textEffect === "glitch") {
            context.save();
            context.shadowColor = "transparent";
            context.shadowBlur = 0;
            context.fillStyle = "#22d3ee";
            context.fillText(line, lineX - 4, lineY);
            context.fillStyle = "#f000b8";
            context.fillText(line, lineX + 4, lineY);
            context.restore();
          }
          if ((layer.strokeWidth || 0) > 0) {
            context.strokeStyle = colorWithOpacity(layer.strokeColor || "#000000", layer.strokeOpacity ?? 1);
            context.lineWidth = textStyle.strokeWidth;
            context.strokeText(line, lineX, lineY);
          }
          if ((layer.glowRadius || 0) > 0) {
            context.save();
            context.shadowColor = layer.glowColor || "#ffff00";
            context.shadowBlur = textStyle.glowRadius;
            context.fillText(line, lineX, lineY);
            context.restore();
          }
          if (textEffect !== "hollow") context.fillText(line, lineX, lineY);
        };

        if (textEffect === "curve" && lines[0]) {
          const curvedLine = lines.join(" ");
          const characters = Array.from(curvedLine);
          const characterWidths = characters.map((character) => context.measureText(character).width);
          const totalTextWidth = characterWidths.reduce((total, characterWidth) => total + characterWidth, 0);
          const halfTextWidth = Math.max(1, totalTextWidth / 2);
          const curve = layer.textCurve ?? -30;
          const baseY = curve < 0 ? Math.abs(curve) : 0;
          let cursorX = -halfTextWidth;
          characters.forEach((character, characterIndex) => {
            const characterWidth = characterWidths[characterIndex];
            const characterCenter = cursorX + characterWidth / 2;
            const normalizedX = clamp(characterCenter / halfTextWidth, -1, 1);
            const curveY = curve * (1 - normalizedX * normalizedX);
            const angle = Math.atan((-2 * curve * normalizedX) / halfTextWidth);
            context.save();
            context.translate(layerWidth / 2 + characterCenter, baseY + curveY);
            context.rotate(angle);
            context.textAlign = "center";
            drawStyledText(character, 0, 0);
            context.restore();
            cursorX += characterWidth;
          });
        } else {
          lines.forEach((line, index) => {
            const lineY = index * fontSize * (layer.lineHeight || 1.08);
            drawStyledText(line, textX, lineY);
          if (layer.isUnderline || layer.isStrikethrough) {
            const measuredWidth = context.measureText(line).width;
            const lineStart = align === "center" ? textX - measuredWidth / 2 : align === "right" ? textX - measuredWidth : textX;
            if (layer.isUnderline) context.fillRect(lineStart, lineY + fontSize * 0.96, measuredWidth, Math.max(2, fontSize * 0.05));
            if (layer.isStrikethrough) context.fillRect(lineStart, lineY + fontSize * 0.52, measuredWidth, Math.max(2, fontSize * 0.045));
          }
          });
        }
        context.shadowBlur = 0;
      }

      if (layer.type === "lower-third") {
        drawLowerThird(
          context,
          layer,
          layerWidth,
          layerHeight,
          time - layer.start,
          (assetId) => mediaAssetsRef.current.get(assetId)?.image,
        );
        if ((layer.strokeWidth || 0) > 0) {
          context.strokeStyle = colorWithOpacity(layer.strokeColor || "#ffffff", layer.strokeOpacity ?? 1);
          context.lineWidth = layer.strokeWidth || 0;
          const strokeInset = (layer.strokeWidth || 0) / 2;
          context.strokeRect(strokeInset, strokeInset, layerWidth - strokeInset * 2, layerHeight - strokeInset * 2);
        }
      }

      if (layer.type === "shape") {
        if (isMediaContainerShape(layer.shapeType)) drawMediaContainer(layer, layerWidth, layerHeight);
        else drawShape(context, layer, 0, 0, layerWidth, layerHeight, time - layer.start);
      }

      context.restore();
    }

    bridgeTransitions.forEach((layer) => {
      const fromLayer = layers.find((item) => item.id === layer.fromLayerId);
      const toLayer = layers.find((item) => item.id === layer.toLayerId);
      if (!fromLayer || !toLayer || !isTransitionCompatibleClip(fromLayer) || !isTransitionCompatibleClip(toLayer)) return;

      const rawProgress = clamp((time - layer.start) / Math.max(layer.duration, 0.1), 0, 1);
      const progress = applyTransitionEasing(rawProgress, layer.easing);
      const transitionKind = layer.transitionKind || "fade";
      const fromTime = time;
      const toTime = Math.max(toLayer.start, time);

      if (transitionKind === "fadeBlack" || transitionKind === "fadeWhite") {
        const outgoingOpacity = Math.max(0, 1 - progress * 2);
        const incomingOpacity = Math.max(0, progress * 2 - 1);
        drawMediaLayerAtTime(fromLayer, fromTime, outgoingOpacity);
        drawMediaLayerAtTime(toLayer, toTime, incomingOpacity);
        context.save();
        context.globalAlpha = Math.sin(progress * Math.PI);
        context.fillStyle = transitionKind === "fadeWhite" ? "#ffffff" : "#000000";
        context.fillRect(0, 0, width, height);
        context.restore();
        return;
      }

      if (transitionKind === "wipeLeft" || transitionKind === "wipeRight") {
        drawMediaLayerAtTime(fromLayer, fromTime);
        const revealWidth = width * progress;
        const clip = transitionKind === "wipeLeft"
          ? { x: 0, y: 0, width: revealWidth, height }
          : { x: width - revealWidth, y: 0, width: revealWidth, height };
        drawMediaLayerAtTime(toLayer, toTime, 1, clip);
        return;
      }

      if (transitionKind === "wipeUp" || transitionKind === "wipeDown") {
        drawMediaLayerAtTime(fromLayer, fromTime);
        const revealHeight = height * progress;
        const clip = transitionKind === "wipeUp"
          ? { x: 0, y: height - revealHeight, width, height: revealHeight }
          : { x: 0, y: 0, width, height: revealHeight };
        drawMediaLayerAtTime(toLayer, toTime, 1, clip);
        return;
      }

      if (transitionKind === "slideLeft" || transitionKind === "slideRight") {
        const direction = transitionKind === "slideLeft" ? 1 : -1;
        drawMediaLayerAtTime(fromLayer, fromTime, 1, undefined, -direction * progress * width);
        drawMediaLayerAtTime(toLayer, toTime, 1, undefined, direction * (1 - progress) * width);
        return;
      }

      if (transitionKind === "slideUp" || transitionKind === "slideDown") {
        const direction = transitionKind === "slideUp" ? 1 : -1;
        drawMediaLayerAtTime(fromLayer, fromTime, 1, undefined, 0, 1, -direction * progress * height);
        drawMediaLayerAtTime(toLayer, toTime, 1, undefined, 0, 1, direction * (1 - progress) * height);
        return;
      }

      if (transitionKind === "cubeLeft" || transitionKind === "cubeRight") {
        const direction = transitionKind === "cubeLeft" ? -1 : 1;
        const fromScaleX = Math.max(0.02, Math.cos(progress * Math.PI / 2));
        const toScaleX = Math.max(0.02, Math.sin(progress * Math.PI / 2));
        drawMediaLayerAtTime(fromLayer, fromTime, 1 - progress * 0.55, undefined, direction * progress * width * 0.5, 1, 0, 0, "", fromScaleX, 1);
        drawMediaLayerAtTime(toLayer, toTime, 0.45 + progress * 0.55, undefined, -direction * (1 - progress) * width * 0.5, 1, 0, 0, "", toScaleX, 1);
        return;
      }

      if (transitionKind === "flipHorizontal" || transitionKind === "flipVertical") {
        const firstHalf = progress < 0.5;
        const halfProgress = firstHalf ? progress * 2 : (progress - 0.5) * 2;
        const flatScale = Math.max(0.02, firstHalf ? Math.cos(halfProgress * Math.PI / 2) : Math.sin(halfProgress * Math.PI / 2));
        const sourceLayer = firstHalf ? fromLayer : toLayer;
        const sourceTime = firstHalf ? fromTime : toTime;
        drawMediaLayerAtTime(
          sourceLayer,
          sourceTime,
          1,
          undefined,
          0,
          1,
          0,
          0,
          "",
          transitionKind === "flipHorizontal" ? flatScale : 1,
          transitionKind === "flipVertical" ? flatScale : 1,
        );
        return;
      }

      if (transitionKind === "pageTurnLeft" || transitionKind === "pageTurnRight") {
        const direction = transitionKind === "pageTurnLeft" ? -1 : 1;
        drawMediaLayerAtTime(toLayer, toTime);
        drawMediaLayerAtTime(fromLayer, fromTime, 1 - progress * 0.35, undefined, direction * progress * width * 0.46, 1, 0, 0, `brightness(${1 - progress * 0.48})`, Math.max(0.02, Math.cos(progress * Math.PI / 2)), 1);
        return;
      }

      if (transitionKind === "doorOpen") {
        drawMediaLayerAtTime(toLayer, toTime);
        drawMediaLayerAtTime(fromLayer, fromTime, 1, { x: 0, y: 0, width: width / 2, height }, -progress * width / 2, 1, 0, 0, `brightness(${1 - progress * 0.35})`);
        drawMediaLayerAtTime(fromLayer, fromTime, 1, { x: width / 2, y: 0, width: width / 2, height }, progress * width / 2, 1, 0, 0, `brightness(${1 - progress * 0.35})`);
        return;
      }

      if (transitionKind === "zoomTunnel") {
        drawMediaLayerAtTime(fromLayer, fromTime, 1 - progress, undefined, 0, 1 + progress * 2.1, 0, 0, `blur(${progress * 12}px)`);
        drawMediaLayerAtTime(toLayer, toTime, progress, undefined, 0, 0.25 + progress * 0.75, 0, 0, `blur(${(1 - progress) * 10}px)`);
        return;
      }

      if (transitionKind === "zoomFlash") {
        drawMediaLayerAtTime(fromLayer, fromTime, 1 - progress, undefined, 0, 1 + progress * 0.08);
        drawMediaLayerAtTime(toLayer, toTime, progress, undefined, 0, 1.08 - progress * 0.08);
        drawTransitionOverlay(context, layer, width, height, time);
        return;
      }

      if (transitionKind === "zoomIn") {
        drawMediaLayerAtTime(fromLayer, fromTime, 1 - progress, undefined, 0, 1 + progress * 0.18);
        drawMediaLayerAtTime(toLayer, toTime, progress, undefined, 0, 1.35 - progress * 0.35);
        return;
      }

      if (transitionKind === "zoomOut") {
        drawMediaLayerAtTime(fromLayer, fromTime, 1 - progress, undefined, 0, 1 - progress * 0.35);
        drawMediaLayerAtTime(toLayer, toTime, progress, undefined, 0, 0.82 + progress * 0.18);
        return;
      }

      if (transitionKind === "rotateClockwise") {
        drawMediaLayerAtTime(fromLayer, fromTime, 1 - progress, undefined, 0, 1 + progress * 0.12, 0, progress * 14);
        drawMediaLayerAtTime(toLayer, toTime, progress, undefined, 0, 0.78 + progress * 0.22, 0, -18 * (1 - progress));
        return;
      }

      if (transitionKind === "blurDissolve") {
        const blurRadius = Math.max(2, Math.min(width, height) * 0.012);
        drawMediaLayerAtTime(fromLayer, fromTime, 1 - progress, undefined, 0, 1, 0, 0, `blur(${progress * blurRadius}px)`);
        drawMediaLayerAtTime(toLayer, toTime, progress, undefined, 0, 1, 0, 0, `blur(${(1 - progress) * blurRadius}px)`);
        return;
      }

      if (transitionKind === "radialReveal") {
        drawMediaLayerAtTime(fromLayer, fromTime);
        context.save();
        context.beginPath();
        context.arc(width / 2, height / 2, Math.hypot(width, height) * 0.55 * progress, 0, Math.PI * 2);
        context.clip();
        drawMediaLayerAtTime(toLayer, toTime);
        context.restore();
        return;
      }

      if (transitionKind === "diagonalWipe") {
        drawMediaLayerAtTime(fromLayer, fromTime);
        const leadingEdge = width * (progress * 1.45 - 0.22);
        context.save();
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(leadingEdge + width * 0.28, 0);
        context.lineTo(leadingEdge, height);
        context.lineTo(0, height);
        context.closePath();
        context.clip();
        drawMediaLayerAtTime(toLayer, toTime);
        context.restore();
        return;
      }

      if (transitionKind === "splitReveal") {
        drawMediaLayerAtTime(fromLayer, fromTime);
        const halfReveal = width * 0.5 * progress;
        context.save();
        context.beginPath();
        context.rect(width / 2 - halfReveal, 0, halfReveal, height);
        context.rect(width / 2, 0, halfReveal, height);
        context.clip();
        drawMediaLayerAtTime(toLayer, toTime);
        context.restore();
        return;
      }

      if (transitionKind === "glitch") {
        const jitter = Math.sin(progress * 80) * width * 0.012 * Math.sin(progress * Math.PI);
        const colorShift = Math.round((1 - progress) * 80);
        drawMediaLayerAtTime(fromLayer, fromTime, 1 - progress, undefined, -jitter, 1.015, 0, 0, `saturate(1.6) hue-rotate(${colorShift}deg)`);
        drawMediaLayerAtTime(toLayer, toTime, progress, undefined, jitter, 1.015, 0, 0, `saturate(1.7) hue-rotate(${-colorShift}deg)`);
        drawTransitionOverlay(context, layer, width, height, time);
        return;
      }

      drawMediaLayerAtTime(fromLayer, fromTime, 1 - progress);
      drawMediaLayerAtTime(toLayer, toTime, progress);
    });

    layers
      .filter((layer) => (
        layer.type === "transition"
        && layer.visible
        && !layer.fromLayerId
        && !layer.toLayerId
        && time >= layer.start
        && time <= getLayerEnd(layer)
      ))
      .forEach((layer) => drawTransitionOverlay(context, layer, width, height, time));
  }, [background, fontLoadRevision, getLayerVideoElement, isPlaying, isRecording, layers, projectDuration, selectedFormat.height, selectedFormat.width, trackSettings]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    importsRef.current = imports;
  }, [adapters.isDesktop, imports]);

  useEffect(() => {
    setActiveObjectStylePanel(null);
    setIsTextEffectsPanelOpen(false);
  }, [selectedLayerId]);

  useEffect(() => {
    const controller = new AbortController();
    setMediaLibraryStatus("loading");
    void loadBuiltInMediaLibrary(controller.signal)
      .then((manifest) => {
        setMediaLibrary(manifest);
        setMediaLibraryStatus("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMediaLibraryStatus("error");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPersonalLibraryStatus("loading");
    const loadLibrary = async () => {
      try {
        const bridge = getPixoresDesktopBridge();
        const items = bridge?.listElementLibrary
          ? (await bridge.listElementLibrary(personalLibraryUserKey)).items
          : JSON.parse(localStorage.getItem(`${PERSONAL_ELEMENT_LIBRARY_KEY}:${personalLibraryUserKey}`) || "[]");
        if (cancelled) return;
        setPersonalLibraryItems(Array.isArray(items) ? items as PersonalLibraryItem[] : []);
        setPersonalLibraryStatus("ready");
      } catch {
        if (!cancelled) setPersonalLibraryStatus("error");
      }
    };
    void loadLibrary();
    return () => { cancelled = true; };
  }, [personalLibraryUserKey]);

  useEffect(() => () => {
    soundEffectPreviewRef.current?.pause();
    soundEffectPreviewRef.current = null;
  }, []);

  useEffect(() => {
    if (!projectLifecycleReady || savedProjectFingerprint) return;
    setSavedProjectFingerprint(currentProjectFingerprint);
  }, [currentProjectFingerprint, projectLifecycleReady, savedProjectFingerprint]);

  useEffect(() => {
    if (!adapters.isDesktop) return;
    getPixoresDesktopBridge()?.setProjectDirty?.(isProjectDirty);
  }, [adapters.isDesktop, isProjectDirty]);

  useEffect(() => {
    if (!adapters.isDesktop) return;
    const bridge = getPixoresDesktopBridge();
    return bridge?.onWindowCloseRequested?.(() => {
      void (async () => {
        await bridge.respondToWindowClose?.("cancel");
        if (isProjectDirty) {
          setPendingProjectAction("close-project");
          return;
        }
        clearAutoSaveRecovery();
        allowPageUnloadRef.current = true;
        bridge.setProjectDirty?.(false);
        window.location.assign("/video-maker/start?desktop=1");
      })();
    });
  }, [adapters.isDesktop, isProjectDirty]);

  useEffect(() => {
    if (!adapters.isDesktop) return;
    return getPixoresDesktopBridge()?.onAudioAiProgress?.((progress) => {
      if (progress.jobId !== audioAiJobIdRef.current) return;
      setAudioAiProgress(progress);
    });
  }, [adapters.isDesktop]);

  useEffect(() => {
    if (adapters.isDesktop || !isProjectDirty) return;
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (allowPageUnloadRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnAboutUnsavedChanges);
    return () => window.removeEventListener("beforeunload", warnAboutUnsavedChanges);
  }, [adapters.isDesktop, isProjectDirty]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const trackIds = [
        ...emptyTracks.map((track) => track.id),
        ...layers.filter((layer) => layer.type !== "transition").map((layer) => getTrackId(layer)),
      ];
      const uniqueTrackIds = Array.from(new Set(trackIds));
      setTrackSettings((current) => {
        const currentMap = getTrackSettingsMap(current);
        const next = uniqueTrackIds.map((trackId, fallbackIndex) => {
          const existing = currentMap.get(trackId);
          const emptyTrack = emptyTracks.find((track) => track.id === trackId);
          const firstLayer = layers.find((layer) => getTrackId(layer) === trackId);
          return {
            id: trackId,
            order: firstLayer?.trackOrder ?? existing?.order ?? emptyTrack?.order ?? fallbackIndex,
            name: existing?.name || firstLayer?.trackName || emptyTrack?.name,
            muted: firstLayer?.trackMuted ?? existing?.muted ?? !!emptyTrack?.muted,
            locked: existing?.locked ?? emptyTrack?.locked,
            hidden: existing?.hidden ?? (emptyTrack?.visible === false ? true : undefined),
          };
        }).sort((first, second) => first.order - second.order);
        if (
          next.length === current.length
          && next.every((track, index) => {
            const previous = current[index];
            return previous
              && previous.id === track.id
              && previous.order === track.order
              && previous.muted === track.muted
              && previous.name === track.name;
          })
        ) return current;
        return next;
      });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [emptyTracks, layers]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const localServerAvailable = !adapters.isDesktop && isLocalServerRenderHost();
      setIsLocalServerRenderAvailable(localServerAvailable);
      const defaultRenderMethod: PixoresExportSettings["renderMethod"] = adapters.isDesktop
        ? "local"
        : localServerAvailable ? "server" : "browser";
      const saved = localStorage.getItem("pixores-video-export-settings");
      if (!saved) {
        setExportSettings({ ...createDefaultExportSettings({
          projectTitle,
          width: selectedFormat.width,
          height: selectedFormat.height,
          fps: 30,
          rangeStart: markInTime ?? undefined,
          rangeEnd: markOutTime ?? undefined,
        }), renderMethod: defaultRenderMethod });
        return;
      }

      try {
        const parsed = JSON.parse(saved) as Partial<PixoresExportSettings>;
        setExportSettings((current) => {
          const qualityPreset = normalizeExportQualityPreset(parsed.qualityPreset);
          const merged: PixoresExportSettings = {
            ...current,
            ...parsed,
            qualityPreset,
            encoderPreset: parsed.encoderPreset || "medium",
            pixelFormat: "yuv420p",
            acceleration: parsed.acceleration || "auto",
            renderMethod: defaultRenderMethod,
            width: Number(parsed.width) || selectedFormat.width,
            height: Number(parsed.height) || selectedFormat.height,
            fileName: normalizeExportFileName(parsed.fileName || projectTitle || "pixores-video", parsed.format || "mp4"),
          };
          return qualityPreset === "recommended" ? applyExportQualityPreset(merged, "recommended") : merged;
        });
      } catch {
        localStorage.removeItem("pixores-video-export-settings");
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  // Run once on mount; later user edits should remain local export preferences.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    currentTimeRef.current = currentTime;
    timelineInnerRef.current?.style.setProperty(
      "--pixores-playhead-left",
      `${(currentTime / Math.max(1, timelineViewportDurationRef.current)) * 100}%`,
    );
  }, [currentTime]);

  useEffect(() => {
    const closeTraditionalMenu = (event: PointerEvent) => {
      if (!traditionalMenuRef.current?.contains(event.target as Node)) setActiveTraditionalMenu(null);
    };
    const closeTraditionalMenuWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveTraditionalMenu(null);
    };
    document.addEventListener("pointerdown", closeTraditionalMenu);
    document.addEventListener("keydown", closeTraditionalMenuWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeTraditionalMenu);
      document.removeEventListener("keydown", closeTraditionalMenuWithKeyboard);
    };
  }, []);

  useEffect(() => {
    const media = mediaPreviewRef.current;
    if (!media) return;
    media.volume = mediaPreviewVolume;
    media.muted = isMediaPreviewMuted;
  }, [isMediaPreviewMuted, mediaPreviewVolume, selectedImportId]);

  useEffect(() => {
    const canvasViewport = canvasViewportRef.current;
    if (!canvasViewport) return;

    const updatePreviewSize = () => {
      const rect = canvasViewport.getBoundingClientRect();
      setPreviewSize({ width: rect.width, height: rect.height });
    };

    updatePreviewSize();
    const resizeObserver = new ResizeObserver(updatePreviewSize);
    resizeObserver.observe(canvasViewport);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsCanvasFullscreen(document.fullscreenElement === previewPanelRef.current);
    };
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const families = layers.flatMap((layer) => {
      if (layer.type === "text") return layer.fontFamily ? [layer.fontFamily] : [];
      if (layer.type === "lower-third") return [
        layer.lowerThird?.typography?.primaryFontFamily,
        layer.lowerThird?.typography?.secondaryFontFamily,
      ].filter((fontFamily): fontFamily is string => Boolean(fontFamily));
      return [];
    });
    void ensurePixoresFontsLoaded(families).then(() => {
      if (!cancelled) setFontLoadRevision((revision) => revision + 1);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [layers]);

  useEffect(() => {
    if (activePanel !== "text") return;
    fontGroups.forEach((group) => void ensureVideoMakerFontGroupLoaded(group.label, group.fonts));
  }, [activePanel]);

  useEffect(() => {
    let cancelled = false;
    const decodeWaveform = async (asset: ImportedAsset) => {
      if (waveformPeaksRef.current[asset.id] || waveformPeakRequestsRef.current.has(asset.id)) return;
      if (asset.kind !== "video" && asset.kind !== "audio") return;
      waveformPeakRequestsRef.current.add(asset.id);

      try {
        if (asset.waveformPeaks?.length) {
          waveformPeaksRef.current = { ...waveformPeaksRef.current, [asset.id]: asset.waveformPeaks };
          setWaveformPeaks(waveformPeaksRef.current);
          return;
        }
        // Desktop media preparation creates persistent peaks with FFmpeg. This
        // browser fallback is intentionally limited so multi-GB video files are
        // never read into the renderer just to draw a timeline waveform.
        if (adapters.isDesktop || (asset.size || 0) > 128 * 1024 * 1024) return;
        const response = await fetch(asset.url);
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;
        const AudioContextConstructor = window.AudioContext
          || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextConstructor) return;
        const audioContext = new AudioContextConstructor();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        await audioContext.close().catch(() => undefined);
        if (cancelled) return;
        const peaks = calculateAudioPeaks(audioBuffer);
        waveformPeaksRef.current = { ...waveformPeaksRef.current, [asset.id]: peaks };
        setWaveformPeaks(waveformPeaksRef.current);
      } catch {
        // Some remote codecs or CORS responses cannot be decoded in-browser; the clip still remains editable.
      } finally {
        waveformPeakRequestsRef.current.delete(asset.id);
      }
    };

    imports.forEach((asset) => {
      void decodeWaveform(asset);
    });

    return () => {
      cancelled = true;
    };
  }, [adapters.isDesktop, imports]);

  useEffect(() => {
    const isPlaybackActive = isPlaying || isRecording;
    const activeElements = new Set<HTMLMediaElement>();
    const seekListeners: Array<{ element: HTMLMediaElement; listener: () => void }> = [];

    const configureAudioGraph = (element: HTMLMediaElement, effectsValue: PixoresAudioEffectChain | undefined, volume: number) => {
      try {
        const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextConstructor) return false;
        const context = previewAudioContextRef.current || new AudioContextConstructor();
        previewAudioContextRef.current = context;
        let graph = previewAudioGraphsRef.current.get(element);
        if (!graph) {
          const source = context.createMediaElementSource(element);
          const highPass = context.createBiquadFilter(); highPass.type = "highpass";
          const low = context.createBiquadFilter(); low.type = "lowshelf"; low.frequency.value = 120;
          const mid = context.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 1200; mid.Q.value = 0.8;
          const high = context.createBiquadFilter(); high.type = "highshelf"; high.frequency.value = 8000;
          const compressor = context.createDynamicsCompressor();
          const panner = context.createStereoPanner();
          const gain = context.createGain();
          const delay = context.createDelay(1.25);
          const feedback = context.createGain();
          const wet = context.createGain();
          source.connect(highPass).connect(low).connect(mid).connect(high).connect(compressor).connect(panner).connect(gain).connect(context.destination);
          panner.connect(delay).connect(wet).connect(gain);
          delay.connect(feedback).connect(delay);
          graph = { highPass, low, mid, high, compressor, panner, gain, delay, feedback, wet };
          previewAudioGraphsRef.current.set(element, graph);
        }
        const effects = resolveAudioEffects(effectsValue);
        const now = context.currentTime;
        graph.highPass.frequency.setTargetAtTime(Math.max(10, effects.highPassHz || 10), now, 0.015);
        graph.low.gain.setTargetAtTime(effects.lowGainDb, now, 0.015);
        graph.mid.gain.setTargetAtTime(effects.midGainDb, now, 0.015);
        graph.high.gain.setTargetAtTime(effects.highGainDb - effects.deEsser * 5, now, 0.015);
        graph.compressor.threshold.setTargetAtTime(-8 - effects.compressor * 30, now, 0.015);
        graph.compressor.ratio.setTargetAtTime(1 + effects.compressor * 9, now, 0.015);
        graph.panner.pan.setTargetAtTime(effects.pan, now, 0.015);
        const gainMultiplier = Math.pow(10, effects.gainDb / 20) * (effects.normalize ? 1.12 : 1);
        graph.gain.gain.setTargetAtTime(Math.min(4, volume * gainMultiplier), now, 0.015);
        const scenario = { none: [0, 0], studio: [0.045, 0.12], room: [0.075, 0.18], hall: [0.18, 0.28], stage: [0.11, 0.22] }[effects.reverb];
        const echoDelay = effects.echoEnabled ? effects.echoDelayMs / 1000 : scenario[0];
        const echoWet = effects.echoEnabled ? Math.min(0.45, effects.echoDecay * 0.5) : scenario[1];
        graph.delay.delayTime.setTargetAtTime(echoDelay, now, 0.015);
        graph.feedback.gain.setTargetAtTime(effects.echoEnabled ? effects.echoDecay : echoWet * 0.65, now, 0.015);
        graph.wet.gain.setTargetAtTime(echoWet, now, 0.015);
        if (isPlaybackActive && context.state === "suspended") void context.resume();
        return true;
      } catch {
        return false;
      }
    };

    playbackTargets.forEach(({ element, sourceTime, volume, shouldPlay, audioEffects }) => {
      activeElements.add(element);
      const duration = Number.isFinite(element.duration) ? element.duration : 0;
      const maxTime = duration > 0 ? Math.max(0, duration - 0.05) : sourceTime;
      const targetTime = clamp(sourceTime, 0, maxTime);
      const drift = Math.abs((element.currentTime || 0) - targetTime);
      const seekTolerance = isPlaybackActive && !element.paused ? 0.25 : 0.08;

      element.loop = false;
      const usesAudioGraph = configureAudioGraph(element, audioEffects, volume);
      element.volume = usesAudioGraph ? 1 : volume;
      element.muted = !isPlaybackActive || volume <= 0;

      let waitingForSeek = element.seeking;
      if (drift > seekTolerance && element.readyState > 0 && !element.seeking) {
        try {
          if (!element.paused) element.pause();
          element.currentTime = targetTime;
          waitingForSeek = true;
        } catch {
          // Some codecs reject precise seeks while metadata is still settling.
        }
      }

      const startElement = () => {
        if (!isPlaybackActive || !shouldPlay) return;
        element.playbackRate = 1;
        void element.play().catch(() => {
          setIsPlaying(false);
          setStatus("Preview audio needs another tap on Play to start");
        });
      };

      if (isPlaybackActive && shouldPlay && waitingForSeek) {
        const listener = () => startElement();
        element.addEventListener("seeked", listener, { once: true });
        seekListeners.push({ element, listener });
      } else if (isPlaybackActive && shouldPlay && element.paused) {
        startElement();
      } else if ((!isPlaybackActive || !shouldPlay) && !element.paused) {
        element.pause();
        element.playbackRate = 1;
      } else if (isPlaybackActive && shouldPlay && !element.seeking && drift > 0.04) {
        element.playbackRate = clamp(1 + (targetTime - (element.currentTime || 0)) * 0.12, 0.97, 1.03);
      } else if (Math.abs(element.playbackRate - 1) > 0.001) {
        element.playbackRate = 1;
      }
    });

    mediaAssetsRef.current.forEach((asset) => {
      const element = asset.video || asset.audio;
      if (!element || activeElements.has(element)) return;
      element.pause();
      element.muted = true;
    });

    layerVideoElementsRef.current.forEach((element) => {
      if (activeElements.has(element)) return;
      element.pause();
      element.muted = true;
    });
    layerAudioElementsRef.current.forEach((element) => {
      if (activeElements.has(element)) return;
      element.pause();
      element.muted = true;
    });

    return () => {
      seekListeners.forEach(({ element, listener }) => element.removeEventListener("seeked", listener));
    };
  }, [isPlaying, isRecording, playbackTargets]);

  useEffect(() => {
    const activeLayerIds = new Set(layers.map((layer) => layer.id));
    const cleanupMediaElement = (element: HTMLMediaElement) => {
      element.pause();
      element.removeAttribute("src");
      element.load();
    };

    layerVideoElementsRef.current.forEach((element, layerId) => {
      if (activeLayerIds.has(layerId)) return;
      cleanupMediaElement(element);
      layerVideoElementsRef.current.delete(layerId);
      videoSeekTargetsRef.current.delete(layerId);
      videoFrameCacheRef.current.delete(layerId);
    });
    layerAudioElementsRef.current.forEach((element, layerId) => {
      if (activeLayerIds.has(layerId)) return;
      cleanupMediaElement(element);
      layerAudioElementsRef.current.delete(layerId);
    });
  }, [layers]);

  useEffect(() => {
    const assets = mediaAssetsRef.current;
    const layerVideos = layerVideoElementsRef.current;
    const layerAudios = layerAudioElementsRef.current;
    return () => {
      assets.forEach((asset) => URL.revokeObjectURL(asset.url));
      layerVideos.forEach((element) => {
        element.pause();
        element.removeAttribute("src");
        element.load();
      });
      layerAudios.forEach((element) => {
        element.pause();
        element.removeAttribute("src");
        element.load();
      });
    };
  }, []);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  useEffect(() => {
    const projectPayload = sessionStorage.getItem(PIXORES_VIDEO_START_PROJECT_KEY);
    const formatPayload = sessionStorage.getItem(PIXORES_VIDEO_START_FORMAT_KEY);
    const audioPayload = sessionStorage.getItem(PIXORES_VIDEO_START_AUDIO_KEY);
    const requestedTool = (
      sessionStorage.getItem(PIXORES_VIDEO_START_TOOL_KEY)
      || new URLSearchParams(window.location.search).get("tool")
    ) as PixoresVideoStartTool | null;
    const savedAutoSavePreference = localStorage.getItem(PROJECT_AUTOSAVE_ENABLED_KEY);
    const shouldAutoSave = savedAutoSavePreference !== "false";
    setAutoSaveEnabled(shouldAutoSave);

    sessionStorage.removeItem(PIXORES_VIDEO_START_PROJECT_KEY);
    sessionStorage.removeItem(PIXORES_VIDEO_START_FORMAT_KEY);
    sessionStorage.removeItem(PIXORES_VIDEO_START_TOOL_KEY);
    sessionStorage.removeItem(PIXORES_VIDEO_START_AUDIO_KEY);

    const timeoutId = window.setTimeout(async () => {
      const markAutoSaveReady = () => {
        window.requestAnimationFrame(() => {
          projectAutoSaveReadyRef.current = true;
          setProjectLifecycleReady(true);
        });
      };
      const openRequestedTool = () => {
        if (requestedTool === "smart-clips") {
          setIsSmartClipsDialogOpen(true);
        }
        if (requestedTool === "social-resizer") setStatus("Social Resizer ready · Import media and use Crop & Zoom to adjust the vertical frame");
      };
      const importRequestedAudio = () => {
        if (!audioPayload) return;
        try {
          const items = JSON.parse(audioPayload) as PixoresVideoStartAudioItem[];
          const importedCount = importAudioStudioOutputs(Array.isArray(items) ? items : []);
          if (importedCount > 0) setStatus(`${importedCount} Audio Studio file(s) added to Imports`);
        } catch {
          setStatus("Audio Studio files could not be added to Imports");
        }
      };

      if (projectPayload) {
        try {
          const payload = JSON.parse(projectPayload) as PixoresVideoStartProjectPayload;
          applyProjectJson(payload.project);
          if (payload.title) setProjectTitle(payload.title);
          setCurrentCloudProjectId("");
          setStatus(payload.filePath ? `Desktop project opened: ${payload.filePath}` : "Desktop project opened");
        } catch {
          setStatus("Desktop start project could not be loaded");
        }
        openRequestedTool();
        importRequestedAudio();
        markAutoSaveReady();
        return;
      }

      if (formatPayload) {
        try {
          const payload = JSON.parse(formatPayload) as PixoresVideoStartFormatPayload;
          const nextFormatIndex = formats.findIndex((format) => format.id === payload.format.id);
          setFormatIndex(nextFormatIndex >= 0 ? nextFormatIndex : formats.findIndex((format) => format.id === "custom"));
          setCustomWidth(payload.format.width);
          setCustomHeight(payload.format.height);
          setManualCanvasWidth(null);
          setProjectTitle(payload.title || "Untitled video");
          setStatus(`New desktop project: ${payload.format.label}`);
        } catch {
          setStatus("Desktop start format could not be applied");
        }
        openRequestedTool();
        importRequestedAudio();
        markAutoSaveReady();
        return;
      }

      if (shouldAutoSave) {
        const bridge = getPixoresDesktopBridge();
        const nativeAutoSave = bridge?.loadAutoSave ? await bridge.loadAutoSave().catch(() => ({ ok: true as const, contents: null })) : null;
        const autoSavedContents = nativeAutoSave?.contents ?? (() => {
          const value = localStorage.getItem(PROJECT_AUTOSAVE_KEY);
          if (!value) return null;
          try { return JSON.parse(value) as unknown; } catch { return null; }
        })();
        if (autoSavedContents) {
          try {
            const parsed = unpackProjectFile(autoSavedContents);
            if (!parsed) throw new Error("Invalid Auto Save");
            applyProjectJson(parsed.project);
            if (parsed.title) setProjectTitle(parsed.title);
            setCurrentCloudProjectId("");
            const savedAt = parsed.project.updatedAt ? new Date(parsed.project.updatedAt) : new Date();
            setLastAutoSaveAt(Number.isNaN(savedAt.getTime()) ? new Date() : savedAt);
            setStatus("Auto-saved project restored");
          } catch {
            clearAutoSaveRecovery();
            setStatus("The previous Auto Save could not be restored");
          }
        }
      }
      openRequestedTool();
      importRequestedAudio();
      markAutoSaveReady();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (isPlaying || isRecording) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    drawScene(context, currentTime);
  }, [currentTime, drawScene, isPlaying, isRecording, mediaLoadTick]);

  useEffect(() => {
    if (!serverRenderId || !isPreparingServerRender) return;

    let cancelled = false;
    let timeoutId = 0;

    const pollRenderStatus = async () => {
      try {
        const payload = await adapters.renderAdapter.getRenderStatus(serverRenderId);
        if (cancelled) return;

        const status = payload.status || "queued";
        const renderedFrames = Math.max(0, payload.renderedFrames ?? 0);
        const totalFrames = Math.max(0, payload.totalFrames ?? 0);
        const renderFps = Math.max(0, payload.renderFps ?? 0);
        const isFrameStage = status === "rendering" || status === "encoding";
        const frameProgress = totalFrames > 0 ? (renderedFrames / totalFrames) * 100 : 0;
        const reportedProgress = Math.max(0, Math.min(1, payload.progress || 0)) * 100;
        const stageProgressFloor = status === "queued"
          ? 1
          : status === "analyzing"
            ? 2
            : status === "bundling"
              ? 5
              : status === "preparing"
                ? 8
                : 0;
        const progress = status === "completed"
          ? 100
          : status === "muxing" || status === "finalizing"
            ? 99
            : isFrameStage
              ? Math.min(99, Math.max(reportedProgress, frameProgress))
              : status === "failed" || status === "cancelled"
                ? Math.min(99, Math.max(frameProgress, reportedProgress))
                : Math.min(98, Math.max(stageProgressFloor, reportedProgress));
        const now = performance.now();
        const elapsedSeconds = renderProgress.startedAt ? (now - renderProgress.startedAt) / 1000 : 0;
        const remainingFrames = Math.max(0, totalFrames - renderedFrames);
        const etaSeconds = isFrameStage && renderedFrames >= 30 && renderFps > 0 && remainingFrames > 0
          ? remainingFrames / renderFps
          : status === "completed"
            ? 0
            : null;
        setServerRenderProgress(Math.round(progress));
        setRenderProgress((current) => ({
          ...current,
          open: true,
          renderId: serverRenderId,
          status,
          progress,
          outputUrl: payload.outputUrl || current.outputUrl,
          outputPath: payload.outputPath || current.outputPath,
          error: payload.error || "",
          warnings: payload.warnings || current.warnings,
          elapsedSeconds,
          etaSeconds,
          renderedFrames,
          totalFrames,
          renderFps,
          speed: payload.speed ?? current.speed,
          codec: payload.encoder || current.codec,
          proxyPrepared: payload.proxyPrepared ?? current.proxyPrepared,
          proxyTotal: payload.proxyTotal ?? current.proxyTotal,
          hybridRender: payload.hybridRender ?? current.hybridRender,
          hybridPrecomposing: payload.hybridPrecomposing ?? current.hybridPrecomposing,
          hybridRenderedFrames: payload.hybridRenderedFrames ?? current.hybridRenderedFrames,
          hybridTotalFrames: payload.hybridTotalFrames ?? current.hybridTotalFrames,
          segmentedRender: payload.segmentedRender ?? current.segmentedRender,
          currentSegment: payload.currentSegment ?? current.currentSegment,
          segmentCount: payload.segmentCount ?? current.segmentCount,
          segmentType: payload.segmentType ?? current.segmentType,
          complexDuration: payload.complexDuration ?? current.complexDuration,
        }));

        if (payload.status === "completed") {
          const warningText = payload.warnings?.length
            ? ` Warning: ${payload.warnings[0]}${payload.warnings.length > 1 ? ` (+${payload.warnings.length - 1} more)` : ""}`
            : "";
          if (payload.outputUrl && !adapters.isDesktop && !automaticallySavedRenderIdsRef.current.has(serverRenderId)) {
            automaticallySavedRenderIdsRef.current.add(serverRenderId);
            await saveExportToDestination(payload.outputUrl, renderProgress.fileName || exportSettings.fileName);
          }
          setStatus(`${adapters.isDesktop ? "Desktop local" : "Render Server"} ${selectedServerExportFormat.label}: saved automatically.${warningText}`);
          setIsPreparingServerRender(false);
          return;
        }

        if (payload.status === "cancelled") {
          setStatus("Export cancelled");
          setIsPreparingServerRender(false);
          return;
        }

        if (payload.status === "failed") {
          setStatus(`${adapters.isDesktop ? "Desktop render" : "Render Server"} failed: ${payload.error || "Render failed"}`);
          setIsPreparingServerRender(false);
          return;
        }

        setStatus(`${adapters.isDesktop ? "Desktop local" : "Render Server"} ${selectedServerExportFormat.label}: ${payload.status || "queued"} ${progress}%`);
      } catch (error) {
        setStatus(`${adapters.isDesktop ? "Desktop render" : "Render Server"} error: ${error instanceof Error ? error.message : "Status request failed"}`);
        setIsPreparingServerRender(false);
        return;
      }

      if (!cancelled) timeoutId = window.setTimeout(pollRenderStatus, 1500);
    };

    void pollRenderStatus();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [adapters.isDesktop, adapters.renderAdapter, exportSettings.fileName, isPreparingServerRender, renderProgress.fileName, renderProgress.startedAt, saveExportToDestination, selectedServerExportFormat.label, serverRenderId]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resize = layoutResizeRef.current;
      if (resize) {
        if (resize.mode === "sidebar") {
          const nextWidth = clamp(resize.initialSidebarWidth + event.clientX - resize.startX, 340, 720);
          setSidePanelWidth(nextWidth);
        } else {
          const maximumTimelineHeight = Math.max(320, Math.round(window.innerHeight * 0.85));
          const nextHeight = clamp(resize.initialTimelineHeight - (event.clientY - resize.startY), 220, maximumTimelineHeight);
          setTimelineHeight(nextHeight);
        }
      }

      const transitionEdit = transitionResizeRef.current;
      if (transitionEdit) {
        const deltaSeconds = ((event.clientX - transitionEdit.startX) / transitionEdit.timelineWidth) * timelineViewportDurationRef.current;
        const initialHalfDuration = Math.max(0.1, (transitionEdit.initialEnd - transitionEdit.initialStart) / 2);
        const desiredHalfDuration = initialHalfDuration + (transitionEdit.edge === "start" ? -deltaSeconds : deltaSeconds);
        const maximumHalfDuration = Math.max(0.1, Math.min(5, transitionEdit.cutTime, timelineViewportDurationRef.current - transitionEdit.cutTime));
        const halfDuration = Number(clamp(desiredHalfDuration, 0.1, maximumHalfDuration).toFixed(3));
        const nextStart = Number((transitionEdit.cutTime - halfDuration).toFixed(3));
        const nextDuration = Number((halfDuration * 2).toFixed(3));
        transitionEdit.currentStart = nextStart;
        transitionEdit.currentDuration = nextDuration;
        transitionEdit.hasChanged = transitionEdit.hasChanged
          || Math.abs(nextStart - transitionEdit.initialStart) > 0.001
          || Math.abs(nextDuration - (transitionEdit.initialEnd - transitionEdit.initialStart)) > 0.001;
        setLayers((current) => current.map((item) => (
          item.id === transitionEdit.layerId
            ? { ...item, start: nextStart, duration: nextDuration }
            : item
        )));
        currentTimeRef.current = transitionEdit.cutTime;
        setCurrentTime(transitionEdit.cutTime);
        setStatus(`Transition duration ${nextDuration.toFixed(2)}s`);
      }

    };

    const handlePointerUp = () => {
      endClipEdit();
      const transitionEdit = transitionResizeRef.current;
      if (transitionEdit) {
        if (transitionEdit.hasChanged) {
          setHistory((current) => ({
            past: [...current.past, transitionEdit.initialLayers].slice(-60),
            future: [],
          }));
        }
        transitionResizeRef.current = null;
        currentTimeRef.current = transitionEdit.currentStart;
        setCurrentTime(transitionEdit.currentStart);
        setIsPlaying(true);
        setStatus(`Previewing ${transitionEdit.currentDuration.toFixed(2)}s transition`);
      }
      layoutResizeRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("blur", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    if (!projectAutoSaveReadyRef.current || !autoSaveEnabled || isPlaying || isRecording || getUnstableProjectAssetCount() > 0) return;
    let idleId = 0;
    const timeoutId = window.setTimeout(() => {
      idleId = window.requestIdleCallback(async () => {
        if (clipEditRef.current || trackDragRef.current || volumeDragRef.current || stageEditRef.current || layoutResizeRef.current) return;
        try {
          if (currentProjectFingerprint === lastAutoSaveFingerprintRef.current) return;
          const contents = createProjectPackageContents();
          const bridge = getPixoresDesktopBridge();
          if (bridge?.saveAutoSave) await bridge.saveAutoSave(contents);
          else localStorage.setItem(PROJECT_AUTOSAVE_KEY, JSON.stringify(contents));
          lastAutoSaveFingerprintRef.current = currentProjectFingerprint;
          setLastAutoSaveAt(new Date());
        } catch {
          // Auto Save is best effort. Manual Save still reports actionable errors.
        }
      }, { timeout: 2000 });
    }, PROJECT_AUTOSAVE_DELAY_MS);
    return () => {
      window.clearTimeout(timeoutId);
      if (idleId) window.cancelIdleCallback(idleId);
    };
  }, [autoSaveEnabled, background, currentProjectFingerprint, imports, isPlaying, isRecording, layers, projectDuration, projectTitle, selectedFormat.height, selectedFormat.width, trackSettings]);

  useEffect(() => {
    if (!isPlaying || isRecording) return;
    let animationFrame = 0;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const startedAt = performance.now();
    const startTime = currentTimeRef.current;
    let lastInterfaceUpdate = startedAt - 250;
    let lastPublishedTime = startTime;
    let lastCanvasDrawAt = startedAt - (1000 / 30);

    const tick = (now: number) => {
      const performanceClockTime = startTime + (now - startedAt) / 1000;
      const audioMaster = Array.from(playbackTargetsRef.current.values()).find((target) => (
        target.shouldPlay && target.volume > 0 && !target.element.paused && !target.element.seeking && target.element.readyState >= 2
      ));
      const audioMasterLayer = audioMaster ? layersRef.current.find((layer) => layer.id === audioMaster.layerId) : undefined;
      const audioClockTime = audioMaster && audioMasterLayer
        ? audioMasterLayer.start + (audioMaster.element.currentTime - getLayerSourceStart(audioMasterLayer))
        : Number.NaN;
      const clockTime = Number.isFinite(audioClockTime) && Math.abs(audioClockTime - performanceClockTime) < 1.5
        ? audioClockTime
        : performanceClockTime;
      const next = Math.min(previewRangeEnd, Math.max(startTime, clockTime));
      currentTimeRef.current = next;
      timelineInnerRef.current?.style.setProperty(
        "--pixores-playhead-left",
        `${(next / Math.max(1, timelineViewportDurationRef.current)) * 100}%`,
      );
      if (context && now - lastCanvasDrawAt >= 1000 / 30) {
        drawScene(context, next);
        lastCanvasDrawAt = now;
      }

      const crossedLayerBoundary = layersRef.current.some((layer) => {
        const layerEnd = getLayerEnd(layer);
        return (layer.start > lastPublishedTime && layer.start <= next)
          || (layerEnd > lastPublishedTime && layerEnd <= next);
      });
      if (now - lastInterfaceUpdate >= 250 || crossedLayerBoundary || next >= previewRangeEnd) {
        setCurrentTime(next);
        lastPublishedTime = next;
        lastInterfaceUpdate = now;
      }

      if (next >= previewRangeEnd) {
        setIsPlaying(false);
        return;
      }
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [drawScene, isPlaying, isRecording, previewRangeEnd]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCurrentTime((value) => {
        if (value <= projectDuration) return value;
        setIsPlaying(false);
        return projectDuration;
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [projectDuration]);

  useEffect(() => {
    const savedSnapping = localStorage.getItem("pixores-timeline-snapping-enabled");
    const savedShortcut = localStorage.getItem("pixores-timeline-snapping-shortcut");
    if (savedSnapping !== null) setSnappingEnabled(savedSnapping !== "false");
    if (savedShortcut && /^[a-z0-9]$/i.test(savedShortcut)) setSnappingShortcut(savedShortcut.toLowerCase());
  }, []);

  useEffect(() => {
    const savedHeight = Number(localStorage.getItem(TIMELINE_HEIGHT_STORAGE_KEY));
    const savedMode = localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY);
    const savedCanvasToolbarVisibility = localStorage.getItem(CANVAS_TOOLBAR_VISIBLE_STORAGE_KEY);
    if (Number.isFinite(savedHeight) && savedHeight > 0) {
      setTimelineHeight(clamp(savedHeight, 220, Math.max(320, Math.round(window.innerHeight * 0.65))));
    }
    if (savedMode === "edit" || savedMode === "timeline" || savedMode === "preview") setWorkspaceMode(savedMode);
    if (savedCanvasToolbarVisibility !== null) setIsCanvasToolbarVisible(savedCanvasToolbarVisibility !== "false");
    window.requestAnimationFrame(() => {
      workspacePreferencesLoadedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (!workspacePreferencesLoadedRef.current) return;
    localStorage.setItem(TIMELINE_HEIGHT_STORAGE_KEY, String(Math.round(timelineHeight)));
    localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, workspaceMode);
    localStorage.setItem(CANVAS_TOOLBAR_VISIBLE_STORAGE_KEY, String(isCanvasToolbarVisible));
  }, [isCanvasToolbarVisible, timelineHeight, workspaceMode]);

  useEffect(() => {
    setSelectedLayerIds((current) => {
      const availableIds = new Set(layers.map((layer) => layer.id));
      const next = current.filter((id) => availableIds.has(id));
      if (selectedLayerId && availableIds.has(selectedLayerId) && !next.includes(selectedLayerId)) return [selectedLayerId];
      if (!selectedLayerId && next.length) return [];
      return next.length === current.length && next.every((id, index) => id === current[index]) ? current : next;
    });
  }, [layers, selectedLayerId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable);

      const isCanvasArrow = event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown";
      if (!isTyping && isCanvasArrow && !event.ctrlKey && !event.metaKey && !event.altKey && selectedLayerId) {
        const selectedIds = new Set(selectedLayerIds.length ? selectedLayerIds : [selectedLayerId]);
        const canMove = layersRef.current.some((layer) => selectedIds.has(layer.id) && !layer.locked && layer.type !== "audio" && layer.type !== "transition");
        if (canMove) {
          event.preventDefault();
          const pixelStep = event.shiftKey ? 10 : 1;
          const deltaX = event.key === "ArrowLeft" ? -(pixelStep / selectedFormat.width) * 100 : event.key === "ArrowRight" ? (pixelStep / selectedFormat.width) * 100 : 0;
          const deltaY = event.key === "ArrowUp" ? -(pixelStep / selectedFormat.height) * 100 : event.key === "ArrowDown" ? (pixelStep / selectedFormat.height) * 100 : 0;
          commitLayers((current) => current.map((layer) => (
            selectedIds.has(layer.id) && !layer.locked && layer.type !== "audio" && layer.type !== "transition"
              ? {
                ...layer,
                x: Number(clamp(layer.x + deltaX, -STAGE_POSITION_LIMIT_PERCENT, STAGE_POSITION_LIMIT_PERCENT).toFixed(4)),
                y: Number(clamp(layer.y + deltaY, -STAGE_POSITION_LIMIT_PERCENT, STAGE_POSITION_LIMIT_PERCENT).toFixed(4)),
              }
              : layer
          )));
          setStatus(`Moved ${pixelStep}px with keyboard${event.shiftKey ? " (precision ×10)" : ""}`);
          return;
        }
      }

      if (event.key === "Escape" && pendingProjectAction) {
        event.preventDefault();
        cancelProjectLifecycleAction();
        return;
      }

      if (!isTyping && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === snappingShortcut) {
        event.preventDefault();
        setSnappingEnabled((value) => {
          const next = !value;
          localStorage.setItem("pixores-timeline-snapping-enabled", String(next));
          return next;
        });
        return;
      }

      if (!isTyping && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        deleteSelectedLayer();
        return;
      }

      if (!isTyping && event.key === "F2") {
        event.preventDefault();
        renameSelectedLayer();
        return;
      }

      if (event.key === "Escape" && trackDragRef.current) {
        trackDragRef.current = null;
        setDraggingTrackId("");
        setTrackDropIndex(null);
        document.body.style.userSelect = "";
        return;
      }

      if (event.key === "Escape" && rangeContextMenu) {
        setRangeContextMenu(null);
        return;
      }

      if (event.key === "Escape" && timelineContextMenu) {
        setTimelineContextMenu(null);
        return;
      }

      if (event.key === "Escape" && importContextMenu) {
        setImportContextMenu(null);
        return;
      }

      if (!isTyping && event.key === "Escape") {
        event.preventDefault();
        clearLayerSelection();
        return;
      }

      const modifierPressed = event.ctrlKey || event.metaKey;
      if (!modifierPressed) return;

      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        requestProjectLifecycleAction("new");
      } else if (key === "s") {
        event.preventDefault();
        void saveProjectFile();
      } else if (key === "o") {
        event.preventDefault();
        openProjectFile();
      } else if (key === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (key === "z") {
        event.preventDefault();
        undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      } else if (key === "c") {
        event.preventDefault();
        copyTimelineSelection();
      } else if (key === "x") {
        event.preventDefault();
        cutTimelineSelection();
      } else if (key === "v") {
        event.preventDefault();
        void pasteFromClipboard();
      } else if (key === "d") {
        event.preventDefault();
        duplicateSelectedLayer();
      } else if (key === "g" && event.shiftKey) {
        event.preventDefault();
        ungroupSelectedLayers();
      } else if (key === "g") {
        event.preventDefault();
        groupSelectedLayers();
      } else if (key === "b") {
        event.preventDefault();
        splitSelectedLayer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (!rangeContextMenu && !timelineContextMenu && !importContextMenu) return;
    const closeMenu = () => {
      setRangeContextMenu(null);
      setTimelineContextMenu(null);
      setImportContextMenu(null);
    };
    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, [rangeContextMenu, timelineContextMenu, importContextMenu]);

  useEffect(() => {
    const saved = localStorage.getItem(DOWNLOAD_AUTO_IMPORT_KEY);
    setAutoImportDownloads(saved !== "false");
  }, []);

  useEffect(() => {
    const bridge = getPixoresDesktopBridge();
    if (!autoImportDownloads || !bridge?.listRecentDownloadedImages) return;
    let cancelled = false;
    let busy = false;
    const scan = async () => {
      if (busy || cancelled) return;
      busy = true;
      try {
        const result = await bridge.listRecentDownloadedImages?.({ since: downloadScanSinceRef.current });
        if (!result || cancelled) return;
        downloadScanSinceRef.current = Math.max(downloadScanSinceRef.current, result.scannedAt - 800);
        for (const item of result.files) {
          const key = `${item.url}:${item.lastModified}:${item.size}`;
          if (importedDownloadKeysRef.current.has(key)) continue;
          importedDownloadKeysRef.current.add(key);
          const response = await fetch(item.url);
          if (!response.ok) continue;
          const blob = await response.blob();
          const file = new File([blob], item.name, { type: item.mimeType, lastModified: item.lastModified });
          await importMediaFile(file, { origin: "chatgpt", saveToChatGptLibrary: true });
        }
      } catch {
        // A locked or partially-downloaded image is retried on the next scan.
      } finally {
        busy = false;
      }
    };
    void scan();
    const timer = window.setInterval(() => void scan(), 3500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [autoImportDownloads]);

  function pushHistorySnapshot(snapshot = layersRef.current) {
    setHistory((current) => ({
      past: [...current.past, snapshot].slice(-60),
      future: [],
    }));
  }

  function commitLayers(updater: (current: VideoLayer[]) => VideoLayer[]) {
    setLayers((current) => {
      const next = updater(current);
      if (next === current) return current;
      setHistory((historyState) => ({
        past: [...historyState.past, current].slice(-60),
        future: [],
      }));
      return next;
    });
  }

  function undo() {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      const nextPast = current.past.slice(0, -1);
      setLayers(previous);
      setSelectedLayerId(previous[0]?.id || "");
      return {
        past: nextPast,
        future: [layersRef.current, ...current.future].slice(0, 60),
      };
    });
    setStatus("Undo");
  }

  function redo() {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      setLayers(next);
      setSelectedLayerId(next[0]?.id || "");
      return {
        past: [...current.past, layersRef.current].slice(-60),
        future: current.future.slice(1),
      };
    });
    setStatus("Redo");
  }

  function updateLayer(id: string, patch: Partial<VideoLayer>) {
    commitLayers((current) => current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)));
  }

  function applyEffectPresetToSelected(preset: Exclude<VideoEffectPreset, "none">) {
    if (!selectedLayer || selectedLayer.type !== "media" || selectedLayer.mediaKind === "audio") {
      setStatus("Select an image or video clip before applying an effect");
      return;
    }
    const nextEffect: LayerEffectConfig = {
      preset,
      intensity: 1,
      chromaKey: preset === "chromaKey"
        ? {
            color: selectedLayer.effect?.chromaKey?.color || "#00ff00",
            similarity: selectedLayer.effect?.chromaKey?.similarity ?? 0.28,
            smoothness: selectedLayer.effect?.chromaKey?.smoothness ?? 0.12,
            spill: selectedLayer.effect?.chromaKey?.spill ?? 0.55,
          }
        : undefined,
    };
    updateLayer(selectedLayer.id, { effect: nextEffect });
    setStatus(`${effectPresets.find((effect) => effect.id === preset)?.name || "Effect"} applied to ${selectedLayer.name}`);
  }

  function updateSelectedEffect(patch: Partial<LayerEffectConfig>) {
    if (!selectedLayer?.effect || selectedLayer.type !== "media") return;
    updateLayer(selectedLayer.id, { effect: { ...selectedLayer.effect, ...patch } });
  }

  function updateSelectedChromaKey(patch: Partial<NonNullable<LayerEffectConfig["chromaKey"]>>) {
    if (!selectedLayer?.effect || selectedLayer.type !== "media") return;
    updateLayer(selectedLayer.id, {
      effect: {
        ...selectedLayer.effect,
        chromaKey: {
          color: "#00ff00",
          similarity: 0.28,
          smoothness: 0.12,
          spill: 0.55,
          ...selectedLayer.effect.chromaKey,
          ...patch,
        },
      },
    });
  }

  function removeSelectedEffect() {
    if (!selectedLayer || selectedLayer.type !== "media") return;
    updateLayer(selectedLayer.id, { effect: undefined });
    setStatus(`Effect removed from ${selectedLayer.name}`);
  }

  function updateFrameMediaSlot(frameId: string, slotIndex: number, mediaLayerId: string) {
    commitLayers((current) => current.map((layer) => {
      if (layer.type !== "shape" || !isMediaContainerShape(layer.shapeType)) return layer;
      const nextIds = [...(layer.frameMediaLayerIds || [])];
      if (mediaLayerId) {
        nextIds.forEach((id, index) => {
          if (id === mediaLayerId) nextIds[index] = "";
        });
      }
      if (layer.id === frameId) nextIds[slotIndex] = mediaLayerId;
      return { ...layer, frameMediaLayerIds: nextIds };
    }));
    const frame = layersRef.current.find((layer) => layer.id === frameId);
    const media = layersRef.current.find((layer) => layer.id === mediaLayerId);
    setSelectedLayerId(frameId);
    setSelectedTrackId(frame?.trackId || frameId);
    setStatus(mediaLayerId ? `${media?.name || "Media"} embedded in ${frame?.name || "frame"}` : `Frame slot ${slotIndex + 1} cleared`);
  }

  function attachMediaToNextFrameSlot(frameId: string, mediaLayerId: string) {
    const frame = layersRef.current.find((layer) => layer.id === frameId);
    if (!frame || frame.type !== "shape" || !isMediaContainerShape(frame.shapeType)) return;
    const capacity = getFrameMediaSlots(frame.shapeType).length;
    const currentIds = [...(frame.frameMediaLayerIds || [])].slice(0, capacity);
    const emptyIndex = currentIds.findIndex((id) => !id);
    const targetIndex = emptyIndex >= 0 ? emptyIndex : Math.max(0, capacity - 1);
    updateFrameMediaSlot(frameId, targetIndex, mediaLayerId);
  }

  function updateLowerThirdContent(layer: VideoLayer, key: "primaryText" | "secondaryText" | "tertiaryText" | "logoSourceId", value: string | undefined) {
    if (!layer.lowerThird) return;
    updateLayer(layer.id, {
      lowerThird: {
        ...layer.lowerThird,
        content: {
          ...layer.lowerThird.content,
          [key]: value,
        },
      },
    });
  }

  function updateLowerThirdColor(layer: VideoLayer, key: LowerThirdColorKey, value: string) {
    if (!layer.lowerThird) return;
    updateLayer(layer.id, {
      lowerThird: setLowerThirdColor(layer.lowerThird, key, value),
    });
  }

  function updateLowerThirdTypography(layer: VideoLayer, patch: Partial<LowerThirdConfig["typography"]>) {
    if (!layer.lowerThird) return;
    const currentTypography = layer.lowerThird.typography || {
      primaryFontFamily: "Inter",
      secondaryFontFamily: "Inter",
      textSpacing: 0,
    };
    updateLayer(layer.id, {
      lowerThird: {
        ...layer.lowerThird,
        typography: { ...currentTypography, ...patch },
      },
    });
  }

  function updateLowerThirdLogo(layer: VideoLayer, patch: Partial<NonNullable<LowerThirdConfig["logo"]>>) {
    if (!layer.lowerThird) return;
    const currentLogo = layer.lowerThird.logo || {
      size: 100,
      offsetX: 0,
      offsetY: 0,
      objectFit: "contain" as const,
      borderRadius: 8,
      circular: false,
      shape: "rounded" as const,
    };
    updateLayer(layer.id, {
      lowerThird: {
        ...layer.lowerThird,
        logo: { ...currentLogo, ...patch },
      },
    });
  }

  function handleLowerThirdLogoFileChange(event: ChangeEvent<HTMLInputElement>, layer: VideoLayer) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/") || !layer.lowerThird) return;

    const id = `media-${Date.now()}`;
    const url = URL.createObjectURL(file);
    const metadata: PixoresMediaMetadata = {
      analyzer: "browser",
      analyzedAt: new Date().toISOString(),
      mimeType: file.type || undefined,
      size: file.size,
      hasVideo: false,
      hasAudio: false,
    };
    const image = new Image();
    image.src = url;
    image.onload = () => {
      const completedMetadata = { ...metadata, width: image.naturalWidth || undefined, height: image.naturalHeight || undefined };
      const asset = mediaAssetsRef.current.get(id);
      if (asset) asset.metadata = completedMetadata;
      setImports((current) => current.map((item) => (item.id === id ? { ...item, metadata: completedMetadata } : item)));
      setMediaLoadTick((value) => value + 1);
    };
    mediaAssetsRef.current.set(id, { kind: "image", image, url, metadata, sourceFile: file });
    setImports((current) => [{
      id,
      name: file.name,
      kind: "image",
      url,
      size: file.size,
      metadata,
      uploadStatus: "uploading",
    }, ...current]);
    updateLowerThirdContent(layer, "logoSourceId", id);
    setSelectedImportId(id);
    setStatus("Logo added to lower third");
    void queueImportedAssetUpload(id, file);
  }

  function editLowerThirdText(layer: VideoLayer) {
    if (layer.type !== "lower-third") return;
    setSelectedLayerId(layer.id);
    setSelectedTrackId(layer.trackId || layer.id);
    setActivePanel("settings");
    setIsSidebarOpen(true);
    setIsMobilePanelOpen(true);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      lowerThirdPrimaryInputRef.current?.focus();
      lowerThirdPrimaryInputRef.current?.select();
    }));
  }

  function editTextLayer(layer: VideoLayer) {
    if (layer.type !== "text") return;
    stageEditRef.current = null;
    setIsPlaying(false);
    setSelectedLayerId(layer.id);
    setSelectedTrackId(layer.trackId || layer.id);
    setActivePanel("settings");
    setIsSidebarOpen(true);
    setIsMobilePanelOpen(true);
    setIsMobileTimelineOpen(false);
    if (layer.locked) {
      setStatus("Unlock the text layer before editing it");
      return;
    }
    if (inlineEditingTextId !== layer.id) pushHistorySnapshot();
    setInlineEditingTextId(layer.id);
    setStatus("Editing text directly on canvas");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      inlineTextEditorRef.current?.focus();
      inlineTextEditorRef.current?.select();
    }));
  }

  function updateInlineTextLayer(layerId: string, text: string) {
    setLayers((current) => current.map((layer) => (
      layer.id === layerId ? { ...layer, text } : layer
    )));
  }

  function finishInlineTextEditing() {
    setInlineEditingTextId("");
    setStatus("Text updated on canvas");
  }

  function updateLayerAnimation(
    layer: VideoLayer,
    phase: AnimationPhase,
    patch: Omit<Partial<LayerAnimation>, "type" | "phase"> & { type?: LayerAnimationType | "" },
  ) {
    if (patch.type === "") {
      updateLayer(layer.id, {
        animations: (layer.animations || []).filter((animation) => (animation.phase || "in") !== phase),
      });
      return;
    }

    const currentAnimation = getLayerAnimationForPhase(layer, phase) || {
      id: `animation-${phase}-${Date.now()}`,
      type: "fadeIn" as LayerAnimationType,
      start: 0,
      duration: 0.6,
      phase,
      endOffset: 0,
    };
    const duration = clamp(Number(patch.duration ?? currentAnimation.duration), 0.05, Math.max(0.05, layer.duration));
    const endOffset = phase === "out"
      ? clamp(Number(patch.endOffset ?? currentAnimation.endOffset ?? 0), 0, Math.max(0, layer.duration - duration))
      : undefined;
    const start = phase === "in"
      ? clamp(Number(patch.start ?? currentAnimation.start), 0, Math.max(0, layer.duration - duration))
      : Math.max(0, layer.duration - duration - (endOffset || 0));
    const nextAnimation: LayerAnimation = {
      ...currentAnimation,
      ...patch,
      phase,
      type: (patch.type || currentAnimation.type) as LayerAnimationType,
      start,
      duration,
      endOffset,
    };
    updateLayer(layer.id, {
      animations: [
        ...(layer.animations || []).filter((animation) => (animation.phase || "in") !== phase),
        nextAnimation,
      ].sort((first, second) => ((first.phase || "in") === "in" ? -1 : 1) - ((second.phase || "in") === "in" ? -1 : 1)),
    });
  }

  function getLayerKeyframeValue(layer: VideoLayer, property: KeyframeProperty) {
    if (property === "x") return layer.x;
    if (property === "y") return layer.y;
    if (property === "width") return layer.width;
    if (property === "height") return layer.height;
    if (property === "opacity") return layer.opacity;
    if (property === "angle") return layer.angle || 0;
    return 1;
  }

  function addLayerKeyframe(layer: VideoLayer, property: KeyframeProperty = "x") {
    const keyframe: LayerKeyframe = {
      id: `keyframe-${Date.now()}`,
      time: clamp(Number((currentTime - layer.start).toFixed(2)), 0, Math.max(0, layer.duration)),
      property,
      value: getLayerKeyframeValue(layer, property),
      easing: "easeInOut",
    };

    updateLayer(layer.id, {
      keyframes: [...(layer.keyframes || []), keyframe].sort((a, b) => a.time - b.time),
    });
    setStatus("Keyframe added");
  }

  function deleteLayerKeyframe(layer: VideoLayer, keyframeId: string) {
    updateLayer(layer.id, {
      keyframes: (layer.keyframes || []).filter((keyframe) => keyframe.id !== keyframeId),
    });
    setStatus("Keyframe deleted");
  }

  function beginLayoutResize(event: ReactPointerEvent<HTMLElement>, mode: LayoutResizeState["mode"]) {
    event.preventDefault();
    if (mode === "timeline") setWorkspaceMode("edit");
    layoutResizeRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialSidebarWidth: sidePanelWidth,
      initialTimelineHeight: timelineHeight,
    };
    document.body.style.cursor = mode === "sidebar" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }

  function startLayerResize(event: ReactPointerEvent<HTMLElement>, layer: VideoLayer, edge: CanvasResizeEdge) {
    beginStageEdit(event, layer, "resize", edge);
  }

  function openSettingsPanel() {
    setActiveObjectStylePanel(null);
    setIsTextEffectsPanelOpen(false);
    setActivePanel("settings");
    setIsSidebarOpen(true);
    setIsMobilePanelOpen(true);
    setIsMobileTimelineOpen(false);
  }

  function openSelectedObjectEffects() {
    setActiveObjectStylePanel(null);
    setIsTextEffectsPanelOpen(false);
    openToolPanel("elements");
    setActiveElementTab("effects");
  }

  function toggleObjectStylePanel(panel: ObjectStylePanel) {
    setIsTextEffectsPanelOpen(false);
    setActiveObjectStylePanel((current) => (current === panel ? null : panel));
  }

  function applyShadowPreset(preset: ShadowPreset) {
    if (!selectedLayer || selectedLayer.locked) return;
    const presets: Record<ShadowPreset, Partial<VideoLayer>> = {
      none: { shadowPreset: "none", shadowBlur: 0, shadowOpacity: 0, shadowOffsetX: 0, shadowOffsetY: 0 },
      glow: { shadowPreset: "glow", shadowBlur: 25, shadowOpacity: 0.82, shadowOffsetX: 0, shadowOffsetY: 0 },
      drop: { shadowPreset: "drop", shadowBlur: 14, shadowOpacity: 0.58, shadowOffsetX: 8, shadowOffsetY: 10 },
      outline: { shadowPreset: "outline", shadowBlur: 12, shadowOpacity: 1, shadowOffsetX: 0, shadowOffsetY: 0 },
      curved: { shadowPreset: "curved", shadowBlur: 20, shadowOpacity: 0.52, shadowOffsetX: 0, shadowOffsetY: 13 },
      pageLift: { shadowPreset: "pageLift", shadowBlur: 18, shadowOpacity: 0.55, shadowOffsetX: 0, shadowOffsetY: 15 },
      angled: { shadowPreset: "angled", shadowBlur: 16, shadowOpacity: 0.62, shadowOffsetX: 13, shadowOffsetY: 10 },
      backdrop: { shadowPreset: "backdrop", shadowBlur: 10, shadowOpacity: 0.72, shadowOffsetX: 18, shadowOffsetY: 9 },
    };
    updateLayer(selectedLayer.id, presets[preset]);
  }

  function applyStrokePreset(preset: StrokePreset) {
    if (!selectedLayer || selectedLayer.locked) return;
    const currentColor = selectedLayer.strokeColor || "#ffffff";
    const presets: Record<StrokePreset, Partial<VideoLayer>> = {
      none: { strokePreset: "none", strokeWidth: 0, strokeOpacity: 0 },
      thin: { strokePreset: "thin", strokeWidth: 2, strokeOpacity: 1, strokeColor: currentColor },
      medium: { strokePreset: "medium", strokeWidth: 5, strokeOpacity: 1, strokeColor: currentColor },
      bold: { strokePreset: "bold", strokeWidth: 10, strokeOpacity: 1, strokeColor: currentColor },
      light: { strokePreset: "light", strokeWidth: 5, strokeOpacity: 1, strokeColor: "#ffffff" },
      dark: { strokePreset: "dark", strokeWidth: 5, strokeOpacity: 1, strokeColor: "#000000" },
    };
    updateLayer(selectedLayer.id, presets[preset]);
  }

  function toggleTextEffectsPanel() {
    setActiveObjectStylePanel(null);
    setIsTextEffectsPanelOpen((current) => !current);
  }

  function applyTextEffectPreset(preset: TextEffectPreset) {
    if (!selectedLayer || selectedLayer.type !== "text" || selectedLayer.locked) return;
    const clearedEffect: Partial<VideoLayer> = {
      hasTextBg: false,
      textCurve: 0,
      shadowPreset: "none",
      shadowBlur: 0,
      shadowOpacity: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      glowRadius: 0,
      strokeWidth: 0,
      strokeOpacity: 0,
    };
    const presets: Record<TextEffectPreset, Partial<VideoLayer>> = {
      none: {
        ...clearedEffect,
        textEffectPreset: "none",
      },
      drop: {
        ...clearedEffect,
        textEffectPreset: "drop",
        shadowPreset: "drop",
        shadowColor: "#000000",
        shadowBlur: 14,
        shadowOpacity: 0.68,
        shadowOffsetX: 5,
        shadowOffsetY: 7,
        glowRadius: 0,
        strokeWidth: 0,
      },
      glow: {
        ...clearedEffect,
        textEffectPreset: "glow",
        glowColor: "#8b5cf6",
        glowRadius: 22,
      },
      echo: {
        ...clearedEffect,
        textEffectPreset: "echo",
        glowColor: "#8b5cf6",
      },
      outline: {
        ...clearedEffect,
        textEffectPreset: "outline",
        strokeColor: "#8b5cf6",
        strokeWidth: 4,
        strokeOpacity: 1,
      },
      background: {
        ...clearedEffect,
        textEffectPreset: "background",
        hasTextBg: true,
        textBgColor: selectedLayer.textBgColor || "#8b5cf6",
        textBgPadding: selectedLayer.textBgPadding || 12,
        textBgRadius: selectedLayer.textBgRadius ?? 12,
        textAlign: "center",
      },
      splice: {
        ...clearedEffect,
        textEffectPreset: "splice",
        shadowPreset: "drop",
        shadowColor: "#8b5cf6",
        shadowBlur: 1,
        shadowOpacity: 1,
        shadowOffsetX: 7,
        shadowOffsetY: 7,
        strokeColor: "#8b5cf6",
        strokeWidth: 3,
        strokeOpacity: 1,
      },
      hollow: {
        ...clearedEffect,
        textEffectPreset: "hollow",
        strokeColor: "#8b5cf6",
        strokeWidth: 3,
        strokeOpacity: 1,
      },
      neon: {
        ...clearedEffect,
        textEffectPreset: "neon",
        glowColor: "#a855f7",
        glowRadius: 26,
        strokeColor: "#f5f3ff",
        strokeWidth: 2,
        strokeOpacity: 1,
      },
      glitch: {
        ...clearedEffect,
        textEffectPreset: "glitch",
      },
      curve: {
        ...clearedEffect,
        textEffectPreset: "curve",
        textCurve: selectedLayer.textCurve || -30,
        textAlign: "center",
      },
      shadow: {
        ...clearedEffect,
        textEffectPreset: "shadow",
        shadowPreset: "drop",
        shadowColor: "#000000",
        shadowBlur: 14,
        shadowOpacity: 0.68,
        shadowOffsetX: 5,
        shadowOffsetY: 7,
      },
      lift: {
        ...clearedEffect,
        textEffectPreset: "lift",
        shadowPreset: "drop",
        shadowColor: "#000000",
        shadowBlur: 8,
        shadowOpacity: 0.56,
        shadowOffsetX: 3,
        shadowOffsetY: 7,
      },
    };
    updateLayer(selectedLayer.id, presets[preset]);
    setStatus(preset === "none" ? "Text effect removed" : `${textEffectPresetOptions.find((item) => item.id === preset)?.label || "Text"} effect applied`);
  }

  function applyCaptionStylePreset(presetId: CaptionStylePresetId) {
    if (!selectedLayer || selectedLayer.type !== "text" || selectedLayer.locked) return;
    const preset = getCaptionStylePreset(presetId);
    if (!preset) return;
    ensureVideoMakerFontLoaded(preset.patch.fontFamily || "Arial");
    updateLayer(selectedLayer.id, resolveCaptionStylePresetPatch(presetId));
    setStatus(`${preset.label} caption style applied`);
  }

  function applySelectedTextFormatToTrack() {
    if (!selectedLayer || selectedLayer.type !== "text" || selectedLayer.locked) return;
    const trackId = getTrackId(selectedLayer);
    const format: Partial<VideoLayer> = {
      opacity: selectedLayer.opacity,
      x: selectedLayer.x,
      y: selectedLayer.y,
      width: selectedLayer.width,
      height: selectedLayer.height,
      color: selectedLayer.color,
      fontSize: selectedLayer.fontSize,
      fontFamily: selectedLayer.fontFamily,
      isBold: selectedLayer.isBold,
      isItalic: selectedLayer.isItalic,
      isUnderline: selectedLayer.isUnderline,
      isStrikethrough: selectedLayer.isStrikethrough,
      isUppercase: selectedLayer.isUppercase,
      textAlign: selectedLayer.textAlign,
      letterSpacing: selectedLayer.letterSpacing,
      lineHeight: selectedLayer.lineHeight,
      hasTextBg: selectedLayer.hasTextBg,
      textBgColor: selectedLayer.textBgColor,
      textBgPadding: selectedLayer.textBgPadding,
      textBgRadius: selectedLayer.textBgRadius,
      textEffectPreset: selectedLayer.textEffectPreset,
      textCurve: selectedLayer.textCurve,
      strokeColor: selectedLayer.strokeColor,
      strokeWidth: selectedLayer.strokeWidth,
      strokeOpacity: selectedLayer.strokeOpacity,
      shadowPreset: selectedLayer.shadowPreset,
      shadowColor: selectedLayer.shadowColor,
      shadowBlur: selectedLayer.shadowBlur,
      shadowOpacity: selectedLayer.shadowOpacity,
      shadowOffsetX: selectedLayer.shadowOffsetX,
      shadowOffsetY: selectedLayer.shadowOffsetY,
      glowColor: selectedLayer.glowColor,
      glowRadius: selectedLayer.glowRadius,
    };
    const updated = layersRef.current.filter((layer) => layer.type === "text" && getTrackId(layer) === trackId && !layer.locked).length;
    commitLayers((current) => current.map((layer) => {
      if (layer.type !== "text" || getTrackId(layer) !== trackId || layer.locked) return layer;
      return { ...layer, ...format };
    }));
    setStatus(`Text format applied to ${updated} subtitle${updated === 1 ? "" : "s"} on this track`);
  }

  function openToolPanel(panel: SidebarPanel) {
    setActiveObjectStylePanel(null);
    setIsTextEffectsPanelOpen(false);
    setActivePanel(panel);
    setIsSidebarOpen(true);
    setIsMobilePanelOpen(true);
    setIsMobileTimelineOpen(false);
  }

  function toggleToolPanel() {
    setIsSidebarOpen((value) => !value);
    setIsMobilePanelOpen((value) => !value);
    setIsMobileTimelineOpen(false);
  }

  function toggleTimelinePanel() {
    setIsTimelineVisible((value) => {
      const next = !value;
      setIsMobileTimelineOpen(next);
      return next;
    });
    setIsMobilePanelOpen(false);
  }

  function toggleTraditionalMenu(menu: TraditionalMenuName) {
    setActiveTraditionalMenu((current) => (current === menu ? null : menu));
  }

  function runTraditionalMenuAction(action: () => void) {
    setActiveTraditionalMenu(null);
    action();
  }

  function createCurrentProject(projectImports: ImportedAsset[] = imports, projectLayers: VideoLayer[] = layers) {
    const layersWithTrackSettings = applyTrackSettingsToLayers(projectLayers, trackSettings);
    return buildPixoresProject({
      canvas: {
        width: selectedFormat.width,
        height: selectedFormat.height,
      },
      duration: projectDuration,
      background,
      layers: layersWithTrackSettings,
      assets: projectImports.map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        url: item.url,
        persistentUrl: item.persistentUrl,
        uploadStatus: item.uploadStatus,
        duration: item.duration,
        metadata: item.metadata,
      })),
      format: selectedFormat,
    });
  }

  function markCurrentProjectClean(title = projectTitle) {
    setSavedProjectFingerprint(createProjectContentFingerprint(createCurrentProject(), title));
  }

  function clearAutoSaveRecovery() {
    localStorage.removeItem(PROJECT_AUTOSAVE_KEY);
    void getPixoresDesktopBridge()?.clearAutoSave?.().catch(() => undefined);
    lastAutoSaveFingerprintRef.current = "";
  }

  function resetToNewProject() {
    const blankProject = buildPixoresProject({
      canvas: { width: selectedFormat.width, height: selectedFormat.height },
      duration: 0,
      background: "#000000",
      layers: [],
      assets: [],
      format: selectedFormat,
    });
    setSavedProjectFingerprint("");
    applyProjectJson(blankProject);
    setProjectTitle("Untitled video");
    setCurrentCloudProjectId("");
    setSelectedImportId("");
    setMarkInTime(null);
    setMarkOutTime(null);
    setMarkTrackId("");
    setEmptyTracks([]);
    timelineClipboardRef.current = null;
    setTimelineClipboardCount(0);
    setLastAutoSaveAt(null);
    clearAutoSaveRecovery();
    setStatus("New project ready");
  }

  async function executeProjectLifecycleAction(action: ProjectLifecycleAction) {
    if (action === "new") {
      resetToNewProject();
      return;
    }
    if (action === "open") {
      openProjectFileImmediately();
      return;
    }
    if (action === "close-project") {
      clearAutoSaveRecovery();
      allowPageUnloadRef.current = true;
      getPixoresDesktopBridge()?.setProjectDirty?.(false);
      window.location.assign(adapters.isDesktop ? "/video-maker/start?desktop=1" : "/video-maker/start");
      return;
    }

    const bridge = getPixoresDesktopBridge();
    if (bridge?.respondToWindowClose) {
      await bridge.respondToWindowClose("close");
      return;
    }
    allowPageUnloadRef.current = true;
    window.location.assign("/video-maker/start");
  }

  function requestProjectLifecycleAction(action: ProjectLifecycleAction) {
    setActiveTraditionalMenu(null);
    if (isProjectDirty) {
      setPendingProjectAction(action);
      return;
    }
    void executeProjectLifecycleAction(action);
  }

  async function saveAndContinueProjectAction() {
    const action = pendingProjectAction;
    if (!action || isSavingBeforeProjectAction) return;
    setIsSavingBeforeProjectAction(true);
    const saved = await saveProjectFile();
    setIsSavingBeforeProjectAction(false);
    if (!saved) return;
    setPendingProjectAction(null);
    await executeProjectLifecycleAction(action);
  }

  function discardAndContinueProjectAction() {
    const action = pendingProjectAction;
    if (!action) return;
    clearAutoSaveRecovery();
    setSavedProjectFingerprint(currentProjectFingerprint);
    setPendingProjectAction(null);
    void executeProjectLifecycleAction(action);
  }

  function cancelProjectLifecycleAction() {
    const action = pendingProjectAction;
    setPendingProjectAction(null);
    setIsSavingBeforeProjectAction(false);
    if (action === "close-app") void getPixoresDesktopBridge()?.respondToWindowClose?.("cancel");
  }

  async function prepareProjectMediaForRender() {
    const pendingUploads = Array.from(pendingAssetUploadsRef.current.values());
    if (pendingUploads.length > 0) {
      setStatus(`Preparing ${pendingUploads.length} media file${pendingUploads.length === 1 ? "" : "s"} for render...`);
      await Promise.allSettled(pendingUploads);
    }

    const activeAssetIds = new Set(
      layersRef.current
        .filter((layer) => layer.type === "media" || layer.type === "audio")
        .map((layer) => layer.assetKey || layer.id),
    );
    const unstableAssets = importsRef.current.filter((item) => (
      activeAssetIds.has(item.id)
      && item.url.startsWith("blob:")
      && !item.persistentUrl
    ));

    for (const item of unstableAssets) {
      setStatus(`Securing ${item.name} for local render...`);
      try {
        const originalFile = mediaAssetsRef.current.get(item.id)?.sourceFile;
        let file = originalFile;
        if (!file) {
          const response = await fetch(item.url);
          if (!response.ok) throw new Error(`Media could not be read (${response.status})`);
          const blob = await response.blob();
          const fallbackMime = item.kind === "video" ? "video/mp4" : item.kind === "audio" ? "audio/mpeg" : "image/png";
          file = new File([blob], item.name, {
            type: blob.type || fallbackMime,
            lastModified: Date.now(),
          });
        }
        const repaired = await uploadImportedAsset(item.id, file);
        if (!repaired) throw new Error("Desktop media persistence failed");
      } catch (error) {
        throw new Error(`${item.name} could not be prepared for render: ${error instanceof Error ? error.message : "Unknown media error"}`);
      }
    }

    const unresolvedAssets = importsRef.current.filter((item) => (
      activeAssetIds.has(item.id)
      && item.url.startsWith("blob:")
      && !item.persistentUrl
    ));
    if (unresolvedAssets.length > 0) {
      throw new Error(`${unresolvedAssets.length} media file${unresolvedAssets.length === 1 ? " is" : "s are"} still temporary. Re-import the affected file${unresolvedAssets.length === 1 ? "" : "s"} and try again.`);
    }

    const standardizedLayers = standardizeTimelineLayers(layersRef.current, exportSettings.fps || 30);
    return createCurrentProject(importsRef.current, standardizedLayers);
  }

  function validateProjectForServer(project: PixoresVideoProject) {
    if (!Number.isFinite(project.duration) || project.duration <= 0) return "Project duration is required";
    if (!Number.isFinite(project.canvas.width) || project.canvas.width <= 0) return "Canvas width must be valid";
    if (!Number.isFinite(project.canvas.height) || project.canvas.height <= 0) return "Canvas height must be valid";
    if (!Array.isArray(project.layers)) return "Project layers must be an array";
    if (!Array.isArray(project.assets)) return "Project assets must be an array";
    return "";
  }

  function pausePreviewForOfflineExport() {
    setIsPlaying(false);
    setIsMediaPreviewPlaying(false);
    mediaPreviewRef.current?.pause();
    const pauseAndMute = (element: HTMLMediaElement) => {
      element.pause();
      element.muted = true;
    };
    mediaAssetsRef.current.forEach((asset) => {
      if (asset.video) pauseAndMute(asset.video);
      if (asset.audio) pauseAndMute(asset.audio);
    });
    layerVideoElementsRef.current.forEach(pauseAndMute);
    layerAudioElementsRef.current.forEach(pauseAndMute);
  }

  async function prepareServerRenderMp4(settings: PixoresExportSettings = exportSettings) {
    // Detach the completed job before doing any asynchronous preparation. If
    // the previous poll resolves late, its cleanup guard prevents it from
    // marking this new export as already completed.
    setIsPreparingServerRender(false);
    setServerRenderId("");
    setServerRenderProgress(0);
    let project: PixoresVideoProject;
    try {
      project = await prepareProjectMediaForRender();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Media could not be prepared for render";
      setStatus(`Desktop render error: ${message}`);
      setRenderProgress((current) => ({
        ...current,
        open: true,
        status: "failed",
        progress: 0,
        error: message,
      }));
      setIsPreparingServerRender(false);
      return;
    }
    const validationError = validateProjectForServer(project);
    if (validationError) {
      setStatus(`Render Server error: ${validationError}`);
      setIsPreparingServerRender(false);
      return;
    }

    pausePreviewForOfflineExport();
    const outputFormatId = getExportFormatId(settings);
    const outputFormat = getPixoresVideoExportFormat(outputFormatId);
    const requestedRangeStart = Number(settings.rangeStart);
    const requestedRangeEnd = Number(settings.rangeEnd);
    const renderRangeStart = Number.isFinite(requestedRangeStart) ? clamp(requestedRangeStart, 0, project.duration) : 0;
    const renderRangeEnd = Number.isFinite(requestedRangeEnd) ? clamp(requestedRangeEnd, renderRangeStart, project.duration) : project.duration;
    const renderDuration = Math.max(0.05, renderRangeEnd - renderRangeStart);
    setStatus(`${adapters.isDesktop ? "Desktop local" : "Render Server"} ${outputFormat.label}: queueing job...`);
    setRenderProgress({
      open: true,
      renderId: "",
      status: "queued",
      progress: 0,
      fileName: settings.fileName,
      outputUrl: "",
      outputPath: settings.outputDirectory || "",
      error: "",
      warnings: [],
      startedAt: performance.now(),
      elapsedSeconds: 0,
      etaSeconds: null,
      renderedFrames: 0,
      totalFrames: Math.max(1, Math.ceil(renderDuration * settings.fps)),
      renderFps: 0,
      speed: 0,
      codec: settings.codec.toUpperCase(),
      resolution: `${settings.width} x ${settings.height}`,
      method: settings.renderMethod === "local" ? "Local render" : "Server render",
      proxyPrepared: 0,
      proxyTotal: 0,
      hybridRender: false,
      hybridPrecomposing: false,
      hybridRenderedFrames: 0,
      hybridTotalFrames: 0,
      segmentedRender: false,
      currentSegment: 0,
      segmentCount: 0,
      segmentType: "",
      complexDuration: 0,
    });

    setIsPreparingServerRender(true);
    try {
      const payload = await adapters.renderAdapter.startRender(project, { outputFormatId, exportSettings: settings });
      if (!payload.renderId) throw new Error("Render adapter did not return a renderId");

      setServerRenderId(payload.renderId);
      setServerRenderProgress(Math.round(Math.max(0, Math.min(1, payload.progress || 0)) * 100));
      setRenderProgress((current) => ({
        ...current,
        renderId: payload.renderId,
        status: payload.status || "queued",
        progress: Math.round(Math.max(0, Math.min(1, payload.progress || 0)) * 100),
        warnings: payload.warnings || [],
      }));
      setStatus(`${adapters.isDesktop ? "Desktop local" : "Render Server"} ${outputFormat.label}: ${payload.status || "queued"} (${payload.renderId})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      setStatus(`${adapters.isDesktop ? "Desktop render" : "Render Server"} error: ${message}${adapters.isDesktop ? "" : ". Use Browser export as the real-time fallback."}`);
      setRenderProgress((current) => ({
        ...current,
        open: true,
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Request failed",
      }));
      setIsPreparingServerRender(false);
    }
  }

  function createProjectPackageContents(): PixoresVideoPackageContents {
    return {
      manifest: createPixoresVideoPackageManifest(projectTitle),
      project: createCurrentProject(),
    };
  }

  function getUnstableProjectAssetCount() {
    return imports.filter((item) => item.url.startsWith("blob:") && !item.persistentUrl).length;
  }

  function canSaveProjectMedia() {
    const unstableAssetCount = getUnstableProjectAssetCount();
    if (unstableAssetCount <= 0) return true;
    const stillUploading = imports.some((item) => item.uploadStatus === "uploading");
    const message = stillUploading
      ? "Please wait for imported media to finish preparing before saving"
      : `${unstableAssetCount} media file${unstableAssetCount === 1 ? " needs" : "s need"} to be re-imported before saving`;
    setStatus(message);
    setProjectFileNotice({ tone: "error", message });
    return false;
  }

  function downloadProjectFile(contents: PixoresVideoPackageContents) {
    const blob = new Blob([JSON.stringify(contents, null, 2)], { type: "application/x-pixores-video" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeProjectFileName(projectTitle)}${PIXORES_VIDEO_PACKAGE_EXTENSION}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function saveProjectFile() {
    if (isProjectFileSaving) return false;
    if (!canSaveProjectMedia()) return false;
    setIsProjectFileSaving(true);
    setProjectFileNotice({ tone: "working", message: adapters.isDesktop ? "Opening the project save window…" : "Preparing the project download…" });
    try {
      if (adapters.isDesktop) return await saveDesktopProjectPackage();

      const contents = createProjectPackageContents();
      try {
        localStorage.setItem(PROJECT_MANUAL_SAVE_KEY, JSON.stringify(contents));
      } catch {
        // The downloadable project remains available if browser storage is full.
      }
      downloadProjectFile(contents);
      markCurrentProjectClean();
      setStatus("Project saved");
      setProjectFileNotice({ tone: "success", message: "Project exported to your Downloads folder." });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Project export failed";
      setStatus(`Project export error: ${message}`);
      setProjectFileNotice({ tone: "error", message: `Project export failed: ${message}` });
      return false;
    } finally {
      setIsProjectFileSaving(false);
    }
  }

  function openProjectFile() {
    requestProjectLifecycleAction("open");
  }

  function openProjectFileImmediately() {
    if (adapters.isDesktop) {
      void openDesktopProjectPackage();
      return;
    }
    projectFileInputRef.current?.click();
  }

  function toggleAutoSave() {
    setAutoSaveEnabled((current) => {
      const next = !current;
      localStorage.setItem(PROJECT_AUTOSAVE_ENABLED_KEY, String(next));
      if (!next) clearAutoSaveRecovery();
      setStatus(next ? "Auto Save enabled" : "Auto Save disabled");
      return next;
    });
  }

  async function saveDesktopProjectPackage() {
    if (!canSaveProjectMedia()) return false;
    setStatus("Saving desktop project...");

    try {
      const result = await adapters.projectPackageAdapter.saveProjectPackage({
        title: projectTitle,
        project: createCurrentProject(),
      });

      if (result.canceled) {
        setStatus("Desktop project save canceled");
        setProjectFileNotice({ tone: "error", message: "Project export was canceled." });
        return false;
      }

      setProjectTitle(result.metadata.title);
      markCurrentProjectClean(result.metadata.title);
      setCurrentCloudProjectId("");
      setStatus(`Desktop project saved: ${result.filePath}`);
      setProjectFileNotice({ tone: "success", message: `Project saved: ${result.filePath}` });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed";
      setStatus(`Desktop save error: ${message}`);
      setProjectFileNotice({ tone: "error", message: `Project export failed: ${message}` });
      return false;
    }
  }

  async function openDesktopProjectPackage() {
    setStatus("Opening desktop project...");

    try {
      const result = await adapters.projectPackageAdapter.openProjectPackage();

      if (result.canceled) {
        setStatus("Desktop project open canceled");
        return;
      }

      setSavedProjectFingerprint("");
      applyProjectJson(result.project);
      setProjectTitle(result.metadata.title);
      setCurrentCloudProjectId("");
      setStatus(`Desktop project opened: ${result.filePath}`);
    } catch (error) {
      setStatus(`Desktop open error: ${error instanceof Error ? error.message : "Open failed"}`);
    }
  }

  async function getCloudProjectHeaders(includeJson = false) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error("Sign in to sync Pixores projects.");
    return {
      ...(includeJson ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${accessToken}`,
    };
  }

  async function loadCloudProjects() {
    setIsCloudLoading(true);
    setStatus("Loading cloud projects...");

    try {
      const response = await fetch("/api/video-maker/projects", { headers: await getCloudProjectHeaders() });
      const payload = await response.json().catch(() => null) as { projects?: CloudVideoProject[]; error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || `Cloud load failed with ${response.status}`);
      }

      setCloudProjects(Array.isArray(payload?.projects) ? payload.projects : []);
      setStatus("Cloud projects loaded");
    } catch (error) {
      setStatus(`Cloud load error: ${error instanceof Error ? error.message : "Request failed"}`);
    } finally {
      setIsCloudLoading(false);
    }
  }

  async function saveProjectToCloud() {
    const title = projectTitle.trim() || "Untitled video";
    const project = createCurrentProject();
    setIsCloudSaving(true);
    setStatus(currentCloudProjectId ? "Updating cloud project..." : "Saving cloud project...");

    try {
      const response = await fetch(currentCloudProjectId ? `/api/video-maker/projects/${encodeURIComponent(currentCloudProjectId)}` : "/api/video-maker/projects", {
        method: currentCloudProjectId ? "PUT" : "POST",
        headers: await getCloudProjectHeaders(true),
        body: JSON.stringify({
          title,
          project,
          thumbnail_url: null,
        }),
      });
      const payload = await response.json().catch(() => null) as { project?: CloudVideoProject; error?: string } | null;

      if (!response.ok || !payload?.project) {
        throw new Error(payload?.error || `Cloud save failed with ${response.status}`);
      }

      setProjectTitle(payload.project.title);
      markCurrentProjectClean(payload.project.title);
      setCurrentCloudProjectId(payload.project.id);
      setCloudProjects((current) => {
        const withoutSaved = current.filter((item) => item.id !== payload.project?.id);
        return [payload.project as CloudVideoProject, ...withoutSaved];
      });
      setStatus("Project saved to cloud");
    } catch (error) {
      setStatus(`Cloud save error: ${error instanceof Error ? error.message : "Request failed"}`);
    } finally {
      setIsCloudSaving(false);
    }
  }

  async function loadProjectFromCloud(projectId: string) {
    setIsCloudLoading(true);
    setStatus("Opening cloud project...");

    try {
      const response = await fetch(`/api/video-maker/projects/${encodeURIComponent(projectId)}`, { headers: await getCloudProjectHeaders() });
      const payload = await response.json().catch(() => null) as { project?: CloudVideoProject; error?: string } | null;

      if (!response.ok || !payload?.project) {
        throw new Error(payload?.error || `Cloud project failed with ${response.status}`);
      }

      setSavedProjectFingerprint("");
      applyProjectJson(payload.project.project);
      setProjectTitle(payload.project.title);
      setCurrentCloudProjectId(payload.project.id);
      setStatus("Cloud project loaded");
    } catch (error) {
      setStatus(`Cloud project error: ${error instanceof Error ? error.message : "Request failed"}`);
    } finally {
      setIsCloudLoading(false);
    }
  }

  async function deleteCloudProject(projectId: string) {
    setIsCloudLoading(true);
    setStatus("Deleting cloud project...");

    try {
      const response = await fetch(`/api/video-maker/projects/${encodeURIComponent(projectId)}`, {
        method: "DELETE",
        headers: await getCloudProjectHeaders(),
      });
      const payload = await response.json().catch(() => null) as { deleted?: boolean; error?: string } | null;

      if (!response.ok || !payload?.deleted) {
        throw new Error(payload?.error || `Cloud delete failed with ${response.status}`);
      }

      setCloudProjects((current) => current.filter((project) => project.id !== projectId));
      if (currentCloudProjectId === projectId) setCurrentCloudProjectId("");
      setStatus("Cloud project deleted");
    } catch (error) {
      setStatus(`Cloud delete error: ${error instanceof Error ? error.message : "Request failed"}`);
    } finally {
      setIsCloudLoading(false);
    }
  }

  function rebuildAssetCache(projectAssets: PixoresVideoAsset[]) {
    const incomingUrls = new Set(projectAssets.map((asset) => asset.persistentUrl || asset.url));
    const releaseMediaElement = (element?: HTMLMediaElement) => {
      if (!element) return;
      element.pause();
      element.removeAttribute("src");
      element.load();
    };
    mediaAssetsRef.current.forEach((asset) => {
      if (asset.url.startsWith("blob:") && !incomingUrls.has(asset.url)) URL.revokeObjectURL(asset.url);
      releaseMediaElement(asset.video);
      releaseMediaElement(asset.audio);
    });
    mediaAssetsRef.current.clear();
    layerVideoElementsRef.current.forEach(releaseMediaElement);
    layerAudioElementsRef.current.forEach(releaseMediaElement);
    layerVideoElementsRef.current.clear();
    layerAudioElementsRef.current.clear();
    videoSeekTargetsRef.current.clear();
    videoFrameCacheRef.current.clear();

    projectAssets.forEach((asset) => {
      const resolvedUrl = asset.persistentUrl || asset.url;
      if (asset.kind === "video") {
        const video = document.createElement("video");
        video.src = resolvedUrl;
        video.muted = true;
        video.playsInline = true;
        video.loop = false;
        video.preload = "metadata";
        video.crossOrigin = "anonymous";
        video.onseeked = () => setMediaLoadTick((value) => value + 1);
        video.onloadeddata = () => setMediaLoadTick((value) => value + 1);
        video.oncanplay = () => setMediaLoadTick((value) => value + 1);
        mediaAssetsRef.current.set(asset.id, { kind: "video", url: resolvedUrl, persistentUrl: resolvedUrl, duration: asset.duration, metadata: asset.metadata, video });
        return;
      }

      if (asset.kind === "audio") {
        const audio = document.createElement("audio");
        audio.src = resolvedUrl;
        audio.crossOrigin = "anonymous";
        mediaAssetsRef.current.set(asset.id, { kind: "audio", url: resolvedUrl, persistentUrl: resolvedUrl, duration: asset.duration, metadata: asset.metadata, audio });
        return;
      }

      const image = new Image();
      loadCanvasPreviewImage(image, resolvedUrl, () => setMediaLoadTick((value) => value + 1));
      mediaAssetsRef.current.set(asset.id, { kind: "image", url: resolvedUrl, persistentUrl: resolvedUrl, duration: asset.duration, metadata: asset.metadata, image });
    });
  }

  function applyProjectJson(project: PixoresVideoProject) {
    if (project.schemaVersion !== 1) {
      setStatus("This project version is not supported");
      return;
    }

    setIsPlaying(false);
    setIsMediaPreviewPlaying(false);
    currentTimeRef.current = 0;
    setCurrentTime(0);
    layerVideoElementsRef.current.forEach((element) => element.pause());
    layerAudioElementsRef.current.forEach((element) => element.pause());
    const unavailableLegacyAssetCount = project.assets.filter((asset) => {
      const resolvedUrl = asset.persistentUrl || asset.url;
      if (!resolvedUrl.startsWith("blob:")) return false;
      return mediaAssetsRef.current.get(asset.id)?.url !== resolvedUrl;
    }).length;

    const restoredAssets = project.assets.map((asset) => {
      const resolvedUrl = createDesktopMediaUrl(asset.persistentUrl || asset.url);
      return { ...asset, url: resolvedUrl, persistentUrl: resolvedUrl };
    });
    const nextFormatIndex = formats.findIndex((format) => format.id === project.format.id);
    if (nextFormatIndex >= 0) setFormatIndex(nextFormatIndex);
    else setFormatIndex(formats.findIndex((format) => format.id === "custom"));
    setCustomWidth(project.canvas.width);
    setCustomHeight(project.canvas.height);
    setBackground(project.background);
    const projectAssetUrls = new Map(restoredAssets.map((asset) => [asset.id, asset.persistentUrl || asset.url]));
    const restoredProjectLayers = (project.layers as VideoLayer[]).map((layer) => {
      const restoredLayer = normalizeTimelineClip({
        ...layer,
        src: layer.assetKey ? projectAssetUrls.get(layer.assetKey) || layer.src : layer.src,
      });
      if (restoredLayer.type !== "shape" || !isMediaContainerShape(restoredLayer.shapeType)) return restoredLayer;
      return { ...restoredLayer, ...containFrameBounds(restoredLayer) };
    });
    const restoredLayerIds = new Set(restoredProjectLayers.map((layer) => layer.id));
    const recoveredTransitionLayers: VideoLayer[] = (project.transitions || []).flatMap((transition) => {
      if (restoredLayerIds.has(transition.id)) return [];
      const linkedLayer = restoredProjectLayers.find((layer) => layer.id === transition.fromLayerId)
        || restoredProjectLayers.find((layer) => layer.id === transition.toLayerId);
      const preset = basicTransitionPresets.find((item) => item.transitionKind === transition.type);
      return [{
        id: transition.id,
        trackId: linkedLayer?.trackId || `transition-track-${transition.id}`,
        type: "transition",
        name: preset?.name || "Transition",
        start: transition.start,
        duration: transition.duration,
        visible: true,
        locked: false,
        opacity: 1,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        color: transition.color || preset?.color || "#000000",
        transitionKind: transition.type,
        fromLayerId: transition.fromLayerId,
        toLayerId: transition.toLayerId,
        cutTime: transition.cutTime ?? transition.start + transition.duration / 2,
        easing: transition.easing || "easeInOut",
      }];
    });
    const loadedLayers = [...restoredProjectLayers, ...recoveredTransitionLayers];
    setTimelineDuration(Math.max(TIMELINE_EMPTY_TAIL_SECONDS, calculateProjectDuration(loadedLayers) + TIMELINE_EMPTY_TAIL_SECONDS));
    setLayers(loadedLayers);
    setHistory({ past: [], future: [] });
    const trackIds = Array.from(new Set(loadedLayers.filter((layer) => layer.type !== "transition").map((layer) => getTrackId(layer))));
    setTrackSettings(trackIds.map((trackId, index) => {
      const layer = loadedLayers.find((item) => getTrackId(item) === trackId);
      return {
        id: trackId,
        order: layer?.trackOrder ?? index,
        name: layer?.trackName || layer?.name,
        muted: !!layer?.trackMuted,
      };
    }).sort((first, second) => first.order - second.order).map((track, index) => ({ ...track, order: index })));
    setSelectedLayerId(project.layers[0]?.id || "");
    setSelectedTrackId(project.layers[0]?.trackId || project.layers[0]?.id || "");
    setEmptyTracks([]);
    setImports(restoredAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      kind: asset.kind === "video" ? "video" : asset.kind === "audio" ? "audio" : "image",
      url: asset.persistentUrl || asset.url,
      persistentUrl: asset.persistentUrl || asset.url,
      uploadStatus: asset.uploadStatus || "ready",
      duration: asset.duration,
      size: asset.metadata?.size,
      metadata: asset.metadata,
    })));
    rebuildAssetCache(restoredAssets);
    if (adapters.assetAdapter.prepareAsset) {
      restoredAssets.forEach((asset) => {
        if (asset.kind !== "video" && asset.kind !== "audio") return;
        void adapters.assetAdapter.prepareAsset?.({
          sourceUrl: asset.persistentUrl || asset.url,
          kind: asset.kind,
          metadata: asset.metadata,
        }).then(async (prepared) => {
          const preparedVideo = asset.kind === "video" && prepared.previewUrl
            ? await loadPreparedVideoElement(prepared.previewUrl)
            : null;
          const previewUrl = preparedVideo ? prepared.previewUrl : undefined;
          const cachedAsset = mediaAssetsRef.current.get(asset.id);
          if (cachedAsset && previewUrl) {
            const mediaElement = cachedAsset.kind === "video" ? cachedAsset.video : cachedAsset.kind === "audio" ? cachedAsset.audio : undefined;
            mediaElement?.pause();
            if (preparedVideo) {
              preparedVideo.onseeked = () => setMediaLoadTick((value) => value + 1);
              preparedVideo.oncanplay = () => setMediaLoadTick((value) => value + 1);
            }
            mediaAssetsRef.current.set(asset.id, { ...cachedAsset, url: previewUrl, video: preparedVideo || cachedAsset.video });
          }
          if (prepared.waveformPeaks?.length) {
            waveformPeaksRef.current = { ...waveformPeaksRef.current, [asset.id]: prepared.waveformPeaks };
            setWaveformPeaks(waveformPeaksRef.current);
          }
          setImports((current) => current.map((item) => item.id === asset.id ? {
            ...item,
            url: previewUrl || item.url,
            waveformPeaks: prepared.waveformPeaks || item.waveformPeaks,
          } : item));
          setMediaLoadTick((value) => value + 1);
        }).catch(() => undefined);
      });
    }
    setStatus(unavailableLegacyAssetCount > 0
      ? `Project opened · ${unavailableLegacyAssetCount} legacy media file${unavailableLegacyAssetCount === 1 ? " needs" : "s need"} to be re-imported`
      : "Project opened");
  }

  async function handleProjectFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = unpackProjectFile(JSON.parse(await file.text()) as unknown);
      if (!parsed) throw new Error("Invalid project file");
      setSavedProjectFingerprint("");
      applyProjectJson(parsed.project);
      const fileTitle = file.name.replace(new RegExp(`${PIXORES_VIDEO_PACKAGE_EXTENSION.replace(".", "\\.")}$`, "i"), "").replace(/\.json$/i, "");
      setProjectTitle(parsed.title?.trim() || fileTitle || "Untitled video");
      setCurrentCloudProjectId("");
    } catch {
      setStatus("This project file could not be opened");
    }
  }

  async function toggleCanvasFullscreen() {
    const previewPanel = previewPanelRef.current;
    if (!previewPanel) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await previewPanel.requestFullscreen();
      }
    } catch {
      setStatus("Fullscreen is not available");
    }
  }

  function toggleCanvasToolbar() {
    setIsCanvasToolbarVisible((visible) => {
      const next = !visible;
      if (!next) {
        setActiveObjectStylePanel(null);
        setIsTextEffectsPanelOpen(false);
      }
      return next;
    });
  }

  function selectLayer(layerId: string, trackId?: string) {
    setSelectedLayerId(layerId);
    setSelectedLayerIds(layerId ? [layerId] : []);
    if (trackId) setSelectedTrackId(trackId);
  }

  function selectTimelineLayer(layer: VideoLayer, additive = false) {
    const layerIdsToToggle = layer.groupId
      ? layersRef.current.filter((item) => item.groupId === layer.groupId).map((item) => item.id)
      : [layer.id];

    if (!additive) {
      setSelectedLayerIds(layerIdsToToggle);
      setSelectedLayerId(layer.id);
    } else {
      setSelectedLayerIds((current) => {
        const currentSet = new Set(current);
        const shouldRemove = layerIdsToToggle.every((id) => currentSet.has(id));
        layerIdsToToggle.forEach((id) => {
          if (shouldRemove) currentSet.delete(id);
          else currentSet.add(id);
        });
        const next = Array.from(currentSet);
        setSelectedLayerId((primary) => {
          if (!shouldRemove) return layer.id;
          return next.includes(primary) ? primary : next.at(-1) || "";
        });
        return next;
      });
    }
    setSelectedTrackId(layer.trackId || layer.id);
  }

  function clearLayerSelection() {
    stageEditRef.current = null;
    setSelectedLayerId("");
    setSelectedLayerIds([]);
    setSelectedTrackId("");
    setInlineEditingTextId("");
    setActiveObjectStylePanel(null);
    setIsTextEffectsPanelOpen(false);
  }

  function addEmptyTrack() {
    const id = `empty-track-${Date.now()}`;
    const name = `Track ${trackSettings.length + 1}`;
    setLayers((current) => {
      const next = current.map((layer, fallbackIndex) => ({
        ...layer,
        trackOrder: getTrackOrder(getTrackId(layer), trackSettings, layer.trackOrder ?? fallbackIndex) + 1,
      }));
      layersRef.current = next;
      return next;
    });
    setEmptyTracks((current) => [
      { id, order: 0, name, visible: true },
      ...current.map((track, index) => ({ ...track, order: (track.order ?? index) + 1 })),
    ]);
    setTrackSettings((current) => [
      { id, order: 0, name, muted: false },
      ...current.map((track) => ({ ...track, order: track.order + 1 })),
    ]);
    setSelectedLayerId("");
    setSelectedTrackId(id);
    setStatus("New track added at the top");
  }

  function fitSelectedMediaToCanvas() {
    if (!selectedLayer || selectedLayer.type !== "media" || selectedLayer.locked) return;
    updateLayer(selectedLayer.id, { x: 0, y: 0, width: 100, height: 100, angle: 0, objectFit: "contain" });
    setStatus("Selected layer fitted without cropping");
  }

  function fillSelectedMediaCanvas() {
    if (!selectedLayer || selectedLayer.type !== "media" || selectedLayer.locked) return;
    updateLayer(selectedLayer.id, { x: 0, y: 0, width: 100, height: 100, angle: 0, objectFit: "cover" });
    setStatus("Media filled canvas (edges may be cropped)");
  }

  function makeSelectedMediaOverlay() {
    if (!selectedLayer || selectedLayer.type !== "media" || selectedLayer.locked) return;
    const asset = selectedLayer.assetKey ? mediaAssetsRef.current.get(selectedLayer.assetKey) : undefined;
    const box = getInitialMediaBox(asset);
    updateLayer(selectedLayer.id, { ...box, angle: 0, objectFit: "contain" });
    setStatus("Media resized as overlay layer");
  }

  function extendSelectedImageToVideoEnd() {
    if (!selectedLayer || selectedLayer.type !== "media" || selectedLayer.mediaKind !== "image" || selectedLayer.locked) return;
    const projectContentEnd = layersRef.current.reduce((end, layer) => (
      layer.id === selectedLayer.id || layer.type === "transition"
        ? end
        : Math.max(end, getLayerEnd(layer))
    ), 0);
    const targetEnd = Math.max(selectedLayer.start + 0.2, projectContentEnd || projectDuration);
    updateLayer(selectedLayer.id, {
      duration: Number((targetEnd - selectedLayer.start).toFixed(3)),
    });
    setStatus("Image extended to the end of the video");
  }

  function stopPlayback() {
    playbackPrimeTokenRef.current += 1;
    setIsPlaybackPriming(false);
    setIsPlaying(false);
    currentTimeRef.current = previewRangeStart;
    setCurrentTime(previewRangeStart);
  }

  function waitForMediaEvent(
    element: HTMLMediaElement,
    eventName: "loadedmetadata" | "loadeddata" | "seeked",
    timeoutMs = 900,
  ) {
    return new Promise<void>((resolve) => {
      let completed = false;
      const finish = () => {
        if (completed) return;
        completed = true;
        window.clearTimeout(timeoutId);
        element.removeEventListener(eventName, finish);
        element.removeEventListener("error", finish);
        resolve();
      };
      const timeoutId = window.setTimeout(finish, timeoutMs);
      element.addEventListener(eventName, finish, { once: true });
      element.addEventListener("error", finish, { once: true });
    });
  }

  async function primePlaybackFrame(playbackStart: number) {
    const activeTargets = Array.from(playbackTargets.values()).filter((target) => target.shouldPlay);
    await Promise.all(activeTargets.map(async (target) => {
      const element = target.element;
      element.pause();
      element.muted = true;
      element.playbackRate = 1;

      if (element.readyState === 0) {
        element.load();
        await waitForMediaEvent(element, "loadedmetadata", 1200);
      }

      const duration = Number.isFinite(element.duration) ? element.duration : 0;
      const maxTime = duration > 0 ? Math.max(0, duration - 0.05) : target.sourceTime;
      const targetTime = clamp(target.sourceTime, 0, maxTime);
      if (element.readyState > 0 && Math.abs((element.currentTime || 0) - targetTime) > 0.035) {
        const seekFinished = waitForMediaEvent(element, "seeked", 1200);
        try {
          element.currentTime = targetTime;
          await seekFinished;
        } catch {
          // The regular playback synchronizer will retry once metadata settles.
        }
      }

      if (element instanceof HTMLVideoElement && element.readyState < 2) {
        await waitForMediaEvent(element, "loadeddata", 1200);
      }

      if (element instanceof HTMLVideoElement && element.readyState >= 2 && element.videoWidth > 0 && element.videoHeight > 0) {
        try {
          const frameCanvas = document.createElement("canvas");
          frameCanvas.width = element.videoWidth;
          frameCanvas.height = element.videoHeight;
          const frameContext = frameCanvas.getContext("2d");
          frameContext?.drawImage(element, 0, 0, frameCanvas.width, frameCanvas.height);
          videoFrameCacheRef.current.set(target.layerId, {
            canvas: frameCanvas,
            width: frameCanvas.width,
            height: frameCanvas.height,
            time: element.currentTime || playbackStart,
          });
        } catch {
          // Cross-origin sources can still play even when a preview frame cannot be cached.
        }
      }
    }));
  }

  function stepFrame(direction: -1 | 1) {
    const frameStep = 1 / 30;
    setIsPlaying(false);
    setCurrentTime((value) => clamp(value + frameStep * direction, previewRangeStart, previewRangeEnd));
  }

  async function saveImageBlobToExportDestination(blob: Blob, fileName: string) {
    if (adapters.isDesktop) {
      const bridge = getPixoresDesktopBridge();
      if (!bridge?.saveRenderedOutput) throw new Error("Desktop image saving is unavailable.");
      const result = await bridge.saveRenderedOutput({
        fileName,
        outputDirectory: exportSettings.outputDirectory,
        bytes: await blob.arrayBuffer(),
      });
      return result.outputPath;
    }

    const directory = browserExportDirectoryRef.current;
    if (directory) {
      const fileHandle = await directory.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return `${directory.name}/${fileName}`;
    }

    const url = URL.createObjectURL(blob);
    triggerBrowserDownload(url, fileName);
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    return `Downloads/${fileName}`;
  }

  function createCanvasPngBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("The canvas did not produce an image."));
        }, "image/png", 0.96);
      } catch (error) {
        reject(error);
      }
    });
  }

  async function addGeneratedImageToImportsAndDisk(blob: Blob, fileName: string, label: string) {
    const file = new File([blob], fileName, { type: "image/png" });
    await importMediaFile(file, { origin: "local" });
    try {
      const outputPath = await saveImageBlobToExportDestination(blob, fileName);
      setStatus(`${label} added to Imports and saved: ${outputPath}`);
    } catch (error) {
      setStatus(`${label} added to Imports, but the disk copy failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async function saveImportedImageToDisk(item: ImportedAsset) {
    if (item.kind !== "image") return;
    try {
      const response = await fetch(item.persistentUrl || item.url);
      if (!response.ok) throw new Error(`Image read failed with ${response.status}`);
      const outputPath = await saveImageBlobToExportDestination(await response.blob(), item.name);
      setStatus(`Image saved: ${outputPath}`);
    } catch (error) {
      setStatus(`Image could not be saved: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async function snapshotCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) {
      setStatus("The canvas is not ready for a snapshot");
      return;
    }
    try {
      const context = canvas.getContext("2d");
      if (context) drawScene(context, currentTimeRef.current);
      const fileName = `${sanitizeProjectFileName(projectTitle)}-frame-${formatTimecode(currentTimeRef.current).replace(/:/g, "-")}.png`;
      await addGeneratedImageToImportsAndDisk(await createCanvasPngBlob(canvas), fileName, "Snapshot");
    } catch (error) {
      setStatus(`Snapshot failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  function toggleMediaPreviewPlayback() {
    const media = mediaPreviewRef.current;
    if (!media) return;
    if (media.paused) {
      void media.play();
      setIsMediaPreviewPlaying(true);
    } else {
      media.pause();
      setIsMediaPreviewPlaying(false);
    }
  }

  function stopMediaPreview() {
    const media = mediaPreviewRef.current;
    if (!media) return;
    media.pause();
    media.currentTime = 0;
    setMediaPreviewTime(0);
    setIsMediaPreviewPlaying(false);
  }

  async function snapshotSelectedImport() {
    if (!selectedImport) return;
    if (selectedImport.kind === "image") {
      await saveImportedImageToDisk(selectedImport);
      return;
    }

    const media = mediaPreviewRef.current;
    if (!(media instanceof HTMLVideoElement) || media.videoWidth <= 0 || media.videoHeight <= 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = media.videoWidth;
    canvas.height = media.videoHeight;
    canvas.getContext("2d")?.drawImage(media, 0, 0, canvas.width, canvas.height);
    try {
      const fileName = `${selectedImport.name.replace(/\.[^.]+$/, "")}-snapshot.png`;
      await addGeneratedImageToImportsAndDisk(await createCanvasPngBlob(canvas), fileName, "Media snapshot");
    } catch (error) {
      setStatus(`Media snapshot failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  function replaceSelectedClipWithImport(item: ImportedAsset) {
    const asset = mediaAssetsRef.current.get(item.id);
    if (!asset || !selectedLayer || selectedLayer.locked) {
      setStatus("Select an unlocked clip to replace");
      return;
    }
    if (selectedLayer.type === "audio" && item.kind !== "audio") {
      setStatus("Select audio to replace an audio clip");
      return;
    }
    if (selectedLayer.type !== "audio" && item.kind === "audio") {
      setStatus("Audio cannot replace a visual clip");
      return;
    }
    const sourceDuration = Math.max(0.2, item.duration || asset.duration || asset.metadata?.duration || selectedLayer.duration);
    updateLayer(selectedLayer.id, {
      name: item.name.replace(/\.[^.]+$/, "").slice(0, 28) || selectedLayer.name,
      src: asset.url,
      mediaKind: item.kind,
      assetKey: item.id,
      duration: sourceDuration,
      sourceStart: 0,
      trimStart: 0,
      sourceEnd: item.kind === "image" ? undefined : sourceDuration,
      trimEnd: item.kind === "image" ? undefined : sourceDuration,
      sourceDuration: item.kind === "image" ? undefined : sourceDuration,
    });
    setStatus("Selected clip replaced");
  }

  function setImportAsBackground(item: ImportedAsset) {
    if (item.kind === "audio") return;
    const asset = mediaAssetsRef.current.get(item.id);
    if (!asset) return;
    const layerId = `background-${item.id}-${Date.now()}`;
    const backgroundLayer: VideoLayer = {
      id: layerId,
      trackId: `background-track-${layerId}`,
      type: "media",
      name: `Background: ${item.name.replace(/\.[^.]+$/, "").slice(0, 22)}`,
      start: 0,
      duration: Math.max(projectDuration, item.duration || asset.duration || 5),
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      src: asset.url,
      mediaKind: item.kind,
      assetKey: item.id,
      objectFit: item.kind === "image" ? "cover" : undefined,
      volume: item.kind === "video" ? 1 : undefined,
    };
    insertLayerAfterSelection(backgroundLayer);
    setStatus("Media set as canvas background layer");
  }

  function toggleTextBullets(layer: VideoLayer) {
    updateLayer(layer.id, { hasBullets: !layer.hasBullets });
  }

  function getClipInsertPosition(duration: number, kind: "audio" | "visual" = "visual") {
    const insertionTime = clamp(currentTime, 0, timelineViewportDuration);
    const selectedReadyTrack = visibleTrackGroups.find((group) => (
      group.trackId === selectedTrackId
      && group.clips.length === 0
      && (group.isSmartPlaceholder || group.emptyTrack)
    ));
    const trackId = selectedReadyTrack?.trackId || `${kind}-track-${Date.now()}`;
    return {
      trackId,
      start: Number(insertionTime.toFixed(3)),
      duration,
      trackOrder: selectedReadyTrack?.order ?? 0,
      trackName: selectedReadyTrack?.name || `Track ${trackSettings.length + 1}`,
      createdTrack: true,
      incompatibleTrack: false,
    };
  }

  function getImportedClipInsertPosition(duration: number, kind: "audio" | "visual") {
    const fallback = getClipInsertPosition(duration, kind);
    const selectedGroup = selectedTrackId
      ? visibleTrackGroups.find((group) => group.trackId === selectedTrackId)
      : undefined;
    if (!selectedGroup) return { ...fallback, placement: "new-top" as const };

    const isLocked = selectedGroup.clips.some((clip) => clip.locked) || !!selectedGroup.emptyTrack?.locked;
    const isCompatible = !isLocked && (
      selectedGroup.clips.length === 0
      || (kind === "audio"
        ? selectedGroup.clips.every((clip) => clip.type === "audio")
        : selectedGroup.clips.every((clip) => clip.type !== "audio"))
    );
    const start = Number(clamp(currentTime, 0, timelineViewportDuration).toFixed(3));

    if (isCompatible) {
      return {
        trackId: selectedGroup.trackId,
        start,
        duration,
        trackOrder: selectedGroup.order,
        trackName: selectedGroup.name,
        createdTrack: selectedGroup.clips.length === 0,
        incompatibleTrack: false,
        placement: "selected-track" as const,
      };
    }

    const trackId = `${kind}-track-${Date.now()}`;
    return {
      trackId,
      start,
      duration,
      trackOrder: selectedGroup.order + 1,
      trackName: `Track ${selectedGroup.order + 2}`,
      createdTrack: true,
      incompatibleTrack: true,
      placement: "new-below" as const,
    };
  }

  function insertImportedLayer(
    layer: VideoLayer,
    placement: "new-top" | "selected-track" | "new-below",
  ) {
    if (placement === "new-top") {
      insertLayerAfterSelection(layer);
      return;
    }

    const trackId = getTrackId(layer);
    const targetOrder = layer.trackOrder ?? 0;
    if (placement === "selected-track") {
      commitLayers((current) => {
        const shiftedClips = current.map((item) => (
          getTrackId(item) === trackId && getLayerEnd(item) > layer.start
            ? { ...item, start: Number((item.start + layer.duration).toFixed(3)) }
            : item
        ));
        return orderLayersByTrackAndTime([...shiftedClips, layer]);
      });
      setTrackSettings((current) => {
        if (current.some((track) => track.id === trackId)) return current;
        return [...current, {
          id: trackId,
          order: targetOrder,
          name: layer.trackName || layer.name,
          muted: false,
        }].sort((first, second) => first.order - second.order);
      });
      setEmptyTracks((current) => current.filter((track) => track.id !== trackId));
    } else {
      commitLayers((current) => orderLayersByTrackAndTime([
        ...current.map((item, index) => {
          const order = getTrackOrder(getTrackId(item), trackSettings, item.trackOrder ?? index);
          return order >= targetOrder ? { ...item, trackOrder: order + 1 } : item;
        }),
        layer,
      ]));
      setTrackSettings((current) => [
        ...current.map((track) => (track.order >= targetOrder ? { ...track, order: track.order + 1 } : track)),
        { id: trackId, order: targetOrder, name: layer.trackName || layer.name, muted: false },
      ].sort((first, second) => first.order - second.order));
      setEmptyTracks((current) => current.map((track, index) => {
        const order = track.order ?? index;
        return order >= targetOrder ? { ...track, order: order + 1 } : track;
      }));
    }

    setTimelineDuration((value) => Math.max(value, Math.ceil(getLayerEnd(layer) + TIMELINE_EMPTY_TAIL_SECONDS)));
    setSelectedLayerId(layer.id);
    setSelectedTrackId(trackId);
    setActivePanel("settings");
    setIsSidebarOpen(!isCompactVideoMakerViewport());
    setIsMobilePanelOpen(false);
    setIsMobileTimelineOpen(false);
  }

  function insertLayersAfterSelection(nextLayers: VideoLayer[]) {
    const existingTrackIds = new Set([
      ...emptyTracks.map((track) => track.id),
      ...layersRef.current.filter((layer) => layer.type !== "transition").map((layer) => getTrackId(layer)),
    ]);
    const materializedSmartTrackIds = Array.from(new Set(
      nextLayers
        .filter((layer) => layer.type !== "transition" && getTrackId(layer).startsWith(SMART_TRACK_PREFIX))
        .map((layer) => getTrackId(layer)),
    ));
    materializedSmartTrackIds.forEach((trackId) => existingTrackIds.add(trackId));
    const newTrackIds = Array.from(new Set(
      nextLayers
        .filter((layer) => layer.type !== "transition" && !existingTrackIds.has(getTrackId(layer)))
        .map((layer) => getTrackId(layer)),
    ));
    const newTrackOrder = new Map(newTrackIds.map((trackId, index) => [trackId, index]));
    const trackShift = newTrackIds.length;
    const placedLayers = nextLayers.map((layer) => {
      const order = newTrackOrder.get(getTrackId(layer));
      return {
        ...layer,
        start: Math.max(0, layer.start),
        trackOrder: order ?? layer.trackOrder,
      };
    });
    const primaryLayer = placedLayers[0];
    if (!primaryLayer) return;
    const insertEnd = Math.max(...placedLayers.map((layer) => getLayerEnd(layer)));

    commitLayers((current) => {
      const selectedIndex = current.findIndex((item) => item.id === selectedLayerId);
      const shiftedCurrent = trackShift > 0
        ? current.map((layer, fallbackIndex) => ({
          ...layer,
          trackOrder: getTrackOrder(getTrackId(layer), trackSettings, layer.trackOrder ?? fallbackIndex) + trackShift,
        }))
        : current;

      if (selectedIndex < 0) return orderLayersByTrackAndTime([...placedLayers, ...shiftedCurrent]);
      return orderLayersByTrackAndTime([
        ...placedLayers,
        ...shiftedCurrent.slice(0, selectedIndex + 1),
        ...shiftedCurrent.slice(selectedIndex + 1),
      ]);
    });

    if (trackShift > 0) {
      setTrackSettings((current) => [
        ...newTrackIds.map((trackId, index) => {
          const layer = placedLayers.find((item) => getTrackId(item) === trackId);
          return {
            id: trackId,
            order: index,
            name: layer?.trackName || layer?.name || `Track ${current.length + index + 1}`,
            muted: !!layer?.trackMuted,
          };
        }),
        ...current.map((track) => ({ ...track, order: track.order + trackShift })),
      ]);
    }
    if (materializedSmartTrackIds.length > 0) {
      setTrackSettings((current) => {
        const knownIds = new Set(current.map((track) => track.id));
        const materialized = materializedSmartTrackIds
          .filter((trackId) => !knownIds.has(trackId))
          .map((trackId) => {
            const layer = placedLayers.find((item) => getTrackId(item) === trackId);
            return {
              id: trackId,
              order: layer?.trackOrder ?? current.length,
              name: layer?.trackName || layer?.name || `Track ${current.length + 1}`,
              muted: !!layer?.trackMuted,
            };
          });
        return [...current, ...materialized].sort((first, second) => first.order - second.order);
      });
    }

    setTimelineDuration((value) => Math.max(value, Math.ceil(insertEnd + TIMELINE_EMPTY_TAIL_SECONDS)));
    setEmptyTracks((current) => current
      .filter((track) => !placedLayers.some((layer) => getTrackId(layer) === track.id))
      .map((track, index) => ({ ...track, order: (track.order ?? index) + trackShift })));
    setSelectedLayerId(primaryLayer.id);
    setSelectedTrackId(primaryLayer.trackId || primaryLayer.id);
    setActivePanel("settings");
    setIsSidebarOpen(!isCompactVideoMakerViewport());
    setIsMobilePanelOpen(false);
    setIsMobileTimelineOpen(false);
  }

  function insertLayerAfterSelection(layer: VideoLayer) {
    insertLayersAfterSelection([layer]);
  }

  function moveSelectedClipInTrack(direction: "previous" | "next") {
    const selected = layersRef.current.find((layer) => layer.id === selectedLayerId);
    if (!selected || selected.locked) return;
    const trackId = selected.trackId || selected.id;
    const trackClips = sortClipsByTime(layersRef.current.filter((layer) => (layer.trackId || layer.id) === trackId));
    const selectedIndex = trackClips.findIndex((layer) => layer.id === selected.id);
    const targetIndex = direction === "previous" ? selectedIndex - 1 : selectedIndex + 1;
    if (selectedIndex < 0 || targetIndex < 0 || targetIndex >= trackClips.length) return;

    const reordered = [...trackClips];
    const [clip] = reordered.splice(selectedIndex, 1);
    reordered.splice(targetIndex, 0, clip);
    const firstStart = Math.min(...trackClips.map((layer) => layer.start));
    let nextStart = firstStart;
    const nextStarts = new Map<string, number>();
    reordered.forEach((layer) => {
      nextStarts.set(layer.id, Number(nextStart.toFixed(2)));
      nextStart += layer.duration;
    });

    commitLayers((current) => current.map((layer) => (
      nextStarts.has(layer.id) ? { ...layer, start: nextStarts.get(layer.id) || 0 } : layer
    )));
    setTimelineDuration((value) => Math.max(value, Math.ceil(nextStart)));
    setStatus(direction === "previous" ? "Clip moved earlier" : "Clip moved later");
  }

  function getTimelineTrackAtPoint(clientX: number, clientY: number) {
    const element = document.elementFromPoint(clientX, clientY);
    const track = element?.closest("[data-timeline-track]") as HTMLElement | null;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    const trackId = track.dataset.trackId;
    if (!trackId || rect.width <= 0) return null;
    const time = clamp(((clientX - rect.left) / rect.width) * timelineViewportDuration, 0, timelineViewportDuration);
    return { trackId, rect, time };
  }

  function isTransitionCompatibleClip(layer: VideoLayer) {
    return layer.type === "media" && (layer.mediaKind === "image" || layer.mediaKind === "video");
  }

  function findTransitionCut(trackId: string, time: number, dropTolerance = 0.8) {
    const cutTolerance = 0.12;
    const clips = sortClipsByTime(layersRef.current.filter((layer) => (
      (layer.trackId || layer.id) === trackId
      && isTransitionCompatibleClip(layer)
    )));
    let bestCut: { fromLayer: VideoLayer; toLayer: VideoLayer; cutTime: number; distance: number } | null = null;

    for (let index = 0; index < clips.length - 1; index += 1) {
      const fromLayer = clips[index];
      const toLayer = clips[index + 1];
      const cutTime = getLayerEnd(fromLayer);
      const gap = Math.abs(toLayer.start - cutTime);
      const distance = Math.abs(time - cutTime);
      if (gap <= cutTolerance && distance <= dropTolerance && (!bestCut || distance < bestCut.distance)) {
        bestCut = { fromLayer, toLayer, cutTime, distance };
      }
    }

    return bestCut ? { fromLayer: bestCut.fromLayer, toLayer: bestCut.toLayer, cutTime: bestCut.cutTime } : null;
  }

  function findSelectedTransitionCut() {
    const selected = layersRef.current.find((layer) => layer.id === selectedLayerId);
    const trackId = selected?.trackId || selectedTrackId;
    if (!trackId) return null;
    if (selected && isTransitionCompatibleClip(selected)) {
      const clips = sortClipsByTime(layersRef.current.filter((layer) => (
        (layer.trackId || layer.id) === trackId
        && isTransitionCompatibleClip(layer)
      )));
      const selectedIndex = clips.findIndex((layer) => layer.id === selected.id);
      const nextClip = clips[selectedIndex + 1];
      if (nextClip && Math.abs(nextClip.start - getLayerEnd(selected)) <= 0.12) {
        return { fromLayer: selected, toLayer: nextClip, cutTime: getLayerEnd(selected), trackId };
      }
      const previousClip = clips[selectedIndex - 1];
      if (previousClip && Math.abs(selected.start - getLayerEnd(previousClip)) <= 0.12) {
        return { fromLayer: previousClip, toLayer: selected, cutTime: selected.start, trackId };
      }
    }

    const cut = findTransitionCut(trackId, currentTime, Number.POSITIVE_INFINITY);
    return cut ? { ...cut, trackId } : null;
  }

  function getLayerSourceDuration(layer: VideoLayer) {
    if (Number.isFinite(layer.sourceDuration)) return Math.max(0.05, layer.sourceDuration || 0.05);
    const asset = mediaAssetsRef.current.get(layer.assetKey || layer.id);
    const assetDuration = asset?.metadata?.duration || asset?.duration;
    if (Number.isFinite(assetDuration) && assetDuration) return Math.max(0.05, assetDuration);
    return Math.max(getLayerSourceEnd(layer), layer.duration, 0.05);
  }

  function isTimelineDurationFlexibleLayer(layer: VideoLayer) {
    if (layer.type === "audio") return false;
    if (layer.type === "media" && (layer.mediaKind === "video" || layer.mediaKind === "audio")) return false;
    return true;
  }

  function snapTimelineTime(
    time: number,
    movingLayerId: string,
    timelineWidth: number,
    alternateTime?: number,
    bypass = false,
    candidateLayers: VideoLayer[] = layersRef.current,
  ): SnapResult {
    if (!snappingEnabled || bypass) return { time, snapPoint: null };
    return calculateSnappedTime({
      time,
      alternateTime,
      pixelsPerSecond: timelineWidth / timelineViewportDuration,
      candidates: getSnapCandidates({
        layers: candidateLayers,
        movingLayerId,
        playhead: currentTime,
        markers: [markInTime, markOutTime].filter((value): value is number => value !== null && value >= 0),
        workArea: [markInTime, markOutTime, projectDuration].filter((value): value is number => value !== null && value >= 0),
      }),
    });
  }

  function applyAnimationPresetToSelected(preset: LayerAnimationPreset, phase: AnimationPhase = activeAnimationPhase) {
    if (!selectedLayer || selectedLayer.type === "audio" || selectedLayer.type === "transition") {
      setStatus("Select a text, photo, object, shape, frame, or lower third first");
      return;
    }
    if (selectedLayer.locked) {
      setStatus("Unlock the selected layer before applying an animation");
      return;
    }

    const duration = Math.min(selectedLayer.duration, preset.duration);
    updateLayerAnimation(selectedLayer, phase, {
      type: preset.type,
      start: 0,
      duration,
      endOffset: 0,
    });
    const previewTime = phase === "in"
      ? selectedLayer.start
      : selectedLayer.start + Math.max(0, selectedLayer.duration - duration);
    setCurrentTime(previewTime);
    setIsPlaying(true);
    setStatus(`${preset.label} ${phase === "in" ? "entrance" : "exit"} animation applied to ${selectedLayer.name}`);
  }

  function addTransitionAtCut(
    preset: TransitionPreset,
    trackId: string,
    cutTime: number,
    fromLayerId?: string,
    toLayerId?: string,
  ) {
    const id = `transition-${Date.now()}`;
    const duration = 0.6;
    const start = clamp(cutTime - duration / 2, 0, Math.max(0, timelineViewportDuration - duration));
    const nextLayer: VideoLayer = {
      id,
      trackId,
      type: "transition",
      name: preset.name,
      start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      color: preset.color,
      transitionKind: preset.transitionKind,
      fromLayerId,
      toLayerId,
      cutTime,
      easing: "easeInOut",
    };

    commitLayers((current) => {
      const withoutDuplicateTransition = current.filter((layer) => (
        layer.type !== "transition"
        || layer.fromLayerId !== fromLayerId
        || layer.toLayerId !== toLayerId
      ));
      const insertIndex = withoutDuplicateTransition.findIndex((layer) => layer.id === toLayerId);
      if (insertIndex < 0) return [nextLayer, ...withoutDuplicateTransition];
      return [
        ...withoutDuplicateTransition.slice(0, insertIndex),
        nextLayer,
        ...withoutDuplicateTransition.slice(insertIndex),
      ];
    });
    setSelectedLayerId(id);
    setActivePanel("settings");
    setIsMobilePanelOpen(false);
    setIsMobileTimelineOpen(false);
    currentTimeRef.current = start;
    setCurrentTime(start);
    setIsPlaying(true);
    setStatus(`${preset.name} transition added · previewing ${duration.toFixed(2)}s`);
  }

  function updateClipFromPointer(clientX: number, clientY: number, bypassSnapping = false, pointerId?: number) {
    const edit = clipEditRef.current;
    if (!edit || (pointerId !== undefined && edit.pointerId !== pointerId)) return;

    const deltaSeconds = ((clientX - edit.startX) / edit.timelineWidth) * timelineViewportDuration;
    const targetTrack = edit.mode === "move" ? getTimelineTrackAtPoint(clientX, clientY) : null;
    const targetTrackGroup = targetTrack ? visibleTrackGroups.find((group) => group.trackId === targetTrack.trackId) : undefined;
    let previewSeekTime: number | null = null;
    let expandedTimelineEnd: number | null = null;

    setLayers((current) => {
      if (edit.mode === "move" && edit.movingLayerIds.length > 1) {
        const movingIds = new Set(edit.movingLayerIds);
        const initialMovingLayers = edit.initialLayers.filter((layer) => movingIds.has(layer.id));
        const primaryInitial = initialMovingLayers.find((layer) => layer.id === edit.layerId);
        if (!primaryInitial) return current;

        const sourceTrackIds = new Set(initialMovingLayers.filter(isTrackBlockingClip).map(getTrackId));
        if (initialMovingLayers.every(isTrackBlockingClip) && sourceTrackIds.size === 1) {
          const sourceTrackId = getTrackId(primaryInitial);
          const targetTrackId = targetTrack?.trackId || sourceTrackId;
          const earliestStart = Math.min(...initialMovingLayers.map((layer) => layer.start));
          const latestEnd = Math.max(...initialMovingLayers.map(getLayerEnd));
          const insertionSpan = Math.max(0.05, latestEnd - earliestStart);
          const desiredStart = Math.max(0, edit.initialStart + deltaSeconds);
          const snapResult = snapTimelineTime(desiredStart, edit.layerId, edit.timelineWidth, desiredStart + insertionSpan, bypassSnapping, edit.initialLayers);
          let adjustedDesiredStart = Math.max(0, snapResult.time);
          let workingLayers = edit.initialLayers.filter((layer) => !movingIds.has(layer.id)).map((layer) => (
            getTrackId(layer) === sourceTrackId
            && isTrackBlockingClip(layer)
            && layer.start >= latestEnd - 0.001
              ? { ...layer, start: Number(Math.max(0, layer.start - insertionSpan).toFixed(3)) }
              : layer
          ));
          if (sourceTrackId === targetTrackId && adjustedDesiredStart > earliestStart) {
            adjustedDesiredStart = Math.max(0, adjustedDesiredStart - insertionSpan);
          }
          const insertionTime = Number(resolveRippleInsertionTime(workingLayers, targetTrackId, adjustedDesiredStart, movingIds).toFixed(3));
          workingLayers = workingLayers.map((layer) => (
            getTrackId(layer) === targetTrackId
            && isTrackBlockingClip(layer)
            && layer.start >= insertionTime - 0.001
              ? { ...layer, start: Number((layer.start + insertionSpan).toFixed(3)) }
              : layer
          ));
          const movedLayers = initialMovingLayers.map((layer) => ({
            ...layer,
            start: Number((insertionTime + layer.start - earliestStart).toFixed(3)),
            trackId: targetTrackId,
            trackOrder: targetTrackGroup?.order ?? layer.trackOrder,
            trackName: targetTrackGroup?.name || layer.trackName,
          }));
          edit.hasChanged = edit.hasChanged || insertionTime !== earliestStart || targetTrackId !== sourceTrackId;
          setSnapGuideTime(snapResult.snapPoint ?? insertionTime);
          setClipDragPreview({
            layerId: edit.layerId,
            trackId: targetTrackId,
            leftPercent: (insertionTime / timelineViewportDuration) * 100,
            widthPercent: (insertionSpan / timelineViewportDuration) * 100,
            isOverlapping: false,
          });
          return orderLayersByTrackAndTime([...workingLayers, ...movedLayers]);
        }

        const earliestStart = Math.min(...initialMovingLayers.map((layer) => layer.start));
        const latestEnd = Math.max(...initialMovingLayers.map((layer) => getLayerEnd(layer)));
        const minimumDelta = -earliestStart;
        const maximumDelta = Math.max(0, timelineViewportDuration - latestEnd);
        const desiredPrimaryStart = clamp(edit.initialStart + deltaSeconds, edit.initialStart + minimumDelta, edit.initialStart + maximumDelta);
        const snapResult = snapTimelineTime(desiredPrimaryStart, edit.layerId, edit.timelineWidth, desiredPrimaryStart + edit.initialDuration, bypassSnapping, edit.initialLayers);
        const nextPrimaryStart = clamp(snapResult.time, edit.initialStart + minimumDelta, edit.initialStart + maximumDelta);
        const appliedDelta = Number((nextPrimaryStart - edit.initialStart).toFixed(3));
        const primaryTrackOrder = getTrackOrder(edit.initialTrackId, trackSettings, primaryInitial.trackOrder || 0);
        const targetTrackOrder = targetTrackGroup?.order ?? primaryTrackOrder;
        const requestedTrackDelta = targetTrackOrder - primaryTrackOrder;
        const initialOrders = initialMovingLayers.map((layer, index) => getTrackOrder(getTrackId(layer), trackSettings, layer.trackOrder ?? index));
        const visibleOrders = visibleTrackGroups.map((group) => group.order);
        const minInitialOrder = Math.min(...initialOrders);
        const maxInitialOrder = Math.max(...initialOrders);
        const minVisibleOrder = Math.min(...visibleOrders);
        const maxVisibleOrder = Math.max(...visibleOrders);
        const trackOrderDelta = clamp(requestedTrackDelta, minVisibleOrder - minInitialOrder, maxVisibleOrder - maxInitialOrder);
        const trackByOrder = new Map(visibleTrackGroups.map((group) => [group.order, group]));

        edit.hasChanged = edit.hasChanged || Math.abs(appliedDelta) > 0.001 || trackOrderDelta !== 0;
        setSnapGuideTime(snapResult.snapPoint);
        setClipDragPreview({
          layerId: edit.layerId,
          trackId: targetTrack?.trackId || edit.initialTrackId,
          leftPercent: (nextPrimaryStart / timelineViewportDuration) * 100,
          widthPercent: (edit.initialDuration / timelineViewportDuration) * 100,
        });

        return orderLayersByTrackAndTime(current.map((layer) => {
          if (!movingIds.has(layer.id) || layer.locked) return layer;
          const initialLayer = initialMovingLayers.find((item) => item.id === layer.id) || layer;
          const initialOrder = getTrackOrder(getTrackId(initialLayer), trackSettings, initialLayer.trackOrder || 0);
          const nextTrack = trackByOrder.get(initialOrder + trackOrderDelta);
          return {
            ...layer,
            start: Number(Math.max(0, initialLayer.start + appliedDelta).toFixed(3)),
            trackId: nextTrack?.trackId || initialLayer.trackId,
            trackOrder: nextTrack?.order ?? initialLayer.trackOrder,
            trackName: nextTrack?.name || initialLayer.trackName,
          };
        }));
      }

      const singleMovingLayer = edit.mode === "move"
        ? edit.initialLayers.find((layer) => layer.id === edit.layerId)
        : undefined;
      if (singleMovingLayer && isTrackBlockingClip(singleMovingLayer)) {
        const desiredStart = clamp(edit.initialStart + deltaSeconds, 0, Math.max(0, timelineViewportDuration - edit.initialDuration));
        const targetTrackId = targetTrack?.trackId || edit.initialTrackId;
        const snapResult = snapTimelineTime(desiredStart, singleMovingLayer.id, edit.timelineWidth, desiredStart + edit.initialDuration, bypassSnapping, edit.initialLayers);
        const movingIds = new Set(edit.movingLayerIds);
        const sourceTrackId = getTrackId(singleMovingLayer);
        let workingLayers = edit.initialLayers.filter((item) => !movingIds.has(item.id));
        let adjustedDesiredStart = Math.max(0, snapResult.time);

        workingLayers = workingLayers.map((item) => (
          getTrackId(item) === sourceTrackId
          && isTrackBlockingClip(item)
          && item.start >= getLayerEnd(singleMovingLayer) - 0.001
            ? { ...item, start: Number(Math.max(0, item.start - singleMovingLayer.duration).toFixed(3)) }
            : item
        ));
        if (sourceTrackId === targetTrackId && adjustedDesiredStart > singleMovingLayer.start) {
          adjustedDesiredStart = Math.max(0, adjustedDesiredStart - singleMovingLayer.duration);
        }

        const insertionTime = Number(resolveRippleInsertionTime(
          workingLayers,
          targetTrackId,
          adjustedDesiredStart,
          movingIds,
        ).toFixed(3));
        const shiftedLayers = workingLayers.map((item) => (
          getTrackId(item) === targetTrackId
          && isTrackBlockingClip(item)
          && item.start >= insertionTime - 0.001
            ? { ...item, start: Number((item.start + singleMovingLayer.duration).toFixed(3)) }
            : item
        ));
        const movedLayer = {
          ...singleMovingLayer,
          start: insertionTime,
          trackId: targetTrackId,
          trackOrder: targetTrackGroup?.order ?? singleMovingLayer.trackOrder,
          trackName: targetTrackGroup?.name || singleMovingLayer.trackName,
        };
        edit.hasChanged = edit.hasChanged || insertionTime !== edit.initialStart || targetTrackId !== edit.initialTrackId;
        setSnapGuideTime(snapResult.snapPoint ?? insertionTime);
        setClipDragPreview({
          layerId: singleMovingLayer.id,
          trackId: targetTrackId,
          leftPercent: (insertionTime / timelineViewportDuration) * 100,
          widthPercent: (singleMovingLayer.duration / timelineViewportDuration) * 100,
          isOverlapping: false,
        });
        return orderLayersByTrackAndTime([...shiftedLayers, movedLayer]);
      }

      const nextLayers = current.map((layer) => {
      if (layer.id !== edit.layerId || layer.locked) return layer;
      const hasFlexibleDuration = isTimelineDurationFlexibleLayer(layer);

      if (edit.mode === "move") {
        const desiredStart = clamp(edit.initialStart + deltaSeconds, 0, Math.max(0, timelineViewportDuration - edit.initialDuration));
        const targetTrackId = targetTrack?.trackId || edit.initialTrackId;
        const snapResult = snapTimelineTime(desiredStart, layer.id, edit.timelineWidth, desiredStart + edit.initialDuration, bypassSnapping, edit.initialLayers);
        const snappedStart = Math.max(0, snapResult.time);
        const nextStart = Number(snappedStart.toFixed(3));
        const appliedSnapPoint = snapResult.snapPoint !== null && (
          Math.abs(nextStart - snapResult.snapPoint) < 0.001
          || Math.abs(nextStart + edit.initialDuration - snapResult.snapPoint) < 0.001
        ) ? snapResult.snapPoint : null;
        setSnapGuideTime(appliedSnapPoint);
        const previewLayer = { ...layer, start: nextStart, trackId: targetTrackId, trackOrder: targetTrackGroup?.order ?? layer.trackOrder };
        if (targetTrack) {
          setClipDragPreview({
            layerId: layer.id,
            trackId: targetTrackId,
            leftPercent: (nextStart / timelineViewportDuration) * 100,
            widthPercent: (layer.duration / timelineViewportDuration) * 100,
            isOverlapping: hasTrackOverlap(current, previewLayer),
          });
        }
        edit.hasChanged = edit.hasChanged || nextStart !== edit.initialStart || targetTrackId !== edit.initialTrackId;
        return {
          ...layer,
          start: nextStart,
          trackId: targetTrackId,
          trackOrder: targetTrackGroup?.order ?? layer.trackOrder,
          trackName: targetTrackGroup?.name || layer.trackName,
        };
      }

      if (edit.mode === "trim-start") {
        const bounds = isTrackBlockingClip(layer)
          ? getTrackNeighborBounds(current, { ...layer, start: edit.initialStart, duration: edit.initialDuration })
          : { previousEnd: 0 };
        const maxStart = edit.initialStart + edit.initialDuration - 0.2;
        const snapResult = snapTimelineTime(edit.initialStart + deltaSeconds, layer.id, edit.timelineWidth, undefined, bypassSnapping, edit.initialLayers);
        const desiredStart = snapResult.time;
        const minimumStart = hasFlexibleDuration
          ? bounds.previousEnd
          : Math.max(bounds.previousEnd, edit.initialStart - edit.initialSourceStart);
        const nextStart = Number(clamp(desiredStart, minimumStart, maxStart).toFixed(3));
        const appliedSnapPoint = snapResult.snapPoint !== null && Math.abs(nextStart - snapResult.snapPoint) < 0.001 ? snapResult.snapPoint : null;
        setSnapGuideTime(appliedSnapPoint);
        const trimDelta = nextStart - edit.initialStart;
        if (hasFlexibleDuration) {
          const nextDuration = Number(Math.max(0.2, edit.initialDuration - trimDelta).toFixed(3));
          edit.hasChanged = edit.hasChanged || nextStart !== edit.initialStart || nextDuration !== edit.initialDuration;
          previewSeekTime = nextStart;
          return {
            ...layer,
            start: nextStart,
            duration: nextDuration,
          };
        }
        const nextSourceStart = Number(clamp(edit.initialSourceStart + trimDelta, 0, edit.initialSourceEnd - 0.2).toFixed(3));
        const nextDuration = Number(Math.max(0.2, edit.initialSourceEnd - nextSourceStart).toFixed(3));
        edit.hasChanged = edit.hasChanged || nextStart !== edit.initialStart || nextSourceStart !== edit.initialSourceStart;
        const nextLayer = {
          ...layer,
          start: nextStart,
          sourceStart: nextSourceStart,
          trimStart: nextSourceStart,
          sourceEnd: edit.initialSourceEnd,
          trimEnd: edit.initialSourceEnd,
          sourceDuration: edit.sourceDuration,
          duration: nextDuration,
        };
        previewSeekTime = nextStart;
        return nextLayer;
      }

      const bounds = isTrackBlockingClip(layer)
        ? getTrackNeighborBounds(current, { ...layer, start: edit.initialStart, duration: edit.initialDuration })
        : { nextStart: Number.POSITIVE_INFINITY };
      const maxDurationByNeighbor = Number.isFinite(bounds.nextStart)
        ? Math.max(0.2, bounds.nextStart - edit.initialStart)
        : Math.max(0.2, timelineViewportDuration - edit.initialStart, edit.initialDuration + deltaSeconds);
      const snapResult = snapTimelineTime(edit.initialStart + edit.initialDuration + deltaSeconds, layer.id, edit.timelineWidth, undefined, bypassSnapping, edit.initialLayers);
      const desiredEnd = snapResult.time;
      const nextTimelineEnd = Number(clamp(desiredEnd, edit.initialStart + 0.2, edit.initialStart + maxDurationByNeighbor).toFixed(3));
      const appliedSnapPoint = snapResult.snapPoint !== null && Math.abs(nextTimelineEnd - snapResult.snapPoint) < 0.001 ? snapResult.snapPoint : null;
      setSnapGuideTime(appliedSnapPoint);
      const nextDuration = Number((nextTimelineEnd - edit.initialStart).toFixed(3));
      if (hasFlexibleDuration) {
        edit.hasChanged = edit.hasChanged || nextDuration !== edit.initialDuration;
        previewSeekTime = nextTimelineEnd;
        if (nextTimelineEnd > timelineViewportDuration) {
          expandedTimelineEnd = Math.max(expandedTimelineEnd || 0, nextTimelineEnd);
        }
        return {
          ...layer,
          duration: nextDuration,
        };
      }
      const nextSourceEnd = Number(clamp(edit.initialSourceStart + nextDuration, edit.initialSourceStart + 0.2, edit.sourceDuration).toFixed(3));
      const finalDuration = Number(Math.max(0.2, nextSourceEnd - edit.initialSourceStart).toFixed(3));
      edit.hasChanged = edit.hasChanged || nextSourceEnd !== edit.initialSourceEnd;
      previewSeekTime = edit.initialStart + finalDuration;
      return {
        ...layer,
        sourceStart: edit.initialSourceStart,
        trimStart: edit.initialSourceStart,
        sourceEnd: nextSourceEnd,
        trimEnd: nextSourceEnd,
        sourceDuration: edit.sourceDuration,
        duration: finalDuration,
      };
      });

      return edit.mode === "move" ? orderLayersByTrackAndTime(nextLayers) : nextLayers;
    });

    if (previewSeekTime !== null) setCurrentTime(previewSeekTime);
    if (expandedTimelineEnd !== null) {
      const timelineEndToEnsure = expandedTimelineEnd;
      setTimelineDuration((value) => Math.max(value, Math.ceil(timelineEndToEnsure + TIMELINE_EMPTY_TAIL_SECONDS)));
    }
  }

  function updateStageElementFromPointer(clientX: number, clientY: number, keepAspect = false) {
    const edit = stageEditRef.current;
    if (!edit) return;

    const deltaXPercent = ((clientX - edit.startX) / edit.stageWidth) * 100;
    const deltaYPercent = ((clientY - edit.startY) / edit.stageHeight) * 100;

    if (edit.mode === "move") {
      const movingLayer = layersRef.current.find((layer) => layer.id === edit.layerId);
      if (!movingLayer || movingLayer.locked) return;
      let nextX = clamp(edit.initialX + deltaXPercent, -Math.max(movingLayer.width, STAGE_POSITION_LIMIT_PERCENT), STAGE_POSITION_LIMIT_PERCENT);
      let nextY = clamp(edit.initialY + deltaYPercent, -Math.max(movingLayer.height, STAGE_POSITION_LIMIT_PERCENT), STAGE_POSITION_LIMIT_PERCENT);
      const horizontalThreshold = (8 / Math.max(1, edit.stageWidth)) * 100;
      const verticalThreshold = (8 / Math.max(1, edit.stageHeight)) * 100;
      const centerX = nextX + movingLayer.width / 2;
      const centerY = nextY + movingLayer.height / 2;
      const vertical = Math.abs(centerX - 50) <= horizontalThreshold;
      const horizontal = Math.abs(centerY - 50) <= verticalThreshold;
      if (vertical) nextX = 50 - movingLayer.width / 2;
      if (horizontal) nextY = 50 - movingLayer.height / 2;

      setStageAlignmentGuides(vertical || horizontal ? {
        vertical,
        horizontal,
        centerX: vertical ? 50 : Number(centerX.toFixed(2)),
        centerY: horizontal ? 50 : Number(centerY.toFixed(2)),
      } : null);
      setLayers((current) => current.map((layer) => (
        layer.id === edit.layerId
          ? { ...layer, x: Number(nextX.toFixed(2)), y: Number(nextY.toFixed(2)) }
          : layer
      )));
      return;
    }

    setStageAlignmentGuides(null);

    setLayers((current) => current.map((layer) => {
      if (layer.id !== edit.layerId || layer.locked) return layer;

      if (edit.mode === "rotate") {
        const pointerAngle = Math.atan2(clientY - edit.centerY, clientX - edit.centerX) * (180 / Math.PI);
        const nextAngle = (edit.initialAngle + pointerAngle - edit.initialPointerAngle + 360) % 360;
        return {
          ...layer,
          angle: Math.round(nextAngle),
        };
      }

      const minSize = 4;
      const edge = edit.edge || "bottomRight";
      const initialRight = edit.initialX + edit.initialWidth;
      const initialBottom = edit.initialY + edit.initialHeight;
      const aspectRatio = edit.initialWidth / Math.max(edit.initialHeight, 0.001);
      const isCorner = (edge.includes("Left") || edge.includes("Right"))
        && (edge.includes("top") || edge.includes("Bottom") || edge.includes("bottom"));
      let nextX = edit.initialX;
      let nextY = edit.initialY;
      let nextWidth = edit.initialWidth;
      let nextHeight = edit.initialHeight;

      if (edge.includes("Left") || edge === "left") {
        nextX = clamp(edit.initialX + deltaXPercent, -STAGE_POSITION_LIMIT_PERCENT, initialRight - minSize);
        nextWidth = initialRight - nextX;
      }

      if (edge.includes("Right") || edge === "right") {
        nextWidth = clamp(edit.initialWidth + deltaXPercent, minSize, STAGE_MAX_SIZE_PERCENT);
      }

      if (edge.includes("top") || edge === "top") {
        nextY = clamp(edit.initialY + deltaYPercent, -STAGE_POSITION_LIMIT_PERCENT, initialBottom - minSize);
        nextHeight = initialBottom - nextY;
      }

      if (edge.includes("Bottom") || edge.includes("bottom") || edge === "bottom") {
        nextHeight = clamp(edit.initialHeight + deltaYPercent, minSize, STAGE_MAX_SIZE_PERCENT);
      }

      if (keepAspect && isCorner) {
        const widthChange = Math.abs(nextWidth - edit.initialWidth);
        const heightChange = Math.abs(nextHeight - edit.initialHeight);
        if (widthChange >= heightChange) {
          nextHeight = clamp(nextWidth / aspectRatio, minSize, STAGE_MAX_SIZE_PERCENT);
        } else {
          nextWidth = clamp(nextHeight * aspectRatio, minSize, STAGE_MAX_SIZE_PERCENT);
        }

        if (edge.includes("Left")) nextX = initialRight - nextWidth;
        if (edge.includes("top")) nextY = initialBottom - nextHeight;
      }

      return {
        ...layer,
        x: Number(nextX.toFixed(2)),
        y: Number(nextY.toFixed(2)),
        width: Number(nextWidth.toFixed(2)),
        height: Number(nextHeight.toFixed(2)),
      };
    }));
  }

  function beginStageEdit(
    event: ReactPointerEvent<HTMLElement>,
    layer: VideoLayer,
    mode: StageEditState["mode"],
    edge?: CanvasResizeEdge,
  ) {
    const stage = event.currentTarget.closest("[data-preview-stage]");
    const rect = stage?.getBoundingClientRect();
    if (!rect) return;

    event.preventDefault();
    event.stopPropagation();
    setStageAlignmentGuides(null);
    setSelectedLayerId(layer.id);
    setActivePanel("settings");
    if (layer.locked) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    pushHistorySnapshot();
    const centerX = rect.left + ((layer.x + layer.width / 2) / 100) * rect.width;
    const centerY = rect.top + ((layer.y + layer.height / 2) / 100) * rect.height;
    stageEditRef.current = {
      layerId: layer.id,
      mode,
      edge,
      startX: event.clientX,
      startY: event.clientY,
      initialX: layer.x,
      initialY: layer.y,
      initialWidth: layer.width,
      initialHeight: layer.height,
      initialAngle: layer.angle || 0,
      initialPointerAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI),
      centerX,
      centerY,
      stageWidth: rect.width,
      stageHeight: rect.height,
    };
  }

  function selectStageLayerAtPoint(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    const clickedLayer = layers.find((layer) => (
      layer.visible
      && currentTime >= layer.start
      && currentTime <= getLayerEnd(layer)
      && xPercent >= layer.x
      && xPercent <= layer.x + layer.width
      && yPercent >= layer.y
      && yPercent <= layer.y + layer.height
    ));

    if (!clickedLayer) {
      clearLayerSelection();
      return;
    }
    setSelectedLayerId(clickedLayer.id);
    setActivePanel("settings");
  }

  function endStageEdit(event: ReactPointerEvent<HTMLElement>) {
    if (stageEditRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      stageEditRef.current = null;
    }
    setStageAlignmentGuides(null);
  }

  function beginClipEdit(
    event: ReactPointerEvent<HTMLElement>,
    layer: VideoLayer,
    mode: ClipEditState["mode"],
  ) {
    if (layer.locked) return;
    const additiveSelection = event.ctrlKey || event.metaKey;
    if (mode === "move" && additiveSelection) {
      event.preventDefault();
      event.stopPropagation();
      selectTimelineLayer(layer, true);
      setIsPlaying(false);
      return;
    }
    const timelineTrack = event.currentTarget.closest("[data-timeline-track]");
    const rect = timelineTrack?.getBoundingClientRect();
    if (!rect) return;

    event.preventDefault();
    event.stopPropagation();
    timelineInnerRef.current?.setPointerCapture(event.pointerId);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    const initialSourceStart = getLayerSourceStart(layer);
    const sourceDuration = getLayerSourceDuration(layer);
    const initialSourceEnd = Math.min(sourceDuration, getLayerSourceEnd(layer));
    const groupedLayerIds = layer.groupId
      ? layersRef.current.filter((item) => item.groupId === layer.groupId).map((item) => item.id)
      : [layer.id];
    if (!selectedLayerIdSet.has(layer.id) || groupedLayerIds.some((id) => !selectedLayerIdSet.has(id))) selectTimelineLayer(layer);
    const movingLayerIds = selectedLayerIdSet.has(layer.id) ? selectedLayerIds : groupedLayerIds;
    setIsPlaying(false);
    clipEditRef.current = {
      pointerId: event.pointerId,
      layerId: layer.id,
      movingLayerIds,
      mode,
      startX: event.clientX,
      initialStart: layer.start,
      initialDuration: layer.duration,
      initialSourceStart,
      initialSourceEnd,
      sourceDuration,
      timelineWidth: rect.width,
      initialTrackId: layer.trackId || layer.id,
      initialLayers: applyTrackSettingsToLayers(layersRef.current, trackSettings),
      hasChanged: false,
    };
    if (mode === "move") {
      setClipDragPreview({
        layerId: layer.id,
        trackId: layer.trackId || layer.id,
        leftPercent: (layer.start / timelineViewportDuration) * 100,
        widthPercent: (layer.duration / timelineViewportDuration) * 100,
      });
    }
  }

  function endClipEdit(pointerId?: number) {
    const edit = clipEditRef.current;
    if (edit && (pointerId === undefined || edit.pointerId === pointerId)) {
      if (timelineInnerRef.current?.hasPointerCapture(edit.pointerId)) {
        timelineInnerRef.current.releasePointerCapture(edit.pointerId);
      }
      if (edit.hasChanged) {
        if (edit.mode === "move") setLayers((current) => resolveBlockingTrackOverlaps(current));
        setHistory((current) => ({
          past: [...current.past, edit.initialLayers].slice(-60),
          future: [],
        }));
      }
      clipEditRef.current = null;
      setClipDragPreview(null);
      setSnapGuideTime(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  }

  function beginTransitionResize(
    event: ReactPointerEvent<HTMLSpanElement>,
    layer: VideoLayer,
    edge: TransitionResizeState["edge"],
  ) {
    if (layer.locked) return;
    const timelineTrack = event.currentTarget.closest("[data-timeline-track]");
    const rect = timelineTrack?.getBoundingClientRect();
    if (!rect) return;

    event.preventDefault();
    event.stopPropagation();
    setIsPlaying(false);
    setSelectedLayerId(layer.id);
    setSelectedLayerIds([layer.id]);
    setActivePanel("settings");
    transitionResizeRef.current = {
      layerId: layer.id,
      edge,
      startX: event.clientX,
      initialStart: layer.start,
      initialEnd: layer.start + layer.duration,
      cutTime: layer.cutTime ?? layer.start + layer.duration / 2,
      currentStart: layer.start,
      currentDuration: layer.duration,
      timelineWidth: rect.width,
      initialLayers: applyTrackSettingsToLayers(layersRef.current, trackSettings),
      hasChanged: false,
    };
  }

  function seekFromTimelineElement(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const trackId = event.currentTarget.dataset.trackId;
    if (trackId) {
      setSelectedTrackId(trackId);
      setSelectedLayerId("");
      setSelectedLayerIds([]);
    }
    setIsPlaying(false);
    setCurrentTime(clamp(((event.clientX - rect.left) / rect.width) * timelineViewportDuration, previewRangeStart, previewRangeEnd));
  }

  function beginPlayheadDrag(event: ReactPointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    isDraggingPlayheadRef.current = true;
    const timelineElement = event.currentTarget.parentElement;
    const rect = timelineElement?.getBoundingClientRect();
    if (rect) {
      setIsPlaying(false);
      setCurrentTime(clamp(((event.clientX - rect.left) / rect.width) * timelineViewportDuration, previewRangeStart, previewRangeEnd));
    }
  }

  function dragPlayhead(event: ReactPointerEvent<HTMLSpanElement>) {
    if (!isDraggingPlayheadRef.current) return;
    const timelineElement = event.currentTarget.parentElement;
    const rect = timelineElement?.getBoundingClientRect();
    if (!rect) return;
    setCurrentTime(clamp(((event.clientX - rect.left) / rect.width) * timelineViewportDuration, previewRangeStart, previewRangeEnd));
  }

  function endPlayheadDrag(event: ReactPointerEvent<HTMLSpanElement>) {
    if (!isDraggingPlayheadRef.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    isDraggingPlayheadRef.current = false;
  }

  async function togglePlayback() {
    if (isPlaying) {
      playbackPrimeTokenRef.current += 1;
      setIsPlaybackPriming(false);
      setIsPlaying(false);
      return;
    }

    if (projectDuration <= 0 || isPlaybackPriming) return;
    const playbackStart = hasActiveRange
      ? previewRangeStart
      : currentTime >= projectDuration ? 0 : currentTime;
    const primeToken = playbackPrimeTokenRef.current + 1;
    playbackPrimeTokenRef.current = primeToken;
    currentTimeRef.current = playbackStart;
    setCurrentTime(playbackStart);
    setIsPlaybackPriming(true);

    try {
      await primePlaybackFrame(playbackStart);
      if (
        playbackPrimeTokenRef.current !== primeToken
        || Math.abs(currentTimeRef.current - playbackStart) > 0.035
      ) return;
      setIsPlaying(true);
    } finally {
      if (playbackPrimeTokenRef.current === primeToken) setIsPlaybackPriming(false);
    }
  }

  function fitTimelineToView() {
    setTimelineZoom(1);
    setStatus("Timeline fitted to view");
  }

  function zoomTimeline(delta: number) {
    setTimelineZoom((value) => {
      const factor = delta > 0 ? 1.5 : 1 / 1.5;
      return clamp(Number((value * factor).toFixed(2)), 1, TIMELINE_MAX_ZOOM);
    });
  }

  function addTextLayer() {
    const id = `text-${Date.now()}`;
    const duration = 4;
    const insert = getClipInsertPosition(duration, "visual");
    const nextLayer: VideoLayer = {
      id,
      trackId: insert.trackId,
      type: "text",
      name: `Text ${layers.filter((layer) => layer.type === "text").length + 1}`,
      start: insert.start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      trackOrder: insert.trackOrder,
      trackName: insert.trackName,
      x: 25,
      y: 40,
      width: 50,
      height: 14,
      text: "New text layer",
      color: "#ffffff",
      fontSize: 54,
      fontFamily: "Anton",
    };
    insertLayerAfterSelection(nextLayer);
    setActivePanel("settings");
    setIsSidebarOpen(true);
    setIsMobilePanelOpen(false);
    setIsMobileTimelineOpen(false);
  }

  function addTextPreset(preset: TextTemplatePreset) {
    const id = `text-${Date.now()}`;
    ensureVideoMakerFontLoaded(preset.fontFamily);
    const duration = Math.min(4, Math.max(0, timelineViewportDuration - currentTime)) || 2;
    const insert = getClipInsertPosition(duration, "visual");
    const nextLayer: VideoLayer = {
      id,
      trackId: insert.trackId,
      type: "text",
      name: preset.label,
      start: insert.start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      trackOrder: insert.trackOrder,
      trackName: insert.trackName,
      x: 8,
      y: preset.label === "Body Caption" ? 72 : 48,
      width: preset.label === "Body Caption" ? 54 : 70,
      height: preset.label === "Body Caption" ? 9 : 14,
      text: preset.text,
      color: preset.color,
      fontSize: preset.fontSize,
      fontFamily: preset.fontFamily,
      ...(preset.patch || {}),
      animations: preset.animation ? [{
        id: `animation-${preset.id || "text"}-${Date.now()}`,
        type: preset.animation,
        start: 0,
        duration: preset.animationDuration || 0.8,
        phase: "in",
      }] : preset.patch?.animations,
    };
    insertLayerAfterSelection(nextLayer);
    setStatus(`${preset.label} text template added`);
  }

  function addLowerThird(template: LowerThirdTemplate) {
    const id = `lower-third-${template.id}-${Date.now()}`;
    const duration = 5;
    const insert = getClipInsertPosition(duration, "visual");
    const isVertical = selectedFormat.height > selectedFormat.width;
    const nextLayer: VideoLayer = {
      id,
      trackId: insert.trackId,
      type: "lower-third",
      name: template.name,
      start: insert.start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      trackOrder: insert.trackOrder,
      trackName: insert.trackName,
      x: 5,
      y: isVertical ? 78 : 74,
      width: isVertical ? 90 : 58,
      height: isVertical ? 14 : 18,
      angle: 0,
      lowerThird: createLowerThirdConfig(template.id),
    };
    insertLayerAfterSelection(nextLayer);
    setStatus(`${template.name} lower third added`);
  }

  function getPersonalLibraryAssets(layer: VideoLayer) {
    const assetIds = new Set<string>();
    if (layer.assetKey) assetIds.add(layer.assetKey);
    if (layer.lowerThird?.content.logoSourceId) assetIds.add(layer.lowerThird.content.logoSourceId);
    return Array.from(assetIds).flatMap((assetId): PersonalLibraryAsset[] => {
      const mediaAsset = mediaAssetsRef.current.get(assetId);
      const imported = importsRef.current.find((item) => item.id === assetId);
      if (!mediaAsset && !imported) return [];
      const kind = mediaAsset?.kind || imported?.kind || "image";
      const url = mediaAsset?.persistentUrl || imported?.persistentUrl || mediaAsset?.url || imported?.url || "";
      if (!url) return [];
      return [{
        id: assetId,
        name: imported?.name || layer.name || "Library asset",
        kind,
        url,
        persistentUrl: mediaAsset?.persistentUrl || imported?.persistentUrl,
        duration: mediaAsset?.duration || imported?.duration,
        size: imported?.size,
        metadata: mediaAsset?.metadata || imported?.metadata,
      }];
    });
  }

  async function saveSelectedToPersonalLibrary(
    sourceLayer?: VideoLayer,
    options: { collection?: PersonalLibraryCollection; navigate?: boolean; silent?: boolean } = {},
  ) {
    const layer = sourceLayer || layersRef.current.find((item) => item.id === selectedLayerId);
    if (!layer || layer.type === "transition" || layer.type === "audio") {
      setStatus("Select a logo, lower third, text, shape, frame, image or video first");
      return;
    }
    const assets = getPersonalLibraryAssets(layer);
    if (assets.some((asset) => asset.url.startsWith("blob:"))) {
      setStatus("Wait until the selected media finishes saving before adding it to My Library");
      return;
    }
    const now = new Date().toISOString();
    const item: PersonalLibraryItem = {
      id: globalThis.crypto?.randomUUID?.() || `library-${Date.now()}`,
      name: layer.name || "Saved element",
      kind: layer.type === "media" ? "media" : layer.type === "lower-third" ? "lower-third" : layer.type === "text" ? "text" : layer.type === "shape" ? "shape" : "element",
      layer: JSON.parse(JSON.stringify({
        ...layer,
        id: "library-template",
        trackId: "",
        trackOrder: 0,
        trackName: "",
        start: 0,
        locked: false,
        groupId: undefined,
        linkedVideoLayerId: undefined,
      })) as VideoLayer,
      assets,
      createdAt: now,
      updatedAt: now,
      collection: options.collection || "general",
    };

    setPersonalLibraryStatus("saving");
    try {
      const bridge = getPixoresDesktopBridge();
      let items: PersonalLibraryItem[];
      if (bridge?.saveElementLibraryItem) {
        items = (await bridge.saveElementLibraryItem({ userKey: personalLibraryUserKey, item })).items as PersonalLibraryItem[];
      } else {
        items = [item, ...personalLibraryItems];
        localStorage.setItem(`${PERSONAL_ELEMENT_LIBRARY_KEY}:${personalLibraryUserKey}`, JSON.stringify(items));
      }
      setPersonalLibraryItems(items);
      setPersonalLibraryStatus("ready");
      if (options.navigate !== false) {
        setActiveElementTab("my-library");
        setPersonalLibraryCollection(options.collection || "general");
      }
      if (!options.silent) setStatus(`${item.name} saved to My Library`);
    } catch (error) {
      setPersonalLibraryStatus("error");
      setStatus(`My Library could not save the element: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async function saveImportedAssetToChatGptLibrary(item: ImportedAsset) {
    const box = getInitialMediaBox(mediaAssetsRef.current.get(item.id));
    const layer: VideoLayer = {
      id: `chatgpt-library-${item.id}`,
      trackId: "",
      type: "media",
      name: item.name,
      start: 0,
      duration: 5,
      visible: true,
      locked: false,
      opacity: 1,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      src: item.persistentUrl || item.url,
      mediaKind: "image",
      assetKey: item.id,
      objectFit: "contain",
    };
    await saveSelectedToPersonalLibrary(layer, { collection: "chatgpt", navigate: false, silent: true });
  }

  function saveImportedAssetToPersonalLibrary(item: ImportedAsset) {
    const box = getInitialMediaBox(mediaAssetsRef.current.get(item.id));
    const duration = item.kind === "image" ? 5 : Math.max(0.2, item.duration || 5);
    const layer: VideoLayer = {
      id: `library-import-${item.id}`,
      trackId: "",
      type: "media",
      name: item.name,
      start: 0,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      src: item.persistentUrl || item.url,
      mediaKind: item.kind,
      assetKey: item.id,
      objectFit: "contain",
    };
    void saveSelectedToPersonalLibrary(layer);
  }

  async function removePersonalLibraryItem(id: string) {
    try {
      const bridge = getPixoresDesktopBridge();
      let items: PersonalLibraryItem[];
      if (bridge?.removeElementLibraryItem) {
        items = (await bridge.removeElementLibraryItem({ userKey: personalLibraryUserKey, id })).items as PersonalLibraryItem[];
      } else {
        items = personalLibraryItems.filter((item) => item.id !== id);
        localStorage.setItem(`${PERSONAL_ELEMENT_LIBRARY_KEY}:${personalLibraryUserKey}`, JSON.stringify(items));
      }
      setPersonalLibraryItems(items);
      setStatus("Element removed from My Library");
    } catch (error) {
      setStatus(`Could not remove the library element: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  function addPersonalLibraryItem(item: PersonalLibraryItem) {
    const stamp = Date.now();
    const assetIdMap = new Map<string, string>();
    const restoredImports: ImportedAsset[] = [];

    item.assets.forEach((asset, index) => {
      const assetId = `my-library-media-${stamp}-${index}`;
      const url = createDesktopMediaUrl(asset.persistentUrl || asset.url);
      assetIdMap.set(asset.id, assetId);
      if (asset.kind === "image") {
        const image = new Image();
        loadCanvasPreviewImage(image, url, () => setMediaLoadTick((value) => value + 1));
        mediaAssetsRef.current.set(assetId, { kind: "image", image, url, persistentUrl: asset.persistentUrl || asset.url, duration: asset.duration, metadata: asset.metadata });
      } else {
        const element = document.createElement(asset.kind);
        element.src = url;
        element.preload = "auto";
        element.crossOrigin = "anonymous";
        if (element instanceof HTMLVideoElement) {
          element.muted = true;
          element.playsInline = true;
          mediaAssetsRef.current.set(assetId, { kind: "video", video: element, url, persistentUrl: asset.persistentUrl || asset.url, duration: asset.duration, metadata: asset.metadata });
        } else {
          mediaAssetsRef.current.set(assetId, { kind: "audio", audio: element, url, persistentUrl: asset.persistentUrl || asset.url, duration: asset.duration, metadata: asset.metadata });
        }
        element.load();
      }
      restoredImports.push({ ...asset, id: assetId, url, persistentUrl: asset.persistentUrl || asset.url, uploadStatus: "ready" });
    });
    if (restoredImports.length) setImports((current) => [...restoredImports, ...current]);

    const sourceLayer = JSON.parse(JSON.stringify(item.layer)) as VideoLayer;
    const duration = Math.max(0.2, sourceLayer.duration || 5);
    const placement = getClipInsertPosition(duration, sourceLayer.type === "audio" ? "audio" : "visual");
    const sourceLogoId = sourceLayer.lowerThird?.content.logoSourceId;
    const nextLayer: VideoLayer = {
      ...sourceLayer,
      id: `my-library-${item.kind}-${stamp}`,
      trackId: placement.trackId,
      trackOrder: placement.trackOrder,
      trackName: placement.trackName,
      start: placement.start,
      duration,
      locked: false,
      visible: true,
      assetKey: sourceLayer.assetKey ? assetIdMap.get(sourceLayer.assetKey) || sourceLayer.assetKey : undefined,
      src: sourceLayer.assetKey ? (item.assets.find((asset) => asset.id === sourceLayer.assetKey)?.persistentUrl || item.assets.find((asset) => asset.id === sourceLayer.assetKey)?.url || sourceLayer.src) : sourceLayer.src,
      lowerThird: sourceLayer.lowerThird ? {
        ...sourceLayer.lowerThird,
        content: {
          ...sourceLayer.lowerThird.content,
          logoSourceId: sourceLogoId ? assetIdMap.get(sourceLogoId) || sourceLogoId : undefined,
        },
      } : undefined,
      groupId: undefined,
      linkedVideoLayerId: undefined,
    };
    insertLayerAfterSelection(nextLayer);
    setStatus(`${item.name} added from My Library`);
  }

  function createMediaLayerFromAsset(asset: { name: string; src: string }) {
    const id = `asset-${Date.now()}`;
    const assetKey = `library-${asset.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const targetFrame = layersRef.current.find((layer) => (
      layer.id === selectedLayerId
      && layer.type === "shape"
      && isMediaContainerShape(layer.shapeType)
    ));
    const duration = targetFrame?.duration || Math.min(5, Math.max(0, timelineViewportDuration - currentTime)) || 2;
    const insert = getClipInsertPosition(duration, "visual");
    const image = new Image();
    loadCanvasPreviewImage(
      image,
      asset.src,
      () => setMediaLoadTick((value) => value + 1),
      () => setStatus(`${asset.name} could not be loaded in the preview`),
    );
    mediaAssetsRef.current.set(assetKey, { kind: "image", image, url: asset.src });

    const nextLayer: VideoLayer = {
      id,
      trackId: insert.trackId,
      type: "media",
      name: asset.name,
      start: targetFrame?.start ?? insert.start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      trackOrder: insert.trackOrder,
      trackName: insert.trackName,
      x: 30,
      y: 24,
      width: 40,
      height: 40,
      src: asset.src,
      mediaKind: "image",
      assetKey,
      objectFit: "contain",
    };
    insertLayerAfterSelection(nextLayer);
    if (targetFrame) {
      attachMediaToNextFrameSlot(targetFrame.id, nextLayer.id);
      setStatus(`${asset.name} embedded in ${targetFrame.name}`);
    } else {
      setStatus(`${asset.name} added`);
    }
  }

  function addShapeLayer(preset: { name: string; shapeType: ShapeType; color: string }, gradient?: { color1: string; color2: string }) {
    const id = `shape-${Date.now()}`;
    const isLine = preset.shapeType === "line" || preset.shapeType === "dashedLine";
    const isFrame = isMediaContainerShape(preset.shapeType);
    const mediaToEmbed = isFrame
      ? layersRef.current.find((layer) => layer.id === selectedLayerId && layer.type === "media")
      : undefined;
    const fittedFrameBounds = mediaToEmbed && isFrame
      ? getAutoFittedFrameBounds(mediaToEmbed, preset.shapeType)
      : undefined;
    const duration = mediaToEmbed?.duration || Math.min(5, Math.max(0, timelineViewportDuration - currentTime)) || 2;
    const insert = getClipInsertPosition(duration, "visual");
    const nextLayer: VideoLayer = {
      id,
      trackId: insert.trackId,
      type: "shape",
      name: preset.name,
      start: mediaToEmbed?.start ?? insert.start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      trackOrder: insert.trackOrder,
      trackName: insert.trackName,
      x: fittedFrameBounds?.x ?? mediaToEmbed?.x ?? (isFrame ? 18 : 32),
      y: fittedFrameBounds?.y ?? mediaToEmbed?.y ?? (isFrame ? 18 : 30),
      width: fittedFrameBounds?.width ?? mediaToEmbed?.width ?? (isLine ? 42 : isFrame ? 64 : 28),
      height: fittedFrameBounds?.height ?? mediaToEmbed?.height ?? (isLine ? 5 : isFrame ? 52 : 28),
      color: preset.color,
      shapeType: preset.shapeType,
      frameMediaLayerIds: mediaToEmbed ? [mediaToEmbed.id] : isFrame ? [] : undefined,
      gradientColor1: gradient?.color1,
      gradientColor2: gradient?.color2,
    };
    insertLayerAfterSelection(nextLayer);
    setStatus(mediaToEmbed ? `${mediaToEmbed.name} embedded in ${preset.name}` : isFrame ? `${preset.name} added — choose media in Frame media slots` : `${preset.name} added`);
  }

  function addCanvasBackgroundPreset(preset: CanvasBackgroundPreset) {
    const id = `canvas-background-${preset.id}-${Date.now()}`;
    const duration = Math.max(5, projectDuration, timelineDuration - TIMELINE_EMPTY_TAIL_SECONDS);
    const trackOrder = Math.max(
      0,
      ...trackSettings.map((track) => track.order + 1),
      ...layersRef.current.map((layer) => (layer.trackOrder ?? 0) + 1),
    );
    const trackId = `background-track-${Date.now()}`;
    const nextLayer: VideoLayer = {
      id,
      trackId,
      type: "shape",
      name: preset.name,
      start: 0,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      trackOrder,
      trackName: `Background · ${preset.name}`,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      color: preset.color1,
      shapeType: preset.color2 ? "gradient" : "rectangle",
      gradientColor1: preset.color2 ? preset.color1 : undefined,
      gradientColor2: preset.color2,
    };
    commitLayers((current) => orderLayersByTrackAndTime([...current, nextLayer]));
    setTrackSettings((current) => [...current, {
      id: trackId,
      order: trackOrder,
      name: nextLayer.trackName || preset.name,
      muted: false,
    }].sort((first, second) => first.order - second.order));
    setSelectedLayerId(id);
    setSelectedTrackId(trackId);
    setActivePanel("settings");
    setStatus(`${preset.name} canvas background added`);
  }

  function addTransitionLayer(preset: TransitionPreset) {
    const cut = findSelectedTransitionCut();
    if (!cut) {
      setStatus(`Drag ${preset.name} onto a cut between touching image/video clips`);
      return;
    }
    addTransitionAtCut(preset, cut.trackId, cut.cutTime, cut.fromLayer.id, cut.toLayer.id);
  }

  function handleTransitionDrop(event: ReactDragEvent<HTMLDivElement>, trackId: string) {
    event.preventDefault();
    event.stopPropagation();
    const transitionKind = (
      event.dataTransfer.getData("application/x-pixores-transition-kind")
      || event.dataTransfer.getData("text/plain")
    ) as TransitionType;
    if (!transitionKind) return;

    const preset = basicTransitionPresets.find((item) => item.transitionKind === transitionKind);
    if (!preset) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const dropTime = clamp(((event.clientX - rect.left) / rect.width) * timelineViewportDuration, 0, timelineViewportDuration);
    const cut = findTransitionCut(trackId, dropTime);
    if (!cut) {
      setStatus("Drop transitions only on a cut between touching image/video clips");
      return;
    }

    addTransitionAtCut(preset, trackId, cut.cutTime, cut.fromLayer.id, cut.toLayer.id);
  }

  function addEmojiLayer(item: { name: string; emoji: string }) {
    const id = `emoji-${Date.now()}`;
    const duration = Math.min(4, Math.max(0, timelineViewportDuration - currentTime)) || 2;
    const insert = getClipInsertPosition(duration, "visual");
    const nextLayer: VideoLayer = {
      id,
      trackId: insert.trackId,
      type: "text",
      name: item.name,
      start: insert.start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      trackOrder: insert.trackOrder,
      trackName: insert.trackName,
      x: 38,
      y: 34,
      width: 24,
      height: 24,
      text: item.emoji,
      color: "#ffffff",
      fontSize: 96,
      fontFamily: "Arial",
    };
    insertLayerAfterSelection(nextLayer);
  }

  async function registerBuiltInMediaAsset(item: PixoresBuiltInMediaAsset) {
    const assetKey = `built-in-${item.id}`;
    const existing = mediaAssetsRef.current.get(assetKey);
    if (existing?.duration) return { assetKey, asset: existing };

    const url = resolveBuiltInMediaUrl(item.path);
    const metadata: PixoresMediaMetadata = {
      analyzer: "browser",
      analyzedAt: new Date().toISOString(),
      mimeType: item.mimeType,
      size: item.size,
      hasVideo: item.kind === "video",
      hasAudio: item.kind === "audio" ? true : undefined,
    };
    const element = document.createElement(item.kind);
    element.src = url;
    element.preload = "auto";
    element.crossOrigin = "anonymous";
    if (element instanceof HTMLVideoElement) {
      element.muted = true;
      element.playsInline = true;
      element.loop = false;
      element.onloadeddata = () => setMediaLoadTick((value) => value + 1);
      element.oncanplay = () => setMediaLoadTick((value) => value + 1);
      element.onseeked = () => setMediaLoadTick((value) => value + 1);
    }

    const mediaAsset: MediaAsset = item.kind === "video"
      ? { kind: "video", video: element as HTMLVideoElement, url, persistentUrl: url, metadata }
      : { kind: "audio", audio: element as HTMLAudioElement, url, persistentUrl: url, metadata };
    mediaAssetsRef.current.set(assetKey, mediaAsset);

    const duration = await new Promise<number>((resolve) => {
      let completed = false;
      const finish = (value: number) => {
        if (completed) return;
        completed = true;
        window.clearTimeout(timeoutId);
        element.removeEventListener("loadedmetadata", loaded);
        element.removeEventListener("error", failed);
        resolve(value);
      };
      const loaded = () => finish(Number.isFinite(element.duration) && element.duration > 0
        ? element.duration
        : item.kind === "video" ? 5 : 2);
      const failed = () => finish(item.kind === "video" ? 5 : 2);
      const timeoutId = window.setTimeout(failed, 12000);
      element.addEventListener("loadedmetadata", loaded);
      element.addEventListener("error", failed);
      if (element.readyState >= 1) loaded();
      else element.load();
    });

    const completedMetadata: PixoresMediaMetadata = {
      ...metadata,
      duration,
      width: element instanceof HTMLVideoElement ? element.videoWidth || undefined : undefined,
      height: element instanceof HTMLVideoElement ? element.videoHeight || undefined : undefined,
    };
    mediaAsset.duration = duration;
    mediaAsset.metadata = completedMetadata;
    const importedAsset: ImportedAsset = {
      id: assetKey,
      name: `${item.title}.${item.kind === "video" ? "mp4" : "mp3"}`,
      kind: item.kind,
      url,
      persistentUrl: url,
      uploadStatus: "ready",
      duration,
      size: item.size,
      metadata: completedMetadata,
    };
    setImports((current) => current.some((asset) => asset.id === assetKey)
      ? current.map((asset) => asset.id === assetKey ? importedAsset : asset)
      : [importedAsset, ...current]);
    return { assetKey, asset: mediaAsset };
  }

  async function addVideoBackgroundFromLibrary(item: PixoresBuiltInMediaAsset) {
    setStatus(`Loading ${item.title}...`);
    const { assetKey, asset } = await registerBuiltInMediaAsset(item);
    const duration = Math.max(0.2, asset.duration || 5);
    const layerId = `video-background-${item.id}-${Date.now()}`;
    const start = Number(clamp(currentTime, 0, timelineViewportDuration).toFixed(3));
    const nextLayer: VideoLayer = {
      id: layerId,
      trackId: `video-background-track-${layerId}`,
      type: "media",
      name: item.title,
      start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      trackOrder: 0,
      trackName: item.title,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      src: asset.url,
      mediaKind: "video",
      assetKey,
      sourceStart: 0,
      trimStart: 0,
      sourceEnd: duration,
      trimEnd: duration,
      sourceDuration: duration,
      objectFit: "cover",
      volume: 0,
      muted: true,
    };
    insertLayerAfterSelection(nextLayer);
    setStatus(`${item.title} added at the playhead`);
  }

  async function addSoundEffectFromLibrary(item: PixoresBuiltInMediaAsset) {
    setStatus(`Loading ${item.title}...`);
    const { assetKey, asset } = await registerBuiltInMediaAsset(item);
    const duration = Math.max(0.2, asset.duration || 2);
    const layerId = `sound-effect-${item.id}-${Date.now()}`;
    const start = Number(clamp(currentTime, 0, timelineViewportDuration).toFixed(3));
    const nextLayer: VideoLayer = {
      id: layerId,
      trackId: `sound-effect-track-${layerId}`,
      type: "audio",
      name: item.title,
      start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      trackOrder: 0,
      trackName: item.title,
      x: 0,
      y: 0,
      width: 100,
      height: 8,
      src: asset.url,
      mediaKind: "audio",
      assetKey,
      sourceStart: 0,
      trimStart: 0,
      sourceEnd: duration,
      trimEnd: duration,
      sourceDuration: duration,
      volume: 1,
    };
    insertLayerAfterSelection(nextLayer);
    setStatus(`${item.title} added at the playhead`);
  }

  function toggleSoundEffectPreview(item: PixoresBuiltInMediaAsset) {
    const currentPreview = soundEffectPreviewRef.current;
    if (currentPreview && previewingSoundEffectId === item.id && !currentPreview.paused) {
      currentPreview.pause();
      setPreviewingSoundEffectId("");
      return;
    }
    currentPreview?.pause();
    const audio = new Audio(resolveBuiltInMediaUrl(item.path));
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.volume = 0.85;
    audio.onended = () => {
      if (soundEffectPreviewRef.current === audio) {
        soundEffectPreviewRef.current = null;
        setPreviewingSoundEffectId("");
      }
    };
    soundEffectPreviewRef.current = audio;
    setPreviewingSoundEffectId(item.id);
    void audio.play().catch(() => {
      if (soundEffectPreviewRef.current === audio) soundEffectPreviewRef.current = null;
      setPreviewingSoundEffectId("");
      setStatus("Sound preview could not be played");
    });
  }

  function importAudioStudioOutputs(items: PixoresVideoStartAudioItem[]) {
    const validItems = items.filter((item) => item?.outputUrl && item?.name).slice(0, 50);
    if (!validItems.length) return 0;
    const importedAssets = validItems.map((item, index) => {
      const id = `audio-studio-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
      const url = createDesktopMediaUrl(item.outputUrl);
      const metadata: PixoresMediaMetadata = {
        analyzer: "ffprobe",
        analyzedAt: new Date().toISOString(),
        mimeType: item.mimeType || "audio/mpeg",
        size: item.size,
        hasVideo: false,
        hasAudio: true,
      };
      const audio = document.createElement("audio");
      const mediaAsset: MediaAsset = { kind: "audio", audio, url, persistentUrl: url, metadata };
      audio.src = url;
      audio.preload = "metadata";
      audio.crossOrigin = "anonymous";
      audio.onloadedmetadata = () => {
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
        const completedMetadata = { ...metadata, duration: audio.duration };
        mediaAsset.duration = audio.duration;
        mediaAsset.metadata = completedMetadata;
        setImports((current) => current.map((asset) => asset.id === id ? { ...asset, duration: audio.duration, metadata: completedMetadata } : asset));
      };
      audio.load();
      mediaAssetsRef.current.set(id, mediaAsset);
      return {
        id,
        name: item.name,
        kind: "audio" as const,
        url,
        persistentUrl: url,
        uploadStatus: "ready" as const,
        size: item.size,
        metadata,
        origin: "local" as const,
      };
    });
    setImports((current) => {
      const next = [...importedAssets, ...current];
      importsRef.current = next;
      return next;
    });
    setSelectedImportId(importedAssets[0].id);
    openToolPanel("imports");
    return importedAssets.length;
  }

  async function importMediaFile(
    file: File,
    options: { origin?: "local" | "chatgpt"; saveToChatGptLibrary?: boolean } = {},
  ) {
    const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");
    const assetKind: ImportedAsset["kind"] = isVideo ? "video" : isAudio ? "audio" : "image";
    const baseMetadata: PixoresMediaMetadata = {
      analyzer: "browser",
      analyzedAt: new Date().toISOString(),
      mimeType: file.type || undefined,
      size: file.size,
      hasVideo: isVideo,
      hasAudio: isAudio || isVideo ? undefined : false,
    };
    const asset: MediaAsset = { kind: assetKind, url, metadata: baseMetadata, sourceFile: file };

    if (isVideo) {
      const video = document.createElement("video");
      video.src = url;
      video.muted = false;
      video.playsInline = true;
      video.loop = false;
      video.preload = "auto";
      video.crossOrigin = "anonymous";
      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          const metadata: PixoresMediaMetadata = {
            ...baseMetadata,
            duration: video.duration,
            width: video.videoWidth || undefined,
            height: video.videoHeight || undefined,
            hasVideo: true,
          };
          asset.duration = video.duration;
          asset.metadata = metadata;
          setImports((current) => current.map((item) => (
            item.id === id ? { ...item, duration: video.duration, metadata } : item
          )));
        }
      };
      video.onloadeddata = () => setMediaLoadTick((value) => value + 1);
      video.oncanplay = () => setMediaLoadTick((value) => value + 1);
      video.onseeked = () => setMediaLoadTick((value) => value + 1);
      video.load();
      asset.video = video;
    } else if (isAudio) {
      const audio = document.createElement("audio");
      audio.src = url;
      audio.crossOrigin = "anonymous";
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          const metadata: PixoresMediaMetadata = {
            ...baseMetadata,
            duration: audio.duration,
            hasVideo: false,
            hasAudio: true,
          };
          asset.duration = audio.duration;
          asset.metadata = metadata;
          setImports((current) => current.map((item) => (
            item.id === id ? { ...item, duration: audio.duration, metadata } : item
          )));
        }
      };
      asset.audio = audio;
    } else {
      const image = new Image();
      image.src = url;
      image.onload = () => {
        const metadata: PixoresMediaMetadata = {
          ...baseMetadata,
          width: image.naturalWidth || undefined,
          height: image.naturalHeight || undefined,
          hasVideo: false,
          hasAudio: false,
        };
        asset.metadata = metadata;
        setImports((current) => current.map((item) => (
          item.id === id ? { ...item, metadata } : item
        )));
      };
      asset.image = image;
    }

    mediaAssetsRef.current.set(id, asset);
    setImports((current) => [{
      id,
      name: file.name,
      kind: assetKind,
      url,
      duration: asset.duration,
      size: file.size,
      metadata: baseMetadata,
      uploadStatus: "uploading",
      origin: options.origin || "local",
    }, ...current]);
    setSelectedImportId(id);
    openToolPanel("imports");
    setStatus(isVideo ? "Video imported. Uploading asset..." : isAudio ? "Audio imported. Uploading asset..." : "Image imported. Uploading asset...");
    const uploaded = await queueImportedAssetUpload(id, file);
    const imported = importsRef.current.find((item) => item.id === id);
    if (uploaded && imported && options.saveToChatGptLibrary && imported.kind === "image") {
      await saveImportedAssetToChatGptLibrary(imported);
      setStatus(`${file.name} imported and saved in Creations from ChatGPT`);
    }
    return id;
  }

  async function removeSelectedImageBackground() {
    const layer = layersRef.current.find((item) => item.id === selectedLayerId);
    if (!layer || layer.type !== "media" || layer.mediaKind !== "image" || layer.locked || isRemovingImageBackground) return;
    const sourceAsset = layer.assetKey ? mediaAssetsRef.current.get(layer.assetKey) : undefined;
    const sourceUrl = sourceAsset?.persistentUrl || sourceAsset?.url || layer.src;
    if (!sourceUrl) {
      setStatus("The selected image source is unavailable");
      return;
    }

    setIsRemovingImageBackground(true);
    setStatus("Removing image background with AI...");
    try {
      const [{ data: sessionData }, sourceResponse] = await Promise.all([
        supabase.auth.getSession(),
        fetch(createDesktopMediaUrl(sourceUrl)),
      ]);
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sign in to Pixores before using AI background removal.");
      if (!sourceResponse.ok) throw new Error("The selected image could not be read.");
      const sourceBlob = await sourceResponse.blob();
      const sourceName = `${layer.name || "image"}.png`;
      const bridge = getPixoresDesktopBridge();
      let resultBlob: Blob;

      if (bridge?.removeImageBackground) {
        const result = await bridge.removeImageBackground({
          accessToken,
          name: sourceName,
          mimeType: sourceBlob.type || "image/png",
          bytes: await sourceBlob.arrayBuffer(),
        });
        resultBlob = new Blob([result.bytes], { type: result.mimeType || "image/png" });
      } else {
        const formData = new FormData();
        formData.append("file", new File([sourceBlob], sourceName, { type: sourceBlob.type || "image/png" }));
        const response = await fetch("/api/ai-background-remover", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });
        if (!response.ok) {
          const message = await response.text();
          let detail = message;
          try {
            const parsed = JSON.parse(message) as { error?: string };
            detail = parsed.error === "NO_CREDITS" ? "No AI credits remain on this Pixores account." : parsed.error || message;
          } catch {
            // Keep the response text.
          }
          throw new Error(detail || "Background removal failed.");
        }
        resultBlob = await response.blob();
      }

      const outputName = `${layer.name || "image"} - background removed.png`;
      const assetId = await importMediaFile(new File([resultBlob], outputName, { type: "image/png" }));
      const outputAsset = mediaAssetsRef.current.get(assetId);
      updateLayer(layer.id, {
        name: outputName.replace(/\.png$/i, ""),
        assetKey: assetId,
        src: outputAsset?.persistentUrl || outputAsset?.url,
        mediaKind: "image",
      });
      setSelectedLayerId(layer.id);
      setStatus("Background removed. The transparent PNG was added to Imports and applied to the selected element.");
    } catch (error) {
      setStatus(`Background removal failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsRemovingImageBackground(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    for (const file of files) void importMediaFile(file);
  }

  function handleAnimatedFrameFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const targetLayer = layersRef.current.find((layer) => (
      layer.id === selectedLayerId
      && layer.type === "media"
      && (layer.mediaKind === "image" || layer.mediaKind === "video")
    ));
    if (!targetLayer) {
      setStatus("Select an image or video before importing an animated frame");
      return;
    }
    if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) {
      setStatus("Animated frames must be video files");
      return;
    }

    const id = `animated-frame-${Date.now()}`;
    const url = URL.createObjectURL(file);
    const baseMetadata: PixoresMediaMetadata = {
      analyzer: "browser",
      analyzedAt: new Date().toISOString(),
      mimeType: file.type || undefined,
      size: file.size,
      hasVideo: true,
    };
    const video = document.createElement("video");
    const asset: MediaAsset = { kind: "video", video, url, metadata: baseMetadata, sourceFile: file };
    let inserted = false;
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.onloadedmetadata = () => {
      const sourceDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : targetLayer.duration;
      const duration = Number(Math.max(0.2, Math.min(targetLayer.duration, sourceDuration)).toFixed(3));
      const metadata: PixoresMediaMetadata = {
        ...baseMetadata,
        duration: sourceDuration,
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        hasVideo: true,
      };
      asset.duration = sourceDuration;
      asset.metadata = metadata;
      setImports((current) => current.map((item) => item.id === id ? { ...item, duration: sourceDuration, metadata } : item));
      if (inserted) return;
      inserted = true;
      const animatedFrameLayer: VideoLayer = {
        id: `layer-${id}`,
        trackId: `track-${id}`,
        type: "media",
        name: `Animated frame · ${file.name}`,
        start: targetLayer.start,
        duration,
        visible: true,
        locked: false,
        opacity: 1,
        trackOrder: 0,
        trackName: "Animated Frame",
        x: targetLayer.x,
        y: targetLayer.y,
        width: targetLayer.width,
        height: targetLayer.height,
        angle: targetLayer.angle,
        isFlippedH: targetLayer.isFlippedH,
        isFlippedV: targetLayer.isFlippedV,
        src: url,
        mediaKind: "video",
        assetKey: id,
        objectFit: "contain",
        blendMode: "normal",
        effect: {
          preset: "chromaKey",
          intensity: 1,
          chromaKey: {
            color: "#000000",
            similarity: 0.12,
            smoothness: 0.1,
            spill: 0,
          },
        },
        sourceStart: 0,
        trimStart: 0,
        sourceEnd: duration,
        trimEnd: duration,
        sourceDuration,
        volume: 0,
        muted: true,
      };
      insertLayerAfterSelection(animatedFrameLayer);
      setStatus("Animated frame added · black removed automatically");
    };
    video.onloadeddata = () => setMediaLoadTick((value) => value + 1);
    video.oncanplay = () => setMediaLoadTick((value) => value + 1);
    video.load();
    mediaAssetsRef.current.set(id, asset);
    setImports((current) => [{
      id,
      name: file.name,
      kind: "video",
      url,
      size: file.size,
      metadata: baseMetadata,
      uploadStatus: "uploading",
    }, ...current]);
    void queueImportedAssetUpload(id, file);
    setStatus("Preparing animated frame and removing black…");
  }

  function createAudioLayerFromVideo(videoLayer: VideoLayer, suffix = Date.now().toString()): VideoLayer {
    const videoTrackOrder = getTrackOrder(getTrackId(videoLayer), trackSettings, videoLayer.trackOrder ?? 0);
    return {
      id: `audio-${videoLayer.id}-${suffix}`,
      trackId: `audio-track-${videoLayer.id}-${suffix}`,
      type: "audio",
      name: `Audio: ${videoLayer.name}`,
      trackOrder: videoTrackOrder + 1,
      trackName: `Audio: ${videoLayer.trackName || videoLayer.name}`,
      start: videoLayer.start,
      duration: videoLayer.duration,
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 8,
      src: videoLayer.src,
      mediaKind: "video",
      assetKey: videoLayer.assetKey,
      sourceStart: getLayerSourceStart(videoLayer),
      sourceEnd: videoLayer.sourceEnd,
      trimStart: getLayerSourceStart(videoLayer),
      trimEnd: videoLayer.trimEnd,
      linkedVideoLayerId: videoLayer.id,
      volume: getClipVolume(videoLayer),
      muted: videoLayer.muted,
    };
  }

  async function uploadImportedAsset(assetId: string, file: File) {
    setImports((current) => {
      const next = current.map((item) => (
        item.id === assetId ? { ...item, uploadStatus: "uploading" as const } : item
      ));
      importsRef.current = next;
      return next;
    });

    try {
      const payload = await adapters.assetAdapter.importAsset(file, {
        projectTitle,
        kind: file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image",
      });
      const persistentUrl = payload.assetUrl || undefined;
      let previewUrl = payload.previewUrl || undefined;
      const metadata = payload.metadata;
      const analyzedDuration = metadata?.duration;
      const analyzedSize = payload.size || metadata?.size || file.size;

      const mediaAsset = mediaAssetsRef.current.get(assetId);
      const preparedVideo = mediaAsset?.kind === "video" && previewUrl
        ? await loadPreparedVideoElement(previewUrl)
        : null;
      if (mediaAsset?.kind === "video" && previewUrl && !preparedVideo) previewUrl = undefined;
      if (mediaAsset) {
        const nextUrl = previewUrl || mediaAsset.url;
        const mediaElement = mediaAsset.kind === "video" ? mediaAsset.video : mediaAsset.kind === "audio" ? mediaAsset.audio : undefined;
        if (preparedVideo) {
          mediaElement?.pause();
          preparedVideo.onseeked = () => setMediaLoadTick((value) => value + 1);
          preparedVideo.oncanplay = () => setMediaLoadTick((value) => value + 1);
        }
        mediaAssetsRef.current.set(assetId, {
          ...mediaAsset,
          url: nextUrl,
          video: preparedVideo || mediaAsset.video,
          persistentUrl,
          duration: analyzedDuration || mediaAsset.duration,
          metadata: metadata || mediaAsset.metadata,
        });
        if (preparedVideo) setMediaLoadTick((value) => value + 1);
      }
      if (payload.waveformPeaks?.length) {
        waveformPeaksRef.current = { ...waveformPeaksRef.current, [assetId]: payload.waveformPeaks };
        setWaveformPeaks(waveformPeaksRef.current);
      }
      setImports((current) => {
        const next = current.map((item) => (
          item.id === assetId ? {
          ...item,
          url: previewUrl || item.url,
          persistentUrl,
          uploadStatus: "ready" as const,
          duration: analyzedDuration || item.duration,
          size: analyzedSize,
          metadata: metadata || item.metadata,
          waveformPeaks: payload.waveformPeaks || item.waveformPeaks,
        } : item
        ));
        importsRef.current = next;
        return next;
      });
      setStatus(metadata?.analyzer === "ffprobe" || metadata?.analyzer === "sharp"
        ? "Media analyzed and ready"
        : adapters.assetAdapter.kind === "desktop" ? "Desktop adapter ready" : "Asset ready for server render");
      return true;
    } catch (error) {
      setImports((current) => {
        const next = current.map((item) => (
          item.id === assetId ? { ...item, uploadStatus: "error" as const } : item
        ));
        importsRef.current = next;
        return next;
      });
      const message = error instanceof Error ? error.message : "Unknown media error";
      setStatus(adapters.assetAdapter.kind === "desktop"
        ? `Desktop media preparation failed: ${message}`
        : `Asset upload failed: ${message}`);
      return false;
    }
  }

  function queueImportedAssetUpload(assetId: string, file: File) {
    const uploadTask = uploadImportedAsset(assetId, file);
    pendingAssetUploadsRef.current.set(assetId, uploadTask);
    void uploadTask.finally(() => {
      if (pendingAssetUploadsRef.current.get(assetId) === uploadTask) {
        pendingAssetUploadsRef.current.delete(assetId);
      }
    });
    return uploadTask;
  }

  function addImportToTrack(item: ImportedAsset, options: { skipMatchPrompt?: boolean } = {}) {
    const asset = mediaAssetsRef.current.get(item.id);
    if (!asset) {
      setStatus("Import is no longer available");
      return;
    }

    const metadata = item.metadata || asset.metadata;
    const mediaWidth = Math.max(0, Math.round(Number(metadata?.width) || 0));
    const mediaHeight = Math.max(0, Math.round(Number(metadata?.height) || 0));
    const mediaFps = metadata?.fps ? normalizeProjectFps(metadata.fps) : 0;
    const isFirstTimelineVideo = item.kind === "video" && !layersRef.current.some((layer) => (
      layer.type === "media" && layer.mediaKind === "video"
    ));
    const mediaDiffersFromProject = mediaWidth > 0 && mediaHeight > 0 && (
      mediaWidth !== selectedFormat.width
      || mediaHeight !== selectedFormat.height
      || (mediaFps > 0 && mediaFps !== normalizeProjectFps(exportSettings.fps))
    );
    const mediaMatchPromptDisabled = typeof window !== "undefined"
      && localStorage.getItem("pixores-media-match-prompt-disabled") === "true";
    const savedMediaMatchChoice = typeof window !== "undefined"
      ? localStorage.getItem("pixores-media-match-default")
      : null;
    if (!options.skipMatchPrompt && isFirstTimelineVideo && mediaDiffersFromProject && !mediaMatchPromptDisabled) {
      setMediaMatchRequest({
        itemId: item.id,
        width: mediaWidth,
        height: mediaHeight,
        fps: mediaFps || normalizeProjectFps(exportSettings.fps),
      });
      setSkipFutureMediaMatchPrompts(false);
      return;
    }
    if (!options.skipMatchPrompt && isFirstTimelineVideo && mediaDiffersFromProject && mediaMatchPromptDisabled && savedMediaMatchChoice === "match") {
      const width = Math.max(2, Math.round(mediaWidth / 2) * 2);
      const height = Math.max(2, Math.round(mediaHeight / 2) * 2);
      const fps = mediaFps || normalizeProjectFps(exportSettings.fps);
      setFormatIndex(formats.findIndex((format) => format.id === "custom"));
      setCustomWidth(width);
      setCustomHeight(height);
      setExportSettings((current) => ({ ...current, width, height, fps }));
    }

    const targetFrame = item.kind !== "audio" ? layersRef.current.find((layer) => (
      layer.id === selectedLayerId
      && layer.type === "shape"
      && isMediaContainerShape(layer.shapeType)
    )) : undefined;

    const layerId = `clip-${item.id}-${Date.now()}`;
    const layerDuration = item.kind === "video" || item.kind === "audio"
      ? Math.max(0.2, item.metadata?.duration || asset.metadata?.duration || item.duration || asset.duration || Math.min(8, timelineViewportDuration))
      : Math.min(5, Math.max(0, timelineViewportDuration - currentTime)) || 2;
    const insert = targetFrame
      ? { ...getClipInsertPosition(layerDuration, "visual"), placement: "new-top" as const }
      : getImportedClipInsertPosition(layerDuration, item.kind === "audio" ? "audio" : "visual");

    if (item.kind === "audio") {
      const audioLayer: VideoLayer = {
        id: layerId,
        trackId: insert.trackId,
        type: "audio",
        name: item.name.replace(/\.[^.]+$/, "").slice(0, 28) || "Audio",
        start: insert.start,
        duration: layerDuration,
        visible: true,
        locked: false,
        opacity: 1,
        trackOrder: insert.trackOrder,
        trackName: insert.trackName,
        x: 0,
        y: 0,
        width: 100,
        height: 8,
        src: asset.url,
        mediaKind: "audio",
        assetKey: item.id,
        sourceStart: 0,
        trimStart: 0,
        sourceEnd: layerDuration,
        trimEnd: layerDuration,
        sourceDuration: layerDuration,
        volume: 1,
      };
      insertImportedLayer(audioLayer, insert.placement);
      setStatus(insert.placement === "selected-track" ? "Audio inserted in the selected track at the playhead" : "Audio added to a new track");
      return;
    }

    const initialMediaBox = getInitialMediaBox(asset);
    const nextLayer: VideoLayer = {
      id: layerId,
      trackId: insert.trackId,
      type: "media",
      name: item.name.replace(/\.[^.]+$/, "").slice(0, 28) || "Media",
      start: targetFrame?.start ?? insert.start,
      duration: layerDuration,
      visible: true,
      locked: false,
      opacity: 1,
      trackOrder: insert.trackOrder,
      trackName: insert.trackName,
      x: initialMediaBox.x,
      y: initialMediaBox.y,
      width: initialMediaBox.width,
      height: initialMediaBox.height,
      src: asset.url,
      mediaKind: item.kind,
      assetKey: item.id,
      sourceStart: 0,
      trimStart: 0,
      sourceEnd: item.kind === "video" ? layerDuration : undefined,
      trimEnd: item.kind === "video" ? layerDuration : undefined,
      sourceDuration: item.kind === "video" ? layerDuration : undefined,
      audioDetached: false,
      objectFit: "contain",
      volume: item.kind === "video" ? 1 : undefined,
    };

    if (targetFrame) insertLayerAfterSelection(nextLayer);
    else insertImportedLayer(nextLayer, insert.placement);
    if (targetFrame) {
      attachMediaToNextFrameSlot(targetFrame.id, nextLayer.id);
      setStatus(`${nextLayer.name} embedded in ${targetFrame.name}`);
    } else {
      setStatus(insert.placement === "selected-track"
        ? `${item.kind === "video" ? "Video" : "Image"} inserted in the selected track at the playhead`
        : `${item.kind === "video" ? "Video" : "Image"} added to a new track`);
    }
  }

  function resolveMediaMatchRequest(matchMedia: boolean) {
    const request = mediaMatchRequest;
    if (!request) return;
    const item = importsRef.current.find((candidate) => candidate.id === request.itemId);
    setMediaMatchRequest(null);
    if (skipFutureMediaMatchPrompts) {
      localStorage.setItem("pixores-media-match-prompt-disabled", "true");
      localStorage.setItem("pixores-media-match-default", matchMedia ? "match" : "keep");
    }
    if (!item) {
      setStatus("Imported video is no longer available");
      return;
    }

    if (matchMedia) {
      const width = Math.max(2, Math.round(request.width / 2) * 2);
      const height = Math.max(2, Math.round(request.height / 2) * 2);
      const fps = normalizeProjectFps(request.fps);
      setFormatIndex(formats.findIndex((format) => format.id === "custom"));
      setCustomWidth(width);
      setCustomHeight(height);
      setExportSettings((current) => ({ ...current, width, height, fps }));
      setStatus(`Project matched to ${width}x${height} ${fps}fps`);
    } else {
      setStatus(`Keeping project at ${selectedFormat.width}x${selectedFormat.height} ${normalizeProjectFps(exportSettings.fps)}fps`);
    }
    addImportToTrack(item, { skipMatchPrompt: true });
  }

  function extractAudioFromSelectedVideo() {
    const layer = layersRef.current.find((item) => item.id === selectedLayerId);
    if (!layer || layer.type !== "media" || layer.mediaKind !== "video" || !layer.assetKey) {
      setStatus("Select a video clip to separate audio");
      return;
    }
    if (layer.locked) {
      setStatus("Unlock the video before separating audio");
      return;
    }

    const existingAudio = layersRef.current.find((item) => (
      item.type === "audio"
      && item.linkedVideoLayerId === layer.id
      && item.assetKey === layer.assetKey
    ));
    if (existingAudio) {
      setSelectedLayerId(existingAudio.id);
      setSelectedTrackId(getTrackId(existingAudio));
      setStatus("Audio is already separated");
      return;
    }

    const videoTrackId = getTrackId(layer);
    const videoTrackOrder = getTrackOrder(videoTrackId, trackSettings, layer.trackOrder ?? 0);
    const audioLayer = createAudioLayerFromVideo({ ...layer, audioDetached: true });
    const audioTrackId = getTrackId(audioLayer);

    commitLayers((current) => orderLayersByTrackAndTime([
      ...current.map((item, index) => {
        const order = getTrackOrder(getTrackId(item), trackSettings, item.trackOrder ?? index);
        if (item.id === layer.id) return { ...item, audioDetached: true, trackOrder: videoTrackOrder };
        return order > videoTrackOrder ? { ...item, trackOrder: order + 1 } : item;
      }),
      audioLayer,
    ]));
    setTrackSettings((current) => {
      const shifted = current.map((track) => (track.order > videoTrackOrder ? { ...track, order: track.order + 1 } : track));
      if (!shifted.some((track) => track.id === videoTrackId)) {
        shifted.push({ id: videoTrackId, order: videoTrackOrder, name: layer.trackName || layer.name, muted: !!layer.trackMuted });
      }
      shifted.push({ id: audioTrackId, order: videoTrackOrder + 1, name: audioLayer.trackName || audioLayer.name, muted: false });
      return shifted.sort((first, second) => first.order - second.order);
    });
    setEmptyTracks((current) => current.map((track, index) => {
      const order = track.order ?? index;
      return order > videoTrackOrder ? { ...track, order: order + 1 } : track;
    }));
    setTimelineDuration((value) => Math.max(value, Math.ceil(getLayerEnd(audioLayer) + TIMELINE_EMPTY_TAIL_SECONDS)));
    setSelectedLayerId(audioLayer.id);
    setSelectedTrackId(audioTrackId);
    setStatus("Audio detached directly below the video track");
  }

  function deleteImport(itemId: string) {
    setImports((current) => current.filter((item) => item.id !== itemId));
    if (selectedImportId === itemId) setSelectedImportId("");

    if (!layersRef.current.some((layer) => (layer.assetKey || layer.id) === itemId)) {
      const asset = mediaAssetsRef.current.get(itemId);
      if (asset) URL.revokeObjectURL(asset.url);
      mediaAssetsRef.current.delete(itemId);
    }

    setStatus("Import removed");
  }

  function removeTrack(trackId: string) {
    const targetTrackSnapshot = layersRef.current.filter((layer) => (layer.trackId || layer.id) === trackId);
    if (targetTrackSnapshot.length > 0 && !window.confirm("Delete this track and all clips inside it?")) return;
    if (targetTrackSnapshot.some((layer) => layer.locked)) {
      setStatus("Unlock the track before deleting it");
      return;
    }
    commitLayers((current) => {
      const targetTrack = current.filter((layer) => (layer.trackId || layer.id) === trackId);
      if (targetTrack.some((layer) => layer.locked)) {
        setStatus("Unlock the track before deleting it");
        return current;
      }

      const next = current.filter((layer) => (layer.trackId || layer.id) !== trackId);
      if (targetTrack.some((layer) => layer.id === selectedLayerId)) setSelectedLayerId("");
      return next;
    });
    setEmptyTracks((current) => current.filter((track) => track.id !== trackId));
    setTrackSettings((current) => current.filter((track) => track.id !== trackId));
    if (selectedTrackId === trackId) setSelectedTrackId("");
  }

  function deleteSelectedLayer() {
    const selectedIds = selectedLayerIds.length
      ? selectedLayerIds
      : selectedLayerId ? [selectedLayerId] : [];
    if (selectedIds.length > 1) {
      const selectedIdSet = new Set(selectedIds);
      const selectedItems = layersRef.current.filter((item) => selectedIdSet.has(item.id));
      if (!selectedItems.length) {
        setStatus("Select clips before deleting");
        return;
      }
      if (selectedItems.some((item) => item.locked)) {
        setStatus("Unlock all selected clips before deleting them");
        return;
      }
      commitLayers((current) => current.filter((item) => (
        !selectedIdSet.has(item.id)
        && !(item.type === "transition" && (
          (item.fromLayerId && selectedIdSet.has(item.fromLayerId))
          || (item.toLayerId && selectedIdSet.has(item.toLayerId))
        ))
      )));
      setSelectedLayerId("");
      setSelectedLayerIds([]);
      setStatus(`${selectedItems.length} selected clips deleted`);
      return;
    }
    const layer = layersRef.current.find((item) => item.id === selectedLayerId);
    if (!layer) {
      setStatus("Select a clip before deleting");
      return;
    }
    if (layer.locked) {
      setStatus("Unlock the track before deleting it");
      return;
    }

    const trackId = layer.trackId || layer.id;
    const trackClips = sortClipsByTime(layersRef.current.filter((item) => (
      (item.trackId || item.id) === trackId
      && item.id !== layer.id
      && item.type !== "transition"
    )));
    const previousClip = [...trackClips].reverse().find((item) => getLayerEnd(item) <= layer.start + 0.001);
    const nextClip = trackClips.find((item) => item.start >= getLayerEnd(layer) - 0.001);
    const destinationStart = previousClip ? getLayerEnd(previousClip) : 0;
    const rippleStart = nextClip?.start;
    const rippleDelta = rippleStart === undefined ? 0 : Math.max(0, rippleStart - destinationStart);

    if (rippleStart !== undefined) {
      const lockedLaterClip = layersRef.current.find((item) => (
        (item.trackId || item.id) === trackId
        && item.id !== layer.id
        && item.start >= rippleStart - 0.001
        && item.locked
      ));
      if (lockedLaterClip) {
        setStatus("Unlock later clips before ripple deleting");
        return;
      }
    }

    commitLayers((current) => orderLayersByTrackAndTime(current.flatMap((item) => {
      if (item.id === layer.id || (item.type === "transition" && (item.fromLayerId === layer.id || item.toLayerId === layer.id))) return [];
      const itemTimelineAnchor = item.type === "transition" ? item.cutTime ?? item.start : item.start;
      if (
        rippleStart !== undefined
        && (item.trackId || item.id) === trackId
        && itemTimelineAnchor >= rippleStart - 0.001
      ) {
        const nextStart = Number(Math.max(0, item.start - rippleDelta).toFixed(3));
        return [{
          ...item,
          start: nextStart,
          cutTime: item.cutTime === undefined ? undefined : Number(Math.max(0, item.cutTime - rippleDelta).toFixed(3)),
        }];
      }
      return [item];
    })));
    setSelectedLayerId(nextClip?.id || previousClip?.id || "");
    setSelectedLayerIds(nextClip?.id ? [nextClip.id] : previousClip?.id ? [previousClip.id] : []);
    setCurrentTime(destinationStart);
    setStatus(nextClip ? `Clip deleted; following clips moved to ${formatTimecode(destinationStart)}` : "Clip deleted");
  }

  function deleteSelectedTrack() {
    const layer = layersRef.current.find((item) => item.id === selectedLayerId);
    const trackId = layer?.trackId || layer?.id || selectedTrackId;
    if (!trackId) return;
    removeTrack(trackId);
    setStatus("Track deleted");
  }

  function duplicateSelectedLayer() {
    const sourceLayers = layersRef.current.filter((item) => selectedLayerIdSet.has(item.id) && item.type !== "transition");
    if (sourceLayers.length > 1) {
      if (sourceLayers.some((item) => item.locked)) {
        setStatus("Unlock all selected clips before duplicating them");
        return;
      }
      const stamp = Date.now();
      const earliestStart = Math.min(...sourceLayers.map((item) => item.start));
      const latestEnd = Math.max(...sourceLayers.map((item) => getLayerEnd(item)));
      const offset = Math.max(0.05, latestEnd - earliestStart);
      const idMap = new Map(sourceLayers.map((item, index) => [item.id, `${item.type}-${stamp}-${index}`]));
      const duplicates = sourceLayers.map((item) => ({
        ...item,
        id: idMap.get(item.id) || `${item.type}-${stamp}`,
        name: `${item.name} copy`,
        start: Number((item.start + offset).toFixed(3)),
        groupId: undefined,
        linkedVideoLayerId: item.linkedVideoLayerId ? idMap.get(item.linkedVideoLayerId) : undefined,
        frameMediaLayerIds: item.frameMediaLayerIds?.map((id) => idMap.get(id) || id),
      }));
      commitLayers((current) => orderLayersByTrackAndTime([...current, ...duplicates]));
      setTimelineDuration((value) => Math.max(value, Math.ceil(Math.max(...duplicates.map(getLayerEnd)) + TIMELINE_EMPTY_TAIL_SECONDS)));
      setSelectedLayerId(duplicates[0].id);
      setSelectedLayerIds(duplicates.map((item) => item.id));
      setSelectedTrackId(getTrackId(duplicates[0]));
      setStatus(`${duplicates.length} selected clips duplicated`);
      return;
    }
    const layer = layersRef.current.find((item) => item.id === selectedLayerId);
    if (!layer || layer.locked) return;
    const id = `${layer.type}-${Date.now()}`;
    const duplicate: VideoLayer = {
      ...layer,
      id,
      name: `${layer.name} copy`,
      start: getLayerEnd(layer),
      x: clamp(layer.x + 3, -STAGE_POSITION_LIMIT_PERCENT, STAGE_POSITION_LIMIT_PERCENT),
      y: clamp(layer.y + 3, -STAGE_POSITION_LIMIT_PERCENT, STAGE_POSITION_LIMIT_PERCENT),
    };
    insertLayerAfterSelection(duplicate);
    setStatus("Clip duplicated");
  }

  function reorderTrackByIndex(trackId: string, targetIndex: number, initialLayers: VideoLayer[], initialSettings: TrackSettings[]) {
    setTrackSettings((current) => {
      const ordered = [...current].sort((first, second) => first.order - second.order);
      const fromIndex = ordered.findIndex((track) => track.id === trackId);
      if (fromIndex < 0) return current;
      const [track] = ordered.splice(fromIndex, 1);
      ordered.splice(clamp(targetIndex, 0, ordered.length), 0, track);
      const next = ordered.map((item, index) => ({ ...item, order: index }));
      setHistory((history) => ({
        past: [...history.past, initialLayers].slice(-60),
        future: [],
      }));
      setLayers((currentLayers) => currentLayers.map((layer) => {
        const nextTrack = next.find((item) => item.id === getTrackId(layer));
        return nextTrack ? { ...layer, trackOrder: nextTrack.order, trackMuted: nextTrack.muted, trackName: nextTrack.name } : layer;
      }));
      setEmptyTracks((currentEmptyTracks) => currentEmptyTracks.map((track) => {
        const nextTrack = next.find((item) => item.id === track.id);
        return nextTrack ? { ...track, order: nextTrack.order, muted: nextTrack.muted, name: nextTrack.name || track.name } : track;
      }));
      return next;
    });
    trackDragRef.current = null;
    setDraggingTrackId("");
    setTrackDropIndex(null);
    setStatus("Track reordered");
    void initialSettings;
  }

  function beginTrackDrag(event: ReactPointerEvent<HTMLElement>, trackId: string) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const ordered = [...trackSettings].sort((first, second) => first.order - second.order);
    const initialIndex = ordered.findIndex((track) => track.id === trackId);
    trackDragRef.current = {
      trackId,
      startY: event.clientY,
      targetIndex: Math.max(0, initialIndex),
      initialSettings: trackSettings,
      initialLayers: layersRef.current,
    };
    setDraggingTrackId(trackId);
    setTrackDropIndex(Math.max(0, initialIndex));
    document.body.style.userSelect = "none";
  }

  function applyWorkspaceMode(mode: WorkspaceMode) {
    const viewportHeight = window.innerHeight;
    setWorkspaceMode(mode);
    setIsTimelineVisible(true);

    if (mode === "timeline") {
      setTimelineHeight(clamp(Math.round(viewportHeight * 0.58), 420, Math.max(420, Math.round(viewportHeight * 0.65))));
      setStatus("Timeline workspace: more tracks are visible");
      return;
    }

    if (mode === "preview") {
      setTimelineHeight(220);
      setIsSidebarOpen(false);
      setStatus("Preview workspace: canvas expanded");
      return;
    }

    setTimelineHeight(clamp(Math.round(viewportHeight * 0.38), 350, 460));
    setIsSidebarOpen(true);
    setStatus("Editing workspace restored");
  }

  function updateTrackDrag(clientY: number) {
    const drag = trackDragRef.current;
    if (!drag) return;
    const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-timeline-row]"));
    const targetIndex = rows.reduce((bestIndex, row, index) => {
      const rect = row.getBoundingClientRect();
      return clientY > rect.top + rect.height / 2 ? index + 1 : bestIndex;
    }, 0);
    drag.targetIndex = clamp(targetIndex, 0, trackSettings.length - 1);
    setTrackDropIndex(drag.targetIndex);
  }

  function endTrackDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = trackDragRef.current;
    if (!drag) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.style.userSelect = "";
    const currentIndex = trackSettings.find((track) => track.id === drag.trackId)?.order ?? drag.targetIndex;
    if (currentIndex !== drag.targetIndex) reorderTrackByIndex(drag.trackId, drag.targetIndex, drag.initialLayers, drag.initialSettings);
    else {
      trackDragRef.current = null;
      setDraggingTrackId("");
      setTrackDropIndex(null);
    }
  }

  function toggleTrackMute(trackId: string) {
    const settings = trackSettings.find((track) => track.id === trackId);
    const group = trackGroups.find((track) => track.trackId === trackId);
    const currentMuted = settings?.muted ?? group?.muted ?? false;
    const nextMuted = !currentMuted;
    setHistory((history) => ({
      past: [...history.past, applyTrackSettingsToLayers(layersRef.current, trackSettings)].slice(-60),
      future: [],
    }));
    setTrackSettings((current) => {
      const existing = current.find((track) => track.id === trackId);
      if (existing) {
        return current.map((track) => (
          track.id === trackId ? { ...track, muted: nextMuted } : track
        ));
      }
      return [...current, {
        id: trackId,
        order: group?.order ?? current.length,
        name: group?.name,
        muted: nextMuted,
      }];
    });
    setLayers((current) => current.map((layer) => (
      getTrackId(layer) === trackId ? { ...layer, trackMuted: nextMuted } : layer
    )));
    setEmptyTracks((current) => current.map((track) => (
      track.id === trackId ? { ...track, muted: nextMuted } : track
    )));
    setSelectedTrackId(trackId);
    setStatus(nextMuted ? "Track muted" : "Track unmuted");
  }

  function setClipVolumeLive(layerId: string, volume: number) {
    const nextVolume = Number(clamp(volume, 0, 1).toFixed(2));
    setLayers((current) => current.map((layer) => (
      layer.id === layerId ? { ...layer, volume: nextVolume, muted: nextVolume <= 0 } : layer
    )));
  }

  function updateVolumeLineFromPointer(layerId: string, element: HTMLElement, clientX: number, clientY: number) {
    const rect = element.getBoundingClientRect();
    const nextVolume = clamp(1 - ((clientY - rect.top) / Math.max(1, rect.height)), 0, 1);
    volumeDragRef.current = volumeDragRef.current
      ? { ...volumeDragRef.current, hasChanged: true }
      : volumeDragRef.current;
    setClipVolumeLive(layerId, nextVolume);
    setVolumeTooltip({
      layerId,
      x: clientX,
      y: clientY,
      value: nextVolume,
    });
  }

  function beginVolumeDrag(event: ReactPointerEvent<HTMLElement>, layer: VideoLayer) {
    if (!isAudioControllableLayer(layer) || layer.locked) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    volumeDragRef.current = {
      layerId: layer.id,
      initialLayers: layersRef.current,
      hasChanged: false,
    };
    setActiveVolumeLayerId(layer.id);
    setSelectedLayerId(layer.id);
    setSelectedTrackId(getTrackId(layer));
    updateVolumeLineFromPointer(layer.id, event.currentTarget, event.clientX, event.clientY);
  }

  function dragVolumeLine(event: ReactPointerEvent<HTMLElement>, layer: VideoLayer) {
    if (volumeDragRef.current?.layerId !== layer.id) return;
    event.preventDefault();
    event.stopPropagation();
    updateVolumeLineFromPointer(layer.id, event.currentTarget, event.clientX, event.clientY);
  }

  function endVolumeDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = volumeDragRef.current;
    if (!drag) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.hasChanged) {
      setHistory((historyState) => ({
        past: [...historyState.past, drag.initialLayers].slice(-60),
        future: [],
      }));
    }
    volumeDragRef.current = null;
    setActiveVolumeLayerId("");
    setVolumeTooltip(null);
  }

  function toggleSelectedClipMute(layer: VideoLayer) {
    updateLayer(layer.id, { muted: !layer.muted });
  }

  function rotateSelectedMediaClockwise() {
    if (!selectedLayer || selectedLayer.locked || selectedLayer.type === "audio") return;
    updateLayer(selectedLayer.id, { angle: ((selectedLayer.angle || 0) + 90) % 360 });
    setStatus("Selected clip rotated 90° clockwise");
  }

  function renameSelectedLayer() {
    if (!selectedLayer || selectedLayer.locked) return;
    const nextName = window.prompt("Clip name", selectedLayer.name);
    if (!nextName?.trim()) return;
    updateLayer(selectedLayer.id, { name: nextName.trim() });
    setStatus("Clip renamed");
  }

  function toggleSelectedLayersLock() {
    const targets = selectedLayers.length ? selectedLayers : selectedLayer ? [selectedLayer] : [];
    if (!targets.length) return;
    const shouldLock = targets.some((layer) => !layer.locked);
    const ids = new Set(targets.map((layer) => layer.id));
    commitLayers((current) => current.map((layer) => ids.has(layer.id) ? { ...layer, locked: shouldLock } : layer));
    setStatus(`${targets.length} clip${targets.length === 1 ? "" : "s"} ${shouldLock ? "locked" : "unlocked"}`);
  }

  function groupSelectedLayers() {
    const targets = selectedLayers.filter((layer) => layer.type !== "transition");
    if (targets.length < 2) {
      setStatus("Select at least two clips with Ctrl before grouping");
      return;
    }
    if (targets.some((layer) => layer.locked)) {
      setStatus("Unlock all selected clips before grouping them");
      return;
    }
    const groupId = `group-${Date.now()}`;
    const ids = new Set(targets.map((layer) => layer.id));
    commitLayers((current) => current.map((layer) => ids.has(layer.id) ? { ...layer, groupId } : layer));
    setStatus(`${targets.length} clips grouped`);
  }

  function ungroupSelectedLayers() {
    const groupIds = new Set(selectedLayers.map((layer) => layer.groupId).filter((id): id is string => Boolean(id)));
    if (!groupIds.size && selectedLayer?.groupId) groupIds.add(selectedLayer.groupId);
    if (!groupIds.size) {
      setStatus("Select a grouped clip before ungrouping");
      return;
    }
    commitLayers((current) => current.map((layer) => layer.groupId && groupIds.has(layer.groupId) ? { ...layer, groupId: undefined } : layer));
    setStatus(`${groupIds.size} group${groupIds.size === 1 ? "" : "s"} ungrouped`);
  }

  function resetSelectedClipVolume(layer: VideoLayer) {
    updateLayer(layer.id, { volume: 1, muted: false, audioFadeIn: 0, audioFadeOut: 0, audioEffects: { ...DEFAULT_AUDIO_EFFECTS } });
  }

  function updateSelectedAudioEffects(patch: Partial<PixoresAudioEffectChain>) {
    if (!selectedLayer || !isAudioControllableLayer(selectedLayer) || selectedLayer.locked) return;
    updateLayer(selectedLayer.id, { audioEffects: { ...resolveAudioEffects(selectedLayer.audioEffects), ...patch } });
  }

  function applyAudioPreset(preset: keyof typeof AUDIO_EFFECT_PRESETS) {
    if (!selectedLayer || !isAudioControllableLayer(selectedLayer) || selectedLayer.locked) return;
    updateLayer(selectedLayer.id, { audioEffects: { ...DEFAULT_AUDIO_EFFECTS, ...AUDIO_EFFECT_PRESETS[preset] } });
    setStatus(`${preset.replace(/([A-Z])/g, " $1")} audio preset applied to ${selectedLayer.name}`);
  }

  async function synchronizeSelectedAudio() {
    const candidates = selectedLayers.filter(isAudioControllableLayer);
    if (candidates.length !== 2) {
      setStatus("Select exactly one video and one external audio clip with Ctrl to synchronize them");
      return;
    }
    const reference = candidates.find((layer) => layer.type === "media" && layer.mediaKind === "video") || candidates[0];
    const target = candidates.find((layer) => layer.id !== reference.id && (layer.type === "audio" || layer.mediaKind === "audio")) || candidates.find((layer) => layer.id !== reference.id)!;
    if (reference.locked || target.locked) {
      setStatus("Unlock both clips before synchronizing audio");
      return;
    }
    const bridge = getPixoresDesktopBridge();
    if (!bridge?.synchronizeAudio) {
      setStatus("Automatic audio synchronization is available in Pixores Video Maker Pro");
      return;
    }
    setIsSynchronizingAudio(true);
    setStatus("Analyzing both waveforms locally...");
    try {
      const [referenceUrls, targetUrls] = await Promise.all([
        prepareAudioAiSources(reference),
        prepareAudioAiSources(target),
      ]);
      const makeInput = (layer: VideoLayer, sourceUrls: string[]) => ({
        sourceUrl: sourceUrls[0] || layer.src || "",
        sourceUrls,
        sourceStart: Math.max(0, layer.sourceStart ?? layer.trimStart ?? 0),
        sourceEnd: Math.max(0.05, layer.sourceEnd ?? layer.trimEnd ?? ((layer.sourceStart ?? layer.trimStart ?? 0) + layer.duration)),
      });
      const result = await bridge.synchronizeAudio({
        reference: makeInput(reference, referenceUrls),
        target: makeInput(target, targetUrls),
        duration: Math.min(300, Math.max(reference.duration, target.duration)),
        maxOffsetSeconds: 120,
      });
      const desiredTargetStart = reference.start + result.targetStartDeltaSeconds;
      const timelineShift = Math.max(0, -desiredTargetStart);
      commitLayers((current) => current.map((layer) => {
        if (layer.id === reference.id && timelineShift > 0) return { ...layer, start: Number((layer.start + timelineShift).toFixed(3)) };
        if (layer.id === target.id) return { ...layer, start: Number((desiredTargetStart + timelineShift).toFixed(3)) };
        return layer;
      }));
      setStatus(`Audio synchronized · ${Math.round(result.confidence * 100)}% match · ${Math.abs(result.targetStartDeltaSeconds).toFixed(2)}s correction`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Audio synchronization failed");
    } finally {
      setIsSynchronizingAudio(false);
    }
  }

  function openCropZoomDialog() {
    if (!selectedLayer || selectedLayer.type !== "media" || selectedLayer.mediaKind === "audio") {
      setStatus("Select a visual media clip for Crop & Zoom");
      return;
    }
    setActiveObjectStylePanel(null);
    setCropZoomLayerId(selectedLayer.id);
    setIsPlaying(false);
  }

  function applyCropZoom(layerId: string, patch: Pick<VideoLayer, "crop" | "transform">) {
    pushHistorySnapshot();
    setLayers((current) => current.map((layer) => (
      layer.id === layerId
        ? {
          ...layer,
          crop: patch.crop,
          transform: patch.transform,
        }
        : layer
    )));
    setCropZoomLayerId("");
    setStatus("Crop & Zoom applied");
  }

  function resetCropZoom(layerId: string) {
    pushHistorySnapshot();
    setLayers((current) => current.map((layer) => (
      layer.id === layerId ? { ...layer, crop: undefined, transform: undefined } : layer
    )));
    setCropZoomLayerId("");
    setStatus("Crop & Zoom reset");
  }

  function splitSelectedLayer() {
    const layer = layers.find((item) => item.id === selectedLayerId);
    if (!layer || layer.locked) return;
    const fps = normalizeProjectFps(exportSettings.fps || 30);
    const relativeSplitTime = snapTimeToFrame(currentTime - layer.start, fps);
    if (relativeSplitTime < 0.2 || relativeSplitTime > layer.duration - 0.2) {
      setStatus("Move the playhead inside the clip to split");
      return;
    }

    // Use one canonical timeline boundary for both halves. This guarantees
    // left.end === right.start even when the original clip starts between
    // project frames or has already been cut several times.
    const firstDuration = Number(relativeSplitTime.toFixed(6));
    const splitTime = Number((layer.start + firstDuration).toFixed(6));
    const secondDuration = Number(Math.max(1 / fps, layer.duration - firstDuration).toFixed(6));
    const sourceStart = getLayerSourceStart(layer);
    const sourceEnd = getLayerSourceEnd(layer);
    const sourceSplitTime = Number(clamp(sourceStart + firstDuration, sourceStart + 0.2, sourceEnd - 0.2).toFixed(6));
    const sourceDuration = getLayerSourceDuration(layer);
    const newId = `${layer.type}-${Date.now()}`;
    const secondLayer: VideoLayer = {
      ...layer,
      id: newId,
      name: `${layer.name} copy`,
      start: splitTime,
      duration: secondDuration,
      sourceStart: sourceSplitTime,
      trimStart: sourceSplitTime,
      sourceEnd,
      trimEnd: sourceEnd,
      sourceDuration,
    };

    commitLayers((current) => orderLayersByTrackAndTime(current.flatMap((item) => (
      item.id === layer.id
        ? [{
          ...item,
          duration: firstDuration,
          sourceStart,
          trimStart: sourceStart,
          sourceEnd: sourceSplitTime,
          trimEnd: sourceSplitTime,
          sourceDuration,
        }, secondLayer]
        : [item]
    ))));
    setTimelineDuration((value) => Math.max(value, Math.ceil(getLayerEnd(layer) + TIMELINE_EMPTY_TAIL_SECONDS)));
    setCurrentTime(splitTime);
    setSelectedLayerId(newId);
    setStatus("Clip split at playhead");
  }

  function createTimelineClipboardFragment(layer: VideoLayer, rangeStart: number, rangeEnd: number) {
    if (layer.type === "transition") return null;
    const fragmentStart = Math.max(layer.start, rangeStart);
    const fragmentEnd = Math.min(getLayerEnd(layer), rangeEnd);
    const fragmentDuration = Number((fragmentEnd - fragmentStart).toFixed(3));
    if (fragmentDuration <= 0.001) return null;

    const timedMedia = layer.type === "media" || layer.type === "audio";
    const trimFromStart = Math.max(0, fragmentStart - layer.start);
    const sourceStart = timedMedia
      ? Number((getLayerSourceStart(layer) + trimFromStart).toFixed(3))
      : layer.sourceStart;
    const sourceEnd = timedMedia
      ? Number(((sourceStart ?? 0) + fragmentDuration).toFixed(3))
      : layer.sourceEnd;

    return {
      ...layer,
      start: fragmentStart,
      duration: fragmentDuration,
      sourceStart,
      trimStart: timedMedia ? sourceStart : layer.trimStart,
      sourceEnd,
      trimEnd: timedMedia ? sourceEnd : layer.trimEnd,
    };
  }

  function copyTimelineSelection() {
    const selected = layersRef.current.find((layer) => layer.id === selectedLayerId && layer.type !== "transition");
    const selectedClips = layersRef.current.filter((layer) => selectedLayerIdSet.has(layer.id) && layer.type !== "transition");
    const range = markInTime !== null && markOutTime !== null && markOutTime > markInTime
      ? { start: markInTime, end: markOutTime }
      : null;
    let copiedLayers: VideoLayer[] = [];
    let anchorStart = selected?.start ?? range?.start ?? currentTime;

    if (range && markTrackId) {
      copiedLayers = layersRef.current.flatMap((layer) => {
        if (getTrackId(layer) !== markTrackId) return [];
        const fragment = createTimelineClipboardFragment(layer, range.start, range.end);
        return fragment ? [fragment] : [];
      });
      anchorStart = range.start;
    } else if (selectedClips.length) {
      copiedLayers = selectedClips.map((layer) => ({ ...layer }));
      anchorStart = Math.min(...selectedClips.map((layer) => layer.start));
    } else if (selected) {
      copiedLayers = [{ ...selected }];
      anchorStart = selected.start;
    }

    if (!copiedLayers.length) {
      setStatus("Select a clip or set an IN/OUT range before copying");
      return;
    }

    const copiedEnd = copiedLayers.reduce((end, layer) => Math.max(end, getLayerEnd(layer)), anchorStart);
    timelineClipboardRef.current = {
      layers: copiedLayers.map((layer) => ({ ...layer })),
      anchorStart,
      duration: Math.max(0.05, copiedEnd - anchorStart),
    };
    setTimelineClipboardCount(copiedLayers.length);
    setStatus(`${copiedLayers.length} timeline clip${copiedLayers.length === 1 ? "" : "s"} copied. Move the playhead and paste.`);
  }

  function cutTimelineSelection() {
    const count = selectedLayerIds.length || (selectedLayerId ? 1 : 0);
    if (!count) {
      setStatus("Select one or more clips before cutting");
      return;
    }
    const targets = layersRef.current.filter((layer) => selectedLayerIdSet.has(layer.id) || (count === 1 && layer.id === selectedLayerId));
    if (targets.some((layer) => layer.locked)) {
      setStatus("Unlock all selected clips before cutting them");
      return;
    }
    copyTimelineSelection();
    deleteSelectedLayer();
    setStatus(`${count} selected clip${count === 1 ? "" : "s"} cut`);
  }

  function pasteTimelineClipboard() {
    const payload = timelineClipboardRef.current;
    if (!payload?.layers.length) return false;

    const pasteStart = Number(currentTime.toFixed(3));
    const stamp = Date.now();
    const idMap = new Map(payload.layers.map((layer, index) => [layer.id, `${layer.type}-${stamp}-${index}`]));
    let pastedLayers = payload.layers.map((layer, index) => {
      const id = idMap.get(layer.id) || `${layer.type}-${stamp}-${index}`;
      return {
        ...layer,
        id,
        name: `${layer.name} copy`,
        start: Number((pasteStart + Math.max(0, layer.start - payload.anchorStart)).toFixed(3)),
        locked: false,
        linkedVideoLayerId: layer.linkedVideoLayerId ? idMap.get(layer.linkedVideoLayerId) : undefined,
        frameMediaLayerIds: layer.frameMediaLayerIds?.map((layerId) => idMap.get(layerId) || layerId),
      };
    });

    const blockingSourceTrackIds = Array.from(new Set(pastedLayers.filter(isTrackBlockingClip).map(getTrackId)));
    const selectedTargetTrack = selectedTrackId
      ? visibleTrackGroups.find((group) => (
        group.trackId === selectedTrackId
        && !group.emptyTrack?.locked
        && !group.clips.some((clip) => clip.locked)
        && (group.clips.length === 0 || group.clips.every(isTrackBlockingClip))
      ))
      : undefined;
    if (blockingSourceTrackIds.length === 1 && selectedTargetTrack) {
      const sourceTrackId = blockingSourceTrackIds[0];
      pastedLayers = pastedLayers.map((layer) => getTrackId(layer) === sourceTrackId ? {
        ...layer,
        trackId: selectedTargetTrack.trackId,
        trackOrder: selectedTargetTrack.order,
        trackName: selectedTargetTrack.name,
      } : layer);
    }

    let workingLayers = [...layersRef.current];
    const pastedTrackIds = Array.from(new Set(pastedLayers.filter(isTrackBlockingClip).map(getTrackId)));
    const adjustedPastedLayers = [...pastedLayers];
    pastedTrackIds.forEach((trackId) => {
      const trackPastedLayers = adjustedPastedLayers.filter((layer) => getTrackId(layer) === trackId && isTrackBlockingClip(layer));
      if (!trackPastedLayers.length) return;
      const groupStart = Math.min(...trackPastedLayers.map((layer) => layer.start));
      const groupEnd = Math.max(...trackPastedLayers.map(getLayerEnd));
      const insertionSpan = Math.max(0.05, groupEnd - groupStart);
      const insertionTime = Number(resolveRippleInsertionTime(workingLayers, trackId, groupStart).toFixed(3));
      const offset = insertionTime - groupStart;
      workingLayers = workingLayers.map((layer) => (
        getTrackId(layer) === trackId
        && isTrackBlockingClip(layer)
        && layer.start >= insertionTime - 0.001
          ? { ...layer, start: Number((layer.start + insertionSpan).toFixed(3)) }
          : layer
      ));
      adjustedPastedLayers.forEach((layer, index) => {
        if (getTrackId(layer) !== trackId) return;
        adjustedPastedLayers[index] = { ...layer, start: Number((layer.start + offset).toFixed(3)) };
      });
    });
    pastedLayers = adjustedPastedLayers;
    const nextLayers = orderLayersByTrackAndTime([...workingLayers, ...adjustedPastedLayers]);
    commitLayers(() => nextLayers);
    const actualPasteStart = pastedLayers.reduce((start, layer) => Math.min(start, layer.start), Number.POSITIVE_INFINITY);
    const pastedEnd = pastedLayers.reduce((end, layer) => Math.max(end, getLayerEnd(layer)), actualPasteStart);
    setTimelineDuration((duration) => Math.max(duration, Math.ceil(pastedEnd + TIMELINE_EMPTY_TAIL_SECONDS)));
    setSelectedLayerId(pastedLayers[0].id);
    setSelectedLayerIds(pastedLayers.map((layer) => layer.id));
    setSelectedTrackId(getTrackId(pastedLayers[0]));
    currentTimeRef.current = actualPasteStart;
    setCurrentTime(actualPasteStart);
    setStatus(`${pastedLayers.length} copied clip${pastedLayers.length === 1 ? "" : "s"} inserted at ${formatTimecode(actualPasteStart)} · later clips shifted automatically`);
    return true;
  }

  function createChatGptImageFile(blob: Blob, prefix = "ChatGPT image") {
    const extension = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : blob.type === "image/gif" ? "gif" : "png";
    const timestamp = new Date().toISOString().replace(/[:T]/g, "-").replace(/\.\d{3}Z$/, "");
    return new File([blob], `${prefix} ${timestamp}.${extension}`, { type: blob.type || `image/${extension}` });
  }

  async function pasteImageFromClipboard() {
    if (!navigator.clipboard || !("read" in navigator.clipboard)) {
      setStatus("Clipboard images are not available in this browser");
      return false;
    }
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      await importMediaFile(createChatGptImageFile(blob), { origin: "chatgpt", saveToChatGptLibrary: true });
      return true;
    }
    return false;
  }

  async function pasteFromClipboard() {
    if (pasteTimelineClipboard()) return;
    if (!navigator.clipboard) {
      setStatus("Clipboard is not available in this browser");
      return;
    }

    try {
      if (await pasteImageFromClipboard()) return;

      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setStatus("Clipboard is empty");
        return;
      }

      const id = `paste-text-${Date.now()}`;
      const duration = Math.min(4, Math.max(0, timelineViewportDuration - currentTime)) || 2;
      const insert = getClipInsertPosition(duration, "visual");
      const pastedTextLayer: VideoLayer = {
        id,
        trackId: insert.trackId,
        type: "text",
        name: "Pasted text",
        start: insert.start,
        duration,
        visible: true,
        locked: false,
        opacity: 1,
        trackOrder: insert.trackOrder,
        trackName: insert.trackName,
        x: 8,
        y: 48,
        width: 72,
        height: 14,
        text: text.trim().slice(0, 160),
        color: "#ffffff",
        fontSize: 54,
      };

      insertLayerAfterSelection(pastedTextLayer);
      setStatus("Pasted text");
    } catch {
      setStatus("Allow clipboard access to paste");
    }
  }

  async function importDroppedImages(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
    if (files.length) {
      for (const file of files) await importMediaFile(file, { origin: "chatgpt", saveToChatGptLibrary: true });
      return;
    }
    const html = event.dataTransfer.getData("text/html");
    const uri = event.dataTransfer.getData("text/uri-list").split(/\r?\n/).find((value) => /^https?:/i.test(value));
    const source = uri || html.match(/<img[^>]+src=["']([^"']+)/i)?.[1];
    if (!source) {
      setStatus("Drop an image file here, or copy it from ChatGPT and use Paste image");
      return;
    }
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) throw new Error("The dropped address is not an image");
      await importMediaFile(createChatGptImageFile(blob, "ChatGPT drop"), { origin: "chatgpt", saveToChatGptLibrary: true });
    } catch {
      setStatus("That web image could not be read directly. Copy the image and choose Paste image instead.");
    }
  }

  function openExportDialog() {
    setExportSettings((current) => ({
      ...current,
      fileName: normalizeExportFileName(current.fileName || projectTitle || "pixores-video", current.format),
      width: current.width || selectedFormat.width,
      height: current.height || selectedFormat.height,
      rangeStart: markInTime ?? current.rangeStart,
      rangeEnd: markOutTime ?? current.rangeEnd,
    }));
    setIsExportDialogOpen(true);
  }

  function openThumbnailDialog() {
    setThumbnailTitle((current) => current || projectTitle || "New video");
    setIsThumbnailDialogOpen(true);
  }

  async function generateAutomaticThumbnail() {
    const source = canvasRef.current;
    if (!source) return;
    const output = document.createElement("canvas");
    output.width = 1280;
    output.height = 720;
    const context = output.getContext("2d");
    if (!context) return;
    context.fillStyle = "#020617";
    context.fillRect(0, 0, output.width, output.height);
    const scale = Math.max(output.width / source.width, output.height / source.height);
    const width = source.width * scale;
    const height = source.height * scale;
    context.drawImage(source, (output.width - width) / 2, (output.height - height) / 2, width, height);

    const title = (thumbnailTitle.trim() || projectTitle || "New video").slice(0, 64);
    if (thumbnailTemplate !== "clean") {
      const gradient = context.createLinearGradient(0, 360, 0, 720);
      gradient.addColorStop(0, "rgba(2,6,23,0)");
      gradient.addColorStop(1, thumbnailTemplate === "social" ? "rgba(8,47,73,.96)" : "rgba(2,6,23,.94)");
      context.fillStyle = gradient;
      context.fillRect(0, 250, 1280, 470);
    }
    if (thumbnailTemplate === "cinema") {
      context.fillStyle = "rgba(0,0,0,.9)";
      context.fillRect(0, 0, 1280, 52);
      context.fillRect(0, 668, 1280, 52);
    }
    if (thumbnailTemplate === "social") {
      context.fillStyle = "#22d3c5";
      context.fillRect(72, 510, 12, 132);
    }
    context.textBaseline = "bottom";
    context.font = `900 ${thumbnailTemplate === "bold" ? 92 : 72}px Arial, sans-serif`;
    context.lineJoin = "round";
    context.lineWidth = thumbnailTemplate === "bold" ? 16 : 10;
    context.strokeStyle = "rgba(0,0,0,.88)";
    context.fillStyle = thumbnailTemplate === "social" ? "#67e8f9" : "#ffffff";
    const maxWidth = 1110;
    const words = title.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    lines.slice(-2).forEach((value, index, visible) => {
      const y = 650 - (visible.length - 1 - index) * 100;
      context.strokeText(value, 92, y, maxWidth);
      context.fillText(value, 92, y, maxWidth);
    });
    const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png", 0.96));
    if (!blob) return;
    const fileName = `${sanitizeProjectFileName(projectTitle)}-thumbnail.png`;
    await addGeneratedImageToImportsAndDisk(blob, fileName, "Thumbnail");
    setIsThumbnailDialogOpen(false);
  }

  function getSelectedExportRange() {
    if (!markTrackId || markInTime === null || markOutTime === null || markOutTime <= markInTime) return null;
    return {
      start: markInTime,
      end: markOutTime,
      duration: markOutTime - markInTime,
      trackId: markTrackId,
    };
  }

  function openRangeContextMenu(event: ReactMouseEvent<HTMLElement>) {
    const range = getSelectedExportRange();
    if (!range) return;
    if (event.currentTarget.dataset.trackId !== range.trackId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickedTime = clamp(((event.clientX - rect.left) / Math.max(1, rect.width)) * timelineViewportDuration, 0, projectDuration);
    if (clickedTime < range.start || clickedTime > range.end) return;
    event.preventDefault();
    event.stopPropagation();
    setRangeContextMenu({ x: event.clientX, y: event.clientY });
  }

  function openTimelineTrackContextMenu(event: ReactMouseEvent<HTMLElement>, trackId: string) {
    const range = getSelectedExportRange();
    if (range && range.trackId === trackId) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickedTime = clamp(((event.clientX - rect.left) / Math.max(1, rect.width)) * timelineViewportDuration, 0, projectDuration);
      if (clickedTime >= range.start && clickedTime <= range.end) {
        openRangeContextMenu(event);
        return;
      }
    }
    event.preventDefault();
    event.stopPropagation();
    setSelectedTrackId(trackId);
    setTimelineContextMenu({ x: event.clientX, y: event.clientY, trackId });
  }

  function openTimelineClipContextMenu(event: ReactMouseEvent<HTMLElement>, layer: VideoLayer) {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedLayerIdSet.has(layer.id)) selectTimelineLayer(layer);
    setTimelineContextMenu({ x: event.clientX, y: event.clientY, trackId: getTrackId(layer), layerId: layer.id });
  }

  function runTimelineContextAction(action: () => void) {
    setTimelineContextMenu(null);
    action();
  }

  function exportSelectedRange() {
    const range = getSelectedExportRange();
    if (!range) {
      setStatus("Set IN and OUT before exporting a range");
      return;
    }
    setRangeContextMenu(null);
    setExportSettings((current) => ({
      ...current,
      fileName: normalizeExportFileName(current.fileName || `${projectTitle || "pixores"}-sample`, current.format),
      width: current.width || selectedFormat.width,
      height: current.height || selectedFormat.height,
      rangeStart: range.start,
      rangeEnd: range.end,
    }));
    setIsExportDialogOpen(true);
    setStatus(`Export range ${formatTimecode(range.start)} to ${formatTimecode(range.end)}`);
  }

  function copySelectedRangeToClipboard() {
    const range = getSelectedExportRange();
    if (!range) {
      setStatus("Set IN and OUT before copying a range");
      return;
    }
    const copiedLayers = layersRef.current.flatMap((layer) => {
      if (getTrackId(layer) !== range.trackId) return [];
      const fragment = createTimelineClipboardFragment(layer, range.start, range.end);
      return fragment ? [fragment] : [];
    });
    if (!copiedLayers.length) {
      setStatus("The selected range does not contain timeline clips");
      return;
    }
    timelineClipboardRef.current = {
      layers: copiedLayers.map((layer) => ({ ...layer })),
      anchorStart: range.start,
      duration: range.duration,
    };
    setTimelineClipboardCount(copiedLayers.length);
    setRangeContextMenu(null);
    setStatus(`${copiedLayers.length} clip${copiedLayers.length === 1 ? "" : "s"} copied from the selected range`);
  }

  function deleteSelectedRange() {
    const range = getSelectedExportRange();
    if (!range) {
      setStatus("Set IN and OUT before deleting a range");
      return;
    }

    setRangeContextMenu(null);
    const deleteDuration = range.duration;
    commitLayers((current) => {
      const nextLayers: VideoLayer[] = [];
      current.forEach((layer) => {
        if (getTrackId(layer) !== range.trackId) {
          nextLayers.push(layer);
          return;
        }
        const layerStart = layer.start;
        const layerEnd = getLayerEnd(layer);

        if (layerEnd <= range.start) {
          nextLayers.push(layer);
          return;
        }

        if (layerStart >= range.end) {
          nextLayers.push({ ...layer, start: Number((layer.start - deleteDuration).toFixed(3)) });
          return;
        }

        if (layerStart >= range.start && layerEnd <= range.end) return;
        if (layer.type === "transition") return;

        const sourceStart = getLayerSourceStart(layer);
        const sourceEnd = getLayerSourceEnd(layer);

        if (layerStart < range.start) {
          const leftDuration = Number((range.start - layerStart).toFixed(3));
          const leftSourceEnd = layer.type === "media" || layer.type === "audio"
            ? Number((sourceStart + leftDuration).toFixed(3))
            : layer.sourceEnd;
          nextLayers.push({
            ...layer,
            duration: leftDuration,
            sourceStart,
            trimStart: layer.type === "media" || layer.type === "audio" ? sourceStart : layer.trimStart,
            sourceEnd: leftSourceEnd,
            trimEnd: leftSourceEnd,
          });
        }

        if (layerEnd > range.end) {
          const rightDuration = Number((layerEnd - range.end).toFixed(3));
          const removedFromLayerStart = Math.max(0, range.end - layerStart);
          const rightSourceStart = layer.type === "media" || layer.type === "audio"
            ? Number((sourceStart + removedFromLayerStart).toFixed(3))
            : layer.sourceStart;
          nextLayers.push({
            ...layer,
            id: layerStart < range.start ? `${layer.id}-range-${Date.now()}` : layer.id,
            start: range.start,
            duration: rightDuration,
            sourceStart: rightSourceStart,
            trimStart: rightSourceStart,
            sourceEnd,
            trimEnd: sourceEnd,
          });
        }
      });
      return orderLayersByTrackAndTime(nextLayers);
    });
    setTimelineDuration((current) => Math.max(1, current));
    setCurrentTime(range.start);
    setMarkInTime(null);
    setMarkOutTime(null);
    setMarkTrackId("");
    setExportSettings((current) => ({ ...current, rangeStart: undefined, rangeEnd: undefined }));
    setStatus(`Deleted range ${formatTimecode(range.start)} to ${formatTimecode(range.end)}`);
  }

  function setExportMarkIn() {
    const targetTrackId = selectedLayer ? getTrackId(selectedLayer) : selectedTrackId;
    const targetTrackHasContent = layersRef.current.some((layer) => layer.type !== "transition" && getTrackId(layer) === targetTrackId);
    if (!targetTrackId || !targetTrackHasContent) {
      setStatus("Select a track with a clip before setting IN");
      return;
    }
    const nextMark = Number(currentTime.toFixed(3));
    setMarkTrackId(targetTrackId);
    setMarkInTime(nextMark);
    setMarkOutTime((current) => (current !== null && current <= nextMark ? null : current));
    setExportSettings((current) => ({
      ...current,
      rangeStart: nextMark,
      rangeEnd: current.rangeEnd && current.rangeEnd > nextMark ? current.rangeEnd : undefined,
    }));
    setStatus(`IN set at ${formatTimecode(nextMark)}`);
  }

  function setExportMarkOut() {
    const targetTrackId = markTrackId || (selectedLayer ? getTrackId(selectedLayer) : selectedTrackId);
    const targetTrackHasContent = layersRef.current.some((layer) => layer.type !== "transition" && getTrackId(layer) === targetTrackId);
    if (!targetTrackId || !targetTrackHasContent) {
      setStatus("Select a track with a clip before setting OUT");
      return;
    }
    const nextMark = Number(currentTime.toFixed(3));
    if (markInTime !== null && nextMark <= markInTime) {
      setStatus("OUT must be after IN");
      return;
    }
    setMarkTrackId(targetTrackId);
    setMarkOutTime(nextMark);
    setExportSettings((current) => ({
      ...current,
      rangeStart: markInTime ?? current.rangeStart,
      rangeEnd: nextMark,
    }));
    if (markInTime !== null) {
      currentTimeRef.current = markInTime;
      setCurrentTime(markInTime);
    }
    setStatus(`OUT set at ${formatTimecode(nextMark)}`);
  }

  function clearInOutSelection() {
    playbackPrimeTokenRef.current += 1;
    setIsPlaybackPriming(false);
    setIsPlaying(false);
    setMarkInTime(null);
    setMarkOutTime(null);
    setMarkTrackId("");
    setRangeContextMenu(null);
    setExportSettings((current) => ({ ...current, rangeStart: undefined, rangeEnd: undefined }));
    setStatus("IN/OUT selection cleared");
  }

  function updateRangeMarkerFromPointer(kind: "in" | "out", clientX: number, timelineTrack: HTMLElement) {
    const rect = timelineTrack.getBoundingClientRect();
    if (rect.width <= 0) return;
    const rawTime = ((clientX - rect.left) / rect.width) * timelineViewportDuration;
    const minimumGap = 1 / Math.max(1, exportSettings.fps || 30);

    if (kind === "in") {
      const nextIn = Number(clamp(rawTime, 0, Math.max(0, (markOutTime ?? projectDuration) - minimumGap)).toFixed(3));
      setMarkInTime(nextIn);
      currentTimeRef.current = nextIn;
      setCurrentTime(nextIn);
      setExportSettings((current) => ({ ...current, rangeStart: nextIn }));
      return;
    }

    const nextOut = Number(clamp(rawTime, Math.min(projectDuration, (markInTime ?? 0) + minimumGap), projectDuration).toFixed(3));
    setMarkOutTime(nextOut);
    currentTimeRef.current = nextOut;
    setCurrentTime(nextOut);
    setExportSettings((current) => ({ ...current, rangeEnd: nextOut }));
  }

  function beginRangeMarkerDrag(event: ReactPointerEvent<HTMLSpanElement>, kind: "in" | "out") {
    const timelineTrack = event.currentTarget.parentElement;
    if (!timelineTrack) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPlaying(false);
    rangeMarkerDragRef.current = kind;
    updateRangeMarkerFromPointer(kind, event.clientX, timelineTrack);
  }

  function dragRangeMarker(event: ReactPointerEvent<HTMLSpanElement>) {
    const kind = rangeMarkerDragRef.current;
    const timelineTrack = event.currentTarget.parentElement;
    if (!kind || !timelineTrack) return;
    updateRangeMarkerFromPointer(kind, event.clientX, timelineTrack);
  }

  function endRangeMarkerDrag(event: ReactPointerEvent<HTMLSpanElement>) {
    const kind = rangeMarkerDragRef.current;
    if (!kind) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    rangeMarkerDragRef.current = null;
    if (kind === "out" && markInTime !== null) {
      currentTimeRef.current = markInTime;
      setCurrentTime(markInTime);
    }
    setStatus(`${kind === "in" ? "IN" : "OUT"} adjusted`);
  }

  async function startConfiguredExport(settings: PixoresExportSettings) {
    if (isPreparingServerRender || isRecording) {
      setStatus("An export is already running");
      return;
    }
    const qualityPreset = normalizeExportQualityPreset(settings.qualityPreset);
    const normalizedSettings = {
      ...settings,
      qualityPreset,
      fileName: normalizeExportFileName(settings.fileName, settings.format),
    };
    setExportSettings(normalizedSettings);
    localStorage.setItem("pixores-video-export-settings", JSON.stringify(normalizedSettings));
    setIsExportDialogOpen(false);

    if (normalizedSettings.renderMethod === "browser") {
      await exportVideo(normalizedSettings);
      return;
    }

    if (normalizedSettings.renderMethod === "server" && !adapters.isDesktop && !isLocalServerRenderAvailable) {
      const browserSettings = { ...normalizedSettings, renderMethod: "browser" as const };
      setExportSettings(browserSettings);
      localStorage.setItem("pixores-video-export-settings", JSON.stringify(browserSettings));
      setStatus("Server rendering is unavailable on this deployment. Using browser export instead.");
      await exportVideo(browserSettings);
      return;
    }

    if (normalizedSettings.renderMethod === "local" && !adapters.isDesktop) {
      setStatus("Local render is available in Pixores Video Maker Pro. Choose Server or Browser export.");
      return;
    }

    if (normalizedSettings.renderMethod === "local" || normalizedSettings.renderMethod === "server") {
      await prepareServerRenderMp4(normalizedSettings);
      return;
    }
  }

  async function chooseExportDestination() {
    if (adapters.isDesktop) {
      const bridge = getPixoresDesktopBridge();
      if (!bridge?.chooseRenderOutputDirectory) {
        setStatus("Desktop folder picker is unavailable.");
        return;
      }
      const result = await bridge.chooseRenderOutputDirectory();
      if (result.canceled) return;
      setExportSettings((current) => ({ ...current, outputDirectory: result.directory }));
      setStatus(`Export folder: ${result.directory}`);
      return;
    }

    const picker = (window as Window & {
      showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<BrowserExportDirectoryHandle>;
    }).showDirectoryPicker;
    if (!picker) {
      setStatus("This browser uses its configured Downloads folder. Enable 'Ask where to save each file' in browser settings to choose every time.");
      return;
    }

    try {
      const directory = await picker({ mode: "readwrite" });
      browserExportDirectoryRef.current = directory;
      setBrowserExportDirectoryName(directory.name);
      setStatus(`Export folder selected: ${directory.name}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus(`Folder selection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async function cancelActiveRender() {
    const shouldCancel = window.confirm("Cancel the current export?");
    if (!shouldCancel) return;

    if (isRecording) {
      stopExport();
      return;
    }

    if (serverRenderId && adapters.renderAdapter.cancelRender) {
      try {
        const payload = await adapters.renderAdapter.cancelRender(serverRenderId);
        setIsPreparingServerRender(false);
        setRenderProgress((current) => ({
          ...current,
          status: payload.status || "cancelled",
          progress: Math.round(Math.max(0, Math.min(1, payload.progress || 0)) * 100),
          error: payload.error || "",
          warnings: payload.warnings || current.warnings,
        }));
        setStatus("Export cancelled");
      } catch (error) {
        setStatus(`Cancel failed: ${error instanceof Error ? error.message : "Request failed"}`);
      }
    }
  }

  function createBrowserExportStream(canvasStream: MediaStream, settings: PixoresExportSettings) {
    const cleanupCallbacks: Array<() => void> = [];

    if (!settings.includeAudio) {
      return {
        stream: canvasStream,
        cleanup: () => cleanupCallbacks.forEach((cleanup) => cleanup()),
        hasAudio: false,
      };
    }

    const AudioContextConstructor = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) {
      return {
        stream: canvasStream,
        cleanup: () => cleanupCallbacks.forEach((cleanup) => cleanup()),
        hasAudio: false,
      };
    }

    const audioContext = exportAudioContextRef.current ?? new AudioContextConstructor();
    exportAudioContextRef.current = audioContext;
    if (audioContext.state === "suspended") void audioContext.resume();

    const destination = audioContext.createMediaStreamDestination();
    const limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    limiter.connect(destination);
    const connectedSources: MediaElementAudioSourceNode[] = [];
    const connectedElements = new Set<HTMLMediaElement>();

    layersRef.current.forEach((layer) => {
      if (!layer.visible || (layer.type !== "media" && layer.type !== "audio")) return;
      if (isLayerTrackMuted(layer, trackSettings) || layer.muted) return;
      if (layer.type === "media" && (layer.mediaKind !== "video" || layer.audioDetached)) return;
      const asset = mediaAssetsRef.current.get(layer.assetKey || layer.id);
      if (!asset) return;
      const element = getLayerPlaybackElement(layer, asset);
      if (!element || connectedElements.has(element)) return;

      try {
        let source = exportAudioSourcesRef.current.get(element);
        if (!source) {
          source = audioContext.createMediaElementSource(element);
          exportAudioSourcesRef.current.set(element, source);
        }
        if (!exportSpeakerSourcesRef.current.has(source)) {
          source.connect(audioContext.destination);
          exportSpeakerSourcesRef.current.add(source);
        }
        source.connect(limiter);
        connectedSources.push(source);
        connectedElements.add(element);
      } catch {
        // Some browsers only allow one media element source per element.
      }
    });

    cleanupCallbacks.push(() => {
      connectedSources.forEach((source) => {
        try {
          source.disconnect(limiter);
        } catch {
          // The node may already be disconnected after recorder shutdown.
        }
      });
      limiter.disconnect();
    });

    const audioTracks = destination.stream.getAudioTracks();
    if (audioTracks.length === 0) {
      return {
        stream: canvasStream,
        cleanup: () => cleanupCallbacks.forEach((cleanup) => cleanup()),
        hasAudio: false,
      };
    }

    const stream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    return {
      stream,
      cleanup: () => cleanupCallbacks.forEach((cleanup) => cleanup()),
      hasAudio: true,
    };
  }

  async function exportVideo(settings: PixoresExportSettings = exportSettings) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || isRecording) return;

    if (!("MediaRecorder" in window)) {
      setStatus("This browser cannot export video");
      return;
    }

    exportCancelledRef.current = false;
    previewFullResolutionRef.current = true;
    setDownloadUrl("");
    setIsPlaying(false);
    setIsRecording(true);
    setStatus("Rendering timeline with browser recorder...");
    const rangeStart = settings.rangeStart ?? 0;
    const rangeEnd = Math.min(settings.rangeEnd ?? projectDuration, projectDuration);
    const duration = Math.max(0.05, rangeEnd - rangeStart);
    setCurrentTime(rangeStart);
    drawScene(context, rangeStart);
    const canvasStream = canvas.captureStream(settings.fps || 30);
    const exportStream = createBrowserExportStream(canvasStream, settings);
    const exportType = getSupportedExportType();
    const warnings = [
      ...(settings.format === "mp4" && exportType.extension !== "mp4" ? ["This browser exports WebM when MP4 recording is unavailable."] : []),
      ...(settings.includeAudio && exportType.audioCodec !== "aac" ? ["This browser cannot guarantee AAC audio. Pixores Video Maker Pro is required for AAC output."] : []),
      ...(settings.includeAudio && !exportStream.hasAudio ? ["Audio could not be attached by this browser. Use the desktop renderer for guaranteed audio."] : []),
    ];
    setRenderProgress({
      open: true,
      renderId: "browser-recorder",
      status: "rendering",
      progress: 0,
      fileName: settings.fileName,
      outputUrl: "",
      outputPath: "Browser download",
      error: "",
      warnings,
      startedAt: performance.now(),
      elapsedSeconds: 0,
      etaSeconds: null,
      renderedFrames: 0,
      totalFrames: Math.max(1, Math.ceil(duration * settings.fps)),
      renderFps: settings.fps,
      speed: 1,
      codec: exportType.extension === "mp4" ? "H.264" : "VP9",
      resolution: `${settings.width} x ${settings.height}`,
      proxyPrepared: 0,
      proxyTotal: 0,
      hybridRender: false,
      hybridPrecomposing: false,
      hybridRenderedFrames: 0,
      hybridTotalFrames: 0,
      segmentedRender: false,
      currentSegment: 0,
      segmentCount: 0,
      segmentType: "",
      complexDuration: 0,
      method: "Fast browser export · real time",
    });

    recorderStreamRef.current = exportStream.stream;
    const recorder = new MediaRecorder(exportStream.stream, {
      mimeType: exportType.mimeType,
      videoBitsPerSecond: getBrowserExportVideoBitsPerSecond(settings),
      audioBitsPerSecond: settings.includeAudio && exportStream.hasAudio ? (settings.audioBitrateKbps || 192) * 1000 : undefined,
    });
    const chunks: Blob[] = [];
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      exportStream.stream.getTracks().forEach((track) => track.stop());
      canvasStream.getTracks().forEach((track) => track.stop());
      exportStream.cleanup();
      recorderStreamRef.current = null;
      previewFullResolutionRef.current = false;
      setIsRecording(false);
      if (exportCancelledRef.current) {
        setStatus("Export cancelled");
        setRenderProgress((current) => ({
          ...current,
          status: "cancelled",
          progress: current.progress,
          elapsedSeconds: current.startedAt ? (performance.now() - current.startedAt) / 1000 : current.elapsedSeconds,
        }));
        return;
      }
      const blob = new Blob(chunks, { type: exportType.mimeType });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      const fileName = normalizeExportFileName(settings.fileName, exportType.extension === "webm" ? "webm" : "mp4");
      setRenderProgress((current) => ({
        ...current,
        status: "completed",
        progress: 100,
        outputUrl: url,
        fileName,
        elapsedSeconds: current.startedAt ? (performance.now() - current.startedAt) / 1000 : current.elapsedSeconds,
        etaSeconds: 0,
      }));
      try {
        await saveExportToDestination(url, fileName, settings.outputDirectory);
      } catch (error) {
        setStatus(`The video rendered, but automatic saving failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    };

    recorder.start();
    const start = performance.now();
    const targetFps = Math.max(1, settings.fps || 30);
    let lastRenderedFrame = -1;
    let lastTimelineUpdate = start - 250;
    let lastProgressUpdate = start - 250;

    const renderExportFrame = (now: number) => {
      const elapsed = (now - start) / 1000;
      const nextTime = clamp(rangeStart + elapsed, rangeStart, rangeEnd);
      const progress = Math.round(clamp(elapsed / duration, 0, 1) * 100);
      const frameIndex = Math.min(Math.max(0, Math.ceil(duration * targetFps) - 1), Math.floor(elapsed * targetFps));
      if (frameIndex !== lastRenderedFrame) {
        drawScene(context, clamp(rangeStart + frameIndex / targetFps, rangeStart, rangeEnd));
        lastRenderedFrame = frameIndex;
      }

      if (now - lastTimelineUpdate >= 100) {
        setCurrentTime(nextTime);
        lastTimelineUpdate = now;
      }

      if (now - lastProgressUpdate >= 250) {
        setRenderProgress((current) => ({
          ...current,
          status: "rendering",
          progress,
          elapsedSeconds: current.startedAt ? (performance.now() - current.startedAt) / 1000 : elapsed,
          etaSeconds: progress > 5 && progress < 100 ? Math.max(0, (elapsed / (progress / 100)) - elapsed) : null,
          renderedFrames: Math.min(current.totalFrames, frameIndex + 1),
        }));
        lastProgressUpdate = now;
      }

      if (nextTime >= rangeEnd || recorder.state === "inactive" || exportCancelledRef.current) {
        setCurrentTime(rangeEnd);
        drawScene(context, rangeEnd);
        if (recorder.state !== "inactive") recorder.stop();
        return;
      }

      requestAnimationFrame(renderExportFrame);
    };

    requestAnimationFrame(renderExportFrame);
  }

  function stopExport() {
    const recorder = recorderRef.current;
    exportCancelledRef.current = true;
    previewFullResolutionRef.current = false;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
  }

  function openSmartClipsDialog() {
    setIsSmartClipsDialogOpen(true);
    setSmartClipsProgress((current) => ({
      ...current,
      error: "",
      message: smartClipSource
        ? "Choose the output format and clip length, then analyze locally."
        : "Choose the master video you want to turn into short clips.",
    }));
  }

  function resetSmartClipCandidates(options: { clearSource?: boolean } = {}) {
    setSmartClipCandidates([]);
    setSmartClipActiveCandidateId("");
    smartClipPreparedProjectRef.current = null;
    smartClipSpeechRangesRef.current = new Map();
    if (options.clearSource) {
      smartClipSourceProjectRef.current = null;
      setSmartClipSource(null);
      setSmartClipPreviewSource("");
      setSmartClipPreviewOffset(0);
    }
  }

  async function selectSmartClipSourceFile(file: File) {
    if (!adapters.isDesktop) {
      setSmartClipsProgress((current) => ({
        ...current,
        error: "Local Smart Clips are available in Pixores Video Maker Pro.",
        message: "Desktop local processing is required.",
      }));
      return;
    }
    const isVideoFile = file.type.startsWith("video/") || /\.(?:mp4|mov|m4v|webm|mkv|avi|wmv)$/i.test(file.name);
    if (!isVideoFile) {
      setSmartClipsProgress((current) => ({ ...current, error: "Choose a supported video file.", message: "The selected file is not a video." }));
      return;
    }

    const inferredType = file.type || (/\.webm$/i.test(file.name) ? "video/webm" : /\.mov$/i.test(file.name) ? "video/quicktime" : "video/mp4");
    const importFile = file.type ? file : new File([file], file.name, { type: inferredType, lastModified: file.lastModified });
    resetSmartClipCandidates({ clearSource: true });
    setIsSmartClipSourceLoading(true);
    setSmartClipsProgress({
      running: false,
      cancelling: false,
      completed: 0,
      total: 0,
      currentClip: 0,
      progress: 0,
      message: "Preparing the master video locally...",
      error: "",
    });
    setStatus(`Smart Clips · preparing ${file.name} locally`);

    try {
      const assetId = await importMediaFile(importFile);
      const imported = importsRef.current.find((item) => item.id === assetId);
      const mediaAsset = mediaAssetsRef.current.get(assetId);
      if (!imported || imported.uploadStatus === "error") throw new Error("The local video adapter could not prepare this file.");
      const metadata = imported.metadata || mediaAsset?.metadata;
      const duration = Number(imported.duration || metadata?.duration || mediaAsset?.duration) || 0;
      if (duration <= 0) throw new Error("Pixores could not read the duration of this video.");
      const persistentUrl = imported.persistentUrl || mediaAsset?.persistentUrl;
      const sourceUrl = persistentUrl || imported.url || mediaAsset?.url;
      if (!sourceUrl) throw new Error("The local video source is unavailable.");
      const width = Math.max(2, Math.round(Number(metadata?.width) || 1920));
      const height = Math.max(2, Math.round(Number(metadata?.height) || 1080));
      const sourceProject = createSmartClipSourceProject({
        id: assetId,
        name: file.name.replace(/\.[^.]+$/, ""),
        url: sourceUrl,
        persistentUrl,
        duration,
        width,
        height,
        metadata,
      });
      smartClipSourceProjectRef.current = sourceProject;
      setSmartClipSource({ assetId, name: file.name, duration, width, height });
      setSmartClipPreviewSource(createDesktopMediaUrl(imported.url || mediaAsset?.url || sourceUrl));
      setSmartClipPreviewOffset(0);
      setSmartClipsProgress((current) => ({
        ...current,
        message: "Master video ready. Choose the format, duration and local options, then analyze.",
        error: "",
      }));
      setStatus(`Smart Clips · ${file.name} ready · ${formatExportSeconds(duration)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The master video could not be prepared.";
      resetSmartClipCandidates({ clearSource: true });
      setSmartClipsProgress((current) => ({ ...current, error: message, message: "Choose another master video and try again." }));
      setStatus(`Smart Clips source error: ${message}`);
    } finally {
      setIsSmartClipSourceLoading(false);
    }
  }

  function selectSmartClipPlatform(platformId: SmartClipPlatformId) {
    const platform = getSmartClipPlatform(platformId, { width: smartClipCustomWidth, height: smartClipCustomHeight });
    resetSmartClipCandidates();
    setSmartClipPlatformId(platformId);
    setSmartClipDuration((current) => Math.min(current, platform.maxDuration));
  }

  function selectSmartClipDuration(duration: number) {
    resetSmartClipCandidates();
    setSmartClipDuration(duration);
  }

  function openAudioAiDialog(tab: AudioAiTab) {
    const layer = layersRef.current.find((item) => item.id === selectedLayerId);
    if (!layer || !isAudioControllableLayer(layer)) {
      setStatus("Select a video or audio clip first");
      return;
    }
    if (!adapters.isDesktop) {
      setStatus("Subtitles and silence removal are available in Pixores Video Maker Pro");
      return;
    }
    setAudioAiTab(tab);
    setAudioAiError("");
    setAudioAiProgress(null);
    setSilenceAnalysis(null);
    setIsAudioAiDialogOpen(true);
  }

  function getAudioAiSources(layer: VideoLayer) {
    const assetId = layer.assetKey || layer.id;
    const asset = mediaAssetsRef.current.get(assetId);
    const imported = importsRef.current.find((item) => item.id === assetId);
    const linkedLayer = layer.linkedVideoLayerId
      ? layersRef.current.find((item) => item.id === layer.linkedVideoLayerId)
      : undefined;
    const linkedAssetId = linkedLayer?.assetKey || linkedLayer?.id || "";
    const linkedAsset = linkedAssetId ? mediaAssetsRef.current.get(linkedAssetId) : undefined;
    const linkedImport = linkedAssetId ? importsRef.current.find((item) => item.id === linkedAssetId) : undefined;
    return [...new Set([
      imported?.persistentUrl,
      asset?.persistentUrl,
      linkedImport?.persistentUrl,
      linkedAsset?.persistentUrl,
      layer.src,
      linkedLayer?.src,
      imported?.url,
      asset?.url,
      linkedImport?.url,
      linkedAsset?.url,
    ].filter((value): value is string => Boolean(value)))];
  }

  async function prepareAudioAiSources(layer: VideoLayer) {
    const preparedProject = await prepareProjectMediaForRender();
    const preparedLayer = preparedProject.layers.find((item) => item.id === layer.id);
    const assetId = preparedLayer?.assetKey || layer.assetKey || preparedLayer?.id || layer.id;
    const preparedAsset = preparedProject.assets.find((item) => item.id === assetId);
    return [...new Set([
      preparedAsset?.persistentUrl,
      preparedAsset?.url,
      preparedLayer?.src,
      ...getAudioAiSources(layer),
    ].filter((value): value is string => Boolean(value)))];
  }

  function getSmartClipLayerSources(project: PixoresVideoProject, layer: PixoresVideoLayer) {
    const assetId = layer.assetKey || layer.id;
    const asset = project.assets.find((item) => item.id === assetId);
    return [...new Set([
      asset?.persistentUrl,
      asset?.url,
      layer.src,
    ].filter((value): value is string => Boolean(value)))];
  }

  function selectSmartClipCaptionTemplate(templateId: SmartClipCaptionTemplateId) {
    setSmartClipCaptionTemplateId(templateId);
    if (templateId === "none") {
      setStatus("Smart Clips · no subtitle template selected");
      return;
    }
    const preset = getCaptionStylePreset(templateId);
    if (preset?.patch.fontFamily) ensureVideoMakerFontLoaded(preset.patch.fontFamily);
    setStatus(`Smart Clips · ${preset?.label || "subtitle"} template selected`);
  }

  function selectSmartClipCaptionPosition(position: SmartClipCaptionPosition) {
    setSmartClipCaptionPosition(position);
    setStatus(`Smart Clips · subtitles placed at the ${position}`);
  }

  function selectSmartClipCaptionSize(sizePercent: number) {
    const nextSize = clampSmartClipCaptionSize(sizePercent);
    setSmartClipCaptionSize(nextSize);
    setStatus(`Smart Clips · subtitle size set to ${nextSize}%`);
  }

  function placeSmartClipCaption<T extends { x: number; y: number; width: number; height: number; fontSize?: number }>(
    caption: T,
    layout: ReturnType<typeof getProfessionalCaptionLayout>,
  ): T {
    return {
      ...caption,
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
      fontSize: layout.fontSize,
    };
  }

  function applySelectedSmartClipTemplateToCaptions(captions: VideoLayer[]) {
    const platform = getSmartClipPlatform(smartClipPlatformId, { width: smartClipCustomWidth, height: smartClipCustomHeight });
    const layout = getProfessionalCaptionLayout(platform.width, platform.height, smartClipCaptionPosition, smartClipCaptionSize);
    const captionIds = new Set(captions.map((caption) => caption.id));
    const applyPresentation = (caption: VideoLayer) => placeSmartClipCaption(
      applySmartClipCaptionTemplate(caption, smartClipCaptionTemplateId),
      layout,
    );
    const styledCaptions = captions.map(applyPresentation);
    commitLayers((current) => current.map((layer) => captionIds.has(layer.id) ? applyPresentation(layer) : layer));
    return styledCaptions;
  }

  function applySelectedSmartClipTemplateToProject(
    project: PixoresVideoProject,
    platform: ReturnType<typeof getSmartClipPlatform>,
  ) {
    const layout = getProfessionalCaptionLayout(platform.width, platform.height, smartClipCaptionPosition, smartClipCaptionSize);
    return {
      ...project,
      layers: project.layers.map((layer) => isAiCaptionLayer(layer)
        ? placeSmartClipCaption(applySmartClipCaptionTemplate(layer, smartClipCaptionTemplateId), layout)
        : layer),
    };
  }

  function openSmartClipCaptionEditor(captions = layersRef.current.filter((layer) => isAiCaptionLayer(layer))) {
    const orderedCaptions = [...captions].sort((first, second) => first.start - second.start);
    const firstCaption = orderedCaptions[0];
    if (!firstCaption) {
      setStatus("Generate Smart Clip subtitles before opening the caption editor");
      return;
    }

    setIsSmartClipsDialogOpen(false);
    setIsPlaying(false);
    setCurrentTime(Math.max(0, firstCaption.start + Math.min(0.05, firstCaption.duration / 2)));
    setSelectedLayerId(firstCaption.id);
    setSelectedLayerIds([firstCaption.id]);
    setSelectedTrackId(firstCaption.trackId || firstCaption.id);
    setActivePanel("settings");
    setIsSidebarOpen(true);
    setIsMobilePanelOpen(true);
    setIsMobileTimelineOpen(false);
    setIsCanvasToolbarVisible(true);
    setActiveObjectStylePanel(null);
    setIsTextEffectsPanelOpen(true);
    setInlineEditingTextId("");
    setStatus(`${orderedCaptions.length} editable Smart Clip subtitle${orderedCaptions.length === 1 ? "" : "s"} ready · edit the text individually and use Styles → Apply to all`);
  }

  async function prepareEditableSmartClipCaptions() {
    const existingCaptions = layersRef.current.filter((layer) => isAiCaptionLayer(layer));
    if (existingCaptions.length) {
      openSmartClipCaptionEditor(applySelectedSmartClipTemplateToCaptions(existingCaptions));
      return;
    }

    const bridge = getPixoresDesktopBridge();
    if (!adapters.isDesktop || !bridge?.transcribeMedia) {
      setSmartClipsProgress((current) => ({
        ...current,
        error: "Local transcription is available in Pixores Video Maker Pro.",
        message: "Editable subtitles require the desktop app.",
      }));
      return;
    }

    if (!layersRef.current.some((layer) => layer.type === "media" && layer.mediaKind === "video" && layer.visible)) {
      setSmartClipsProgress((current) => ({
        ...current,
        error: "Add at least one video to the timeline first.",
        message: "No video was found for subtitle generation.",
      }));
      return;
    }

    const operationId = globalThis.crypto?.randomUUID?.() || `smart-caption-edit-${Date.now()}`;
    smartClipCaptionPreparationRef.current = operationId;
    setSmartClipsProgress({
      running: true,
      cancelling: false,
      completed: 0,
      total: 0,
      currentClip: 0,
      progress: 2,
      message: "Preparing media for editable Smart Clip subtitles...",
      error: "",
    });
    setStatus("Preparing editable Smart Clip subtitles...");

    try {
      const project = await prepareProjectMediaForRender();
      if (smartClipCaptionPreparationRef.current !== operationId) throw new Error("Smart Clip subtitle preparation cancelled");
      const videoLayers = project.layers.filter((layer) => layer.type === "media" && layer.mediaKind === "video" && layer.visible);
      if (!videoLayers.length) throw new Error("No visible video was found on the timeline.");

      const platform = getSmartClipPlatform(smartClipPlatformId, { width: smartClipCustomWidth, height: smartClipCustomHeight });
      const captionLayout = getProfessionalCaptionLayout(platform.width, platform.height, smartClipCaptionPosition, smartClipCaptionSize);
      const captionStyle = createSmartClipCaptionStyle(smartClipCaptionTemplateId, captionLayout) as Partial<VideoLayer>;
      const stamp = Date.now();
      const trackId = `smart-editable-captions-${stamp}`;
      const captionLayers: VideoLayer[] = [];
      const failures: string[] = [];

      for (let videoIndex = 0; videoIndex < videoLayers.length; videoIndex += 1) {
        if (smartClipCaptionPreparationRef.current !== operationId) throw new Error("Smart Clip subtitle preparation cancelled");
        const layer = videoLayers[videoIndex];
        const sourceUrls = getSmartClipLayerSources(project, layer);
        if (!sourceUrls.length) {
          failures.push(`${layer.name}: local source not found`);
          continue;
        }

        const jobId = globalThis.crypto?.randomUUID?.() || `smart-editable-caption-${stamp}-${videoIndex}`;
        smartClipAudioAiJobIdRef.current = jobId;
        setSmartClipsProgress((current) => ({
          ...current,
          total: videoLayers.length,
          currentClip: videoIndex + 1,
          progress: 5 + Math.round((videoIndex / Math.max(1, videoLayers.length)) * 85),
          message: `Transcribing subtitles · video ${videoIndex + 1} of ${videoLayers.length}`,
        }));

        try {
          const sourceStart = Math.max(0, layer.sourceStart ?? layer.trimStart ?? 0);
          const sourceEnd = Math.max(sourceStart + 0.05, layer.sourceEnd ?? layer.trimEnd ?? (sourceStart + layer.duration));
          const result = await bridge.transcribeMedia({
            jobId,
            sourceUrl: sourceUrls[0],
            sourceUrls,
            sourceStart,
            sourceEnd,
            model: subtitleModel,
            language: subtitleLanguage,
          });
          if (smartClipCaptionPreparationRef.current !== operationId) throw new Error("Smart Clip subtitle preparation cancelled");
          const groups = groupCaptionWords(result.captions, platform.height / Math.max(1, platform.width) >= 1.3
            ? { maxCharacters: 34, maxDurationMs: 2600 }
            : { maxCharacters: 44, maxDurationMs: 3200 });

          for (const group of groups) {
            const localStart = Math.max(0, group.startMs / 1000);
            const localEnd = Math.min(layer.duration, Math.max(localStart + 0.15, group.endMs / 1000));
            if (localEnd <= localStart) continue;
            const captionNumber = captionLayers.length + 1;
            captionLayers.push({
              id: `smart-editable-caption-${stamp}-${captionNumber}`,
              trackId,
              type: "text",
              name: `Smart Caption ${captionNumber}`,
              trackName: "AI Captions",
              trackOrder: -1,
              zIndex: 10_000,
              start: Number((layer.start + localStart).toFixed(3)),
              duration: Number((localEnd - localStart).toFixed(3)),
              visible: true,
              locked: false,
              opacity: 1,
              x: captionLayout.x,
              y: captionLayout.y,
              width: captionLayout.width,
              height: captionLayout.height,
              text: group.text,
              ...captionStyle,
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "transcription failed";
          if (/cancel/i.test(message) || smartClipCaptionPreparationRef.current !== operationId) throw new Error("Smart Clip subtitle preparation cancelled");
          failures.push(`${layer.name}: ${message}`);
        } finally {
          if (smartClipAudioAiJobIdRef.current === jobId) smartClipAudioAiJobIdRef.current = "";
        }
      }

      if (!captionLayers.length) throw new Error(failures[0] || "No spoken words were detected in the selected videos.");
      commitLayers((current) => [...current, ...captionLayers]);
      setTrackSettings((current) => [
        { id: trackId, order: -1, name: "AI Captions", muted: false },
        ...current.filter((track) => track.id !== trackId),
      ]);
      setSmartClipAutoCaptions(true);
      setSmartClipsProgress({
        running: false,
        cancelling: false,
        completed: captionLayers.length,
        total: captionLayers.length,
        currentClip: captionLayers.length,
        progress: 100,
        message: `${captionLayers.length} editable subtitles are ready.`,
        error: "",
      });
      openSmartClipCaptionEditor(captionLayers);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Smart Clip subtitle generation failed.";
      const cancelled = smartClipCaptionPreparationRef.current !== operationId || /cancel/i.test(message);
      setSmartClipsProgress((current) => ({
        ...current,
        running: false,
        cancelling: false,
        progress: cancelled ? 0 : current.progress,
        message: cancelled ? "Smart Clip subtitle preparation cancelled." : "Editable subtitles could not be generated.",
        error: cancelled ? "" : message,
      }));
      setStatus(cancelled ? "Smart Clip subtitle preparation cancelled" : `Smart Clip subtitle error: ${message}`);
    } finally {
      if (smartClipCaptionPreparationRef.current === operationId) smartClipCaptionPreparationRef.current = "";
      smartClipAudioAiJobIdRef.current = "";
    }
  }

  function getExistingSmartClipSpeechRanges(project: PixoresVideoProject, layer: PixoresVideoLayer) {
    return project.layers
      .filter((candidate) => isAiCaptionLayer(candidate))
      .flatMap((caption): SmartSpeechRange[] => {
        const overlapStart = Math.max(layer.start, caption.start);
        const overlapEnd = Math.min(layer.start + layer.duration, caption.start + caption.duration);
        if (overlapEnd <= overlapStart) return [];
        return [{
          start: Number((overlapStart - layer.start).toFixed(3)),
          end: Number((overlapEnd - layer.start).toFixed(3)),
        }];
      });
  }

  async function addAutomaticSmartClipCaptions(
    project: PixoresVideoProject,
    platform: ReturnType<typeof getSmartClipPlatform>,
    sessionId: string,
    options: { requireTranscript?: boolean } = {},
  ) {
    project = applySelectedSmartClipTemplateToProject(project, platform);
    const existingCaptions = project.layers.filter((layer) => isAiCaptionLayer(layer));
    const speechRangesByLayer = new Map<string, SmartSpeechRange[]>();
    const videoLayers = project.layers.filter((layer) => layer.type === "media" && layer.mediaKind === "video" && layer.visible);
    for (const layer of videoLayers) {
      const existing = getExistingSmartClipSpeechRanges(project, layer);
      if (existing.length) speechRangesByLayer.set(layer.id, existing);
    }
    if (!smartClipAutoCaptions && !options.requireTranscript) {
      return { project, speechRangesByLayer, captions: existingCaptions };
    }

    const bridge = getPixoresDesktopBridge();
    if (!bridge?.transcribeMedia) throw new Error("Local transcription is not available in this Pixores Video Maker Pro build.");
    const generatedCaptions: PixoresVideoLayer[] = [];
    const failures: string[] = [];
    const captionLayout = getProfessionalCaptionLayout(platform.width, platform.height, smartClipCaptionPosition, smartClipCaptionSize);
    const captionStyle = createSmartClipCaptionStyle(smartClipCaptionTemplateId, captionLayout);

    for (let index = 0; index < videoLayers.length; index += 1) {
      const layer = videoLayers[index];
      if (smartClipExportCoordinatorRef.current.shouldCancel(sessionId)) throw new Error("Smart Clips export cancelled");
      if (speechRangesByLayer.has(layer.id)) continue;
      const sourceUrls = getSmartClipLayerSources(project, layer);
      if (!sourceUrls.length) {
        failures.push(`${layer.name}: local source not found`);
        continue;
      }
      const sourceStart = Math.max(0, layer.sourceStart ?? layer.trimStart ?? 0);
      const sourceEnd = Math.max(sourceStart + 0.05, layer.sourceEnd ?? layer.trimEnd ?? (sourceStart + layer.duration));
      const jobId = globalThis.crypto?.randomUUID?.() || `smart-caption-${Date.now()}-${index}`;
      smartClipAudioAiJobIdRef.current = jobId;
      const baseProgress = 2 + Math.round((index / Math.max(1, videoLayers.length)) * 11);
      setSmartClipsProgress((current) => ({
        ...current,
        progress: baseProgress,
        message: `Generating local subtitles · video ${index + 1} of ${videoLayers.length}`,
      }));
      try {
        const result = await bridge.transcribeMedia({
          jobId,
          sourceUrl: sourceUrls[0],
          sourceUrls,
          sourceStart,
          sourceEnd,
          model: subtitleModel,
          language: subtitleLanguage,
        });
        const groups = groupCaptionWords(result.captions, { maxCharacters: 34, maxDurationMs: 2600 });
        const trackId = `smart-captions-${Date.now()}-${index}`;
        const speechRanges: SmartSpeechRange[] = [];
        for (let captionIndex = 0; captionIndex < groups.length; captionIndex += 1) {
          const group = groups[captionIndex];
          const localStart = Math.max(0, group.startMs / 1000);
          const localEnd = Math.min(layer.duration, Math.max(localStart + 0.15, group.endMs / 1000));
          if (localEnd <= localStart) continue;
          speechRanges.push({ start: localStart, end: localEnd });
          generatedCaptions.push({
            id: `${trackId}-${captionIndex}`,
            trackId,
            type: "text",
            name: `Smart Caption ${captionIndex + 1}`,
            trackName: "AI Captions",
            trackOrder: -1,
            zIndex: 10_000,
            start: Number((layer.start + localStart).toFixed(3)),
            duration: Number((localEnd - localStart).toFixed(3)),
            visible: true,
            locked: false,
            opacity: 1,
            x: captionLayout.x,
            y: captionLayout.y,
            width: captionLayout.width,
            height: captionLayout.height,
            text: group.text,
            ...captionStyle,
          });
        }
        speechRangesByLayer.set(layer.id, speechRanges);
      } catch (error) {
        const message = error instanceof Error ? error.message : "transcription failed";
        if (/cancel/i.test(message) || smartClipExportCoordinatorRef.current.shouldCancel(sessionId)) throw new Error("Smart Clips export cancelled");
        failures.push(`${layer.name}: ${message}`);
      } finally {
        if (smartClipAudioAiJobIdRef.current === jobId) smartClipAudioAiJobIdRef.current = "";
      }
    }

    if (generatedCaptions.length === 0 && speechRangesByLayer.size === 0 && failures.length) {
      throw new Error(`Automatic subtitles could not be generated. ${failures[0]}`);
    }
    return {
      project: generatedCaptions.length && smartClipAutoCaptions ? { ...project, layers: [...project.layers, ...generatedCaptions] } : project,
      speechRangesByLayer,
      captions: [...existingCaptions, ...generatedCaptions],
    };
  }

  async function addSmartClipFaceReframing(
    project: PixoresVideoProject,
    speechRangesByLayer: Map<string, SmartSpeechRange[]>,
    sessionId: string,
  ) {
    if (smartClipFaceMode === "off") return project;
    const videoLayers = project.layers.filter((layer) => layer.type === "media" && layer.mediaKind === "video" && layer.visible);
    const reframes = new Map<string, PixoresSmartReframe>();

    for (let index = 0; index < videoLayers.length; index += 1) {
      const layer = videoLayers[index];
      if (smartClipExportCoordinatorRef.current.shouldCancel(sessionId)) throw new Error("Smart Clips export cancelled");
      const sourceUrls = getSmartClipLayerSources(project, layer).map(createDesktopMediaUrl);
      if (!sourceUrls.length) continue;
      const sourceStart = Math.max(0, layer.sourceStart ?? layer.trimStart ?? 0);
      const sourceEnd = Math.max(sourceStart + 0.05, layer.sourceEnd ?? layer.trimEnd ?? (sourceStart + layer.duration));
      const samples = await analyzeFaceTracking({
        sourceUrls,
        sourceStart,
        sourceEnd,
        sampleFps: smartClipFaceMode === "dynamic" ? 4 : 2,
        maxFaces: smartClipSpeakerSelection ? 6 : 3,
        shouldCancel: () => smartClipExportCoordinatorRef.current.shouldCancel(sessionId),
        onProgress: (progress, message) => {
          const overall = 14 + Math.round(((index + progress) / Math.max(1, videoLayers.length)) * 11);
          setSmartClipsProgress((current) => ({ ...current, progress: overall, message }));
        },
      });
      const reframe = buildSmartReframe(samples, {
        mode: smartClipFaceMode,
        preferActiveSpeaker: smartClipSpeakerSelection,
        speechRanges: speechRangesByLayer.get(layer.id),
        duration: layer.duration,
      });
      if (reframe) reframes.set(layer.id, reframe);
    }

    if (!reframes.size) return project;
    return {
      ...project,
      layers: project.layers.map((layer) => {
        const smartReframe = reframes.get(layer.id);
        return smartReframe ? { ...layer, smartReframe } : layer;
      }),
    };
  }

  async function generateSubtitles() {
    const layer = layersRef.current.find((item) => item.id === selectedLayerId);
    const bridge = getPixoresDesktopBridge();
    if (!layer || !isAudioControllableLayer(layer) || !bridge?.transcribeMedia) return;
    setAudioAiBusy(true);
    setAudioAiError("");
    const jobId = crypto.randomUUID();
    audioAiJobIdRef.current = jobId;
    setAudioAiProgress({ jobId, stage: "preparing", progress: 1, message: "Starting local transcription…" });
    setStatus("Transcribing selected clip locally…");
    try {
      const sourceUrls = await prepareAudioAiSources(layer);
      const result = await bridge.transcribeMedia({
        jobId,
        sourceUrl: sourceUrls[0] || "",
        sourceUrls,
        sourceStart: getLayerSourceStart(layer),
        sourceEnd: getLayerSourceEnd(layer),
        model: subtitleModel,
        language: subtitleLanguage,
      });
      const isVerticalCanvas = selectedFormat.height / Math.max(1, selectedFormat.width) >= 1.5;
      const segments = groupCaptionWords(result.captions, isVerticalCanvas
        ? { maxCharacters: 34, maxDurationMs: 2600 }
        : { maxCharacters: 44, maxDurationMs: 3200 });
      if (segments.length === 0) throw new Error("No spoken words were detected in this clip.");
      const stamp = Date.now();
      const trackId = `captions-track-${stamp}`;
      const captionLayout = getProfessionalCaptionLayout(selectedFormat.width, selectedFormat.height);
      const captionLayers: VideoLayer[] = segments.map((segment, index) => {
        const start = Number((layer.start + segment.startMs / 1000).toFixed(3));
        const rawDuration = Math.max(0.15, (segment.endMs - segment.startMs) / 1000);
        return {
          id: `caption-${stamp}-${index}`,
          trackId,
          type: "text",
          name: `Caption ${index + 1}`,
          start,
          duration: Number(Math.min(rawDuration, Math.max(0.15, getLayerEnd(layer) - start)).toFixed(3)),
          visible: true,
          locked: false,
          opacity: 1,
          trackOrder: -1,
          trackName: "AI Captions",
          x: captionLayout.x,
          y: captionLayout.y,
          width: captionLayout.width,
          height: captionLayout.height,
          text: segment.text,
          color: "#ffffff",
          fontSize: captionLayout.fontSize,
          fontFamily: "Arial",
          isBold: true,
          textAlign: "center",
          hasTextBg: true,
          textBgColor: "#000000",
          textBgPadding: captionLayout.textBgPadding,
          textBgRadius: captionLayout.textBgRadius,
          lineHeight: captionLayout.lineHeight,
          letterSpacing: captionLayout.letterSpacing,
          shadowColor: "#000000",
          shadowBlur: 8,
          shadowOpacity: 0.75,
        };
      });
      commitLayers((current) => [...current, ...captionLayers]);
      setTrackSettings((current) => [
        { id: trackId, order: -1, name: "AI Captions", muted: false },
        ...current.filter((track) => track.id !== trackId),
      ]);
      setTimelineDuration((value) => Math.max(value, Math.ceil(getLayerEnd(layer) + TIMELINE_EMPTY_TAIL_SECONDS)));
      setSelectedLayerId(captionLayers[0].id);
      setSelectedTrackId(trackId);
      setStatus(`${captionLayers.length} editable subtitles generated · ${result.language}`);
      setIsAudioAiDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Subtitle generation failed.";
      const cancelled = /abort|cancel/i.test(message);
      setAudioAiError(cancelled ? "Transcription cancelled." : message);
      setStatus(cancelled ? "Subtitle generation cancelled" : `Subtitle error: ${message}`);
    } finally {
      setAudioAiBusy(false);
      audioAiJobIdRef.current = "";
    }
  }

  async function cancelAudioAiOperation() {
    const jobId = audioAiJobIdRef.current;
    if (!jobId) return;
    setAudioAiProgress((current) => current ? { ...current, message: "Cancelling transcription…" } : current);
    await getPixoresDesktopBridge()?.cancelAudioAi?.(jobId);
  }

  async function analyzeSelectedClipSilence() {
    const layer = layersRef.current.find((item) => item.id === selectedLayerId);
    const bridge = getPixoresDesktopBridge();
    if (!layer || !isAudioControllableLayer(layer) || !bridge?.detectSilences) return;
    setAudioAiBusy(true);
    setAudioAiError("");
    setSilenceAnalysis(null);
    setStatus("Analyzing silence in selected clip…");
    try {
      const sourceUrls = await prepareAudioAiSources(layer);
      const result = await bridge.detectSilences({
        sourceUrl: sourceUrls[0] || "",
        sourceUrls,
        sourceStart: getLayerSourceStart(layer),
        sourceEnd: getLayerSourceEnd(layer),
        thresholdDb: silenceThresholdDb,
        minimumDuration: silenceMinimumDuration,
      });
      setSilenceAnalysis(result);
      setStatus(`${result.silences.length} silence section${result.silences.length === 1 ? "" : "s"} detected`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Silence analysis failed.";
      setAudioAiError(message);
      setStatus(`Silence analysis error: ${message}`);
    } finally {
      setAudioAiBusy(false);
    }
  }

  function applySilenceRemoval() {
    const selected = layersRef.current.find((item) => item.id === selectedLayerId);
    if (!selected || !silenceAnalysis || selected.locked) return;
    const removals = getSilenceRemovalRanges(silenceAnalysis.silences, silencePadding);
    const kept = getKeptAudioRanges(silenceAnalysis.clipDuration, removals);
    if (kept.length === 0 || removals.length === 0) {
      setAudioAiError("No removable silence remains with the selected padding.");
      return;
    }

    const companion = selected.type === "media"
      ? layersRef.current.find((item) => item.type === "audio" && item.linkedVideoLayerId === selected.id)
      : selected.linkedVideoLayerId
        ? layersRef.current.find((item) => item.id === selected.linkedVideoLayerId)
        : undefined;
    const targets = [selected, companion].filter((item): item is VideoLayer => Boolean(item));
    if (targets.some((item) => item.locked)) {
      setAudioAiError("Unlock the linked video and audio tracks before removing silence.");
      return;
    }

    const targetIds = new Set(targets.map((item) => item.id));
    const fragmentIds = new Map<string, string[]>();
    for (const target of targets) {
      fragmentIds.set(target.id, kept.map((_, index) => index === 0 ? target.id : `${target.id}-silence-${Date.now()}-${index}`));
    }
    const videoTarget = targets.find((item) => item.type === "media");
    const originalEnd = getLayerEnd(selected);
    const keptDuration = kept.reduce((total, range) => total + range.end - range.start, 0);
    const removedDuration = Math.max(0, silenceAnalysis.clipDuration - keptDuration);

    commitLayers((current) => current.flatMap((item) => {
      if (item.type === "transition" && (targetIds.has(item.fromLayerId || "") || targetIds.has(item.toLayerId || ""))) return [];
      if (!targetIds.has(item.id)) {
        return [item.start >= originalEnd ? { ...item, start: Number(Math.max(0, item.start - removedDuration).toFixed(3)) } : item];
      }
      const ids = fragmentIds.get(item.id) || [];
      const sourceStart = getLayerSourceStart(item);
      let timelineCursor = selected.start;
      return kept.map((range, index) => {
        const duration = Number((range.end - range.start).toFixed(3));
        const nextSourceStart = Number((sourceStart + range.start).toFixed(3));
        const nextStart = Number(timelineCursor.toFixed(3));
        timelineCursor += duration;
        return {
          ...item,
          id: ids[index],
          name: index === 0 ? item.name : `${item.name} ${index + 1}`,
          start: nextStart,
          duration,
          sourceStart: nextSourceStart,
          trimStart: nextSourceStart,
          sourceEnd: Number((nextSourceStart + duration).toFixed(3)),
          trimEnd: Number((nextSourceStart + duration).toFixed(3)),
          linkedVideoLayerId: item.type === "audio" && videoTarget
            ? fragmentIds.get(videoTarget.id)?.[index]
            : item.linkedVideoLayerId,
        };
      });
    }));
    const firstId = fragmentIds.get(selected.id)?.[0] || selected.id;
    setSelectedLayerId(firstId);
    setTimelineDuration((value) => Math.max(1, Number((value - removedDuration).toFixed(3))));
    setCurrentTime(selected.start);
    setStatus(`Silence removed · timeline shortened ${removedDuration.toFixed(1)}s · Undo available`);
    setIsAudioAiDialogOpen(false);
    setSilenceAnalysis(null);
  }

  function updateSmartClipCandidate(candidateId: string, patch: Partial<Pick<SmartClipCandidate, "title" | "selected">>) {
    setSmartClipCandidates((current) => current.map((candidate) => candidate.id === candidateId ? { ...candidate, ...patch } : candidate));
  }

  async function analyzeSmartClips() {
    if (!adapters.isDesktop) {
      setSmartClipsProgress((current) => ({ ...current, error: "Local Smart Clip analysis is available in Pixores Video Maker Pro.", message: "Desktop local processing is required." }));
      return;
    }
    const masterProject = smartClipSourceProjectRef.current;
    if (!masterProject || !smartClipSource) {
      setSmartClipsProgress((current) => ({ ...current, error: "Choose the master video first.", message: "No local source video is loaded." }));
      return;
    }

    const sessionId = globalThis.crypto?.randomUUID?.() || `smart-analysis-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const coordinator = smartClipExportCoordinatorRef.current;
    if (!coordinator.tryStart(sessionId)) return;
    resetSmartClipCandidates();
    setSmartClipsProgress({
      running: true,
      cancelling: false,
      completed: 0,
      total: 1,
      currentClip: 1,
      progress: 2,
      message: "Preparing the video for private local analysis...",
      error: "",
    });
    setStatus("Smart Clips · analyzing speech locally");

    try {
      const sourceProject = masterProject;
      if (coordinator.shouldCancel(sessionId)) throw new Error("Smart Clip analysis cancelled");
      const platform = getSmartClipPlatform(smartClipPlatformId, { width: smartClipCustomWidth, height: smartClipCustomHeight });
      const captionResult = await addAutomaticSmartClipCaptions(sourceProject, platform, sessionId, { requireTranscript: true });
      if (coordinator.shouldCancel(sessionId)) throw new Error("Smart Clip analysis cancelled");
      const transcriptCues: SmartClipTranscriptCue[] = captionResult.captions
        .filter((caption) => Boolean(caption.text?.trim()))
        .map((caption) => ({
          start: caption.start,
          end: caption.start + caption.duration,
          text: caption.text || "",
        }));
      const safeDuration = Math.min(platform.maxDuration, Math.max(8, smartClipDuration));
      const candidates = generateLocalSmartClipCandidates(transcriptCues, sourceProject.duration, safeDuration);
      if (!candidates.length) throw new Error("No complete spoken moments were found in this video.");

      smartClipPreparedProjectRef.current = captionResult.project;
      smartClipSpeechRangesRef.current = captionResult.speechRangesByLayer;
      setSmartClipCandidates(candidates);
      setSmartClipActiveCandidateId(candidates[0].id);
      setSmartClipsProgress({
        running: false,
        cancelling: false,
        completed: candidates.length,
        total: candidates.length,
        currentClip: candidates.length,
        progress: 100,
        message: `${candidates.length} local Smart Clip proposal${candidates.length === 1 ? "" : "s"} ready to review.`,
        error: "",
      });
      setStatus(`Smart Clips · ${candidates.length} local proposals ready · review titles and select exports`);
      coordinator.finish(sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Local Smart Clip analysis failed.";
      const cancelled = coordinator.shouldCancel(sessionId) || /cancel/i.test(message);
      setSmartClipsProgress((current) => ({
        ...current,
        running: false,
        cancelling: false,
        progress: cancelled ? 0 : current.progress,
        message: cancelled ? "Smart Clip analysis cancelled." : "The local analysis could not create proposals.",
        error: cancelled ? "" : message,
      }));
      setStatus(cancelled ? "Smart Clip analysis cancelled" : `Smart Clip analysis error: ${message}`);
      coordinator.finish(sessionId);
    } finally {
      smartClipAudioAiJobIdRef.current = "";
    }
  }

  async function cancelSmartClipsExport() {
    const wasPreparingCaptions = Boolean(smartClipCaptionPreparationRef.current);
    smartClipCaptionPreparationRef.current = "";
    const renderIds = smartClipExportCoordinatorRef.current.requestCancel();
    setSmartClipsProgress((current) => ({ ...current, cancelling: true, message: wasPreparingCaptions ? "Cancelling subtitle preparation..." : "Cancelling Smart Clips..." }));
    const transcriptionJobId = smartClipAudioAiJobIdRef.current;
    const bridge = getPixoresDesktopBridge();
    await Promise.allSettled([
      ...(adapters.renderAdapter.cancelRender
        ? renderIds.map((renderId) => adapters.renderAdapter.cancelRender!(renderId))
        : []),
      ...(transcriptionJobId && bridge?.cancelAudioAi ? [bridge.cancelAudioAi(transcriptionJobId)] : []),
    ]);
  }

  async function exportSmartClips(platformId: SmartClipPlatformId, segmentDuration: number, customWidth: number, customHeight: number) {
    if (!adapters.isDesktop) {
      setSmartClipsProgress((current) => ({ ...current, error: "Smart Clips batch export is available in Pixores Video Maker Pro.", message: "Desktop local rendering is required." }));
      return;
    }
    const reviewedCandidates = smartClipCandidates.filter((candidate) => candidate.selected);
    if (!smartClipSourceProjectRef.current || !smartClipSource) {
      setSmartClipsProgress((current) => ({ ...current, error: "Choose the master video first.", message: "No local source video is loaded." }));
      return;
    }
    if (!smartClipCandidates.length) {
      setSmartClipsProgress((current) => ({ ...current, error: "Analyze the master video before exporting.", message: "No reviewed Smart Clip proposals are available." }));
      return;
    }
    if (smartClipCandidates.length && !reviewedCandidates.length) {
      setSmartClipsProgress((current) => ({ ...current, error: "Select at least one Smart Clip proposal.", message: "Nothing is selected for export." }));
      return;
    }

    const sessionId = globalThis.crypto?.randomUUID?.() || `smart-clips-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const coordinator = smartClipExportCoordinatorRef.current;
    if (!coordinator.tryStart(sessionId)) return;

    setSmartClipsProgress((current) => ({
      ...current,
      running: true,
      cancelling: false,
      error: "",
      message: "Preparing project media for local Smart Clips export...",
    }));
    let sourceProject: PixoresVideoProject;
    try {
      if (smartClipPreparedProjectRef.current) sourceProject = smartClipPreparedProjectRef.current;
      else sourceProject = smartClipSourceProjectRef.current;
      if (coordinator.shouldCancel(sessionId)) throw new Error("Smart Clips export cancelled");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Project media could not be prepared.";
      const cancelled = coordinator.shouldCancel(sessionId) || /cancelled/i.test(message);
      setSmartClipsProgress((current) => ({
        ...current,
        running: false,
        cancelling: false,
        error: cancelled ? "" : message,
        message: cancelled ? "Smart Clips export cancelled." : "Smart Clips could not prepare the source media.",
      }));
      setStatus(cancelled ? "Smart Clips export cancelled" : `Smart Clips media error: ${message}`);
      coordinator.finish(sessionId);
      return;
    }
    if (!sourceProject.layers.some((layer) => layer.type === "media" && layer.mediaKind === "video")) {
      setSmartClipsProgress((current) => ({ ...current, running: false, error: "Choose the master video first.", message: "No source video was found." }));
      coordinator.finish(sessionId);
      return;
    }

    const platform = getSmartClipPlatform(platformId, { width: customWidth, height: customHeight });
    try {
      let speechRangesByLayer = smartClipSpeechRangesRef.current;
      if (!smartClipPreparedProjectRef.current) {
        const captionResult = await addAutomaticSmartClipCaptions(sourceProject, platform, sessionId);
        sourceProject = captionResult.project;
        speechRangesByLayer = captionResult.speechRangesByLayer;
      }
      sourceProject = await addSmartClipFaceReframing(sourceProject, speechRangesByLayer, sessionId);
      if (coordinator.shouldCancel(sessionId)) throw new Error("Smart Clips export cancelled");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Smart enhancements could not be prepared.";
      const cancelled = coordinator.shouldCancel(sessionId) || /cancelled/i.test(message);
      setSmartClipsProgress((current) => ({
        ...current,
        running: false,
        cancelling: false,
        error: cancelled ? "" : message,
        message: cancelled ? "Smart Clips export cancelled." : "Smart Clips enhancements could not be prepared.",
      }));
      setStatus(cancelled ? "Smart Clips export cancelled" : `Smart Clips enhancement error: ${message}`);
      coordinator.finish(sessionId);
      return;
    }
    const safeSegmentDuration = Math.min(platform.maxDuration, Math.max(1, segmentDuration));
    const segments = reviewedCandidates.length ? reviewedCandidates : createSmartClipSegments(sourceProject.duration, safeSegmentDuration);
    if (!segments.length) {
      setSmartClipsProgress((current) => ({ ...current, running: false, error: "The project does not contain an exportable duration.", message: "Add media to the timeline first." }));
      coordinator.finish(sessionId);
      return;
    }

    setSmartClipsProgress({
      running: true,
      cancelling: false,
      completed: 0,
      total: segments.length,
      currentClip: 1,
      progress: 25,
      message: `Preparing ${segments.length} ${platform.shortLabel} clip${segments.length === 1 ? "" : "s"}...`,
      error: "",
    });
    setStatus(`Smart Clips · ${platform.label} · 0 of ${segments.length} exported`);

    try {
      for (let index = 0; index < segments.length; index += 1) {
        if (coordinator.shouldCancel(sessionId)) throw new Error("Smart Clips export cancelled");
        const segment = segments[index];
        const candidate = reviewedCandidates[index];
        const candidateTitle = candidate?.title.trim() || `Smart Clip ${index + 1}`;
        const clipProject = createSmartClipProject(sourceProject, segment, platform);
        const clipNumber = String(index + 1).padStart(2, "0");
        const candidateFileName = candidate
          ? `${sanitizeProjectFileName(candidateTitle) || platform.fileSuffix}-${clipNumber}`
          : `${sanitizeProjectFileName(projectTitle)}-${platform.fileSuffix}-${clipNumber}`;
        const clipSettings = applyExportQualityPreset({
          ...createDefaultExportSettings({
            projectTitle: candidateFileName,
            width: platform.width,
            height: platform.height,
            fps: exportSettings.fps || 30,
          }),
          fileName: normalizeExportFileName(candidateFileName, "mp4"),
          outputDirectory: exportSettings.outputDirectory,
          renderMethod: "local",
          acceleration: smartClipFastExport ? "auto" : exportSettings.acceleration,
          includeAudio: exportSettings.includeAudio,
        }, smartClipFastExport ? "fast" : normalizeExportQualityPreset(exportSettings.qualityPreset));

        setSmartClipsProgress((current) => ({
          ...current,
          currentClip: index + 1,
          message: `Rendering clip ${index + 1} of ${segments.length} · ${formatTimelineClock(segment.start)}–${formatTimelineClock(segment.end)}`,
        }));

        const started = await adapters.renderAdapter.startRender(clipProject, {
          outputFormatId: getExportFormatId(clipSettings),
          exportSettings: clipSettings,
          concurrencyKey: "smart-clips",
          renderSessionId: sessionId,
        });
        if (!started.renderId) throw new Error(`Clip ${index + 1} could not start rendering.`);
        coordinator.registerRender(sessionId, started.renderId);

        let finished = false;
        while (!finished) {
          if (coordinator.shouldCancel(sessionId)) {
            await adapters.renderAdapter.cancelRender?.(started.renderId);
            throw new Error("Smart Clips export cancelled");
          }
          await new Promise((resolve) => window.setTimeout(resolve, 700));
          const job = await adapters.renderAdapter.getRenderStatus(started.renderId);
          const jobProgress = Math.max(0, Math.min(1, job.progress || 0));
          const totalProgress = 25 + Math.round(((index + jobProgress) / segments.length) * 75);
          setSmartClipsProgress((current) => ({
            ...current,
            progress: totalProgress,
            message: `Rendering clip ${index + 1} of ${segments.length} · ${Math.round(jobProgress * 100)}%`,
          }));
          setStatus(`Smart Clips · ${platform.label} · clip ${index + 1} of ${segments.length} · ${Math.round(jobProgress * 100)}%`);

          if (job.status === "completed") {
            if (job.outputUrl && !adapters.isDesktop) await saveExportToDestination(job.outputUrl, clipSettings.fileName);
            finished = true;
            coordinator.unregisterRender(sessionId, started.renderId);
            setSmartClipsProgress((current) => ({ ...current, completed: index + 1 }));
          } else if (job.status === "failed") {
            throw new Error(job.error || `Clip ${index + 1} failed to render.`);
          } else if (job.status === "cancelled") {
            throw new Error("Smart Clips export cancelled");
          }
        }
      }

      setSmartClipsProgress({
        running: false,
        cancelling: false,
        completed: segments.length,
        total: segments.length,
        currentClip: segments.length,
        progress: 100,
        message: `${segments.length} ${platform.shortLabel} clip${segments.length === 1 ? "" : "s"} exported successfully.`,
        error: "",
      });
      setStatus(`Smart Clips complete · ${segments.length} ${platform.label} file${segments.length === 1 ? "" : "s"} exported`);
      coordinator.finish(sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Smart Clips export failed.";
      const cancelled = coordinator.shouldCancel(sessionId) || /cancelled/i.test(message);
      setSmartClipsProgress((current) => ({
        ...current,
        running: false,
        cancelling: false,
        message: cancelled ? "Smart Clips export cancelled." : "Smart Clips stopped before all files were exported.",
        error: cancelled ? "" : message,
      }));
      setStatus(cancelled ? "Smart Clips export cancelled" : `Smart Clips error: ${message}`);
      coordinator.finish(sessionId);
    }
  }

  return (
    <div className={styles.page}>
      <section
        className={`${styles.editorShell} ${isSidebarOpen ? "" : styles.menuClosed} ${isMobileTimelineOpen ? styles.mobileTimelineOpen : ""}`}
        style={{
          gridTemplateColumns: isSidebarOpen
            ? `56px ${sidePanelWidth}px 6px minmax(0, 1fr)`
            : "56px 0 minmax(0, 1fr)",
        }}
      >
        <aside className={styles.leftRail} aria-label="Video maker menu">
          <button type="button" className={styles.railButton} onClick={toggleToolPanel} aria-label={isSidebarOpen ? "Collapse menu" : "Open menu"}>
            {isSidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
          </button>
          <button type="button" className={`${styles.railButton} ${activePanel === "imports" && (isSidebarOpen || isMobilePanelOpen) ? styles.activeRailButton : ""}`} onClick={() => openToolPanel("imports")} aria-label="Imports"><ImagePlus size={19} /><span>Media</span></button>
          <button type="button" className={`${styles.railButton} ${activePanel === "elements" && (isSidebarOpen || isMobilePanelOpen) ? styles.activeRailButton : ""}`} onClick={() => openToolPanel("elements")} aria-label="Elements"><Shapes size={19} /><span>Assets</span></button>
          <button type="button" className={`${styles.railButton} ${activePanel === "text" && (isSidebarOpen || isMobilePanelOpen) ? styles.activeRailButton : ""}`} onClick={() => openToolPanel("text")} aria-label="Text"><Type size={19} /><span>Text</span></button>
          <button type="button" className={`${styles.railButton} ${activePanel === "audio" && (isSidebarOpen || isMobilePanelOpen) ? styles.activeRailButton : ""}`} onClick={() => openToolPanel("audio")} aria-label="Audio"><Music size={19} /><span>Audio</span></button>
        </aside>

        <aside className={`${styles.sidePanel} ${isSidebarOpen ? "" : styles.sidePanelClosed} ${isMobilePanelOpen ? styles.mobilePanelOpen : ""}`} aria-label="Video maker options">
          {activePanel === "imports" && (
            <div
              className={styles.importBox}
              onContextMenu={(event) => {
                event.preventDefault();
                setImportContextMenu({ x: event.clientX, y: event.clientY });
              }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
              onDrop={(event) => void importDroppedImages(event)}
            >
              <div className={styles.panelTitle}><ImagePlus size={17} /> Imports</div>
              <label className={styles.importDrop}>
                <span className={styles.importDropContent}>
                  <span className={styles.importDropIcon}><ImagePlus size={22} /></span>
                  <strong>Add image, video or audio</strong>
                  <small>Click to browse or drag files here</small>
                </span>
                <input type="file" accept="image/*,video/*,audio/*" multiple onChange={handleFileChange} />
              </label>
              <div className={styles.quickImportActions}>
                <button type="button" className={styles.quickPasteAction} onClick={() => void pasteImageFromClipboard()}>
                  <span className={styles.quickImportIcon}><ClipboardPaste size={18} /></span>
                  <span className={styles.quickImportCopy}><strong>Paste image</strong><small>Copy from ChatGPT or another app · Ctrl+V</small></span>
                </button>
                {adapters.isDesktop && (
                  <label className={styles.autoImportAction} title="Automatically import new images downloaded while Pixores is open">
                    <input
                      type="checkbox"
                      checked={autoImportDownloads}
                      onChange={(event) => {
                        setAutoImportDownloads(event.target.checked);
                        localStorage.setItem(DOWNLOAD_AUTO_IMPORT_KEY, String(event.target.checked));
                        downloadScanSinceRef.current = Date.now();
                      }}
                    />
                    <span className={styles.autoImportSwitch} aria-hidden="true"><i /></span>
                    <span className={styles.quickImportCopy}><strong>Watch Downloads</strong><small>Import new images automatically</small></span>
                  </label>
                )}
              </div>
              <div className={styles.mediaSearch}>
                <Search size={15} />
                <input
                  type="search"
                  value={importSearch}
                  onChange={(event) => setImportSearch(event.target.value)}
                  placeholder="Search media"
                />
              </div>
              <div className={styles.mediaFilters} aria-label="Media filters">
                {([
                  ["all", "All"],
                  ["video", "Video"],
                  ["image", "Images"],
                  ["audio", "Audio"],
                ] as Array<[ImportKindFilter, string]>).map(([kind, label]) => (
                  <button
                    type="button"
                    key={kind}
                    className={importKindFilter === kind ? styles.activeMediaFilter : ""}
                    onClick={() => setImportKindFilter(kind)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className={styles.importList}>
                {filteredImports.length ? filteredImports.map((item) => (
                  <div
                    className={`${styles.importItem} ${selectedImport?.id === item.id ? styles.selectedImportItem : ""}`}
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedImportId(item.id)}
                    onDoubleClick={() => addImportToTrack(item)}
                    title="Double-click to add at the playhead"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setSelectedImportId(item.id);
                    }}
                  >
                    <span className={styles.importPreview}>
                      {item.kind === "video" ? (
                        <video
                          src={item.url}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : item.kind === "audio" ? (
                        <Music size={20} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt="" />
                      )}
                      {(item.kind === "video" || item.kind === "audio") && (
                        <small>{formatTimelineClock(item.duration || 0).slice(3)}</small>
                      )}
                    </span>
                    <span className={styles.importName}>
                      {item.kind === "video" ? <Film size={14} /> : item.kind === "audio" ? <Music size={14} /> : <ImagePlus size={14} />}
                      <span>{item.name}</span>
                    </span>
                    <span className={`${styles.importStatus} ${styles[`importStatus${(item.uploadStatus || "local")[0].toUpperCase()}${(item.uploadStatus || "local").slice(1)}`]}`}>
                      {item.uploadStatus === "uploading" ? "Analyzing" : item.uploadStatus === "ready" ? "Analyzed" : item.uploadStatus === "error" ? "Error" : "Local"}
                    </span>
                    <div className={styles.importActions}>
                      <button type="button" onClick={(event) => { event.stopPropagation(); addImportToTrack(item); }} aria-label={`Add ${item.name} to tracks`}>
                        <Plus size={14} />
                      </button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); deleteImport(item.id); }} aria-label={`Delete ${item.name} from imports`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )) : <span className={styles.emptyImports}>{imports.length ? "No media matches this search" : "No imports yet · paste or drop an image here"}</span>}
              </div>
              {selectedImport && (
                <div className={styles.mediaPreviewPanel}>
                  <div className={styles.mediaPreviewHeader}>
                    <span>{selectedImport.name}</span>
                    <small>{selectedImport.kind.toUpperCase()} - {formatFileSize(selectedImport.metadata?.size || selectedImport.size)}</small>
                  </div>
                  {selectedImport.metadata && (
                    <>
                      <dl className={styles.mediaMetadataGrid}>
                        {getMediaMetadataRows(selectedImport.metadata).map(([label, value]) => (
                          <div key={`${label}-${value}`}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                      {selectedImport.metadata.warnings?.length ? (
                        <div className={styles.mediaMetadataWarnings}>
                          {selectedImport.metadata.warnings.map((warning) => <span key={warning}>{warning}</span>)}
                        </div>
                      ) : null}
                    </>
                  )}
                  <div className={styles.mediaPreviewStage}>
                    {selectedImport.kind === "video" ? (
                      <video
                        key={selectedImport.id}
                        ref={(node) => { mediaPreviewRef.current = node; }}
                        src={selectedImport.url}
                        playsInline
                        onLoadedMetadata={(event) => {
                          setMediaPreviewDuration(event.currentTarget.duration || selectedImport.duration || 0);
                          setMediaPreviewTime(event.currentTarget.currentTime || 0);
                        }}
                        onTimeUpdate={(event) => setMediaPreviewTime(event.currentTarget.currentTime || 0)}
                        onPlay={() => setIsMediaPreviewPlaying(true)}
                        onPause={() => setIsMediaPreviewPlaying(false)}
                      />
                    ) : selectedImport.kind === "audio" ? (
                      <div className={styles.audioPreviewStage}>
                        <Music size={26} />
                        <audio
                          key={selectedImport.id}
                          ref={(node) => { mediaPreviewRef.current = node; }}
                          src={selectedImport.url}
                          onLoadedMetadata={(event) => {
                            setMediaPreviewDuration(event.currentTarget.duration || selectedImport.duration || 0);
                            setMediaPreviewTime(event.currentTarget.currentTime || 0);
                          }}
                          onTimeUpdate={(event) => setMediaPreviewTime(event.currentTarget.currentTime || 0)}
                          onPlay={() => setIsMediaPreviewPlaying(true)}
                          onPause={() => setIsMediaPreviewPlaying(false)}
                        />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedImport.url} alt="" />
                    )}
                  </div>
                  <div className={styles.mediaPreviewControls}>
                    <button type="button" onClick={toggleMediaPreviewPlayback} disabled={selectedImport.kind === "image"} aria-label="Play media preview">
                      {isMediaPreviewPlaying ? <Square size={14} /> : <Play size={14} />}
                    </button>
                    <button type="button" onClick={stopMediaPreview} disabled={selectedImport.kind === "image"} aria-label="Stop media preview">
                      <Square size={14} />
                    </button>
                    <input
                      type="range"
                      min="0"
                      max={mediaPreviewDuration || selectedImport.duration || 0}
                      step="0.05"
                      value={mediaPreviewTime}
                      disabled={selectedImport.kind === "image"}
                      onChange={(event) => {
                        const media = mediaPreviewRef.current;
                        const nextTime = Number(event.target.value);
                        if (media) media.currentTime = nextTime;
                        setMediaPreviewTime(nextTime);
                      }}
                    />
                    <span>{formatTimecode(mediaPreviewTime)} / {formatTimecode(mediaPreviewDuration || selectedImport.duration || 0)}</span>
                    <button type="button" onClick={() => setIsMediaPreviewMuted((value) => !value)} aria-label="Mute media preview">
                      {isMediaPreviewMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={mediaPreviewVolume}
                      onChange={(event) => setMediaPreviewVolume(Number(event.target.value))}
                    />
                    <button type="button" onClick={() => void snapshotSelectedImport()} disabled={selectedImport.kind === "audio"} aria-label="Snapshot media">
                      <Camera size={14} />
                    </button>
                    <button type="button" onClick={() => void mediaPreviewRef.current?.requestFullscreen?.()} disabled={selectedImport.kind === "image"} aria-label="Fullscreen media">
                      <Maximize2 size={14} />
                    </button>
                  </div>
                  <div className={styles.mediaPreviewActions}>
                    <button type="button" onClick={() => addImportToTrack(selectedImport)}><Plus size={14} /> Add to Timeline</button>
                    {selectedImport.kind === "image" && (
                      <button type="button" onClick={() => void saveImportedImageToDisk(selectedImport)}>
                        <Download size={14} /> Save image to disk
                      </button>
                    )}
                    <button type="button" onClick={() => saveImportedAssetToPersonalLibrary(selectedImport)} disabled={selectedImport.uploadStatus === "uploading"}>
                      <FolderOpen size={14} /> Save to My Library
                    </button>
                    <button type="button" onClick={() => replaceSelectedClipWithImport(selectedImport)} disabled={!selectedLayer || selectedLayer.locked}>Replace Selected Clip</button>
                    {selectedImport.kind !== "audio" && (
                      <button type="button" onClick={() => setImportAsBackground(selectedImport)}>Set as Background</button>
                    )}
                    <button type="button" onClick={() => deleteImport(selectedImport.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activePanel === "elements" && (
            <div className={styles.toolSection}>
              <div className={styles.elementsPanelHeader}>
                <div className={styles.panelTitle}><Shapes size={17} /> Elements</div>
                <button
                  type="button"
                  className={styles.saveToLibraryButton}
                  onClick={() => void saveSelectedToPersonalLibrary()}
                  disabled={!selectedLayer || selectedLayer.type === "audio" || selectedLayer.type === "transition" || personalLibraryStatus === "saving"}
                  title="Save the selected edited element for future projects"
                >
                  <Plus size={13} /> Save selected
                </button>
              </div>
              <div className={styles.elementsBrowser}>
              <nav className={styles.elementTabs} aria-label="Element categories">
                {([
                  ["my-library", "My Library", <FolderOpen size={15} key="library" />],
                  ["assets", "Assets"],
                  ["video-backgrounds", "Backgrounds"],
                  ["sound-effects", "Audio FX"],
                  ["lower-thirds", "Lower thirds"],
                  ["animations", "Animations"],
                  ["effects", "Effects"],
                  ["shapes", "Shapes"],
                  ["frames", "Frames"],
                  ["grids", "Grids"],
                  ["social", "Social"],
                  ["gradients", "Gradients"],
                  ["transitions", "Transitions"],
                  ["emojis", "Emojis"],
                ] as Array<[ElementPanelTab, string, ReactNode?]>).map(([tab, label, icon]) => (
                   <button type="button" key={tab} className={activeElementTab === tab ? styles.activeElementTab : ""} onClick={() => setActiveElementTab(tab)}>
                     {icon || <span className={styles.elementTabDot} aria-hidden="true" />}
                     <span>{label}</span>
                   </button>
                 ))}
              </nav>
              <section className={styles.elementCatalog}>

              {activeElementTab === "my-library" && (
                <div className={styles.personalLibrary}>
                  <div className={styles.elementsLibraryHeader}>
                    <span>
                      <strong><FolderOpen size={15} /> My Library</strong>
                      <small>Your reusable brand elements and edited designs</small>
                    </span>
                    <span className={styles.libraryCount}>{filteredPersonalLibraryItems.length}</span>
                  </div>
                  <div className={styles.libraryFolders} aria-label="My Library folders">
                    <button type="button" className={personalLibraryCollection === "all" ? styles.activeLibraryFolder : ""} onClick={() => setPersonalLibraryCollection("all")}><FolderOpen size={14} /> All</button>
                    <button type="button" className={personalLibraryCollection === "chatgpt" ? styles.activeLibraryFolder : ""} onClick={() => setPersonalLibraryCollection("chatgpt")}><Sparkles size={14} /> Creations from ChatGPT</button>
                    <button type="button" className={personalLibraryCollection === "general" ? styles.activeLibraryFolder : ""} onClick={() => setPersonalLibraryCollection("general")}><Shapes size={14} /> My elements</button>
                  </div>
                  {personalLibraryStatus === "loading" ? (
                    <div className={styles.mediaLibraryState}><FolderOpen size={22} /><strong>Loading your library...</strong></div>
                  ) : filteredPersonalLibraryItems.length === 0 ? (
                    <div className={styles.personalLibraryEmpty}>
                      <FolderOpen size={26} />
                      <strong>{personalLibraryCollection === "chatgpt" ? "Your ChatGPT creations will appear here" : "Build your brand kit"}</strong>
                      <span>{personalLibraryCollection === "chatgpt" ? "Paste, drag or download an image while Pixores is open." : "Select an edited lower third, logo, text, frame or graphic and choose Save selected."}</span>
                    </div>
                  ) : (
                    <div className={styles.personalLibraryGrid}>
                      {filteredPersonalLibraryItems.map((item) => {
                        const previewAsset = item.assets.find((asset) => asset.kind === "image") || item.assets[0];
                        return (
                          <div key={item.id} className={styles.personalLibraryCard}>
                            <button type="button" className={styles.personalLibraryCardMain} onClick={() => addPersonalLibraryItem(item)}>
                              <span className={styles.personalLibraryPreview} data-kind={item.kind}>
                                {previewAsset?.kind === "image" ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={createDesktopMediaUrl(previewAsset.persistentUrl || previewAsset.url)} alt="" />
                                ) : item.kind === "lower-third" ? (
                                  <span className={styles.libraryLowerThirdPreview}><i /><b>{item.layer.lowerThird?.content.primaryText || "Name"}</b><small>{item.layer.lowerThird?.content.secondaryText || "Title"}</small></span>
                                ) : item.kind === "text" ? (
                                  <b className={styles.libraryTextPreview} style={{ color: item.layer.color }}>{item.layer.text || "Text"}</b>
                                ) : item.kind === "shape" ? (
                                  <ElementPresetThumbnail shapeType={item.layer.shapeType || "rectangle"} color={item.layer.color || "#22d3c5"} category={isMediaContainerShape(item.layer.shapeType) ? "frame" : "shape"} />
                                ) : (
                                  <span className={styles.libraryMediaPreview}><Film size={24} /></span>
                                )}
                              </span>
                              <span className={styles.personalLibraryCardCopy}><strong>{item.name}</strong><small>{item.kind.replace("-", " ")}</small></span>
                            </button>
                            <button type="button" className={styles.personalLibraryDelete} onClick={() => void removePersonalLibraryItem(item.id)} aria-label={`Remove ${item.name} from My Library`} title="Remove from My Library"><Trash2 size={13} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeElementTab === "assets" && (
                <div className={styles.assetGrid}>
                  {libraryAssets.map((asset) => (
                    <button type="button" key={`${asset.category}-${asset.name}`} className={styles.assetCard} onClick={() => createMediaLayerFromAsset(asset)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.src} alt="" />
                      <span>{asset.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeElementTab === "video-backgrounds" && (
                <div className={styles.builtInMediaLibrary}>
                  <div className={styles.elementsLibraryHeader}>
                    <span>
                      <strong><Film size={15} /> Video Backgrounds</strong>
                      <small>Offline colors and gradients, plus loop-ready motion backgrounds</small>
                    </span>
                    <span className={styles.libraryCount}>{mediaLibrary.videoBackgrounds.length + canvasBackgroundPresets.length}</span>
                  </div>
                  <section className={styles.canvasBackgroundSection}>
                    <div className={styles.librarySectionHeading}>
                      <span><strong>Color backgrounds</strong><small>Solid and gradient · editable after adding</small></span>
                      <b>{canvasBackgroundPresets.length}</b>
                    </div>
                    <div className={styles.canvasBackgroundGrid}>
                      {canvasBackgroundPresets.map((preset) => (
                        <button type="button" key={preset.id} className={styles.canvasBackgroundCard} onClick={() => addCanvasBackgroundPreset(preset)}>
                          <span style={{ background: preset.color2 ? `linear-gradient(135deg, ${preset.color1}, ${preset.color2})` : preset.color1 }} />
                          <small>{preset.name}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                  <label className={styles.mediaLibrarySearch}>
                    <Search size={14} />
                    <input
                      type="search"
                      value={mediaLibrarySearch}
                      onChange={(event) => setMediaLibrarySearch(event.target.value)}
                      placeholder="Search video backgrounds"
                      aria-label="Search video backgrounds"
                    />
                  </label>
                  {mediaLibraryStatus === "loading" ? (
                    <div className={styles.mediaLibraryState}><Film size={22} /><strong>Loading video backgrounds...</strong></div>
                  ) : mediaLibraryStatus === "error" ? (
                    <div className={styles.mediaLibraryState}><Film size={22} /><strong>Video background library is unavailable</strong><small>Check the media library location and try again.</small></div>
                  ) : filteredVideoBackgrounds.length === 0 ? (
                    <div className={styles.mediaLibraryState}><Search size={22} /><strong>No video backgrounds found</strong></div>
                  ) : (
                    <div className={styles.videoBackgroundGrid}>
                      {filteredVideoBackgrounds.map((asset) => (
                        <VideoBackgroundLibraryCard key={asset.id} asset={asset} onAdd={(item) => void addVideoBackgroundFromLibrary(item)} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeElementTab === "sound-effects" && (
                <div className={styles.builtInMediaLibrary}>
                  <div className={styles.elementsLibraryHeader}>
                    <span>
                      <strong><Music size={15} /> Sound Effects</strong>
                      <small>Preview and place sound effects at the playhead</small>
                    </span>
                    <span className={styles.libraryCount}>{mediaLibrary.soundEffects.length}</span>
                  </div>
                  <label className={styles.mediaLibrarySearch}>
                    <Search size={14} />
                    <input
                      type="search"
                      value={mediaLibrarySearch}
                      onChange={(event) => setMediaLibrarySearch(event.target.value)}
                      placeholder="Search sound effects"
                      aria-label="Search sound effects"
                    />
                  </label>
                  {mediaLibraryStatus === "loading" ? (
                    <div className={styles.mediaLibraryState}><Music size={22} /><strong>Loading sound effects...</strong></div>
                  ) : mediaLibraryStatus === "error" ? (
                    <div className={styles.mediaLibraryState}><Music size={22} /><strong>Sound effect library is unavailable</strong><small>Check the media library location and try again.</small></div>
                  ) : filteredSoundEffects.length === 0 ? (
                    <div className={styles.mediaLibraryState}><Search size={22} /><strong>No sound effects found</strong></div>
                  ) : (
                    <div className={styles.soundEffectGrid}>
                      {filteredSoundEffects.map((asset) => (
                        <SoundEffectLibraryCard
                          key={asset.id}
                          asset={asset}
                          isPreviewing={previewingSoundEffectId === asset.id}
                          onPreview={toggleSoundEffectPreview}
                          onAdd={(item) => void addSoundEffectFromLibrary(item)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeElementTab === "lower-thirds" && (
                <div className={styles.lowerThirdLibrary}>
                  <div className={styles.lowerThirdLibraryHeader}>
                    <strong>Lower Thirds</strong>
                    <span>Editable grouped titles</span>
                  </div>
                  <div className={styles.assetGrid}>
                    {lowerThirdTemplates.map((template) => (
                      <button type="button" key={template.id} className={`${styles.assetCard} ${styles.lowerThirdCard}`} onClick={() => addLowerThird(template)}>
                        <LowerThirdTemplatePreview template={template} />
                        <span>{template.name}</span>
                        <small>Add</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeElementTab === "animations" && (
                <div className={styles.animationLibrary}>
                  <div className={styles.elementsLibraryHeader}>
                    <span>
                      <strong>Animations</strong>
                      <small>For text, photos, objects, frames, and lower thirds</small>
                    </span>
                    <span className={styles.libraryCount}>{canvaAnimationPresets.length}</span>
                  </div>
                  <div className={styles.animationPhaseTabs} role="group" aria-label="Animation phase">
                    <button type="button" className={activeAnimationPhase === "in" ? styles.activeAnimationPhase : ""} aria-pressed={activeAnimationPhase === "in"} onClick={() => setActiveAnimationPhase("in")}>
                      <span>Entrance</span>
                      <small>When it appears</small>
                    </button>
                    <button type="button" className={activeAnimationPhase === "out" ? styles.activeAnimationPhase : ""} aria-pressed={activeAnimationPhase === "out"} onClick={() => setActiveAnimationPhase("out")}>
                      <span>Exit</span>
                      <small>Before it ends</small>
                    </button>
                  </div>
                  <div className={`${styles.animationTarget} ${selectedLayer && selectedLayer.type !== "audio" && selectedLayer.type !== "transition" ? styles.animationTargetReady : ""}`}>
                    <span>
                      <strong>{selectedLayer && selectedLayer.type !== "audio" && selectedLayer.type !== "transition" ? selectedLayer.name : "Select an element"}</strong>
                      <small>{selectedLayer && selectedLayer.type !== "audio" && selectedLayer.type !== "transition" ? `Applying ${activeAnimationPhase === "in" ? "entrance" : "exit"} animation · click to preview` : "Choose a text, photo, shape, frame, object, or lower third"}</small>
                    </span>
                    {selectedLayer && selectedLayer.type !== "audio" && selectedLayer.type !== "transition" && getLayerAnimationForPhase(selectedLayer, activeAnimationPhase) ? (
                      <button type="button" disabled={selectedLayer.locked} onClick={() => updateLayerAnimation(selectedLayer, activeAnimationPhase, { type: "" })}>Remove</button>
                    ) : null}
                  </div>
                  {selectedLayer && selectedLayer.type !== "audio" && selectedLayer.type !== "transition" && getLayerAnimationForPhase(selectedLayer, activeAnimationPhase) && (
                    <div className={styles.animationTimingPanel}>
                      <label>
                        <span>{activeAnimationPhase === "in" ? "Delay after start" : "End gap"}</span>
                        <input
                          aria-label={activeAnimationPhase === "in" ? "Entrance animation delay" : "Exit animation end gap"}
                          disabled={selectedLayer.locked}
                          type="number"
                          min="0"
                          max={selectedLayer.duration}
                          step="0.05"
                          value={activeAnimationPhase === "in" ? getLayerAnimationForPhase(selectedLayer, "in")?.start || 0 : getLayerAnimationForPhase(selectedLayer, "out")?.endOffset || 0}
                          onChange={(event) => updateLayerAnimation(selectedLayer, activeAnimationPhase, activeAnimationPhase === "in" ? { start: Number(event.target.value) } : { endOffset: Number(event.target.value) })}
                        />
                      </label>
                      <label>
                        <span>Duration</span>
                        <input
                          aria-label={`${activeAnimationPhase === "in" ? "Entrance" : "Exit"} animation duration`}
                          disabled={selectedLayer.locked}
                          type="number"
                          min="0.05"
                          max={selectedLayer.duration}
                          step="0.05"
                          value={getLayerAnimationForPhase(selectedLayer, activeAnimationPhase)?.duration || 0.6}
                          onChange={(event) => updateLayerAnimation(selectedLayer, activeAnimationPhase, { duration: Number(event.target.value) })}
                        />
                      </label>
                    </div>
                  )}
                  {(["presented", "general"] as const).map((category) => (
                    <section key={category} className={styles.animationCategory} aria-label={category === "presented" ? "Presented animations" : "General animations"}>
                      <div className={styles.animationCategoryHeader}>
                        <strong>{category === "presented" ? "Presented" : "General"}</strong>
                        <span>{canvaAnimationPresets.filter((preset) => preset.category === category).length}</span>
                      </div>
                      <div className={styles.animationGrid}>
                        {canvaAnimationPresets.filter((preset) => preset.category === category).map((preset) => {
                          const isSelected = getLayerAnimationForPhase(selectedLayer, activeAnimationPhase)?.type === preset.type;
                          const isUnavailable = !selectedLayer || selectedLayer.type === "audio" || selectedLayer.type === "transition" || selectedLayer.locked;
                          return (
                            <button
                              type="button"
                              key={preset.id}
                              className={`${styles.animationCard} ${isSelected ? styles.activeAnimationCard : ""} ${isUnavailable ? styles.unavailableAnimationCard : ""}`}
                              aria-pressed={isSelected}
                              aria-label={`${preset.label}: ${preset.description}`}
                              onClick={() => applyAnimationPresetToSelected(preset, activeAnimationPhase)}
                            >
                              <AnimationPresetThumbnail preset={preset} phase={activeAnimationPhase} />
                              <strong>{preset.label}</strong>
                              <small>{preset.description}</small>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              {activeElementTab === "effects" && (
                <div className={styles.effectsLibrary}>
                  <div className={styles.elementsLibraryHeader}>
                    <span>
                      <strong>Visual Effects</strong>
                      <small>Professional looks for the selected clip</small>
                    </span>
                    <span className={styles.libraryCount}>{effectPresets.length}</span>
                  </div>
                  <div className={styles.effectsGrid}>
                    {visualEffectPresets.map((effect) => (
                      <button
                        type="button"
                        key={effect.id}
                        className={`${styles.effectCard} ${selectedLayer?.effect?.preset === effect.id ? styles.activeEffectCard : ""}`}
                        onClick={() => applyEffectPresetToSelected(effect.id)}
                        data-effect-card={effect.id}
                      >
                        <span className={styles.effectPreview} data-effect-preview={effect.id}>
                          <span className={styles.effectPreviewSubject} />
                          <small>{effect.badge}</small>
                        </span>
                        <span className={styles.effectCardCopy}>
                          <strong>{effect.name}</strong>
                          <small>{effect.description}</small>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className={styles.effectCategoryHeader}>
                    <span>
                      <strong>Body &amp; Object Effects</strong>
                      <small>Designed for people, products and transparent cutouts</small>
                    </span>
                    <span className={styles.libraryCount}>{bodyObjectEffectPresets.length}</span>
                  </div>
                  <div className={styles.effectsGrid}>
                    {bodyObjectEffectPresets.map((effect) => (
                      <button
                        type="button"
                        key={effect.id}
                        className={`${styles.effectCard} ${selectedLayer?.effect?.preset === effect.id ? styles.activeEffectCard : ""}`}
                        onClick={() => applyEffectPresetToSelected(effect.id)}
                        data-effect-card={effect.id}
                      >
                        <span className={styles.effectPreview} data-effect-preview={effect.id}>
                          <span className={styles.effectPreviewSubject} />
                          <small>{effect.badge}</small>
                        </span>
                        <span className={styles.effectCardCopy}>
                          <strong>{effect.name}</strong>
                          <small>{effect.description}</small>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className={styles.effectInspector} data-effect-inspector>
                    {!selectedLayer || selectedLayer.type !== "media" || selectedLayer.mediaKind === "audio" ? (
                      <div className={styles.effectEmptyState}>
                        <Sparkles size={24} />
                        <strong>Select an image or video</strong>
                        <span>Then click an effect to apply it to that clip.</span>
                      </div>
                    ) : !selectedLayer.effect ? (
                      <div className={styles.effectEmptyState}>
                        <SlidersHorizontal size={22} />
                        <strong>{selectedLayer.name}</strong>
                        <span>Choose an effect above. Its controls will appear here.</span>
                      </div>
                    ) : (
                      <>
                        <div className={styles.effectInspectorHeader}>
                          <span>
                            <small>APPLIED TO</small>
                            <strong>{selectedLayer.name}</strong>
                          </span>
                          <button type="button" onClick={removeSelectedEffect}>Remove</button>
                        </div>
                        <label>
                          Intensity {Math.round(selectedLayer.effect.intensity * 100)}%
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={selectedLayer.effect.intensity}
                            onChange={(event) => updateSelectedEffect({ intensity: Number(event.target.value) })}
                          />
                        </label>
                        {selectedLayer.effect.preset === "chromaKey" && (
                          <div className={styles.chromaControls}>
                            <div className={styles.chromaColorRow}>
                              <label>
                                Key color
                                <input
                                  type="color"
                                  aria-label="Chroma key color"
                                  value={selectedLayer.effect.chromaKey?.color || "#00ff00"}
                                  onChange={(event) => updateSelectedChromaKey({ color: event.target.value })}
                                />
                              </label>
                              <span style={{ background: selectedLayer.effect.chromaKey?.color || "#00ff00" }} />
                              <small>Choose the screen color to remove</small>
                            </div>
                            <label>
                              Similarity {Math.round((selectedLayer.effect.chromaKey?.similarity ?? 0.28) * 100)}%
                              <input
                                aria-label="Chroma key similarity"
                                type="range"
                                min="0.05"
                                max="0.75"
                                step="0.01"
                                value={selectedLayer.effect.chromaKey?.similarity ?? 0.28}
                                onChange={(event) => updateSelectedChromaKey({ similarity: Number(event.target.value) })}
                              />
                            </label>
                            <label>
                              Edge softness {Math.round((selectedLayer.effect.chromaKey?.smoothness ?? 0.12) * 100)}%
                              <input
                                aria-label="Chroma key edge softness"
                                type="range"
                                min="0.01"
                                max="0.5"
                                step="0.01"
                                value={selectedLayer.effect.chromaKey?.smoothness ?? 0.12}
                                onChange={(event) => updateSelectedChromaKey({ smoothness: Number(event.target.value) })}
                              />
                            </label>
                            <label>
                              Spill removal {Math.round((selectedLayer.effect.chromaKey?.spill ?? 0.55) * 100)}%
                              <input
                                aria-label="Chroma key spill removal"
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={selectedLayer.effect.chromaKey?.spill ?? 0.55}
                                onChange={(event) => updateSelectedChromaKey({ spill: Number(event.target.value) })}
                              />
                            </label>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeElementTab === "shapes" && (
                <div className={styles.assetGrid}>
                  {shapePresets.map((shape) => (
                    <button type="button" key={shape.name} className={`${styles.assetCard} ${styles.elementAssetCard}`} onClick={() => addShapeLayer(shape)}>
                      <ElementPresetThumbnail shapeType={shape.shapeType} color={shape.color} category="shape" />
                      <span className={styles.elementCardCopy}>
                        <strong>{shape.name}</strong>
                        <small>Shape</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {activeElementTab === "frames" && (
                <div className={styles.frameLibrary}>
                  <label className={`${styles.animatedFrameImport} ${!selectedLayer || selectedLayer.type !== "media" || selectedLayer.mediaKind === "audio" ? styles.disabledAnimatedFrameImport : ""}`}>
                    <Sparkles size={18} />
                    <span><strong>Import animated frame</strong><small>Select a photo or video first. Black is removed automatically.</small></span>
                    <input
                      type="file"
                      accept="video/*"
                      disabled={!selectedLayer || selectedLayer.type !== "media" || selectedLayer.mediaKind === "audio"}
                      onChange={handleAnimatedFrameFileChange}
                    />
                  </label>
                  <div className={styles.assetGrid}>
                    {framePresets.map((frame) => (
                      <button type="button" key={frame.name} className={`${styles.assetCard} ${styles.elementAssetCard}`} onClick={() => addShapeLayer(frame)}>
                        <ElementPresetThumbnail shapeType={frame.shapeType} color={frame.color} category="frame" />
                        <span className={styles.elementCardCopy}>
                          <strong>{frame.name}</strong>
                          <small>{frame.shapeType === "neonPulseFrame" || frame.shapeType === "rgbLightsFrame" || frame.shapeType === "lightSweepFrame" ? "Animated frame" : "Frame"}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeElementTab === "grids" && (
                <div className={styles.assetGrid}>
                  {gridPresets.map((grid) => (
                    <button type="button" key={grid.name} className={`${styles.assetCard} ${styles.elementAssetCard}`} onClick={() => addShapeLayer(grid)}>
                      <ElementPresetThumbnail shapeType={grid.shapeType} color={grid.color} category="grid" />
                      <span className={styles.elementCardCopy}>
                        <strong>{grid.name}</strong>
                        <small>Layout</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {activeElementTab === "social" && (
                <div className={`${styles.assetGrid} ${styles.socialAssetGrid}`}>
                  {socialAssets.map((asset) => (
                    <button type="button" key={asset.name} className={`${styles.assetCard} ${styles.socialAssetCard}`} onClick={() => createMediaLayerFromAsset(asset)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.src} alt="" />
                      <span>{asset.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeElementTab === "gradients" && (
                <div className={styles.gradientLibrary}>
                  <div className={styles.gradientCustomizer}>
                    <span className={styles.gradientCustomizerPreview} style={{ background: `linear-gradient(135deg, ${customGradientColor1}, ${customGradientColor2})` }} />
                    <div className={styles.gradientColorControls}>
                      <label>Start<input type="color" value={customGradientColor1} onChange={(event) => setCustomGradientColor1(event.target.value)} /></label>
                      <button type="button" onClick={() => {
                        setCustomGradientColor1(customGradientColor2);
                        setCustomGradientColor2(customGradientColor1);
                      }} title="Swap gradient colors" aria-label="Swap gradient colors">⇄</button>
                      <label>End<input type="color" value={customGradientColor2} onChange={(event) => setCustomGradientColor2(event.target.value)} /></label>
                    </div>
                    <div className={styles.gradientCustomizerActions}>
                      <button type="button" onClick={() => addShapeLayer(
                        { name: "Custom Gradient", shapeType: "gradient", color: customGradientColor1 },
                        { color1: customGradientColor1, color2: customGradientColor2 },
                      )}>Add custom gradient</button>
                      {selectedLayer?.type === "shape" && selectedLayer.shapeType === "gradient" && (
                        <button type="button" disabled={selectedLayer.locked} onClick={() => updateLayer(selectedLayer.id, {
                          color: customGradientColor1,
                          gradientColor1: customGradientColor1,
                          gradientColor2: customGradientColor2,
                        })}>Apply to selected</button>
                      )}
                    </div>
                  </div>
                  <div className={styles.assetGrid}>
                    {gradientPresets.map((gradient) => (
                      <button
                        type="button"
                        key={gradient.name}
                        className={styles.assetCard}
                        onClick={() => {
                          setCustomGradientColor1(gradient.color1);
                          setCustomGradientColor2(gradient.color2);
                          addShapeLayer({ name: gradient.name, shapeType: "gradient", color: gradient.color1 }, gradient);
                        }}
                      >
                        <span className={styles.gradientPreview} style={{ background: `linear-gradient(135deg, ${gradient.color1}, ${gradient.color2})` }} />
                        <span>{gradient.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeElementTab === "transitions" && (
                <div className={`${styles.assetGrid} ${styles.transitionGrid}`}>
                  {basicTransitionPresets.map((transition) => (
                    <button
                      type="button"
                      key={transition.name}
                      className={`${styles.assetCard} ${styles.transitionAssetCard}`}
                      draggable
                      onClick={() => addTransitionLayer(transition)}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "copy";
                        event.dataTransfer.setData("application/x-pixores-transition-kind", transition.transitionKind);
                        event.dataTransfer.setData("text/plain", transition.transitionKind);
                      }}
                    >
                      <TransitionPresetPreview preset={transition} />
                      <span className={styles.transitionCardCopy}>
                        <strong>{transition.name}</strong>
                        <small>{transition.family} · {transition.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {activeElementTab === "emojis" && (
                <div className={styles.assetGrid}>
                  {emojiPresets.map((item) => (
                    <button type="button" key={item.name} className={styles.assetCard} onClick={() => addEmojiLayer(item)}>
                      <span className={styles.emojiPreview}>{item.emoji}</span>
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
              </section>
              </div>
            </div>
          )}

          {activePanel === "text" && (
            <div className={styles.toolSection}>
              <div className={styles.panelTitle}><Type size={17} /> Text <small>{PIXORES_FONT_COUNT} fonts</small></div>
              <button type="button" className={styles.fullButton} onClick={addTextLayer}><Type size={17} /> Add text track</button>
              <div className={styles.textTemplateSection}>
                <div className={styles.librarySectionHeading}>
                  <span><strong>Animated text</strong><small>Ready-to-edit entrance styles</small></span>
                  <b>{animatedTextPresets.length}</b>
                </div>
                <div className={styles.textTemplateGrid}>
                  {animatedTextPresets.map((preset) => (
                    <button type="button" key={preset.id} className={styles.animatedTextCard} onClick={() => addTextPreset(preset)} style={{ background: preset.previewBackground }}>
                      <strong style={{ fontFamily: `${preset.fontFamily}, Arial, sans-serif`, color: preset.color }}>{preset.text}</strong>
                      <span>{preset.label}</span>
                      <small>{preset.description}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.textTemplateSection}>
                <div className={styles.librarySectionHeading}>
                  <span><strong>Text backgrounds</strong><small>Modern color labels and cards</small></span>
                  <b>{backgroundTextPresets.length}</b>
                </div>
                <div className={styles.textTemplateGrid}>
                  {backgroundTextPresets.map((preset) => (
                    <button type="button" key={preset.id} className={styles.backgroundTextCard} onClick={() => addTextPreset(preset)}>
                      <strong style={{ fontFamily: `${preset.fontFamily}, Arial, sans-serif`, color: preset.color, background: preset.previewBackground }}>{preset.text}</strong>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.librarySectionHeading}>
                <span><strong>Basic text</strong><small>Simple starting points</small></span>
              </div>
              <div className={styles.assetGrid}>
                {textPresets.map((preset) => (
                  <button type="button" key={preset.label} className={styles.textPresetCard} onClick={() => addTextPreset(preset)}>
                    <strong style={{ fontFamily: `${preset.fontFamily}, Arial, sans-serif`, color: preset.color }}>{preset.text}</strong>
                    <span>{preset.fontFamily}</span>
                  </button>
                ))}
              </div>
              <div className={styles.fontLibraryHeader}>
                <strong>Font library</strong>
                <span>Click a font to add styled text at the playhead.</span>
              </div>
              <div className={styles.mediaSearch}>
                <Search size={15} />
                <input
                  type="search"
                  value={fontSearch}
                  onChange={(event) => setFontSearch(event.target.value)}
                  placeholder="Search 80 fonts"
                  aria-label="Search fonts"
                />
              </div>
              <div className={styles.fontCategoryFilters} aria-label="Font categories">
                <button type="button" className={fontCategory === "all" ? styles.activeFontCategory : ""} onClick={() => setFontCategory("all")}>All</button>
                {fontGroups.map((group) => (
                  <button type="button" key={group.label} className={fontCategory === group.label ? styles.activeFontCategory : ""} onClick={() => setFontCategory(group.label)}>
                    {group.label}
                  </button>
                ))}
              </div>
              <div className={styles.fontCatalog}>
                {filteredFontGroups.map((group) => (
                  <section key={group.label} className={styles.fontGroup}>
                    <div className={styles.fontGroupTitle}>
                      <strong>{group.label}</strong>
                      <span>{group.fonts.length}</span>
                    </div>
                    <div className={styles.fontCardGrid}>
                      {group.fonts.map((font) => (
                        <button
                          type="button"
                          key={font}
                          className={styles.fontCard}
                          onMouseEnter={() => ensureVideoMakerFontLoaded(font)}
                          onFocus={() => ensureVideoMakerFontLoaded(font)}
                          onClick={() => addTextPreset({
                            label: font,
                            text: "Your text",
                            fontSize: 54,
                            fontFamily: font,
                            color: "#ffffff",
                          })}
                          title={`Add text using ${font}`}
                        >
                          <span style={{ fontFamily: `"${font}", Arial, sans-serif` }}>Ag</span>
                          <small>{font}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
                {filteredFontGroups.length === 0 && <span className={styles.emptyImports}>No fonts match this search.</span>}
              </div>
            </div>
          )}

          {activePanel === "audio" && (
            <div className={`${styles.toolSection} ${styles.audioWorkspace}`}>
              <div className={styles.panelTitle}><Music size={17} /> Audio Workspace</div>
              <p className={styles.audioWorkspaceIntro}>Repair, mix and synchronize audio with the same settings saved into the Pixores project.</p>

              <div className={styles.audioWorkspaceActions}>
                <button type="button" onClick={() => openAudioAiDialog("subtitles")} disabled={!selectedLayer || !isAudioControllableLayer(selectedLayer)}><Type size={15} /> Subtitles</button>
                <button type="button" onClick={() => openAudioAiDialog("silence")} disabled={!selectedLayer || !isAudioControllableLayer(selectedLayer)}><VolumeX size={15} /> Remove silence</button>
                <button type="button" onClick={() => { setActiveElementTab("sound-effects"); openToolPanel("elements"); }}><Sparkles size={15} /> Sound FX</button>
              </div>

              <section className={styles.audioSyncCard}>
                <strong>Automatic audio synchronization</strong>
                <span>Select a camera video and an external recording with Ctrl. Pixores compares their waveforms locally.</span>
                <button type="button" onClick={() => void synchronizeSelectedAudio()} disabled={isSynchronizingAudio || selectedLayers.filter(isAudioControllableLayer).length !== 2}>
                  <SlidersHorizontal size={15} /> {isSynchronizingAudio ? "Analyzing waveforms..." : "Synchronize selected clips"}
                </button>
              </section>

              {!selectedLayer || !isAudioControllableLayer(selectedLayer) ? (
                <div className={styles.audioEmptyState}><Volume2 size={28} /><strong>Select a video or audio clip</strong><span>Its audio controls will appear here.</span></div>
              ) : (
                <>
                  <div className={styles.audioSelectedClip}><Volume2 size={15} /><span><strong>{selectedLayer.name}</strong><small>{selectedLayer.type === "audio" || selectedLayer.mediaKind === "audio" ? "Audio clip" : "Video audio"}</small></span></div>
                  <div className={styles.audioPresetGrid}>
                    <button type="button" onClick={() => applyAudioPreset("cleanVoice")}>Clean Voice</button>
                    <button type="button" onClick={() => applyAudioPreset("podcast")}>Podcast</button>
                    <button type="button" onClick={() => applyAudioPreset("warmVoice")}>Warm Voice</button>
                    <button type="button" onClick={() => applyAudioPreset("music")}>Music</button>
                    <button type="button" onClick={() => applyAudioPreset("studio")}>Studio</button>
                    <button type="button" onClick={() => applyAudioPreset("hall")}>Hall</button>
                  </div>

                  <details className={styles.editSection} open>
                    <summary>Basic mix</summary>
                    <label>Volume {Math.round(getClipVolume(selectedLayer) * 100)}%<input disabled={selectedLayer.locked} type="range" min="0" max="1" step="0.01" value={getClipVolume(selectedLayer)} onChange={(event) => updateLayer(selectedLayer.id, { volume: Number(event.target.value), muted: Number(event.target.value) <= 0 })} /></label>
                    <label>Gain {selectedAudioEffects.gainDb.toFixed(1)} dB<input disabled={selectedLayer.locked} type="range" min="-24" max="24" step="0.5" value={selectedAudioEffects.gainDb} onChange={(event) => updateSelectedAudioEffects({ gainDb: Number(event.target.value) })} /></label>
                    <label>Pan {selectedAudioEffects.pan === 0 ? "Center" : selectedAudioEffects.pan < 0 ? `${Math.round(Math.abs(selectedAudioEffects.pan) * 100)}% Left` : `${Math.round(selectedAudioEffects.pan * 100)}% Right`}<input disabled={selectedLayer.locked} type="range" min="-1" max="1" step="0.05" value={selectedAudioEffects.pan} onChange={(event) => updateSelectedAudioEffects({ pan: Number(event.target.value) })} /></label>
                    <div className={styles.audioToggleRow}><label><input type="checkbox" checked={selectedAudioEffects.normalize} disabled={selectedLayer.locked} onChange={(event) => updateSelectedAudioEffects({ normalize: event.target.checked })} /> Normalize loudness</label><label><input type="checkbox" checked={selectedAudioEffects.limiter} disabled={selectedLayer.locked} onChange={(event) => updateSelectedAudioEffects({ limiter: event.target.checked })} /> Prevent clipping</label></div>
                  </details>

                  <details className={styles.editSection} open>
                    <summary>Repair</summary>
                    <label>Noise reduction {Math.round(selectedAudioEffects.noiseReduction * 100)}%<input disabled={selectedLayer.locked} type="range" min="0" max="1" step="0.05" value={selectedAudioEffects.noiseReduction} onChange={(event) => updateSelectedAudioEffects({ noiseReduction: Number(event.target.value) })} /></label>
                    <label>De-esser {Math.round(selectedAudioEffects.deEsser * 100)}%<input disabled={selectedLayer.locked} type="range" min="0" max="1" step="0.05" value={selectedAudioEffects.deEsser} onChange={(event) => updateSelectedAudioEffects({ deEsser: Number(event.target.value) })} /></label>
                    <label>Low-cut filter<select disabled={selectedLayer.locked} value={selectedAudioEffects.highPassHz} onChange={(event) => updateSelectedAudioEffects({ highPassHz: Number(event.target.value) })}><option value="0">Off</option><option value="60">60 Hz</option><option value="80">80 Hz · Voice</option><option value="100">100 Hz</option><option value="140">140 Hz</option></select></label>
                    <label>Electrical hum<select disabled={selectedLayer.locked} value={selectedAudioEffects.humRemovalHz} onChange={(event) => updateSelectedAudioEffects({ humRemovalHz: Number(event.target.value) as 0 | 50 | 60 })}><option value="0">Off</option><option value="50">50 Hz</option><option value="60">60 Hz</option></select></label>
                  </details>

                  <details className={styles.editSection} open>
                    <summary>Equalizer & dynamics</summary>
                    <label>Bass {selectedAudioEffects.lowGainDb.toFixed(1)} dB<input disabled={selectedLayer.locked} type="range" min="-18" max="18" step="0.5" value={selectedAudioEffects.lowGainDb} onChange={(event) => updateSelectedAudioEffects({ lowGainDb: Number(event.target.value) })} /></label>
                    <label>Voice / Mid {selectedAudioEffects.midGainDb.toFixed(1)} dB<input disabled={selectedLayer.locked} type="range" min="-18" max="18" step="0.5" value={selectedAudioEffects.midGainDb} onChange={(event) => updateSelectedAudioEffects({ midGainDb: Number(event.target.value) })} /></label>
                    <label>Treble {selectedAudioEffects.highGainDb.toFixed(1)} dB<input disabled={selectedLayer.locked} type="range" min="-18" max="18" step="0.5" value={selectedAudioEffects.highGainDb} onChange={(event) => updateSelectedAudioEffects({ highGainDb: Number(event.target.value) })} /></label>
                    <label>Compression {Math.round(selectedAudioEffects.compressor * 100)}%<input disabled={selectedLayer.locked} type="range" min="0" max="1" step="0.05" value={selectedAudioEffects.compressor} onChange={(event) => updateSelectedAudioEffects({ compressor: Number(event.target.value) })} /></label>
                  </details>

                  <details className={styles.editSection}>
                    <summary>Echo & scenarios</summary>
                    <label>Space<select disabled={selectedLayer.locked} value={selectedAudioEffects.reverb} onChange={(event) => updateSelectedAudioEffects({ reverb: event.target.value as PixoresAudioEffectChain["reverb"] })}><option value="none">None</option><option value="studio">Studio</option><option value="room">Room</option><option value="hall">Hall</option><option value="stage">Stage</option></select></label>
                    <label className={styles.audioCheckbox}><input type="checkbox" checked={selectedAudioEffects.echoEnabled} disabled={selectedLayer.locked} onChange={(event) => updateSelectedAudioEffects({ echoEnabled: event.target.checked })} /> Enable echo</label>
                    {selectedAudioEffects.echoEnabled && <><label>Delay {selectedAudioEffects.echoDelayMs} ms<input disabled={selectedLayer.locked} type="range" min="40" max="1000" step="10" value={selectedAudioEffects.echoDelayMs} onChange={(event) => updateSelectedAudioEffects({ echoDelayMs: Number(event.target.value) })} /></label><label>Decay {Math.round(selectedAudioEffects.echoDecay * 100)}%<input disabled={selectedLayer.locked} type="range" min="0.05" max="0.9" step="0.05" value={selectedAudioEffects.echoDecay} onChange={(event) => updateSelectedAudioEffects({ echoDecay: Number(event.target.value) })} /></label></>}
                  </details>
                  <button type="button" className={styles.audioResetButton} disabled={selectedLayer.locked} onClick={() => resetSelectedClipVolume(selectedLayer)}>Reset all audio settings</button>
                </>
              )}
            </div>
          )}

          {activePanel === "project" && (
            <div className={styles.toolSection}>
              <div className={styles.panelTitle}><Film size={17} /> Project</div>
              <div className={styles.projectInfoCard}>
                <div className={styles.projectInfoTitle}>
                  <Monitor size={16} />
                  <span>Project information</span>
                </div>
                <dl className={styles.projectInfoGrid}>
                  <div>
                    <dt>Name</dt>
                    <dd>{projectTitle || "Untitled video"}</dd>
                  </div>
                  <div>
                    <dt>Resolution</dt>
                    <dd>{selectedFormat.width} x {selectedFormat.height}</dd>
                  </div>
                  <div>
                    <dt>Format</dt>
                    <dd>{projectAspectLabel}</dd>
                  </div>
                  <div>
                    <dt>Timeline</dt>
                    <dd>{formatTimelineClock(projectDuration)}</dd>
                  </div>
                  <div>
                    <dt>Frame rate</dt>
                    <dd>30fps</dd>
                  </div>
                  <div>
                    <dt>Audio</dt>
                    <dd>44100Hz</dd>
                  </div>
                </dl>
                <div className={styles.projectStats}>
                  <span><Layers3 size={14} /> {projectStats.tracks} tracks</span>
                  <span><Film size={14} /> {projectStats.media} media</span>
                  <span><Music size={14} /> {projectStats.audio} audio</span>
                  <span><Type size={14} /> {projectStats.text} text</span>
                  <span><Sparkles size={14} /> {projectStats.transitions} transitions</span>
                </div>
              </div>
              <label>
                Project title
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(event) => setProjectTitle(event.target.value)}
                  placeholder="Untitled video"
                />
              </label>
              <div className={styles.groupLabel}>Dimensions</div>
              <label>
                Preset
                <select
                  value={formats[formatIndex]?.id || "16_9"}
                  onChange={(event) => {
                    const nextIndex = formats.findIndex((format) => format.id === event.target.value);
                    if (nextIndex < 0) return;
                    setFormatIndex(nextIndex);
                    const nextFormat = formats[nextIndex];
                    if (nextFormat.id !== "custom") {
                      setCustomWidth(nextFormat.width);
                      setCustomHeight(nextFormat.height);
                    }
                  }}
                >
                  {formats.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.label} ({format.width}x{format.height})
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.dimensionGrid}>
                <label>
                  Width
                  <input
                    type="number"
                    min="100"
                    max="7680"
                    value={selectedFormat.width}
                    onChange={(event) => {
                      setFormatIndex(formats.findIndex((format) => format.id === "custom"));
                      setCustomWidth(clamp(Number(event.target.value), 100, 7680));
                    }}
                  />
                </label>
                <label>
                  Height
                  <input
                    type="number"
                    min="100"
                    max="7680"
                    value={selectedFormat.height}
                    onChange={(event) => {
                      setFormatIndex(formats.findIndex((format) => format.id === "custom"));
                      setCustomHeight(clamp(Number(event.target.value), 100, 7680));
                    }}
                  />
                </label>
              </div>
              <div className={styles.dimensionNote}>{selectedFormat.width} x {selectedFormat.height}px</div>

              <div className={styles.twoColumns}>
                <label>
                  Timeline view
                  <input type="number" min="2" max="600" value={timelineDuration} onChange={(event) => setTimelineDuration(clamp(Number(event.target.value), 2, 600))} />
                </label>
                <label>
                  Background
                  <input type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
                </label>
                <label>
                  Snap shortcut
                  <input
                    value={snappingShortcut.toUpperCase()}
                    maxLength={1}
                    onChange={(event) => {
                      const next = event.target.value.slice(-1).toLowerCase();
                      if (!/^[a-z0-9]$/.test(next)) return;
                      setSnappingShortcut(next);
                      localStorage.setItem("pixores-timeline-snapping-shortcut", next);
                    }}
                    aria-label="Timeline snapping shortcut"
                  />
                </label>
              </div>

              <div className={styles.actions}>
                <button type="button" onClick={isRecording || isPreparingServerRender ? cancelActiveRender : openExportDialog} className={styles.primaryAction}>
                  {isRecording ? <Square size={17} /> : <Play size={17} />}
                  {isRecording || isPreparingServerRender ? "Cancel Export" : "Export Video"}
                </button>
              </div>

              <div className={styles.projectJsonActions}>
                <label className={styles.renderFormatControl}>
                  Render format
                  <select
                    value={serverExportFormatId}
                    onChange={(event) => setServerExportFormatId(event.target.value as PixoresVideoExportFormatId)}
                    disabled={isPreparingServerRender}
                  >
                    {PIXORES_VIDEO_EXPORT_FORMATS.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.label} (.{format.extension})
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={isPreparingServerRender ? cancelActiveRender : openExportDialog}>
                  {isPreparingServerRender ? "Cancel Render" : "Export with Settings"}
                </button>
                {(isPreparingServerRender || serverRenderProgress > 0) && (
                  <span className={styles.renderProgress}>Render progress: {serverRenderProgress}%</span>
                )}
                <button type="button" onClick={saveProjectToCloud} disabled={isCloudSaving}>
                  {isCloudSaving ? "Saving Cloud..." : currentCloudProjectId ? "Update Cloud Project" : "Save to Cloud"}
                </button>
                <button type="button" onClick={loadCloudProjects} disabled={isCloudLoading}>
                  {isCloudLoading ? "Loading Cloud..." : "Load from Cloud"}
                </button>
                {cloudProjects.length > 0 && (
                  <div className={styles.cloudProjectList}>
                    {cloudProjects.map((project) => (
                      <div key={project.id} className={styles.cloudProjectRow}>
                        <button type="button" onClick={() => loadProjectFromCloud(project.id)} disabled={isCloudLoading}>
                          <span>{project.title}</span>
                          <small>{new Date(project.updated_at).toLocaleDateString()}</small>
                        </button>
                        <button type="button" onClick={() => deleteCloudProject(project.id)} disabled={isCloudLoading} aria-label={`Delete ${project.title}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => void saveProjectFile()} disabled={isProjectFileSaving}>{isProjectFileSaving ? "Saving Project…" : "Save Project"}</button>
                <button type="button" onClick={openProjectFile}>Open Project</button>
                <button type="button" onClick={toggleAutoSave} className={autoSaveEnabled ? styles.activeToggle : ""}>
                  Auto Save: {autoSaveEnabled ? "On" : "Off"}
                </button>
              </div>

              <div className={styles.status}>{status}</div>
            </div>
          )}

          {activePanel === "settings" && selectedLayer && (
            <div className={styles.layerEditor}>
              <div className={styles.editorTop}>
                <strong>Track settings</strong>
                <div>
                  <button type="button" onClick={() => updateLayer(selectedLayer.id, { visible: !selectedLayer.visible })} className={styles.smallIconButton}>
                    {selectedLayer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button type="button" onClick={() => updateLayer(selectedLayer.id, { locked: !selectedLayer.locked })} className={styles.smallIconButton}>
                    {selectedLayer.locked ? <Lock size={15} /> : <Unlock size={15} />}
                  </button>
                </div>
              </div>

              <label>
                Track name
                <input disabled={selectedLayer.locked} value={selectedLayer.name} onChange={(event) => updateLayer(selectedLayer.id, { name: event.target.value })} />
              </label>

              <details className={styles.editSection} open>
                <summary>Quick actions</summary>
                <div className={styles.actionGrid}>
                  <button type="button" onClick={duplicateSelectedLayer} disabled={selectedLayer.locked}>Duplicate</button>
                  <button type="button" onClick={() => deleteSelectedLayer()} disabled={selectedLayer.locked}>Delete</button>
                  <button type="button" onClick={() => updateLayer(selectedLayer.id, { isFlippedH: !selectedLayer.isFlippedH })} className={selectedLayer.isFlippedH ? styles.activeToggle : ""}>Flip H</button>
                  <button type="button" onClick={() => updateLayer(selectedLayer.id, { isFlippedV: !selectedLayer.isFlippedV })} className={selectedLayer.isFlippedV ? styles.activeToggle : ""}>Flip V</button>
                  {selectedLayer.type === "media" && selectedLayer.mediaKind !== "audio" && (
                    <button type="button" onClick={openCropZoomDialog} disabled={selectedLayer.locked}>Crop & Zoom</button>
                  )}
                  {selectedLayer.type === "media" && selectedLayer.mediaKind === "image" && (
                    <button type="button" onClick={() => void removeSelectedImageBackground()} disabled={selectedLayer.locked || isRemovingImageBackground}>
                      {isRemovingImageBackground ? "Removing background..." : "Remove Background AI"}
                    </button>
                  )}
                </div>
              </details>

              {selectedLayer.type === "lower-third" && selectedLayer.lowerThird && (
                <details className={styles.editSection} open>
                  <summary>Lower Third Content</summary>
                  <label>
                    Name / Primary text
                    <input
                      ref={lowerThirdPrimaryInputRef}
                      disabled={selectedLayer.locked}
                      value={selectedLayer.lowerThird.content.primaryText}
                      onChange={(event) => updateLowerThirdContent(selectedLayer, "primaryText", event.target.value)}
                    />
                  </label>
                  {selectedLayer.lowerThird.content.secondaryText !== undefined && (
                    <label>
                      Role / Subtitle
                      <input
                        disabled={selectedLayer.locked}
                        value={selectedLayer.lowerThird.content.secondaryText}
                        onChange={(event) => updateLowerThirdContent(selectedLayer, "secondaryText", event.target.value)}
                      />
                    </label>
                  )}
                  {selectedLayer.lowerThird.content.tertiaryText !== undefined && (
                    <label>
                      Program / Company
                      <input
                        disabled={selectedLayer.locked}
                        value={selectedLayer.lowerThird.content.tertiaryText}
                        onChange={(event) => updateLowerThirdContent(selectedLayer, "tertiaryText", event.target.value)}
                      />
                    </label>
                  )}
                  <div className={styles.lowerThirdControlGroup}>
                    <strong>Typography and text spacing</strong>
                    <label>
                      Title typeface
                      <select
                        disabled={selectedLayer.locked}
                        value={selectedLayer.lowerThird.typography?.primaryFontFamily || "Inter"}
                        onChange={(event) => {
                          ensureVideoMakerFontLoaded(event.target.value);
                          updateLowerThirdTypography(selectedLayer, { primaryFontFamily: event.target.value });
                        }}
                      >
                        {fontGroups.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.fonts.map((font) => (
                              <option key={font} value={font} style={{ fontFamily: `"${font}", Arial, sans-serif` }}>{font}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                    {(selectedLayer.lowerThird.content.secondaryText !== undefined || selectedLayer.lowerThird.content.tertiaryText !== undefined) && (
                      <>
                        <label>
                          Subtitle typeface
                          <select
                            disabled={selectedLayer.locked}
                            value={selectedLayer.lowerThird.typography?.secondaryFontFamily || "Inter"}
                            onChange={(event) => {
                              ensureVideoMakerFontLoaded(event.target.value);
                              updateLowerThirdTypography(selectedLayer, { secondaryFontFamily: event.target.value });
                            }}
                          >
                            {fontGroups.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                {group.fonts.map((font) => (
                                  <option key={font} value={font} style={{ fontFamily: `"${font}", Arial, sans-serif` }}>{font}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </label>
                        <label>
                          Text spacing {(selectedLayer.lowerThird.typography?.textSpacing || 0) > 0 ? "+" : ""}{selectedLayer.lowerThird.typography?.textSpacing || 0}
                          <input
                            aria-label="Space between lower third texts"
                            disabled={selectedLayer.locked}
                            type="range"
                            min="-30"
                            max="30"
                            step="1"
                            value={selectedLayer.lowerThird.typography?.textSpacing || 0}
                            onChange={(event) => updateLowerThirdTypography(selectedLayer, { textSpacing: Number(event.target.value) })}
                          />
                        </label>
                        <label>
                          Exact spacing
                          <input
                            aria-label="Lower third text spacing value"
                            disabled={selectedLayer.locked}
                            type="number"
                            min="-30"
                            max="30"
                            step="1"
                            value={selectedLayer.lowerThird.typography?.textSpacing || 0}
                            onChange={(event) => updateLowerThirdTypography(selectedLayer, { textSpacing: clamp(Number(event.target.value), -30, 30) })}
                          />
                        </label>
                        <span className={styles.settingNote}>Move left to bring the title and subtitle closer; negative values can overlap them.</span>
                      </>
                    )}
                  </div>
                  <div className={styles.lowerThirdControlGroup}>
                    <strong>Colors</strong>
                    <div className={styles.colorGrid}>
                      <LowerThirdColorControl label="Main" disabled={selectedLayer.locked} value={selectedLayer.lowerThird.colors.primary} onChange={(value) => updateLowerThirdColor(selectedLayer, "primary", value)} />
                      <LowerThirdColorControl label="Lines / Accent" disabled={selectedLayer.locked} value={selectedLayer.lowerThird.colors.secondary} onChange={(value) => updateLowerThirdColor(selectedLayer, "secondary", value)} />
                      <LowerThirdColorControl label="Background" disabled={selectedLayer.locked} value={selectedLayer.lowerThird.colors.background} onChange={(value) => updateLowerThirdColor(selectedLayer, "background", value)} />
                      <LowerThirdColorControl label="Main text" disabled={selectedLayer.locked} value={selectedLayer.lowerThird.colors.primaryText} onChange={(value) => updateLowerThirdColor(selectedLayer, "primaryText", value)} />
                      <LowerThirdColorControl label="Subtitle" disabled={selectedLayer.locked} value={selectedLayer.lowerThird.colors.secondaryText} onChange={(value) => updateLowerThirdColor(selectedLayer, "secondaryText", value)} />
                    </div>
                  </div>
                  <div className={styles.lowerThirdControlGroup}>
                    <strong>Line and frame thickness</strong>
                    <label>
                      Thickness {Math.round((selectedLayer.lowerThird.lineThickness || 1) * 100)}%
                      <input
                        disabled={selectedLayer.locked}
                        type="range"
                        min="0.25"
                        max="3"
                        step="0.05"
                        value={selectedLayer.lowerThird.lineThickness || 1}
                        onChange={(event) => updateLayer(selectedLayer.id, {
                          lowerThird: { ...selectedLayer.lowerThird!, lineThickness: Number(event.target.value) },
                        })}
                      />
                    </label>
                  </div>
                  {selectedLayer.lowerThird.components.some((component) => component.kind === "logo") && (
                    <div className={styles.lowerThirdControlGroup}>
                      <strong>Logo placement / Image</strong>
                      <span className={styles.settingNote}>The logo appears in the framed area before the text.</span>
                      <label>
                        Imported image
                        <select
                          disabled={selectedLayer.locked}
                          value={selectedLayer.lowerThird.content.logoSourceId || ""}
                          onChange={(event) => updateLowerThirdContent(selectedLayer, "logoSourceId", event.target.value || undefined)}
                        >
                          <option value="">No logo</option>
                          {imports.filter((item) => item.kind === "image").map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className={styles.lowerThirdLogoUpload}>
                        Upload logo or image
                        <input disabled={selectedLayer.locked} type="file" accept="image/*" onChange={(event) => handleLowerThirdLogoFileChange(event, selectedLayer)} />
                      </label>
                      <label>
                        Logo size {selectedLayer.lowerThird.logo?.size || 100}%
                        <input disabled={selectedLayer.locked} type="range" min="40" max="160" step="5" value={selectedLayer.lowerThird.logo?.size || 100} onChange={(event) => updateLowerThirdLogo(selectedLayer, { size: Number(event.target.value) })} />
                      </label>
                      <div className={styles.twoColumns}>
                        <label>
                          Logo X
                          <input disabled={selectedLayer.locked} type="number" min="-20" max="30" value={selectedLayer.lowerThird.logo?.offsetX || 0} onChange={(event) => updateLowerThirdLogo(selectedLayer, { offsetX: clamp(Number(event.target.value), -20, 30) })} />
                        </label>
                        <label>
                          Logo Y
                          <input disabled={selectedLayer.locked} type="number" min="-30" max="30" value={selectedLayer.lowerThird.logo?.offsetY || 0} onChange={(event) => updateLowerThirdLogo(selectedLayer, { offsetY: clamp(Number(event.target.value), -30, 30) })} />
                        </label>
                      </div>
                      <label>
                        Logo frame shape
                        <select
                          disabled={selectedLayer.locked}
                          value={selectedLayer.lowerThird.logo?.shape || (selectedLayer.lowerThird.logo?.circular ? "circle" : "rounded")}
                          onChange={(event) => {
                            const shape = event.target.value as "rounded" | "circle" | "triangle";
                            updateLowerThirdLogo(selectedLayer, { shape, circular: shape === "circle" });
                          }}
                        >
                          <option value="rounded">Rounded rectangle</option>
                          <option value="circle">Circle</option>
                          <option value="triangle">Triangle</option>
                        </select>
                      </label>
                      <label>
                        Image fit
                        <select disabled={selectedLayer.locked} value={selectedLayer.lowerThird.logo?.objectFit || "contain"} onChange={(event) => updateLowerThirdLogo(selectedLayer, { objectFit: event.target.value as "contain" | "cover" })}>
                          <option value="contain">Contain / show whole image</option>
                          <option value="cover">Cover / fill logo box</option>
                        </select>
                      </label>
                      <label>
                        Rounded corners {selectedLayer.lowerThird.logo?.borderRadius || 0}px
                        <input disabled={selectedLayer.locked || selectedLayer.lowerThird.logo?.shape === "circle" || selectedLayer.lowerThird.logo?.shape === "triangle"} type="range" min="0" max="60" step="2" value={selectedLayer.lowerThird.logo?.borderRadius || 0} onChange={(event) => updateLowerThirdLogo(selectedLayer, { borderRadius: Number(event.target.value) })} />
                      </label>
                      <label className={styles.lowerThirdLogoToggle}>
                        <input disabled={selectedLayer.locked} type="checkbox" checked={selectedLayer.lowerThird.logo?.shape === "circle" || !!selectedLayer.lowerThird.logo?.circular} onChange={(event) => updateLowerThirdLogo(selectedLayer, { circular: event.target.checked, shape: event.target.checked ? "circle" : "rounded" })} />
                        Circular mask
                      </label>
                      {selectedLayer.lowerThird.content.logoSourceId && (
                        <button type="button" disabled={selectedLayer.locked} onClick={() => updateLowerThirdContent(selectedLayer, "logoSourceId", undefined)}>Remove logo</button>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    className={styles.saveEditedLowerThirdButton}
                    disabled={personalLibraryStatus === "saving"}
                    onClick={() => void saveSelectedToPersonalLibrary(selectedLayer, { collection: "general" })}
                  >
                    <FolderOpen size={15} />
                    {personalLibraryStatus === "saving" ? "Saving to My Library..." : "Save edited Lower Third to My Library"}
                  </button>
                  <span className={styles.settingNote}>Changes appear immediately in preview and export.</span>
                </details>
              )}

              {isAudioControllableLayer(selectedLayer) && (
                <details className={styles.editSection} open>
                  <summary>Audio tools</summary>
                  <div className={styles.actionGrid}>
                    <button type="button" disabled={selectedLayer.locked} onClick={() => toggleSelectedClipMute(selectedLayer)} className={selectedLayer.muted ? styles.activeToggle : ""}>
                      {selectedLayer.muted ? "Unmute clip" : "Mute clip"}
                    </button>
                    <button type="button" disabled={selectedLayer.locked} onClick={() => toggleTrackMute(getTrackId(selectedLayer))} className={isLayerTrackMuted(selectedLayer, trackSettings) ? styles.activeToggle : ""}>
                      {isLayerTrackMuted(selectedLayer, trackSettings) ? "Unmute track" : "Mute track"}
                    </button>
                    {selectedLayer.type === "media" && selectedLayer.mediaKind === "video" && (
                      <button type="button" disabled={selectedLayer.locked || selectedLayer.audioDetached} onClick={extractAudioFromSelectedVideo}>
                        {selectedLayer.audioDetached ? "Audio detached" : "Detach audio"}
                      </button>
                    )}
                    <button type="button" disabled={selectedLayer.locked} onClick={() => resetSelectedClipVolume(selectedLayer)}>Reset audio</button>
                  </div>
                  <label>
                    Volume {Math.round(getClipVolume(selectedLayer) * 100)}%
                    <input
                      disabled={selectedLayer.locked}
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={getClipVolume(selectedLayer)}
                      onChange={(event) => updateLayer(selectedLayer.id, { volume: Number(event.target.value), muted: Number(event.target.value) <= 0 })}
                    />
                  </label>
                  <label>
                    Volume %
                    <input
                      disabled={selectedLayer.locked}
                      type="number"
                      min="0"
                      max="100"
                      value={Math.round(getClipVolume(selectedLayer) * 100)}
                      onChange={(event) => {
                        const nextVolume = clamp(Number(event.target.value) / 100, 0, 1);
                        updateLayer(selectedLayer.id, { volume: nextVolume, muted: nextVolume <= 0 });
                      }}
                    />
                  </label>
                  <label>
                    Fade in {(selectedLayer.audioFadeIn || 0).toFixed(1)}s
                    <input
                      disabled={selectedLayer.locked}
                      type="range"
                      min="0"
                      max={Math.max(0.1, Math.min(10, selectedLayer.duration))}
                      step="0.1"
                      value={selectedLayer.audioFadeIn || 0}
                      onChange={(event) => updateLayer(selectedLayer.id, { audioFadeIn: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    Fade out {(selectedLayer.audioFadeOut || 0).toFixed(1)}s
                    <input
                      disabled={selectedLayer.locked}
                      type="range"
                      min="0"
                      max={Math.max(0.1, Math.min(10, selectedLayer.duration))}
                      step="0.1"
                      value={selectedLayer.audioFadeOut || 0}
                      onChange={(event) => updateLayer(selectedLayer.id, { audioFadeOut: Number(event.target.value) })}
                    />
                  </label>
                  <span className={styles.settingNote}>
                    {selectedLayer.type === "audio" ? "Controls only this audio clip." : "Controls only this video's integrated audio."} Fades are included in preview and export.
                  </span>
                </details>
              )}

              <details className={styles.editSection} open>
                <summary>Transform</summary>
                <div className={styles.twoColumns}>
                  <label>
                    Width %
                    <input disabled={selectedLayer.locked} type="number" min="1" max={STAGE_MAX_SIZE_PERCENT} value={selectedLayer.width} onChange={(event) => updateLayer(selectedLayer.id, { width: clamp(Number(event.target.value), 1, STAGE_MAX_SIZE_PERCENT) })} />
                  </label>
                  <label>
                    Height %
                    <input disabled={selectedLayer.locked} type="number" min="1" max={STAGE_MAX_SIZE_PERCENT} value={selectedLayer.height} onChange={(event) => updateLayer(selectedLayer.id, { height: clamp(Number(event.target.value), 1, STAGE_MAX_SIZE_PERCENT) })} />
                  </label>
                </div>
                {selectedLayer.type === "media" && selectedLayer.mediaKind !== "audio" && (
                  <span className={styles.settingNote}>Corner resize keeps the media proportion. Hold Shift for free resize; use Crop &amp; Zoom only when you want to cut the image.</span>
                )}
                <label>
                  Rotation {selectedLayer.angle || 0} deg
                  <input disabled={selectedLayer.locked} type="range" min="0" max="360" step="1" value={selectedLayer.angle || 0} onChange={(event) => updateLayer(selectedLayer.id, { angle: Number(event.target.value) })} />
                </label>
                <label>
                  Round corners {selectedLayer.borderRadius || 0}px
                  <input disabled={selectedLayer.locked} type="range" min="0" max="160" step="1" value={selectedLayer.borderRadius || 0} onChange={(event) => updateLayer(selectedLayer.id, { borderRadius: Number(event.target.value) })} />
                </label>
              </details>

              <details className={styles.editSection} open>
                <summary>Appearance</summary>
                <label>
                  Transparency {Math.round((selectedLayer.opacity ?? 1) * 100)}%
                  <input disabled={selectedLayer.locked} type="range" min="0" max="1" step="0.05" value={selectedLayer.opacity} onChange={(event) => updateLayer(selectedLayer.id, { opacity: Number(event.target.value) })} />
                </label>
                <label>
                  Blur {selectedLayer.blur || 0}px
                  <input disabled={selectedLayer.locked} type="range" min="0" max="20" step="1" value={selectedLayer.blur || 0} onChange={(event) => updateLayer(selectedLayer.id, { blur: Number(event.target.value) })} />
                </label>
                {(selectedLayer.type === "media" || selectedLayer.type === "shape" || selectedLayer.type === "lower-third") && (
                  <div className={styles.objectStyleSummaryGrid}>
                    <button type="button" disabled={selectedLayer.locked} onClick={() => setActiveObjectStylePanel("stroke")} aria-label="Open Stroke controls">
                      <span className={styles.styleSummarySwatch} style={{ borderColor: colorWithOpacity(selectedLayer.strokeColor || "#ffffff", selectedLayer.strokeOpacity ?? 1), borderWidth: Math.max(1, Math.min(5, selectedLayer.strokeWidth || 1)) }} />
                      <span><strong>Stroke</strong><small>{selectedLayer.strokeWidth || 0}px · {selectedLayer.strokePreset || ((selectedLayer.strokeWidth || 0) > 0 ? "custom" : "none")}</small></span>
                    </button>
                    <button type="button" disabled={selectedLayer.locked} onClick={() => setActiveObjectStylePanel("shadow")} aria-label="Open Shadow controls">
                      <span className={styles.styleSummaryShadow} />
                      <span><strong>Shadow</strong><small>{getLayerShadowPreset(selectedLayer)}</small></span>
                    </button>
                  </div>
                )}
                {selectedLayer.type === "text" && (
                  <>
                    <div className={styles.colorGrid}>
                      <label>
                        Shadow
                        <input disabled={selectedLayer.locked} type="color" value={selectedLayer.shadowColor || "#000000"} onChange={(event) => updateLayer(selectedLayer.id, { shadowColor: event.target.value })} />
                      </label>
                      <label>
                        Shadow blur
                        <input disabled={selectedLayer.locked} type="number" min="0" max="35" value={selectedLayer.shadowBlur || 0} onChange={(event) => updateLayer(selectedLayer.id, { shadowBlur: Number(event.target.value), shadowOffsetX: selectedLayer.shadowOffsetX || 4, shadowOffsetY: selectedLayer.shadowOffsetY || 4 })} />
                      </label>
                    </div>
                    <div className={styles.twoColumns}>
                      <label>
                        Shadow X
                        <input disabled={selectedLayer.locked} type="number" min="-60" max="60" value={selectedLayer.shadowOffsetX || 0} onChange={(event) => updateLayer(selectedLayer.id, { shadowOffsetX: Number(event.target.value) })} />
                      </label>
                      <label>
                        Shadow Y
                        <input disabled={selectedLayer.locked} type="number" min="-60" max="60" value={selectedLayer.shadowOffsetY || 0} onChange={(event) => updateLayer(selectedLayer.id, { shadowOffsetY: Number(event.target.value) })} />
                      </label>
                    </div>
                  </>
                )}
              </details>

              {selectedLayer.type === "text" && (
                <>
                  <label>
                    Text
                    <input
                      ref={textLayerInputRef}
                      disabled={selectedLayer.locked}
                      value={selectedLayer.text || ""}
                      onChange={(event) => updateLayer(selectedLayer.id, { text: event.target.value })}
                      aria-label="Edit selected text"
                    />
                  </label>
                  <div className={styles.colorGrid}>
                    <label>
                      Color
                      <input disabled={selectedLayer.locked} type="color" value={selectedLayer.color || "#ffffff"} onChange={(event) => updateLayer(selectedLayer.id, { color: event.target.value })} />
                    </label>
                    <label>
                      Font
                      <input disabled={selectedLayer.locked} type="number" min="18" max="140" value={selectedLayer.fontSize || 48} onChange={(event) => updateLayer(selectedLayer.id, { fontSize: Number(event.target.value) })} />
                    </label>
                  </div>
                  <label>
                    Typeface
                    <select
                      disabled={selectedLayer.locked}
                      value={selectedLayer.fontFamily || "Anton"}
                      onChange={(event) => {
                        ensureVideoMakerFontLoaded(event.target.value);
                        updateLayer(selectedLayer.id, { fontFamily: event.target.value });
                      }}
                    >
                      {fontGroups.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.fonts.map((font) => (
                            <option key={font} value={font} style={{ fontFamily: `"${font}", Arial, sans-serif` }}>{font}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <details className={styles.editSection} open>
                    <summary>Text controls</summary>
                    <div className={styles.actionGrid}>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.isBold !== false ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { isBold: selectedLayer.isBold === false })}>Bold</button>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.isItalic ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { isItalic: !selectedLayer.isItalic })}>Italic</button>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.isUnderline ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { isUnderline: !selectedLayer.isUnderline })}>Underline</button>
                      <button type="button" disabled={selectedLayer.locked} className={(selectedLayer.textAlign || "left") === "left" ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { textAlign: "left" })}>Left</button>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.textAlign === "center" ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { textAlign: "center" })}>Center</button>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.textAlign === "right" ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { textAlign: "right" })}>Right</button>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.isStrikethrough ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { isStrikethrough: !selectedLayer.isStrikethrough })}>Strike</button>
                    </div>
                    <label>
                      Letter spacing {selectedLayer.letterSpacing || 0}px
                      <input disabled={selectedLayer.locked} type="range" min="-2" max="24" step="1" value={selectedLayer.letterSpacing || 0} onChange={(event) => updateLayer(selectedLayer.id, { letterSpacing: Number(event.target.value) })} />
                    </label>
                    <label>
                      Line height {selectedLayer.lineHeight || 1.08}
                      <input disabled={selectedLayer.locked} type="range" min="0.75" max="2" step="0.05" value={selectedLayer.lineHeight || 1.08} onChange={(event) => updateLayer(selectedLayer.id, { lineHeight: Number(event.target.value) })} />
                    </label>
                    <div className={styles.colorGrid}>
                      <label>
                        Outline
                        <input disabled={selectedLayer.locked} type="color" value={selectedLayer.strokeColor || "#000000"} onChange={(event) => updateLayer(selectedLayer.id, { strokeColor: event.target.value })} />
                      </label>
                      <label>
                        Outline px
                        <input disabled={selectedLayer.locked} type="number" min="0" max="18" value={selectedLayer.strokeWidth || 0} onChange={(event) => updateLayer(selectedLayer.id, { strokeWidth: Number(event.target.value) })} />
                      </label>
                    </div>
                    <div className={styles.colorGrid}>
                      <label>
                        Glow
                        <input disabled={selectedLayer.locked} type="color" value={selectedLayer.glowColor || "#ffff00"} onChange={(event) => updateLayer(selectedLayer.id, { glowColor: event.target.value })} />
                      </label>
                      <label>
                        Glow px
                        <input disabled={selectedLayer.locked} type="number" min="0" max="40" value={selectedLayer.glowRadius || 0} onChange={(event) => updateLayer(selectedLayer.id, { glowRadius: Number(event.target.value) })} />
                      </label>
                    </div>
                  </details>
                </>
              )}

              {selectedLayer.type === "shape" && (
                <>
                  <div className={styles.colorGrid}>
                    <label>
                      Color
                      <input disabled={selectedLayer.locked} type="color" value={selectedLayer.color || "#3B82F6"} onChange={(event) => updateLayer(selectedLayer.id, { color: event.target.value, gradientColor1: selectedLayer.shapeType === "gradient" ? event.target.value : selectedLayer.gradientColor1 })} />
                    </label>
                    <label>
                      Shape
                      <select disabled={selectedLayer.locked} value={selectedLayer.shapeType || "rectangle"} onChange={(event) => updateLayer(selectedLayer.id, { shapeType: event.target.value as ShapeType })}>
                        {[...shapePresets, ...framePresets, ...gridPresets, { name: "Gradient", shapeType: "gradient" as const, color: "#2563EB" }].map((shape) => (
                          <option key={`${shape.shapeType}-${shape.name}`} value={shape.shapeType}>{shape.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {selectedLayer.shapeType === "gradient" && (
                    <div className={styles.colorGrid}>
                      <label>
                        Start
                        <input disabled={selectedLayer.locked} type="color" value={selectedLayer.gradientColor1 || selectedLayer.color || "#2563EB"} onChange={(event) => updateLayer(selectedLayer.id, { gradientColor1: event.target.value, color: event.target.value })} />
                      </label>
                      <label>
                        End
                        <input disabled={selectedLayer.locked} type="color" value={selectedLayer.gradientColor2 || "#FFFFFF"} onChange={(event) => updateLayer(selectedLayer.id, { gradientColor2: event.target.value })} />
                      </label>
                    </div>
                  )}
                  {isMediaContainerShape(selectedLayer.shapeType) && (
                    <details className={styles.editSection} open>
                      <summary>Frame media slots</summary>
                      <span className={styles.settingNote}>Choose the image or video displayed inside each area of this frame.</span>
                      <div className={styles.frameSlotList}>
                        {getFrameMediaSlots(selectedLayer.shapeType).map((slot, slotIndex) => {
                          const assignedId = selectedLayer.frameMediaLayerIds?.[slotIndex] || "";
                          return (
                            <label key={`${selectedLayer.id}-slot-${slotIndex}`}>
                              <span className={styles.frameSlotLabel}>
                                <span>{slotIndex + 1}</span>
                                Media slot {slotIndex + 1}
                              </span>
                              <select
                                disabled={selectedLayer.locked}
                                aria-label={`Frame media slot ${slotIndex + 1}`}
                                value={assignedId}
                                onChange={(event) => updateFrameMediaSlot(selectedLayer.id, slotIndex, event.target.value)}
                              >
                                <option value="">Empty</option>
                                {layers.filter((layer) => layer.type === "media" && layer.mediaKind !== "audio").map((mediaLayer) => (
                                  <option key={mediaLayer.id} value={mediaLayer.id}>{mediaLayer.name}</option>
                                ))}
                              </select>
                            </label>
                          );
                        })}
                      </div>
                      {(selectedLayer.frameMediaLayerIds || []).some(Boolean) && (
                        <button
                          type="button"
                          className={styles.clearFrameMediaButton}
                          disabled={selectedLayer.locked}
                          onClick={() => updateLayer(selectedLayer.id, { frameMediaLayerIds: [] })}
                        >
                          Clear all media slots
                        </button>
                      )}
                    </details>
                  )}
                </>
              )}

              {selectedLayer.type === "transition" && (
                <details className={styles.editSection} open>
                  <summary>Transition tools</summary>
                  <label>
                    Duration {selectedLayer.duration.toFixed(2)}s
                    <input
                      disabled={selectedLayer.locked}
                      type="range"
                      min="0.2"
                      max={Math.max(0.2, Math.min(10, (selectedLayer.cutTime ?? selectedLayer.start + selectedLayer.duration / 2) * 2, (timelineViewportDuration - (selectedLayer.cutTime ?? selectedLayer.start + selectedLayer.duration / 2)) * 2))}
                      step="0.05"
                      value={selectedLayer.duration}
                      onChange={(event) => {
                        const duration = Number(event.target.value);
                        const cutTime = selectedLayer.cutTime ?? selectedLayer.start + selectedLayer.duration / 2;
                        updateLayer(selectedLayer.id, {
                          start: Number(Math.max(0, cutTime - duration / 2).toFixed(3)),
                          duration: Number(duration.toFixed(3)),
                        });
                        setCurrentTime(cutTime);
                      }}
                      onPointerUp={() => {
                        currentTimeRef.current = selectedLayer.start;
                        setCurrentTime(selectedLayer.start);
                        setIsPlaying(true);
                      }}
                    />
                  </label>
                  <label>
                    Type
                    <select
                      disabled={selectedLayer.locked}
                      value={selectedLayer.transitionKind || "fade"}
                      onChange={(event) => {
                        const transitionKind = event.target.value as TransitionType;
                        const preset = basicTransitionPresets.find((item) => item.transitionKind === transitionKind);
                        updateLayer(selectedLayer.id, {
                          transitionKind,
                          name: preset?.name || selectedLayer.name,
                          color: preset?.color || selectedLayer.color,
                        });
                        currentTimeRef.current = selectedLayer.start;
                        setCurrentTime(selectedLayer.start);
                        setIsPlaying(true);
                      }}
                    >
                      {basicTransitionPresets.map((transition) => (
                        <option key={transition.transitionKind} value={transition.transitionKind}>{transition.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Color
                    <input disabled={selectedLayer.locked} type="color" value={selectedLayer.color || "#000000"} onChange={(event) => updateLayer(selectedLayer.id, { color: event.target.value })} />
                  </label>
                  <label>
                    From layer
                    <select disabled={selectedLayer.locked} value={selectedLayer.fromLayerId || ""} onChange={(event) => updateLayer(selectedLayer.id, { fromLayerId: event.target.value || undefined })}>
                      <option value="">Auto / none</option>
                      {layers.filter(isTransitionCompatibleClip).map((layer) => (
                        <option key={layer.id} value={layer.id}>{layer.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    To layer
                    <select disabled={selectedLayer.locked} value={selectedLayer.toLayerId || ""} onChange={(event) => updateLayer(selectedLayer.id, { toLayerId: event.target.value || undefined })}>
                      <option value="">Auto / none</option>
                      {layers.filter(isTransitionCompatibleClip).map((layer) => (
                        <option key={layer.id} value={layer.id}>{layer.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Easing
                    <select disabled={selectedLayer.locked} value={selectedLayer.easing || "easeInOut"} onChange={(event) => updateLayer(selectedLayer.id, { easing: event.target.value as VideoLayer["easing"] })}>
                      <option value="linear">Linear</option>
                      <option value="easeIn">Ease in</option>
                      <option value="easeOut">Ease out</option>
                      <option value="easeInOut">Ease in/out</option>
                    </select>
                  </label>
                </details>
              )}

              {(selectedLayer.type === "text" || selectedLayer.type === "shape" || selectedLayer.type === "media" || selectedLayer.type === "lower-third") && (
                <details className={styles.editSection} open>
                  <summary>Entrance and exit animations</summary>
                  <div className={styles.animationPhaseSettingsList}>
                    {(["in", "out"] as const).map((phase) => {
                      const animation = getLayerAnimationForPhase(selectedLayer, phase);
                      return (
                        <section key={phase} className={styles.animationPhaseSettings}>
                          <header>
                            <span>
                              <strong>{phase === "in" ? "Entrance" : "Exit"}</strong>
                              <small>{phase === "in" ? "Starts after the clip begins" : "Anchored to the end of the clip"}</small>
                            </span>
                            {animation ? <button type="button" disabled={selectedLayer.locked} onClick={() => updateLayerAnimation(selectedLayer, phase, { type: "" })}>Remove</button> : null}
                          </header>
                          <label>
                            Animation
                            <select
                              aria-label={`${phase === "in" ? "Entrance" : "Exit"} animation`}
                              disabled={selectedLayer.locked}
                              value={animation?.type || ""}
                              onChange={(event) => updateLayerAnimation(selectedLayer, phase, { type: event.target.value as LayerAnimationType | "" })}
                            >
                              {animationPresets.map((preset) => (
                                <option key={preset.label} value={preset.type}>{preset.label}</option>
                              ))}
                            </select>
                          </label>
                          {animation && (
                            <div className={styles.twoColumns}>
                              <label>
                                {phase === "in" ? "Delay" : "End gap"}
                                <input
                                  aria-label={`${phase === "in" ? "Entrance delay" : "Exit end gap"} seconds`}
                                  disabled={selectedLayer.locked}
                                  type="number"
                                  min="0"
                                  max={selectedLayer.duration}
                                  step="0.05"
                                  value={phase === "in" ? animation.start : animation.endOffset || 0}
                                  onChange={(event) => updateLayerAnimation(selectedLayer, phase, phase === "in" ? { start: Number(event.target.value) } : { endOffset: Number(event.target.value) })}
                                />
                              </label>
                              <label>
                                Duration
                                <input
                                  aria-label={`${phase === "in" ? "Entrance" : "Exit"} duration seconds`}
                                  disabled={selectedLayer.locked}
                                  type="number"
                                  min="0.05"
                                  max={selectedLayer.duration}
                                  step="0.05"
                                  value={animation.duration}
                                  onChange={(event) => updateLayerAnimation(selectedLayer, phase, { duration: Number(event.target.value) })}
                                />
                              </label>
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                  <span className={styles.settingNote}>Entrance and exit are independent. Exit timing is calculated from the end of the clip.</span>
                </details>
              )}

              {(selectedLayer.type === "text" || selectedLayer.type === "shape" || selectedLayer.type === "media") && (
                <details className={styles.editSection}>
                  <summary>Keyframes</summary>
                  <span className={styles.settingNote}>Render server uses these keyframes. Preview local will improve later.</span>
                  <div className={styles.keyframeActions}>
                    {(["x", "y", "opacity", "angle"] as KeyframeProperty[]).map((property) => (
                      <button
                        key={property}
                        type="button"
                        disabled={selectedLayer.locked}
                        onClick={() => addLayerKeyframe(selectedLayer, property)}
                      >
                        + {property}
                      </button>
                    ))}
                  </div>
                  {(selectedLayer.keyframes || []).length > 0 ? (
                    <div className={styles.keyframeList}>
                      {[...(selectedLayer.keyframes || [])].sort((a, b) => a.time - b.time).map((keyframe) => (
                        <div key={keyframe.id} className={styles.keyframeRow}>
                          <span>{keyframe.property}</span>
                          <span>{keyframe.time.toFixed(2)}s</span>
                          <span>{Number(keyframe.value.toFixed(2))}</span>
                          <button
                            type="button"
                            disabled={selectedLayer.locked}
                            onClick={() => deleteLayerKeyframe(selectedLayer, keyframe.id)}
                            aria-label={`Delete ${keyframe.property} keyframe`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.settingNote}>No keyframes yet.</span>
                  )}
                </details>
              )}

              <div className={styles.twoColumns}>
                <label>
                  Start
                  <input disabled={selectedLayer.locked} type="number" min="0" max={timelineViewportDuration} step="0.1" value={selectedLayer.start} onChange={(event) => updateLayer(selectedLayer.id, { start: clamp(Number(event.target.value), 0, timelineViewportDuration) })} />
                </label>
                <label>
                  Duration
                  <input disabled={selectedLayer.locked} type="number" min="0.2" max={timelineViewportDuration} step="0.1" value={selectedLayer.duration} onChange={(event) => updateLayer(selectedLayer.id, { duration: clamp(Number(event.target.value), 0.2, timelineViewportDuration) })} />
                </label>
              </div>

              {selectedLayer.type !== "audio" && selectedLayer.type !== "transition" && (
                <>
                  <div className={styles.twoColumns}>
                    <label>
                      X
                      <input disabled={selectedLayer.locked} type="number" min={-STAGE_POSITION_LIMIT_PERCENT} max={STAGE_POSITION_LIMIT_PERCENT} value={selectedLayer.x} onChange={(event) => updateLayer(selectedLayer.id, { x: clamp(Number(event.target.value), -STAGE_POSITION_LIMIT_PERCENT, STAGE_POSITION_LIMIT_PERCENT) })} />
                    </label>
                    <label>
                      Y
                      <input disabled={selectedLayer.locked} type="number" min={-STAGE_POSITION_LIMIT_PERCENT} max={STAGE_POSITION_LIMIT_PERCENT} value={selectedLayer.y} onChange={(event) => updateLayer(selectedLayer.id, { y: clamp(Number(event.target.value), -STAGE_POSITION_LIMIT_PERCENT, STAGE_POSITION_LIMIT_PERCENT) })} />
                    </label>
                  </div>

                  <label>
                    Opacity
                    <input disabled={selectedLayer.locked} type="range" min="0" max="1" step="0.05" value={selectedLayer.opacity} onChange={(event) => updateLayer(selectedLayer.id, { opacity: Number(event.target.value) })} />
                  </label>
                </>
              )}

              <button type="button" disabled={selectedLayer.locked} onClick={deleteSelectedLayer} className={styles.dangerButton}>Delete clip</button>
            </div>
          )}
        </aside>

        <input
          ref={projectFileInputRef}
          className={styles.hiddenFileInput}
          type="file"
          accept=".pixores-video,.json,application/json,application/x-pixores-video"
          onChange={handleProjectFileChange}
        />

        {isSidebarOpen && (
          <div
            className={styles.columnResizeHandle}
            role="separator"
            aria-label="Resize side panel"
            onPointerDown={(event) => beginLayoutResize(event, "sidebar")}
          />
        )}

        <main
          className={styles.mainEditor}
          style={{ gridTemplateRows: isTimelineVisible
            ? `34px 56px minmax(0, 1fr) 8px ${timelineHeight}px`
            : "34px 56px minmax(0, 1fr) 0 0" }}
        >
          <nav ref={traditionalMenuRef} className={styles.traditionalMenuBar} aria-label="Main menu">
            <div className={styles.traditionalMenuGroup}>
              <button type="button" className={activeTraditionalMenu === "file" ? styles.activeTraditionalMenu : ""} onClick={() => toggleTraditionalMenu("file")} aria-expanded={activeTraditionalMenu === "file"}>File</button>
              {activeTraditionalMenu === "file" && (
                <div className={styles.traditionalMenuDropdown} role="menu">
                  <button type="button" onClick={() => runTraditionalMenuAction(() => requestProjectLifecycleAction("new"))}>New Project<span>Ctrl+N</span></button>
                  <button type="button" onClick={() => runTraditionalMenuAction(() => requestProjectLifecycleAction("close-project"))}>Close Project</button>
                  {adapters.isDesktop && <button type="button" onClick={() => runTraditionalMenuAction(() => requestProjectLifecycleAction("close-app"))}>Exit Pixores</button>}
                  <div className={styles.traditionalMenuSeparator} />
                  <button type="button" onClick={() => runTraditionalMenuAction(() => openToolPanel("imports"))}>Import Media…<span>Ctrl+I</span></button>
                  <button type="button" onClick={() => runTraditionalMenuAction(openProjectFile)}>Open Project…<span>Ctrl+O</span></button>
                  <div className={styles.traditionalMenuSeparator} />
                  <button type="button" disabled={isProjectFileSaving} onClick={() => runTraditionalMenuAction(() => void saveProjectFile())}>{isProjectFileSaving ? "Saving Project…" : "Save Project"}<span>Ctrl+S</span></button>
                  <button type="button" onClick={() => runTraditionalMenuAction(toggleAutoSave)}>Auto Save<span>{autoSaveEnabled ? "On" : "Off"}</span></button>
                  <div className={styles.traditionalMenuSeparator} />
                  <button type="button" onClick={() => runTraditionalMenuAction(openExportDialog)}>Export Video…<span>Ctrl+E</span></button>
                  {adapters.isDesktop && <button type="button" onClick={() => runTraditionalMenuAction(() => setIsYouTubeDialogOpen(true))}>Publish to YouTube…</button>}
                </div>
              )}
            </div>

            <div className={styles.traditionalMenuGroup}>
              <button type="button" className={activeTraditionalMenu === "edit" ? styles.activeTraditionalMenu : ""} onClick={() => toggleTraditionalMenu("edit")} aria-expanded={activeTraditionalMenu === "edit"}>Edit</button>
              {activeTraditionalMenu === "edit" && (
                <div className={styles.traditionalMenuDropdown} role="menu">
                  <button type="button" disabled={!canUndo} onClick={() => runTraditionalMenuAction(undo)}>Undo<span>Ctrl+Z</span></button>
                  <button type="button" disabled={!canRedo} onClick={() => runTraditionalMenuAction(redo)}>Redo<span>Ctrl+Y</span></button>
                  <button type="button" disabled={!selectedLayer && !(markInTime !== null && markOutTime !== null && markOutTime > markInTime)} onClick={() => runTraditionalMenuAction(copyTimelineSelection)}>Copy<span>Ctrl+C</span></button>
                  <button type="button" onClick={() => runTraditionalMenuAction(() => void pasteFromClipboard())}>Paste{timelineClipboardCount > 0 ? ` ${timelineClipboardCount} clip${timelineClipboardCount === 1 ? "" : "s"}` : ""}<span>Ctrl+V</span></button>
                  <div className={styles.traditionalMenuSeparator} />
                  <button type="button" disabled={!selectedLayer || selectedLayer.locked} onClick={() => runTraditionalMenuAction(splitSelectedLayer)}>Split at Playhead<span>S</span></button>
                  <button type="button" disabled={!selectedLayer || selectedLayer.locked} onClick={() => runTraditionalMenuAction(duplicateSelectedLayer)}>Duplicate<span>Ctrl+D</span></button>
                  <button type="button" disabled={!selectedLayer || selectedLayer.locked} onClick={() => runTraditionalMenuAction(deleteSelectedLayer)}>Delete<span>Del</span></button>
                </div>
              )}
            </div>

            <div className={styles.traditionalMenuGroup}>
              <button type="button" className={activeTraditionalMenu === "tools" ? styles.activeTraditionalMenu : ""} onClick={() => toggleTraditionalMenu("tools")} aria-expanded={activeTraditionalMenu === "tools"}>Tools</button>
              {activeTraditionalMenu === "tools" && (
                <div className={styles.traditionalMenuDropdown} role="menu">
                  <button type="button" onClick={() => runTraditionalMenuAction(() => openToolPanel("imports"))}>Media & Imports</button>
                  <button type="button" onClick={() => runTraditionalMenuAction(() => openToolPanel("elements"))}>Elements</button>
                  <button type="button" onClick={() => runTraditionalMenuAction(() => openToolPanel("text"))}>Text</button>
                  <button type="button" onClick={() => runTraditionalMenuAction(() => openToolPanel("audio"))}>Audio Workspace</button>
                  <div className={styles.traditionalMenuSeparator} />
                  <button type="button" onClick={() => runTraditionalMenuAction(openSmartClipsDialog)}>Smart Clips…</button>
                  <button type="button" disabled={!selectedLayer || !isAudioControllableLayer(selectedLayer)} onClick={() => runTraditionalMenuAction(() => openAudioAiDialog("subtitles"))}>Generate Subtitles…</button>
                  <button type="button" disabled={!selectedLayer || !isAudioControllableLayer(selectedLayer)} onClick={() => runTraditionalMenuAction(() => openAudioAiDialog("silence"))}>Remove Silence…</button>
                  <button type="button" disabled={!selectedLayer || selectedLayer.type !== "media"} onClick={() => runTraditionalMenuAction(() => setIsMediaToolsDialogOpen(true))}>Media Tools…</button>
                  <button type="button" disabled={!selectedLayer} onClick={() => runTraditionalMenuAction(openSettingsPanel)}>Element Properties…</button>
                </div>
              )}
            </div>

            <div className={styles.traditionalMenuGroup}>
              <button type="button" className={activeTraditionalMenu === "view" ? styles.activeTraditionalMenu : ""} onClick={() => toggleTraditionalMenu("view")} aria-expanded={activeTraditionalMenu === "view"}>View</button>
              {activeTraditionalMenu === "view" && (
                <div className={styles.traditionalMenuDropdown} role="menu">
                  <button type="button" onClick={() => runTraditionalMenuAction(() => {
                    const next = !isSidebarOpen;
                    setIsSidebarOpen(next);
                    setIsMobilePanelOpen(next);
                  })}>{isSidebarOpen ? "Hide" : "Show"} Side Panel</button>
                  <button type="button" onClick={() => runTraditionalMenuAction(toggleTimelinePanel)}>{isTimelineVisible ? "Hide" : "Show"} Timeline</button>
                  <button type="button" onClick={() => runTraditionalMenuAction(toggleCanvasToolbar)}>{isCanvasToolbarVisible ? "Hide" : "Show"} Canvas Toolbar</button>
                  <div className={styles.traditionalMenuSeparator} />
                  <button type="button" onClick={() => runTraditionalMenuAction(fitTimelineToView)}>Fit Timeline</button>
                  <button type="button" onClick={() => runTraditionalMenuAction(() => void toggleCanvasFullscreen())}>Full Screen Preview<span>F11</span></button>
                </div>
              )}
            </div>

            <div className={styles.traditionalMenuGroup}>
              <button type="button" className={activeTraditionalMenu === "advanced" ? styles.activeTraditionalMenu : ""} onClick={() => toggleTraditionalMenu("advanced")} aria-expanded={activeTraditionalMenu === "advanced"}>Advanced</button>
              {activeTraditionalMenu === "advanced" && (
                <div className={styles.traditionalMenuDropdown} role="menu">
                  <button type="button" onClick={() => runTraditionalMenuAction(() => openToolPanel("project"))}>Project Settings…</button>
                  <button type="button" onClick={() => runTraditionalMenuAction(addEmptyTrack)}>Create Empty Track</button>
                  <button type="button" onClick={() => runTraditionalMenuAction(() => setSnappingEnabled((value) => !value))}>{snappingEnabled ? "Disable" : "Enable"} Snapping</button>
                  <div className={styles.traditionalMenuSeparator} />
                  <button type="button" disabled={!selectedLayer || selectedLayer.type !== "media" || selectedLayer.mediaKind !== "video"} onClick={() => runTraditionalMenuAction(extractAudioFromSelectedVideo)}>Detach Audio</button>
                  <button type="button" onClick={() => runTraditionalMenuAction(setExportMarkIn)}>Set In Point</button>
                  <button type="button" onClick={() => runTraditionalMenuAction(setExportMarkOut)}>Set Out Point</button>
                  <button type="button" disabled={markInTime === null && markOutTime === null} onClick={() => runTraditionalMenuAction(clearInOutSelection)}>Clear In / Out</button>
                </div>
              )}
            </div>

            <div className={styles.traditionalMenuGroup}>
              <button type="button" className={activeTraditionalMenu === "help" ? styles.activeTraditionalMenu : ""} onClick={() => toggleTraditionalMenu("help")} aria-expanded={activeTraditionalMenu === "help"}>Help</button>
              {activeTraditionalMenu === "help" && (
                <div className={styles.traditionalMenuDropdown} role="menu">
                  <Link href="/faq" onClick={() => setActiveTraditionalMenu(null)}>Frequently Asked Questions</Link>
                  <Link href="/contact" onClick={() => setActiveTraditionalMenu(null)}>Support & Contact</Link>
                  <Link href="/desktop" onClick={() => setActiveTraditionalMenu(null)}>Pixores Video Maker Pro</Link>
                  <div className={styles.traditionalMenuSeparator} />
                  <Link href="/about" onClick={() => setActiveTraditionalMenu(null)}>About Pixores</Link>
                </div>
              )}
            </div>
          </nav>

          <header className={styles.topBar}>
            <div>
              <span className={styles.kicker}><Film size={17} /> {adapters.isDesktop ? "Pixores Video Maker Pro" : "Pixores Quick Video Maker"}</span>
              <h1>{adapters.isDesktop ? "Professional video editor" : "Quick video editor"}</h1>
            </div>
            <div className={styles.topBarActions}>
              <button type="button" className={styles.smartClipsButton} onClick={openSmartClipsDialog} disabled={isRecording || isPreparingServerRender || smartClipsProgress.running}>
                <Scissors size={16} />
                Smart Clips
              </button>
              {userEmail && (
                <div className={styles.editorAccountIndicator} title={userEmail}>
                  <span>{userEmail.slice(0, 1).toUpperCase()}</span>
                  <div><small>Signed in</small><strong>{userEmail}</strong></div>
                </div>
              )}
              <button type="button" className={`${styles.autoSaveIndicator} ${autoSaveEnabled ? styles.autoSaveIndicatorEnabled : ""}`} onClick={toggleAutoSave} title="Toggle Auto Save">
                <span />
                {autoSaveEnabled
                  ? `Auto Save${lastAutoSaveAt ? ` · ${lastAutoSaveAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}`
                  : "Auto Save Off"}
              </button>
              <label className={styles.backgroundControl}>
                <span>Background</span>
                <input type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
              </label>
              <button type="button" onClick={openThumbnailDialog} className={styles.thumbnailButton} disabled={isRecording || isPreparingServerRender}>
                <ImagePlus size={17} /> Thumbnail
              </button>
              <button type="button" onClick={isRecording || isPreparingServerRender ? cancelActiveRender : openExportDialog} className={styles.exportButton}>
                {isRecording ? <Square size={17} /> : <Download size={17} />}
                {isRecording || isPreparingServerRender ? "Cancel" : "Export"}
              </button>
            </div>
          </header>

          <div className={styles.workspace}>
          <div className={styles.previewColumn}>
            <div
              ref={previewPanelRef}
              className={styles.previewPanel}
              aria-label="Video preview workspace"
              onContextMenu={(event) => {
                event.preventDefault();
                setImportContextMenu({ x: event.clientX, y: event.clientY });
              }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
              onDrop={(event) => void importDroppedImages(event)}
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) clearLayerSelection();
              }}
              onClick={(event) => {
                if (event.target === event.currentTarget) clearLayerSelection();
              }}
            >
              {isCanvasFullscreen && (
                <button type="button" className={styles.fullscreenExitButton} onClick={() => void toggleCanvasFullscreen()} aria-label="Exit full screen preview">
                  <X size={18} /> Exit full screen
                </button>
              )}
              {isCanvasToolbarVisible && selectedLayer?.type === "text" && (
                <div className={styles.floatingTextToolbar} onPointerDown={(event) => event.stopPropagation()}>
                  <button type="button" className={styles.durationPill} onClick={openSettingsPanel}>
                    <span className={styles.clockGlyph} />
                    {selectedLayer.duration.toFixed(1)}s
                  </button>
                  <select
                    aria-label="Text font"
                    value={selectedLayer.fontFamily || "Anton"}
                    onChange={(event) => {
                      ensureVideoMakerFontLoaded(event.target.value);
                      updateLayer(selectedLayer.id, { fontFamily: event.target.value });
                    }}
                  >
                    {fontGroups.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.fonts.map((font) => (
                          <option key={font} value={font} style={{ fontFamily: `"${font}", Arial, sans-serif` }}>{font}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div className={styles.fontStepper}>
                    <button type="button" aria-label="Decrease font size" onClick={() => updateLayer(selectedLayer.id, { fontSize: Math.max(8, (selectedLayer.fontSize || 48) - 2) })}><Minus size={15} /></button>
                    <input aria-label="Font size" type="number" min="8" max="300" value={selectedLayer.fontSize || 48} onChange={(event) => updateLayer(selectedLayer.id, { fontSize: clamp(Number(event.target.value), 8, 300) })} />
                    <button type="button" aria-label="Increase font size" onClick={() => updateLayer(selectedLayer.id, { fontSize: Math.min(300, (selectedLayer.fontSize || 48) + 2) })}><Plus size={15} /></button>
                  </div>
                  <label className={styles.toolbarColor} aria-label="Text color">
                    <Baseline size={20} />
                    <span style={{ background: selectedLayer.color || "#ffffff" }} />
                    <input type="color" value={selectedLayer.color || "#ffffff"} onChange={(event) => updateLayer(selectedLayer.id, { color: event.target.value })} />
                  </label>
                  <button type="button" className={selectedLayer.hasTextBg ? styles.activeToolbarButton : ""} aria-label={selectedLayer.hasTextBg ? "Remove text background" : "Add text background"} onClick={() => updateLayer(selectedLayer.id, { hasTextBg: !selectedLayer.hasTextBg, textBgColor: selectedLayer.textBgColor || "#000000" })}>BG</button>
                  <label className={styles.toolbarColor} aria-label="Text background color" title="Text background color">
                    <strong>BG</strong>
                    <span style={{ background: selectedLayer.textBgColor || "#000000" }} />
                    <input type="color" value={selectedLayer.textBgColor || "#000000"} onChange={(event) => updateLayer(selectedLayer.id, { textBgColor: event.target.value, hasTextBg: true })} />
                  </label>
                  <button type="button" className={selectedLayer.isBold !== false ? styles.activeToolbarButton : ""} aria-label="Bold" onClick={() => updateLayer(selectedLayer.id, { isBold: selectedLayer.isBold === false })}><Bold size={19} /></button>
                  <button type="button" className={selectedLayer.isItalic ? styles.activeToolbarButton : ""} aria-label="Italic" onClick={() => updateLayer(selectedLayer.id, { isItalic: !selectedLayer.isItalic })}><Italic size={19} /></button>
                  <button type="button" className={selectedLayer.isUnderline ? styles.activeToolbarButton : ""} aria-label="Underline" onClick={() => updateLayer(selectedLayer.id, { isUnderline: !selectedLayer.isUnderline })}><Underline size={19} /></button>
                  <button type="button" className={selectedLayer.isStrikethrough ? styles.activeToolbarButton : ""} aria-label="Strikethrough" onClick={() => updateLayer(selectedLayer.id, { isStrikethrough: !selectedLayer.isStrikethrough })}><Strikethrough size={18} /></button>
                  <button type="button" className={selectedLayer.isUppercase ? styles.activeToolbarButton : ""} aria-label="Uppercase" onClick={() => updateLayer(selectedLayer.id, { isUppercase: !selectedLayer.isUppercase })}><CaseSensitive size={19} /></button>
                  <div className={styles.alignGroup} aria-label="Text alignment">
                    <button type="button" className={(selectedLayer.textAlign || "left") === "left" ? styles.activeToolbarButton : ""} aria-label="Align left" onClick={() => updateLayer(selectedLayer.id, { textAlign: "left" })}><AlignLeft size={18} /></button>
                    <button type="button" className={selectedLayer.textAlign === "center" ? styles.activeToolbarButton : ""} aria-label="Align center" onClick={() => updateLayer(selectedLayer.id, { textAlign: "center" })}><AlignCenter size={18} /></button>
                    <button type="button" className={selectedLayer.textAlign === "right" ? styles.activeToolbarButton : ""} aria-label="Align right" onClick={() => updateLayer(selectedLayer.id, { textAlign: "right" })}><AlignRight size={18} /></button>
                  </div>
                  <button type="button" className={selectedLayer.hasBullets ? styles.activeToolbarButton : ""} aria-label="Bullets" onClick={() => toggleTextBullets(selectedLayer)}><List size={19} /></button>
                  <button type="button" aria-label="Text spacing" onClick={openSettingsPanel}>T</button>
                  <button type="button" aria-label="Transparency" onClick={() => updateLayer(selectedLayer.id, { opacity: selectedLayer.opacity < 1 ? 1 : 0.65 })} className={selectedLayer.opacity < 1 ? styles.activeToolbarButton : ""}>Opacity</button>
                  <button type="button" className={`${styles.textToolbarButton} ${isTextEffectsPanelOpen ? styles.activeToolbarButton : ""}`} onClick={toggleTextEffectsPanel}><Sparkles size={15} /> Styles</button>
                  <button
                    type="button"
                    className={styles.textToolbarButton}
                    disabled={layers.filter((layer) => layer.type === "text" && getTrackId(layer) === getTrackId(selectedLayer)).length < 2}
                    onClick={applySelectedTextFormatToTrack}
                    title="Apply the selected text format to every subtitle on this track"
                  ><Layers3 size={15} /> Apply to all</button>
                  <button type="button" className={styles.textToolbarButton} onClick={openSettingsPanel}>Animate</button>
                  <button type="button" className={styles.textToolbarButton} onClick={openSettingsPanel}>Position</button>
                </div>
              )}
              {isCanvasToolbarVisible && selectedLayer?.type === "text" && isTextEffectsPanelOpen && (
                <section className={`${styles.objectStylePanel} ${styles.textEffectsPanel}`} aria-label="Text Effects controls" onPointerDown={(event) => event.stopPropagation()}>
                  <header className={styles.objectStylePanelHeader}>
                    <button type="button" onClick={() => setIsTextEffectsPanelOpen(false)} aria-label="Back to text toolbar"><ArrowLeft size={19} /></button>
                    <strong>Text &amp; Caption Styles</strong>
                    <button type="button" onClick={() => setIsTextEffectsPanelOpen(false)} aria-label="Close Text Effects">×</button>
                  </header>
                  <strong className={styles.textEffectsSectionTitle}>Caption styles</strong>
                  <div className={styles.captionStylePresetGrid}>
                    {captionStylePresets.map((preset) => (
                      <button type="button" key={preset.id} disabled={selectedLayer.locked} onClick={() => applyCaptionStylePreset(preset.id)} aria-label={`Caption style ${preset.label}`}>
                        <span style={{ color: preset.previewText, background: preset.previewBackground }}><b>Aa</b></span>
                        <small>{preset.label}</small>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.applyCaptionStyleToTrackButton}
                    disabled={selectedLayer.locked || layers.filter((layer) => layer.type === "text" && getTrackId(layer) === getTrackId(selectedLayer)).length < 2}
                    onClick={applySelectedTextFormatToTrack}
                  >
                    <Sparkles size={15} /> Apply this format to all subtitles ({layers.filter((layer) => layer.type === "text" && getTrackId(layer) === getTrackId(selectedLayer)).length})
                  </button>
                  <strong className={styles.textEffectsSectionTitle}>Text effects</strong>
                  <button type="button" className={styles.textEffectsClearButton} disabled={!selectedLayer.textEffectPreset || selectedLayer.textEffectPreset === "none"} onClick={() => applyTextEffectPreset("none")}>Remove effect</button>
                  <div className={styles.textEffectPresetGrid}>
                    {textEffectPresetOptions.filter((preset) => preset.id !== "curve").map((preset) => (
                      <button
                        type="button"
                        key={preset.id}
                        disabled={selectedLayer.locked}
                        className={((selectedLayer.textEffectPreset === "shadow" || selectedLayer.textEffectPreset === "lift" ? "drop" : selectedLayer.textEffectPreset) || "none") === preset.id ? styles.activeStylePreset : ""}
                        onClick={() => applyTextEffectPreset(preset.id)}
                        aria-label={`Text effect ${preset.label}`}
                      >
                        <span className={styles.textEffectPresetPreview} data-text-effect={preset.id}><b>Ag</b></span>
                        <small>{preset.label}</small>
                      </button>
                    ))}
                  </div>
                  <strong className={styles.textEffectsSectionTitle}>Shape</strong>
                  <div className={`${styles.textEffectPresetGrid} ${styles.textEffectShapeGrid}`}>
                    {textEffectPresetOptions.filter((preset) => preset.id === "curve").map((preset) => (
                      <button
                        type="button"
                        key={preset.id}
                        disabled={selectedLayer.locked}
                        className={selectedLayer.textEffectPreset === preset.id ? styles.activeStylePreset : ""}
                        onClick={() => applyTextEffectPreset(preset.id)}
                        aria-label={`Text effect ${preset.label}`}
                      >
                        <span className={styles.textEffectPresetPreview} data-text-effect={preset.id}><b>ABCD</b></span>
                        <small>{preset.label}</small>
                      </button>
                    ))}
                  </div>
                  {selectedLayer.hasTextBg && (
                    <div className={styles.textBackgroundControls}>
                      <strong>Background</strong>
                      <label className={styles.textBackgroundColorControl}>
                        <span>Color</span>
                        <input disabled={selectedLayer.locked} type="color" aria-label="Text background color" value={selectedLayer.textBgColor || "#8b5cf6"} onChange={(event) => updateLayer(selectedLayer.id, { textBgColor: event.target.value, hasTextBg: true })} />
                      </label>
                      <label>
                        <span>Spread <output>{selectedLayer.textBgPadding ?? 12}</output></span>
                        <input disabled={selectedLayer.locked} type="range" min="0" max="40" step="1" aria-label="Text background spread" value={selectedLayer.textBgPadding ?? 12} onChange={(event) => updateLayer(selectedLayer.id, { textBgPadding: Number(event.target.value), hasTextBg: true })} />
                      </label>
                      <label>
                        <span>Roundness <output>{selectedLayer.textBgRadius ?? 12}</output></span>
                        <input disabled={selectedLayer.locked} type="range" min="0" max="40" step="1" aria-label="Text background roundness" value={selectedLayer.textBgRadius ?? 12} onChange={(event) => updateLayer(selectedLayer.id, { textBgRadius: Number(event.target.value), hasTextBg: true })} />
                      </label>
                      <div className={styles.textBackgroundAlignment} role="group" aria-label="Text position in background">
                        <button type="button" className={(selectedLayer.textAlign || "left") === "left" ? styles.activeToolbarButton : ""} aria-label="Background text left" onClick={() => updateLayer(selectedLayer.id, { textAlign: "left" })}><AlignLeft size={18} /></button>
                        <button type="button" className={selectedLayer.textAlign === "center" ? styles.activeToolbarButton : ""} aria-label="Center text in background" onClick={() => updateLayer(selectedLayer.id, { textAlign: "center" })}><AlignCenter size={18} /></button>
                        <button type="button" className={selectedLayer.textAlign === "right" ? styles.activeToolbarButton : ""} aria-label="Background text right" onClick={() => updateLayer(selectedLayer.id, { textAlign: "right" })}><AlignRight size={18} /></button>
                      </div>
                    </div>
                  )}
                  {selectedLayer.textEffectPreset === "curve" && (
                    <div className={styles.textBackgroundControls}>
                      <strong>Shape</strong>
                      <label>
                        <span>Curve <output>{selectedLayer.textCurve ?? -30}</output></span>
                        <input disabled={selectedLayer.locked} type="range" min="-80" max="80" step="1" aria-label="Text curve" value={selectedLayer.textCurve ?? -30} onChange={(event) => updateLayer(selectedLayer.id, { textCurve: Number(event.target.value) })} />
                      </label>
                    </div>
                  )}
                  <p className={styles.textEffectsNote}>Effects apply immediately to the selected text and are included in the exported video.</p>
                  <button type="button" className={styles.textEffectsAdvancedButton} onClick={openSettingsPanel}>Advanced text controls</button>
                </section>
              )}
              {isCanvasToolbarVisible && selectedLayer && (selectedLayer.type === "media" || selectedLayer.type === "shape" || selectedLayer.type === "lower-third") && (
                <div className={`${styles.floatingTextToolbar} ${styles.floatingObjectToolbar}`} aria-label="Object editing toolbar" onPointerDown={(event) => event.stopPropagation()}>
                  <button type="button" className={styles.durationPill} onClick={openSettingsPanel}>
                    <span className={styles.clockGlyph} />
                    {selectedLayer.duration.toFixed(1)}s
                  </button>
                  {selectedLayer.type === "shape" && (
                    <label className={styles.objectToolbarColor}>
                      <span>Fill</span>
                      <input disabled={selectedLayer.locked} type="color" aria-label="Object fill color" value={selectedLayer.color || "#3b82f6"} onChange={(event) => updateLayer(selectedLayer.id, { color: event.target.value })} />
                    </label>
                  )}
                  <button type="button" className={`${styles.objectStyleToolbarButton} ${activeObjectStylePanel === "stroke" ? styles.activeToolbarButton : ""}`} onClick={() => toggleObjectStylePanel("stroke")} aria-label="Open Stroke panel">
                    <span className={styles.toolbarStrokeGlyph} style={{ borderColor: colorWithOpacity(selectedLayer.strokeColor || "#ffffff", selectedLayer.strokeOpacity ?? 1) }} />
                    Stroke <small>{selectedLayer.strokeWidth || 0}px</small>
                  </button>
                  <button type="button" className={`${styles.objectStyleToolbarButton} ${activeObjectStylePanel === "shadow" ? styles.activeToolbarButton : ""}`} onClick={() => toggleObjectStylePanel("shadow")} aria-label="Open Shadow panel">
                    <span className={styles.toolbarShadowGlyph} />
                    Shadow <small>{getLayerShadowPreset(selectedLayer)}</small>
                  </button>
                  <button type="button" className={styles.textToolbarButton} onClick={openSelectedObjectEffects}><Sparkles size={15} /> Effects</button>
                  {selectedLayer.type === "media" && selectedLayer.mediaKind !== "audio" && (
                    <>
                      {selectedLayer.mediaKind === "image" && (
                        <button
                          type="button"
                          className={styles.removeBackgroundToolbarButton}
                          onClick={() => void removeSelectedImageBackground()}
                          disabled={selectedLayer.locked || isRemovingImageBackground}
                          aria-label="Remove selected image background with AI"
                        >
                          <Sparkles size={15} /> {isRemovingImageBackground ? "Removing..." : "Remove BG"}
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.textToolbarButton}
                        onClick={fillSelectedMediaCanvas}
                        disabled={selectedLayer.locked}
                        aria-label="Fill selected media to canvas"
                        title="Fill Canvas (may crop edges)"
                      >
                        <Maximize2 size={15} /> Fill Canvas
                      </button>
                      <button type="button" className={styles.textToolbarButton} onClick={openCropZoomDialog}><Scissors size={15} /> Crop &amp; Zoom</button>
                    </>
                  )}
                </div>
              )}
              {isCanvasToolbarVisible && selectedLayer && activeObjectStylePanel && (selectedLayer.type === "media" || selectedLayer.type === "shape" || selectedLayer.type === "lower-third") && (
                <section className={styles.objectStylePanel} aria-label={activeObjectStylePanel === "shadow" ? "Shadow controls" : "Stroke controls"} onPointerDown={(event) => event.stopPropagation()}>
                  <header className={styles.objectStylePanelHeader}>
                    <button type="button" onClick={() => setActiveObjectStylePanel(null)} aria-label="Back to object toolbar"><ArrowLeft size={19} /></button>
                    <strong>{activeObjectStylePanel === "shadow" ? "Shadows" : "Stroke"}</strong>
                    <button type="button" onClick={() => setActiveObjectStylePanel(null)} aria-label="Close style controls">×</button>
                  </header>

                  {activeObjectStylePanel === "shadow" ? (
                    <>
                      <div className={styles.stylePresetGrid}>
                        {shadowPresetOptions.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            disabled={selectedLayer.locked}
                            className={getLayerShadowPreset(selectedLayer) === preset.id ? styles.activeStylePreset : ""}
                            onClick={() => applyShadowPreset(preset.id)}
                            aria-label={`Shadow preset ${preset.label}`}
                          >
                            <span className={styles.stylePresetPreview} data-shadow-preset={preset.id}><i /></span>
                            <small>{preset.label}</small>
                          </button>
                        ))}
                      </div>
                      <div className={styles.objectStyleControls}>
                        <label>
                          <span>Size <output>{Math.round(selectedLayer.shadowBlur || 0)}</output></span>
                          <input disabled={selectedLayer.locked} type="range" min="0" max="60" step="1" aria-label="Shadow size" value={selectedLayer.shadowBlur || 0} onChange={(event) => {
                            const shadowBlur = Number(event.target.value);
                            updateLayer(selectedLayer.id, {
                              shadowBlur,
                              shadowPreset: shadowBlur > 0 && getLayerShadowPreset(selectedLayer) === "none" ? "drop" : getLayerShadowPreset(selectedLayer),
                              shadowOpacity: shadowBlur > 0 && (selectedLayer.shadowOpacity || 0) === 0 ? 0.6 : selectedLayer.shadowOpacity,
                            });
                          }} />
                        </label>
                        <label className={styles.objectStyleColorControl}>
                          <span>Color</span>
                          <input disabled={selectedLayer.locked} type="color" aria-label="Shadow color" value={selectedLayer.shadowColor || "#000000"} onChange={(event) => updateLayer(selectedLayer.id, { shadowColor: event.target.value })} />
                        </label>
                        <label>
                          <span>Intensity <output>{Math.round((selectedLayer.shadowOpacity ?? 0.6) * 100)}</output></span>
                          <input disabled={selectedLayer.locked} type="range" min="0" max="100" step="1" aria-label="Shadow intensity" value={Math.round((selectedLayer.shadowOpacity ?? 0.6) * 100)} onChange={(event) => {
                            const shadowOpacity = Number(event.target.value) / 100;
                            updateLayer(selectedLayer.id, {
                              shadowOpacity,
                              shadowPreset: shadowOpacity > 0 && getLayerShadowPreset(selectedLayer) === "none" ? "drop" : getLayerShadowPreset(selectedLayer),
                              shadowBlur: shadowOpacity > 0 && (selectedLayer.shadowBlur || 0) === 0 ? 14 : selectedLayer.shadowBlur,
                            });
                          }} />
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.stylePresetGrid}>
                        {strokePresetOptions.map((preset) => (
                          <button
                            type="button"
                            key={preset.id}
                            disabled={selectedLayer.locked}
                            className={(selectedLayer.strokePreset || ((selectedLayer.strokeWidth || 0) > 0 ? "medium" : "none")) === preset.id ? styles.activeStylePreset : ""}
                            onClick={() => applyStrokePreset(preset.id)}
                            aria-label={`Stroke preset ${preset.label}`}
                          >
                            <span className={styles.stylePresetPreview} data-stroke-preset={preset.id}><i /></span>
                            <small>{preset.label}</small>
                          </button>
                        ))}
                      </div>
                      <div className={styles.objectStyleControls}>
                        <label>
                          <span>Width <output>{Math.round(selectedLayer.strokeWidth || 0)}</output></span>
                          <input disabled={selectedLayer.locked} type="range" min="0" max="30" step="1" aria-label="Stroke width" value={selectedLayer.strokeWidth || 0} onChange={(event) => {
                            const strokeWidth = Number(event.target.value);
                            updateLayer(selectedLayer.id, {
                              strokeWidth,
                              strokePreset: strokeWidth > 0 ? "medium" : "none",
                              strokeOpacity: strokeWidth > 0 && (selectedLayer.strokeOpacity || 0) === 0 ? 1 : selectedLayer.strokeOpacity,
                            });
                          }} />
                        </label>
                        <label className={styles.objectStyleColorControl}>
                          <span>Color</span>
                          <input disabled={selectedLayer.locked} type="color" aria-label="Stroke color" value={selectedLayer.strokeColor || "#ffffff"} onChange={(event) => updateLayer(selectedLayer.id, { strokeColor: event.target.value })} />
                        </label>
                        <label>
                          <span>Intensity <output>{Math.round((selectedLayer.strokeOpacity ?? 1) * 100)}</output></span>
                          <input disabled={selectedLayer.locked} type="range" min="0" max="100" step="1" aria-label="Stroke intensity" value={Math.round((selectedLayer.strokeOpacity ?? 1) * 100)} onChange={(event) => updateLayer(selectedLayer.id, { strokeOpacity: Number(event.target.value) / 100 })} />
                        </label>
                      </div>
                    </>
                  )}
                </section>
              )}
              <div ref={canvasViewportRef} className={styles.canvasViewport}>
                <div className={styles.canvasFrame} style={canvasStyle}>
                  <canvas ref={canvasRef} className={styles.canvas} />
                  <div
                  className={styles.stageOverlay}
                  data-preview-stage
                  onPointerDown={selectStageLayerAtPoint}
                >
                  {stageAlignmentGuides?.vertical && (
                    <span className={`${styles.stageCenterGuide} ${styles.stageCenterGuideVertical}`} aria-hidden="true">
                      <small>Center X</small>
                    </span>
                  )}
                  {stageAlignmentGuides?.horizontal && (
                    <span className={`${styles.stageCenterGuide} ${styles.stageCenterGuideHorizontal}`} aria-hidden="true">
                      <small>Center Y</small>
                    </span>
                  )}
                  {stageAlignmentGuides?.vertical && stageAlignmentGuides.horizontal && (
                    <span className={styles.stageCenterGuidePoint} aria-hidden="true"><i /></span>
                  )}
                  {[...visibleStageLayers].reverse().map((layer) => (
                    <div
                      key={layer.id}
                      data-stage-layer-id={layer.id}
                      data-stage-layer-type={layer.type}
                      aria-label={`${layer.name} ${layer.type}`}
                      className={`${styles.stageElement} ${layer.id === selectedLayerId ? styles.activeStageElement : ""} ${layer.locked ? styles.lockedStageElement : ""}`}
                      style={{
                        left: `${layer.x}%`,
                        top: `${layer.y}%`,
                        width: `${layer.width}%`,
                        height: `${layer.height}%`,
                        transform: `rotate(${layer.angle || 0}deg) scale(${layer.isFlippedH ? -1 : 1}, ${layer.isFlippedV ? -1 : 1})`,
                      }}
                      onDoubleClick={(event) => {
                        if (layer.type !== "lower-third" && layer.type !== "text") return;
                        event.preventDefault();
                        event.stopPropagation();
                        if (layer.type === "text") editTextLayer(layer);
                        else editLowerThirdText(layer);
                      }}
                      onPointerDown={(event) => beginStageEdit(event, layer, "move")}
                      onPointerMove={(event) => {
                        if (event.target !== event.currentTarget) return;
                        updateStageElementFromPointer(event.clientX, event.clientY, event.shiftKey);
                      }}
                      onPointerUp={endStageEdit}
                      onPointerCancel={endStageEdit}
                    >
                      {inlineEditingTextId === layer.id && layer.type === "text" && !layer.locked && (
                        <textarea
                          ref={inlineTextEditorRef}
                          className={styles.inlineTextEditor}
                          data-stage-inline-text-editor={layer.id}
                          aria-label={`Edit ${layer.name} directly on canvas`}
                          value={layer.text || ""}
                          spellCheck
                          style={{
                            caretColor: layer.color || "#ffffff",
                            fontFamily: `"${layer.fontFamily || "Arial"}", Arial, sans-serif`,
                            fontSize: `${Math.max(18, layer.fontSize || 48) / 12.8}cqw`,
                            fontStyle: layer.isItalic ? "italic" : "normal",
                            fontWeight: layer.isBold === false ? 500 : 900,
                            lineHeight: layer.lineHeight || 1.08,
                            textAlign: layer.textAlign || "left",
                            textDecoration: [
                              layer.isUnderline ? "underline" : "",
                              layer.isStrikethrough ? "line-through" : "",
                            ].filter(Boolean).join(" ") || "none",
                            textTransform: layer.isUppercase ? "uppercase" : "none",
                          }}
                          onChange={(event) => updateInlineTextLayer(layer.id, event.target.value)}
                          onBlur={finishInlineTextEditing}
                          onPointerDown={(event) => event.stopPropagation()}
                          onDoubleClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                            if (event.key === "Escape" || (event.key === "Enter" && (event.ctrlKey || event.metaKey))) {
                              event.preventDefault();
                              event.currentTarget.blur();
                            }
                          }}
                        />
                      )}
                      {layer.id === selectedLayerId && !layer.locked && (
                        <span
                          className={styles.stageRotateHandle}
                          onPointerDown={(event) => beginStageEdit(event, layer, "rotate")}
                          onPointerMove={(event) => updateStageElementFromPointer(event.clientX, event.clientY, event.shiftKey)}
                          onPointerUp={endStageEdit}
                          onPointerCancel={endStageEdit}
                          title={`${Math.round(layer.angle || 0)} deg`}
                        />
                      )}
                      {(["top", "right", "bottom", "left", "topLeft", "topRight", "bottomLeft", "bottomRight"] as CanvasResizeEdge[]).map((edge) => (
                        <span
                          key={edge}
                          className={`${styles.stageResizeHandle} ${styles[`stageResize${edge[0].toUpperCase()}${edge.slice(1)}`]}`}
                          onPointerDown={(event) => startLayerResize(event, layer, edge)}
                          onPointerMove={(event) => updateStageElementFromPointer(
                            event.clientX,
                            event.clientY,
                            layer.type === "media" && layer.mediaKind !== "audio" ? !event.shiftKey : event.shiftKey,
                          )}
                          onPointerUp={endStageEdit}
                          onPointerCancel={endStageEdit}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>

            <div className={styles.transport}>
              <button type="button" onClick={() => stepFrame(-1)} className={styles.iconButton} aria-label="Previous frame">
                <SkipBack size={16} />
              </button>
              <button
                type="button"
                onClick={() => void togglePlayback()}
                className={styles.iconButton}
                aria-label={isPlaying ? "Pause" : isPlaybackPriming ? "Preparing preview" : "Play"}
                disabled={isPlaybackPriming}
              >
                {isPlaying ? <Pause size={17} /> : <Play size={17} />}
              </button>
              <button type="button" onClick={stopPlayback} className={styles.iconButton} aria-label="Stop">
                <Square size={15} />
              </button>
              <button type="button" onClick={() => stepFrame(1)} className={styles.iconButton} aria-label="Next frame">
                <SkipForward size={16} />
              </button>
              <button type="button" onClick={() => void toggleCanvasFullscreen()} className={styles.iconButton} aria-label={isCanvasFullscreen ? "Exit full screen preview" : "Fullscreen preview"}>
                {isCanvasFullscreen ? <X size={17} /> : <Maximize2 size={17} />}
              </button>
              <button type="button" onClick={() => void snapshotCanvas()} className={styles.iconButton} aria-label="Take snapshot and add it to Imports">
                <Camera size={16} />
              </button>
              <input
                aria-label="Timeline playhead"
                type="range"
                min={previewRangeStart}
                max={previewRangeEnd}
                step={1 / 30}
                value={currentTime}
                onChange={(event) => {
                  setIsPlaying(false);
                  setCurrentTime(clamp(Number(event.target.value), previewRangeStart, previewRangeEnd));
                }}
              />
              <button type="button" onClick={setExportMarkIn} className={`${styles.markButton} ${markInTime !== null ? styles.activeMarkButton : ""}`} title="Set IN point for export range" aria-label="Set IN point">{"{"}</button>
              <button type="button" onClick={setExportMarkOut} className={`${styles.markButton} ${markOutTime !== null ? styles.activeMarkButton : ""}`} title="Set OUT point for export range" aria-label="Set OUT point">{"}"}</button>
              <button type="button" onClick={clearInOutSelection} disabled={markInTime === null && markOutTime === null} className={styles.clearRangeButton} title="Clear IN/OUT selection" aria-label="Clear IN/OUT selection"><X size={15} /></button>
              <label className={styles.volumeControl} aria-label="Preview volume">
                {masterVolume <= 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={masterVolume}
                  onChange={(event) => setMasterVolume(Number(event.target.value))}
                />
              </label>
              <select
                className={styles.canvasZoomSelect}
                value={canvasZoom}
                onChange={(event) => {
                  setCanvasZoom(event.target.value);
                  setManualCanvasWidth(null);
                }}
                aria-label="Canvas zoom"
              >
                <option value="fit">Fit</option>
                <option value="25">25%</option>
                <option value="50">50%</option>
                <option value="75">75%</option>
                <option value="100">100%</option>
                <option value="150">150%</option>
                <option value="200">200%</option>
              </select>
              <button type="button" className={styles.iconButton} aria-label="Player settings">
                <Settings size={16} />
              </button>
              <span>{formatTimecode(currentTime)} / {formatTimecode(projectDuration)}</span>
              <span className={styles.markReadout}>
                IN {markInTime === null ? "--:--:--:--" : formatTimecode(markInTime)} · OUT {markOutTime === null ? "--:--:--:--" : formatTimecode(markOutTime)}
              </span>
            </div>
          </div>
          </div>

          <div
            className={`${styles.timelineResizeHandle} ${!isTimelineVisible ? styles.timelineHidden : ""}`}
            role="separator"
            aria-label="Resize timeline"
            onPointerDown={(event) => beginLayoutResize(event, "timeline")}
          />

          <section className={`${styles.timeline} ${!isTimelineVisible ? styles.timelineHidden : ""}`} aria-label="Layer timeline">
          <div className={styles.timelineHeader}>
            <div className={styles.timelineSummary}>
              <span>Timeline</span>
              <span className={styles.timelineHint}>{formatTimelineClock(currentTime)} / {formatTimelineClock(projectDuration)} · {trackGroups.length} tracks · {readyTrackCount} ready · {projectAspectLabel}</span>
            </div>
            <div className={styles.workspaceModeSwitch} role="group" aria-label="Workspace mode">
              <button type="button" className={workspaceMode === "edit" ? styles.activeWorkspaceMode : ""} aria-pressed={workspaceMode === "edit"} onClick={() => applyWorkspaceMode("edit")}>Edit</button>
              <button type="button" className={workspaceMode === "timeline" ? styles.activeWorkspaceMode : ""} aria-pressed={workspaceMode === "timeline"} onClick={() => applyWorkspaceMode("timeline")}>Timeline</button>
              <button type="button" className={workspaceMode === "preview" ? styles.activeWorkspaceMode : ""} aria-pressed={workspaceMode === "preview"} onClick={() => applyWorkspaceMode("preview")}>Preview</button>
            </div>
            <div className={styles.timelineTools}>
              <button type="button" onClick={undo} disabled={!canUndo} title="Undo"><Undo2 size={15} /></button>
              <button type="button" onClick={redo} disabled={!canRedo} title="Redo"><Redo2 size={15} /></button>
              <button
                type="button"
                className={snappingEnabled ? styles.activeSnappingButton : ""}
                onClick={() => setSnappingEnabled((value) => {
                  const next = !value;
                  localStorage.setItem("pixores-timeline-snapping-enabled", String(next));
                  return next;
                })}
                title={`${snappingEnabled ? "Disable" : "Enable"} snapping (${snappingShortcut.toUpperCase()}). Hold Alt for free movement.`}
                aria-label={snappingEnabled ? "Disable snapping" : "Enable snapping"}
                aria-pressed={snappingEnabled}
              >
                <Magnet size={15} />
              </button>
              <button type="button" className={styles.compactTimelineAction} onClick={addEmptyTrack} title="New empty track" aria-label="New empty track"><Plus size={15} /> Track</button>
              <button
                type="button"
                className={styles.compactTimelineAction}
                onClick={() => setIsMediaToolsDialogOpen(true)}
                disabled={!selectedLayer || selectedLayer.type !== "media"}
                title={selectedLayer?.type === "media" ? "Open media tools" : "Select an image or video clip to use media tools"}
                aria-haspopup="dialog"
              >
                <SlidersHorizontal size={15} /> Media Tools
              </button>
              <button
                type="button"
                className={`${styles.compactTimelineAction} ${styles.audioAiTimelineAction}`}
                onClick={() => openAudioAiDialog("subtitles")}
                disabled={!selectedLayer || !isAudioControllableLayer(selectedLayer)}
                title="Generate subtitles from the selected video or audio clip"
                aria-label="Generate subtitles"
              >
                <Type size={15} /> Generate Subtitles
              </button>
              <button
                type="button"
                className={`${styles.compactTimelineAction} ${styles.audioAiTimelineAction}`}
                onClick={() => openAudioAiDialog("silence")}
                disabled={!selectedLayer || !isAudioControllableLayer(selectedLayer)}
                title="Detect and remove silence from the selected video or audio clip"
                aria-label="Remove silence"
              >
                <VolumeX size={15} /> Remove Silence
              </button>
              <button type="button" className={styles.compactTimelineAction} onClick={splitSelectedLayer} disabled={!selectedLayer || selectedLayer.locked} title="Split selected clip"><Scissors size={15} /> Split</button>
              <button type="button" className={styles.compactTimelineAction} onClick={copyTimelineSelection} disabled={!selectedLayer && !(markInTime !== null && markOutTime !== null && markOutTime > markInTime)} title="Copy selected clip or IN/OUT range"><Copy size={15} /> Copy</button>
              <button type="button" className={styles.compactTimelineAction} onClick={() => void pasteFromClipboard()} title="Paste copied clips at the playhead"><ClipboardPaste size={15} /> Paste</button>
              <button type="button" className={styles.compactTimelineAction} onClick={duplicateSelectedLayer} disabled={!selectedLayer || selectedLayer.locked} title="Duplicate selected clip"><ClipboardPaste size={15} /> Duplicate</button>
              <button type="button" onClick={() => deleteSelectedLayer()} disabled={!selectedLayer || selectedLayer.locked} title="Delete selected clip"><Trash2 size={15} /></button>
              <button type="button" className={styles.compactTimelineAction} onClick={extractAudioFromSelectedVideo} disabled={!selectedLayer || selectedLayer.type !== "media" || selectedLayer.mediaKind !== "video" || selectedLayer.locked} title="Detach audio"><Music size={15} /> Audio</button>
              {selectedLayer && isAudioControllableLayer(selectedLayer) && (
                <div className={styles.selectedClipVolumeControl} title="Volume for the selected clip only">
                  <button
                    type="button"
                    className={selectedLayer.muted ? styles.selectedClipMutedButton : ""}
                    onClick={() => toggleSelectedClipMute(selectedLayer)}
                    disabled={selectedLayer.locked}
                    aria-label={selectedLayer.muted ? "Unmute selected clip" : "Mute selected clip"}
                    aria-pressed={!!selectedLayer.muted}
                  >
                    {selectedLayer.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedLayer.muted ? 0 : getClipVolume(selectedLayer)}
                    disabled={selectedLayer.locked}
                    onPointerDown={() => pushHistorySnapshot()}
                    onChange={(event) => setClipVolumeLive(selectedLayer.id, Number(event.target.value))}
                    aria-label="Selected clip volume"
                  />
                  <span>{Math.round((selectedLayer.muted ? 0 : getClipVolume(selectedLayer)) * 100)}%</span>
                </div>
              )}
              <button type="button" onClick={() => setCurrentTime(0)} title="Go to start"><ArrowLeft size={15} /></button>
              <button type="button" onClick={() => setCurrentTime(projectDuration)} title="Go to end"><ArrowRight size={15} /></button>
              <button type="button" className={styles.compactTimelineAction} onClick={fitTimelineToView} title="Fit timeline"><SlidersHorizontal size={15} /> Fit</button>
              <div className={styles.timelineZoomControl}>
                <button type="button" onClick={() => zoomTimeline(-1)} aria-label="Zoom out"><Minus size={14} /></button>
                <input type="range" min="1" max={TIMELINE_MAX_ZOOM} step="0.25" value={timelineZoom} title={`${timelineZoom.toFixed(2)}x`} onChange={(event) => setTimelineZoom(Number(event.target.value))} />
                <button type="button" onClick={() => zoomTimeline(1)} aria-label="Zoom in"><Plus size={14} /></button>
              </div>
            </div>
          </div>
          <div className={styles.timelineScroll}>
            <div
              ref={timelineInnerRef}
              className={styles.timelineInner}
              style={timelineInnerStyle}
              onPointerMove={(event) => {
                if (!clipEditRef.current) return;
                if (event.buttons === 0) {
                  endClipEdit(event.pointerId);
                  return;
                }
                updateClipFromPointer(event.clientX, event.clientY, event.altKey, event.pointerId);
              }}
              onPointerUp={(event) => endClipEdit(event.pointerId)}
              onPointerCancel={(event) => endClipEdit(event.pointerId)}
              onLostPointerCapture={(event) => endClipEdit(event.pointerId)}
            >
              <div className={styles.timeRuler} onPointerDown={seekFromTimelineElement}>
                {timelineMarks.map((mark) => (
                  <span
                    key={mark.time}
                    className={mark.isMajor ? styles.rulerMajorMark : styles.rulerMinorMark}
                    style={{ left: `${(mark.time / timelineViewportDuration) * 100}%` }}
                  >
                    {mark.label}
                  </span>
                ))}
                {snapGuideTime !== null && (
                  <span className={styles.snapGuide} style={{ left: `${(snapGuideTime / timelineViewportDuration) * 100}%` }}>
                    <span>{formatTimelineClock(snapGuideTime)}</span>
                  </span>
                )}
                <span
                  className={styles.rulerPlayhead}
                  style={{ left: "var(--pixores-playhead-left)" }}
                  onPointerDown={beginPlayheadDrag}
                  onPointerMove={dragPlayhead}
                  onPointerUp={endPlayheadDrag}
                  onPointerCancel={endPlayheadDrag}
                />
              </div>
              <div className={styles.timelineRows}>
                {visibleTrackGroups.map(({ trackId, name, muted, clips, emptyTrack, isSmartPlaceholder }, trackIndex) => {
                  const firstClip = clips[0];
                  const isSelectedTrack = clips.some((clip) => clip.id === selectedLayerId);
                  const isActiveTrack = isSelectedTrack || selectedTrackId === trackId;
                  const isLockedTrack = clips.length ? clips.some((clip) => clip.locked) : !!emptyTrack?.locked;
                  const isVisibleTrack = clips.length ? clips.some((clip) => clip.visible) : emptyTrack?.visible !== false;
                  const isMutedTrack = muted;
                  const trackLabel = `Track ${trackIndex + 1}`;
                  const trackKindLabel = firstClip ? (firstClip.type === "media" ? firstClip.mediaKind || "media" : firstClip.type) : "empty";
                  const trackTransitions = layers.filter((layer) => (
                    layer.type === "transition"
                    && (layer.trackId || layer.id) === trackId
                    && layer.visible
                  ));
                  return (
                  <div
                    role="button"
                    tabIndex={0}
                    key={trackId}
                    data-timeline-row
                    className={`${styles.timelineRow} ${isSmartPlaceholder ? styles.smartTimelineRow : ""} ${isActiveTrack ? styles.activeTimelineRow : ""} ${isLockedTrack ? styles.lockedTimelineRow : ""} ${draggingTrackId === trackId ? styles.draggingTimelineRow : ""}`}
                    onClick={(event) => {
                      if (event.target === event.currentTarget) {
                        setSelectedLayerId(firstClip?.id || "");
                        setSelectedTrackId(trackId);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedLayerId(firstClip?.id || "");
                        setSelectedTrackId(trackId);
                      }
                    }}
                  >
                    {trackDropIndex === trackIndex && draggingTrackId && draggingTrackId !== trackId && <span className={styles.trackDropIndicator} />}
                    <span
                      className={styles.trackName}
                      onPointerDown={(event) => !isSmartPlaceholder && !isLockedTrack && beginTrackDrag(event, trackId)}
                      onPointerMove={(event) => !isSmartPlaceholder && updateTrackDrag(event.clientY)}
                      onPointerUp={(event) => !isSmartPlaceholder && endTrackDrag(event)}
                      onPointerCancel={(event) => !isSmartPlaceholder && endTrackDrag(event)}
                    >
                      {isSmartPlaceholder ? <Plus className={styles.smartTrackPlus} size={16} /> : <GripVertical size={15} />}
                      {!isSmartPlaceholder && <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => {
                        event.stopPropagation();
                        if (clips.length) clips.forEach((clip) => updateLayer(clip.id, { locked: !isLockedTrack }));
                        else setEmptyTracks((current) => current.map((track) => (track.id === trackId ? { ...track, locked: !isLockedTrack } : track)));
                      }} aria-label={isLockedTrack ? "Unlock track" : "Lock track"}>
                        {isLockedTrack ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>}
                      {!isSmartPlaceholder && <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => {
                        event.stopPropagation();
                        if (clips.length) clips.forEach((clip) => updateLayer(clip.id, { visible: !isVisibleTrack }));
                        else setEmptyTracks((current) => current.map((track) => (track.id === trackId ? { ...track, visible: !isVisibleTrack } : track)));
                      }} aria-label={isVisibleTrack ? "Hide track" : "Show track"}>
                        {isVisibleTrack ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>}
                      {!isSmartPlaceholder && <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => {
                        event.stopPropagation();
                        toggleTrackMute(trackId);
                      }} className={isMutedTrack ? styles.mutedTrackButton : ""} title={isMutedTrack ? "Unmute track" : "Mute track"} aria-label={isMutedTrack ? `Unmute ${trackLabel}` : `Mute ${trackLabel}`} aria-pressed={isMutedTrack}>
                        {isMutedTrack ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>}
                      {!isSmartPlaceholder && <button
                        type="button"
                        className={styles.deleteTrackButton}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeTrack(trackId);
                        }}
                        title={`Delete ${trackLabel}`}
                        aria-label={`Delete ${trackLabel}`}
                      >
                        <Trash2 size={14} />
                      </button>}
                      <span className={styles.trackTitle}>
                        <b>{trackLabel}{!isSmartPlaceholder && name && name !== trackLabel ? ` · ${name}` : ""}</b>
                        <small>{isSmartPlaceholder ? "READY · SELECT TO ADD" : `${trackKindLabel} · ${clips.length} clip${clips.length === 1 ? "" : "s"}`}</small>
                      </span>
                    </span>
                    <div
                      className={`${styles.timelineTrack} ${isSmartPlaceholder ? styles.smartTimelineTrack : ""}`}
                      data-timeline-track
                      data-track-id={trackId}
                      onContextMenu={(event) => openTimelineTrackContextMenu(event, trackId)}
                      onPointerDown={(event) => {
                        setSelectedTrackId(trackId);
                        if (!clips.length) setSelectedLayerId("");
                        seekFromTimelineElement(event);
                      }}
                      onDragOver={(event) => {
                        if (
                          event.dataTransfer.types.includes("application/x-pixores-transition-kind")
                          || event.dataTransfer.types.includes("text/plain")
                        ) event.preventDefault();
                      }}
                      onDrop={(event) => handleTransitionDrop(event, trackId)}
                    >
                      {markTrackId === trackId && markInTime !== null && markOutTime !== null && markOutTime > markInTime && (
                        <span
                          className={styles.trackExportRangeHighlight}
                          style={{
                            left: `${(markInTime / timelineViewportDuration) * 100}%`,
                            width: `${((markOutTime - markInTime) / timelineViewportDuration) * 100}%`,
                          }}
                        />
                      )}
                      {markTrackId === trackId && markInTime !== null && (
                        <span
                          className={`${styles.trackRangeMark} ${styles.trackRangeMarkIn}`}
                          style={{ left: `${(markInTime / timelineViewportDuration) * 100}%` }}
                          onPointerDown={(event) => beginRangeMarkerDrag(event, "in")}
                          onPointerMove={dragRangeMarker}
                          onPointerUp={endRangeMarkerDrag}
                          onPointerCancel={endRangeMarkerDrag}
                          title="Drag to adjust IN"
                        >IN</span>
                      )}
                      {markTrackId === trackId && markOutTime !== null && (
                        <span
                          className={`${styles.trackRangeMark} ${styles.trackRangeMarkOut}`}
                          style={{ left: `${(markOutTime / timelineViewportDuration) * 100}%` }}
                          onPointerDown={(event) => beginRangeMarkerDrag(event, "out")}
                          onPointerMove={dragRangeMarker}
                          onPointerUp={endRangeMarkerDrag}
                          onPointerCancel={endRangeMarkerDrag}
                          title="Drag to adjust OUT"
                        >OUT</span>
                      )}
                      {isSmartPlaceholder && <span className={styles.smartTrackPrompt}><Plus size={14} /> Ready for content</span>}
                      <span
                        className={styles.playhead}
                        style={{ left: "var(--pixores-playhead-left)" }}
                        onPointerDown={beginPlayheadDrag}
                        onPointerMove={dragPlayhead}
                        onPointerUp={endPlayheadDrag}
                        onPointerCancel={endPlayheadDrag}
                      />
                      {snapGuideTime !== null && (
                        <span className={styles.trackSnapGuide} style={{ left: `${(snapGuideTime / timelineViewportDuration) * 100}%` }} />
                      )}
                      {clips.map((layer) => {
                        const hasAudioControl = isAudioControllableLayer(layer);
                        const clipVolume = getClipVolume(layer);
                        const volumePercent = Math.round(clipVolume * 100);
                        const entranceAnimation = getLayerAnimationForPhase(layer, "in");
                        const exitAnimation = getLayerAnimationForPhase(layer, "out");
                        return (
                          <span
                            key={layer.id}
                            className={`${styles.clip} ${layer.type === "audio" ? styles.audioClip : ""} ${hasAudioControl ? styles.audioWaveClip : ""} ${layer.muted ? styles.clipMuted : ""} ${selectedLayerIdSet.has(layer.id) ? styles.selectedClip : ""} ${hasTrackOverlap(layers, layer) ? styles.overlappingClip : ""}`}
                            onPointerDown={(event) => beginClipEdit(event, layer, "move")}
                            onContextMenu={(event) => openTimelineClipContextMenu(event, layer)}
                            style={{
                              left: `${(layer.start / timelineViewportDuration) * 100}%`,
                              width: `${(layer.duration / timelineViewportDuration) * 100}%`,
                            }}
                          >
                            {entranceAnimation && (
                              <span
                                className={`${styles.clipAnimationMarker} ${styles.clipEntranceAnimationMarker}`}
                                style={{
                                  left: `${(entranceAnimation.start / Math.max(0.05, layer.duration)) * 100}%`,
                                  width: `${(entranceAnimation.duration / Math.max(0.05, layer.duration)) * 100}%`,
                                }}
                                title={`Entrance: ${entranceAnimation.type} · ${entranceAnimation.duration.toFixed(2)}s`}
                              />
                            )}
                            {exitAnimation && (
                              <span
                                className={`${styles.clipAnimationMarker} ${styles.clipExitAnimationMarker}`}
                                style={{
                                  left: `${(Math.max(0, layer.duration - (exitAnimation.endOffset || 0) - exitAnimation.duration) / Math.max(0.05, layer.duration)) * 100}%`,
                                  width: `${(exitAnimation.duration / Math.max(0.05, layer.duration)) * 100}%`,
                                }}
                                title={`Exit: ${exitAnimation.type} · ${exitAnimation.duration.toFixed(2)}s`}
                              />
                            )}
                            <span
                              className={`${styles.clipHandle} ${styles.clipHandleStart}`}
                              title="Drag to adjust clip start"
                              onPointerDown={(event) => beginClipEdit(event, layer, "trim-start")}
                            />
                            {hasAudioControl && (
                              <span className={styles.clipWaveform} aria-hidden="true">
                                <ClipWaveform
                                  peaks={waveformPeaks[layer.assetKey || layer.id]}
                                  layer={layer}
                                  timelineZoom={timelineZoom}
                                  volume={clipVolume}
                                />
                              </span>
                            )}
                            {hasAudioControl && (
                              <span
                                className={`${styles.clipVolumeZone} ${activeVolumeLayerId === layer.id ? styles.activeClipVolumeZone : ""}`}
                                onPointerDown={(event) => beginVolumeDrag(event, layer)}
                                onPointerMove={(event) => dragVolumeLine(event, layer)}
                                onPointerUp={endVolumeDrag}
                                onPointerCancel={endVolumeDrag}
                                title={`Clip volume: ${volumePercent}%`}
                              >
                                <span
                                  className={styles.clipVolumeLine}
                                  style={{ top: `${100 - volumePercent}%` }}
                                />
                              </span>
                            )}
                            <span className={styles.clipLabel}>
                              {layer.groupId && <Layers3 size={12} aria-label="Grouped clip" />}
                              {layer.type === "audio" ? layer.name || "Audio" : layer.mediaKind === "video" ? layer.name || "Video" : layer.type}
                            </span>
                            <span
                              className={styles.clipMoveGrip}
                              title="Drag clip"
                              aria-label="Drag clip"
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                beginClipEdit(event, layer, "move");
                              }}
                            >
                              <GripVertical size={13} />
                            </span>
                            <span
                              className={`${styles.clipHandle} ${styles.clipHandleEnd}`}
                              title="Drag to extend or shorten clip"
                              onPointerDown={(event) => beginClipEdit(event, layer, "trim-end")}
                            />
                          </span>
                        );
                      })}
                      {volumeTooltip && (
                        <span
                          className={styles.volumeTooltip}
                          style={{
                            left: `${volumeTooltip.x}px`,
                            top: `${volumeTooltip.y}px`,
                          }}
                        >
                          Volume: {Math.round(volumeTooltip.value * 100)}%
                        </span>
                      )}
                      {trackTransitions.map((layer) => {
                        const cutTime = layer.cutTime ?? (layer.start + layer.duration / 2);
                        const safeCutPercent = clamp(cutTime / timelineViewportDuration, 0, 1) * 100;
                        return (
                          <span
                            key={layer.id}
                            className={`${styles.transitionBridge} ${layer.id === selectedLayerId ? styles.selectedTransitionBridge : ""}`}
                            data-transition-layer={layer.id}
                            style={{
                              left: `${safeCutPercent}%`,
                              width: `${(layer.duration / timelineViewportDuration) * 100}%`,
                            }}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectedLayerId(layer.id);
                              setActivePanel("settings");
                              setIsMobilePanelOpen(false);
                              setIsMobileTimelineOpen(false);
                              setIsPlaying(false);
                            }}
                            title={`${layer.name} · ${layer.duration.toFixed(2)}s · drag either edge to change duration`}
                          >
                            <span
                              className={`${styles.transitionDurationHandle} ${styles.transitionDurationHandleStart}`}
                              onPointerDown={(event) => beginTransitionResize(event, layer, "start")}
                              aria-label={`Change ${layer.name} duration from the left edge`}
                            />
                            <span className={styles.transitionBridgeLabel}>{layer.duration.toFixed(1)}s</span>
                            <span
                              className={`${styles.transitionDurationHandle} ${styles.transitionDurationHandleEnd}`}
                              onPointerDown={(event) => beginTransitionResize(event, layer, "end")}
                              aria-label={`Change ${layer.name} duration from the right edge`}
                            />
                          </span>
                        );
                      })}
                      {clipDragPreview?.trackId === trackId && (
                        <span
                          className={`${styles.clipDragGhost} ${clipDragPreview.isOverlapping ? styles.overlappingClipGhost : ""}`}
                          style={{
                            left: `${clipDragPreview.leftPercent}%`,
                            width: `${clipDragPreview.widthPercent}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
        </main>
      </section>
      {projectFileNotice && (
        <div className={`${styles.projectFileNotice} ${styles[`projectFileNotice_${projectFileNotice.tone}`]}`} role={projectFileNotice.tone === "error" ? "alert" : "status"} aria-live="polite">
          <span>{projectFileNotice.message}</span>
          {projectFileNotice.tone !== "working" && <button type="button" onClick={() => setProjectFileNotice(null)} aria-label="Close project export message">×</button>}
        </div>
      )}
      {isMediaToolsDialogOpen && selectedLayer?.type === "media" && (
        <div className={styles.modalBackdrop} role="presentation" onPointerDown={() => setIsMediaToolsDialogOpen(false)}>
          <section
            className={styles.mediaToolsDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-tools-title"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <div>
                <span>Selected clip</span>
                <h2 id="media-tools-title">Media Tools</h2>
              </div>
              <button type="button" onClick={() => setIsMediaToolsDialogOpen(false)} aria-label="Close Media Tools">x</button>
            </div>
            <div className={styles.mediaToolsDialogBody}>
              <p className={styles.mediaToolsSelection}>{selectedLayer.name}</p>
              {(selectedLayer.mediaKind === "image" || selectedLayer.mediaKind === "video") && (
                <>
                  <p className={styles.settingNote}>Resize and Fit keep the whole image. Cropping only happens with Crop &amp; Zoom or a Fill/Cover option.</p>
                  <div className={styles.actionGrid}>
                    <button type="button" disabled={selectedLayer.locked} onClick={fitSelectedMediaToCanvas}>Fit Selected to Canvas</button>
                    <button type="button" disabled={selectedLayer.locked} onClick={fillSelectedMediaCanvas}>Fill Canvas (may crop)</button>
                    <button type="button" disabled={selectedLayer.locked} onClick={makeSelectedMediaOverlay}>Overlay 40%</button>
                    {selectedLayer.mediaKind === "image" && (
                      <button type="button" disabled={selectedLayer.locked} onClick={extendSelectedImageToVideoEnd}>Extend to Video End</button>
                    )}
                  </div>
                </>
              )}
              <label className={styles.dialogField}>
                Layer fit
                <select
                  disabled={selectedLayer.locked}
                  value={selectedLayer.objectFit || "contain"}
                  onChange={(event) => updateLayer(selectedLayer.id, { objectFit: event.target.value as VideoLayer["objectFit"] })}
                >
                  <option value="contain">Contain / show whole media</option>
                  <option value="cover">Cover / fill box (may crop)</option>
                </select>
              </label>
              <div className={styles.colorGrid}>
                <label className={styles.dialogField}>
                  Outline
                  <input disabled={selectedLayer.locked} type="color" value={selectedLayer.strokeColor || "#ffffff"} onChange={(event) => updateLayer(selectedLayer.id, { strokeColor: event.target.value })} />
                </label>
                <label className={styles.dialogField}>
                  Outline px
                  <input disabled={selectedLayer.locked} type="number" min="0" max="30" value={selectedLayer.strokeWidth || 0} onChange={(event) => updateLayer(selectedLayer.id, { strokeWidth: Number(event.target.value) })} />
                </label>
              </div>
              <label className={styles.dialogField}>
                Blend mode
                <select disabled={selectedLayer.locked} value={selectedLayer.blendMode || "normal"} onChange={(event) => updateLayer(selectedLayer.id, { blendMode: event.target.value as VideoLayer["blendMode"] })}>
                  <option value="normal">Keep original</option>
                  <option value="multiply">Drop white background</option>
                  <option value="screen">Drop black background</option>
                  <option value="darken">Darken</option>
                  <option value="lighten">Lighten</option>
                </select>
              </label>
              {selectedLayer.locked && <p className={styles.mediaToolsLocked}>Unlock this track to change its media settings.</p>}
            </div>
          </section>
        </div>
      )}
      {isAudioAiDialogOpen && selectedLayer && isAudioControllableLayer(selectedLayer) && (
        <div className={styles.modalBackdrop} role="presentation" onPointerDown={(event) => event.target === event.currentTarget && !audioAiBusy && setIsAudioAiDialogOpen(false)}>
          <section className={styles.audioAiDialog} role="dialog" aria-modal="true" aria-labelledby="audio-ai-title">
            <div className={styles.dialogHeader}>
              <div>
                <span>LOCAL AUDIO AI</span>
                <h2 id="audio-ai-title">Captions &amp; Silence</h2>
              </div>
              <button type="button" disabled={audioAiBusy} onClick={() => setIsAudioAiDialogOpen(false)} aria-label="Close Audio AI">×</button>
            </div>
            <div className={styles.audioAiBody}>
              <p className={styles.audioAiSelection}><Volume2 size={16} /> {selectedLayer.name}</p>
              <div className={styles.audioAiTabs} role="tablist" aria-label="Audio AI tools">
                <button type="button" role="tab" aria-selected={audioAiTab === "subtitles"} className={audioAiTab === "subtitles" ? styles.activeAudioAiTab : ""} onClick={() => { setAudioAiTab("subtitles"); setAudioAiError(""); }}>Generate Subtitles</button>
                <button type="button" role="tab" aria-selected={audioAiTab === "silence"} className={audioAiTab === "silence" ? styles.activeAudioAiTab : ""} onClick={() => { setAudioAiTab("silence"); setAudioAiError(""); }}>Remove Silence</button>
              </div>

              {audioAiTab === "subtitles" ? (
                <div className={styles.audioAiPanel}>
                  <p>Transcribe the selected clip locally and add an editable <strong>AI Captions</strong> text track. The video never leaves this computer.</p>
                  <div className={styles.audioAiFields}>
                    <label className={styles.dialogField}>
                      Spoken language
                      <select value={subtitleLanguage} disabled={audioAiBusy} onChange={(event) => setSubtitleLanguage(event.target.value as typeof subtitleLanguage)}>
                        <option value="auto">Auto detect</option>
                        <option value="Spanish">Spanish</option>
                        <option value="English">English</option>
                      </select>
                    </label>
                    <label className={styles.dialogField}>
                      Accuracy
                      <select value={subtitleModel} disabled={audioAiBusy} onChange={(event) => setSubtitleModel(event.target.value as typeof subtitleModel)}>
                        <option value="base">Base · recommended</option>
                        <option value="tiny">Fast · lower accuracy</option>
                      </select>
                    </label>
                  </div>
                  <div className={styles.audioAiNotice}>
                    <Sparkles size={17} />
                    <div><strong>First use downloads the local speech model</strong><span>Base is about 148 MB; Fast is about 78 MB. It is downloaded once and reused.</span></div>
                  </div>
                </div>
              ) : (
                <div className={styles.audioAiPanel}>
                  <p>Detect quiet sections, preview how much will be removed, then ripple the following timeline clips. The change can be undone.</p>
                  <div className={styles.audioAiFields}>
                    <label className={styles.dialogField}>
                      Silence threshold
                      <span className={styles.audioAiRangeValue}>{silenceThresholdDb} dB</span>
                      <input type="range" min="-55" max="-20" step="1" value={silenceThresholdDb} disabled={audioAiBusy} onChange={(event) => { setSilenceThresholdDb(Number(event.target.value)); setSilenceAnalysis(null); }} />
                    </label>
                    <label className={styles.dialogField}>
                      Minimum silence
                      <span className={styles.audioAiRangeValue}>{silenceMinimumDuration.toFixed(2)}s</span>
                      <input type="range" min="0.2" max="2" step="0.05" value={silenceMinimumDuration} disabled={audioAiBusy} onChange={(event) => { setSilenceMinimumDuration(Number(event.target.value)); setSilenceAnalysis(null); }} />
                    </label>
                    <label className={styles.dialogField}>
                      Keep around speech
                      <span className={styles.audioAiRangeValue}>{silencePadding.toFixed(2)}s</span>
                      <input type="range" min="0" max="0.5" step="0.02" value={silencePadding} disabled={audioAiBusy} onChange={(event) => setSilencePadding(Number(event.target.value))} />
                    </label>
                  </div>
                  {silenceAnalysis && (
                    <div className={styles.silenceSummary}>
                      <div><strong>{silenceAnalysis.silences.length}</strong><span>silent sections</span></div>
                      <div><strong>{silenceAnalysis.silentDuration.toFixed(1)}s</strong><span>detected</span></div>
                      <div><strong>{getSilenceRemovalRanges(silenceAnalysis.silences, silencePadding).reduce((total, range) => total + range.end - range.start, 0).toFixed(1)}s</strong><span>will be removed</span></div>
                    </div>
                  )}
                </div>
              )}

              {audioAiBusy && (
                <div className={styles.audioAiWorking}>
                  <span />
                  <strong>{audioAiTab === "subtitles" ? (audioAiProgress?.message || "Transcribing locally…") : "Analyzing waveform…"}</strong>
                  <small>{audioAiTab === "subtitles" && audioAiProgress ? `${audioAiProgress.progress}% · ` : ""}Keep Pixores open while this finishes.</small>
                  {audioAiTab === "subtitles" && audioAiProgress && <i><b style={{ width: `${audioAiProgress.progress}%` }} /></i>}
                </div>
              )}
              {audioAiError && <p className={styles.audioAiError}>{audioAiError}</p>}
            </div>
            <footer className={styles.audioAiActions}>
              <button type="button" onClick={() => audioAiBusy ? void cancelAudioAiOperation() : setIsAudioAiDialogOpen(false)}>{audioAiBusy ? "Cancel Process" : "Cancel"}</button>
              {audioAiTab === "subtitles" ? (
                <button type="button" className={styles.audioAiPrimary} disabled={audioAiBusy} onClick={() => void generateSubtitles()}><Type size={16} /> Generate Subtitles</button>
              ) : silenceAnalysis ? (
                <button type="button" className={styles.audioAiPrimary} disabled={audioAiBusy || silenceAnalysis.silences.length === 0 || selectedLayer.locked} onClick={applySilenceRemoval}><Scissors size={16} /> Apply &amp; Ripple Timeline</button>
              ) : (
                <button type="button" className={styles.audioAiPrimary} disabled={audioAiBusy} onClick={() => void analyzeSelectedClipSilence()}><Sparkles size={16} /> Analyze Silence</button>
              )}
            </footer>
          </section>
        </div>
      )}
      {mediaMatchRequest && (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.mediaMatchDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-match-title"
            aria-describedby="media-match-description"
          >
            <div className={styles.mediaMatchHeader}>
              <span>PROJECT STANDARD</span>
              <h2 id="media-match-title">Match project to this video?</h2>
            </div>
            <div className={styles.mediaMatchBody}>
              <p id="media-match-description">
                The video resolution or frame rate differs from the current project. Matching it avoids unnecessary scaling and frame conversion during editing and export.
              </p>
              <label className={styles.mediaMatchRemember}>
                <input
                  type="checkbox"
                  checked={skipFutureMediaMatchPrompts}
                  onChange={(event) => setSkipFutureMediaMatchPrompts(event.target.checked)}
                />
                Don&apos;t ask again
              </label>
              <div className={styles.mediaMatchComparison}>
                <div>
                  <span>Match media</span>
                  <strong>{mediaMatchRequest.width}x{mediaMatchRequest.height} {mediaMatchRequest.fps}fps</strong>
                </div>
                <div>
                  <span>Keep project</span>
                  <strong>{selectedFormat.width}x{selectedFormat.height} {normalizeProjectFps(exportSettings.fps)}fps</strong>
                </div>
              </div>
            </div>
            <div className={styles.mediaMatchActions}>
              <button type="button" className={styles.mediaMatchPrimary} onClick={() => resolveMediaMatchRequest(true)}>Match Media</button>
              <button type="button" onClick={() => resolveMediaMatchRequest(false)}>Keep Project</button>
            </div>
          </section>
        </div>
      )}
      {pendingProjectAction && (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.unsavedChangesDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="unsaved-project-title"
            aria-describedby="unsaved-project-description"
          >
            <div className={styles.unsavedChangesHeader}>
              <span>UNSAVED CHANGES</span>
              <h2 id="unsaved-project-title">Save project?</h2>
            </div>
            <div className={styles.unsavedChangesBody}>
              <p id="unsaved-project-description">
                <strong>{projectTitle || "Untitled video"}</strong> has been modified. Do you want to save your changes before {
                  pendingProjectAction === "new" ? "creating a new project"
                    : pendingProjectAction === "open" ? "opening another project"
                      : pendingProjectAction === "close-app" ? "closing Pixores"
                        : "closing this project"
                }?
              </p>
              <small>Choosing Don&apos;t Save permanently discards the latest changes and its Auto Save recovery.</small>
            </div>
            <div className={styles.unsavedChangesActions}>
              <button type="button" onClick={cancelProjectLifecycleAction} disabled={isSavingBeforeProjectAction}>Cancel</button>
              <button type="button" className={styles.unsavedDiscardAction} onClick={discardAndContinueProjectAction} disabled={isSavingBeforeProjectAction}>Don&apos;t Save</button>
              <button type="button" className={styles.unsavedSaveAction} onClick={() => void saveAndContinueProjectAction()} disabled={isSavingBeforeProjectAction}>
                {isSavingBeforeProjectAction ? "Saving…" : "Save Project"}
              </button>
            </div>
          </section>
        </div>
      )}
      {isThumbnailDialogOpen && (
        <div className={styles.modalBackdrop} onPointerDown={() => setIsThumbnailDialogOpen(false)}>
          <section className={styles.thumbnailDialog} role="dialog" aria-modal="true" aria-label="Automatic thumbnail" onPointerDown={(event) => event.stopPropagation()}>
            <header>
              <div><span>AUTOMATIC THUMBNAIL</span><h2>Create from the current frame</h2></div>
              <button type="button" onClick={() => setIsThumbnailDialogOpen(false)} aria-label="Close thumbnail creator">×</button>
            </header>
            <label className={styles.thumbnailTitleField}>
              <span>Thumbnail title</span>
              <input value={thumbnailTitle} maxLength={64} onChange={(event) => setThumbnailTitle(event.target.value)} placeholder="Enter a short, strong title" />
            </label>
            <div className={styles.thumbnailTemplates}>
              {(["clean", "bold", "cinema", "social"] as const).map((template) => (
                <button type="button" key={template} className={thumbnailTemplate === template ? styles.activeThumbnailTemplate : ""} onClick={() => setThumbnailTemplate(template)}>
                  <span data-thumbnail-template={template}><i>{thumbnailTitle || projectTitle || "TITLE"}</i></span>
                  <strong>{template === "clean" ? "Clean" : template === "bold" ? "Bold" : template === "cinema" ? "Cinema" : "Social"}</strong>
                </button>
              ))}
            </div>
            <p>Pixores uses the visible frame, creates a 1280 × 720 PNG, adds it to Imports and saves a copy in the video export folder. You can add it to My Library later.</p>
            <footer>
              <button type="button" onClick={() => setIsThumbnailDialogOpen(false)}>Cancel</button>
              <button type="button" className={styles.dialogPrimaryAction} onClick={() => void generateAutomaticThumbnail()}><Sparkles size={16} /> Generate thumbnail</button>
            </footer>
          </section>
        </div>
      )}
      <SmartClipsDialog
        open={isSmartClipsDialogOpen}
        platformId={smartClipPlatformId}
        segmentDuration={smartClipDuration}
        customWidth={smartClipCustomWidth}
        customHeight={smartClipCustomHeight}
        projectDuration={smartClipSource?.duration || 0}
        outputDirectory={exportSettings.outputDirectory || "Downloads"}
        isDesktop={adapters.isDesktop}
        source={smartClipSource}
        sourceLoading={isSmartClipSourceLoading}
        progress={smartClipsProgress}
        autoCaptions={smartClipAutoCaptions}
        captionTemplateId={smartClipCaptionTemplateId}
        captionPosition={smartClipCaptionPosition}
        captionSize={smartClipCaptionSize}
        faceMode={smartClipFaceMode}
        speakerSelection={smartClipSpeakerSelection}
        fastExport={smartClipFastExport}
        subtitleLanguage={subtitleLanguage}
        subtitleModel={subtitleModel}
        candidates={smartClipCandidates}
        activeCandidateId={smartClipActiveCandidateId}
        previewSource={smartClipPreviewSource}
        previewOffset={smartClipPreviewOffset}
        onSourceFileChange={(file) => void selectSmartClipSourceFile(file)}
        onPlatformChange={selectSmartClipPlatform}
        onDurationChange={selectSmartClipDuration}
        onAutoCaptionsChange={(enabled) => {
          resetSmartClipCandidates();
          setSmartClipAutoCaptions(enabled);
        }}
        onCaptionTemplateChange={(templateId) => {
          resetSmartClipCandidates();
          selectSmartClipCaptionTemplate(templateId);
        }}
        onCaptionPositionChange={selectSmartClipCaptionPosition}
        onCaptionSizeChange={(sizePercent) => {
          resetSmartClipCandidates();
          selectSmartClipCaptionSize(sizePercent);
        }}
        onFaceModeChange={setSmartClipFaceMode}
        onSpeakerSelectionChange={setSmartClipSpeakerSelection}
        onFastExportChange={setSmartClipFastExport}
        onSubtitleLanguageChange={(language) => {
          resetSmartClipCandidates();
          setSubtitleLanguage(language);
        }}
        onSubtitleModelChange={(model) => {
          resetSmartClipCandidates();
          setSubtitleModel(model);
        }}
        onCustomSizeChange={(width, height) => {
          resetSmartClipCandidates();
          setSmartClipCustomWidth(width);
          setSmartClipCustomHeight(height);
        }}
        onAnalyze={() => void analyzeSmartClips()}
        onCandidateChange={updateSmartClipCandidate}
        onActiveCandidateChange={setSmartClipActiveCandidateId}
        onChooseDestination={() => void chooseExportDestination()}
        onClose={() => {
          if (smartClipsProgress.running) return;
          setIsSmartClipsDialogOpen(false);
        }}
        onCancel={() => void cancelSmartClipsExport()}
        onExport={() => void exportSmartClips(smartClipPlatformId, smartClipDuration, smartClipCustomWidth, smartClipCustomHeight)}
      />
      <ExportVideoDialog
        open={isExportDialogOpen}
        settings={exportSettings}
        duration={exportDuration}
        projectWidth={selectedFormat.width}
        projectHeight={selectedFormat.height}
        isDesktop={adapters.isDesktop}
        serverRenderAvailable={isLocalServerRenderAvailable}
        browserExportDirectoryName={browserExportDirectoryName}
        onChange={setExportSettings}
        onChooseDestination={() => void chooseExportDestination()}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={(settings) => void startConfiguredExport(settings)}
      />
      <RenderProgressDialog
        progress={renderProgress}
        onCancel={cancelActiveRender}
        onClose={() => setRenderProgress((current) => ({ ...current, open: false }))}
        onPublishYouTube={() => {
          setRenderProgress((current) => ({ ...current, open: false }));
          setIsYouTubeDialogOpen(true);
        }}
      />
      <YouTubePublishDialog
        key={`${isYouTubeDialogOpen}-${renderProgress.outputPath}`}
        open={isYouTubeDialogOpen}
        defaultVideoPath={renderProgress.outputPath}
        defaultTitle={projectTitle}
        onClose={() => setIsYouTubeDialogOpen(false)}
      />
      {importContextMenu && (
        <div
          className={`${styles.rangeContextMenu} ${styles.importContextMenu}`}
          style={{ left: `${importContextMenu.x}px`, top: `${importContextMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
          role="menu"
          aria-label="Import image actions"
        >
          <div className={styles.contextMenuHeading}>Import image</div>
          <button type="button" onClick={() => { setImportContextMenu(null); void pasteImageFromClipboard(); }} role="menuitem">
            <ClipboardPaste size={15} /> Paste image from clipboard <span>Ctrl+V</span>
          </button>
          <button type="button" onClick={() => { setImportContextMenu(null); openThumbnailDialog(); }} role="menuitem">
            <Sparkles size={15} /> Automatic thumbnail
          </button>
        </div>
      )}
      {rangeContextMenu && (
        <div
          className={styles.rangeContextMenu}
          style={{ left: `${rangeContextMenu.x}px`, top: `${rangeContextMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
          role="menu"
          aria-label="Selected range actions"
        >
          <button type="button" onClick={exportSelectedRange} role="menuitem">
            <Download size={15} />
            Render / export selected range
          </button>
          <button type="button" onClick={copySelectedRangeToClipboard} role="menuitem">
            <Copy size={15} />
            Copy selected range
          </button>
          <button type="button" onClick={deleteSelectedRange} role="menuitem" className={styles.dangerMenuItem}>
            <Trash2 size={15} />
            Delete selected section
          </button>
          <button type="button" onClick={clearInOutSelection} role="menuitem">
            <X size={15} />
            Clear IN / OUT selection
          </button>
        </div>
      )}
      {timelineContextMenu && (
        <div
          className={`${styles.rangeContextMenu} ${styles.timelineContextMenu}`}
          style={{ left: `${timelineContextMenu.x}px`, top: `${timelineContextMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
          role="menu"
          aria-label={timelineContextMenu.layerId ? "Clip actions" : "Track actions"}
        >
          {timelineContextMenu.layerId ? (
            <>
              <div className={styles.contextMenuHeading}>{selectedLayers.length > 1 ? `${selectedLayers.length} clips selected` : selectedLayer?.name || "Selected clip"}</div>
              <button type="button" onClick={() => runTimelineContextAction(cutTimelineSelection)} disabled={!selectedLayer || selectedLayers.some((layer) => layer.locked)} role="menuitem">Cut <span>Ctrl+X</span></button>
              <button type="button" onClick={() => runTimelineContextAction(copyTimelineSelection)} role="menuitem">Copy <span>Ctrl+C</span></button>
              <button type="button" onClick={() => runTimelineContextAction(() => void pasteFromClipboard())} role="menuitem">Paste <span>Ctrl+V</span></button>
              <button type="button" onClick={() => runTimelineContextAction(duplicateSelectedLayer)} disabled={!selectedLayer || selectedLayers.some((layer) => layer.locked)} role="menuitem">Duplicate <span>Ctrl+D</span></button>
              <button type="button" onClick={() => runTimelineContextAction(deleteSelectedLayer)} disabled={!selectedLayer || selectedLayers.some((layer) => layer.locked)} role="menuitem" className={styles.dangerMenuItem}>Delete <span>Del</span></button>
              <div className={styles.contextMenuDivider} />
              <button type="button" onClick={() => runTimelineContextAction(splitSelectedLayer)} disabled={!selectedLayer || selectedLayers.length > 1 || selectedLayer.locked} role="menuitem">Split at playhead <span>Ctrl+B</span></button>
              <button type="button" onClick={() => runTimelineContextAction(() => {
                setActivePanel("elements");
                setActiveElementTab("frames");
                setIsSidebarOpen(true);
                setIsMobilePanelOpen(true);
              })} disabled={!selectedLayer || selectedLayers.length > 1 || selectedLayer.locked || selectedLayer.type !== "media" || selectedLayer.mediaKind === "audio"} role="menuitem">Apply frame…</button>
              <button type="button" onClick={() => runTimelineContextAction(openCropZoomDialog)} disabled={!selectedLayer || selectedLayers.length > 1 || selectedLayer.locked || selectedLayer.type !== "media" || selectedLayer.mediaKind === "audio"} role="menuitem">Crop &amp; Zoom</button>
              <button type="button" onClick={() => runTimelineContextAction(fitSelectedMediaToCanvas)} disabled={!selectedLayer || selectedLayers.length > 1 || selectedLayer.locked || selectedLayer.type !== "media"} role="menuitem">Fit to canvas</button>
              <button type="button" onClick={() => runTimelineContextAction(fillSelectedMediaCanvas)} disabled={!selectedLayer || selectedLayers.length > 1 || selectedLayer.locked || selectedLayer.type !== "media"} role="menuitem">Fill canvas</button>
              <button type="button" onClick={() => runTimelineContextAction(rotateSelectedMediaClockwise)} disabled={!selectedLayer || selectedLayers.length > 1 || selectedLayer.locked || selectedLayer.type === "audio"} role="menuitem">Rotate 90° clockwise</button>
              <div className={styles.contextMenuDivider} />
              <button type="button" onClick={() => runTimelineContextAction(() => selectedLayer && toggleSelectedClipMute(selectedLayer))} disabled={!selectedLayer || selectedLayers.length > 1 || selectedLayer.locked || !isAudioControllableLayer(selectedLayer)} role="menuitem">{selectedLayer?.muted ? "Unmute" : "Mute"}</button>
              <button type="button" onClick={() => runTimelineContextAction(extractAudioFromSelectedVideo)} disabled={!selectedLayer || selectedLayers.length > 1 || selectedLayer.locked || selectedLayer.type !== "media" || selectedLayer.mediaKind !== "video"} role="menuitem">Detach audio</button>
              <button type="button" onClick={() => runTimelineContextAction(() => openAudioAiDialog("subtitles"))} disabled={!selectedLayer || selectedLayers.length > 1 || !isAudioControllableLayer(selectedLayer)} role="menuitem">Generate subtitles…</button>
              <button type="button" onClick={() => runTimelineContextAction(() => openAudioAiDialog("silence"))} disabled={!selectedLayer || selectedLayers.length > 1 || !isAudioControllableLayer(selectedLayer)} role="menuitem">Remove silence…</button>
              <div className={styles.contextMenuDivider} />
              <button type="button" onClick={() => runTimelineContextAction(groupSelectedLayers)} disabled={selectedLayers.length < 2 || selectedLayers.some((layer) => layer.locked)} role="menuitem">Group <span>Ctrl+G</span></button>
              <button type="button" onClick={() => runTimelineContextAction(ungroupSelectedLayers)} disabled={!selectedLayers.some((layer) => layer.groupId)} role="menuitem">Ungroup <span>Ctrl+Shift+G</span></button>
              <button type="button" onClick={() => runTimelineContextAction(renameSelectedLayer)} disabled={!selectedLayer || selectedLayers.length > 1 || selectedLayer.locked} role="menuitem">Rename <span>F2</span></button>
              <button type="button" onClick={() => runTimelineContextAction(toggleSelectedLayersLock)} role="menuitem">{selectedLayers.length && selectedLayers.every((layer) => layer.locked) ? "Unlock" : "Lock"}</button>
              <button type="button" onClick={() => runTimelineContextAction(() => removeTrack(timelineContextMenu.trackId))} role="menuitem" className={styles.dangerMenuItem}>Delete track</button>
            </>
          ) : (
            <>
              <div className={styles.contextMenuHeading}>Track actions</div>
              <button type="button" onClick={() => runTimelineContextAction(() => void pasteFromClipboard())} role="menuitem">Paste at playhead <span>Ctrl+V</span></button>
              <button type="button" onClick={() => runTimelineContextAction(() => toggleTrackMute(timelineContextMenu.trackId))} role="menuitem">Mute / unmute track</button>
              <button type="button" onClick={() => runTimelineContextAction(() => removeTrack(timelineContextMenu.trackId))} role="menuitem" className={styles.dangerMenuItem}>Delete track</button>
            </>
          )}
        </div>
      )}
      <CropZoomDialog
        open={Boolean(cropZoomLayer && cropZoomAsset)}
        layer={cropZoomLayer}
        asset={cropZoomAsset}
        onClose={() => setCropZoomLayerId("")}
        onApply={applyCropZoom}
        onReset={resetCropZoom}
      />
    </div>
  );
}

type ExportVideoDialogProps = {
  open: boolean;
  settings: PixoresExportSettings;
  duration: number;
  projectWidth: number;
  projectHeight: number;
  isDesktop: boolean;
  serverRenderAvailable: boolean;
  browserExportDirectoryName: string;
  onChange: (settings: PixoresExportSettings) => void;
  onChooseDestination: () => void;
  onClose: () => void;
  onExport: (settings: PixoresExportSettings) => void;
};

type SmartClipsDialogProps = {
  open: boolean;
  platformId: SmartClipPlatformId;
  segmentDuration: number;
  customWidth: number;
  customHeight: number;
  projectDuration: number;
  outputDirectory: string;
  isDesktop: boolean;
  source: SmartClipSourceState | null;
  sourceLoading: boolean;
  progress: SmartClipsProgressState;
  autoCaptions: boolean;
  captionTemplateId: SmartClipCaptionTemplateId;
  captionPosition: SmartClipCaptionPosition;
  captionSize: number;
  faceMode: SmartClipFaceMode;
  speakerSelection: boolean;
  fastExport: boolean;
  subtitleLanguage: "auto" | "Spanish" | "English";
  subtitleModel: "tiny" | "base";
  candidates: SmartClipCandidate[];
  activeCandidateId: string;
  previewSource: string;
  previewOffset: number;
  onSourceFileChange: (file: File) => void;
  onPlatformChange: (platformId: SmartClipPlatformId) => void;
  onDurationChange: (duration: number) => void;
  onAutoCaptionsChange: (enabled: boolean) => void;
  onCaptionTemplateChange: (templateId: SmartClipCaptionTemplateId) => void;
  onCaptionPositionChange: (position: SmartClipCaptionPosition) => void;
  onCaptionSizeChange: (sizePercent: number) => void;
  onFaceModeChange: (mode: SmartClipFaceMode) => void;
  onSpeakerSelectionChange: (enabled: boolean) => void;
  onFastExportChange: (enabled: boolean) => void;
  onSubtitleLanguageChange: (language: "auto" | "Spanish" | "English") => void;
  onSubtitleModelChange: (model: "tiny" | "base") => void;
  onAnalyze: () => void;
  onCandidateChange: (candidateId: string, patch: Partial<Pick<SmartClipCandidate, "title" | "selected">>) => void;
  onActiveCandidateChange: (candidateId: string) => void;
  onCustomSizeChange: (width: number, height: number) => void;
  onChooseDestination: () => void;
  onClose: () => void;
  onCancel: () => void;
  onExport: () => void;
};

type CropZoomDialogProps = {
  open: boolean;
  layer?: VideoLayer;
  asset?: MediaAsset;
  onClose: () => void;
  onApply: (layerId: string, patch: Pick<VideoLayer, "crop" | "transform">) => void;
  onReset: (layerId: string) => void;
};

type CropDragState = {
  mode: "move" | "left" | "right" | "top" | "bottom" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  startX: number;
  startY: number;
  initialCrop: NonNullable<VideoLayer["crop"]>;
};

function SmartClipCandidatePreview({
  source,
  candidate,
  sourceOffset,
  platform,
}: {
  source: string;
  candidate?: SmartClipCandidate;
  sourceOffset: number;
  platform: SmartClipPlatform;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const previewStart = Math.max(0, sourceOffset + (candidate?.start || 0));
  const previewEnd = Math.max(previewStart, sourceOffset + (candidate?.end || 0));
  const previewDuration = Math.max(0.05, previewEnd - previewStart);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !candidate?.id) return;
    video.pause();
    setIsPlaying(false);
    setElapsed(0);
    if (video.readyState >= 1) video.currentTime = previewStart;
  }, [candidate?.id, previewStart, source]);

  if (!source || !candidate) {
    return <div className={styles.smartClipPreviewEmpty}><Film size={28} /><span>Select a proposal to preview that individual cut.</span></div>;
  }

  const seekPreview = (nextElapsed: number) => {
    const video = videoRef.current;
    const safeElapsed = Math.max(0, Math.min(previewDuration, nextElapsed));
    setElapsed(safeElapsed);
    if (video) video.currentTime = previewStart + safeElapsed;
  };

  const togglePreview = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
      return;
    }
    if (video.currentTime < previewStart || video.currentTime >= previewEnd - 0.04) {
      video.currentTime = previewStart;
      setElapsed(0);
    }
    try {
      await video.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <div className={styles.smartClipPreviewPlayer}>
      <div className={styles.smartClipPreviewStage} style={{ aspectRatio: `${platform.width} / ${platform.height}` }}>
        <video
          ref={videoRef}
          src={source}
          preload="metadata"
          playsInline
          onClick={() => void togglePreview()}
          onLoadedMetadata={(event) => {
            event.currentTarget.currentTime = previewStart;
            setElapsed(0);
          }}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onTimeUpdate={(event) => {
            const currentElapsed = Math.max(0, event.currentTarget.currentTime - previewStart);
            if (event.currentTarget.currentTime >= previewEnd - 0.025) {
              event.currentTarget.pause();
              event.currentTarget.currentTime = previewEnd;
              setElapsed(previewDuration);
              return;
            }
            setElapsed(Math.min(previewDuration, currentElapsed));
          }}
        />
        <span>{platform.aspectRatio} · {platform.width} × {platform.height}</span>
      </div>
      <div className={styles.smartClipPreviewControls}>
        <button type="button" onClick={() => void togglePreview()} aria-label={isPlaying ? "Pause cut preview" : "Play cut preview"}>
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <input
          type="range"
          min={0}
          max={previewDuration}
          step={0.01}
          value={Math.min(previewDuration, elapsed)}
          onChange={(event) => seekPreview(Number(event.target.value))}
          aria-label="Cut preview position"
        />
        <span>{formatTimelineClock(elapsed)} / {formatTimelineClock(previewDuration)}</span>
      </div>
      <small>Cut {candidate.index + 1} · {formatTimelineClock(candidate.start)}–{formatTimelineClock(candidate.end)} of the master video</small>
    </div>
  );
}

function SmartClipsDialog({
  open,
  platformId,
  segmentDuration,
  customWidth,
  customHeight,
  projectDuration,
  outputDirectory,
  isDesktop,
  source,
  sourceLoading,
  progress,
  autoCaptions,
  captionTemplateId,
  captionPosition,
  captionSize,
  faceMode,
  speakerSelection,
  fastExport,
  subtitleLanguage,
  subtitleModel,
  candidates,
  activeCandidateId,
  previewSource,
  previewOffset,
  onSourceFileChange,
  onPlatformChange,
  onDurationChange,
  onAutoCaptionsChange,
  onCaptionTemplateChange,
  onCaptionPositionChange,
  onCaptionSizeChange,
  onFaceModeChange,
  onSpeakerSelectionChange,
  onFastExportChange,
  onSubtitleLanguageChange,
  onSubtitleModelChange,
  onAnalyze,
  onCandidateChange,
  onActiveCandidateChange,
  onCustomSizeChange,
  onChooseDestination,
  onClose,
  onCancel,
  onExport,
}: SmartClipsDialogProps) {
  if (!open) return null;
  const platform = getSmartClipPlatform(platformId, { width: customWidth, height: customHeight });
  const segments = createSmartClipSegments(projectDuration, segmentDuration);
  const selectedCaptionTemplate = SMART_CLIP_CAPTION_TEMPLATES.find((template) => template.id === captionTemplateId) || SMART_CLIP_CAPTION_TEMPLATES[0];
  const activeCandidate = candidates.find((candidate) => candidate.id === activeCandidateId) || candidates[0];
  const selectedCandidateCount = candidates.filter((candidate) => candidate.selected).length;

  return (
    <div className={styles.modalBackdrop} onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.smartClipsDialog} role="dialog" aria-modal="true" aria-label="Smart Clips">
        <header className={styles.smartClipsHeader}>
          <div>
            <span><Sparkles size={14} /> Social batch creator</span>
            <h2>Smart Clips</h2>
            <p>Choose a master video, configure the short format, analyze it privately on this computer, then preview and export only the cuts you select.</p>
          </div>
          <button type="button" onClick={onClose} disabled={progress.running} aria-label="Close Smart Clips">×</button>
        </header>

        <div className={styles.smartClipsBody}>
          <div className={styles.smartClipSteps}>
            <span data-complete={Boolean(source)}><b>1</b> Master video</span>
            <span data-complete={Boolean(source && candidates.length)}><b>2</b> Format & analyze</span>
            <span data-complete={Boolean(candidates.length)}><b>3</b> Preview & export</span>
          </div>

          <section className={styles.smartClipSourceCard} data-ready={Boolean(source)}>
            <div>
              <span><Film size={17} /></span>
              <p>
                <strong>{source?.name || "Choose the master video"}</strong>
                <small>{source ? `${formatExportSeconds(source.duration)} · ${source.width} × ${source.height} · ready locally` : "The original stays on this computer. MP4, MOV, WebM, MKV, AVI and WMV are supported."}</small>
              </p>
            </div>
            <label>
              <input
                type="file"
                accept="video/*,.mkv,.avi,.wmv"
                disabled={!isDesktop || sourceLoading || progress.running}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) onSourceFileChange(file);
                }}
              />
              <FolderOpen size={16} /> {sourceLoading ? "Preparing locally…" : source ? "Change video" : "Choose video"}
            </label>
          </section>

          <div className={styles.smartClipSectionTitle}><span>2</span><div><strong>Choose the output</strong><small>The preview and exported files use these exact dimensions.</small></div></div>
          <div className={styles.smartClipPlatforms}>
            {SMART_CLIP_PLATFORMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={platformId === item.id ? styles.activeSmartClipPlatform : ""}
                onClick={() => onPlatformChange(item.id)}
                disabled={progress.running || sourceLoading}
                style={{ "--platform-accent": item.accent } as CSSProperties}
              >
                <span className={styles.smartClipPhone}><i /></span>
                <strong>{item.label}</strong>
                <small>{item.id === "custom" ? `${customWidth} × ${customHeight}` : `${item.aspectRatio} · ${item.width} × ${item.height}`}</small>
              </button>
            ))}
          </div>

          {platformId === "custom" && (
            <div className={styles.smartClipCustomSize}>
              <label>Width <input type="number" min={320} max={7680} step={2} value={customWidth} disabled={progress.running} onChange={(event) => onCustomSizeChange(Number(event.target.value) || 320, customHeight)} /></label>
              <label>Height <input type="number" min={320} max={7680} step={2} value={customHeight} disabled={progress.running} onChange={(event) => onCustomSizeChange(customWidth, Number(event.target.value) || 320)} /></label>
              <span>Allowed range: 320 to 7680 pixels.</span>
            </div>
          )}

          <div className={styles.smartClipSettings}>
            <label className={styles.dialogField}>
              Length per clip
              <select value={segmentDuration} onChange={(event) => onDurationChange(Number(event.target.value))} disabled={progress.running}>
                {SMART_CLIP_DURATIONS.filter((duration) => duration <= platform.maxDuration).map((duration) => (
                  <option key={duration} value={duration}>{duration < 60 ? `${duration} seconds` : `${duration / 60} minute${duration === 60 ? "" : "s"}`}</option>
                ))}
              </select>
            </label>
            <div className={styles.smartClipDestination}>
              <span>Export folder</span>
              <strong title={outputDirectory}>{outputDirectory}</strong>
              <button type="button" onClick={onChooseDestination} disabled={progress.running || !isDesktop}><FolderOpen size={15} /> Choose Folder</button>
            </div>
          </div>

          <section className={styles.smartClipTemplateSection} aria-label="Smart Clip subtitle template">
            <header>
              <span><Type size={15} /> Subtitle template</span>
              <small>Choose a ready-made look or select None to keep the standard or edited style.</small>
            </header>
            <div className={styles.smartClipTemplateGrid}>
              {SMART_CLIP_CAPTION_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={captionTemplateId === template.id ? styles.activeSmartClipTemplate : ""}
                  onClick={() => onCaptionTemplateChange(template.id)}
                  disabled={progress.running}
                  aria-pressed={captionTemplateId === template.id}
                  title={template.description}
                >
                  <span
                    data-transparent={template.previewBackground === "transparent"}
                    style={{
                      color: template.previewText,
                      background: template.previewBackground === "transparent" ? undefined : template.previewBackground,
                      fontFamily: `"${template.fontFamily || "Arial"}", Arial, sans-serif`,
                    }}
                  >{template.id === "none" ? "—" : "Aa"}</span>
                  <strong>{template.label}</strong>
                </button>
              ))}
            </div>
            <div className={styles.smartClipCaptionPosition}>
              <span>
                <strong>Subtitle position</strong>
                <small>Choose a consistent safe zone for every generated clip.</small>
              </span>
              <div role="radiogroup" aria-label="Subtitle position">
                {(["top", "middle", "bottom"] as SmartClipCaptionPosition[]).map((position) => (
                  <button
                    key={position}
                    type="button"
                    aria-checked={captionPosition === position}
                    role="radio"
                    className={captionPosition === position ? styles.activeSmartClipCaptionPosition : ""}
                    onClick={() => onCaptionPositionChange(position)}
                    disabled={progress.running}
                  >
                    {position[0].toUpperCase() + position.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.smartClipCaptionSize}>
              <span>
                <strong>Subtitle size</strong>
                <small>Larger by default and automatically limited to the video safe area.</small>
              </span>
              <div>
                <button
                  type="button"
                  aria-label="Decrease Smart Clip subtitle size"
                  onClick={() => onCaptionSizeChange(captionSize - 5)}
                  disabled={progress.running || captionSize <= SMART_CLIP_CAPTION_SIZE_MIN}
                ><Minus size={14} /></button>
                <input
                  type="range"
                  min={SMART_CLIP_CAPTION_SIZE_MIN}
                  max={SMART_CLIP_CAPTION_SIZE_MAX}
                  step={5}
                  value={captionSize}
                  onChange={(event) => onCaptionSizeChange(Number(event.target.value))}
                  disabled={progress.running}
                  aria-label="Smart Clip subtitle size"
                />
                <output>{captionSize}%</output>
                <button
                  type="button"
                  aria-label="Increase Smart Clip subtitle size"
                  onClick={() => onCaptionSizeChange(captionSize + 5)}
                  disabled={progress.running || captionSize >= SMART_CLIP_CAPTION_SIZE_MAX}
                ><Plus size={14} /></button>
              </div>
            </div>
            <p><strong>{selectedCaptionTemplate.label}</strong> · {selectedCaptionTemplate.description}{!autoCaptions ? " Enable Automatic subtitles to use this template on generated captions." : ""}</p>
          </section>

          <section className={styles.smartClipEnhancements} aria-label="Automatic Smart Clip enhancements">
            <header>
              <span><Sparkles size={15} /> Local AI enhancements</span>
              <small>Video frames and audio stay on this computer.</small>
            </header>
            <div className={styles.smartClipEnhancementGrid}>
              <label className={styles.smartClipEnhancementToggle}>
                <input type="checkbox" checked={autoCaptions} disabled={progress.running || !isDesktop} onChange={(event) => onAutoCaptionsChange(event.target.checked)} />
                <span><strong>Automatic subtitles</strong><small>Transcribe once, then place editable captions in every clip.</small></span>
              </label>
              <label className={styles.smartClipEnhancementField}>
                <span>Face framing</span>
                <select value={faceMode} disabled={progress.running || !isDesktop} onChange={(event) => onFaceModeChange(event.target.value as SmartClipFaceMode)}>
                  <option value="off">Off</option>
                  <option value="static">Primary face · static</option>
                  <option value="dynamic">Smooth face tracking</option>
                </select>
              </label>
              <label className={styles.smartClipEnhancementToggle}>
                <input type="checkbox" checked={speakerSelection} disabled={progress.running || !isDesktop || faceMode === "off"} onChange={(event) => onSpeakerSelectionChange(event.target.checked)} />
                <span><strong>Follow active speaker</strong><small>Prefer the face with matching mouth movement when several people appear.</small></span>
              </label>
              <div className={styles.smartClipCaptionOptions} aria-disabled={!autoCaptions}>
                <label>Language
                  <select value={subtitleLanguage} disabled={progress.running || !autoCaptions || !isDesktop} onChange={(event) => onSubtitleLanguageChange(event.target.value as "auto" | "Spanish" | "English")}>
                    <option value="auto">Auto detect</option>
                    <option value="Spanish">Spanish</option>
                    <option value="English">English</option>
                  </select>
                </label>
                <label>Accuracy
                  <select value={subtitleModel} disabled={progress.running || !autoCaptions || !isDesktop} onChange={(event) => onSubtitleModelChange(event.target.value as "tiny" | "base")}>
                    <option value="tiny">Fast</option>
                    <option value="base">Better</option>
                  </select>
                </label>
              </div>
              <label className={styles.smartClipEnhancementToggle}>
                <input type="checkbox" checked={fastExport} disabled={progress.running || !isDesktop} onChange={(event) => onFastExportChange(event.target.checked)} />
                <span><strong>Fast local export</strong><small>Uses the fast social-video preset and hardware acceleration when available.</small></span>
              </label>
              <div className={styles.smartClipTitleNotice}>
                <Type size={16} />
                <span><strong>Cut titles name the files only</strong><small>Pixores never places the cut title over the video. Automatic subtitles remain separate.</small></span>
              </div>
            </div>
          </section>

          {candidates.length > 0 && (
            <section className={styles.smartClipReview} aria-label="Local Smart Clip proposals">
              <header>
                <div>
                  <span><Sparkles size={15} /> Local proposals</span>
                  <strong>{selectedCandidateCount} of {candidates.length} selected</strong>
                </div>
                <div>
                  <button type="button" onClick={() => candidates.forEach((candidate) => onCandidateChange(candidate.id, { selected: true }))}>Select all</button>
                  <button type="button" onClick={() => candidates.forEach((candidate) => onCandidateChange(candidate.id, { selected: false }))}>Clear</button>
                </div>
              </header>
              <SmartClipCandidatePreview source={previewSource} candidate={activeCandidate} sourceOffset={previewOffset} platform={platform} />
              <div className={styles.smartClipCandidateGrid}>
                {candidates.map((candidate) => (
                  <article key={candidate.id} className={styles.smartClipCandidateCard} data-selected={candidate.selected}>
                    <header>
                      <label>
                        <input type="checkbox" checked={candidate.selected} onChange={(event) => onCandidateChange(candidate.id, { selected: event.target.checked })} />
                        <span>Clip {candidate.index + 1}</span>
                      </label>
                      <span>{Math.round(candidate.score)}% · {formatExportSeconds(candidate.duration)}</span>
                    </header>
                    <label className={styles.smartClipCandidateTitle}>
                      File title · not shown in video
                      <input
                        type="text"
                        maxLength={90}
                        value={candidate.title}
                        onChange={(event) => onCandidateChange(candidate.id, { title: event.target.value })}
                      />
                    </label>
                    <p>{candidate.transcript || "No transcript text was available for this fallback segment."}</p>
                    <footer>
                      <span>{candidate.reason}</span>
                      <button type="button" onClick={() => onActiveCandidateChange(candidate.id)} aria-pressed={activeCandidate?.id === candidate.id}>
                        <Play size={13} /> {activeCandidate?.id === candidate.id ? "In preview" : "Preview"}
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          )}

          <div className={styles.smartClipPlan}>
            <div><strong>{candidates.length || segments.length}</strong><span>{candidates.length ? "proposals" : "estimated files"}</span></div>
            <div><strong>{platform.aspectRatio}</strong><span>vertical</span></div>
            <div><strong>{platform.width}p</strong><span>width</span></div>
            <div><strong>{formatExportSeconds(projectDuration)}</strong><span>source</span></div>
            <p>{candidates.length ? `${selectedCandidateCount} reviewed proposal${selectedCandidateCount === 1 ? " is" : "s are"} ready for selective export.` : `${platform.description} Local analysis will find complete spoken moments instead of exporting every consecutive block.`}</p>
          </div>

          {(progress.running || progress.completed > 0 || progress.error) && (
            <div className={`${styles.smartClipProgress} ${progress.error ? styles.smartClipProgressError : ""}`}>
              <div><strong>{progress.error || progress.message}</strong><span>{progress.progress}%</span></div>
              <span className={styles.smartClipProgressTrack}><i style={{ width: `${progress.progress}%` }} /></span>
              {progress.running && <small>Clip {progress.currentClip} of {progress.total} · {progress.completed} completed</small>}
            </div>
          )}

          {!isDesktop && <p className={styles.smartClipDesktopNote}>Batch export uses the local renderer and is available in Pixores Video Maker Pro.</p>}
        </div>

        <footer className={styles.smartClipActions}>
          <button type="button" className={styles.smartClipSecondaryAction} onClick={progress.running ? onCancel : onClose} disabled={progress.cancelling}>
            {progress.running ? "Cancel Batch" : "Close"}
          </button>
          {candidates.length > 0 && <button type="button" className={styles.smartClipSecondaryAction} onClick={onAnalyze} disabled={!isDesktop || progress.running || sourceLoading}><Sparkles size={16} /> Analyze again</button>}
          {candidates.length > 0 ? (
            <button type="button" className={styles.smartClipPrimaryAction} onClick={onExport} disabled={!isDesktop || progress.running || sourceLoading || selectedCandidateCount === 0}>
              <Scissors size={17} /> Export {selectedCandidateCount} Selected
            </button>
          ) : (
            <button type="button" className={styles.smartClipPrimaryAction} onClick={onAnalyze} disabled={!isDesktop || progress.running || sourceLoading || !source || segments.length === 0}>
              <Sparkles size={17} /> Analyze Locally
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function CropZoomDialog({ open, layer, asset, onClose, onApply, onReset }: CropZoomDialogProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<CropDragState | null>(null);
  const [tab, setTab] = useState<"crop" | "panZoom">("crop");
  const [aspect, setAspect] = useState("free");
  const [draftCrop, setDraftCrop] = useState<NonNullable<VideoLayer["crop"]>>({ x: 0, y: 0, width: 100, height: 100, unit: "percent" });
  const [draftTransform, setDraftTransform] = useState<NonNullable<VideoLayer["transform"]>>({ scale: 1, x: 0, y: 0 });

  useEffect(() => {
    if (!open || !layer) return;
    const frameId = window.requestAnimationFrame(() => {
      setDraftCrop(layer.crop || { x: 0, y: 0, width: 100, height: 100, unit: "percent" });
      setDraftTransform(layer.transform || { scale: 1, x: 0, y: 0 });
      setAspect("free");
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [layer, open]);

  if (!open || !layer || !asset) return null;

  const updateCrop = (patch: Partial<NonNullable<VideoLayer["crop"]>>) => {
    setDraftCrop((current) => {
      const next = { ...current, ...patch, unit: "percent" as const };
      const x = clamp(next.x, 0, 99);
      const y = clamp(next.y, 0, 99);
      return {
        x,
        y,
        width: clamp(next.width, 1, 100 - x),
        height: clamp(next.height, 1, 100 - y),
        unit: "percent",
      };
    });
  };

  const applyAspect = (value: string) => {
    setAspect(value);
    if (value === "free") return;
    const [widthRatio, heightRatio] = value.split(":").map(Number);
    if (!widthRatio || !heightRatio) return;
    setDraftCrop((current) => {
      const ratio = widthRatio / heightRatio;
      const nextWidth = current.width;
      const nextHeight = Math.min(current.height, nextWidth / ratio);
      return {
        ...current,
        height: clamp(nextHeight, 1, 100 - current.y),
      };
    });
  };

  const updateCropFromPointer = (clientX: number, clientY: number) => {
    const drag = dragRef.current;
    const rect = previewRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const deltaX = ((clientX - drag.startX) / rect.width) * 100;
    const deltaY = ((clientY - drag.startY) / rect.height) * 100;
    const minSize = 5;
    let { x, y, width, height } = drag.initialCrop;

    if (drag.mode === "move") {
      updateCrop({
        x: clamp(x + deltaX, 0, 100 - width),
        y: clamp(y + deltaY, 0, 100 - height),
      });
      return;
    }

    if (drag.mode.includes("left") || drag.mode === "left") {
      const nextX = clamp(x + deltaX, 0, x + width - minSize);
      width += x - nextX;
      x = nextX;
    }
    if (drag.mode.includes("Right") || drag.mode === "right") width = clamp(width + deltaX, minSize, 100 - x);
    if (drag.mode.includes("top") || drag.mode === "top") {
      const nextY = clamp(y + deltaY, 0, y + height - minSize);
      height += y - nextY;
      y = nextY;
    }
    if (drag.mode.includes("Bottom") || drag.mode === "bottom") height = clamp(height + deltaY, minSize, 100 - y);
    updateCrop({ x, y, width, height });
  };

  const beginCropDrag = (event: ReactPointerEvent<HTMLElement>, mode: CropDragState["mode"]) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialCrop: draftCrop,
    };
  };

  const endCropDrag = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={styles.cropZoomDialog} role="dialog" aria-modal="true" aria-label="Crop and Zoom">
        <div className={styles.dialogHeader}>
          <div>
            <span>Crop & Zoom</span>
            <h2>{layer.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close Crop and Zoom">x</button>
        </div>

        <div className={styles.cropZoomTabs}>
          <button type="button" className={tab === "crop" ? styles.activeToggle : ""} onClick={() => setTab("crop")}>Crop</button>
          <button type="button" className={tab === "panZoom" ? styles.activeToggle : ""} onClick={() => setTab("panZoom")}>Pan & Zoom</button>
        </div>

        <div className={styles.cropZoomBody}>
          <div ref={previewRef} className={styles.cropPreview}>
            {asset.kind === "image" ? (
              <img src={asset.url} alt="" />
            ) : (
              <video src={asset.url} muted playsInline preload="metadata" />
            )}
            <div
              className={styles.cropBox}
              style={{
                left: `${draftCrop.x}%`,
                top: `${draftCrop.y}%`,
                width: `${draftCrop.width}%`,
                height: `${draftCrop.height}%`,
              }}
              onPointerDown={(event) => beginCropDrag(event, "move")}
              onPointerMove={(event) => updateCropFromPointer(event.clientX, event.clientY)}
              onPointerUp={endCropDrag}
              onPointerCancel={endCropDrag}
            >
              {(["topLeft", "top", "topRight", "left", "right", "bottomLeft", "bottom", "bottomRight"] as const).map((handle) => (
                <span
                  key={handle}
                  className={`${styles.cropHandle} ${styles[`cropHandle_${handle}`]}`}
                  onPointerDown={(event) => beginCropDrag(event, handle)}
                  onPointerMove={(event) => updateCropFromPointer(event.clientX, event.clientY)}
                  onPointerUp={endCropDrag}
                  onPointerCancel={endCropDrag}
                />
              ))}
            </div>
          </div>

          <div className={styles.cropControls}>
            <label className={styles.dialogField}>
              Ratio
              <select value={aspect} onChange={(event) => applyAspect(event.target.value)}>
                <option value="free">Custom</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
                <option value="4:3">4:3</option>
              </select>
            </label>
            <div className={styles.dialogInlineFields}>
              <label className={styles.dialogField}>X<input type="number" value={draftCrop.x} onChange={(event) => updateCrop({ x: Number(event.target.value) })} /></label>
              <label className={styles.dialogField}>Y<input type="number" value={draftCrop.y} onChange={(event) => updateCrop({ y: Number(event.target.value) })} /></label>
              <label className={styles.dialogField}>Width<input type="number" value={draftCrop.width} onChange={(event) => updateCrop({ width: Number(event.target.value) })} /></label>
              <label className={styles.dialogField}>Height<input type="number" value={draftCrop.height} onChange={(event) => updateCrop({ height: Number(event.target.value) })} /></label>
            </div>
            <label className={styles.dialogField}>
              Zoom
              <input type="number" min="0.1" max="6" step="0.1" value={draftTransform.scale} onChange={(event) => setDraftTransform((current) => ({ ...current, scale: clamp(Number(event.target.value), 0.1, 6) }))} />
            </label>
            <div className={styles.dialogInlineFields}>
              <label className={styles.dialogField}>Pan X<input type="number" value={draftTransform.x} onChange={(event) => setDraftTransform((current) => ({ ...current, x: Number(event.target.value) }))} /></label>
              <label className={styles.dialogField}>Pan Y<input type="number" value={draftTransform.y} onChange={(event) => setDraftTransform((current) => ({ ...current, y: Number(event.target.value) }))} /></label>
            </div>
            {tab === "panZoom" && <p className={styles.settingNote}>Pan & Zoom keyframes are prepared for the next phase.</p>}
          </div>
        </div>

        <div className={styles.dialogActions}>
          <button type="button" onClick={() => onReset(layer.id)}>Reset</button>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" className={styles.dialogPrimaryAction} onClick={() => onApply(layer.id, { crop: draftCrop, transform: draftTransform })}>Apply</button>
        </div>
      </section>
    </div>
  );
}

const RESOLUTION_PRESETS = [
  { label: "Project", width: 0, height: 0 },
  { label: "4K UHD", width: 3840, height: 2160 },
  { label: "1440p", width: 2560, height: 1440 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "720p", width: 1280, height: 720 },
  { label: "Vertical 1080x1920", width: 1080, height: 1920 },
  { label: "Square 1080", width: 1080, height: 1080 },
  { label: "Custom", width: -1, height: -1 },
];

function ExportVideoDialog({
  open,
  settings,
  duration,
  projectWidth,
  projectHeight,
  isDesktop,
  serverRenderAvailable,
  browserExportDirectoryName,
  onChange,
  onChooseDestination,
  onClose,
  onExport,
}: ExportVideoDialogProps) {
  if (!open) return null;

  const update = (patch: Partial<PixoresExportSettings>) => onChange({ ...settings, ...patch });
  const formatOptions: Array<{ label: string; value: PixoresExportSettings["format"] }> = isDesktop || serverRenderAvailable
    ? [{ label: "MP4", value: "mp4" }, { label: "WebM", value: "webm" }, { label: "MOV", value: "mov" }]
    : [{ label: "MP4 / browser", value: "mp4" }, { label: "WebM", value: "webm" }];
  const codecOptions = settings.format === "webm"
    ? [{ label: "VP9", value: "vp9" }, { label: "AV1", value: "av1" }]
    : settings.format === "mov"
      ? [{ label: "ProRes", value: "prores" }]
      : [{ label: "H.264", value: "h264" }, { label: "H.265", value: "h265" }];
  const matchedPreset = RESOLUTION_PRESETS.find((preset) => preset.width === settings.width && preset.height === settings.height);
  const resolutionValue = matchedPreset ? `${matchedPreset.width}x${matchedPreset.height}` : "custom";
  const qualityPreset = normalizeExportQualityPreset(settings.qualityPreset);
  const selectedCrf = qualityPreset === "custom"
    ? settings.crf ?? 22
    : undefined;
  const sizeRange = estimateExportBytesRange(settings, duration);
  const presetDescription = qualityPreset === "custom"
    ? "Manual quality and speed control."
    : EXPORT_QUALITY_PRESETS[qualityPreset].description;

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={styles.exportDialog} role="dialog" aria-modal="true" aria-label="Export video">
        <div className={styles.dialogHeader}>
          <div>
            <span>Export</span>
            <h2>Video settings</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close export settings">x</button>
        </div>

        <div className={styles.exportDialogGrid}>
          <label className={styles.dialogField}>
            File name
            <input
              value={settings.fileName}
              onChange={(event) => update({ fileName: event.target.value })}
              placeholder="pixores-video.mp4"
            />
          </label>

          <label className={styles.dialogField}>
            Destination
            <input
              value={isDesktop
                ? settings.outputDirectory || "Device Downloads (default)"
                : browserExportDirectoryName || "Browser Downloads (default)"}
              disabled
              readOnly
            />
            <button type="button" onClick={onChooseDestination}><FolderOpen size={15} /> Choose Folder</button>
          </label>

          <label className={styles.dialogField}>
            Render method
            <select value={settings.renderMethod} onChange={(event) => update({ renderMethod: event.target.value as PixoresExportSettings["renderMethod"] })}>
              {isDesktop && <option value="local">Local render — Recommended</option>}
              {!isDesktop && serverRenderAvailable && <option value="server">Offline server render — Recommended</option>}
              <option value="browser">Fast browser export — Real time</option>
            </select>
          </label>

          <label className={styles.dialogField}>
            Format
            <select
              value={settings.format}
              onChange={(event) => {
                const format = event.target.value as PixoresExportSettings["format"];
                update({
                  format,
                  codec: format === "webm" ? "vp9" : format === "mov" ? "prores" : "h264",
                  audioCodec: format === "webm" ? "opus" : "aac",
                });
              }}
            >
              {formatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className={styles.dialogField}>
            Codec
            <select value={settings.codec} onChange={(event) => update({ codec: event.target.value as PixoresExportSettings["codec"] })}>
              {codecOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className={styles.dialogField}>
            Resolution
            <select
              value={resolutionValue}
              onChange={(event) => {
                if (event.target.value === "custom") return;
                const [width, height] = event.target.value.split("x").map(Number);
                update({
                  width: width || projectWidth,
                  height: height || projectHeight,
                });
              }}
            >
              {RESOLUTION_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.width < 0 ? "custom" : `${preset.width}x${preset.height}`}>
                  {preset.label}{preset.width > 0 ? ` (${preset.width}x${preset.height})` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.dialogInlineFields}>
            <label className={styles.dialogField}>
              Width
              <input type="number" min="160" max="7680" value={settings.width} onChange={(event) => update({ width: clamp(Number(event.target.value), 160, 7680) })} />
            </label>
            <label className={styles.dialogField}>
              Height
              <input type="number" min="160" max="7680" value={settings.height} onChange={(event) => update({ height: clamp(Number(event.target.value), 160, 7680) })} />
            </label>
          </div>

          <label className={styles.dialogField}>
            FPS
            <select value={settings.fps} onChange={(event) => update({ fps: Number(event.target.value) })}>
              {[24, 25, 30, 48, 50, 60].map((fps) => <option key={fps} value={fps}>{fps}</option>)}
            </select>
          </label>

          <label className={styles.dialogField}>
            Quality
            <select
              value={qualityPreset}
              onChange={(event) => onChange(applyExportQualityPreset(settings, event.target.value as PixoresExportSettings["qualityPreset"]))}
            >
              <option value="fast">Fast — For tests</option>
              <option value="recommended">Recommended — Balanced</option>
              <option value="high">High quality — More detail</option>
              <option value="maximum">Maximum quality — Large file</option>
              <option value="custom">Custom</option>
            </select>
            <small>{presetDescription}</small>
          </label>

          {qualityPreset === "custom" && (
            <label className={styles.dialogField}>
              CRF
              <input type="number" min="10" max="35" value={selectedCrf} onChange={(event) => update({ crf: clamp(Number(event.target.value), 10, 35) })} />
            </label>
          )}

          {qualityPreset === "custom" && (
            <label className={styles.dialogField}>
              Encoding preset
              <select value={settings.encoderPreset || "medium"} onChange={(event) => update({ encoderPreset: event.target.value as PixoresExportSettings["encoderPreset"] })}>
                <option value="ultrafast">Ultrafast</option>
                <option value="fast">Fast</option>
                <option value="medium">Medium</option>
                <option value="slow">Slow</option>
              </select>
            </label>
          )}

          <label className={styles.dialogField}>
            Acceleration
            <select value={settings.acceleration} onChange={(event) => update({ acceleration: event.target.value as PixoresExportSettings["acceleration"] })}>
              <option value="auto">Automatic — Recommended</option>
              <option value="hardware">Hardware — Required</option>
              <option value="software">CPU — Maximum compatibility</option>
            </select>
          </label>

          <label className={styles.dialogField}>
            Audio AAC
            <select value={settings.audioBitrateKbps || 192} onChange={(event) => update({ audioBitrateKbps: Number(event.target.value) })}>
              <option value="128">128 kbps</option>
              <option value="192">192 kbps</option>
              <option value="256">256 kbps</option>
            </select>
          </label>

          <label className={styles.dialogToggle}>
            <input type="checkbox" checked={settings.includeAudio} onChange={(event) => update({ includeAudio: event.target.checked })} />
            Include audio
          </label>

          <div className={styles.exportSummary}>
            <strong>{settings.width} x {settings.height}</strong>
            <span>{settings.fps} FPS · {settings.codec.toUpperCase()} · CRF {settings.crf ?? 22} · AAC {settings.audioBitrateKbps || 192} kbps</span>
            <span>{settings.acceleration === "auto" ? "Automatic acceleration" : settings.acceleration === "hardware" ? "Hardware acceleration" : "CPU"} · yuv420p</span>
            <span>Duration: {formatTimelineClock(duration)} · Estimated size: {formatBytes(sizeRange.minimum)}–{formatBytes(sizeRange.maximum)}</span>
            <span>Actual file size depends on visual complexity.</span>
            <span>{settings.renderMethod === "browser" ? "This method processes in real time." : "This method renders in the background. Video and audio preview are paused during export."}</span>
          </div>
        </div>

        <div className={styles.dialogActions}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" className={styles.dialogPrimaryAction} onClick={() => onExport(settings)}>
            <Download size={17} />
            Export Video
          </button>
        </div>
      </section>
    </div>
  );
}

type YouTubePublishDialogProps = {
  open: boolean;
  defaultVideoPath: string;
  defaultTitle: string;
  onClose: () => void;
};

const YOUTUBE_CATEGORIES = [
  ["1", "Film & Animation"], ["2", "Autos & Vehicles"], ["10", "Music"],
  ["15", "Pets & Animals"], ["17", "Sports"], ["20", "Gaming"],
  ["22", "People & Blogs"], ["23", "Comedy"], ["24", "Entertainment"],
  ["26", "Howto & Style"], ["27", "Education"], ["28", "Science & Technology"],
] as const;

function YouTubePublishDialog({ open, defaultVideoPath, defaultTitle, onClose }: YouTubePublishDialogProps) {
  const [account, setAccount] = useState<PixoresYouTubeStatus | null>(null);
  const [clientId, setClientId] = useState("");
  const [videoPath, setVideoPath] = useState(defaultVideoPath);
  const [title, setTitle] = useState(defaultTitle || "Untitled video");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [categoryId, setCategoryId] = useState("22");
  const [privacyStatus, setPrivacyStatus] = useState<"private" | "unlisted" | "public">("private");
  const [madeForKids, setMadeForKids] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<PixoresYouTubePublishProgress | null>(null);
  const [publishedUrl, setPublishedUrl] = useState("");
  const activeJobId = useRef("");

  useEffect(() => {
    if (!open) return;
    const bridge = getPixoresDesktopBridge();
    void bridge?.getYouTubeStatus?.().then((status) => {
      setAccount(status);
      if (status.configured && status.clientId !== "Managed by Pixores") setClientId(status.clientId);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "YouTube configuration could not be loaded."));
  }, [defaultTitle, defaultVideoPath, open]);

  useEffect(() => getPixoresDesktopBridge()?.onYouTubeProgress?.((nextProgress) => {
    if (nextProgress.jobId !== activeJobId.current) return;
    setProgress(nextProgress);
    if (nextProgress.url) setPublishedUrl(nextProgress.url);
  }), []);

  if (!open) return null;

  const bridge = getPixoresDesktopBridge();
  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try { await action(); } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The YouTube operation failed.");
    } finally { setBusy(false); }
  };

  const configure = () => runAction(async () => {
    if (!bridge?.configureYouTube) throw new Error("YouTube publishing is unavailable in this Pixores build.");
    const status = await bridge.configureYouTube({ clientId });
    setAccount(status);
  });

  const connect = () => runAction(async () => {
    if (!bridge?.connectYouTube) throw new Error("YouTube publishing is unavailable in this Pixores build.");
    await bridge.connectYouTube({ clientId: clientId || undefined });
    const status = await bridge.getYouTubeStatus?.();
    if (status) setAccount(status);
  });

  const disconnect = () => runAction(async () => {
    const status = await bridge?.disconnectYouTube?.();
    if (status) setAccount(status);
  });

  const chooseVideo = () => runAction(async () => {
    const result = await bridge?.chooseYouTubeVideo?.();
    if (result && !result.canceled) setVideoPath(result.filePath);
  });

  const publish = () => runAction(async () => {
    if (!bridge?.publishYouTube) throw new Error("YouTube publishing is unavailable in this Pixores build.");
    if (!account?.connected) throw new Error("Connect a YouTube account first.");
    if (!videoPath) throw new Error("Render a video or choose an existing video file.");
    if (!title.trim()) throw new Error("Enter a video title.");
    const jobId = globalThis.crypto?.randomUUID?.() || `youtube-${Date.now()}`;
    activeJobId.current = jobId;
    setPublishedUrl("");
    setProgress({ jobId, stage: "starting", progress: 0, message: "Preparing YouTube upload..." });
    const result = await bridge.publishYouTube({
      jobId,
      videoPath,
      title: title.trim(),
      description,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      categoryId,
      privacyStatus,
      madeForKids,
      mimeType: "video/mp4",
      thumbnail: thumbnail ? { bytes: await thumbnail.arrayBuffer(), mimeType: thumbnail.type || "image/jpeg", name: thumbnail.name } : undefined,
    });
    setPublishedUrl(result.url);
  });

  const cancel = async () => {
    if (!activeJobId.current) return;
    await bridge?.cancelYouTube?.(activeJobId.current);
  };

  return (
    <div className={styles.modalBackdrop} onPointerDown={() => { if (!busy) onClose(); }}>
      <section className={styles.youtubeDialog} role="dialog" aria-modal="true" aria-labelledby="youtube-publish-title" onPointerDown={(event) => event.stopPropagation()}>
        <header className={styles.dialogHeader}>
          <div><span className={styles.dialogEyebrow}>DIRECT PUBLISHING</span><h2 id="youtube-publish-title">Publish to YouTube</h2></div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close YouTube publishing"><X size={18} /></button>
        </header>

        <div className={styles.youtubeDialogBody}>
          <section className={styles.youtubeAccountCard} data-connected={account?.connected ? "true" : "false"}>
            <div><strong>{account?.connected ? "YouTube connected" : "Connect a YouTube account"}</strong><span>OAuth uses only the youtube.upload permission. Pixores never receives your Google password.</span></div>
            {account?.connected
              ? <button type="button" onClick={disconnect} disabled={busy}>Disconnect</button>
              : <button type="button" className={styles.dialogPrimaryAction} onClick={connect} disabled={busy || !account?.configured}>Connect YouTube</button>}
          </section>

          {!account?.configured && (
            <section className={styles.youtubeSetupCard}>
              <strong>One-time Google Cloud setup</strong>
              <span>Create an OAuth 2.0 Client ID of type Desktop app and paste it here.</span>
              <div><input value={clientId} onChange={(event) => setClientId(event.target.value)} placeholder="000000000000-xxxx.apps.googleusercontent.com" /><button type="button" onClick={configure} disabled={busy || !clientId.trim()}>Save Client ID</button></div>
            </section>
          )}

          <div className={styles.youtubeVideoPicker}>
            <div><span>Video file</span><strong title={videoPath}>{videoPath || "No rendered video selected"}</strong></div>
            <button type="button" onClick={chooseVideo} disabled={busy}><FolderOpen size={16} /> Choose video</button>
          </div>

          <div className={styles.youtubeFormGrid}>
            <label className={styles.youtubeFullField}>Title <input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className={styles.youtubeFullField}>Description <textarea value={description} maxLength={5000} rows={4} onChange={(event) => setDescription(event.target.value)} /></label>
            <label className={styles.youtubeFullField}>Tags <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="pixores, tutorial, video" /><small>Separate tags with commas.</small></label>
            <label>Category <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{YOUTUBE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Privacy <select value={privacyStatus} onChange={(event) => setPrivacyStatus(event.target.value as typeof privacyStatus)}><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></select></label>
            <label className={styles.youtubeFullField}>Custom thumbnail <input type="file" accept="image/jpeg,image/png" onChange={(event) => setThumbnail(event.target.files?.[0] || null)} /><small>JPG or PNG. Your channel must support custom thumbnails.</small></label>
            <label className={`${styles.dialogToggle} ${styles.youtubeFullField}`}><input type="checkbox" checked={madeForKids} onChange={(event) => setMadeForKids(event.target.checked)} /> This video is made for kids</label>
          </div>

          <div className={styles.youtubeAuditNotice}>Google restricts uploads from new, unaudited API projects to Private, even if another privacy option is selected.</div>
          {error && <div className={styles.youtubeError}>{error}</div>}
          {progress && <div className={styles.youtubeProgress}><div><strong>{progress.message}</strong><span>{Math.round(progress.progress)}%</span></div><progress max="100" value={progress.progress} /></div>}
          {publishedUrl && <div className={styles.youtubeSuccess}><strong>Published and processed successfully.</strong><button type="button" onClick={() => void bridge?.openExternalUrl?.(publishedUrl)}>Open on YouTube</button></div>}
        </div>

        <div className={styles.dialogActions}>
          {busy && progress && progress.stage !== "completed" ? <button type="button" onClick={() => void cancel()}>Cancel upload</button> : <button type="button" onClick={onClose}>Close</button>}
          <button type="button" className={styles.dialogPrimaryAction} onClick={publish} disabled={busy || !account?.connected || !videoPath || !title.trim()}>{busy ? "Publishing..." : "Publish to YouTube"}</button>
        </div>
      </section>
    </div>
  );
}

type RenderProgressDialogProps = {
  progress: RenderProgressState;
  onCancel: () => void;
  onClose: () => void;
  onPublishYouTube: () => void;
};

function formatExportSeconds(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return "--";
  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remaining = totalSeconds % 60;
  return hours > 0
    ? [hours, minutes, remaining].map((value, index) => index === 0 ? String(value) : String(value).padStart(2, "0")).join(":")
    : [minutes, remaining].map((value, index) => index === 0 ? String(value) : String(value).padStart(2, "0")).join(":");
}

function RenderProgressDialog({ progress, onCancel, onClose, onPublishYouTube }: RenderProgressDialogProps) {
  if (!progress.open) return null;

  const isActive = !["completed", "cancelled", "failed"].includes(progress.status);
  const statusLabel: Record<RenderProgressState["status"], string> = {
    idle: "Waiting",
    queued: "Preparing project",
    analyzing: "Checking assets",
    preparing: "Preparing project",
    bundling: "Preparing composition",
    rendering: "Rendering frames",
    encoding: "Encoding video",
    muxing: "Mixing audio",
    finalizing: "Finalizing file",
    completed: "Saved automatically",
    cancelled: "Cancelled",
    failed: "Error",
  };
  const currentStatusLabel = progress.segmentedRender && progress.currentSegment > 0 && (progress.status === "preparing" || progress.status === "rendering")
    ? `${progress.segmentType === "nvidia" ? "NVIDIA" : "Full compositor"} segment ${progress.currentSegment} / ${progress.segmentCount}`
    : progress.status === "preparing" && progress.hybridPrecomposing
    ? "Precomposing base with NVIDIA GPU"
    : progress.status === "preparing" && progress.proxyTotal > 0
      ? "Preparing GPU media"
      : statusLabel[progress.status];

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={styles.progressDialog} role="dialog" aria-modal="true" aria-label="Export progress">
        <div className={styles.dialogHeader}>
          <div>
            <span>{currentStatusLabel}</span>
            <h2>{progress.status === "completed" ? "Export saved" : progress.status === "cancelled" ? "Export cancelled" : progress.status === "failed" ? "Export failed" : "Rendering video"}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={isActive} aria-label="Close export progress">x</button>
        </div>

        <div className={styles.progressPercent}>{Math.round(progress.progress)}%</div>
        <div className={styles.progressTrack} aria-label="Export progress">
          <span style={{ width: `${clamp(progress.progress, 0, 100)}%` }} />
        </div>

        <dl className={styles.progressDetails}>
          <div><dt>File</dt><dd>{progress.fileName || "pixores-video.mp4"}</dd></div>
          <div><dt>Elapsed</dt><dd>{formatExportSeconds(progress.elapsedSeconds)}</dd></div>
          <div><dt>ETA</dt><dd>{formatExportSeconds(progress.etaSeconds)}</dd></div>
          <div><dt>Frames</dt><dd>{progress.renderedFrames} / {progress.totalFrames || "--"}</dd></div>
          {progress.proxyTotal > 0 && progress.status === "preparing" && (
            <div><dt>GPU proxies</dt><dd>{progress.proxyPrepared} / {progress.proxyTotal}</dd></div>
          )}
          {progress.hybridRender && progress.hybridTotalFrames > 0 && (
            <div><dt>Hybrid base</dt><dd>{progress.hybridRenderedFrames} / {progress.hybridTotalFrames}</dd></div>
          )}
          {progress.segmentedRender && progress.segmentCount > 0 && (
            <div><dt>Hybrid segments</dt><dd>{progress.currentSegment} / {progress.segmentCount}</dd></div>
          )}
          <div><dt>Render FPS</dt><dd>{progress.renderFps > 0 ? progress.renderFps.toFixed(1) : "--"}</dd></div>
          <div><dt>Speed</dt><dd>{progress.speed > 0 ? `${progress.speed.toFixed(2)}x` : "--"}</dd></div>
          <div><dt>Resolution</dt><dd>{progress.resolution}</dd></div>
          <div><dt>Codec</dt><dd>{progress.codec}</dd></div>
          <div><dt>Method</dt><dd>{progress.method}</dd></div>
          {progress.outputPath && <div><dt>Output</dt><dd>{progress.outputPath}</dd></div>}
        </dl>

        {progress.error && <p className={styles.progressError}>{progress.error}</p>}
        {progress.warnings.length > 0 && (
          <div className={styles.progressWarnings}>
            {progress.warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        )}

        <div className={styles.dialogActions}>
          {isActive ? (
            <button type="button" onClick={onCancel}>Cancel Export</button>
          ) : (
            <>
              <button type="button" onClick={onClose}>Close</button>
              {progress.status === "completed" && progress.outputPath && <button type="button" className={styles.dialogPrimaryAction} onClick={onPublishYouTube}>Publish to YouTube</button>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
