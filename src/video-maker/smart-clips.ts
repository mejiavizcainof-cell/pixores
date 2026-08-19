import type { PixoresMediaMetadata, PixoresVideoLayer, PixoresVideoProject } from "@/src/video-render/types";
import { isAiCaptionLayer } from "./caption-layout";
import { sliceSmartReframe } from "./smart-reframe";

export type SmartClipPlatformId =
  | "instagram-reels"
  | "instagram-feed"
  | "facebook-reels"
  | "facebook-feed"
  | "youtube-shorts"
  | "tiktok"
  | "custom";

export type SmartClipPlatform = {
  id: SmartClipPlatformId;
  label: string;
  shortLabel: string;
  description: string;
  width: number;
  height: number;
  aspectRatio: string;
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

export type SmartClipTranscriptCue = {
  start: number;
  end: number;
  text: string;
};

export type SmartClipCandidate = SmartClipSegment & {
  title: string;
  transcript: string;
  score: number;
  reason: string;
  selected: boolean;
};

export type SmartClipCandidateOptions = {
  maxCandidates?: number;
  minimumDuration?: number;
};

export type SmartClipSource = {
  id: string;
  name: string;
  url: string;
  persistentUrl?: string;
  duration: number;
  width?: number;
  height?: number;
  metadata?: PixoresMediaMetadata;
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
    id: "instagram-feed",
    label: "Instagram Feed",
    shortLabel: "Instagram",
    description: "Portrait posts sized for maximum Instagram feed space.",
    width: 1080,
    height: 1350,
    aspectRatio: "4:5",
    defaultDuration: 60,
    maxDuration: 180,
    fileSuffix: "instagram-feed",
    accent: "#c13584",
  },
  {
    id: "facebook-reels",
    label: "Facebook Reels",
    shortLabel: "Facebook Reel",
    description: "Full-screen vertical clips for Facebook Reels.",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    defaultDuration: 60,
    maxDuration: 180,
    fileSuffix: "facebook-reel",
    accent: "#1877f2",
  },
  {
    id: "facebook-feed",
    label: "Facebook Feed",
    shortLabel: "Facebook",
    description: "Portrait video optimized for the Facebook feed.",
    width: 1080,
    height: 1350,
    aspectRatio: "4:5",
    defaultDuration: 60,
    maxDuration: 180,
    fileSuffix: "facebook-feed",
    accent: "#4267b2",
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
  {
    id: "custom",
    label: "Custom size",
    shortLabel: "Custom",
    description: "Use an exact width and height for any social platform.",
    width: 1080,
    height: 1920,
    aspectRatio: "Custom",
    defaultDuration: 60,
    maxDuration: 180,
    fileSuffix: "custom-clip",
    accent: "#8b5cf6",
  },
];

export function getSmartClipPlatform(
  platformId: SmartClipPlatformId,
  customSize?: { width: number; height: number },
) {
  const platform = SMART_CLIP_PLATFORMS.find((item) => item.id === platformId) || SMART_CLIP_PLATFORMS[0];
  if (platform.id !== "custom" || !customSize) return platform;
  const width = Math.round(Math.min(7680, Math.max(320, Number(customSize.width) || platform.width)));
  const height = Math.round(Math.min(7680, Math.max(320, Number(customSize.height) || platform.height)));
  return {
    ...platform,
    width,
    height,
    aspectRatio: `${width}:${height}`,
  };
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

export function createSmartClipSourceProject(source: SmartClipSource): PixoresVideoProject {
  const duration = Math.max(0.05, Number(source.duration) || 0.05);
  const width = Math.max(2, Math.round(Number(source.width || source.metadata?.width) || 1920));
  const height = Math.max(2, Math.round(Number(source.height || source.metadata?.height) || 1080));
  const sourceUrl = source.persistentUrl || source.url;
  const now = new Date().toISOString();

  return {
    schemaVersion: 1,
    canvas: { width, height },
    duration,
    background: "#000000",
    layers: [{
      id: `smart-source-layer-${source.id}`,
      trackId: `smart-source-track-${source.id}`,
      type: "media",
      name: source.name,
      trackName: "Master video",
      trackOrder: 0,
      start: 0,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      src: sourceUrl,
      mediaKind: "video",
      assetKey: source.id,
      objectFit: "cover",
      sourceStart: 0,
      trimStart: 0,
      sourceEnd: duration,
      trimEnd: duration,
      sourceDuration: duration,
      volume: 1,
      muted: false,
    }],
    assets: [{
      id: source.id,
      name: source.name,
      kind: "video",
      url: sourceUrl,
      persistentUrl: source.persistentUrl || sourceUrl,
      uploadStatus: "ready",
      duration,
      metadata: source.metadata,
    }],
    transitions: [],
    format: {
      id: "smart-clip-master",
      label: `Master ${width}:${height}`,
      width,
      height,
    },
    createdAt: now,
    updatedAt: now,
  };
}

const SMART_CLIP_FILLER_PREFIX = /^(?:ahora bien|a ver|as[ií] que|bueno|entonces|este|mira|miren|okay|ok|pues|so|well|you know|I mean)[,.:;!\s-]+/i;
const SMART_CLIP_HOOK_PATTERN = /\b(?:c[oó]mo|por qu[eé]|qu[eé] pasa|qu[eé] ocurre|secreto|verdad|problema|error|importante|nunca|siempre|mejor|peor|imagina|resultado|clave|raz[oó]n|how|why|what happens|secret|truth|problem|mistake|important|never|always|best|worst|imagine|result|key|reason)\b/i;
const SMART_CLIP_STOP_WORDS = new Set([
  "a", "al", "and", "are", "como", "con", "de", "del", "el", "en", "es", "esta", "este", "for", "is", "la", "las", "lo", "los", "of", "on", "or", "para", "por", "que", "se", "the", "to", "un", "una", "y",
]);

function normalizeSmartClipText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function trimSmartClipTitle(value: string, maxLength = 72) {
  const clean = normalizeSmartClipText(value)
    .replace(SMART_CLIP_FILLER_PREFIX, "")
    .replace(/^[,.:;!¿?\s-]+|[,.:;!¿?\s-]+$/g, "");
  if (clean.length <= maxLength) return clean;
  const shortened = clean.slice(0, maxLength + 1);
  const boundary = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, boundary >= Math.floor(maxLength * 0.6) ? boundary : maxLength).trim()}…`;
}

export function createLocalSmartClipTitle(transcript: string, maxLength = 72) {
  const clean = normalizeSmartClipText(transcript);
  if (!clean) return "Untitled Smart Clip";
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeSmartClipText(sentence))
    .filter(Boolean);
  const ranked = (sentences.length ? sentences : [clean]).map((sentence, index) => {
    const words = sentence.toLocaleLowerCase().match(/[\p{L}\p{N}']+/gu) || [];
    const meaningfulWords = words.filter((word) => word.length > 2 && !SMART_CLIP_STOP_WORDS.has(word));
    const hookBonus = SMART_CLIP_HOOK_PATTERN.test(sentence) ? 18 : 0;
    const questionBonus = /[?¿]/.test(sentence) ? 12 : 0;
    const usefulLength = Math.min(18, meaningfulWords.length) - Math.abs(10 - Math.min(10, meaningfulWords.length));
    return { sentence, score: hookBonus + questionBonus + usefulLength - index * 0.25 };
  });
  ranked.sort((first, second) => second.score - first.score);
  return trimSmartClipTitle(ranked[0]?.sentence || clean, maxLength) || "Untitled Smart Clip";
}

function calculateSmartClipCandidateScore(cues: SmartClipTranscriptCue[], start: number, end: number, targetDuration: number) {
  const transcript = normalizeSmartClipText(cues.map((cue) => cue.text).join(" "));
  const words = transcript.match(/[\p{L}\p{N}']+/gu) || [];
  const duration = Math.max(0.1, end - start);
  const spokenDuration = cues.reduce((total, cue) => total + Math.max(0, Math.min(end, cue.end) - Math.max(start, cue.start)), 0);
  const density = Math.min(1, spokenDuration / duration);
  const lengthFit = Math.max(0, 1 - Math.abs(duration - targetDuration) / Math.max(1, targetDuration));
  const hookBonus = SMART_CLIP_HOOK_PATTERN.test(transcript) ? 14 : 0;
  const questionBonus = /[?¿]/.test(transcript) ? 8 : 0;
  const completeThoughtBonus = /[.!?]$/.test(transcript) ? 5 : 0;
  const wordScore = Math.min(18, words.length / 5);
  return Math.round(Math.min(100, density * 40 + lengthFit * 25 + wordScore + hookBonus + questionBonus + completeThoughtBonus));
}

function smartClipOverlapRatio(first: SmartClipSegment, second: SmartClipSegment) {
  const overlap = Math.max(0, Math.min(first.end, second.end) - Math.max(first.start, second.start));
  return overlap / Math.max(0.1, Math.min(first.duration, second.duration));
}

export function generateLocalSmartClipCandidates(
  transcriptCues: SmartClipTranscriptCue[],
  projectDuration: number,
  requestedDuration: number,
  options: SmartClipCandidateOptions = {},
): SmartClipCandidate[] {
  const duration = Math.max(0, Number(projectDuration) || 0);
  const targetDuration = Math.max(8, Math.min(duration || requestedDuration, Number(requestedDuration) || 60));
  const cues = transcriptCues
    .map((cue) => ({
      start: Math.max(0, Math.min(duration, Number(cue.start) || 0)),
      end: Math.max(0, Math.min(duration, Number(cue.end) || 0)),
      text: normalizeSmartClipText(cue.text),
    }))
    .filter((cue) => cue.text && cue.end > cue.start)
    .sort((first, second) => first.start - second.start);

  const desiredCount = Math.max(1, Math.min(
    16,
    options.maxCandidates ?? Math.max(3, Math.round(duration / Math.max(75, targetDuration * 1.65))),
  ));
  const minimumDuration = Math.max(6, Math.min(targetDuration * 0.55, options.minimumDuration ?? targetDuration * 0.55));

  if (!cues.length) {
    return createSmartClipSegments(duration, targetDuration).slice(0, desiredCount).map((segment) => ({
      ...segment,
      title: `Smart Clip ${segment.index + 1}`,
      transcript: "",
      score: 0,
      reason: "Timeline fallback",
      selected: true,
    }));
  }

  const proposals: SmartClipCandidate[] = [];
  const startSpacing = Math.max(4, targetDuration * 0.22);
  let lastProposalStart = -startSpacing;
  for (let cueIndex = 0; cueIndex < cues.length; cueIndex += 1) {
    const firstCue = cues[cueIndex];
    if (firstCue.start - lastProposalStart < startSpacing) continue;
    const rawStart = Math.max(0, firstCue.start - 0.18);
    let bestEnd = 0;
    let bestPenalty = Number.POSITIVE_INFINITY;
    let finalCueIndex = cueIndex;
    for (let endIndex = cueIndex; endIndex < cues.length; endIndex += 1) {
      const cue = cues[endIndex];
      const candidateDuration = cue.end - rawStart;
      if (candidateDuration < minimumDuration) continue;
      if (candidateDuration > targetDuration * 1.22) break;
      const nextCue = cues[endIndex + 1];
      const pauseAfter = nextCue ? nextCue.start - cue.end : 1.5;
      const naturalBoundary = /[.!?]$/.test(cue.text) || pauseAfter >= 0.7;
      const penalty = Math.abs(targetDuration - candidateDuration) - (naturalBoundary ? targetDuration * 0.16 : 0);
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestEnd = cue.end;
        finalCueIndex = endIndex;
      }
    }
    if (!bestEnd) continue;
    const end = Math.min(duration, bestEnd + 0.12);
    const candidateCues = cues.slice(cueIndex, finalCueIndex + 1);
    const transcript = normalizeSmartClipText(candidateCues.map((cue) => cue.text).join(" "));
    const candidateDuration = Number((end - rawStart).toFixed(3));
    const score = calculateSmartClipCandidateScore(candidateCues, rawStart, end, targetDuration);
    proposals.push({
      id: `smart-candidate-${cueIndex}-${rawStart.toFixed(3)}-${end.toFixed(3)}`,
      index: proposals.length,
      start: Number(rawStart.toFixed(3)),
      end: Number(end.toFixed(3)),
      duration: candidateDuration,
      title: createLocalSmartClipTitle(transcript),
      transcript,
      score,
      reason: score >= 78 ? "Strong hook and complete thought" : score >= 62 ? "Clear, speech-rich moment" : "Complete local segment",
      selected: true,
    });
    lastProposalStart = rawStart;
  }

  const selected: SmartClipCandidate[] = [];
  for (const proposal of [...proposals].sort((first, second) => second.score - first.score)) {
    if (selected.some((candidate) => smartClipOverlapRatio(candidate, proposal) > 0.56)) continue;
    selected.push(proposal);
    if (selected.length >= desiredCount) break;
  }

  if (!selected.length) {
    const fallbackTranscript = normalizeSmartClipText(cues.map((cue) => cue.text).join(" "));
    const end = Math.min(duration, Math.max(cues.at(-1)?.end || targetDuration, Math.min(duration, targetDuration)));
    selected.push({
      id: "smart-candidate-fallback",
      index: 0,
      start: 0,
      end,
      duration: end,
      title: createLocalSmartClipTitle(fallbackTranscript),
      transcript: fallbackTranscript,
      score: 50,
      reason: "Complete local segment",
      selected: true,
    });
  }

  const usedTitles = new Set<string>();
  return selected
    .sort((first, second) => first.start - second.start)
    .map((candidate, index) => {
      const baseTitle = trimSmartClipTitle(candidate.title) || `Smart Clip ${index + 1}`;
      let uniqueTitle = baseTitle;
      let suffix = 2;
      while (usedTitles.has(uniqueTitle.toLocaleLowerCase())) {
        uniqueTitle = trimSmartClipTitle(`${baseTitle} · Clip ${index + 1}`, 88);
        if (usedTitles.has(uniqueTitle.toLocaleLowerCase())) {
          uniqueTitle = trimSmartClipTitle(`${baseTitle} · ${suffix}`, 88);
          suffix += 1;
        }
      }
      usedTitles.add(uniqueTitle.toLocaleLowerCase());
      return { ...candidate, index, title: uniqueTitle };
    });
}

function getSourceStart(layer: PixoresVideoLayer) {
  return Math.max(0, layer.sourceStart ?? layer.trimStart ?? 0);
}

function adaptLayerToVerticalCanvas(
  layer: PixoresVideoLayer,
  sourceWidth: number,
  targetWidth: number,
): PixoresVideoLayer {
  if (layer.type === "audio" || layer.type === "transition") return layer;

  if (isAiCaptionLayer(layer)) {
    // Caption geometry is stored in percentages and its visual fields are the
    // user's design. Keep every edited style when slicing the timeline into
    // Smart Clips instead of replacing it with the automatic default.
    return layer;
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
    smartReframe: sliceSmartReframe(layer.smartReframe, clippedFromStart, duration),
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
