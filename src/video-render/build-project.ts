import type {
  PixoresVideoAsset,
  PixoresVideoFormat,
  PixoresTransition,
  PixoresVideoLayer,
  PixoresVideoProject,
} from "./types";

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

  return {
    ...layer,
    src: persistentSrc || layer.src,
    start: cleanNumber(layer.start),
    duration: Math.max(0.05, cleanNumber(layer.duration, 0.05)),
    opacity: Math.max(0, Math.min(1, cleanNumber(layer.opacity, 1))),
    x: cleanNumber(layer.x),
    y: cleanNumber(layer.y),
    width: cleanNumber(layer.width),
    height: cleanNumber(layer.height),
    sourceStart: layer.sourceStart === undefined ? undefined : Math.max(0, cleanNumber(layer.sourceStart)),
    sourceEnd: layer.sourceEnd === undefined ? undefined : Math.max(0, cleanNumber(layer.sourceEnd)),
    trimStart: layer.trimStart === undefined ? undefined : Math.max(0, cleanNumber(layer.trimStart)),
    trimEnd: layer.trimEnd === undefined ? undefined : Math.max(0, cleanNumber(layer.trimEnd)),
    volume: layerVolume === undefined ? undefined : Math.max(0, Math.min(1, cleanNumber(layerVolume, 1))),
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

  return {
    schemaVersion: 1,
    canvas: { width, height },
    duration: Math.max(0.05, cleanNumber(input.duration, 1)),
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
