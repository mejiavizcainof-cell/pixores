/**
 * Shared video project contract for Pixores.
 *
 * The editor should only need to create this JSON shape. Renderers can then
 * consume the same project without depending on React editor state.
 */

export type PixoresLayerType = "media" | "text" | "shape" | "audio" | "transition";

export type PixoresMediaKind = "image" | "video" | "audio";

export type PixoresAssetUploadStatus = "local" | "uploading" | "ready" | "error";

export type PixoresTextAlign = "left" | "center" | "right";

export type PixoresBlendMode = "normal" | "multiply" | "screen" | "darken" | "lighten";

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
  | "slideLeft"
  | "slideRight"
  | "zoomFlash";

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

export type PixoresLayerAnimationType =
  | "fadeIn"
  | "fadeOut"
  | "slideInLeft"
  | "slideInRight"
  | "slideInUp"
  | "slideInDown"
  | "zoomIn"
  | "zoomOut"
  | "pop";

export type PixoresLayerAnimation = {
  id: string;
  type: PixoresLayerAnimationType;
  start: number;
  duration: number;
};

export type PixoresKeyframeProperty = "x" | "y" | "width" | "height" | "opacity" | "angle" | "scale";

export type PixoresKeyframe = {
  id: string;
  time: number;
  property: PixoresKeyframeProperty;
  value: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
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

export type PixoresVideoLayer = {
  id: string;
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
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  textBgColor?: string;
  hasTextBg?: boolean;
  textBgPadding?: number;
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
  blendMode?: PixoresBlendMode;
  objectFit?: "cover" | "contain";
  src?: string;
  mediaKind?: PixoresMediaKind;
  assetKey?: string;
  sourceStart?: number;
  sourceEnd?: number;
  trimStart?: number;
  trimEnd?: number;
  linkedVideoLayerId?: string;
  audioDetached?: boolean;
  volume?: number;
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
