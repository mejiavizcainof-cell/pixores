export type ProfessionalCaptionLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  textBgPadding: number;
  textBgRadius: number;
  lineHeight: number;
  letterSpacing: number;
};

export type SmartClipCaptionPosition = "top" | "middle" | "bottom";

export const SMART_CLIP_CAPTION_SIZE_MIN = 80;
export const SMART_CLIP_CAPTION_SIZE_MAX = 160;
export const SMART_CLIP_CAPTION_SIZE_DEFAULT = 120;

export function clampSmartClipCaptionSize(value: number) {
  return Math.round(Math.max(SMART_CLIP_CAPTION_SIZE_MIN, Math.min(SMART_CLIP_CAPTION_SIZE_MAX, Number(value) || SMART_CLIP_CAPTION_SIZE_DEFAULT)) / 5) * 5;
}

function fitCaptionFontSize(
  layout: ProfessionalCaptionLayout,
  canvasWidth: number,
  canvasHeight: number,
  requestedSizePercent: number,
) {
  const width = Math.max(1, canvasWidth);
  const height = Math.max(1, canvasHeight);
  const canvasScale = width / 1280;
  const requested = layout.fontSize * (clampSmartClipCaptionSize(requestedSizePercent) / 100);
  const availableWidth = width * (layout.width / 100);
  const availableHeight = height * (Math.max(4, 96 - layout.y) / 100);
  const padding = layout.textBgPadding * canvasScale;
  const maxCharacters = height / width >= 1.3 ? 34 : 44;

  // Estimate the wrapped block with a deliberately wide average glyph. This
  // keeps even the largest setting inside the selected safe area instead of
  // letting the last line or background card leave the video frame.
  const minimumCandidate = Math.max(1, 18 / canvasScale);
  const decrement = Math.max(0.25, 1 / canvasScale);
  for (let candidate = requested; candidate >= minimumCandidate; candidate -= decrement) {
    const physicalFontSize = candidate * canvasScale;
    const estimatedLines = Math.max(1, Math.min(4, Math.ceil((maxCharacters * physicalFontSize * 0.62) / Math.max(1, availableWidth))));
    const estimatedHeight = estimatedLines * physicalFontSize * layout.lineHeight + padding * 2;
    if (estimatedHeight <= availableHeight) return Number(candidate.toFixed(2));
  }

  return Number(minimumCandidate.toFixed(2));
}

function resolveCaptionY(
  aspect: number,
  position?: SmartClipCaptionPosition,
) {
  if (aspect >= 1.5) {
    if (position === "top") return 14;
    if (position === "middle") return 41;
    if (position === "bottom") return 74;
    return 67;
  }

  if (aspect >= 0.9) {
    if (position === "top") return 14;
    if (position === "middle") return 42;
    if (position === "bottom") return 76;
    return 71;
  }

  if (position === "top") return 12;
  if (position === "middle") return 43;
  if (position === "bottom") return 78;
  return 76;
}

/**
 * Keeps captions inside a mobile-safe title area while preserving a readable
 * two-line block on landscape, square and vertical canvases.
 */
export function getProfessionalCaptionLayout(
  canvasWidth: number,
  canvasHeight: number,
  position?: SmartClipCaptionPosition,
  sizePercent = 100,
): ProfessionalCaptionLayout {
  const width = Math.max(1, canvasWidth);
  const height = Math.max(1, canvasHeight);
  const aspect = height / width;

  let layout: ProfessionalCaptionLayout;

  if (aspect >= 1.5) {
    layout = {
      x: 7,
      y: resolveCaptionY(aspect, position),
      width: 86,
      height: 18,
      fontSize: Math.max(46, Math.min(58, Math.round(width * 0.05))),
      textBgPadding: 12,
      textBgRadius: 12,
      lineHeight: 1.08,
      letterSpacing: 0.2,
    };
  } else if (aspect >= 0.9) {
    layout = {
      x: 9,
      y: resolveCaptionY(aspect, position),
      width: 82,
      height: 16,
      fontSize: Math.max(42, Math.min(54, Math.round(width * 0.044))),
      textBgPadding: 11,
      textBgRadius: 10,
      lineHeight: 1.1,
      letterSpacing: 0.15,
    };
  } else {
    layout = {
      x: 12,
      y: resolveCaptionY(aspect, position),
      width: 76,
      height: 14,
      fontSize: Math.max(42, Math.min(54, Math.round(width * 0.026))),
      textBgPadding: 10,
      textBgRadius: 8,
      lineHeight: 1.12,
      letterSpacing: 0.1,
    };
  }

  if (position) {
    const canvasScale = width / 1280;
    const minimumDimension = Math.min(width, height);
    const targetPhysicalFontSize = aspect >= 1.5
      ? Math.max(18, Math.min(68, width * 0.052))
      : aspect >= 0.9
        ? Math.max(18, Math.min(62, minimumDimension * 0.048))
        : Math.max(18, Math.min(70, height * 0.056));
    const targetPhysicalPadding = Math.max(3, Math.min(14, minimumDimension * 0.009));
    const targetPhysicalRadius = Math.max(3, Math.min(14, minimumDimension * 0.01));
    layout = {
      ...layout,
      fontSize: targetPhysicalFontSize / canvasScale,
      textBgPadding: targetPhysicalPadding / canvasScale,
      textBgRadius: targetPhysicalRadius / canvasScale,
    };
  }

  return {
    ...layout,
    fontSize: fitCaptionFontSize(layout, width, height, sizePercent),
  };
}

export function isAiCaptionLayer(layer: { type?: string; name?: string; trackName?: string }) {
  return layer.type === "text" && (
    layer.trackName === "AI Captions"
    || /^caption\s+\d+/i.test(layer.name || "")
  );
}
