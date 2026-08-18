import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame, useDelayRender, useVideoConfig, OffthreadVideo } from "remotion";
import type { PixoresKeyframe, PixoresTransition, PixoresVideoLayer, PixoresVideoProject } from "../types";
import { getLowerThirdRenderModel } from "../lower-thirds";
import { resolveLayerAnimationStyle } from "../layer-animations";
import { ensurePixoresFontsLoaded } from "../../fonts/pixores-font-loader";
import { resolvePixoresTextStyle } from "../../fonts/pixores-text-style";
import { containFrameBounds } from "../../video-maker/frame-geometry";
import { resolveSmartReframeAtTime } from "../../video-maker/smart-reframe";

/**
 * Remotion-facing composition adapter for Pixores projects.
 *
 * Phase 13 renders persistent image/video media plus audio layers. Video
 * layers keep integrated audio unless the editor explicitly detaches or mutes it.
 */

type PixoresCompositionProps = {
  project: PixoresVideoProject;
};

function PixoresFontGate({ project }: PixoresCompositionProps) {
  const { cancelRender, continueRender, delayRender } = useDelayRender();
  const fontFamilies = useMemo(() => [...new Set(project.layers.flatMap((layer) => {
    if (layer.type === "text") return layer.fontFamily ? [layer.fontFamily] : [];
    if (layer.type === "lower-third") return [
      layer.lowerThird?.typography?.primaryFontFamily,
      layer.lowerThird?.typography?.secondaryFontFamily,
    ].filter((fontFamily): fontFamily is string => Boolean(fontFamily));
    return [];
  }))], [project.layers]);
  const familyKey = fontFamilies.join("|");
  const fontStylesheetUrl = staticFile("video-maker-assets/fonts/pixores-fonts.css");
  const [handle] = useState(() => delayRender(`Loading Pixores local fonts: ${familyKey || "system fonts"}`, {
    timeoutInMilliseconds: 30_000,
    retries: 1,
  }));

  useEffect(() => {
    let cancelled = false;
    void ensurePixoresFontsLoaded(fontFamilies, fontStylesheetUrl)
      .then(() => {
        if (!cancelled) continueRender(handle);
      })
      .catch((error) => cancelRender(error));
    return () => { cancelled = true; };
  }, [cancelRender, continueRender, familyKey, fontFamilies, fontStylesheetUrl, handle]);
  return null;
}

function getBaseLayerValue(layer: PixoresVideoLayer, property: PixoresKeyframe["property"]) {
  if (property === "x") return layer.x;
  if (property === "y") return layer.y;
  if (property === "width") return layer.width;
  if (property === "height") return layer.height;
  if (property === "opacity") return layer.opacity;
  if (property === "angle") return layer.angle || 0;
  return 1;
}

function getKeyframedLayerValue(layer: PixoresVideoLayer, property: PixoresKeyframe["property"], currentTime: number) {
  const keyframes = (layer.keyframes || [])
    .filter((keyframe) => keyframe.property === property)
    .sort((a, b) => a.time - b.time);
  const baseValue = getBaseLayerValue(layer, property);

  if (!keyframes.length) return baseValue;
  if (currentTime < keyframes[0].time) return baseValue;
  if (currentTime >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].value;

  const nextKeyframe = keyframes.find((keyframe) => keyframe.time >= currentTime);
  if (!nextKeyframe) return keyframes[keyframes.length - 1].value;
  const previousKeyframe = [...keyframes].reverse().find((keyframe) => keyframe.time <= currentTime);
  const fromTime = previousKeyframe?.time ?? 0;
  const fromValue = previousKeyframe?.value ?? baseValue;
  const span = Math.max(0.001, nextKeyframe.time - fromTime);
  const progress = applyEasing((currentTime - fromTime) / span, nextKeyframe.easing || "easeInOut");

  return interpolate(progress, [0, 1], [fromValue, nextKeyframe.value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function hexToRgba(color: string, opacity: number) {
  const normalized = color.trim().replace(/^#/, "");
  const value = normalized.length === 3
    ? normalized.split("").map((character) => `${character}${character}`).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const numeric = Number.parseInt(value, 16);
  const red = Number.isFinite(numeric) ? (numeric >> 16) & 255 : 0;
  const green = Number.isFinite(numeric) ? (numeric >> 8) & 255 : 0;
  const blue = Number.isFinite(numeric) ? numeric & 255 : 0;
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, Math.max(0, opacity))})`;
}

function getLayerShadowFilter(layer: PixoresVideoLayer) {
  const preset = layer.shadowPreset || ((layer.shadowBlur || 0) > 0 ? "drop" : "none");
  const size = Math.max(0, layer.shadowBlur || 0);
  const opacity = Math.min(1, Math.max(0, layer.shadowOpacity ?? 0.6));
  if (preset === "none" || size <= 0 || opacity <= 0) return undefined;
  const color = hexToRgba(layer.shadowColor || "#000000", opacity);
  const drop = (x: number, y: number, blur: number) => `drop-shadow(${x}px ${y}px ${blur}px ${color})`;

  if (preset === "glow") return drop(0, 0, size);
  if (preset === "outline") {
    const spread = Math.max(1, size * 0.18);
    const blur = Math.max(1, size * 0.18);
    return [drop(spread, 0, blur), drop(-spread, 0, blur), drop(0, spread, blur), drop(0, -spread, blur)].join(" ");
  }
  if (preset === "curved") {
    const side = Math.max(2, size * 0.3);
    const y = Math.max(3, size * 0.62);
    return [drop(-side, y, Math.max(2, size * 0.34)), drop(side, y, Math.max(2, size * 0.34))].join(" ");
  }
  if (preset === "pageLift") return drop(0, Math.max(4, size * 0.7), Math.max(2, size * 0.42));
  if (preset === "angled") return drop(Math.max(4, size * 0.72), Math.max(3, size * 0.52), Math.max(1, size * 0.24));
  if (preset === "backdrop") return drop(Math.max(5, size * 0.9), Math.max(3, size * 0.48), Math.max(0.5, size * 0.08));
  return drop(layer.shadowOffsetX ?? Math.max(4, size * 0.4), layer.shadowOffsetY ?? Math.max(4, size * 0.45), size);
}

function layerBoxStyle(project: PixoresVideoProject, layer: PixoresVideoLayer, currentTime: number): CSSProperties {
  const animationStyle = resolveLayerAnimationStyle(layer.animations, currentTime, layer.duration);
  const rawX = getKeyframedLayerValue(layer, "x", currentTime);
  const rawY = getKeyframedLayerValue(layer, "y", currentTime);
  const frameBounds = layer.type === "shape" && layer.shapeType && (
    layer.shapeType === "frame" || layer.shapeType.includes("Frame") || layer.shapeType.startsWith("grid")
  ) ? containFrameBounds({ x: rawX, y: rawY, width: layer.width, height: layer.height }) : null;
  const x = frameBounds?.x ?? rawX;
  const y = frameBounds?.y ?? rawY;
  const opacity = getKeyframedLayerValue(layer, "opacity", currentTime);
  const angle = getKeyframedLayerValue(layer, "angle", currentTime);
  const transforms = [
    `translate(${animationStyle.translateX}%, ${animationStyle.translateY}%)`,
    `scale(${animationStyle.scaleX}, ${animationStyle.scaleY})`,
    angle || animationStyle.rotate ? `rotate(${angle + animationStyle.rotate}deg)` : "",
    animationStyle.skewX ? `skewX(${animationStyle.skewX}deg)` : "",
  ].filter(Boolean).join(" ");
  const layerShadow = layer.type === "text" ? undefined : getLayerShadowFilter(layer);
  const textStyle = resolvePixoresTextStyle(layer, project.canvas.width);
  const animationFilters = [
    animationStyle.blur > 0.05 ? `blur(${animationStyle.blur}px)` : "",
    animationStyle.glow > 0.05 ? `drop-shadow(0 0 ${animationStyle.glow}px #8b5cf6)` : "",
  ].filter(Boolean);
  const filter = [layerShadow, ...animationFilters].filter(Boolean).join(" ") || undefined;
  const clipPath = animationStyle.reveal >= 0.999
    ? undefined
    : animationStyle.revealOrigin === "center"
      ? `inset(0 ${(1 - animationStyle.reveal) * 50}% 0 ${(1 - animationStyle.reveal) * 50}%)`
      : animationStyle.revealOrigin === "bottom"
        ? `inset(${(1 - animationStyle.reveal) * 100}% 0 0 0)`
        : `inset(0 ${(1 - animationStyle.reveal) * 100}% 0 0)`;
  const strokeColor = hexToRgba(layer.strokeColor || "#ffffff", layer.strokeOpacity ?? 1);

  return {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    width: `${frameBounds?.width ?? layer.width}%`,
    height: `${frameBounds?.height ?? layer.height}%`,
    opacity: opacity * animationStyle.opacityMultiplier,
    transform: transforms || undefined,
    transformOrigin: "center center",
    overflow: layer.type === "text" && !clipPath ? "visible" : "hidden",
    clipPath,
    borderRadius: layer.borderRadius,
    mixBlendMode: layer.blendMode && layer.blendMode !== "normal" ? layer.blendMode : undefined,
    filter,
    boxShadow: (layer.type === "media" || layer.type === "lower-third") && (layer.strokeWidth || 0) > 0
      ? `inset 0 0 0 ${layer.strokeWidth}px ${strokeColor}`
      : undefined,
    pointerEvents: "none",
    color: layer.color,
    fontFamily: layer.fontFamily,
    fontSize: layer.type === "text" ? `${textStyle.fontSize}px` : undefined,
    fontWeight: layer.type === "text" ? textStyle.fontWeight : undefined,
    fontStyle: layer.type === "text" ? textStyle.fontStyle : undefined,
    textDecoration: [
      layer.isUnderline ? "underline" : "",
      layer.isStrikethrough ? "line-through" : "",
    ].filter(Boolean).join(" ") || undefined,
    textAlign: layer.textAlign,
    lineHeight: layer.type === "text" ? textStyle.lineHeight : layer.lineHeight,
    letterSpacing: layer.type === "text" ? `${textStyle.letterSpacing}px` : layer.letterSpacing,
  };
}

function isActiveLayer(layer: PixoresVideoLayer, currentTime: number) {
  return layer.visible && currentTime >= layer.start && currentTime <= layer.start + layer.duration;
}

function mediaCropStyle(layer: PixoresVideoLayer, currentTime = 0): CSSProperties {
  const crop = layer.crop || { x: 0, y: 0, width: 100, height: 100, unit: "percent" as const };
  const transform = layer.transform || { scale: 1, x: 0, y: 0 };
  const smartReframe = resolveSmartReframeAtTime(layer.smartReframe, currentTime);
  const mediaScale = Math.max(0.1, (transform.scale || 1) * (smartReframe?.zoom || 1));
  const objectPosition = smartReframe
    ? `${Math.min(100, Math.max(0, smartReframe.centerX * 100))}% ${Math.min(100, Math.max(0, smartReframe.centerY * 100))}%`
    : undefined;
  const cropWidth = Math.max(1, crop.width);
  const cropHeight = Math.max(1, crop.height);
  const hasExplicitCrop = crop.x !== 0 || crop.y !== 0 || cropWidth !== 100 || cropHeight !== 100;
  if (!hasExplicitCrop) {
    return {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: layer.objectFit || "contain",
      objectPosition,
      transform: `translate(${transform.x || 0}%, ${transform.y || 0}%) scale(${mediaScale})`,
      transformOrigin: "center center",
    };
  }
  return {
    position: "absolute",
    left: `${(-crop.x / cropWidth) * 100}%`,
    top: `${(-crop.y / cropHeight) * 100}%`,
    width: `${(100 / cropWidth) * 100}%`,
    height: `${(100 / cropHeight) * 100}%`,
    objectFit: "fill",
    objectPosition,
    transform: `translate(${transform.x || 0}%, ${transform.y || 0}%) scale(${mediaScale})`,
    transformOrigin: "center center",
  };
}

function getMediaEffectFilter(layer: PixoresVideoLayer) {
  const intensity = Math.max(0, Math.min(1, layer.effect?.intensity ?? 1));
  const filters: string[] = [];
  if (layer.blur) filters.push(`blur(${layer.blur}px)`);

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

  return filters;
}

function MediaEffectWrapper({ layer, children }: { layer: PixoresVideoLayer; children: ReactNode }) {
  const intensity = Math.max(0, Math.min(1, layer.effect?.intensity ?? 1));
  const chromaKey = layer.effect?.preset === "chromaKey" && intensity > 0 ? layer.effect.chromaKey : undefined;
  const filterId = `pixores-chroma-${layer.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const filterParts = getMediaEffectFilter(layer);
  if (chromaKey) filterParts.push(`url(#${filterId})`);
  const similarity = Math.max(0, Math.min(1, chromaKey?.similarity ?? 0.28)) * intensity;
  const smoothness = Math.max(0.005, Math.min(1, chromaKey?.smoothness ?? 0.12));

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {chromaKey ? (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <filter id={filterId} colorInterpolationFilters="sRGB" x="-10%" y="-10%" width="120%" height="120%">
            <feFlood floodColor={chromaKey.color || "#00ff00"} result="keyColor" />
            <feBlend in="SourceGraphic" in2="keyColor" mode="difference" result="difference" />
            <feColorMatrix
              in="difference"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.3333 0.3333 0.3333 0 0"
              result="distanceMask"
            />
            <feComponentTransfer in="distanceMask" result="thresholdMask">
              <feFuncA type="linear" slope={1 / smoothness} intercept={-similarity / smoothness} />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="thresholdMask" operator="in" />
          </filter>
        </svg>
      ) : null}
      <div style={{ position: "absolute", inset: 0, filter: filterParts.length ? filterParts.join(" ") : undefined }}>
        {children}
      </div>
      {layer.effect?.preset === "vignette" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle, transparent 18%, rgba(0, 0, 0, ${0.05 * intensity}) 58%, rgba(0, 0, 0, ${0.82 * intensity}) 100%)`,
          }}
        />
      ) : null}
    </div>
  );
}

function isBridgeTransitionLayer(layer: PixoresVideoLayer) {
  return layer.type === "transition" && Boolean(layer.fromLayerId) && Boolean(layer.toLayerId);
}

function shouldSuppressBaseLayerForTransition(layer: PixoresVideoLayer, transitions: PixoresVideoLayer[], currentTime: number) {
  return transitions.some((transition) => (
    isBridgeTransitionLayer(transition)
    && transition.visible
    && currentTime >= transition.start
    && currentTime <= transition.start + transition.duration
    && (transition.fromLayerId === layer.id || transition.toLayerId === layer.id)
  ));
}

function getLayerSourceStart(layer: PixoresVideoLayer) {
  return Math.max(0, layer.sourceStart ?? layer.trimStart ?? 0);
}

function getLayerTrackOrder(layer: PixoresVideoLayer, fallback: number) {
  return layer.trackOrder ?? fallback;
}

function getRenderVolume(layer: PixoresVideoLayer) {
  return layer.trackMuted || layer.muted ? 0 : layer.volume ?? 1;
}

function getRenderVolumeForFrame(layer: PixoresVideoLayer, frame: number, fps: number) {
  const baseVolume = getRenderVolume(layer);
  if (baseVolume <= 0) return 0;
  const durationInFrames = Math.max(1, Math.round(layer.duration * fps));
  const fadeInFrames = Math.max(0, Math.round(Math.min(layer.duration, layer.audioFadeIn || 0) * fps));
  const fadeOutFrames = Math.max(0, Math.round(Math.min(layer.duration, layer.audioFadeOut || 0) * fps));
  const fadeInMultiplier = fadeInFrames > 0 ? Math.min(1, Math.max(0, frame / fadeInFrames)) : 1;
  const framesUntilEnd = Math.max(0, durationInFrames - 1 - frame);
  const fadeOutMultiplier = fadeOutFrames > 0 ? Math.min(1, framesUntilEnd / fadeOutFrames) : 1;
  return baseVolume * Math.min(fadeInMultiplier, fadeOutMultiplier);
}

function getRenderVolumeProp(layer: PixoresVideoLayer, fps: number) {
  if (!(layer.audioFadeIn || layer.audioFadeOut)) return getRenderVolume(layer);
  return (frame: number) => getRenderVolumeForFrame(layer, frame, fps);
}

function getOrderedRenderLayers(layers: PixoresVideoLayer[]) {
  return [...layers].sort((first, second) => (
    getLayerTrackOrder(second, 0) - getLayerTrackOrder(first, 0)
  ));
}

function applyEasing(progress: number, easing: PixoresTransition["easing"] = "easeInOut") {
  if (easing === "linear") return progress;
  if (easing === "easeIn") return progress * progress;
  if (easing === "easeOut") return 1 - ((1 - progress) * (1 - progress));
  return progress < 0.5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2;
}

function resolveMediaSrc(project: PixoresVideoProject, layer: PixoresVideoLayer) {
  const assetSrc = layer.assetKey
    ? project.assets.find((asset) => asset.id === layer.assetKey)?.persistentUrl
      || project.assets.find((asset) => asset.id === layer.assetKey)?.url
    : undefined;
  const src = assetSrc || layer.src || "";

  if (!src || src.startsWith("blob:")) return "";
  if (src.startsWith("/")) return staticFile(src.slice(1));
  return src;
}

function RenderVideoSource({
  layer,
  src,
  startFrom,
  endAt,
  muted,
  style,
}: {
  layer: PixoresVideoLayer;
  src: string;
  startFrom: number;
  endAt: number;
  muted: boolean;
  style: CSSProperties;
}) {
  if (layer.renderProxy) {
    return (
      <OffthreadVideo
        src={src}
        startFrom={startFrom}
        endAt={endAt}
        muted={muted}
        delayRenderTimeoutInMilliseconds={600_000}
        delayRenderRetries={1}
        style={style}
      />
    );
  }

  return (
    <OffthreadVideo
      src={src}
      startFrom={startFrom}
      endAt={endAt}
      muted={muted}
      style={style}
    />
  );
}

function ShapeArtwork({ layer, currentTime = 0 }: { layer: PixoresVideoLayer; currentTime?: number }) {
  const fill = layer.shapeType === "gradient"
    ? `linear-gradient(135deg, ${layer.gradientColor1 || layer.color || "#2563eb"}, ${layer.gradientColor2 || "#ffffff"})`
    : layer.color || "#2563eb";
  const color = layer.color || "#2563eb";
  const strokeWidth = layer.strokeWidth ?? 7;
  const strokeColor = hexToRgba(layer.strokeColor || color, layer.strokeOpacity ?? 1);
  const insetStroke = strokeWidth > 0 ? `inset 0 0 0 ${strokeWidth}px ${strokeColor}` : undefined;

  if (layer.shapeType === "gradient") {
    return <div style={{ width: "100%", height: "100%", background: fill, boxShadow: insetStroke }} />;
  }

  if (layer.shapeType === "circle") {
    return <div style={{ width: "100%", height: "100%", borderRadius: "999px", background: fill, boxShadow: insetStroke }} />;
  }

  if (layer.shapeType === "neonFrame" || layer.shapeType === "neonPulseFrame") {
    const pulse = layer.shapeType === "neonPulseFrame" ? 0.72 + Math.sin(currentTime * Math.PI * 3) * 0.28 : 1;
    return <div style={{ position: "absolute", inset: "4%", border: `clamp(3px, 0.8vw, 14px) solid ${color}`, borderRadius: "8%", boxShadow: `0 0 ${18 * pulse}px ${color}, inset 0 0 ${13 * pulse}px ${color}, 0 0 ${42 * pulse}px ${hexToRgba(color, 0.7)}`, opacity: 0.82 + pulse * 0.18 }} />;
  }

  if (layer.shapeType === "rgbLightsFrame") {
    const rotation = (currentTime * 130) % 360;
    return <div style={{ position: "absolute", inset: "3.5%", padding: "clamp(4px, 1vw, 16px)", borderRadius: "5%", background: `conic-gradient(from ${rotation}deg, #22d3ee, #8b5cf6, #f472b6, #facc15, #22d3ee)`, boxShadow: "0 0 24px rgba(139,92,246,0.85)", WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor" }} />;
  }

  if (layer.shapeType === "lightSweepFrame") {
    const sweep = ((currentTime * 65) % 140) - 20;
    return <div style={{ position: "absolute", inset: "4%", overflow: "hidden", border: `clamp(2px, 0.55vw, 10px) solid ${color}`, borderRadius: "5%", boxShadow: `0 0 14px ${hexToRgba(color, 0.7)}` }}><div style={{ position: "absolute", top: "-40%", bottom: "-40%", left: `${sweep}%`, width: "18%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.98), transparent)", filter: "blur(5px)", transform: "skewX(-18deg)" }} /></div>;
  }

  if (layer.shapeType === "cinemaFrame") {
    return <div style={{ position: "absolute", inset: "3.5%", border: `clamp(4px, 0.8vw, 14px) solid ${color}`, boxShadow: `inset 0 0 0 clamp(2px, 0.22vw, 5px) rgba(255,248,220,0.88), 0 8px 28px rgba(0,0,0,0.45)` }} />;
  }

  const svgArtwork = (() => {
    if (layer.shapeType === "triangle") return <path d="M80 3 L157 93 L3 93 Z" fill={color} stroke={strokeWidth > 0 ? strokeColor : undefined} strokeWidth={strokeWidth} />;
    if (layer.shapeType === "star") return <path d="M80 2 L97 33 L132 27 L107 52 L120 88 L80 70 L40 88 L53 52 L28 27 L63 33 Z" fill={color} stroke={strokeWidth > 0 ? strokeColor : undefined} strokeWidth={strokeWidth} strokeLinejoin="round" />;
    if (layer.shapeType === "badge") return <path d="M80 3 L96 15 L116 12 L124 31 L145 40 L136 59 L143 80 L122 83 L106 95 L88 85 L68 93 L55 77 L34 73 L42 53 L30 35 L50 25 L60 6 Z" fill={color} stroke={strokeWidth > 0 ? strokeColor : undefined} strokeWidth={strokeWidth} />;
    if (layer.shapeType === "speechBubble") return <path d="M14 10 H146 Q158 10 158 22 V68 Q158 80 146 80 H62 L35 95 L42 80 H14 Q2 80 2 68 V22 Q2 10 14 10 Z" fill={color} stroke={strokeWidth > 0 ? strokeColor : undefined} strokeWidth={strokeWidth} />;
    if (layer.shapeType === "arrow") return <path d="M2 33 H100 V10 L158 48 L100 86 V63 H2 Z" fill={color} stroke={strokeWidth > 0 ? strokeColor : undefined} strokeWidth={strokeWidth} strokeLinejoin="round" />;
    if (layer.shapeType === "line" || layer.shapeType === "dashedLine") return <line x1="3" y1="48" x2="157" y2="48" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} strokeLinecap="round" strokeDasharray={layer.shapeType === "dashedLine" ? "18 12" : undefined} />;
    if (layer.shapeType === "frame") return <rect x="5" y="5" width="150" height="86" fill="none" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} />;
    if (layer.shapeType === "roundedFrame") return <rect x="5" y="5" width="150" height="86" rx="15" fill="none" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} />;
    if (layer.shapeType === "circleFrame") return <ellipse cx="80" cy="48" rx="72" ry="43" fill="none" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} />;
    if (layer.shapeType === "triangleFrame") return <path d="M80 5 L154 91 L6 91 Z" fill="none" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} strokeLinejoin="round" />;
    if (layer.shapeType === "phoneFrame") return <><rect x="52" y="3" width="56" height="90" rx="12" fill="none" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /><line x1="69" y1="11" x2="91" y2="11" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth * 0.5)} strokeLinecap="round" /></>;
    if (layer.shapeType === "tabletFrame") return <><rect x="5" y="7" width="150" height="82" rx="10" fill="none" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /><circle cx="145" cy="48" r="2.5" fill={strokeColor} /></>;
    if (layer.shapeType === "laptopFrame") return <><rect x="27" y="3" width="106" height="70" rx="5" fill="none" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /><path d="M3 80 H157 L145 94 H15 Z" fill="none" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} strokeLinejoin="round" /></>;
    if (layer.shapeType === "vsDividerFrame") return <><path d="M0 0 H76 L63 96 H0 Z" fill={color} /><path d="M84 0 H160 V96 H97 Z" fill={layer.strokeColor || "#ef4444"} /><circle cx="80" cy="48" r="17" fill="#fff" /><text x="80" y="54" textAnchor="middle" fontSize="15" fontWeight="900" fill="#111827">VS</text></>;
    if (layer.shapeType === "splitScreenFrame") return <><rect x="4" y="4" width="152" height="88" fill="none" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /><line x1="80" y1="4" x2="80" y2="92" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /></>;
    if (layer.shapeType === "diagonalSplitFrame") return <><rect x="4" y="4" width="152" height="88" fill="none" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /><line x1="55" y1="4" x2="105" y2="92" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /></>;
    if (layer.shapeType === "paperStripFrame") return <path d="M0 12 L12 2 L25 12 L38 2 L51 12 L64 2 L77 12 L90 2 L103 12 L116 2 L129 12 L142 2 L160 12 L154 84 L141 94 L128 84 L115 94 L102 84 L89 94 L76 84 L63 94 L50 84 L37 94 L24 84 L11 94 L0 84 Z" fill={color} />;
    if (layer.shapeType === "paperPortraitFrame" || layer.shapeType === "paperSquareFrame") return <path d="M2 7 L158 1 L153 91 L7 96 Z" fill={color} />;
    if (layer.shapeType === "paperLeftFrame") return <path d="M20 2 L160 8 L145 95 L0 84 Z" fill={color} />;
    if (layer.shapeType === "paperRightFrame") return <path d="M0 8 L141 1 L160 84 L18 96 Z" fill={color} />;
    if (layer.shapeType === "paperFrame") return <path d="M2 7 L158 1 L153 91 L7 96 Z" fill={color} />;

    if (layer.shapeType?.startsWith("grid")) {
      const common = <rect x="4" y="4" width="152" height="88" fill="none" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} />;
      if (layer.shapeType === "gridTwoColumns") return <>{common}<line x1="80" y1="4" x2="80" y2="92" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /></>;
      if (layer.shapeType === "gridTwoRows") return <>{common}<line x1="4" y1="48" x2="156" y2="48" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /></>;
      if (layer.shapeType === "gridThreeColumns") return <>{common}<line x1="54" y1="4" x2="54" y2="92" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /><line x1="106" y1="4" x2="106" y2="92" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /></>;
      if (layer.shapeType === "gridThreeRows") return <>{common}<line x1="4" y1="34" x2="156" y2="34" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /><line x1="4" y1="64" x2="156" y2="64" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /></>;
      if (layer.shapeType === "gridFour") return <>{common}<line x1="80" y1="4" x2="80" y2="92" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /><line x1="4" y1="48" x2="156" y2="48" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /></>;
      if (layer.shapeType === "gridHeroLeft") return <>{common}<line x1="102" y1="4" x2="102" y2="92" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /><line x1="102" y1="48" x2="156" y2="48" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /></>;
      if (layer.shapeType === "gridHeroTop") return <>{common}<line x1="4" y1="62" x2="156" y2="62" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /><line x1="80" y1="62" x2="80" y2="92" stroke={strokeColor} strokeWidth={Math.max(0.01, strokeWidth)} /></>;
      return common;
    }

    return null;
  })();

  if (svgArtwork) {
    return <svg viewBox="0 0 160 96" width="100%" height="100%" preserveAspectRatio="none">{svgArtwork}</svg>;
  }

  return <div style={{ width: "100%", height: "100%", background: fill, boxShadow: insetStroke }} />;
}

type RenderFrameSlot = {
  left: string;
  top: string;
  width: string;
  height: string;
  clipPath?: string;
  borderRadius?: string;
};

function isRenderMediaContainer(layer: PixoresVideoLayer) {
  return layer.type === "shape" && Boolean(layer.shapeType && (
    layer.shapeType === "frame"
    || layer.shapeType.includes("Frame")
    || layer.shapeType.startsWith("grid")
  ));
}

function getRenderFrameSlots(shapeType: PixoresVideoLayer["shapeType"]): RenderFrameSlot[] {
  const slot = (left: number, top: number, width: number, height: number, extra: Partial<RenderFrameSlot> = {}): RenderFrameSlot => ({
    left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, ...extra,
  });
  if (shapeType === "vsDividerFrame") return [slot(2, 4, 45, 92, { clipPath: "polygon(0 0, 100% 0, 78% 100%, 0 100%)" }), slot(53, 4, 45, 92, { clipPath: "polygon(22% 0, 100% 0, 100% 100%, 0 100%)" })];
  if (shapeType === "splitScreenFrame" || shapeType === "gridTwoColumns") return [slot(2.5, 4, 46.5, 92), slot(51, 4, 46.5, 92)];
  if (shapeType === "diagonalSplitFrame") return [slot(2.5, 4, 58, 92, { clipPath: "polygon(0 0, 70% 0, 100% 100%, 0 100%)" }), slot(39.5, 4, 58, 92, { clipPath: "polygon(0 0, 100% 0, 100% 100%, 30% 100%)" })];
  if (shapeType === "gridTwoRows") return [slot(2.5, 4, 95, 45), slot(2.5, 51, 95, 45)];
  if (shapeType === "gridThreeColumns") return [slot(2, 4, 30.6, 92), slot(34.7, 4, 30.6, 92), slot(67.4, 4, 30.6, 92)];
  if (shapeType === "gridThreeRows") return [slot(2.5, 3, 95, 30), slot(2.5, 35, 95, 30), slot(2.5, 67, 95, 30)];
  if (shapeType === "gridFour") return [slot(2.5, 4, 46.5, 45), slot(51, 4, 46.5, 45), slot(2.5, 51, 46.5, 45), slot(51, 51, 46.5, 45)];
  if (shapeType === "gridHeroLeft") return [slot(2.5, 4, 61, 92), slot(65.5, 4, 32, 45), slot(65.5, 51, 32, 45)];
  if (shapeType === "gridHeroTop") return [slot(2.5, 4, 95, 59), slot(2.5, 65, 46.5, 31), slot(51, 65, 46.5, 31)];
  if (shapeType === "circleFrame") return [slot(4, 4, 92, 92, { borderRadius: "50%" })];
  if (shapeType === "triangleFrame") return [slot(5, 6, 90, 88, { clipPath: "polygon(50% 0, 100% 100%, 0 100%)" })];
  if (shapeType === "roundedFrame") return [slot(3.5, 5.5, 93, 89, { borderRadius: "12%" })];
  if (shapeType === "phoneFrame") return [slot(5.5, 5.5, 89, 89, { borderRadius: "12%" })];
  if (shapeType === "tabletFrame") return [slot(4.5, 7.5, 91, 85, { borderRadius: "8%" })];
  if (shapeType === "laptopFrame") return [slot(9.5, 4, 81, 71, { borderRadius: "4%" })];
  if (shapeType?.startsWith("paper") || shapeType === "paperFrame") return [slot(7.5, 9, 85, 80, { borderRadius: "2.5%" })];
  return [slot(3.5, 5.5, 93, 89)];
}

function FrameMedia({ project, frameLayer, mediaLayer, currentTime }: { project: PixoresVideoProject; frameLayer: PixoresVideoLayer; mediaLayer?: PixoresVideoLayer; currentTime: number }) {
  const { fps } = useVideoConfig();
  if (!mediaLayer || mediaLayer.type !== "media" || (mediaLayer.mediaKind !== "image" && mediaLayer.mediaKind !== "video")) return null;
  const src = resolveMediaSrc(project, mediaLayer);
  if (!src) return null;
  const mediaStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `translate(${mediaLayer.transform?.x || 0}%, ${mediaLayer.transform?.y || 0}%) scale(${Math.max(0.1, mediaLayer.transform?.scale || 1)})`,
    transformOrigin: "center center",
  };
  const animationStyle = resolveLayerAnimationStyle(mediaLayer.animations, currentTime, frameLayer.duration);
  const animationClipPath = animationStyle.reveal >= 0.999
    ? undefined
    : animationStyle.revealOrigin === "center"
      ? `inset(0 ${(1 - animationStyle.reveal) * 50}% 0 ${(1 - animationStyle.reveal) * 50}%)`
      : animationStyle.revealOrigin === "bottom"
        ? `inset(${(1 - animationStyle.reveal) * 100}% 0 0 0)`
        : `inset(0 ${(1 - animationStyle.reveal) * 100}% 0 0)`;
  const animationFilter = [
    animationStyle.blur > 0.05 ? `blur(${animationStyle.blur}px)` : "",
    animationStyle.glow > 0.05 ? `drop-shadow(0 0 ${animationStyle.glow}px #8b5cf6)` : "",
  ].filter(Boolean).join(" ") || undefined;
  const animatedMediaStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity: (mediaLayer.opacity ?? 1) * animationStyle.opacityMultiplier,
    transform: `translate(${animationStyle.translateX}%, ${animationStyle.translateY}%) scale(${animationStyle.scaleX}, ${animationStyle.scaleY}) rotate(${animationStyle.rotate}deg)`,
    transformOrigin: "center center",
    clipPath: animationClipPath,
    filter: animationFilter,
  };

  if (mediaLayer.mediaKind === "image") {
    return <div style={animatedMediaStyle}><MediaEffectWrapper layer={mediaLayer}><Img src={src} style={mediaStyle} /></MediaEffectWrapper></div>;
  }
  const sourceStart = getLayerSourceStart(mediaLayer);
  return (
    <div style={animatedMediaStyle}>
      <MediaEffectWrapper layer={mediaLayer}>
        <RenderVideoSource
          layer={mediaLayer}
          src={src}
          startFrom={Math.round(sourceStart * fps)}
          endAt={Math.round((sourceStart + Math.max(frameLayer.duration, 0.05)) * fps)}
          muted
          style={mediaStyle}
        />
      </MediaEffectWrapper>
    </div>
  );
}

function ShapeLayer({ project, layer, currentTime }: { project: PixoresVideoProject; layer: PixoresVideoLayer; currentTime: number }) {
  if (!isRenderMediaContainer(layer)) return <ShapeArtwork layer={layer} />;
  const slots = getRenderFrameSlots(layer.shapeType);
  const isPaperFrame = layer.shapeType?.startsWith("paper") || layer.shapeType === "paperFrame";
  const isVersusFrame = layer.shapeType === "vsDividerFrame";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {isPaperFrame || isVersusFrame ? <div style={{ position: "absolute", inset: 0 }}><ShapeArtwork layer={layer} currentTime={currentTime} /></div> : null}
      {slots.map((slotStyle, slotIndex) => {
        const mediaLayer = project.layers.find((item) => item.id === layer.frameMediaLayerIds?.[slotIndex]);
        return (
          <div key={`${layer.id}-slot-${slotIndex}`} style={{ position: "absolute", overflow: "hidden", ...slotStyle }}>
            <FrameMedia project={project} frameLayer={layer} mediaLayer={mediaLayer} currentTime={currentTime} />
          </div>
        );
      })}
      {!isPaperFrame && !isVersusFrame ? <div style={{ position: "absolute", inset: 0 }}><ShapeArtwork layer={layer} currentTime={currentTime} /></div> : null}
      {isVersusFrame ? (
        <div style={{ position: "absolute", left: "50%", top: "50%", width: "32%", aspectRatio: "1", borderRadius: "50%", background: "#fff", color: "#111827", transform: "translate(-50%, -50%)", display: "grid", placeItems: "center", fontFamily: "Arial, sans-serif", fontSize: "clamp(12px, 3vw, 52px)", fontWeight: 900 }}>VS</div>
      ) : null}
    </div>
  );
}

function LowerThirdLayer({ project, layer, currentTime }: { project: PixoresVideoProject; layer: PixoresVideoLayer; currentTime: number }) {
  if (!layer.lowerThird) return null;
  const primitives = getLowerThirdRenderModel(layer.lowerThird, currentTime, layer.duration);
  const layerPixelWidth = project.canvas.width * (layer.width / 100);
  const logoShape = layer.lowerThird.logo?.shape || (layer.lowerThird.logo?.circular ? "circle" : "rounded");

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {primitives.map((primitive) => {
        const logoSrc = primitive.kind === "logo" && layer.lowerThird?.content.logoSourceId
          ? resolveMediaSrc(project, { ...layer, assetKey: layer.lowerThird.content.logoSourceId, src: undefined })
          : "";
        return (
          <div
            key={primitive.id}
            style={{
            position: "absolute",
            left: `${primitive.x}%`,
            top: `${primitive.y}%`,
            width: `${primitive.width}%`,
            height: `${primitive.height}%`,
            borderRadius: primitive.radius,
            clipPath: (primitive.kind === "logo" || primitive.kind === "frame") && logoShape === "triangle" ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
            background: primitive.kind === "text" ? undefined : primitive.resolvedColor,
            color: primitive.resolvedColor,
            opacity: primitive.opacity,
            transform: `translateX(${primitive.translateX}%) scale(${primitive.scale})`,
            transformOrigin: "center center",
            display: primitive.kind === "text" ? "flex" : "block",
            alignItems: "center",
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontFamily: `"${primitive.fontFamily}", Inter, Arial, sans-serif`,
            fontSize: primitive.fontSize ? `${primitive.fontSize * (layerPixelWidth / 640)}px` : undefined,
            fontWeight: primitive.fontWeight,
            letterSpacing: primitive.letterSpacing,
            }}
          >
            {primitive.kind === "text" ? primitive.resolvedText : null}
            {primitive.kind === "logo" && logoSrc ? (
              <Img
                src={logoSrc}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: layer.lowerThird?.logo?.objectFit || "contain",
                  display: "block",
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function TransitionLayer({ transition, currentTime }: { transition: PixoresTransition; currentTime: number }) {
  const rawProgress = Math.min(1, Math.max(0, (currentTime - transition.start) / Math.max(transition.duration, 0.1)));
  const progress = applyEasing(rawProgress, transition.easing);
  const middleAlpha = Math.sin(progress * Math.PI);
  const color = transition.type === "fadeWhite" ? "#ffffff" : transition.color || "#000000";
  const baseStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity: middleAlpha,
    pointerEvents: "none",
  };

  if (transition.type === "wipeLeft") {
    return <div style={{ ...baseStyle, opacity: 0.86, background: color, width: `${progress * 100}%` }} />;
  }

  if (transition.type === "wipeRight") {
    return <div style={{ ...baseStyle, opacity: 0.86, background: color, left: `${(1 - progress) * 100}%` }} />;
  }

  if (transition.type === "wipeUp") {
    return <div style={{ ...baseStyle, opacity: 0.86, background: color, top: `${(1 - progress) * 100}%` }} />;
  }

  if (transition.type === "wipeDown") {
    return <div style={{ ...baseStyle, opacity: 0.86, background: color, height: `${progress * 100}%` }} />;
  }

  if (transition.type === "slideLeft") {
    return <div style={{ ...baseStyle, opacity: 0.78, background: color, transform: `translateX(${(1 - progress) * 100}%)` }} />;
  }

  if (transition.type === "slideRight") {
    return <div style={{ ...baseStyle, opacity: 0.78, background: color, transform: `translateX(${(-1 + progress) * 100}%)` }} />;
  }

  if (transition.type === "slideUp") {
    return <div style={{ ...baseStyle, opacity: 0.78, background: color, transform: `translateY(${(1 - progress) * 100}%)` }} />;
  }

  if (transition.type === "slideDown") {
    return <div style={{ ...baseStyle, opacity: 0.78, background: color, transform: `translateY(${(-1 + progress) * 100}%)` }} />;
  }

  if (transition.type === "zoomFlash") {
    return (
      <div
        style={{
          ...baseStyle,
          background: `radial-gradient(circle, ${color} 0%, ${color} 18%, transparent ${55 + progress * 35}%)`,
          opacity: middleAlpha * 0.9,
          transform: `scale(${0.85 + progress * 0.3})`,
        }}
      />
    );
  }

  if (transition.type === "radialReveal") {
    return <div style={{ ...baseStyle, opacity: 0.78, background: color, clipPath: `circle(${progress * 75}% at 50% 50%)` }} />;
  }

  if (transition.type === "diagonalWipe") {
    const edge = progress * 145 - 22;
    return <div style={{ ...baseStyle, opacity: 0.82, background: color, clipPath: `polygon(0 0, ${edge + 28}% 0, ${edge}% 100%, 0 100%)` }} />;
  }

  if (transition.type === "splitReveal") {
    return <div style={{ ...baseStyle, opacity: 0.82, background: color, clipPath: `inset(0 ${(1 - progress) * 50}%)` }} />;
  }

  if (transition.type === "rotateClockwise") {
    return <div style={{ ...baseStyle, opacity: middleAlpha * 0.72, background: color, transform: `rotate(${progress * 135}deg) scaleX(0.09)` }} />;
  }

  if (transition.type === "blurDissolve") {
    return <div style={{ ...baseStyle, opacity: middleAlpha * 0.5, background: color, filter: "blur(24px)", transform: "scale(1.08)" }} />;
  }

  if (transition.type === "glitch") {
    const offset = Math.sin(progress * 80) * 7;
    return (
      <div
        style={{
          ...baseStyle,
          opacity: middleAlpha * 0.75,
          transform: `translateX(${offset}px)`,
          background: "repeating-linear-gradient(0deg, transparent 0 7px, rgba(34,211,238,.72) 7px 10px, transparent 10px 16px, rgba(240,0,184,.55) 16px 18px)",
          mixBlendMode: "screen",
        }}
      />
    );
  }

  return <div style={{ ...baseStyle, background: color }} />;
}

function RenderVisualMediaLayer({
  project,
  layer,
  localTime,
  sourceOffset,
  renderDuration,
  opacity = 1,
  wrapperStyle,
}: {
  project: PixoresVideoProject;
  layer: PixoresVideoLayer;
  localTime: number;
  sourceOffset: number;
  renderDuration: number;
  opacity?: number;
  wrapperStyle?: CSSProperties;
}) {
  const { fps } = useVideoConfig();
  const mediaLayer = { ...layer, start: 0 };
  const style = layerBoxStyle(project, mediaLayer, localTime);
  const layerOpacity = typeof style.opacity === "number" ? style.opacity : 1;
  const segmentStyle = {
    ...style,
    opacity: layerOpacity * opacity,
  };
  const mediaStyle = mediaCropStyle(layer, localTime);

  if (layer.type !== "media" || (layer.mediaKind !== "image" && layer.mediaKind !== "video")) return null;

  const content = (() => {
    if (layer.mediaKind === "image") {
      const src = resolveMediaSrc(project, layer);
      return src ? <div style={segmentStyle}><MediaEffectWrapper layer={layer}><Img src={src} style={mediaStyle} /></MediaEffectWrapper></div> : null;
    }

    const src = resolveMediaSrc(project, layer);
    if (!src) return null;
    const sourceStart = getLayerSourceStart(layer) + Math.max(0, sourceOffset);
    const startFrom = Math.round(sourceStart * fps);
    const endAt = Math.round((sourceStart + Math.max(renderDuration, 0.05)) * fps);
    return (
      <div style={segmentStyle}>
        <MediaEffectWrapper layer={layer}>
          <RenderVideoSource
            layer={layer}
            src={src}
            startFrom={startFrom}
            endAt={endAt}
            muted
            style={mediaStyle}
          />
        </MediaEffectWrapper>
      </div>
    );
  })();

  if (!content || !wrapperStyle) return content;
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...wrapperStyle }}>{content}</div>;
}

function RenderTransitionBridge({
  project,
  layer,
  currentTime,
}: {
  project: PixoresVideoProject;
  layer: PixoresVideoLayer;
  currentTime: number;
}) {
  const fromLayer = project.layers.find((item) => item.id === layer.fromLayerId);
  const toLayer = project.layers.find((item) => item.id === layer.toLayerId);

  if (!fromLayer || !toLayer || !isActiveLayer(layer, layer.start + currentTime)) return null;

  const transitionType = layer.transitionKind || "fade";
  const rawProgress = Math.min(1, Math.max(0, currentTime / Math.max(layer.duration, 0.1)));
  const progress = applyEasing(rawProgress, layer.easing || "easeInOut");
  const fromOffset = Math.max(0, layer.start - fromLayer.start);
  const toOffset = Math.max(0, layer.start - toLayer.start);
  const fromLocalTime = fromOffset + currentTime;
  const toLocalTime = toOffset + currentTime;

  if (transitionType === "fadeBlack" || transitionType === "fadeWhite") {
    const outgoingOpacity = Math.max(0, 1 - progress * 2);
    const incomingOpacity = Math.max(0, progress * 2 - 1);
    const dipColor = transitionType === "fadeWhite" ? "#ffffff" : "#000000";
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} opacity={outgoingOpacity} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} opacity={incomingOpacity} />
        <div style={{ position: "absolute", inset: 0, background: dipColor, opacity: Math.sin(progress * Math.PI), pointerEvents: "none" }} />
      </>
    );
  }

  if (transitionType === "wipeLeft" || transitionType === "wipeRight") {
    const toClipPath = transitionType === "wipeLeft"
      ? `inset(0 ${100 - progress * 100}% 0 0)`
      : `inset(0 0 0 ${100 - progress * 100}%)`;

    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} wrapperStyle={{ clipPath: toClipPath }} />
      </>
    );
  }

  if (transitionType === "wipeUp" || transitionType === "wipeDown") {
    const toClipPath = transitionType === "wipeUp"
      ? `inset(${100 - progress * 100}% 0 0 0)`
      : `inset(0 0 ${100 - progress * 100}% 0)`;
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} wrapperStyle={{ clipPath: toClipPath }} />
      </>
    );
  }

  if (transitionType === "slideLeft" || transitionType === "slideRight") {
    const direction = transitionType === "slideLeft" ? 1 : -1;
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} wrapperStyle={{ transform: `translateX(${-direction * progress * 100}%)` }} />
        <RenderVisualMediaLayer
          project={project}
          layer={toLayer}
          localTime={toLocalTime}
          sourceOffset={toOffset}
          renderDuration={layer.duration}
          wrapperStyle={{ transform: `translateX(${direction * (1 - progress) * 100}%)` }}
        />
      </>
    );
  }

  if (transitionType === "slideUp" || transitionType === "slideDown") {
    const direction = transitionType === "slideUp" ? 1 : -1;
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} wrapperStyle={{ transform: `translateY(${-direction * progress * 100}%)` }} />
        <RenderVisualMediaLayer
          project={project}
          layer={toLayer}
          localTime={toLocalTime}
          sourceOffset={toOffset}
          renderDuration={layer.duration}
          wrapperStyle={{ transform: `translateY(${direction * (1 - progress) * 100}%)` }}
        />
      </>
    );
  }

  if (transitionType === "cubeLeft" || transitionType === "cubeRight") {
    const direction = transitionType === "cubeLeft" ? -1 : 1;
    return (
      <div style={{ position: "absolute", inset: 0, perspective: 1400, overflow: "hidden", background: "#020617" }}>
        <RenderVisualMediaLayer
          project={project}
          layer={fromLayer}
          localTime={fromLocalTime}
          sourceOffset={fromOffset}
          renderDuration={layer.duration}
          opacity={Math.max(0, 1 - progress * 0.72)}
          wrapperStyle={{ transformOrigin: direction < 0 ? "left center" : "right center", transform: `perspective(1400px) rotateY(${direction * progress * 90}deg)`, backfaceVisibility: "hidden" }}
        />
        <RenderVisualMediaLayer
          project={project}
          layer={toLayer}
          localTime={toLocalTime}
          sourceOffset={toOffset}
          renderDuration={layer.duration}
          opacity={Math.min(1, 0.28 + progress * 0.72)}
          wrapperStyle={{ transformOrigin: direction < 0 ? "right center" : "left center", transform: `perspective(1400px) rotateY(${direction * (progress - 1) * 90}deg)`, backfaceVisibility: "hidden" }}
        />
      </div>
    );
  }

  if (transitionType === "flipHorizontal" || transitionType === "flipVertical") {
    const isHorizontal = transitionType === "flipHorizontal";
    const firstHalf = progress < 0.5;
    const halfProgress = firstHalf ? progress * 2 : (progress - 0.5) * 2;
    const fromTransform = isHorizontal
      ? `perspective(1400px) rotateY(${halfProgress * 90}deg)`
      : `perspective(1400px) rotateX(${-halfProgress * 90}deg)`;
    const toTransform = isHorizontal
      ? `perspective(1400px) rotateY(${-90 + halfProgress * 90}deg)`
      : `perspective(1400px) rotateX(${90 - halfProgress * 90}deg)`;
    return firstHalf ? (
      <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} wrapperStyle={{ transform: fromTransform, backfaceVisibility: "hidden" }} />
    ) : (
      <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} wrapperStyle={{ transform: toTransform, backfaceVisibility: "hidden" }} />
    );
  }

  if (transitionType === "pageTurnLeft" || transitionType === "pageTurnRight") {
    const direction = transitionType === "pageTurnLeft" ? -1 : 1;
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} />
        <RenderVisualMediaLayer
          project={project}
          layer={fromLayer}
          localTime={fromLocalTime}
          sourceOffset={fromOffset}
          renderDuration={layer.duration}
          opacity={1 - progress * 0.35}
          wrapperStyle={{ transformOrigin: direction < 0 ? "left center" : "right center", transform: `perspective(1500px) rotateY(${direction * progress * 98}deg)`, filter: `brightness(${1 - progress * 0.48}) drop-shadow(${direction * -18}px 0 18px rgba(0,0,0,.42))`, backfaceVisibility: "hidden" }}
        />
      </>
    );
  }

  if (transitionType === "doorOpen") {
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} />
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} wrapperStyle={{ clipPath: "inset(0 50% 0 0)", transform: `translateX(${-progress * 50}%)`, filter: `brightness(${1 - progress * 0.35})` }} />
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} wrapperStyle={{ clipPath: "inset(0 0 0 50%)", transform: `translateX(${progress * 50}%)`, filter: `brightness(${1 - progress * 0.35})` }} />
      </>
    );
  }

  if (transitionType === "zoomTunnel") {
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} opacity={1 - progress} wrapperStyle={{ transform: `scale(${1 + progress * 2.1})`, filter: `blur(${progress * 12}px)` }} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} opacity={progress} wrapperStyle={{ transform: `scale(${0.25 + progress * 0.75})`, filter: `blur(${(1 - progress) * 10}px)` }} />
      </>
    );
  }

  if (transitionType === "zoomFlash") {
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} opacity={1 - progress} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} opacity={progress} />
        <TransitionLayer
          transition={{
            id: layer.id,
            type: transitionType,
            start: 0,
            duration: layer.duration,
            color: layer.color,
            easing: layer.easing || "easeInOut",
          }}
          currentTime={currentTime}
        />
      </>
    );
  }

  if (transitionType === "zoomIn") {
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} opacity={1 - progress} wrapperStyle={{ transform: `scale(${1 + progress * 0.18})` }} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} opacity={progress} wrapperStyle={{ transform: `scale(${1.35 - progress * 0.35})` }} />
      </>
    );
  }

  if (transitionType === "zoomOut") {
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} opacity={1 - progress} wrapperStyle={{ transform: `scale(${1 - progress * 0.35})` }} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} opacity={progress} wrapperStyle={{ transform: `scale(${0.82 + progress * 0.18})` }} />
      </>
    );
  }

  if (transitionType === "rotateClockwise") {
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} opacity={1 - progress} wrapperStyle={{ transform: `rotate(${progress * 14}deg) scale(${1 + progress * 0.12})` }} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} opacity={progress} wrapperStyle={{ transform: `rotate(${-18 * (1 - progress)}deg) scale(${0.78 + progress * 0.22})` }} />
      </>
    );
  }

  if (transitionType === "blurDissolve") {
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} opacity={1 - progress} wrapperStyle={{ filter: `blur(${progress * 24}px)`, transform: "scale(1.04)" }} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} opacity={progress} wrapperStyle={{ filter: `blur(${(1 - progress) * 24}px)`, transform: "scale(1.04)" }} />
      </>
    );
  }

  if (transitionType === "radialReveal") {
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} wrapperStyle={{ clipPath: `circle(${progress * 75}% at 50% 50%)` }} />
      </>
    );
  }

  if (transitionType === "diagonalWipe") {
    const edge = progress * 145 - 22;
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} wrapperStyle={{ clipPath: `polygon(0 0, ${edge + 28}% 0, ${edge}% 100%, 0 100%)` }} />
      </>
    );
  }

  if (transitionType === "splitReveal") {
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} wrapperStyle={{ clipPath: `inset(0 ${(1 - progress) * 50}%)` }} />
      </>
    );
  }

  if (transitionType === "glitch") {
    const jitter = Math.sin(progress * 80) * 1.2 * Math.sin(progress * Math.PI);
    const hue = Math.round((1 - progress) * 80);
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} opacity={1 - progress} wrapperStyle={{ transform: `translateX(${-jitter}%) scale(1.015)`, filter: `saturate(1.6) hue-rotate(${hue}deg)` }} />
        <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} opacity={progress} wrapperStyle={{ transform: `translateX(${jitter}%) scale(1.015)`, filter: `saturate(1.7) hue-rotate(${-hue}deg)` }} />
        <TransitionLayer transition={{ id: layer.id, type: transitionType, start: 0, duration: layer.duration, color: layer.color, easing: layer.easing || "easeInOut" }} currentTime={currentTime} />
      </>
    );
  }

  return (
    <>
      <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} opacity={1 - progress} />
      <RenderVisualMediaLayer project={project} layer={toLayer} localTime={toLocalTime} sourceOffset={toOffset} renderDuration={layer.duration} opacity={progress} />
    </>
  );
}

function RenderLayer({ project, layer, currentTime }: { project: PixoresVideoProject; layer: PixoresVideoLayer; currentTime: number }) {
  const { fps } = useVideoConfig();
  if (!isActiveLayer(layer, currentTime)) return null;
  if (layer.type === "transition") {
    return (
      <TransitionLayer
        transition={{
          id: layer.id,
          type: layer.transitionKind || "fade",
          start: 0,
          duration: layer.duration,
          color: layer.color,
          fromLayerId: layer.fromLayerId,
          toLayerId: layer.toLayerId,
          easing: layer.easing || "easeInOut",
        }}
        currentTime={currentTime}
      />
    );
  }

  const style = layerBoxStyle(project, layer, currentTime);

  if (layer.type === "media" && layer.mediaKind === "image") {
    const src = resolveMediaSrc(project, layer);
    if (!src) return null;

    return <div style={style}><MediaEffectWrapper layer={layer}><Img src={src} style={mediaCropStyle(layer, currentTime)} /></MediaEffectWrapper></div>;
  }

  if (layer.type === "media" && layer.mediaKind === "video") {
    const src = resolveMediaSrc(project, layer);
    if (!src) return null;
    const startFrom = Math.round(getLayerSourceStart(layer) * fps);
    const endAt = Math.round((getLayerSourceStart(layer) + layer.duration) * fps);
    return (
      <div style={style}>
        <MediaEffectWrapper layer={layer}>
          <RenderVideoSource
            layer={layer}
            src={src}
            startFrom={startFrom}
            endAt={endAt}
            muted
            style={mediaCropStyle(layer, currentTime)}
          />
        </MediaEffectWrapper>
      </div>
    );
  }

  if (layer.type === "audio") {
    const src = resolveMediaSrc(project, layer);
    if (!src) return null;
    const startFrom = Math.round(getLayerSourceStart(layer) * fps);
    const endAt = Math.round((getLayerSourceStart(layer) + layer.duration) * fps);

    return <Audio src={src} startFrom={startFrom} endAt={endAt} volume={getRenderVolumeProp(layer, fps)} />;
  }

  if (layer.type === "text") {
    const resolvedTextStyle = resolvePixoresTextStyle(layer, project.canvas.width);
    const textEffect = layer.textEffectPreset || "none";
    const scale = resolvedTextStyle.scale;
    const shadows = [];
    if (textEffect === "echo") shadows.push(`${7 * scale}px ${7 * scale}px 0 rgba(139, 92, 246, 0.38)`, `${14 * scale}px ${14 * scale}px 0 rgba(139, 92, 246, 0.2)`);
    if (textEffect === "glitch") shadows.push(`${-4 * scale}px 0 #22d3ee`, `${4 * scale}px 0 #f000b8`);
    if (textEffect === "splice") shadows.push(`${7 * scale}px ${7 * scale}px 0 #8b5cf6`);
    if (textEffect === "neon") shadows.push(`0 0 ${6 * scale}px ${layer.glowColor || "#a855f7"}`, `0 0 ${resolvedTextStyle.glowRadius || 26 * scale}px ${layer.glowColor || "#a855f7"}`);
    else if (resolvedTextStyle.glowRadius > 0) shadows.push(`0 0 ${resolvedTextStyle.glowRadius}px ${layer.glowColor || "#22d3ee"}`);
    const shadowColor = layer.shadowColor
      ? hexToRgba(layer.shadowColor, layer.shadowOpacity ?? 0.6)
      : "rgba(0, 0, 0, 0.36)";
    if (resolvedTextStyle.shadowBlur > 0 || resolvedTextStyle.shadowOffsetX || resolvedTextStyle.shadowOffsetY) {
      shadows.push(`${resolvedTextStyle.shadowOffsetX}px ${resolvedTextStyle.shadowOffsetY}px ${resolvedTextStyle.shadowBlur}px ${shadowColor}`);
    }
    const effectTextShadow = shadows.join(", ") || undefined;
    const textEffectStyle: CSSProperties = {
      display: "inline-block",
      maxWidth: "100%",
      boxSizing: "border-box",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      backgroundColor: layer.hasTextBg ? layer.textBgColor || "#8b5cf6" : undefined,
      padding: layer.hasTextBg ? `${resolvedTextStyle.textBgPadding}px` : undefined,
      borderRadius: layer.hasTextBg ? `${resolvedTextStyle.textBgRadius}px` : undefined,
      WebkitTextStroke: (layer.strokeWidth || 0) > 0
        ? `${resolvedTextStyle.strokeWidth}px ${hexToRgba(layer.strokeColor || "#000000", layer.strokeOpacity ?? 1)}`
        : undefined,
      WebkitTextFillColor: textEffect === "hollow" ? "transparent" : undefined,
      paintOrder: "stroke fill",
      textShadow: effectTextShadow,
    };
    const displayText = layer.isUppercase ? layer.text?.toUpperCase() : layer.text;
    const renderedText = textEffect === "curve" ? (() => {
      const characters = Array.from(displayText || "");
      const curve = layer.textCurve ?? -30;
      const characterCount = Math.max(1, characters.length - 1);
      return (
        <span style={{ display: "inline-flex", paddingTop: curve < 0 ? `${Math.abs(curve)}px` : undefined }}>
          {characters.map((character, characterIndex) => {
            const normalizedX = (characterIndex / characterCount) * 2 - 1;
            const curveY = curve * (1 - normalizedX * normalizedX);
            const angle = Math.atan((-2 * curve * normalizedX) / Math.max(60, characters.length * 12)) * (180 / Math.PI);
            return <span key={`${characterIndex}-${character}`} style={{ display: "inline-block", transform: `translateY(${curveY}px) rotate(${angle}deg)`, transformOrigin: "center bottom" }}>{character === " " ? "\u00a0" : character}</span>;
          })}
        </span>
      );
    })() : displayText;
    return <div style={style}><span style={textEffectStyle}>{renderedText}</span></div>;
  }

  if (layer.type === "lower-third") {
    return <div style={style}><LowerThirdLayer project={project} layer={layer} currentTime={currentTime} /></div>;
  }

  if (layer.type === "shape") {
    return (
      <div style={style}>
        <ShapeLayer project={project} layer={layer} currentTime={currentTime} />
      </div>
    );
  }

  return null;
}

function VideoLayerAudio({ project, layer }: { project: PixoresVideoProject; layer: PixoresVideoLayer }) {
  const { fps } = useVideoConfig();
  if (layer.type !== "media" || layer.mediaKind !== "video" || layer.audioDetached) return null;
  const src = resolveMediaSrc(project, layer);
  const volume = getRenderVolume(layer);
  if (!src || volume <= 0) return null;
  const sourceStart = getLayerSourceStart(layer);
  return (
    <Audio
      src={src}
      startFrom={Math.round(sourceStart * fps)}
      endAt={Math.round((sourceStart + layer.duration) * fps)}
      volume={getRenderVolumeProp(layer, fps)}
    />
  );
}

export default function PixoresComposition({ project }: PixoresCompositionProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  const embeddedMediaLayerIds = new Set(
    project.layers
      .filter(isRenderMediaContainer)
      .flatMap((layer) => layer.frameMediaLayerIds || []),
  );
  const projectLayerIds = new Set(project.layers.map((layer) => layer.id));
  const recoveredTransitionLayers: PixoresVideoLayer[] = (project.transitions || []).flatMap((transition) => {
    if (projectLayerIds.has(transition.id)) return [];
    const linkedLayer = project.layers.find((layer) => layer.id === transition.fromLayerId)
      || project.layers.find((layer) => layer.id === transition.toLayerId);
    return [{
      id: transition.id,
      trackId: linkedLayer?.trackId || `transition-track-${transition.id}`,
      type: "transition",
      name: "Transition",
      start: transition.start,
      duration: transition.duration,
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      color: transition.color,
      transitionKind: transition.type,
      fromLayerId: transition.fromLayerId,
      toLayerId: transition.toLayerId,
      cutTime: transition.cutTime,
      easing: transition.easing,
    }];
  });
  const allProjectLayers = recoveredTransitionLayers.length
    ? [...project.layers, ...recoveredTransitionLayers]
    : project.layers;
  const renderProject = allProjectLayers === project.layers ? project : { ...project, layers: allProjectLayers };
  const visualLayers = getOrderedRenderLayers(allProjectLayers.filter((layer) => (
    layer.type !== "transition" && !embeddedMediaLayerIds.has(layer.id)
  )));
  const transitionLayers = allProjectLayers.filter((layer) => layer.type === "transition");

  return (
    <div
      style={{
        position: "relative",
        width: project.canvas.width,
        height: project.canvas.height,
        background: project.background,
        overflow: "hidden",
      }}
    >
      <PixoresFontGate project={project} />
      {visualLayers.map((layer) => {
        if (shouldSuppressBaseLayerForTransition(layer, transitionLayers, currentTime)) return null;
        return (
          <Sequence
            key={layer.id}
            from={Math.max(0, Math.round(layer.start * fps))}
            durationInFrames={Math.max(1, Math.round(layer.duration * fps))}
          >
            <RenderLayer project={renderProject} layer={{ ...layer, start: 0 }} currentTime={Math.max(0, currentTime - layer.start)} />
          </Sequence>
        );
      })}
      {transitionLayers.map((layer) => (
        <Sequence
          key={layer.id}
          from={Math.max(0, Math.round(layer.start * fps))}
          durationInFrames={Math.max(1, Math.round(layer.duration * fps))}
        >
          <RenderTransitionBridge project={renderProject} layer={layer} currentTime={Math.max(0, currentTime - layer.start)} />
        </Sequence>
      ))}
      {project.layers
        .filter((layer) => layer.type === "media" && layer.mediaKind === "video" && !layer.audioDetached)
        .map((layer) => (
          <Sequence
            key={`audio-${layer.id}`}
            from={Math.max(0, Math.round(layer.start * fps))}
            durationInFrames={Math.max(1, Math.round(layer.duration * fps))}
          >
            <VideoLayerAudio project={renderProject} layer={layer} />
          </Sequence>
        ))}
    </div>
  );
}
