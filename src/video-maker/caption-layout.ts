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

/**
 * Keeps captions inside a mobile-safe title area while preserving a readable
 * two-line block on landscape, square and vertical canvases.
 */
export function getProfessionalCaptionLayout(canvasWidth: number, canvasHeight: number): ProfessionalCaptionLayout {
  const width = Math.max(1, canvasWidth);
  const height = Math.max(1, canvasHeight);
  const aspect = height / width;

  if (aspect >= 1.5) {
    return {
      x: 7,
      y: 67,
      width: 86,
      height: 18,
      fontSize: Math.max(46, Math.min(58, Math.round(width * 0.05))),
      textBgPadding: 12,
      textBgRadius: 12,
      lineHeight: 1.08,
      letterSpacing: 0.2,
    };
  }

  if (aspect >= 0.9) {
    return {
      x: 9,
      y: 71,
      width: 82,
      height: 16,
      fontSize: Math.max(42, Math.min(54, Math.round(width * 0.044))),
      textBgPadding: 11,
      textBgRadius: 10,
      lineHeight: 1.1,
      letterSpacing: 0.15,
    };
  }

  return {
    x: 12,
    y: 76,
    width: 76,
    height: 14,
    fontSize: Math.max(42, Math.min(54, Math.round(width * 0.026))),
    textBgPadding: 10,
    textBgRadius: 8,
    lineHeight: 1.12,
    letterSpacing: 0.1,
  };
}

export function isAiCaptionLayer(layer: { type?: string; name?: string; trackName?: string }) {
  return layer.type === "text" && (
    layer.trackName === "AI Captions"
    || /^caption\s+\d+/i.test(layer.name || "")
  );
}
