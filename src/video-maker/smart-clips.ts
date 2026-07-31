import type { PixoresVideoLayer, PixoresVideoProject } from "@/src/video-render/types";
import { getProfessionalCaptionLayout, isAiCaptionLayer } from "./caption-layout";

export type SmartClipPlatformId = "instagram-reels" | "youtube-shorts" | "tiktok";

export type SmartClipPlatform = {
  id: SmartClipPlatformId;
  label: string;
  shortLabel: string;
  description: string;
  width: 1080;
  height: 1920;
  aspectRatio: "9:16";
  defaultDuration: number;
  maxDuration: number;
  fileSuffix: string;
  accent: string;
};

export type SmartClipSegment = {
  id: string;
  index: number;
  start: number;
  end: number;
  duration: number;
};

export class SmartClipExportCoordinator {
  private activeSessionId = "";
  private cancelRequested = false;
  private readonly renderIds = new Set<string>();

  tryStart(sessionId: string) {
    if (this.activeSessionId) return false;
    this.activeSessionId = sessionId;
    this.cancelRequested = false;
    this.renderIds.clear();
    return true;
  }

  isCurrent(sessionId: string) {
    return Boolean(sessionId) && this.activeSessionId === sessionId;
  }

  shouldCancel(sessionId: string) {
    return this.isCurrent(sessionId) && this.cancelRequested;
  }

  registerRender(sessionId: string, renderId: string) {
    if (this.isCurrent(sessionId) && renderId) this.renderIds.add(renderId);
  }

  unregisterRender(sessionId: string, renderId: string) {
    if (this.isCurrent(sessionId)) this.renderIds.delete(renderId);
  }

  requestCancel() {
    if (!this.activeSessionId) return [];
    this.cancelRequested = true;
    return [...this.renderIds];
  }

  finish(sessionId: string) {
    if (!this.isCurrent(sessionId)) return false;
    this.activeSessionId = "";
    this.cancelRequested = false;
    this.renderIds.clear();
    return true;
  }
}

export const SMART_CLIP_DURATIONS = [15, 30, 60, 90, 180] as const;

export const SMART_CLIP_PLATFORMS: SmartClipPlatform[] = [
  {
    id: "instagram-reels",
    label: "Instagram Reels",
    shortLabel: "Reels",
    description: "Vertical discovery-ready clips up to 3 minutes.",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    defaultDuration: 60,
    maxDuration: 180,
    fileSuffix: "instagram-reel",
    accent: "#ff4f81",
  },
  {
    id: "youtube-shorts",
    label: "YouTube Shorts",
    shortLabel: "Shorts",
    description: "Square or vertical Shorts can be up to 3 minutes.",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    defaultDuration: 60,
    maxDuration: 180,
    fileSuffix: "youtube-short",
    accent: "#ff3838",
  },
  {
    id: "tiktok",
    label: "TikTok",
    shortLabel: "TikTok",
    description: "Fast vertical clips optimized for mobile viewing.",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    defaultDuration: 60,
    maxDuration: 180,
    fileSuffix: "tiktok",
    accent: "#22d3c5",
  },
];

export function getSmartClipPlatform(platformId: SmartClipPlatformId) {
  return SMART_CLIP_PLATFORMS.find((platform) => platform.id === platformId) || SMART_CLIP_PLATFORMS[0];
}

export function createSmartClipSegments(projectDuration: number, requestedDuration: number): SmartClipSegment[] {
  const duration = Math.max(0, Number(projectDuration) || 0);
  if (duration <= 0) return [];

  const segmentDuration = Math.max(1, Number(requestedDuration) || 60);
  const segmentCount = Math.max(1, Math.ceil(duration / segmentDuration));
  return Array.from({ length: segmentCount }, (_, index) => {
    const start = Number((index * segmentDuration).toFixed(3));
    const end = Number(Math.min(duration, start + segmentDuration).toFixed(3));
    return {
      id: `smart-clip-${index + 1}-${start}-${end}`,
      index,
      start,
      end,
      duration: Math.max(0.05, Number((end - start).toFixed(3))),
    };
  });
}

function getSourceStart(layer: PixoresVideoLayer) {
  return Math.max(0, layer.sourceStart ?? layer.trimStart ?? 0);
}

function adaptLayerToVerticalCanvas(
  layer: PixoresVideoLayer,
  sourceWidth: number,
  targetWidth: number,
  targetHeight: number,
): PixoresVideoLayer {
  if (layer.type === "audio" || layer.type === "transition") return layer;

  if (isAiCaptionLayer(layer)) {
    const caption = getProfessionalCaptionLayout(targetWidth, targetHeight);
    return {
      ...layer,
      ...caption,
      textAlign: "center",
      hasTextBg: true,
      textBgColor: layer.textBgColor || "#000000",
      isBold: true,
    };
  }

  const fullCanvasMedia = layer.type === "media"
    && (layer.mediaKind === "video" || layer.mediaKind === "image")
    && layer.width >= 72
    && layer.height >= 72;

  if (fullCanvasMedia) {
    return {
      ...layer,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      objectFit: "cover",
    };
  }

  // Editor geometry is stored in canvas percentages, so x/y/width/height are
  // already resolution-independent. Only pixel-based visual styling scales.
  const scale = targetWidth / Math.max(1, sourceWidth);

  return {
    ...layer,
    fontSize: layer.fontSize === undefined ? undefined : Number(Math.max(1, layer.fontSize * scale).toFixed(3)),
    strokeWidth: layer.strokeWidth === undefined ? undefined : Number(Math.max(0, layer.strokeWidth * scale).toFixed(3)),
    shadowBlur: layer.shadowBlur === undefined ? undefined : Number(Math.max(0, layer.shadowBlur * scale).toFixed(3)),
    shadowOffsetX: layer.shadowOffsetX === undefined ? undefined : Number((layer.shadowOffsetX * scale).toFixed(3)),
    shadowOffsetY: layer.shadowOffsetY === undefined ? undefined : Number((layer.shadowOffsetY * scale).toFixed(3)),
  };
}

function sliceLayer(layer: PixoresVideoLayer, segment: SmartClipSegment): PixoresVideoLayer | null {
  const layerEnd = layer.start + layer.duration;
  const overlapStart = Math.max(layer.start, segment.start);
  const overlapEnd = Math.min(layerEnd, segment.end);
  if (overlapEnd <= overlapStart) return null;

  const clippedFromStart = Math.max(0, overlapStart - layer.start);
  const duration = Math.max(0.05, Number((overlapEnd - overlapStart).toFixed(3)));
  if (layer.type !== "media" && layer.type !== "audio") {
    return {
      ...layer,
      start: Number((overlapStart - segment.start).toFixed(3)),
      duration,
    };
  }

  const sourceStart = Number((getSourceStart(layer) + clippedFromStart).toFixed(3));
  const sourceEnd = Number((sourceStart + duration).toFixed(3));
  return {
    ...layer,
    start: Number((overlapStart - segment.start).toFixed(3)),
    duration,
    sourceStart,
    trimStart: sourceStart,
    sourceEnd,
    trimEnd: sourceEnd,
  };
}

export function createSmartClipProject(
  project: PixoresVideoProject,
  segment: SmartClipSegment,
  platform: SmartClipPlatform,
): PixoresVideoProject {
  const slicedLayers = project.layers
    .map((layer) => sliceLayer(layer, segment))
    .filter((layer): layer is PixoresVideoLayer => Boolean(layer));
  const includedLayerIds = new Set(slicedLayers.map((layer) => layer.id));
  const layers = slicedLayers
    .filter((layer) => layer.type !== "transition" || (
      (!layer.fromLayerId || includedLayerIds.has(layer.fromLayerId))
      && (!layer.toLayerId || includedLayerIds.has(layer.toLayerId))
    ))
    .map((layer) => adaptLayerToVerticalCanvas(
      layer,
      project.canvas.width,
      platform.width,
      platform.height,
    ));
  const transitionIds = new Set(layers.filter((layer) => layer.type === "transition").map((layer) => layer.id));
  const now = new Date().toISOString();

  return {
    ...project,
    canvas: { width: platform.width, height: platform.height },
    duration: segment.duration,
    layers,
    transitions: project.transitions
      .filter((transition) => transitionIds.has(transition.id))
      .map((transition) => ({
        ...transition,
        start: Math.max(0, Number((transition.start - segment.start).toFixed(3))),
      })),
    format: {
      id: platform.id,
      label: `${platform.label} ${platform.aspectRatio}`,
      width: platform.width,
      height: platform.height,
    },
    updatedAt: now,
  };
}
