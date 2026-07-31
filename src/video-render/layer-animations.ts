export type LayerAnimationType =
  | "fadeIn"
  | "fadeOut"
  | "slideInLeft"
  | "slideInRight"
  | "slideInUp"
  | "slideInDown"
  | "zoomIn"
  | "zoomOut"
  | "pop"
  | "simple"
  | "neat"
  | "fun"
  | "party"
  | "corporate"
  | "chill"
  | "rise"
  | "pan"
  | "burst"
  | "wipe"
  | "breathe"
  | "baseline"
  | "drift"
  | "tectonic"
  | "drop"
  | "neon"
  | "scrapbook"
  | "stomp"
  | "block";

export type LayerAnimationLike = {
  type: LayerAnimationType;
  start: number;
  duration: number;
  phase?: "in" | "out";
  endOffset?: number;
};

export type LayerAnimationVisualStyle = {
  opacityMultiplier: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  skewX: number;
  blur: number;
  glow: number;
  reveal: number;
  revealOrigin: "left" | "center" | "bottom";
};

export type LayerAnimationPreset = {
  id: string;
  label: string;
  category: "presented" | "general";
  type: LayerAnimationType;
  description: string;
  duration: number;
  preview: "rise" | "pan" | "fade" | "burst" | "wipe" | "breathe" | "drift" | "drop" | "neon" | "block";
  glyph: string;
};

export const canvaAnimationPresets: LayerAnimationPreset[] = [
  { id: "simple", label: "Simple", category: "presented", type: "simple", description: "Soft entrance from below", duration: 0.75, preview: "rise", glyph: "↑" },
  { id: "neat", label: "Neat", category: "presented", type: "neat", description: "Clean and precise reveal", duration: 0.8, preview: "wipe", glyph: "—" },
  { id: "fun", label: "Fun", category: "presented", type: "fun", description: "Light bounce with rotation", duration: 0.9, preview: "burst", glyph: "↗" },
  { id: "party", label: "Party", category: "presented", type: "party", description: "Dynamic burst entrance", duration: 1, preview: "burst", glyph: "✦" },
  { id: "corporate", label: "Corporate", category: "presented", type: "corporate", description: "Subtle, polished entrance", duration: 0.7, preview: "fade", glyph: "▰" },
  { id: "chill", label: "Chill", category: "presented", type: "chill", description: "Relaxed sliding entrance", duration: 1.1, preview: "drift", glyph: "→" },
  { id: "rise", label: "Rise", category: "general", type: "rise", description: "Rises while appearing", duration: 0.75, preview: "rise", glyph: "↑" },
  { id: "pan", label: "Pan", category: "general", type: "pan", description: "Horizontal movement", duration: 0.9, preview: "pan", glyph: "→" },
  { id: "fade", label: "Fade", category: "general", type: "fadeIn", description: "Gradual appearance", duration: 0.8, preview: "fade", glyph: "◫" },
  { id: "burst", label: "Burst", category: "general", type: "burst", description: "Scale entrance with bounce", duration: 0.75, preview: "burst", glyph: "✦" },
  { id: "wipe", label: "Wipe", category: "general", type: "wipe", description: "Left-to-right reveal", duration: 0.8, preview: "wipe", glyph: "◐" },
  { id: "breathe", label: "Breathe", category: "general", type: "breathe", description: "Soft size pulse", duration: 1.6, preview: "breathe", glyph: "↗" },
  { id: "baseline", label: "Baseline", category: "general", type: "baseline", description: "Appears from a baseline", duration: 0.8, preview: "block", glyph: "▔" },
  { id: "drift", label: "Drift", category: "general", type: "drift", description: "Floats softly into place", duration: 1.4, preview: "drift", glyph: "→" },
  { id: "tectonic", label: "Tectonic", category: "general", type: "tectonic", description: "Impact vibration", duration: 0.85, preview: "drop", glyph: "↯" },
  { id: "drop", label: "Drop", category: "general", type: "drop", description: "Drops and bounces into place", duration: 0.85, preview: "drop", glyph: "↓" },
  { id: "neon", label: "Neon", category: "general", type: "neon", description: "Flicker and glow", duration: 1.2, preview: "neon", glyph: "✦" },
  { id: "scrapbook", label: "Scrapbook", category: "general", type: "scrapbook", description: "Angled collage entrance", duration: 0.95, preview: "burst", glyph: "▱" },
  { id: "stomp", label: "Stomp", category: "general", type: "stomp", description: "Strong impact with bounce", duration: 0.75, preview: "drop", glyph: "↓" },
  { id: "block", label: "Block", category: "general", type: "block", description: "Solid reveal from the center", duration: 0.8, preview: "block", glyph: "▮" },
];

export const legacyAnimationPresets: Array<{ label: string; type: LayerAnimationType }> = [
  { label: "Fade Out", type: "fadeOut" },
  { label: "Slide In Left", type: "slideInLeft" },
  { label: "Slide In Right", type: "slideInRight" },
  { label: "Slide In Up", type: "slideInUp" },
  { label: "Slide In Down", type: "slideInDown" },
  { label: "Zoom In", type: "zoomIn" },
  { label: "Zoom Out", type: "zoomOut" },
  { label: "Pop", type: "pop" },
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

function resolveSingleAnimationBase(animation: LayerAnimationLike, currentTime: number): LayerAnimationVisualStyle {
  const progress = clamp((currentTime - animation.start) / Math.max(0.05, animation.duration));
  const eased = easeOutCubic(progress);
  const remaining = 1 - eased;
  const base: LayerAnimationVisualStyle = {
    opacityMultiplier: 1,
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    skewX: 0,
    blur: 0,
    glow: 0,
    reveal: 1,
    revealOrigin: "left",
  };

  if (animation.type === "fadeIn") return { ...base, opacityMultiplier: progress };
  if (animation.type === "fadeOut") return { ...base, opacityMultiplier: 1 - progress };
  if (animation.type === "slideInLeft") return { ...base, translateX: lerp(-38, 0, eased), opacityMultiplier: progress };
  if (animation.type === "slideInRight") return { ...base, translateX: lerp(38, 0, eased), opacityMultiplier: progress };
  if (animation.type === "slideInUp") return { ...base, translateY: lerp(-38, 0, eased), opacityMultiplier: progress };
  if (animation.type === "slideInDown") return { ...base, translateY: lerp(38, 0, eased), opacityMultiplier: progress };
  if (animation.type === "zoomIn") return { ...base, scaleX: lerp(0.72, 1, eased), scaleY: lerp(0.72, 1, eased), opacityMultiplier: progress };
  if (animation.type === "zoomOut") return { ...base, scaleX: lerp(1.22, 1, eased), scaleY: lerp(1.22, 1, eased), opacityMultiplier: progress };

  if (animation.type === "pop" || animation.type === "burst") {
    const scale = progress < 0.7 ? lerp(0.35, 1.14, progress / 0.7) : lerp(1.14, 1, (progress - 0.7) / 0.3);
    return { ...base, scaleX: scale, scaleY: scale, rotate: -7 * remaining, opacityMultiplier: progress };
  }

  if (animation.type === "simple") return { ...base, translateY: 15 * remaining, opacityMultiplier: progress };
  if (animation.type === "neat") return { ...base, reveal: eased, opacityMultiplier: 0.35 + progress * 0.65 };
  if (animation.type === "fun") {
    const wave = Math.sin(progress * Math.PI * 2.5) * remaining;
    return { ...base, translateY: -12 * wave, rotate: 8 * wave, scaleX: 1 + 0.08 * wave, scaleY: 1 + 0.08 * wave, opacityMultiplier: progress };
  }
  if (animation.type === "party") {
    const wave = Math.sin(progress * Math.PI * 4) * remaining;
    return { ...base, rotate: 12 * wave, scaleX: lerp(0.42, 1, eased) + Math.max(0, wave) * 0.12, scaleY: lerp(0.42, 1, eased) + Math.max(0, wave) * 0.12, opacityMultiplier: progress, glow: 8 * remaining };
  }
  if (animation.type === "corporate") return { ...base, translateY: 8 * remaining, scaleX: 0.96 + eased * 0.04, scaleY: 0.96 + eased * 0.04, opacityMultiplier: progress };
  if (animation.type === "chill") return { ...base, translateX: -16 * remaining, blur: 7 * remaining, opacityMultiplier: progress };
  if (animation.type === "rise") return { ...base, translateY: 28 * remaining, opacityMultiplier: progress };
  if (animation.type === "pan") return { ...base, translateX: -36 * remaining, opacityMultiplier: 0.25 + progress * 0.75 };
  if (animation.type === "wipe") return { ...base, reveal: eased, opacityMultiplier: 1 };
  if (animation.type === "breathe") {
    const pulse = Math.sin(progress * Math.PI * 3) * Math.sin(progress * Math.PI);
    return { ...base, scaleX: 1 + pulse * 0.09, scaleY: 1 + pulse * 0.09, opacityMultiplier: 0.72 + progress * 0.28 };
  }
  if (animation.type === "baseline") return { ...base, reveal: eased, revealOrigin: "bottom", translateY: 10 * remaining, opacityMultiplier: progress };
  if (animation.type === "drift") return { ...base, translateX: -22 * remaining, translateY: -5 * Math.sin(progress * Math.PI), rotate: -3 * remaining, opacityMultiplier: progress };
  if (animation.type === "tectonic") {
    const shake = Math.sin(progress * Math.PI * 9) * remaining;
    return { ...base, translateX: shake * 8, translateY: Math.cos(progress * Math.PI * 7) * remaining * 3, rotate: shake * 2.5, opacityMultiplier: progress };
  }
  if (animation.type === "drop") {
    const translateY = progress < 0.72 ? lerp(-48, 5, progress / 0.72) : lerp(5, 0, (progress - 0.72) / 0.28);
    return { ...base, translateY, opacityMultiplier: progress };
  }
  if (animation.type === "neon") {
    const flicker = progress < 0.46 ? clamp(0.35 + Math.abs(Math.sin(progress * Math.PI * 12)) * 0.65) : 1;
    return { ...base, opacityMultiplier: flicker, glow: 7 + Math.sin(progress * Math.PI) ** 2 * 18 };
  }
  if (animation.type === "scrapbook") return { ...base, translateX: -12 * remaining, translateY: 10 * remaining, rotate: -13 * remaining, scaleX: lerp(0.62, 1, eased), scaleY: lerp(0.62, 1, eased), opacityMultiplier: progress };
  if (animation.type === "stomp") {
    const scale = progress < 0.68 ? lerp(1.62, 0.9, progress / 0.68) : lerp(0.9, 1, (progress - 0.68) / 0.32);
    return { ...base, translateY: -18 * remaining, scaleX: scale, scaleY: scale, opacityMultiplier: progress };
  }
  if (animation.type === "block") return { ...base, reveal: eased, revealOrigin: "center", scaleY: 0.92 + eased * 0.08, opacityMultiplier: 1 };

  return base;
}

function resolveSingleAnimation(animation: LayerAnimationLike, currentTime: number, layerDuration: number): LayerAnimationVisualStyle {
  if ((animation.phase || "in") !== "out") return resolveSingleAnimationBase(animation, currentTime);

  const endOffset = Math.max(0, animation.endOffset || 0);
  const exitStart = Math.max(0, layerDuration - endOffset - Math.max(0.05, animation.duration));
  const exitProgress = clamp((currentTime - exitStart) / Math.max(0.05, animation.duration));
  const reversedProgress = 1 - exitProgress;
  const reversedAnimation: LayerAnimationLike = {
    ...animation,
    type: animation.type === "fadeOut" ? "fadeIn" : animation.type,
    phase: "in",
    start: 0,
    duration: 1,
  };
  const style = resolveSingleAnimationBase(reversedAnimation, reversedProgress);
  return {
    ...style,
    opacityMultiplier: style.opacityMultiplier * reversedProgress,
  };
}

export function resolveLayerAnimationStyle(
  animations: readonly LayerAnimationLike[] | undefined,
  currentTime: number,
  layerDuration = Number.POSITIVE_INFINITY,
): LayerAnimationVisualStyle {
  return (animations || []).reduce<LayerAnimationVisualStyle>((style, animation) => {
    const next = resolveSingleAnimation(animation, currentTime, layerDuration);
    return {
      opacityMultiplier: style.opacityMultiplier * next.opacityMultiplier,
      translateX: style.translateX + next.translateX,
      translateY: style.translateY + next.translateY,
      scaleX: style.scaleX * next.scaleX,
      scaleY: style.scaleY * next.scaleY,
      rotate: style.rotate + next.rotate,
      skewX: style.skewX + next.skewX,
      blur: Math.max(style.blur, next.blur),
      glow: Math.max(style.glow, next.glow),
      reveal: Math.min(style.reveal, next.reveal),
      revealOrigin: next.reveal < 1 ? next.revealOrigin : style.revealOrigin,
    };
  }, {
    opacityMultiplier: 1,
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    skewX: 0,
    blur: 0,
    glow: 0,
    reveal: 1,
    revealOrigin: "left",
  });
}
