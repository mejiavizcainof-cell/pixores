export const PIXORES_TEXT_REFERENCE_WIDTH = 1280;
export const PIXORES_DEFAULT_TEXT_FONT_SIZE = 48;
export const PIXORES_DEFAULT_TEXT_FONT_WEIGHT = 900;
export const PIXORES_DEFAULT_TEXT_LINE_HEIGHT = 1.08;

export type PixoresTextStyleInput = {
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  lineHeight?: number;
  letterSpacing?: number;
  strokeWidth?: number;
  textBgPadding?: number;
  textBgRadius?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  glowRadius?: number;
};

export function getPixoresTextScale(canvasWidth: number) {
  return Math.max(1, Number(canvasWidth) || PIXORES_TEXT_REFERENCE_WIDTH) / PIXORES_TEXT_REFERENCE_WIDTH;
}

export function getPixoresTextFontWeight(isBold?: boolean) {
  return isBold === false ? 500 : PIXORES_DEFAULT_TEXT_FONT_WEIGHT;
}

export function resolvePixoresTextStyle(input: PixoresTextStyleInput, canvasWidth: number) {
  const scale = getPixoresTextScale(canvasWidth);
  const fontSize = Math.max(18, Math.round((input.fontSize || PIXORES_DEFAULT_TEXT_FONT_SIZE) * scale));
  return {
    scale,
    fontSize,
    fontWeight: getPixoresTextFontWeight(input.isBold),
    fontStyle: input.isItalic ? "italic" : "normal",
    lineHeight: input.lineHeight || PIXORES_DEFAULT_TEXT_LINE_HEIGHT,
    letterSpacing: (input.letterSpacing || 0) * scale,
    strokeWidth: Math.max(0, input.strokeWidth || 0) * scale,
    textBgPadding: Math.max(0, input.textBgPadding ?? 12) * scale,
    textBgRadius: Math.max(0, input.textBgRadius ?? 12) * scale,
    shadowBlur: input.shadowBlur === undefined
      ? Math.round(fontSize * 0.22)
      : Math.max(0, input.shadowBlur) * scale,
    shadowOffsetX: (input.shadowOffsetX || 0) * scale,
    shadowOffsetY: (input.shadowOffsetY || 0) * scale,
    glowRadius: Math.max(0, input.glowRadius || 0) * scale,
  };
}
