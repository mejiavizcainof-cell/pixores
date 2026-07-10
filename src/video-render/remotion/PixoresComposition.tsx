import type { CSSProperties } from "react";
import { Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig, OffthreadVideo } from "remotion";
import type { PixoresKeyframe, PixoresTransition, PixoresVideoLayer, PixoresVideoProject } from "../types";

/**
 * Remotion-facing composition adapter for Pixores projects.
 *
 * Phase 13 renders persistent image/video media plus audio layers. Video
 * layers remain muted unless a layer volume is explicitly provided.
 */

type PixoresCompositionProps = {
  project: PixoresVideoProject;
};

type AnimatedStyle = {
  opacityMultiplier: number;
  translateX: number;
  translateY: number;
  scale: number;
};

function getAnimationStyle(layer: PixoresVideoLayer, currentTime: number): AnimatedStyle {
  return (layer.animations || []).reduce<AnimatedStyle>((style, animation) => {
    const progress = interpolate(
      currentTime,
      [animation.start, animation.start + Math.max(animation.duration, 0.05)],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    if (animation.type === "fadeIn") return { ...style, opacityMultiplier: style.opacityMultiplier * progress };
    if (animation.type === "fadeOut") return { ...style, opacityMultiplier: style.opacityMultiplier * (1 - progress) };
    if (animation.type === "slideInLeft") return { ...style, translateX: style.translateX + interpolate(progress, [0, 1], [-18, 0]) };
    if (animation.type === "slideInRight") return { ...style, translateX: style.translateX + interpolate(progress, [0, 1], [18, 0]) };
    if (animation.type === "slideInUp") return { ...style, translateY: style.translateY + interpolate(progress, [0, 1], [-18, 0]) };
    if (animation.type === "slideInDown") return { ...style, translateY: style.translateY + interpolate(progress, [0, 1], [18, 0]) };
    if (animation.type === "zoomIn") return { ...style, scale: style.scale * interpolate(progress, [0, 1], [0.72, 1]) };
    if (animation.type === "zoomOut") return { ...style, scale: style.scale * interpolate(progress, [0, 1], [1.18, 1]) };
    if (animation.type === "pop") {
      const popScale = progress < 0.72
        ? interpolate(progress, [0, 0.72], [0.45, 1.12])
        : interpolate(progress, [0.72, 1], [1.12, 1]);
      return { ...style, opacityMultiplier: style.opacityMultiplier * progress, scale: style.scale * popScale };
    }

    return style;
  }, { opacityMultiplier: 1, translateX: 0, translateY: 0, scale: 1 });
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

function layerBoxStyle(project: PixoresVideoProject, layer: PixoresVideoLayer, currentTime: number): CSSProperties {
  const animationStyle = getAnimationStyle(layer, currentTime);
  const x = getKeyframedLayerValue(layer, "x", currentTime);
  const y = getKeyframedLayerValue(layer, "y", currentTime);
  const opacity = getKeyframedLayerValue(layer, "opacity", currentTime);
  const angle = getKeyframedLayerValue(layer, "angle", currentTime);
  const transforms = [
    `translate(${animationStyle.translateX}%, ${animationStyle.translateY}%)`,
    `scale(${animationStyle.scale})`,
    angle ? `rotate(${angle}deg)` : "",
  ].filter(Boolean).join(" ");

  return {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    width: `${layer.width}%`,
    height: `${layer.height}%`,
    opacity: opacity * animationStyle.opacityMultiplier,
    transform: transforms || undefined,
    transformOrigin: "center center",
    overflow: "hidden",
    borderRadius: layer.borderRadius,
    pointerEvents: "none",
    color: layer.color,
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize ? `${(layer.fontSize / project.canvas.height) * 100}vh` : undefined,
    fontWeight: layer.isBold ? 800 : undefined,
    fontStyle: layer.isItalic ? "italic" : undefined,
    textDecoration: [
      layer.isUnderline ? "underline" : "",
      layer.isStrikethrough ? "line-through" : "",
    ].filter(Boolean).join(" ") || undefined,
    textAlign: layer.textAlign,
    lineHeight: layer.lineHeight,
    letterSpacing: layer.letterSpacing,
  };
}

function isActiveLayer(layer: PixoresVideoLayer, currentTime: number) {
  return layer.visible && currentTime >= layer.start && currentTime <= layer.start + layer.duration;
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

function applyEasing(progress: number, easing: PixoresTransition["easing"] = "easeInOut") {
  if (easing === "linear") return progress;
  if (easing === "easeIn") return progress * progress;
  if (easing === "easeOut") return 1 - ((1 - progress) * (1 - progress));
  return progress < 0.5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2;
}

function resolveMediaSrc(project: PixoresVideoProject, layer: PixoresVideoLayer) {
  const layerSrc = layer.src;
  const assetSrc = layer.assetKey
    ? project.assets.find((asset) => asset.id === layer.assetKey)?.persistentUrl
      || project.assets.find((asset) => asset.id === layer.assetKey)?.url
    : undefined;
  const src = layerSrc || assetSrc || "";

  if (!src || src.startsWith("blob:")) return "";
  if (src.startsWith("/")) return staticFile(src.slice(1));
  return src;
}

function ShapeLayer({ layer }: { layer: PixoresVideoLayer }) {
  const fill = layer.shapeType === "gradient"
    ? `linear-gradient(135deg, ${layer.gradientColor1 || layer.color || "#2563eb"}, ${layer.gradientColor2 || "#ffffff"})`
    : layer.color || "#2563eb";

  if (layer.shapeType === "circle") {
    return <div style={{ width: "100%", height: "100%", borderRadius: "999px", background: fill }} />;
  }

  if (layer.shapeType?.includes("Frame") || layer.shapeType?.startsWith("grid")) {
    return <div style={{ width: "100%", height: "100%", border: `${layer.strokeWidth || 8}px solid ${layer.color || "#ffffff"}` }} />;
  }

  return <div style={{ width: "100%", height: "100%", background: fill }} />;
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

  if (transition.type === "slideLeft") {
    return <div style={{ ...baseStyle, opacity: 0.78, background: color, transform: `translateX(${(1 - progress) * 100}%)` }} />;
  }

  if (transition.type === "slideRight") {
    return <div style={{ ...baseStyle, opacity: 0.78, background: color, transform: `translateX(${(-1 + progress) * 100}%)` }} />;
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
  const mediaStyle = {
    ...style,
    opacity: layerOpacity * opacity,
    objectFit: layer.objectFit || "cover",
  };

  if (layer.type !== "media" || (layer.mediaKind !== "image" && layer.mediaKind !== "video")) return null;

  const content = (() => {
    if (layer.mediaKind === "image") {
      const src = resolveMediaSrc(project, layer);
      return src ? <Img src={src} style={mediaStyle} /> : null;
    }

    const src = resolveMediaSrc(project, layer);
    if (!src) return null;
    const sourceStart = getLayerSourceStart(layer) + Math.max(0, sourceOffset);
    const startFrom = Math.round(sourceStart * fps);
    const endAt = Math.round((sourceStart + Math.max(renderDuration, 0.05)) * fps);

    return (
      <OffthreadVideo
        src={src}
        startFrom={startFrom}
        endAt={endAt}
        muted
        style={mediaStyle}
      />
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

  if (!fromLayer || !toLayer || !isActiveLayer(layer, layer.start + currentTime)) {
    return <RenderLayer project={project} layer={{ ...layer, start: 0 }} currentTime={currentTime} />;
  }

  const transitionType = layer.transitionKind || "fade";
  const rawProgress = Math.min(1, Math.max(0, currentTime / Math.max(layer.duration, 0.1)));
  const progress = applyEasing(rawProgress, layer.easing || "easeInOut");
  const fromOffset = Math.max(0, layer.start - fromLayer.start);
  const toOffset = Math.max(0, layer.start - toLayer.start);
  const fromLocalTime = fromOffset + currentTime;
  const toLocalTime = toOffset + currentTime;

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

  if (transitionType === "slideLeft" || transitionType === "slideRight") {
    const direction = transitionType === "slideLeft" ? 1 : -1;
    return (
      <>
        <RenderVisualMediaLayer project={project} layer={fromLayer} localTime={fromLocalTime} sourceOffset={fromOffset} renderDuration={layer.duration} />
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

    return <Img src={src} style={{ ...style, objectFit: layer.objectFit || "cover" }} />;
  }

  if (layer.type === "media" && layer.mediaKind === "video") {
    const src = resolveMediaSrc(project, layer);
    if (!src) return null;
    const startFrom = Math.round(getLayerSourceStart(layer) * fps);
    const endAt = Math.round((getLayerSourceStart(layer) + layer.duration) * fps);

    return (
      <OffthreadVideo
        src={src}
        startFrom={startFrom}
        endAt={endAt}
        muted={layer.volume === undefined || layer.volume <= 0}
        volume={layer.volume ?? 0}
        style={{ ...style, objectFit: layer.objectFit || "cover" }}
      />
    );
  }

  if (layer.type === "audio") {
    const src = resolveMediaSrc(project, layer);
    if (!src) return null;
    const startFrom = Math.round(getLayerSourceStart(layer) * fps);
    const endAt = Math.round((getLayerSourceStart(layer) + layer.duration) * fps);

    return <Audio src={src} startFrom={startFrom} endAt={endAt} volume={layer.volume ?? 1} />;
  }

  if (layer.type === "text") {
    return <div style={style}>{layer.isUppercase ? layer.text?.toUpperCase() : layer.text}</div>;
  }

  if (layer.type === "shape") {
    return (
      <div style={style}>
        <ShapeLayer layer={layer} />
      </div>
    );
  }

  return null;
}

export default function PixoresComposition({ project }: PixoresCompositionProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  const visualLayers = project.layers.filter((layer) => layer.type !== "transition");
  const transitionLayers = project.layers.filter((layer) => layer.type === "transition");

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
      {[...visualLayers].reverse().map((layer) => {
        if (shouldSuppressBaseLayerForTransition(layer, transitionLayers, currentTime)) return null;
        return (
          <Sequence
            key={layer.id}
            from={Math.max(0, Math.round(layer.start * fps))}
            durationInFrames={Math.max(1, Math.round(layer.duration * fps))}
          >
            <RenderLayer project={project} layer={{ ...layer, start: 0 }} currentTime={Math.max(0, currentTime - layer.start)} />
          </Sequence>
        );
      })}
      {transitionLayers.map((layer) => (
        <Sequence
          key={layer.id}
          from={Math.max(0, Math.round(layer.start * fps))}
          durationInFrames={Math.max(1, Math.round(layer.duration * fps))}
        >
          <RenderTransitionBridge project={project} layer={layer} currentTime={Math.max(0, currentTime - layer.start)} />
        </Sequence>
      ))}
    </div>
  );
}
