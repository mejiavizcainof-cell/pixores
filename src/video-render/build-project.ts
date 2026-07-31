import type {
  PixoresVideoAsset,
  PixoresVideoFormat,
  PixoresTransition,
  PixoresVideoLayer,
  PixoresVideoProject,
} from "./types";
import { calculateProjectDuration } from "./timeline";

/**
 * Input adapter for the current editor state.
 *
 * The editor can keep its local state shape while this adapter creates the
 * stable JSON contract consumed by server-side renderers.
 */
export type BuildPixoresProjectInput = {
  canvas: {
    width: number;
    height: number;
  };
  duration: number;
  background: string;
  layers: PixoresVideoLayer[];
  assets: PixoresVideoAsset[];
  format: PixoresVideoFormat;
  createdAt?: string;
  updatedAt?: string;
};

function cleanNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : fallback;
}

function cleanLayer(layer: PixoresVideoLayer, persistentAssetUrls: Map<string, string>): PixoresVideoLayer {
  const persistentSrc = layer.assetKey ? persistentAssetUrls.get(layer.assetKey) : undefined;
  const layerVolume = layer.volume === undefined && layer.type === "media" && layer.mediaKind === "video" && !layer.audioDetached
    ? 1
    : layer.volume;
  const rawSourceStart = layer.sourceStart === undefined ? undefined : Math.max(0, cleanNumber(layer.sourceStart));
  const rawSourceEnd = layer.sourceEnd === undefined ? undefined : Math.max(rawSourceStart ?? 0, cleanNumber(layer.sourceEnd));
  // Some camera/phone MP4 files contain corrupt decoder-preroll frames and audio
  // priming at the very beginning. Skip only that tiny preroll when an untrimmed
  // video is placed at timeline zero, while preserving its edited duration.
  const startupGuard = layer.type === "media"
    && layer.mediaKind === "video"
    && cleanNumber(layer.start) <= 0.001
    && (rawSourceStart ?? 0) <= 0.001
    ? 0.2
    : 0;
  const sourceStart = startupGuard > 0 ? (rawSourceStart ?? 0) + startupGuard : rawSourceStart;
  const sourceEnd = rawSourceEnd === undefined ? undefined : rawSourceEnd + startupGuard;
  const trimmedDuration = sourceStart !== undefined && sourceEnd !== undefined
    ? Math.max(0.05, cleanNumber(sourceEnd - sourceStart, 0.05))
    : Math.max(0.05, cleanNumber(layer.duration, 0.05));

  return {
    ...layer,
    src: persistentSrc || layer.src,
    start: cleanNumber(layer.start),
    duration: trimmedDuration,
    opacity: Math.max(0, Math.min(1, cleanNumber(layer.opacity, 1))),
    x: cleanNumber(layer.x),
    y: cleanNumber(layer.y),
    width: cleanNumber(layer.width),
    height: cleanNumber(layer.height),
    trackOrder: layer.trackOrder === undefined ? undefined : Math.max(0, Math.round(layer.trackOrder)),
    trackName: layer.trackName,
    trackMuted: layer.trackMuted,
    zIndex: layer.zIndex === undefined ? undefined : Math.max(0, Math.round(layer.zIndex)),
    sourceStart,
    sourceEnd,
    trimStart: layer.trimStart === undefined ? undefined : Math.max(0, cleanNumber(layer.trimStart)),
    trimEnd: layer.trimEnd === undefined ? undefined : Math.max(0, cleanNumber(layer.trimEnd)),
    sourceDuration: layer.sourceDuration === undefined ? undefined : Math.max(0.05, cleanNumber(layer.sourceDuration, 0.05)),
    crop: layer.crop ? {
      x: Math.max(0, Math.min(100, cleanNumber(layer.crop.x))),
      y: Math.max(0, Math.min(100, cleanNumber(layer.crop.y))),
      width: Math.max(1, Math.min(100, cleanNumber(layer.crop.width, 100))),
      height: Math.max(1, Math.min(100, cleanNumber(layer.crop.height, 100))),
      unit: "percent",
    } : undefined,
    transform: layer.transform ? {
      scale: Math.max(0.1, cleanNumber(layer.transform.scale, 1)),
      x: cleanNumber(layer.transform.x),
      y: cleanNumber(layer.transform.y),
    } : undefined,
    effect: layer.effect ? {
      ...layer.effect,
      intensity: Math.max(0, Math.min(1, cleanNumber(layer.effect.intensity, 1))),
      chromaKey: layer.effect.chromaKey ? {
        color: layer.effect.chromaKey.color || "#00ff00",
        similarity: Math.max(0, Math.min(1, cleanNumber(layer.effect.chromaKey.similarity, 0.28))),
        smoothness: Math.max(0.005, Math.min(1, cleanNumber(layer.effect.chromaKey.smoothness, 0.12))),
        spill: Math.max(0, Math.min(1, cleanNumber(layer.effect.chromaKey.spill, 0.55))),
      } : undefined,
    } : undefined,
    frameMediaLayerIds: layer.frameMediaLayerIds?.filter((layerId): layerId is string => typeof layerId === "string"),
    volume: layerVolume === undefined ? undefined : Math.max(0, Math.min(1, cleanNumber(layerVolume, 1))),
    muted: !!layer.muted,
    audioFadeIn: Math.max(0, Math.min(trimmedDuration, cleanNumber(layer.audioFadeIn || 0))),
    audioFadeOut: Math.max(0, Math.min(trimmedDuration, cleanNumber(layer.audioFadeOut || 0))),
    audioEffects: layer.audioEffects ? {
      enabled: layer.audioEffects.enabled !== false,
      gainDb: Math.max(-24, Math.min(24, cleanNumber(layer.audioEffects.gainDb || 0))),
      pan: Math.max(-1, Math.min(1, cleanNumber(layer.audioEffects.pan || 0))),
      normalize: !!layer.audioEffects.normalize,
      highPassHz: Math.max(0, Math.min(300, cleanNumber(layer.audioEffects.highPassHz || 0))),
      humRemovalHz: [50, 60].includes(Number(layer.audioEffects.humRemovalHz)) ? layer.audioEffects.humRemovalHz : 0,
      noiseReduction: Math.max(0, Math.min(1, cleanNumber(layer.audioEffects.noiseReduction || 0))),
      deEsser: Math.max(0, Math.min(1, cleanNumber(layer.audioEffects.deEsser || 0))),
      lowGainDb: Math.max(-18, Math.min(18, cleanNumber(layer.audioEffects.lowGainDb || 0))),
      midGainDb: Math.max(-18, Math.min(18, cleanNumber(layer.audioEffects.midGainDb || 0))),
      highGainDb: Math.max(-18, Math.min(18, cleanNumber(layer.audioEffects.highGainDb || 0))),
      compressor: Math.max(0, Math.min(1, cleanNumber(layer.audioEffects.compressor || 0))),
      limiter: !!layer.audioEffects.limiter,
      echoEnabled: !!layer.audioEffects.echoEnabled,
      echoDelayMs: Math.max(40, Math.min(1000, cleanNumber(layer.audioEffects.echoDelayMs || 180))),
      echoDecay: Math.max(0.05, Math.min(0.9, cleanNumber(layer.audioEffects.echoDecay || 0.3))),
      reverb: ["studio", "room", "hall", "stage"].includes(String(layer.audioEffects.reverb)) ? layer.audioEffects.reverb : "none",
    } : undefined,
    animations: layer.animations?.map((animation) => ({
      ...animation,
      phase: animation.phase || "in",
      start: Math.max(0, cleanNumber(animation.start)),
      duration: Math.max(0.05, cleanNumber(animation.duration, 0.6)),
      endOffset: animation.phase === "out" ? Math.max(0, cleanNumber(animation.endOffset || 0)) : undefined,
    })),
    keyframes: layer.keyframes?.map((keyframe) => ({
      ...keyframe,
      time: Math.max(0, cleanNumber(keyframe.time)),
      value: cleanNumber(keyframe.value),
    })),
  };
}

function cleanTransitionLayer(layer: PixoresVideoLayer): PixoresTransition | null {
  if (layer.type !== "transition") return null;

  return {
    id: layer.id,
    type: layer.transitionKind || "fade",
    fromLayerId: layer.fromLayerId,
    toLayerId: layer.toLayerId,
    start: cleanNumber(layer.start),
    duration: Math.max(0.05, cleanNumber(layer.duration, 0.4)),
    cutTime: layer.cutTime === undefined ? undefined : Math.max(0, cleanNumber(layer.cutTime)),
    color: layer.color,
    easing: layer.easing || "easeInOut",
  };
}

export function buildPixoresProject(input: BuildPixoresProjectInput): PixoresVideoProject {
  const now = new Date().toISOString();
  const width = Math.max(1, Math.round(input.canvas.width));
  const height = Math.max(1, Math.round(input.canvas.height));
  const cleanedAssets = input.assets.map((asset) => ({
    ...asset,
    url: asset.persistentUrl || asset.url,
  }));
  const persistentAssetUrls = new Map(
    input.assets
      .filter((asset) => Boolean(asset.persistentUrl))
      .map((asset) => [asset.id, asset.persistentUrl as string]),
  );

  const cleanedLayers = input.layers.map((layer) => cleanLayer(layer, persistentAssetUrls));
  const projectDuration = calculateProjectDuration(cleanedLayers);

  return {
    schemaVersion: 1,
    canvas: { width, height },
    duration: projectDuration,
    background: input.background || "#000000",
    layers: cleanedLayers,
    assets: cleanedAssets,
    transitions: cleanedLayers.flatMap((layer) => {
      const transition = cleanTransitionLayer(layer);
      return transition ? [transition] : [];
    }),
    format: {
      id: input.format.id,
      label: input.format.label,
      width,
      height,
    },
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}
