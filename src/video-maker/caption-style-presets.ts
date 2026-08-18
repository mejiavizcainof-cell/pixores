import type { PixoresVideoLayer } from "@/src/video-render/types";
import type { ProfessionalCaptionLayout } from "./caption-layout";

export type CaptionStylePresetId = "classic" | "minimal" | "yellow" | "clean" | "brand" | "outline" | "neon" | "cinema";
export type SmartClipCaptionTemplateId = "none" | CaptionStylePresetId;

export type CaptionStylePreset = {
  id: CaptionStylePresetId;
  label: string;
  description: string;
  previewText: string;
  previewBackground: string;
  patch: Partial<PixoresVideoLayer>;
};

export const CAPTION_STYLE_PRESETS: CaptionStylePreset[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Bold white type on a readable black card.",
    previewText: "#ffffff",
    previewBackground: "#000000",
    patch: { fontFamily: "Arial", fontSize: 50, color: "#ffffff", isBold: true, hasTextBg: true, textBgColor: "#000000", textBgPadding: 10, textBgRadius: 8, textAlign: "center" },
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean white Montserrat with a soft shadow.",
    previewText: "#ffffff",
    previewBackground: "transparent",
    patch: { fontFamily: "Montserrat", fontSize: 48, color: "#ffffff", isBold: true, hasTextBg: false, textAlign: "center", shadowColor: "#000000", shadowBlur: 12, shadowOpacity: 0.8, shadowOffsetX: 2, shadowOffsetY: 3 },
  },
  {
    id: "yellow",
    label: "Creator",
    description: "Uppercase yellow creator captions with impact.",
    previewText: "#facc15",
    previewBackground: "#050505",
    patch: { fontFamily: "Anton", fontSize: 54, color: "#facc15", isBold: true, isUppercase: true, hasTextBg: true, textBgColor: "#050505", textBgPadding: 12, textBgRadius: 4, textAlign: "center" },
  },
  {
    id: "clean",
    label: "Clean",
    description: "Dark text on a crisp white background.",
    previewText: "#111827",
    previewBackground: "#ffffff",
    patch: { fontFamily: "Montserrat", fontSize: 46, color: "#111827", isBold: true, hasTextBg: true, textBgColor: "#ffffff", textBgPadding: 12, textBgRadius: 5, textAlign: "center" },
  },
  {
    id: "brand",
    label: "Pixores",
    description: "Pixores cyan brand card with rounded corners.",
    previewText: "#04111f",
    previewBackground: "#22d3c5",
    patch: { fontFamily: "Montserrat", fontSize: 48, color: "#04111f", isBold: true, hasTextBg: true, textBgColor: "#22d3c5", textBgPadding: 12, textBgRadius: 14, textAlign: "center" },
  },
  {
    id: "outline",
    label: "Outline",
    description: "Large white Anton with a strong black outline.",
    previewText: "#ffffff",
    previewBackground: "transparent",
    patch: { fontFamily: "Anton", fontSize: 54, color: "#ffffff", isBold: true, hasTextBg: false, textAlign: "center", textEffectPreset: "outline", strokeColor: "#000000", strokeWidth: 6, strokeOpacity: 1 },
  },
  {
    id: "neon",
    label: "Neon",
    description: "Electric cyan glow on a dark blue card.",
    previewText: "#67e8f9",
    previewBackground: "#172033",
    patch: { fontFamily: "Montserrat", fontSize: 48, color: "#ecfeff", isBold: true, hasTextBg: true, textBgColor: "#172033", textBgPadding: 13, textBgRadius: 13, textAlign: "center", textEffectPreset: "neon", glowColor: "#22d3ee", glowRadius: 22, strokeColor: "#cffafe", strokeWidth: 1, strokeOpacity: 1 },
  },
  {
    id: "cinema",
    label: "Cinema",
    description: "Elegant Georgia type on a cinematic dark strip.",
    previewText: "#f8fafc",
    previewBackground: "#1c1917",
    patch: { fontFamily: "Georgia", fontSize: 44, color: "#f8fafc", isBold: false, hasTextBg: true, textBgColor: "#1c1917", textBgPadding: 14, textBgRadius: 0, textAlign: "center", letterSpacing: 1.5 },
  },
];

const CAPTION_STYLE_RESET: Partial<PixoresVideoLayer> = {
  isItalic: false,
  isUnderline: false,
  isStrikethrough: false,
  isUppercase: false,
  textEffectPreset: "none",
  hasTextBg: false,
  textCurve: 0,
  strokeWidth: 0,
  strokeOpacity: 0,
  shadowPreset: "none",
  shadowBlur: 0,
  shadowOpacity: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  glowRadius: 0,
  letterSpacing: 0,
  lineHeight: 1.1,
};

export const SMART_CLIP_CAPTION_TEMPLATES: Array<{
  id: SmartClipCaptionTemplateId;
  label: string;
  description: string;
  previewText: string;
  previewBackground: string;
  fontFamily?: string;
}> = [
  {
    id: "none",
    label: "None",
    description: "Keep edited captions unchanged, or use the standard subtitle style.",
    previewText: "#aab8c9",
    previewBackground: "transparent",
    fontFamily: "Arial",
  },
  ...CAPTION_STYLE_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
    previewText: preset.previewText,
    previewBackground: preset.previewBackground,
    fontFamily: preset.patch.fontFamily,
  })),
];

export function getCaptionStylePreset(presetId: CaptionStylePresetId) {
  return CAPTION_STYLE_PRESETS.find((preset) => preset.id === presetId);
}

export function resolveCaptionStylePresetPatch(presetId: CaptionStylePresetId): Partial<PixoresVideoLayer> {
  const preset = getCaptionStylePreset(presetId);
  return preset ? { ...CAPTION_STYLE_RESET, ...preset.patch } : {};
}

export function resolveSmartClipCaptionTemplatePatch(templateId: SmartClipCaptionTemplateId): Partial<PixoresVideoLayer> {
  return templateId === "none" ? {} : resolveCaptionStylePresetPatch(templateId);
}

export function applySmartClipCaptionTemplate<T extends PixoresVideoLayer>(
  layer: T,
  templateId: SmartClipCaptionTemplateId,
): T {
  if (templateId === "none") return layer;
  return { ...layer, ...resolveSmartClipCaptionTemplatePatch(templateId) };
}

export function createSmartClipCaptionStyle(
  templateId: SmartClipCaptionTemplateId,
  layout: ProfessionalCaptionLayout,
): Partial<PixoresVideoLayer> {
  return {
    color: "#ffffff",
    fontFamily: "Arial",
    isBold: true,
    textAlign: "center",
    hasTextBg: true,
    textBgColor: "#000000",
    textBgPadding: layout.textBgPadding,
    textBgRadius: layout.textBgRadius,
    lineHeight: layout.lineHeight,
    letterSpacing: layout.letterSpacing,
    shadowColor: "#000000",
    shadowBlur: 8,
    shadowOpacity: 0.75,
    ...resolveSmartClipCaptionTemplatePatch(templateId),
    // The Smart Clips size control wins over template defaults. The layout
    // already clamps this value to the selected video safe area.
    fontSize: layout.fontSize,
  };
}
