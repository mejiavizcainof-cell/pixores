export type LowerThirdCategory = "minimal" | "modern" | "corporate";

export type LowerThirdContentKey = "primaryText" | "secondaryText" | "tertiaryText";
export type LowerThirdColorKey = "primary" | "secondary" | "primaryText" | "secondaryText" | "background" | "border";

export type LowerThirdComponent = {
  id: string;
  kind: "rect" | "line" | "text" | "logo" | "frame";
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  color: LowerThirdColorKey;
  text?: LowerThirdContentKey;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
};

export type LowerThirdAnimationConfig = {
  enter: "fade" | "slide-left" | "pop";
  enterDuration: number;
  exit: "fade";
  exitDuration: number;
  componentStagger: number;
};

export type LowerThirdConfig = {
  templateId: string;
  content: {
    primaryText: string;
    secondaryText?: string;
    tertiaryText?: string;
    logoSourceId?: string;
  };
  colors: Record<LowerThirdColorKey, string>;
  animation: LowerThirdAnimationConfig;
  components: LowerThirdComponent[];
  lineThickness: number;
  typography: {
    primaryFontFamily: string;
    secondaryFontFamily: string;
    textSpacing: number;
  };
  logo?: {
    size: number;
    offsetX: number;
    offsetY: number;
    objectFit: "contain" | "cover";
    borderRadius: number;
    circular: boolean;
    shape: "rounded" | "circle" | "triangle";
  };
};

export type LowerThirdTemplate = {
  id: string;
  name: string;
  category: LowerThirdCategory;
  baseSize: { width: number; height: number };
  defaults: Omit<LowerThirdConfig, "templateId" | "components">;
  components: LowerThirdComponent[];
  supportsLogo: boolean;
};

export type LowerThirdRenderPrimitive = LowerThirdComponent & {
  resolvedColor: string;
  resolvedText?: string;
  fontFamily: string;
  opacity: number;
  translateX: number;
  scale: number;
};

const pixoresColors: LowerThirdConfig["colors"] = {
  primary: "#6366F1",
  secondary: "#22D3C5",
  primaryText: "#F8FAFC",
  secondaryText: "#C7D2FE",
  background: "#111827",
  border: "#22D3C5",
};

const pixoresTypography: LowerThirdConfig["typography"] = {
  primaryFontFamily: "Inter",
  secondaryFontFamily: "Inter",
  textSpacing: 0,
};

export const lowerThirdTemplates: LowerThirdTemplate[] = [
  {
    id: "minimal-line",
    name: "Minimal Line",
    category: "minimal",
    baseSize: { width: 640, height: 150 },
    supportsLogo: false,
    defaults: {
      content: { primaryText: "Name Surname", secondaryText: "Presenter" },
      colors: pixoresColors,
      animation: { enter: "slide-left", enterDuration: 0.55, exit: "fade", exitDuration: 0.35, componentStagger: 0.05 },
      lineThickness: 1,
      typography: pixoresTypography,
    },
    components: [
      { id: "accent", kind: "line", x: 0, y: 12, width: 2, height: 74, color: "secondary" },
      { id: "primary", kind: "text", x: 6, y: 10, width: 90, height: 34, color: "primaryText", text: "primaryText", fontSize: 38, fontWeight: 800 },
      { id: "secondary", kind: "text", x: 6, y: 51, width: 78, height: 24, color: "secondaryText", text: "secondaryText", fontSize: 22, fontWeight: 600, letterSpacing: 1.2 },
      { id: "rule", kind: "line", x: 6, y: 84, width: 38, height: 3, color: "secondary" },
    ],
  },
  {
    id: "side-box",
    name: "Side Box",
    category: "modern",
    baseSize: { width: 680, height: 170 },
    supportsLogo: false,
    defaults: {
      content: { primaryText: "Name Surname", secondaryText: "Program Host" },
      colors: { ...pixoresColors, background: "#0F172A", secondaryText: "#E2E8F0" },
      animation: { enter: "pop", enterDuration: 0.5, exit: "fade", exitDuration: 0.35, componentStagger: 0.04 },
      lineThickness: 1,
      typography: pixoresTypography,
    },
    components: [
      { id: "back", kind: "rect", x: 4, y: 13, width: 92, height: 72, radius: 8, color: "background" },
      { id: "side", kind: "rect", x: 0, y: 0, width: 13, height: 100, radius: 6, color: "primary" },
      { id: "cap", kind: "rect", x: 7, y: 8, width: 11, height: 84, radius: 4, color: "secondary" },
      { id: "primary", kind: "text", x: 22, y: 24, width: 68, height: 30, color: "primaryText", text: "primaryText", fontSize: 36, fontWeight: 850 },
      { id: "secondary", kind: "text", x: 22, y: 59, width: 60, height: 20, color: "secondaryText", text: "secondaryText", fontSize: 20, fontWeight: 600 },
    ],
  },
  {
    id: "highlighted-name",
    name: "Highlighted Name",
    category: "corporate",
    baseSize: { width: 700, height: 165 },
    supportsLogo: false,
    defaults: {
      content: { primaryText: "Name Surname", secondaryText: "Creative Director", tertiaryText: "Pixores Studio" },
      colors: { ...pixoresColors, primary: "#22D3C5", secondary: "#6366F1", primaryText: "#08111F" },
      animation: { enter: "fade", enterDuration: 0.45, exit: "fade", exitDuration: 0.4, componentStagger: 0.06 },
      lineThickness: 1,
      typography: pixoresTypography,
    },
    components: [
      { id: "shadow", kind: "rect", x: 3, y: 22, width: 78, height: 42, radius: 5, color: "secondary" },
      { id: "highlight", kind: "rect", x: 0, y: 15, width: 78, height: 42, radius: 5, color: "primary" },
      { id: "primary", kind: "text", x: 5, y: 21, width: 68, height: 28, color: "primaryText", text: "primaryText", fontSize: 34, fontWeight: 900 },
      { id: "secondary", kind: "text", x: 1, y: 69, width: 55, height: 20, color: "secondaryText", text: "secondaryText", fontSize: 19, fontWeight: 650, letterSpacing: 0.8 },
      { id: "company", kind: "text", x: 58, y: 69, width: 38, height: 20, color: "secondary", text: "tertiaryText", fontSize: 17, fontWeight: 750 },
    ],
  },
  {
    id: "logo-name",
    name: "Logo and Name",
    category: "modern",
    baseSize: { width: 760, height: 180 },
    supportsLogo: true,
    defaults: {
      content: { primaryText: "Name Surname", secondaryText: "Program Presenter" },
      colors: { ...pixoresColors, background: "#111827", primary: "#6366F1", secondary: "#22D3C5" },
      animation: { enter: "slide-left", enterDuration: 0.55, exit: "fade", exitDuration: 0.4, componentStagger: 0.05 },
      lineThickness: 0.65,
      typography: pixoresTypography,
      logo: { size: 100, offsetX: 0, offsetY: 0, objectFit: "contain", borderRadius: 10, circular: false, shape: "rounded" },
    },
    components: [
      { id: "body", kind: "rect", x: 18, y: 16, width: 79, height: 68, radius: 8, color: "background" },
      { id: "logo-frame", kind: "frame", x: 1, y: 7, width: 26, height: 86, radius: 10, color: "primary" },
      { id: "logo", kind: "logo", x: 2, y: 9, width: 24, height: 82, radius: 8, color: "background" },
      { id: "primary", kind: "text", x: 32, y: 25, width: 59, height: 27, color: "primaryText", text: "primaryText", fontSize: 35, fontWeight: 850 },
      { id: "secondary", kind: "text", x: 32, y: 57, width: 52, height: 20, color: "secondaryText", text: "secondaryText", fontSize: 20, fontWeight: 600 },
      { id: "accent", kind: "line", x: 32, y: 81, width: 28, height: 3, color: "secondary" },
    ],
  },
  {
    id: "logo-circle",
    name: "Circular Logo",
    category: "modern",
    baseSize: { width: 760, height: 180 },
    supportsLogo: true,
    defaults: {
      content: { primaryText: "Name Surname", secondaryText: "Program Presenter" },
      colors: { ...pixoresColors, background: "#111827", primary: "#6366F1", secondary: "#22D3C5" },
      animation: { enter: "pop", enterDuration: 0.5, exit: "fade", exitDuration: 0.4, componentStagger: 0.05 },
      lineThickness: 0.7,
      typography: pixoresTypography,
      logo: { size: 100, offsetX: 0, offsetY: 0, objectFit: "cover", borderRadius: 999, circular: true, shape: "circle" },
    },
    components: [
      { id: "body", kind: "rect", x: 18, y: 18, width: 79, height: 64, radius: 32, color: "background" },
      { id: "logo-frame", kind: "frame", x: 1, y: 5, width: 21.3, height: 90, radius: 999, color: "primary" },
      { id: "logo", kind: "logo", x: 1.7, y: 8, width: 19.9, height: 84, radius: 999, color: "background" },
      { id: "primary", kind: "text", x: 27, y: 25, width: 64, height: 27, color: "primaryText", text: "primaryText", fontSize: 35, fontWeight: 850 },
      { id: "secondary", kind: "text", x: 27, y: 57, width: 55, height: 20, color: "secondaryText", text: "secondaryText", fontSize: 20, fontWeight: 600 },
      { id: "accent", kind: "line", x: 27, y: 81, width: 30, height: 2, color: "secondary" },
    ],
  },
  {
    id: "logo-triangle",
    name: "Triangle Logo",
    category: "modern",
    baseSize: { width: 780, height: 185 },
    supportsLogo: true,
    defaults: {
      content: { primaryText: "Name Surname", secondaryText: "Program Presenter" },
      colors: { ...pixoresColors, background: "#111827", primary: "#6366F1", secondary: "#22D3C5" },
      animation: { enter: "slide-left", enterDuration: 0.55, exit: "fade", exitDuration: 0.4, componentStagger: 0.05 },
      lineThickness: 0.7,
      typography: pixoresTypography,
      logo: { size: 100, offsetX: 0, offsetY: 0, objectFit: "cover", borderRadius: 0, circular: false, shape: "triangle" },
    },
    components: [
      { id: "body", kind: "rect", x: 17, y: 18, width: 80, height: 64, radius: 8, color: "background" },
      { id: "logo-frame", kind: "frame", x: 0, y: 4, width: 27, height: 92, color: "primary" },
      { id: "logo", kind: "logo", x: 2, y: 10, width: 23, height: 80, color: "background" },
      { id: "primary", kind: "text", x: 30, y: 25, width: 61, height: 27, color: "primaryText", text: "primaryText", fontSize: 35, fontWeight: 850 },
      { id: "secondary", kind: "text", x: 30, y: 57, width: 52, height: 20, color: "secondaryText", text: "secondaryText", fontSize: 20, fontWeight: 600 },
      { id: "accent", kind: "line", x: 30, y: 81, width: 30, height: 2, color: "secondary" },
    ],
  },
  {
    id: "glass-accent",
    name: "Glass Accent",
    category: "modern",
    baseSize: { width: 760, height: 170 },
    supportsLogo: false,
    defaults: {
      content: { primaryText: "Name Surname", secondaryText: "Creative Producer" },
      colors: { ...pixoresColors, background: "#172033", primary: "#8B5CF6", secondary: "#22D3EE", secondaryText: "#CFFAFE" },
      animation: { enter: "slide-left", enterDuration: 0.6, exit: "fade", exitDuration: 0.35, componentStagger: 0.04 },
      lineThickness: 1,
      typography: pixoresTypography,
    },
    components: [
      { id: "glass", kind: "rect", x: 2, y: 14, width: 94, height: 72, radius: 18, color: "background" },
      { id: "accent", kind: "rect", x: 2, y: 14, width: 3, height: 72, radius: 18, color: "secondary" },
      { id: "primary", kind: "text", x: 10, y: 25, width: 80, height: 28, color: "primaryText", text: "primaryText", fontSize: 36, fontWeight: 850 },
      { id: "secondary", kind: "text", x: 10, y: 58, width: 65, height: 20, color: "secondaryText", text: "secondaryText", fontSize: 19, fontWeight: 650, letterSpacing: 0.8 },
      { id: "spark", kind: "line", x: 78, y: 74, width: 13, height: 3, color: "primary" },
    ],
  },
  {
    id: "broadcast-bar",
    name: "Broadcast Bar",
    category: "corporate",
    baseSize: { width: 790, height: 165 },
    supportsLogo: false,
    defaults: {
      content: { primaryText: "NAME SURNAME", secondaryText: "LIVE CORRESPONDENT", tertiaryText: "PIX NEWS" },
      colors: { ...pixoresColors, background: "#F8FAFC", primary: "#EF4444", secondary: "#111827", primaryText: "#111827", secondaryText: "#FFFFFF" },
      animation: { enter: "slide-left", enterDuration: 0.5, exit: "fade", exitDuration: 0.3, componentStagger: 0.035 },
      lineThickness: 1,
      typography: pixoresTypography,
    },
    components: [
      { id: "body", kind: "rect", x: 0, y: 18, width: 92, height: 66, radius: 3, color: "background" },
      { id: "live", kind: "rect", x: 0, y: 18, width: 19, height: 66, radius: 3, color: "primary" },
      { id: "network", kind: "text", x: 3, y: 31, width: 14, height: 20, color: "secondaryText", text: "tertiaryText", fontSize: 16, fontWeight: 900 },
      { id: "role", kind: "text", x: 3, y: 55, width: 14, height: 15, color: "secondaryText", text: "secondaryText", fontSize: 10, fontWeight: 750 },
      { id: "primary", kind: "text", x: 23, y: 27, width: 64, height: 29, color: "primaryText", text: "primaryText", fontSize: 34, fontWeight: 900 },
      { id: "rule", kind: "line", x: 23, y: 67, width: 54, height: 3, color: "primary" },
    ],
  },
  {
    id: "neon-signal",
    name: "Neon Signal",
    category: "modern",
    baseSize: { width: 750, height: 170 },
    supportsLogo: false,
    defaults: {
      content: { primaryText: "Name Surname", secondaryText: "STREAMING NOW" },
      colors: { ...pixoresColors, background: "#070A18", primary: "#EC4899", secondary: "#22D3EE", secondaryText: "#67E8F9" },
      animation: { enter: "pop", enterDuration: 0.6, exit: "fade", exitDuration: 0.4, componentStagger: 0.055 },
      lineThickness: 0.75,
      typography: pixoresTypography,
    },
    components: [
      { id: "back", kind: "rect", x: 2, y: 16, width: 91, height: 70, radius: 9, color: "background" },
      { id: "top", kind: "line", x: 2, y: 15, width: 39, height: 3, color: "primary" },
      { id: "side", kind: "line", x: 2, y: 15, width: 2, height: 72, color: "secondary" },
      { id: "primary", kind: "text", x: 9, y: 27, width: 76, height: 29, color: "primaryText", text: "primaryText", fontSize: 36, fontWeight: 850 },
      { id: "secondary", kind: "text", x: 9, y: 61, width: 49, height: 18, color: "secondaryText", text: "secondaryText", fontSize: 16, fontWeight: 800, letterSpacing: 2 },
      { id: "pulse", kind: "rect", x: 82, y: 62, width: 5, height: 18, radius: 9, color: "primary" },
    ],
  },
  {
    id: "editorial-stack",
    name: "Editorial Stack",
    category: "minimal",
    baseSize: { width: 720, height: 175 },
    supportsLogo: false,
    defaults: {
      content: { primaryText: "Name Surname", secondaryText: "ART & CULTURE", tertiaryText: "EDITORIAL" },
      colors: { ...pixoresColors, background: "#F5F0E8", primary: "#F59E0B", secondary: "#292524", primaryText: "#1C1917", secondaryText: "#57534E" },
      animation: { enter: "fade", enterDuration: 0.55, exit: "fade", exitDuration: 0.4, componentStagger: 0.07 },
      lineThickness: 1,
      typography: { ...pixoresTypography, primaryFontFamily: "Georgia", secondaryFontFamily: "Inter" },
    },
    components: [
      { id: "paper", kind: "rect", x: 0, y: 10, width: 85, height: 80, radius: 0, color: "background" },
      { id: "tag", kind: "rect", x: 5, y: 0, width: 23, height: 23, radius: 0, color: "primary" },
      { id: "tertiary", kind: "text", x: 8, y: 4, width: 18, height: 15, color: "primaryText", text: "tertiaryText", fontSize: 12, fontWeight: 900, letterSpacing: 1.2 },
      { id: "primary", kind: "text", x: 6, y: 30, width: 72, height: 30, color: "primaryText", text: "primaryText", fontSize: 35, fontWeight: 750 },
      { id: "secondary", kind: "text", x: 6, y: 65, width: 48, height: 18, color: "secondaryText", text: "secondaryText", fontSize: 15, fontWeight: 750, letterSpacing: 1.8 },
      { id: "rule", kind: "line", x: 59, y: 72, width: 18, height: 2, color: "secondary" },
    ],
  },
  {
    id: "social-pill",
    name: "Social Pill",
    category: "modern",
    baseSize: { width: 700, height: 155 },
    supportsLogo: true,
    defaults: {
      content: { primaryText: "@yourhandle", secondaryText: "Follow for more" },
      colors: { ...pixoresColors, background: "#111827", primary: "#8B5CF6", secondary: "#22D3C5" },
      animation: { enter: "pop", enterDuration: 0.5, exit: "fade", exitDuration: 0.35, componentStagger: 0.04 },
      lineThickness: 0.65,
      typography: pixoresTypography,
      logo: { size: 100, offsetX: 0, offsetY: 0, objectFit: "contain", borderRadius: 999, circular: true, shape: "circle" },
    },
    components: [
      { id: "body", kind: "rect", x: 12, y: 16, width: 84, height: 68, radius: 34, color: "background" },
      { id: "logo-frame", kind: "frame", x: 1, y: 8, width: 19, height: 84, radius: 999, color: "primary" },
      { id: "logo", kind: "logo", x: 2, y: 12, width: 17, height: 76, radius: 999, color: "background" },
      { id: "primary", kind: "text", x: 25, y: 27, width: 62, height: 27, color: "primaryText", text: "primaryText", fontSize: 31, fontWeight: 850 },
      { id: "secondary", kind: "text", x: 25, y: 59, width: 48, height: 18, color: "secondaryText", text: "secondaryText", fontSize: 17, fontWeight: 600 },
      { id: "dot", kind: "rect", x: 85, y: 42, width: 4, height: 18, radius: 9, color: "secondary" },
    ],
  },
  {
    id: "tech-corner",
    name: "Tech Corner",
    category: "corporate",
    baseSize: { width: 760, height: 170 },
    supportsLogo: false,
    defaults: {
      content: { primaryText: "Name Surname", secondaryText: "PRODUCT DESIGN", tertiaryText: "01" },
      colors: { ...pixoresColors, background: "#0B1220", primary: "#38BDF8", secondary: "#A3E635", secondaryText: "#BAE6FD" },
      animation: { enter: "slide-left", enterDuration: 0.55, exit: "fade", exitDuration: 0.35, componentStagger: 0.045 },
      lineThickness: 1,
      typography: pixoresTypography,
    },
    components: [
      { id: "body", kind: "rect", x: 4, y: 14, width: 90, height: 72, radius: 2, color: "background" },
      { id: "index", kind: "rect", x: 0, y: 5, width: 14, height: 42, radius: 2, color: "primary" },
      { id: "number", kind: "text", x: 3, y: 14, width: 9, height: 22, color: "background", text: "tertiaryText", fontSize: 19, fontWeight: 900 },
      { id: "primary", kind: "text", x: 20, y: 27, width: 66, height: 28, color: "primaryText", text: "primaryText", fontSize: 35, fontWeight: 850 },
      { id: "secondary", kind: "text", x: 20, y: 61, width: 49, height: 18, color: "secondaryText", text: "secondaryText", fontSize: 15, fontWeight: 800, letterSpacing: 1.7 },
      { id: "corner-a", kind: "line", x: 75, y: 80, width: 17, height: 2, color: "secondary" },
      { id: "corner-b", kind: "line", x: 92, y: 66, width: 2, height: 16, color: "secondary" },
    ],
  },
];

export function createLowerThirdConfig(templateId: string): LowerThirdConfig {
  const template = lowerThirdTemplates.find((item) => item.id === templateId) || lowerThirdTemplates[0];
  return {
    templateId: template.id,
    content: { ...template.defaults.content },
    colors: { ...template.defaults.colors },
    animation: { ...template.defaults.animation },
    lineThickness: template.defaults.lineThickness,
    typography: { ...template.defaults.typography },
    components: template.components.map((component) => ({ ...component })),
    logo: template.defaults.logo ? { ...template.defaults.logo } : undefined,
  };
}

export function normalizeLowerThirdColor(value: string, fallback = "#000000") {
  const normalized = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    return `#${normalized.slice(1).split("").map((digit) => digit + digit).join("")}`.toUpperCase();
  }
  return /^#[0-9a-f]{6}$/i.test(fallback) ? fallback.toUpperCase() : "#000000";
}

export function setLowerThirdColor(
  config: LowerThirdConfig,
  key: LowerThirdColorKey,
  value: string,
): LowerThirdConfig {
  return {
    ...config,
    colors: {
      ...config.colors,
      [key]: normalizeLowerThirdColor(value, config.colors[key]),
    },
  };
}

function smooth(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  return clamped * clamped * (3 - 2 * clamped);
}

export function getLowerThirdRenderModel(config: LowerThirdConfig, relativeTime: number, duration: number): LowerThirdRenderPrimitive[] {
  const exitStart = Math.max(0, duration - config.animation.exitDuration);
  const textSpacing = Math.max(-30, Math.min(30, config.typography?.textSpacing ?? 0));
  return config.components.map((component, index) => {
    const logoSettings = config.logo || { size: 100, offsetX: 0, offsetY: 0, objectFit: "contain" as const, borderRadius: 0, circular: false, shape: "rounded" as const };
    const isLogo = component.kind === "logo";
    const isLogoDecoration = isLogo || component.kind === "frame";
    const logoScale = isLogo ? Math.max(0.2, logoSettings.size / 100) : 1;
    const thickness = Math.max(0.25, config.lineThickness || 1);
    const isVerticalLine = component.kind === "line" && component.height > component.width;
    const frameDelta = component.kind === "frame" ? (thickness - 1) * 2 : 0;
    const delay = index * config.animation.componentStagger;
    const enterProgress = smooth((relativeTime - delay) / Math.max(0.05, config.animation.enterDuration));
    const exitProgress = relativeTime <= exitStart
      ? 1
      : 1 - smooth((relativeTime - exitStart) / Math.max(0.05, config.animation.exitDuration));
    const opacity = enterProgress * exitProgress;
    const translateX = config.animation.enter === "slide-left" ? (1 - enterProgress) * -18 : 0;
    const scale = config.animation.enter === "pop" ? 0.82 + enterProgress * 0.18 : 1;
    const isPrimaryText = component.kind === "text" && component.text === "primaryText";
    const fontFamily = isPrimaryText
      ? config.typography?.primaryFontFamily || "Inter"
      : config.typography?.secondaryFontFamily || "Inter";

    return {
      ...component,
      x: component.x + (isLogoDecoration ? logoSettings.offsetX : 0) - frameDelta / 2,
      y: component.y
        + (isLogoDecoration ? logoSettings.offsetY : 0)
        + (component.kind === "text" && !isPrimaryText ? textSpacing : 0)
        - frameDelta / 2,
      width: component.width * (isLogo ? logoScale : isVerticalLine ? thickness : 1) + frameDelta,
      height: component.height * (isLogo ? logoScale : component.kind === "line" && !isVerticalLine ? thickness : 1) + frameDelta,
      radius: isLogoDecoration ? (logoSettings.shape === "circle" || logoSettings.circular ? 999 : logoSettings.borderRadius) : component.radius,
      resolvedColor: normalizeLowerThirdColor(config.colors[component.color], pixoresColors[component.color]),
      resolvedText: component.text ? config.content[component.text] : undefined,
      fontFamily,
      opacity,
      translateX,
      scale,
    };
  });
}
