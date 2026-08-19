/**
 * Shared video project contract for Pixores.
 *
 * The editor should only need to create this JSON shape. Renderers can then
 * consume the same project without depending on React editor state.
 */

import type { LowerThirdConfig } from "./lower-thirds";
import type { LayerAnimationType } from "./layer-animations";

export type PixoresLayerType = "media" | "text" | "shape" | "audio" | "transition" | "lower-third";

export type PixoresMediaKind = "image" | "video" | "audio";

export type PixoresAssetUploadStatus = "local" | "uploading" | "ready" | "error";

export type PixoresTextAlign = "left" | "center" | "right";

export type PixoresBlendMode = "normal" | "multiply" | "screen" | "darken" | "lighten";

export type PixoresAudioReverbPreset = "none" | "studio" | "room" | "hall" | "stage";

/** One portable audio chain shared by the editor, autosave and exporters. */
export type PixoresAudioEffectChain = {
  enabled?: boolean;
  gainDb?: number;
  pan?: number;
  normalize?: boolean;
  highPassHz?: number;
  humRemovalHz?: 0 | 50 | 60;
  noiseReduction?: number;
  deEsser?: number;
  lowGainDb?: number;
  midGainDb?: number;
  highGainDb?: number;
  compressor?: number;
  limiter?: boolean;
  echoEnabled?: boolean;
  echoDelayMs?: number;
  echoDecay?: number;
  reverb?: PixoresAudioReverbPreset;
};

export type PixoresMediaMetadata = {
  analyzer: "ffprobe" | "sharp" | "browser" | "fallback";
  analyzedAt: string;
  formatName?: string;
  mimeType?: string;
  size?: number;
  duration?: number;
  bitrate?: number;
  width?: number;
  height?: number;
  rotation?: number;
  fps?: number;
  codec?: string;
  pixelFormat?: string;
  colorSpace?: string;
  hasVideo?: boolean;
  hasAudio?: boolean;
  audioCodec?: string;
  sampleRate?: number;
  channels?: number;
  imageFormat?: string;
  hasAlpha?: boolean;
  warnings?: string[];
};

export type PixoresTransitionType =
  | "fade"
  | "fadeBlack"
  | "fadeWhite"
  | "wipeLeft"
  | "wipeRight"
  | "wipeUp"
  | "wipeDown"
  | "slideLeft"
  | "slideRight"
  | "slideUp"
  | "slideDown"
  | "zoomFlash"
  | "zoomIn"
  | "zoomOut"
  | "rotateClockwise"
  | "blurDissolve"
  | "radialReveal"
  | "diagonalWipe"
  | "splitReveal"
  | "glitch"
  | "cubeLeft"
  | "cubeRight"
  | "flipHorizontal"
  | "flipVertical"
  | "pageTurnLeft"
  | "pageTurnRight"
  | "doorOpen"
  | "zoomTunnel";

export type PixoresTransition = {
  id: string;
  type: PixoresTransitionType;
  fromLayerId?: string;
  toLayerId?: string;
  start: number;
  duration: number;
  cutTime?: number;
  color?: string;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
};

export type PixoresLayerAnimationType = LayerAnimationType;

export type PixoresLayerAnimation = {
  id: string;
  type: PixoresLayerAnimationType;
  start: number;
  duration: number;
  phase?: "in" | "out";
  endOffset?: number;
};

export type PixoresKeyframeProperty = "x" | "y" | "width" | "height" | "opacity" | "angle" | "scale";

export type PixoresKeyframe = {
  id: string;
  time: number;
  property: PixoresKeyframeProperty;
  value: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
};

export type PixoresSmartReframeKeyframe = {
  time: number;
  centerX: number;
  centerY: number;
  zoom: number;
  trackId?: string;
  confidence?: number;
};

export type PixoresSmartReframe = {
  mode: "static" | "dynamic";
  speakerSelection: boolean;
  source: "mediapipe-face-landmarker";
  keyframes: PixoresSmartReframeKeyframe[];
};

export type PixoresShapeType =
  | "rectangle"
  | "circle"
  | "triangle"
  | "star"
  | "badge"
  | "speechBubble"
  | "arrow"
  | "line"
  | "dashedLine"
  | "frame"
  | "roundedFrame"
  | "circleFrame"
  | "triangleFrame"
  | "neonFrame"
  | "neonPulseFrame"
  | "rgbLightsFrame"
  | "lightSweepFrame"
  | "cinemaFrame"
  | "paperFrame"
  | "paperPortraitFrame"
  | "paperSquareFrame"
  | "paperStripFrame"
  | "paperLeftFrame"
  | "paperRightFrame"
  | "phoneFrame"
  | "tabletFrame"
  | "laptopFrame"
  | "vsDividerFrame"
  | "splitScreenFrame"
  | "diagonalSplitFrame"
  | "gridSingle"
  | "gridTwoColumns"
  | "gridTwoRows"
  | "gridThreeColumns"
  | "gridThreeRows"
  | "gridFour"
  | "gridHeroLeft"
  | "gridHeroTop"
  | "gradient";

export type PixoresVideoEffectPreset =
  | "none"
  | "chromaKey"
  | "cinematic"
  | "vivid"
  | "warm"
  | "cool"
  | "noir"
  | "vintage"
  | "dream"
  | "vignette"
  | "bodyGlow"
  | "neonOutline"
  | "silhouette"
  | "ghostBody"
  | "objectPop"
  | "bodyHeat";

export type PixoresLayerEffect = {
  preset: PixoresVideoEffectPreset;
  intensity: number;
  chromaKey?: {
    color: string;
    similarity: number;
    smoothness: number;
    spill: number;
  };
};

export type PixoresShadowPreset = "none" | "glow" | "drop" | "outline" | "curved" | "pageLift" | "angled" | "backdrop";
export type PixoresStrokePreset = "none" | "thin" | "medium" | "bold" | "light" | "dark";
export type PixoresTextEffectPreset = "none" | "drop" | "glow" | "echo" | "outline" | "background" | "splice" | "hollow" | "neon" | "glitch" | "curve" | "shadow" | "lift";

export type PixoresVideoLayer = {
  id: string;
  groupId?: string;
  trackId: string;
  type: PixoresLayerType;
  name: string;
  start: number;
  duration: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  angle?: number;
  blur?: number;
  borderRadius?: number;
  isFlippedH?: boolean;
  isFlippedV?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokePreset?: PixoresStrokePreset;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  shadowPreset?: PixoresShadowPreset;
  textBgColor?: string;
  hasTextBg?: boolean;
  textBgPadding?: number;
  textBgRadius?: number;
  textCurve?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrikethrough?: boolean;
  isUppercase?: boolean;
  hasBullets?: boolean;
  textAlign?: PixoresTextAlign;
  letterSpacing?: number;
  lineHeight?: number;
  glowColor?: string;
  glowRadius?: number;
  textEffectPreset?: PixoresTextEffectPreset;
  blendMode?: PixoresBlendMode;
  objectFit?: "cover" | "contain";
  src?: string;
  mediaKind?: PixoresMediaKind;
  assetKey?: string;
  trackOrder?: number;
  trackName?: string;
  trackMuted?: boolean;
  zIndex?: number;
  sourceStart?: number;
  sourceEnd?: number;
  trimStart?: number;
  trimEnd?: number;
  sourceDuration?: number;
  renderProxy?: boolean;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    unit: "percent";
  };
  transform?: {
    scale: number;
    x: number;
    y: number;
  };
  smartReframe?: PixoresSmartReframe;
  linkedVideoLayerId?: string;
  audioDetached?: boolean;
  volume?: number;
  muted?: boolean;
  audioFadeIn?: number;
  audioFadeOut?: number;
  audioEffects?: PixoresAudioEffectChain;
  transitionKind?: PixoresTransitionType;
  fromLayerId?: string;
  toLayerId?: string;
  cutTime?: number;
  easing?: PixoresTransition["easing"];
  animations?: PixoresLayerAnimation[];
  keyframes?: PixoresKeyframe[];
  shapeType?: PixoresShapeType;
  gradientColor1?: string;
  gradientColor2?: string;
  frameMediaLayerIds?: string[];
  effect?: PixoresLayerEffect;
  lowerThird?: LowerThirdConfig;
};

export type PixoresVideoAsset = {
  id: string;
  name: string;
  kind: PixoresMediaKind;
  url: string;
  persistentUrl?: string;
  uploadStatus?: PixoresAssetUploadStatus;
  duration?: number;
  metadata?: PixoresMediaMetadata;
};

export type PixoresVideoFormat = {
  id: string;
  label: string;
  width: number;
  height: number;
};

export type PixoresVideoProject = {
  schemaVersion: 1;
  canvas: {
    width: number;
    height: number;
  };
  duration: number;
  background: string;
  layers: PixoresVideoLayer[];
  assets: PixoresVideoAsset[];
  transitions: PixoresTransition[];
  format: PixoresVideoFormat;
  createdAt: string;
  updatedAt: string;
};

export type RenderVideoPreparedResponse = {
  ok: true;
  status: "prepared";
  renderId: string;
  project: {
    duration: number;
    width: number;
    height: number;
    layerCount: number;
    assetCount: number;
  };
  nextStep: string;
};
