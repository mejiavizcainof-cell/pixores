"use client";
import { supabase } from "@/lib/supabaseClient";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getFontEmbedCSS, toPng } from "html-to-image";
import html2canvas from "html2canvas";
import { templates } from "@/lib/templates";
import type { AdminAsset } from "@/lib/adminAssets";
import type { EditorBrandAsset } from "@/lib/brandAssets";
import { EDITOR_VECTOR_ASSETS, vectorSvgDataUrl, type EditorVectorAsset } from "@/lib/editorVectorAssets";



type Layer = {
  id: string | number; 
  type: "text" | "image" | "shape";
  name: string;
  text?: string;
  textHtml?: string;
  src?: string;
  vectorSvg?: string;
  vectorColor?: string;
  frameImageSrc?: string;
  frameImageSrc2?: string;
  frameImageFit?: "cover" | "contain";
  frameImageX?: number;
  frameImageY?: number;
  frameImage2X?: number;
  frameImage2Y?: number;
  frameImageScale?: number;
  frameImage2Scale?: number;
  frameImageFlipH?: boolean;
  frameImageFlipV?: boolean;
  frameImage2FlipH?: boolean;
  frameImage2FlipV?: boolean;
  gridImages?: GridImage[];
  activeGridCell?: number;
  gridGap?: number;
  shapeType?:
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
  | "gridHeroTop";
  x: number; 
  y: number; 
  fontSize?: number;
  color?: string;
  useGradient?: boolean;
  gradientColor1?: string;
  gradientColor2?: string;
  gradientType?: "linear" | "radial";
  gradientPosition?: "center" | "top" | "bottom" | "left" | "right";
  gradientDirection?:
  | "top-bottom"
  | "bottom-top"
  | "left-right"
  | "right-left"
  | "diagonal";
  fontFamily?: string;
  width?: number; 
  height?: number; 
  strokeColor?: string;
  strokeWidth?: number;
  glowColor?: string;
  glowRadius?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrikethrough?: boolean;
  isUppercase?: boolean;
  textAlign?: "left" | "center" | "right" | "justify";
  letterSpacing?: number;
  lineHeight?: number;
  textAnimation?: "none" | "pop" | "float";
  borderRadius?: number;
  textBgColor?: string;
  hasTextBg?: boolean;
  textBgPadding?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  blendMode?: "normal" | "multiply" | "screen" | "darken" | "lighten";
  isFlippedH?: boolean; 
  isFlippedV?: boolean; 
  hasImageStroke?: boolean;
  imageStrokeColor?: string;
  imageStrokeWidth?: number;
  opacity?: number; 
  blur?: number;    
  cropTop?: number;
  constrainBottom?: number; 
  cropLeft?: number;
  cropRight?: number;
  angle?: number; 
  isLocked?: boolean;
};

type GridImage = {
  src?: string;
  fit?: "cover" | "contain";
  x?: number;
  y?: number;
  scale?: number;
  flipH?: boolean;
  flipV?: boolean;
};

type GridCell = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ResizeState = {
  corner: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "rotation" | null;
  initialWidth: number;
  initialHeight: number;
  initialFontSize: number;
  initialX: number;
  initialY: number;
  mouseX: number;
  mouseY: number;
  initialCropTop: number;
  initialCropBottom: number;
  initialCropLeft: number;
  initialCropRight: number;
  initialAngle: number;
};

type ImportedFile = {
  url: string;
  name: string;
};

type BackgroundAsset = {
  name: string;
  src: string;
};

type BackgroundCategory = {
  name: string;
  assets: BackgroundAsset[];
};

type BrandAsset = EditorBrandAsset;

type EditorImageAsset = {
  category: "people" | "objects";
  name: string;
  src: string;
};

type AssetTab = "people" | "objects" | "elements" | "plants" | "animals" | "shapes" | "frames" | "grids" | "gradients" | "social" | "emojis" | "brand";

type EditorShapeAsset = {
  name: string;
  shapeType: Layer["shapeType"];
  color: string;
};

type SocialMediaAsset = {
  name: string;
  src: string;
  color: string;
};

type EditableTemplateData = {
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string;
  canvasStrokeColor: string;
  canvasStrokeWidth: number;
  preview: string | null;
  layers: Layer[];
};
const PREMADE_ASSETS = [

  { category: "people", name: "Shocked Man", src: "/template-assets/people/shocked-man.png" },
  { category: "people", name: "Shocked Woman", src: "/template-assets/people/shocked-woman.png" },
  { category: "people", name: "Business Man", src: "/template-assets/people/business-man.png" },
  { category: "people", name: "Podcast Host", src: "/template-assets/people/podcast-host.png" },
  { category: "people", name: "Gamer", src: "/template-assets/people/gamer.png" },
  { category: "people", name: "Young Woman", src: "/template-assets/people/young-woman.png" },
  { category: "people", name: "Young Man", src: "/template-assets/people/young-man.png" },
  { category: "people", name: "Professional Woman", src: "/template-assets/people/professional-woman.png" },
  { category: "people", name: "Professional Man", src: "/template-assets/people/professional-man.png" },
  { category: "people", name: "Teen Girl", src: "/template-assets/people/teen-girl.png" },
  { category: "people", name: "Teen Boy", src: "/template-assets/people/teen-boy.png" },
  { category: "people", name: "Girl", src: "/template-assets/people/girl-child.png" },
  { category: "people", name: "Boy", src: "/template-assets/people/boy-child.png" },
  { category: "people", name: "Baseball Player", src: "/template-assets/people/baseball-player.png" },
  { category: "people", name: "Basketball Player", src: "/template-assets/people/basketball-player.png" },
  { category: "people", name: "Soccer Player", src: "/template-assets/people/soccer-player.png" },
  { category: "people", name: "American Football Player", src: "/template-assets/people/american-football-player.png" },
  { category: "people", name: "Tennis Player", src: "/template-assets/people/tennis-player.png" },
  { category: "people", name: "Swimmer", src: "/template-assets/people/swimmer.png" },
  { category: "people", name: "Female Runner", src: "/template-assets/people/female-runner.png" },
  { category: "people", name: "Male Runner", src: "/template-assets/people/male-runner.png" },

  { category: "objects", name: "Red Arrow", src: "/template-assets/objects/red-arrow.png" },
  { category: "objects", name: "Yellow Arrow", src: "/template-assets/objects/yellow-arrow.png" },
  { category: "objects", name: "Circle Highlight", src: "/template-assets/objects/circle-highlight.png" },
  { category: "objects", name: "Money Stack", src: "/template-assets/objects/money-stack.png" },
  { category: "objects", name: "Fire", src: "/template-assets/objects/fire.png" },
    { category: "objects", name: "Brush", src: "/template-assets/objects/brush-black-1.png" },
   { category: "objects", name: "Marcos", src: "/template-assets/objects/marcos.png" },
   { category: "objects", name: "Lineas", src: "/template-assets/objects/solid-line.png" },
  { category: "objects", name: "YouTube Logo", src: "/template-assets/objects/youtube-logo.png" },
  { category: "objects", name: "Microphone", src: "/template-assets/objects/microphone.png" },
  { category: "objects", name: "Realistic Black Torn Paper", src: "/template-assets/objects/torn-paper-black-realistic.png" },
  { category: "objects", name: "Realistic White Crumpled Paper", src: "/template-assets/objects/crumpled-paper-white-realistic.png" },
  { category: "objects", name: "Blue Torn Paper", src: "/template-assets/objects/torn-paper-blue.png" },
  { category: "objects", name: "White Torn Paper", src: "/template-assets/objects/torn-paper-white.png" },
  { category: "objects", name: "Gold Paper Fold", src: "/template-assets/objects/paper-fold-gold.png" },
  { category: "objects", name: "Black Brush Stroke", src: "/template-assets/objects/brush-stroke-black-2.png" },
  { category: "objects", name: "Orange Brush Stroke", src: "/template-assets/objects/brush-stroke-orange.png" },
  { category: "objects", name: "Black Halftone Circle", src: "/template-assets/objects/halftone-circle-black.png" },
  { category: "objects", name: "Black Halftone Corner", src: "/template-assets/objects/halftone-corner-black.png" },
  { category: "objects", name: "Black Halftone Fade", src: "/template-assets/objects/halftone-fade-black.png" },
  { category: "objects", name: "Black Halftone Wave", src: "/template-assets/objects/halftone-wave-black.png" },
  { category: "objects", name: "Red Halftone Circle", src: "/template-assets/objects/halftone-circle-red.png" },
  { category: "objects", name: "Orange Halftone Corner", src: "/template-assets/objects/halftone-corner-orange.png" },
  { category: "objects", name: "Blue Halftone Fade", src: "/template-assets/objects/halftone-fade-blue.png" },
  { category: "objects", name: "Teal Halftone Wave", src: "/template-assets/objects/halftone-wave-teal.png" },
  { category: "objects", name: "Soft Oval Shadow", src: "/template-assets/objects/shadow-soft-oval.png" },
  { category: "objects", name: "Soft Circle Shadow", src: "/template-assets/objects/shadow-soft-circle.png" },
  { category: "objects", name: "Bottom Edge Shadow", src: "/template-assets/objects/shadow-edge-bottom.png" },
  { category: "objects", name: "Diagonal Shadow", src: "/template-assets/objects/shadow-diagonal.png" },
  { category: "objects", name: "Outline Microphone", src: "/template-assets/objects/icon-microphone-outline.png" },
  { category: "objects", name: "Retro Microphone", src: "/template-assets/objects/icon-retro-microphone.png" },
  { category: "objects", name: "Megaphone", src: "/template-assets/objects/icon-megaphone.png" },
  { category: "objects", name: "Ear and Sound", src: "/template-assets/objects/icon-ear-sound.png" },
  { category: "objects", name: "Radio Tower", src: "/template-assets/objects/icon-radio-tower.png" },
  { category: "objects", name: "Speaking Voice", src: "/template-assets/objects/icon-voice-speaking.png" },
  { category: "objects", name: "Rainbow Sound Wave", src: "/template-assets/objects/sound-wave-rainbow.png" },
  { category: "objects", name: "Teal Plus Pattern", src: "/template-assets/objects/pattern-plus-teal.png" },
  { category: "objects", name: "Dotted Triangle", src: "/template-assets/objects/pattern-dots-triangle.png" },
  { category: "objects", name: "Ellipse Highlight", src: "/template-assets/objects/ellipse-highlight.png" },
  { category: "objects", name: "Line Graph", src: "/template-assets/objects/line-graph.png" },
  { category: "objects", name: "Cracked Glass", src: "/template-assets/objects/cracked-glass.png" },
  { category: "objects", name: "Live Badge", src: "/template-assets/objects/badge-live.png" },
  { category: "objects", name: "Live Play Badge", src: "/template-assets/objects/badge-live-play.png" },
  { category: "objects", name: "Subscribe Badge", src: "/template-assets/objects/badge-subscribe.png" },
  { category: "objects", name: "Stream Now Badge", src: "/template-assets/objects/badge-stream-now.png" },
  { category: "objects", name: "Watch Now Badge", src: "/template-assets/objects/badge-watch-now.png" },
];

const PREMADE_SHAPES = [
  { name: "Blue Box", shapeType: "rectangle" as const, color: "#3B82F6" },
  { name: "Red Box", shapeType: "rectangle" as const, color: "#EF4444" },
  { name: "Yellow Circle", shapeType: "circle" as const, color: "#FACC15" },
  { name: "Green Circle", shapeType: "circle" as const, color: "#22C55E" },
  { name: "Red Triangle", shapeType: "triangle" as const, color: "#EF4444" },
  { name: "Yellow Triangle", shapeType: "triangle" as const, color: "#FACC15" },
  { name: "Star", shapeType: "star" as const, color: "#FACC15" },
  { name: "Badge", shapeType: "badge" as const, color: "#EF4444" },
  { name: "Speech Bubble", shapeType: "speechBubble" as const, color: "#FFFFFF" },
  { name: "Arrow", shapeType: "arrow" as const, color: "#EF4444" },
  { name: "Line", shapeType: "line" as const, color: "#0F172A" },
  { name: "Black Line", shapeType: "line" as const, color: "#0F172A" },
{ name: "Dashed Line", shapeType: "dashedLine" as const, color: "#0F172A" },
];

const SOCIAL_MEDIA_ASSETS: SocialMediaAsset[] = [
  { name: "YouTube", src: "/template-assets/social/youtube.svg", color: "#FF0000" },
  { name: "Instagram", src: "/template-assets/social/instagram.svg", color: "#E4405F" },
  { name: "Facebook", src: "/template-assets/social/facebook.svg", color: "#0866FF" },
  { name: "TikTok", src: "/template-assets/social/tiktok.svg", color: "#000000" },
  { name: "X", src: "/template-assets/social/x.svg", color: "#000000" },
  { name: "LinkedIn", src: "/template-assets/social/linkedin.svg", color: "#0A66C2" },
  { name: "Pinterest", src: "/template-assets/social/pinterest.svg", color: "#BD081C" },
  { name: "Snapchat", src: "/template-assets/social/snapchat.svg", color: "#FFFC00" },
  { name: "WhatsApp", src: "/template-assets/social/whatsapp.svg", color: "#25D366" },
  { name: "Telegram", src: "/template-assets/social/telegram.svg", color: "#26A5E4" },
  { name: "Twitch", src: "/template-assets/social/twitch.svg", color: "#9146FF" },
  { name: "Discord", src: "/template-assets/social/discord.svg", color: "#5865F2" },
  { name: "Reddit", src: "/template-assets/social/reddit.svg", color: "#FF4500" },
  { name: "Threads", src: "/template-assets/social/threads.svg", color: "#000000" },
  { name: "Spotify", src: "/template-assets/social/spotify.svg", color: "#1ED760" },
  { name: "Vimeo", src: "/template-assets/social/vimeo.svg", color: "#1AB7EA" },
  { name: "Bluesky", src: "/template-assets/social/bluesky.svg", color: "#0285FF" },
  { name: "Mastodon", src: "/template-assets/social/mastodon.svg", color: "#6364FF" },
];

const PREMADE_GRADIENTS = [
  { name: "Blue Fade", type: "linear" as const, color1: "#FFFFFF", color2: "#1261D6", direction: "top-bottom" as const },
  { name: "Dark Fade", type: "linear" as const, color1: "#0F172A", color2: "#FFFFFF", direction: "top-bottom" as const },
  { name: "Navy Fade", type: "linear" as const, color1: "#FFFFFF", color2: "#172A72", direction: "top-bottom" as const },
  { name: "Purple Side Fade", type: "linear" as const, color1: "#7C3AED", color2: "#FFFFFF", direction: "left-right" as const },
  { name: "Orange Fade", type: "linear" as const, color1: "#FFFFFF", color2: "#F97316", direction: "top-bottom" as const },
  { name: "Red Band", type: "linear" as const, color1: "#FFFFFF", color2: "#EF4444", direction: "top-bottom" as const },
  { name: "Pink Glow", type: "radial" as const, color1: "#EC4899", color2: "#FFFFFF", position: "center" as const },
  { name: "Blue Glow", type: "radial" as const, color1: "#0284C7", color2: "#FFFFFF", position: "center" as const },
  { name: "Lime Glow", type: "radial" as const, color1: "#A3E635", color2: "#FFFFFF", position: "center" as const },
  { name: "Black Glow", type: "radial" as const, color1: "#000000", color2: "#FFFFFF", position: "center" as const },
  { name: "Bottom Shadow", type: "radial" as const, color1: "#111827", color2: "#FFFFFF", position: "bottom" as const },
  { name: "Top Spotlight", type: "radial" as const, color1: "#FFFFFF", color2: "#0F172A", position: "top" as const },
];

const getGradientFill = (gradient: Pick<Layer, "gradientType" | "gradientPosition" | "gradientDirection" | "gradientColor1" | "gradientColor2" | "color">) => {
  const color1 = gradient.gradientColor1 || gradient.color || "#3B82F6";
  const color2 = gradient.gradientColor2 || "#8B5CF6";

  if (gradient.gradientType === "radial") {
    const positionMap = { center: "center", top: "center top", bottom: "center bottom", left: "left center", right: "right center" };
    return `radial-gradient(circle at ${positionMap[gradient.gradientPosition || "center"]}, ${color1} 0%, ${color2} 72%)`;
  }

  const directionMap = { "top-bottom": "180deg", "bottom-top": "0deg", "left-right": "90deg", "right-left": "270deg", diagonal: "135deg" };
  return `linear-gradient(${directionMap[gradient.gradientDirection || "diagonal"]}, ${color1}, ${color2})`;
};

const PREMADE_FRAMES = [
  { name: "Frame", shapeType: "frame" as const, color: "#EF4444" },
  { name: "Rounded Frame", shapeType: "roundedFrame" as const, color: "#3B82F6" },
  { name: "Circle Frame", shapeType: "circleFrame" as const, color: "#FACC15" },
  { name: "Triangle Frame", shapeType: "triangleFrame" as const, color: "#22C55E" },
  { name: "Paper Wide", shapeType: "paperFrame" as const, color: "#F8F1E8" },
  { name: "Paper Portrait", shapeType: "paperPortraitFrame" as const, color: "#F8F1E8" },
  { name: "Paper Square", shapeType: "paperSquareFrame" as const, color: "#F8F1E8" },
  { name: "Torn Paper", shapeType: "paperStripFrame" as const, color: "#F8F1E8" },
  { name: "Paper Left", shapeType: "paperLeftFrame" as const, color: "#F8F1E8" },
  { name: "Paper Right", shapeType: "paperRightFrame" as const, color: "#F8F1E8" },
  { name: "Phone", shapeType: "phoneFrame" as const, color: "#111827" },
  { name: "Tablet", shapeType: "tabletFrame" as const, color: "#111827" },
  { name: "Laptop", shapeType: "laptopFrame" as const, color: "#111827" },
  { name: "VS Divider", shapeType: "vsDividerFrame" as const, color: "#FACC15" },
  { name: "Split Screen", shapeType: "splitScreenFrame" as const, color: "#2563EB" },
  { name: "Diagonal Split", shapeType: "diagonalSplitFrame" as const, color: "#EF4444" },
];

const PREMADE_GRIDS = [
  { name: "Single Photo", shapeType: "gridSingle" as const, color: "#FFFFFF" },
  { name: "Two Columns", shapeType: "gridTwoColumns" as const, color: "#FFFFFF" },
  { name: "Two Rows", shapeType: "gridTwoRows" as const, color: "#FFFFFF" },
  { name: "Three Columns", shapeType: "gridThreeColumns" as const, color: "#FFFFFF" },
  { name: "Three Rows", shapeType: "gridThreeRows" as const, color: "#FFFFFF" },
  { name: "Four Photos", shapeType: "gridFour" as const, color: "#FFFFFF" },
  { name: "Feature Left", shapeType: "gridHeroLeft" as const, color: "#FFFFFF" },
  { name: "Feature Top", shapeType: "gridHeroTop" as const, color: "#FFFFFF" },
];

const PREMADE_EMOJIS = [
  { name: "Happy Face", emoji: "😀" },
  { name: "Big Smile", emoji: "😃" },
  { name: "Laugh", emoji: "😂" },
  { name: "Joy", emoji: "🤣" },
  { name: "Smile", emoji: "😊" },
  { name: "Cool", emoji: "😎" },
  { name: "Thinking", emoji: "🤔" },
  { name: "Shocked", emoji: "😱" },
  { name: "Surprised", emoji: "😲" },
  { name: "Mind Blown", emoji: "🤯" },
  { name: "Angry", emoji: "😡" },
  { name: "Cry", emoji: "😭" },
  { name: "Sad", emoji: "😢" },
  { name: "Wink", emoji: "😉" },
  { name: "Love Face", emoji: "😍" },
  { name: "Suspicious", emoji: "🤨" },
  { name: "Shush", emoji: "🤫" },
  { name: "Sick", emoji: "🤢" },
  { name: "Exploding", emoji: "😵‍💫" },
  { name: "Party", emoji: "🥳" },
  { name: "Fire", emoji: "🔥" },
  { name: "Star", emoji: "⭐" },
  { name: "Sparkles", emoji: "✨" },
  { name: "Warning", emoji: "⚠️" },
  { name: "Money", emoji: "💰" },
  { name: "Rocket", emoji: "🚀" },
  { name: "Target", emoji: "🎯" },
  { name: "Eyes", emoji: "👀" },
  { name: "Thumbs Up", emoji: "👍" },
  { name: "Heart", emoji: "❤️" },
  { name: "Lightning", emoji: "⚡" },
  { name: "Check", emoji: "✅" },
  { name: "Cross", emoji: "❌" },
  { name: "Question", emoji: "❓" },
  { name: "Alarm", emoji: "🚨" },
  { name: "Megaphone", emoji: "📣" },
  { name: "Crown", emoji: "👑" },
  { name: "Trophy", emoji: "🏆" },
  { name: "Camera", emoji: "📸" },
  { name: "Shopping", emoji: "🛒" },
  { name: "Phone", emoji: "📱" },
  { name: "Laptop", emoji: "💻" },
  { name: "Chart", emoji: "📈" },
  { name: "Pin", emoji: "📍" },
];

const PAPER_FRAME_SHAPE_TYPES = ["paperFrame", "paperPortraitFrame", "paperSquareFrame", "paperStripFrame", "paperLeftFrame", "paperRightFrame"];
const DEVICE_FRAME_SHAPE_TYPES = ["phoneFrame", "tabletFrame", "laptopFrame"];
const COMPOSITION_FRAME_SHAPE_TYPES = ["vsDividerFrame", "splitScreenFrame", "diagonalSplitFrame"];
const GRID_SHAPE_TYPES = ["gridSingle", "gridTwoColumns", "gridTwoRows", "gridThreeColumns", "gridThreeRows", "gridFour", "gridHeroLeft", "gridHeroTop"];
const FRAME_SHAPE_TYPES = ["frame", "roundedFrame", "circleFrame", "triangleFrame", ...PAPER_FRAME_SHAPE_TYPES, ...DEVICE_FRAME_SHAPE_TYPES, ...COMPOSITION_FRAME_SHAPE_TYPES, ...GRID_SHAPE_TYPES];

const getGridCells = (shapeType?: Layer["shapeType"]): GridCell[] => {
  switch (shapeType) {
    case "gridTwoColumns":
      return [{ x: 0, y: 0, width: 50, height: 100 }, { x: 50, y: 0, width: 50, height: 100 }];
    case "gridTwoRows":
      return [{ x: 0, y: 0, width: 100, height: 50 }, { x: 0, y: 50, width: 100, height: 50 }];
    case "gridThreeColumns":
      return [{ x: 0, y: 0, width: 33.333, height: 100 }, { x: 33.333, y: 0, width: 33.334, height: 100 }, { x: 66.667, y: 0, width: 33.333, height: 100 }];
    case "gridThreeRows":
      return [{ x: 0, y: 0, width: 100, height: 33.333 }, { x: 0, y: 33.333, width: 100, height: 33.334 }, { x: 0, y: 66.667, width: 100, height: 33.333 }];
    case "gridFour":
      return [{ x: 0, y: 0, width: 50, height: 50 }, { x: 50, y: 0, width: 50, height: 50 }, { x: 0, y: 50, width: 50, height: 50 }, { x: 50, y: 50, width: 50, height: 50 }];
    case "gridHeroLeft":
      return [{ x: 0, y: 0, width: 62, height: 100 }, { x: 62, y: 0, width: 38, height: 50 }, { x: 62, y: 50, width: 38, height: 50 }];
    case "gridHeroTop":
      return [{ x: 0, y: 0, width: 100, height: 62 }, { x: 0, y: 62, width: 50, height: 38 }, { x: 50, y: 62, width: 50, height: 38 }];
    default:
      return [{ x: 0, y: 0, width: 100, height: 100 }];
  }
};

const BACKGROUND_VISIBLE_STEP = 12;
const BRAND_ASSETS_STORAGE_KEY = "pixores-brand-assets-v1";
const BRAND_ASSETS_MAX_ITEMS = 24;
const BRAND_ASSETS_MAX_STORAGE_CHARS = 3_800_000;

const PRESET_SIZES = {
  youtube: { name: "YouTube Thumbnail", width: 1280, height: 720 },
  facebook: { name: "Facebook Post", width: 1200, height: 630 },
  instagram_post: { name: "Instagram Post", width: 1080, height: 1080 },
  instagram_story: { name: "Instagram Story", width: 1080, height: 1920 },
  custom: { name: "Custom Size", width: 1080, height: 990 }
};

const getPresetForDimensions = (width: number, height: number): keyof typeof PRESET_SIZES => {
  const match = (Object.entries(PRESET_SIZES) as Array<[keyof typeof PRESET_SIZES, { width: number; height: number }]>)
    .find(([key, size]) => key !== "custom" && size.width === width && size.height === height);
  return match?.[0] || "custom";
};

const getAdminTemplateSourceId = (asset?: AdminAsset | null) => {
  const sourceTemplateId = asset?.metadata?.sourceTemplateId;
  return typeof sourceTemplateId === "string" ? sourceTemplateId : null;
};

const FONT_GROUPS = [
  {
    label: "Popular",
    fonts: ["Inter", "Montserrat", "Poppins", "Roboto", "Open Sans", "Lato", "Oswald", "Bebas Neue"],
  },
  {
    label: "Bold & Display",
    fonts: [
      "Anton", "Archivo Black", "Alfa Slab One", "Black Ops One", "Bowlby One SC", "Bungee",
      "Fjalla One", "League Spartan", "Luckiest Guy", "Passion One", "Permanent Marker", "Russo One",
      "Staatliches", "Teko", "Titan One", "Ultra",
    ],
  },
  {
    label: "Modern Sans Serif",
    fonts: [
      "Archivo", "Barlow", "Cabin", "DM Sans", "Exo 2", "Figtree", "Josefin Sans", "Kanit",
      "Manrope", "Mulish", "Nunito Sans", "Outfit", "Plus Jakarta Sans", "Quicksand", "Raleway",
      "Roboto Condensed", "Rubik", "Space Grotesk", "Ubuntu", "Work Sans",
    ],
  },
  {
    label: "Serif & Editorial",
    fonts: [
      "Abril Fatface", "Bitter", "Bodoni Moda", "Cinzel", "Cormorant Garamond", "DM Serif Display",
      "Libre Baskerville", "Lora", "Merriweather", "Noto Serif", "Playfair Display", "Roboto Slab",
      "Source Serif 4", "Spectral",
    ],
  },
  {
    label: "Script & Handwritten",
    fonts: [
      "Caveat", "Courgette", "Dancing Script", "Great Vibes", "Kaushan Script", "Lobster",
      "Pacifico", "Patrick Hand", "Sacramento", "Satisfy", "Shadows Into Light", "Yellowtail",
    ],
  },
  {
    label: "System Fonts",
    fonts: [
      "Arial", "Arial Black", "Comic Sans MS", "Courier New", "Georgia", "Impact", "Tahoma",
      "Times New Roman", "Trebuchet MS", "Verdana",
    ],
  },
] as const;

const SYSTEM_FONT_NAMES = new Set(FONT_GROUPS.find((group) => group.label === "System Fonts")?.fonts || []);
const PRELOADED_GOOGLE_FONTS = new Set(["Anton", "Bebas Neue", "Inter", "Montserrat", "Poppins"]);

const ensureEditorFontLoaded = (fontFamily?: string) => {
  if (!fontFamily || typeof document === "undefined" || SYSTEM_FONT_NAMES.has(fontFamily as never) || PRELOADED_GOOGLE_FONTS.has(fontFamily)) return;

  const linkId = `pixores-font-${fontFamily.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, "+")}&display=swap`;
  document.head.appendChild(link);
};

const TEXT_PRESETS = [
  { label: "Bold Title", text: "Bold Title", fontSize: 64, fontFamily: "Anton", isBold: true, color: "#111827" },
  { label: "Clean Subtitle", text: "Clean Subtitle", fontSize: 38, fontFamily: "Trebuchet MS", isBold: true, color: "#1F2937" },
  { label: "Body Caption", text: "Body Caption", fontSize: 26, fontFamily: "Georgia", isBold: false, color: "#334155" },
];

const TEXT_SIZE_OPTIONS = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120, 144, 180, 240, 300];

const escapeTextHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

const normalizeColorToHex = (color?: string) => {
  if (!color) return null;
  const value = color.trim();
  const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    return `#${hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex}`.toUpperCase();
  }

  const rgbMatch = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!rgbMatch) return null;
  return `#${rgbMatch.slice(1, 4).map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
};

export default function ThumbnailEditorV2() {
  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  useEffect(() => {
    console.log("Supabase:", supabase);
  }, []);
  const [preview, setPreview] = useState<string | null>(null);
  const [canvasBgColor, setCanvasBgColor] = useState<string>("#FFFFFF");
  const [canvasStrokeColor, setCanvasStrokeColor] = useState<string>("#0F172A");
  const [canvasStrokeWidth, setCanvasStrokeWidth] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isMobileLayout, setIsMobileLayout] = useState<boolean>(false);
  const [mobileViewport, setMobileViewport] = useState({ width: 390, height: 800 });
  const [undoStack, setUndoStack] = useState<Layer[][]>([]);
  const [redoStack, setRedoStack] = useState<Layer[][]>([]);
  
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(1);
  const [backgroundBlur, setBackgroundBlur] = useState<number>(0);
  const [backgroundCategories, setBackgroundCategories] = useState<BackgroundCategory[]>([]);
  const [backgroundCategory, setBackgroundCategory] = useState<string>("");
  const [visibleBackgroundCount, setVisibleBackgroundCount] = useState<number>(BACKGROUND_VISIBLE_STEP);
  const [isLoadingBackgrounds, setIsLoadingBackgrounds] = useState<boolean>(false);
  const [adminAssets, setAdminAssets] = useState<AdminAsset[]>([]);
  const [adminAssetsLoaded, setAdminAssetsLoaded] = useState(false);
  const [currentTemplateAssetId, setCurrentTemplateAssetId] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const [currentPreset, setCurrentPreset] = useState<keyof typeof PRESET_SIZES>("youtube");
  const [canvasWidth, setCanvasWidth] = useState<number>(1280);
  const [canvasHeight, setCanvasHeight] = useState<number>(720);

  const [draggingLayerId, setDraggingLayerId] = useState<string | number | null>(null);
  const [importedImages, setImportedImages] = useState<ImportedFile[]>([]);
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);
  const [brandStorageWarning, setBrandStorageWarning] = useState<string | null>(null);
  const [saveImportsToBrand, setSaveImportsToBrand] = useState<boolean>(false);
  const [isCropMode, setIsCropMode] = useState<boolean>(false);
  const [assetTab, setAssetTab] = useState<AssetTab>("people");
  const [vectorAssetColor, setVectorAssetColor] = useState("#111827");
  const [mobilePanel, setMobilePanel] = useState<"elements" | "tools" | "edit" | "export" | null>(null);
  const [mobileAssetSection, setMobileAssetSection] = useState<"elements" | "uploads">("elements");
  const [textSearch, setTextSearch] = useState<string>("");
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | number | null>(null);
  const [textSelectionPreview, setTextSelectionPreview] = useState<{ layerId: string | number; start: number; end: number; text: string } | null>(null);
  const [activeTextColor, setActiveTextColor] = useState<string | null>(null);

  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [showProjects, setShowProjects] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

 const [layers, setLayers] = useState<Layer[]>([]);

  useEffect(() => {
    layers.forEach((layer) => {
      if (layer.type === "text") ensureEditorFontLoaded(layer.fontFamily);
    });
  }, [layers]);

  const [selectedLayerId, setSelectedLayerId] = useState<string | number | null>(null);
  const [workspaceScale, setWorkspaceScale] = useState(1);
  const [centerWorkspaceSize, setCenterWorkspaceSize] = useState({ width: 0, height: 0 });
  const workspaceRef = useRef<HTMLDivElement>(null);
  const centerWorkspaceRef = useRef<HTMLElement>(null);
  const uploadsSectionRef = useRef<HTMLLabelElement>(null);
  const initialDragOffset = useRef({ x: 0, y: 0 });
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingHistoryRef = useRef(false);
  const lastHistorySnapshotRef = useRef<string>("[]");
  const savedTextSelectionRef = useRef<{ layerId: string | number; start: number; end: number } | null>(null);
  const textEditDraftRef = useRef<{ layerId: string | number; text: string; textHtml: string } | null>(null);
  const pendingTextEditRef = useRef<{ layerId: string | number; text: string; html: string; selectAll: boolean } | null>(null);
  const lastTextTouchRef = useRef<{ layerId: string | number | null; time: number }>({ layerId: null, time: 0 });
  const hasLoadedBrandAssetsRef = useRef(false);
  const loadedTemplateIdRef = useRef<string | null>(null);
  const previousLayerCountRef = useRef(layers.length);

  useEffect(() => {
    const previousCount = previousLayerCountRef.current;
    previousLayerCountRef.current = layers.length;

    if (isMobileLayout && mobilePanel && layers.length > previousCount) {
      setMobilePanel(null);
    }
  }, [layers.length, isMobileLayout, mobilePanel]);

  useEffect(() => {
    const draft = textEditDraftRef.current;
    if (!draft || selectedLayerId === draft.layerId) return;

    setLayers((currentLayers) => currentLayers.map((currentLayer) => (
      currentLayer.id === draft.layerId
        ? { ...currentLayer, text: draft.text, textHtml: draft.textHtml }
        : currentLayer
    )));
    textEditDraftRef.current = null;
    setEditingTextLayerId(null);
    setTextSelectionPreview(null);
  }, [selectedLayerId]);

  const [resizeState, setResizeState] = useState<ResizeState>({
    corner: null,
    initialWidth: 0,
    initialHeight: 0,
    initialFontSize: 0,
    initialX: 0,
    initialY: 0,
    mouseX: 0,
    mouseY: 0,
    initialCropTop: 0,
    initialCropBottom: 0,
    initialCropLeft: 0,
    initialCropRight: 0,
    initialAngle: 0,
  });
  const searchParams = useSearchParams();
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
  const mobileCanvasDisplayWidth = mobilePanel
    ? Math.max(150, Math.min(mobileViewport.width - 24, Math.max(120, mobileViewport.height * 0.6 - 170) * (canvasWidth / canvasHeight)))
    : null;
  const canvasAspectRatio = canvasWidth / canvasHeight;
  const fittedCanvasDisplayWidth = centerWorkspaceSize.width && centerWorkspaceSize.height
    ? Math.max(
        120,
        Math.min(
          isMobileLayout ? centerWorkspaceSize.width - 24 : 820,
          centerWorkspaceSize.width - (isMobileLayout ? 24 : 60),
          Math.max(120, centerWorkspaceSize.height - (isMobileLayout ? 150 : 155)) * canvasAspectRatio,
          mobileCanvasDisplayWidth || Number.POSITIVE_INFINITY,
        ),
      )
    : mobileCanvasDisplayWidth;

  useEffect(() => {
    const centerWorkspace = centerWorkspaceRef.current;
    if (!centerWorkspace || !isClientMounted) return;

    const updateCenterWorkspaceSize = () => {
      setCenterWorkspaceSize({
        width: centerWorkspace.clientWidth,
        height: centerWorkspace.clientHeight,
      });
    };

    updateCenterWorkspaceSize();
    const observer = new ResizeObserver(updateCenterWorkspaceSize);
    observer.observe(centerWorkspace);
    window.addEventListener("resize", updateCenterWorkspaceSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateCenterWorkspaceSize);
    };
  }, [isClientMounted, isMobileLayout]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const updateWorkspaceScale = () => {
      const width = workspace.clientWidth;
      const height = workspace.clientHeight;
      if (!width || !height) return;
      setWorkspaceScale(Math.max(0.05, Math.min(width / canvasWidth, height / canvasHeight)));
    };

    updateWorkspaceScale();
    const observer = new ResizeObserver(updateWorkspaceScale);
    observer.observe(workspace);
    window.addEventListener("resize", updateWorkspaceScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWorkspaceScale);
    };
  }, [isClientMounted, canvasWidth, canvasHeight, isMobileLayout, mobileCanvasDisplayWidth]);

  useEffect(() => {
    if (!selectedLayer || selectedLayer.type !== "text") {
      setActiveTextColor(null);
      return;
    }

    const richTextColor = selectedLayer.textHtml?.match(/color\s*:\s*([^;"']+)/i)?.[1];
    setActiveTextColor(normalizeColorToHex(richTextColor) || normalizeColorToHex(selectedLayer.color) || "#000000");
  }, [selectedLayerId]);
  const adminBackgroundAssets: BackgroundAsset[] = adminAssets
    .filter((asset) => asset.category === "backgrounds" && (asset.preview_url || asset.original_url))
    .map((asset) => ({
      name: asset.name,
      src: asset.preview_url || asset.original_url || "",
    }));
  const allBackgroundCategories = adminBackgroundAssets.length
    ? [...backgroundCategories, { name: "Admin Uploads", assets: adminBackgroundAssets }]
    : backgroundCategories;
  const selectedBackgroundCategory =
    allBackgroundCategories.find((category) => category.name === backgroundCategory) ||
    allBackgroundCategories[0];
  const visibleBackgroundAssets = selectedBackgroundCategory?.assets.slice(0, visibleBackgroundCount) || [];
  const editorImageAssets: EditorImageAsset[] = [
    ...(PREMADE_ASSETS as EditorImageAsset[]),
    ...adminAssets
      .filter((asset) => (asset.category === "people" || asset.category === "objects") && (asset.preview_url || asset.original_url))
      .map((asset) => ({
        category: asset.category as "people" | "objects",
        name: asset.name,
        src: asset.preview_url || asset.original_url || "",
      })),
  ];
  const editorShapeAssets: EditorShapeAsset[] = [
    ...PREMADE_SHAPES,
    ...adminAssets
      .filter((asset) => asset.category === "shapes" && asset.metadata?.shapeType)
      .map((asset) => ({
        name: asset.name,
        shapeType: asset.metadata?.shapeType as Layer["shapeType"],
        color: typeof asset.metadata?.color === "string" ? asset.metadata.color : "#3B82F6",
      })),
  ];
  const editorFrameAssets: EditorShapeAsset[] = [
    ...PREMADE_FRAMES,
    ...adminAssets
      .filter((asset) => asset.category === "frames" && asset.metadata?.shapeType)
      .map((asset) => ({
        name: asset.name,
        shapeType: asset.metadata?.shapeType as Layer["shapeType"],
        color: typeof asset.metadata?.color === "string" ? asset.metadata.color : "#FFFFFF",
      })),
  ];

  useEffect(() => {
    try {
      const savedAssets = window.localStorage.getItem(BRAND_ASSETS_STORAGE_KEY);
      if (savedAssets) {
        const parsedAssets = JSON.parse(savedAssets);
        if (Array.isArray(parsedAssets)) {
          setBrandAssets(parsedAssets);
        }
      }
    } catch (error) {
      console.error("Unable to load My Brand assets:", error);
    } finally {
      hasLoadedBrandAssetsRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedBrandAssetsRef.current) return;

    try {
      const localOnlyAssets = brandAssets.filter((asset) => !asset.isRemote);
      const compactAssets = localOnlyAssets.slice(0, BRAND_ASSETS_MAX_ITEMS);
      let payload = JSON.stringify(compactAssets);
      let limitedAssets = compactAssets;

      while (payload.length > BRAND_ASSETS_MAX_STORAGE_CHARS && limitedAssets.length > 0) {
        limitedAssets = limitedAssets.slice(0, -1);
        payload = JSON.stringify(limitedAssets);
      }

      window.localStorage.setItem(BRAND_ASSETS_STORAGE_KEY, payload);
      setBrandStorageWarning(
        limitedAssets.length < localOnlyAssets.length
          ? `My Brand local storage is almost full. ${limitedAssets.length} of ${localOnlyAssets.length} unsynced items will stay saved after reload.`
          : null
      );
    } catch (error) {
      console.error("Unable to save My Brand assets:", error);
      const fallbackAssets = brandAssets.filter((asset) => !asset.isRemote).slice(0, Math.min(3, brandAssets.length));
      try {
        window.localStorage.setItem(BRAND_ASSETS_STORAGE_KEY, JSON.stringify(fallbackAssets));
        setBrandStorageWarning(
          `Browser storage is full. ${fallbackAssets.length} My Brand item${fallbackAssets.length === 1 ? "" : "s"} will stay saved after reload.`
        );
      } catch {
        setBrandStorageWarning("Browser storage is full. My Brand items are available in this session, but they may not stay saved after reload.");
      }
    }
  }, [brandAssets]);

  useEffect(() => {
    let cancelled = false;

    const syncBrandAssets = async () => {
      try {
        await loadBrandAssetsFromSupabase();
        if (!cancelled) setBrandStorageWarning(null);
      } catch (error) {
        console.error("Unable to sync My Brand assets:", error);
        if (!cancelled) {
          setBrandStorageWarning("My Brand could not sync with Supabase. Local items are still available on this device.");
        }
      }
    };

    void syncBrandAssets();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void syncBrandAssets();
      }

      if (event === "SIGNED_OUT") {
        setBrandAssets((prev) => prev.filter((asset) => !asset.isRemote));
      }
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadBackgroundAssets = async () => {
      try {
        setIsLoadingBackgrounds(true);
        const response = await fetch("/background/background-assets.json", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load background assets");
        const data = await response.json();
        const categories: BackgroundCategory[] = Array.isArray(data.categories) ? data.categories : [];

        if (cancelled) return;
        setBackgroundCategories(categories);
        setBackgroundCategory((current) => current || categories[0]?.name || "");
      } catch (error) {
        console.error("Unable to load background assets:", error);
      } finally {
        if (!cancelled) setIsLoadingBackgrounds(false);
      }
    };

    loadBackgroundAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAdminAssets = async () => {
      try {
        const response = await fetch("/api/admin/assets", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && Array.isArray(data.assets)) {
          setAdminAssets(data.assets);
        }
      } catch (error) {
        console.error("Unable to load admin assets:", error);
      } finally {
        if (!cancelled) setAdminAssetsLoaded(true);
      }
    };

    loadAdminAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const checkAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!active) return;

      if (!userId) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (active) setIsAdmin(data?.role === "admin");
    };

    void checkAdmin();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void checkAdmin();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setVisibleBackgroundCount(BACKGROUND_VISIBLE_STEP);
  }, [backgroundCategory]);

  useEffect(() => {
    const templateId = searchParams.get("template");

    if (!templateId) return;
    if (!adminAssetsLoaded) return;
    if (loadedTemplateIdRef.current === templateId) return;

    const publicTemplate = adminAssets.find(
      (asset) => asset.category === "templates" && asset.id === templateId
    ) || adminAssets.find(
      (asset) => asset.category === "templates" && getAdminTemplateSourceId(asset) === templateId
    );
    const templateData = publicTemplate?.metadata?.templateData as EditableTemplateData | undefined;

    if (templateData?.layers?.length) {
      const templateWidth = templateData.canvasWidth || 1280;
      const templateHeight = templateData.canvasHeight || 720;
      loadedTemplateIdRef.current = templateId;
      setCurrentTemplateAssetId(publicTemplate?.id || null);
      setCurrentPreset(getPresetForDimensions(templateWidth, templateHeight));
      setCanvasWidth(templateWidth);
      setCanvasHeight(templateHeight);
      setCanvasBgColor(templateData.canvasBgColor || "#FFFFFF");
      setCanvasStrokeColor(templateData.canvasStrokeColor || "#0F172A");
      setCanvasStrokeWidth(templateData.canvasStrokeWidth || 0);
      setPreview(templateData.preview || publicTemplate?.preview_url || null);
      setLayers(templateData.layers);
      setSelectedLayerId(templateData.layers[0]?.id || null);
      return;
    }

    const template = templates.find((item) => item.id === templateId);

    if (!template) return;

    loadedTemplateIdRef.current = templateId;
    setCurrentTemplateAssetId(null);
    setCurrentPreset(getPresetForDimensions(template.width, template.height));
    setCanvasWidth(template.width);
    setCanvasHeight(template.height);
    setCanvasBgColor(template.canvas.background || "#FFFFFF");

    const templateBackground = template.canvas.elements.find(
      (element: any) => element.type === "image" && element.isLocked && /background/i.test(element.name || ""),
    ) as any;
    setPreview(templateBackground?.src || null);

    const editableTemplateElements = template.canvas.elements.filter((element: any) => element !== templateBackground);
    const loadedLayers: Layer[] = editableTemplateElements.map((element: any, index: number) => {
      const baseLayer = {
        id: `template-${index}`,
        type: element.type,
        name: element.name || `Template Layer ${index + 1}`,
        x: element.x,
        y: element.y,
        opacity: element.opacity ?? 1,
        angle: element.angle ?? 0,
        isLocked: element.isLocked ?? false,
      };

      if (element.type === "text") {
        return {
          ...baseLayer,
          type: "text",
          text: element.text,
          fontSize: element.fontSize || 80,
          width: element.width,
          color: element.color || "#ffffff",
          fontFamily: element.fontFamily || "Impact",
          strokeColor: element.strokeColor || "#000000",
          strokeWidth: element.strokeWidth ?? 2,
          glowColor: element.glowColor || "#3B82F6",
          glowRadius: element.glowRadius ?? 0,
          textAlign: element.textAlign || "center",
          isBold: element.isBold ?? true,
          isItalic: false,
          isUnderline: false,
          isUppercase: false,
          hasTextBg: false,
          textBgColor: "#000000",
          textBgPadding: 8,
          shadowColor: "#000000",
          shadowBlur: element.shadowBlur ?? 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
        };
      }

      if (element.type === "image") {
        return {
          ...baseLayer,
          type: "image",
          src: element.src,
          width: element.width || 300,
          height: element.height || 300,
          shadowColor: "#000000",
          shadowBlur: element.shadowBlur ?? 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          blendMode: "normal",
          isFlippedH: false,
          isFlippedV: false,
          hasImageStroke: element.hasImageStroke ?? false,
          imageStrokeColor: element.imageStrokeColor || "#3B82F6",
          imageStrokeWidth: element.imageStrokeWidth ?? 4,
          blur: 0,
          cropTop: 0,
          constrainBottom: 0,
          cropLeft: 0,
          cropRight: 0,
        };
      }

      return {
        ...baseLayer,
        type: "shape",
        shapeType: element.shapeType || "rectangle",
        width: element.width || 200,
        height: element.height || 200,
        color: element.color || "#3B82F6",
        borderRadius: element.borderRadius ?? 8,
        shadowColor: "#000000",
        shadowBlur: element.shadowBlur ?? 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      };
    });

    setLayers(loadedLayers);
    setSelectedLayerId(
      loadedLayers.find((layer) => layer.type === "text" && !layer.isLocked)?.id
        || loadedLayers.find((layer) => !layer.isLocked)?.id
        || loadedLayers[0]?.id
        || null,
    );
  }, [searchParams, adminAssets, adminAssetsLoaded]);

useEffect(() => {
  const handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) return;

        const url = URL.createObjectURL(file);

        const newImage = {
          url,
          name: `Pasted Image ${Date.now()}`,
        };

        const newLayer: Layer = {
          id: `img-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          type: "image",
          name: newImage.name,
          src: newImage.url,
          x: 50,
          y: 50,
          width: 240,
          height: 180,
          shadowColor: "#000000",
          shadowBlur: 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          blendMode: "normal",
          isFlippedH: false,
          isFlippedV: false,
          hasImageStroke: false,
          imageStrokeColor: "#3B82F6",
          imageStrokeWidth: 4,
          opacity: 1,
          blur: 0,
          cropTop: 0,
          constrainBottom: 0,
          cropLeft: 0,
          cropRight: 0,
          angle: 0,
        };

        setImportedImages((prev) => [...prev, newImage]);
        setLayers((prev) => [...prev, newLayer]);
        setSelectedLayerId(newLayer.id);
        setIsCropMode(false);

        event.preventDefault();
        break;
      }
    }
  };

  window.addEventListener("paste", handlePaste);

  return () => {
    window.removeEventListener("paste", handlePaste);
  };
}, []);
 
useEffect(() => {
    const updateLayout = () => {
      setIsMobileLayout(window.innerWidth < 900);
      setMobileViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    if (!isMobileLayout) setMobilePanel(null);
  }, [isMobileLayout]);

  const deleteLayer = () => {
    if (layers.length === 0 || !selectedLayerId) return;
    const layerToDelete = layers.find((layer) => layer.id === selectedLayerId);
    if (layerToDelete?.isLocked) return;
    const updated = layers.filter((layer) => layer.id !== selectedLayerId);
    setLayers(updated);
    if (editingTextLayerId === selectedLayerId) setEditingTextLayerId(null);
    if (textEditDraftRef.current?.layerId === selectedLayerId) textEditDraftRef.current = null;
    savedTextSelectionRef.current = null;
    setTextSelectionPreview(null);
    setSelectedLayerId(updated.length > 0 ? updated[updated.length - 1].id : null);
  };

  const getEfectosEstilo = (layer: Layer) => {
    if (layer.type !== "text") return {};
    const sColor = layer.strokeColor || "#000000";
    const sWidth = layer.strokeWidth || 0;
    const gColor = layer.glowColor || "#3B82F6";
    const gRadius = layer.glowRadius || 0;
    const style: Record<string, string> = {
      WebkitTextStroke: sWidth > 0 ? `${sWidth}px ${sColor}` : "0 transparent",
      paintOrder: "stroke fill",
    };

    let textShadowString = "";
    if (gRadius > 0) {
      if (textShadowString) textShadowString += ", ";
      textShadowString += `0 0 ${gRadius}px ${gColor}, 0 0 ${gRadius * 1.5}px ${gColor}`;
    }
    if ((layer.shadowBlur || 0) > 0 || (layer.shadowOffsetX || 0) !== 0) {
      if (textShadowString) textShadowString += ", ";
      textShadowString += `${layer.shadowOffsetX}px ${layer.shadowOffsetY}px ${layer.shadowBlur}px ${layer.shadowColor}`;
    }
    style.textShadow = textShadowString || "none";
    return style;
  };

  // GLOBAL KEYBOARD MANAGEMENT (Delete, Backspace, Enter, Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;

      if (isTyping) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        setIsCropMode(false);
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedLayerId) {
        e.preventDefault();
        deleteLayer();
        return;
      }

      if (!selectedLayerId || draggingLayerId || resizeState.corner) return;
      const keyboardLayer = layers.find((layer) => layer.id === selectedLayerId);
      if (keyboardLayer?.isLocked) return;
      const step = e.shiftKey ? 3 : 1; 
      let deltaX = 0;
      let deltaY = 0;

      if (e.key === "ArrowUp") deltaY = -step;
      else if (e.key === "ArrowDown") deltaY = step;
      else if (e.key === "ArrowLeft") deltaX = -step;
      else if (e.key === "ArrowRight") deltaX = step;
      else return;

      e.preventDefault();

      setLayers((prevLayers) =>
        prevLayers.map((layer) => {
          if (layer.id === selectedLayerId) {
            return {
              ...layer,
              x: Math.max(0, Math.min(100, layer.x + deltaX)),
              y: Math.max(0, Math.min(100, layer.y + deltaY)),
            };
          }
          return layer;
        })
      );
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLayerId, draggingLayerId, resizeState.corner, layers, undoStack, redoStack]);

  // Global window mousemove/mouseup listener to lock smoothness
  useEffect(() => {
 const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
  const { clientX, clientY } = getCoords(e);
  if (!workspaceRef.current || (!selectedLayerId && draggingLayerId === null)) return;
  const rect = workspaceRef.current.getBoundingClientRect();

  // 1. Lógica de Redimensionamiento (Resize & Rotation)
  if (resizeState.corner && selectedLayerId) {
    if ("touches" in e && e.cancelable) e.preventDefault();
    const deltaX = clientX - resizeState.mouseX;
    const deltaY = clientY - resizeState.mouseY;
    const designDeltaX = deltaX / Math.max(workspaceScale, 0.05);
    const designDeltaY = deltaY / Math.max(workspaceScale, 0.05);

    setLayers((prevLayers) =>
      prevLayers.map((layer) => {
        if (layer.id === selectedLayerId) {
          // 1. ROTATION
          if (resizeState.corner === "rotation") {
            const layerCenterX = rect.left + (layer.x / 100) * rect.width;
            const layerCenterY = rect.top + (layer.y / 100) * rect.height;
            const radians = Math.atan2(clientY - layerCenterY, clientX - layerCenterX);
            let degrees = Math.round(radians * (180 / Math.PI)) - 90;
            if (degrees < 0) degrees += 360;
            return { ...layer, angle: degrees };
          }

          // 2. CROP MODE
         if (isCropMode && layer.type === "image") {
  const newCropTop = Math.max(
    0,
    resizeState.initialCropTop + (resizeState.corner?.includes("top") ? designDeltaY : 0)
  );

  const newCropBottom = Math.max(
    0,
    resizeState.initialCropBottom + (resizeState.corner?.includes("bottom") ? -designDeltaY : 0)
  );

  const newCropLeft = Math.max(
    0,
    resizeState.initialCropLeft + (resizeState.corner?.includes("Left") ? designDeltaX : 0)
  );

  const newCropRight = Math.max(
    0,
    resizeState.initialCropRight + (resizeState.corner?.includes("Right") ? -designDeltaX : 0)
  );

  return {
    ...layer,
    cropTop: newCropTop,
    constrainBottom: newCropBottom,
    cropLeft: newCropLeft,
    cropRight: newCropRight,
  };
}
          

          // 3. RESIZING (Multi-corner)
          let newWidth = resizeState.initialWidth;
          let newHeight = resizeState.initialHeight;
          let newFontSize = resizeState.initialFontSize;
          let newX = resizeState.initialX;
          let newY = resizeState.initialY;

          const affectsLeft = resizeState.corner === "topLeft" || resizeState.corner === "bottomLeft";
          const affectsRight = resizeState.corner === "topRight" || resizeState.corner === "bottomRight";
          const affectsTop = resizeState.corner === "topLeft" || resizeState.corner === "topRight";
          const affectsBottom = resizeState.corner === "bottomLeft" || resizeState.corner === "bottomRight";

          if (layer.type === "text") {
            const horizontalDelta = affectsLeft ? -designDeltaX : affectsRight ? designDeltaX : 0;
            const verticalDelta = affectsTop ? -designDeltaY : affectsBottom ? designDeltaY : 0;
            const hasTextBox = Boolean(layer.width);
            newWidth = Math.max(40, Math.round((hasTextBox ? resizeState.initialWidth : Math.max(resizeState.initialWidth, 220)) + horizontalDelta));
            newFontSize = Math.max(8, Math.round(resizeState.initialFontSize + verticalDelta / 2));
            const widthChange = newWidth - (hasTextBox ? resizeState.initialWidth : Math.max(resizeState.initialWidth, 220));
            const xShiftPx = affectsLeft ? -widthChange / 2 : affectsRight ? widthChange / 2 : 0;
            newX = Math.max(0, Math.min(100, resizeState.initialX + (xShiftPx / canvasWidth) * 100));
            return { ...layer, width: newWidth, fontSize: newFontSize, x: newX };
          }

          if (affectsLeft) newWidth = resizeState.initialWidth - designDeltaX;
          if (affectsRight) newWidth = resizeState.initialWidth + designDeltaX;
          if (affectsTop) newHeight = resizeState.initialHeight - designDeltaY;
          if (affectsBottom) newHeight = resizeState.initialHeight + designDeltaY;

          newWidth = Math.max(20, Math.round(newWidth));
          newHeight = Math.max(20, Math.round(newHeight));

          const widthChange = newWidth - resizeState.initialWidth;
          const heightChange = newHeight - resizeState.initialHeight;
          const xShiftPx = affectsLeft ? -widthChange / 2 : affectsRight ? widthChange / 2 : 0;
          const yShiftPx = affectsTop ? -heightChange / 2 : affectsBottom ? heightChange / 2 : 0;

          newX = Math.max(0, Math.min(100, resizeState.initialX + (xShiftPx / canvasWidth) * 100));
          newY = Math.max(0, Math.min(100, resizeState.initialY + (yShiftPx / canvasHeight) * 100));
          
          return { ...layer, width: newWidth, height: newHeight, fontSize: newFontSize, x: newX, y: newY };
        }
        return layer;
      })
    );
    return;
  }
  // 2. Lógica de Arrastre (Dragging)
  if (draggingLayerId !== null) {
    if ("touches" in e && e.cancelable) e.preventDefault();
    let posX = ((clientX - rect.left - initialDragOffset.current.x) / rect.width) * 100;
    let posY = ((clientY - rect.top - initialDragOffset.current.y) / rect.height) * 100;
    posX = Math.max(0, Math.min(100, posX));
    posY = Math.max(0, Math.min(100, posY));
    setLayers((prev) => prev.map((layer) => layer.id === draggingLayerId ? { ...layer, x: posX, y: posY } : layer));
  }
};

  const handleGlobalRelease = () => {
    setDraggingLayerId(null);
    setResizeState((prev) => ({ ...prev, corner: null }));
  };

  window.addEventListener("mousemove", handleGlobalMove);
  window.addEventListener("touchmove", handleGlobalMove, { passive: false });
  window.addEventListener("mouseup", handleGlobalRelease);
  window.addEventListener("touchend", handleGlobalRelease);

  return () => {
    window.removeEventListener("mousemove", handleGlobalMove);
    window.removeEventListener("touchmove", handleGlobalMove);
    window.removeEventListener("mouseup", handleGlobalRelease);
    window.removeEventListener("touchend", handleGlobalRelease);
  };
}, [draggingLayerId, resizeState, selectedLayerId, isCropMode, workspaceScale, canvasWidth, canvasHeight]);

const handleRemoveBackgroundAI = async (layer: Layer) => {
  if (layer.type !== "image" || !layer.src) return;

  try {
    alert("Processing image with AI... Please wait.");

    const responseUrl = await fetch(layer.src);
    const blob = await responseUrl.blob();

    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const { data: sessionData } = await supabase.auth.getSession();

const accessToken = sessionData.session?.access_token;

if (!accessToken) {
  alert("Please login first.");
  return;
}

const res = await fetch("/api/ai-background-remover", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ imageBase64: base64Data }),
  signal: controller.signal,
});

        clearTimeout(timeoutId);

      const rawText = await res.text();
console.log("REMOVE BG RAW RESPONSE:", rawText);

let data: any = null;

try {
  data = rawText ? JSON.parse(rawText) : null;
} catch {
  alert(`Remove BG returned non-JSON response: ${rawText}`);
  return;
}
        console.log("REMOVE BG RESPONSE:", data);

        if (!res.ok || !data.success) {

  if (data.error === "NO_CREDITS") {

    setCredits(0);
    setShowCreditsModal(true);

    return;
  }

  alert(`Remove BG Error: ${data.error || "Unknown error"}`);
  return;
}

        updateSelectedLayer({
          src: data.image,
          name: `${layer.name} (No BG)`,
        });

        if (typeof data.creditsRemaining === "number") {
  setCredits(data.creditsRemaining);
} else {
  loadCredits();
}

        alert("Background removed successfully!");
      } catch (error: any) {
        console.error("Remove BG client error:", error);

        if (error.name === "AbortError") {
          alert("Remove BG took too long. Please try with a smaller image.");
          return;
        }

        alert(error.message || "Remove BG failed.");
      }
    };

    reader.onerror = () => {
      alert("Could not read the image file.");
    };

    reader.readAsDataURL(blob);
  } catch (error: any) {
    console.error("Remove BG outer error:", error);
    alert(error.message || "Could not process image.");
  }
};


  const getCoords = (e: any) => {
  if (e.touches && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  return { clientX: e.clientX, clientY: e.clientY };
};

  const handlePresetChange = (presetKey: keyof typeof PRESET_SIZES) => {
    setCurrentPreset(presetKey);
    if (presetKey !== "custom") {
      setCanvasWidth(PRESET_SIZES[presetKey].width);
      setCanvasHeight(PRESET_SIZES[presetKey].height);
    }
  };

  const handleUploadBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    if (isMobileLayout) setMobilePanel(null);
  };

  const blobToDataUrl = (blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  };

  const imageBlobToBrandDataUrl = async (blob: Blob) => {
    const sourceUrl = URL.createObjectURL(blob);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Brand asset image could not be loaded."));
        img.src = sourceUrl;
      });

      const maxSize = 480;
      const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
      const width = Math.max(1, Math.round((image.naturalWidth || 1) * ratio));
      const height = Math.max(1, Math.round((image.naturalHeight || 1) * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available.");
      context.drawImage(image, 0, 0, width, height);

      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (nextBlob) resolve(nextBlob);
          else reject(new Error("Brand asset could not be compressed."));
        }, "image/webp", 0.72);
      });

      return blobToDataUrl(compressedBlob);
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  };

  const getSupabaseAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const loadBrandAssetsFromSupabase = async () => {
    const token = await getSupabaseAccessToken();
    if (!token) return;

    const response = await fetch("/api/brand/assets", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to load My Brand from Supabase.");
    }

    const payload = await response.json();
    const remoteAssets = Array.isArray(payload.assets) ? payload.assets as BrandAsset[] : [];

    setBrandAssets((prev) => {
      const localAssets = prev.filter((asset) => !asset.isRemote);
      const localIds = new Set(localAssets.map((asset) => asset.id));
      return [
        ...remoteAssets.filter((asset) => !localIds.has(asset.id)),
        ...localAssets,
      ].slice(0, BRAND_ASSETS_MAX_ITEMS);
    });
  };

  const uploadBrandFileToSupabase = async (file: File) => {
    const token = await getSupabaseAccessToken();
    if (!token) return null;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);

    const response = await fetch("/api/brand/assets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to save this item to My Brand.");
    }

    const payload = await response.json();
    return payload.asset as BrandAsset;
  };

  const deleteBrandAssetFromSupabase = async (asset: BrandAsset) => {
    if (!asset.isRemote) return;

    const token = await getSupabaseAccessToken();
    if (!token) throw new Error("Sign in required.");

    const response = await fetch(`/api/brand/assets?id=${encodeURIComponent(asset.id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to remove this item from My Brand.");
    }
  };

  const saveFilesToBrandAssets = async (files: File[]) => {
    try {
      const nextAssets: BrandAsset[] = [];
      let usedLocalFallback = false;

      for (const file of files) {
        try {
          const remoteAsset = await uploadBrandFileToSupabase(file);
          if (remoteAsset) {
            nextAssets.push(remoteAsset);
            continue;
          }
        } catch (error) {
          console.error("Unable to sync file to My Brand:", error);
          usedLocalFallback = true;
        }

        usedLocalFallback = true;
        nextAssets.push({
          id: `brand-${Date.now()}-${Math.floor(Math.random() * 10000)}-${file.name}`,
          name: file.name,
          url: await imageBlobToBrandDataUrl(file),
          isRemote: false,
        });
      }

      setBrandAssets((prev) => [...nextAssets, ...prev].slice(0, BRAND_ASSETS_MAX_ITEMS));
      setBrandStorageWarning(
        usedLocalFallback
          ? "Some My Brand items were saved locally because Supabase sync was not available. Sign in and run the Supabase SQL to keep them permanently."
          : null
      );
    } catch (error) {
      console.error("Unable to save files to My Brand:", error);
      alert("The files could not be saved to My Brand. Try smaller images or fewer files.");
    }
  };

  const saveImportedImageToBrand = async (fileObj: ImportedFile) => {
    try {
      const response = await fetch(fileObj.url);
      const blob = await response.blob();
      const file = new File([blob], fileObj.name, { type: blob.type || "image/png" });
      const remoteAsset = await uploadBrandFileToSupabase(file).catch((error) => {
        console.error("Unable to sync imported image to My Brand:", error);
        return null;
      });

      if (remoteAsset) {
        setBrandAssets((prev) => [remoteAsset, ...prev].slice(0, BRAND_ASSETS_MAX_ITEMS));
        setBrandStorageWarning(null);
        setAssetTab("brand");
        return;
      }

      const dataUrl = await imageBlobToBrandDataUrl(blob);

      setBrandAssets((prev) => [
        {
          id: `brand-${Date.now()}-${Math.floor(Math.random() * 10000)}-${fileObj.name}`,
          name: fileObj.name,
          url: dataUrl,
          isRemote: false,
        },
        ...prev,
      ].slice(0, BRAND_ASSETS_MAX_ITEMS));
      setBrandStorageWarning("This item was saved locally because Supabase sync was not available. Sign in and run the Supabase SQL to keep it permanently.");
      setAssetTab("brand");
    } catch (error) {
      console.error("Unable to save imported image to My Brand:", error);
      alert("This image could not be saved to My Brand.");
    }
  };

  const applyBackgroundAsset = (asset: BackgroundAsset) => {
    setPreview(asset.src);
    setBackgroundOpacity(1);
    setBackgroundBlur(0);
    if (isMobileLayout) setMobilePanel(null);
  };

  const handleImportImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileList = Array.from(files);
    const newFiles: ImportedFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      newFiles.push({ url: URL.createObjectURL(fileList[i]), name: fileList[i].name });
    }
    setImportedImages((prev) => [...prev, ...newFiles]);
    if (saveImportsToBrand) {
      await saveFilesToBrandAssets(fileList);
    }

    if (selectedLayer && isImageFrame(selectedLayer) && (isCompositionFrame(selectedLayer.shapeType) || isGridFrame(selectedLayer.shapeType))) {
      const remainingFiles = [...newFiles];
      const frameUpdate: Partial<Layer> = {};

      if (isGridFrame(selectedLayer.shapeType)) {
        const capacity = getGridCells(selectedLayer.shapeType).length;
        const nextGridImages = [...(selectedLayer.gridImages || [])];
        while (nextGridImages.length < capacity) nextGridImages.push({});

        for (let index = 0; index < capacity && remainingFiles.length > 0; index += 1) {
          if (!nextGridImages[index]?.src) {
            nextGridImages[index] = { src: remainingFiles.shift()?.url, fit: "cover", x: 50, y: 50, scale: 1 };
          }
        }

        frameUpdate.gridImages = nextGridImages;
        frameUpdate.name = `${selectedLayer.name} + Images`;
      }

      if (isCompositionFrame(selectedLayer.shapeType) && !selectedLayer.frameImageSrc && remainingFiles[0]) {
        frameUpdate.frameImageSrc = remainingFiles.shift()?.url;
      }

      if (isCompositionFrame(selectedLayer.shapeType) && !selectedLayer.frameImageSrc2 && remainingFiles[0]) {
        frameUpdate.frameImageSrc2 = remainingFiles.shift()?.url;
      }

      if (Object.keys(frameUpdate).length > 0) {
        frameUpdate.frameImageFit = selectedLayer.frameImageFit || "cover";
        frameUpdate.name = `${selectedLayer.name} + Images`;
        updateSelectedLayer(frameUpdate);
      }

      remainingFiles.forEach((fileObj, index) => {
        addImageToCanvas(fileObj, { offset: index, allowFrame: false });
      });
      e.target.value = "";
      if (isMobileLayout) setMobilePanel(null);
      return;
    }

    newFiles.forEach((fileObj, index) => {
      addImageToCanvas(fileObj, { offset: index, allowFrame: index === 0 });
    });
    e.target.value = "";
    if (isMobileLayout) setMobilePanel(null);
  };
const isImageFrame = (layer?: Layer) => {
  return (
    layer?.type === "shape" &&
    FRAME_SHAPE_TYPES.includes(layer.shapeType || "")
  );
};

const addImageToSelectedFrame = (fileObj: ImportedFile) => {
  if (!selectedLayer || !isImageFrame(selectedLayer)) return false;

  if (isGridFrame(selectedLayer.shapeType)) {
    const capacity = getGridCells(selectedLayer.shapeType).length;
    const nextGridImages = [...(selectedLayer.gridImages || [])];
    while (nextGridImages.length < capacity) nextGridImages.push({});
    const emptyIndex = nextGridImages.findIndex((image) => !image?.src);
    const targetIndex = emptyIndex >= 0 ? emptyIndex : Math.min(selectedLayer.activeGridCell ?? 0, capacity - 1);
    nextGridImages[targetIndex] = { src: fileObj.url, fit: "cover", x: 50, y: 50, scale: 1 };
    updateSelectedLayer({
      gridImages: nextGridImages,
      activeGridCell: targetIndex,
      name: `${selectedLayer.name} + Image`,
    });
    return true;
  }

  if (isCompositionFrame(selectedLayer.shapeType)) {
    if (!selectedLayer.frameImageSrc) {
      updateSelectedLayer({
        frameImageSrc: fileObj.url,
        frameImageFit: "cover",
        name: `${selectedLayer.name} + Image 1`,
      });
      return true;
    }

    if (!selectedLayer.frameImageSrc2) {
      updateSelectedLayer({
        frameImageSrc2: fileObj.url,
        frameImageFit: selectedLayer.frameImageFit || "cover",
        name: `${selectedLayer.name} + Image 2`,
      });
      return true;
    }
  }

  updateSelectedLayer({
    frameImageSrc: fileObj.url,
    frameImageFit: "cover",
    name: `${selectedLayer.name} + Image`,
  });

  return true;
};

const isPaperFrame = (shapeType?: Layer["shapeType"]) => {
  return PAPER_FRAME_SHAPE_TYPES.includes(shapeType || "");
};

const isDeviceFrame = (shapeType?: Layer["shapeType"]) => {
  return DEVICE_FRAME_SHAPE_TYPES.includes(shapeType || "");
};

const isCompositionFrame = (shapeType?: Layer["shapeType"]) => {
  return COMPOSITION_FRAME_SHAPE_TYPES.includes(shapeType || "");
};

const isGridFrame = (shapeType?: Layer["shapeType"]) => {
  return GRID_SHAPE_TYPES.includes(shapeType || "");
};

const getFrameDefaultSize = (shapeType?: Layer["shapeType"]) => {
  switch (shapeType) {
    case "paperPortraitFrame":
      return { width: 150, height: 220 };
    case "paperSquareFrame":
      return { width: 170, height: 170 };
    case "paperStripFrame":
      return { width: 180, height: 105 };
    case "paperLeftFrame":
    case "paperRightFrame":
      return { width: 210, height: 145 };
    case "phoneFrame":
      return { width: 120, height: 240 };
    case "tabletFrame":
      return { width: 260, height: 180 };
    case "laptopFrame":
      return { width: 310, height: 205 };
    case "triangleFrame":
      return { width: 190, height: 170 };
    case "vsDividerFrame":
      return { width: 290, height: 170 };
    case "splitScreenFrame":
      return { width: 290, height: 170 };
    case "diagonalSplitFrame":
      return { width: 290, height: 170 };
    case "gridSingle":
    case "gridTwoColumns":
    case "gridTwoRows":
    case "gridThreeColumns":
    case "gridThreeRows":
    case "gridFour":
    case "gridHeroLeft":
    case "gridHeroTop":
      return { width: 300, height: 190 };
    default:
      return { width: 180, height: 120 };
  }
};

const getPaperFrameClipPath = (shapeType?: Layer["shapeType"]) => {
  switch (shapeType) {
    case "paperPortraitFrame":
      return "polygon(9% 0%, 94% 4%, 100% 14%, 97% 92%, 89% 100%, 8% 96%, 0% 88%, 4% 9%)";
    case "paperSquareFrame":
      return "polygon(5% 3%, 24% 0%, 47% 4%, 70% 1%, 97% 6%, 100% 31%, 96% 55%, 100% 82%, 89% 100%, 58% 96%, 32% 100%, 4% 94%, 0% 68%, 3% 41%, 0% 15%)";
    case "paperStripFrame":
      return "polygon(0% 9%, 14% 0%, 33% 5%, 55% 0%, 78% 6%, 100% 2%, 96% 93%, 82% 100%, 59% 95%, 38% 100%, 18% 94%, 0% 98%)";
    case "paperLeftFrame":
      return "polygon(0% 1%, 96% 0%, 98% 12%, 93% 22%, 97% 35%, 91% 48%, 93% 61%, 86% 75%, 82% 89%, 72% 100%, 0% 100%)";
    case "paperRightFrame":
      return "polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%, 7% 87%, 11% 74%, 7% 62%, 12% 50%, 9% 37%, 14% 24%, 11% 12%)";
    default:
      return "polygon(2% 7%, 18% 2%, 37% 5%, 58% 0%, 81% 4%, 98% 2%, 100% 88%, 88% 98%, 63% 95%, 39% 100%, 17% 94%, 0% 98%)";
  }
};

const getFramePlaceholderBackground = (layer: Layer) => {
  if (isPaperFrame(layer.shapeType)) {
    return "linear-gradient(180deg, #E0F7FF 0%, #EFFBFF 58%, #A7D444 59%, #79A900 100%)";
  }

  return "repeating-linear-gradient(45deg, #F8FAFC 0 10px, #E2E8F0 10px 20px)";
};

const getFrameImagePosition = (layer: Layer, slot: 1 | 2 = 1) => {
  const x = slot === 1 ? layer.frameImageX ?? 50 : layer.frameImage2X ?? 50;
  const y = slot === 1 ? layer.frameImageY ?? 50 : layer.frameImage2Y ?? 50;
  return `${x}% ${y}%`;
};

const getFrameImageTransform = (layer: Layer, slot: 1 | 2 = 1) => {
  const scale = slot === 1 ? layer.frameImageScale ?? 1 : layer.frameImage2Scale ?? 1;
  const flipH = slot === 1 ? layer.frameImageFlipH : layer.frameImage2FlipH;
  const flipV = slot === 1 ? layer.frameImageFlipV : layer.frameImage2FlipV;
  return `scale(${flipH ? -scale : scale}, ${flipV ? -scale : scale})`;
};

const cloneLayers = (items: Layer[]) => items.map((layer) => ({ ...layer }));

useEffect(() => {
  if (isApplyingHistoryRef.current) {
    isApplyingHistoryRef.current = false;
    lastHistorySnapshotRef.current = JSON.stringify(layers);
    return;
  }

  if (historyTimerRef.current) clearTimeout(historyTimerRef.current);

  historyTimerRef.current = setTimeout(() => {
    const nextSnapshot = JSON.stringify(layers);
    if (nextSnapshot === lastHistorySnapshotRef.current) return;

    const previousLayers = JSON.parse(lastHistorySnapshotRef.current) as Layer[];
    setUndoStack((prev) => [...prev.slice(-49), previousLayers]);
    setRedoStack([]);
    lastHistorySnapshotRef.current = nextSnapshot;
  }, draggingLayerId || resizeState.corner ? 500 : 120);

  return () => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
  };
}, [layers, draggingLayerId, resizeState.corner]);

const handleUndo = () => {
  if (undoStack.length === 0) return;
  const previousLayers = undoStack[undoStack.length - 1];
  const nextUndoStack = undoStack.slice(0, -1);

  isApplyingHistoryRef.current = true;
  setUndoStack(nextUndoStack);
  setRedoStack((prev) => [...prev.slice(-49), cloneLayers(layers)]);
  setLayers(cloneLayers(previousLayers));
  setSelectedLayerId((current) => (previousLayers.some((layer) => layer.id === current) ? current : previousLayers[previousLayers.length - 1]?.id || null));
  setIsCropMode(false);
};

const handleRedo = () => {
  if (redoStack.length === 0) return;
  const nextLayers = redoStack[redoStack.length - 1];
  const nextRedoStack = redoStack.slice(0, -1);

  isApplyingHistoryRef.current = true;
  setRedoStack(nextRedoStack);
  setUndoStack((prev) => [...prev.slice(-49), cloneLayers(layers)]);
  setLayers(cloneLayers(nextLayers));
  setSelectedLayerId((current) => (nextLayers.some((layer) => layer.id === current) ? current : nextLayers[nextLayers.length - 1]?.id || null));
  setIsCropMode(false);
};

 const addImageToCanvas = (
  fileObj: ImportedFile,
  options: { offset?: number; allowFrame?: boolean; width?: number; height?: number } = {}
) => {
  const offset = options.offset || 0;
  const allowFrame = options.allowFrame ?? true;

  if (allowFrame && addImageToSelectedFrame(fileObj)) {
  return;
}
  const uniqueId = `img-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const newLayer: Layer = {
    id: uniqueId,
    type: "image",
    name: fileObj.name,
    src: fileObj.url,
    x: Math.min(88, 50 + offset * 3),
    y: Math.min(88, 50 + offset * 3),
    width: options.width || 240,
    height: options.height || 180,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    blendMode: "normal",
    isFlippedH: false,
    isFlippedV: false,
    hasImageStroke: false,
    imageStrokeColor: "#3B82F6",
    imageStrokeWidth: 4,
    opacity: 1,
    blur: 0,
    cropTop: 0,
    constrainBottom: 0,
    cropLeft: 0,
    cropRight: 0,
    angle: 0,
  };

  setLayers((prev) => [...prev, newLayer]);
  setSelectedLayerId(newLayer.id);
  setIsCropMode(false);
};

const addVectorAssetToCanvas = (asset: EditorVectorAsset) => {
  const src = vectorSvgDataUrl(asset.svg, vectorAssetColor);
  const isWideArrow = asset.name.includes("Arrow") || asset.name.includes("Infinity") || asset.name.includes("Plus Minus");
  const uniqueId = `vector-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const newLayer: Layer = {
    id: uniqueId,
    type: "image",
    name: asset.name,
    src,
    vectorSvg: asset.svg,
    vectorColor: vectorAssetColor,
    x: 50,
    y: 50,
    width: isWideArrow ? 300 : 220,
    height: isWideArrow ? 170 : 220,
    opacity: 1,
    blur: 0,
    angle: 0,
    blendMode: "normal",
    isFlippedH: false,
    isFlippedV: false,
    hasImageStroke: false,
    imageStrokeColor: "#3B82F6",
    imageStrokeWidth: 4,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    cropTop: 0,
    constrainBottom: 0,
    cropLeft: 0,
    cropRight: 0,
  };

  setLayers((prev) => [...prev, newLayer]);
  setSelectedLayerId(newLayer.id);
  setIsCropMode(false);
};

const updateVectorAssetColor = (color: string) => {
  setVectorAssetColor(color);
  if (!selectedLayer?.vectorSvg) return;

  setLayers((prev) => prev.map((layer) =>
    layer.id === selectedLayer.id && layer.vectorSvg
      ? { ...layer, vectorColor: color, src: vectorSvgDataUrl(layer.vectorSvg, color) }
      : layer
  ));
};

const handlePasteFromClipboard = async () => {
  try {
    if (!navigator.clipboard || !("read" in navigator.clipboard)) {
      alert("Your browser does not allow paste from this button. Use Ctrl+V after copying an image.");
      return;
    }

    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (!imageType) continue;

      const blob = await item.getType(imageType);
      const pastedImage = {
        url: URL.createObjectURL(blob),
        name: `Pasted Image ${Date.now()}`,
      };

      setImportedImages((prev) => [...prev, pastedImage]);
      addImageToCanvas(pastedImage);
      return;
    }

    alert("No image was found in the clipboard.");
  } catch (error) {
    console.error("Clipboard paste failed:", error);
    alert("Paste was blocked by the browser. Use Ctrl+V after copying an image.");
  }
};

const handleSelectTopLayer = () => {
  const topLayer = layers[layers.length - 1];
  if (!topLayer) return;
  setSelectedLayerId(topLayer.id);
  setIsCropMode(false);
};

  const addTextLayer = (preset?: Partial<Layer>) => {
    const uniqueId = `txt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const newLayer: Layer = {
      id: uniqueId,
      type: "text",
      name: "Text Layer " + (layers.length + 1),
      text: preset?.text || "New Text Line",
      x: 50,
      y: 50,
      fontSize: preset?.fontSize || 40,
      color: preset?.color || "#000000",
      fontFamily: preset?.fontFamily || "Inter",
      strokeColor: "#000000",
      strokeWidth: 0,
      glowColor: "#FFFF00",
      glowRadius: 0,
      textAlign: "center",
      letterSpacing: 0,
      lineHeight: 1,
      textAnimation: "none",
      isBold: preset?.isBold ?? false,
      isItalic: false,
      isUnderline: false,
      isStrikethrough: false,
      isUppercase: false,
      hasTextBg: false,
      textBgColor: "#FF0000",
      textBgPadding: 6,
      shadowColor: "#000000",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      opacity: 1,
      angle: 0,
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const addEmojiLayer = (emoji: string, name: string) => {
    const uniqueId = `emoji-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const newLayer: Layer = {
      id: uniqueId,
      type: "text",
      name: `Emoji: ${name}`,
      text: emoji,
      x: 50,
      y: 50,
      fontSize: 72,
      color: "#000000",
      fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji",
      strokeColor: "#000000",
      strokeWidth: 0,
      glowColor: "#FFFF00",
      glowRadius: 0,
      textAlign: "center",
      letterSpacing: 0,
      lineHeight: 1,
      textAnimation: "none",
      isBold: false,
      isItalic: false,
      isUnderline: false,
      isStrikethrough: false,
      isUppercase: false,
      hasTextBg: false,
      textBgColor: "#FFFFFF",
      textBgPadding: 6,
      shadowColor: "#000000",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      opacity: 1,
      angle: 0,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setIsCropMode(false);
  };

  const addShapeLayer = (shapeType: Layer["shapeType"]) => {
    const uniqueId = `shp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const isFrame = FRAME_SHAPE_TYPES.includes(shapeType || "");
    const isPaper = isPaperFrame(shapeType);
    const isDevice = isDeviceFrame(shapeType);
    const isComposition = isCompositionFrame(shapeType);
    const isGrid = isGridFrame(shapeType);
    const defaultSize = getFrameDefaultSize(shapeType);
    const newLayer: Layer = {
      id: uniqueId,
      type: "shape",
      shapeType: shapeType,
      name: `Shape: ${shapeType}`,
      x: 50,
      y: 50,
      width: isPaper || isDevice || isComposition || isGrid ? defaultSize.width : 150,
      height: isPaper || isDevice || isComposition || isGrid ? defaultSize.height : 150,
      color: isPaper ? "#F8F1E8" : isDevice ? "#111827" : isComposition ? "#FACC15" : isGrid ? "#FFFFFF" : "#3B82F6",
      gridImages: isGrid ? getGridCells(shapeType).map(() => ({})) : undefined,
      activeGridCell: isGrid ? 0 : undefined,
      gridGap: isGrid ? 4 : undefined,
      useGradient: false,
gradientColor1: "#3B82F6",
gradientColor2: "#8B5CF6",
      gradientDirection: "diagonal",
      strokeColor: isPaper ? "#F8F1E8" : isDevice ? "#111827" : isComposition || isGrid ? "transparent" : isFrame ? "#3B82F6" : undefined,
      strokeWidth: isPaper ? 14 : isDevice ? 10 : isComposition || isGrid ? 0 : isFrame ? 8 : undefined,
      shadowColor: "#000000",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      opacity: 1,
      angle: 0,
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const addPremadeShape = (shape: EditorShapeAsset) => {
  const uniqueId = `shp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const isFrame = FRAME_SHAPE_TYPES.includes(shape.shapeType || "");
  const isPaper = isPaperFrame(shape.shapeType);
  const isDevice = isDeviceFrame(shape.shapeType);
  const isComposition = isCompositionFrame(shape.shapeType);
  const isGrid = isGridFrame(shape.shapeType);
  const defaultSize = getFrameDefaultSize(shape.shapeType);

  const newLayer: Layer = {
    id: uniqueId,
    type: "shape",
    shapeType: shape.shapeType,
    name: shape.name,
    x: 50,
    y: 50,
    width: defaultSize.width,
    height: defaultSize.height,
    color: shape.color,
    gridImages: isGrid ? getGridCells(shape.shapeType).map(() => ({})) : undefined,
    activeGridCell: isGrid ? 0 : undefined,
    gridGap: isGrid ? 4 : undefined,
    strokeColor: isFrame || isComposition ? shape.color : undefined,
    strokeWidth: isPaper ? 14 : isDevice ? 10 : isComposition || isGrid ? 0 : isFrame ? 8 : undefined,
    useGradient: false,
gradientColor1: shape.color,
gradientColor2: "#8B5CF6",
gradientDirection: "diagonal",
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    opacity: 1,
    angle: 0,
  };

  setLayers((prev) => [...prev, newLayer]);
  setSelectedLayerId(newLayer.id);
};

  const addPremadeGradient = (preset: (typeof PREMADE_GRADIENTS)[number]) => {
    const uniqueId = `gradient-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const newLayer: Layer = {
      id: uniqueId,
      type: "shape",
      shapeType: "rectangle",
      name: `Gradient: ${preset.name}`,
      x: 50,
      y: 50,
      width: 280,
      height: 180,
      color: preset.color1,
      useGradient: true,
      gradientType: preset.type,
      gradientColor1: preset.color1,
      gradientColor2: preset.color2,
      gradientDirection: "direction" in preset ? preset.direction : "diagonal",
      gradientPosition: "position" in preset ? preset.position : "center",
      borderRadius: 14,
      shadowColor: "#000000",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      opacity: 1,
      angle: 0,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setIsCropMode(false);
  };

  const moveLayerOrder = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= layers.length) return;
    const updatedLayers = [...layers];
    const temp = updatedLayers[index];
    updatedLayers[index] = updatedLayers[nextIndex];
    updatedLayers[nextIndex] = temp;
    setLayers(updatedLayers);
  };

  const getImageStrokeFilter = (layer: Layer) => {
    if (layer.type !== "image" || !layer.hasImageStroke || !layer.imageStrokeWidth || layer.imageStrokeWidth <= 0) return "";
    const color = layer.imageStrokeColor || "#3B82F6";
    const w = layer.imageStrokeWidth;
    return `drop-shadow(${w}px 0 0 ${color}) drop-shadow(-${w}px 0 0 ${color}) drop-shadow(0 ${w}px 0 ${color}) drop-shadow(0 -${w}px 0 ${color})`;
  };

  const waitForCanvasImages = async (node: HTMLElement) => {
    const images = Array.from(node.querySelectorAll("img"));

    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve, reject) => {
            if (image.complete && image.naturalWidth > 0) {
              resolve();
              return;
            }

            image.onload = () => resolve();
            image.onerror = () => reject(new Error("One image could not be loaded for export."));
          })
      )
    );
  };

  const waitForEditorFonts = async () => {
    const fontFamilies = Array.from(new Set(
      layers
        .filter((layer) => layer.type === "text" && layer.fontFamily)
        .map((layer) => layer.fontFamily as string)
    ));

    fontFamilies.forEach((fontFamily) => ensureEditorFontLoaded(fontFamily));

    await Promise.all(fontFamilies.map(async (fontFamily) => {
      const linkId = `pixores-font-${fontFamily.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const link = document.getElementById(linkId) as HTMLLinkElement | null;

      if (link && !link.sheet) {
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(resolve, 5000);
          const finish = () => {
            window.clearTimeout(timeout);
            resolve();
          };
          link.addEventListener("load", finish, { once: true });
          link.addEventListener("error", finish, { once: true });
        });
      }

      await Promise.all([
        document.fonts.load(`400 48px "${fontFamily}"`),
        document.fonts.load(`700 48px "${fontFamily}"`),
        document.fonts.load(`900 48px "${fontFamily}"`),
      ]);
    }));

    await document.fonts.ready;
  };

  const imageToDataUrlForExport = async (src: string) => {
    if (!src || src.startsWith("data:") || src.startsWith("blob:")) return src;

    const response = await fetch(src, { mode: "cors", cache: "force-cache" });
    if (!response.ok) throw new Error(`Image could not be fetched for export: ${src}`);
    const blob = await response.blob();
    return blobToDataUrl(blob);
  };

  const prepareWorkspaceForExport = async (workspace: HTMLElement) => {
    const rect = workspace.getBoundingClientRect();
    const clone = workspace.cloneNode(true) as HTMLElement;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.maxWidth = "none";
    clone.style.boxShadow = "none";
    clone.style.transform = "none";
    clone.style.aspectRatio = "auto";

    const cloneImages = Array.from(clone.querySelectorAll("img"));

    await Promise.all(
      cloneImages.map(async (image) => {
        const src = image.getAttribute("src");
        if (!src) return;

        try {
          image.setAttribute("crossorigin", "anonymous");
          image.setAttribute("src", await imageToDataUrlForExport(src));
        } catch (error) {
          console.warn("Export image fallback skipped:", error);
        }
      })
    );

    clone.querySelectorAll('[contenteditable="true"]').forEach((node) => {
      (node as HTMLElement).removeAttribute("contenteditable");
    });

    clone.querySelectorAll("[data-layer-text-id]").forEach((node) => {
      (node as HTMLElement).style.outline = "none";
    });

    clone.style.position = "fixed";
    clone.style.left = "0";
    clone.style.top = "0";
    clone.style.zIndex = "-1";
    clone.style.pointerEvents = "none";
    document.body.appendChild(clone);

    await waitForCanvasImages(clone);

    return clone;
  };

  const getExportErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string") return error;

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown export error.";
    }
  };

  const isBlankWhitePng = async (dataUrl: string) => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Export preview could not be checked."));
      img.src = dataUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 14;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return false;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonWhitePixels = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3];
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];

      if (alpha > 10 && (red < 245 || green < 245 || blue < 245)) {
        nonWhitePixels += 1;
      }
    }

    return nonWhitePixels < 4;
  };

  const exportNodeToPng = async (node: HTMLElement, transparent: boolean) => {
    const rect = node.getBoundingClientRect();
    const nodeWidth = rect.width || node.offsetWidth || canvasWidth;
    const nodeHeight = rect.height || node.offsetHeight || canvasHeight;
    const exportScale = canvasWidth / nodeWidth;

    const normalizeDataUrl = (sourceCanvas: HTMLCanvasElement) => {
      if (sourceCanvas.width === canvasWidth && sourceCanvas.height === canvasHeight) {
        return sourceCanvas.toDataURL("image/png");
      }

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = canvasWidth;
      finalCanvas.height = canvasHeight;
      const context = finalCanvas.getContext("2d");
      if (!context) return sourceCanvas.toDataURL("image/png");
      context.drawImage(sourceCanvas, 0, 0, canvasWidth, canvasHeight);
      return finalCanvas.toDataURL("image/png");
    };

    const exportWithHtml2Canvas = async () => {
      if (transparent) {
        node.querySelectorAll("img").forEach((image) => {
          if (image.alt === "Bg") image.style.display = "none";
        });
        node.style.background = "transparent";
        node.style.backgroundColor = "transparent";
        node.style.border = "none";
      }

      const canvas = await html2canvas(node, {
        backgroundColor: transparent ? null : canvasBgColor,
        scale: exportScale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: nodeWidth,
        height: nodeHeight,
        windowWidth: Math.ceil(nodeWidth),
        windowHeight: Math.ceil(nodeHeight),
        scrollX: 0,
        scrollY: 0,
      });

      return normalizeDataUrl(canvas);
    };

    let fontEmbedCSS: string | undefined;
    try {
      fontEmbedCSS = await getFontEmbedCSS(node, { preferredFontFormat: "woff2" });
    } catch (fontError) {
      console.warn("Font embedding could not be prepared; using loaded document fonts.", fontError);
    }

    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: exportScale,
        skipFonts: false,
        fontEmbedCSS,
        backgroundColor: transparent ? "transparent" : canvasBgColor,
        filter: transparent
          ? (childNode) => !(childNode instanceof HTMLImageElement && childNode.alt === "Bg")
          : undefined,
        style: transparent
          ? {
              background: "transparent",
              backgroundColor: "transparent",
              border: "none",
              boxShadow: "none",
            }
          : {
              boxShadow: "none",
            },
      });

      if (!transparent && await isBlankWhitePng(dataUrl)) {
        console.warn("html-to-image returned a blank export, trying html2canvas fallback.");
        return await exportWithHtml2Canvas();
      }

      return dataUrl;
    } catch (error) {
      console.warn("html-to-image export failed, trying html2canvas fallback:", error);
      return await exportWithHtml2Canvas();
    }
  };
const duplicateLayer = () => {
  if (!selectedLayer) return;

  const copy = {
    ...selectedLayer,
    id: `copy-${Date.now()}`,
    name: `${selectedLayer.name} Copy`,
    x: selectedLayer.x + 3,
    y: selectedLayer.y + 3,
  };

  setLayers([...layers, copy]);
  setSelectedLayerId(copy.id);
};

const downloadPNG = async () => {
  const workspace = workspaceRef.current;
  if (!workspace || isExporting) return;
  let exportNode: HTMLElement | null = null;

  try {
    setIsExporting(true);
    setIsCropMode(false);

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    await waitForEditorFonts();
    await waitForCanvasImages(workspace);
    exportNode = await prepareWorkspaceForExport(workspace);

    const dataUrl = await exportNodeToPng(exportNode, false);

    const link =
      document.createElement("a");

    link.download =
      "pixores-design.png";

    link.href = dataUrl;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("PNG export failed:", err);
    alert(`The PNG could not be generated. ${getExportErrorMessage(err)}`);
  } finally {
    exportNode?.remove();
    setIsExporting(false);
  }
};

const downloadTransparentPNG = async () => {
  const workspace = workspaceRef.current;
  if (!workspace || isExporting) return;
  let exportNode: HTMLElement | null = null;

  try {
    setIsExporting(true);
    setIsCropMode(false);

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    await waitForEditorFonts();
    await waitForCanvasImages(workspace);
    exportNode = await prepareWorkspaceForExport(workspace);

    const dataUrl = await exportNodeToPng(exportNode, true);

    const link = document.createElement("a");
    link.download = "pixores-design-transparent.png";
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Transparent PNG export failed:", err);
    alert(`The transparent PNG could not be generated. ${getExportErrorMessage(err)}`);
  } finally {
    exportNode?.remove();
    setIsExporting(false);
  }
};

const pngDataUrlToJpeg = async (pngDataUrl: string, quality = 0.95) => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The JPG could not be prepared."));
    img.src = pngDataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || canvasWidth;
  canvas.height = image.naturalHeight || canvasHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available.");
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
};

const downloadJPG = async () => {
  const workspace = workspaceRef.current;
  if (!workspace || isExporting) return;
  let exportNode: HTMLElement | null = null;

  try {
    setIsExporting(true);
    setIsCropMode(false);

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    await waitForEditorFonts();
    await waitForCanvasImages(workspace);
    exportNode = await prepareWorkspaceForExport(workspace);

    const pngDataUrl = await exportNodeToPng(exportNode, false);
    const jpgDataUrl = await pngDataUrlToJpeg(pngDataUrl, 0.95);

    const link = document.createElement("a");
    link.download = "pixores-design.jpg";
    link.href = jpgDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("JPG export failed:", err);
    alert(`The JPG could not be generated. ${getExportErrorMessage(err)}`);
  } finally {
    exportNode?.remove();
    setIsExporting(false);
  }
};

const downloadSelectedNoBgPNG = async () => {
  if (!selectedLayer || selectedLayer.type !== "image" || !selectedLayer.src) return;

  try {
    const link = document.createElement("a");
    const safeName = (selectedLayer.name || "no-bg-image")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    link.download = `${safeName || "no-bg-image"}.png`;
    link.href = selectedLayer.src;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error(err);
    alert("The no-background PNG could not be downloaded.");
  }
};

const dataUrlToFile = async (dataUrl: string, fileName: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || "image/png" });
};

  const updateSelectedLayer = (fields: Partial<Layer>) => {
    if (!selectedLayerId) return;
    setLayers(layers.map((l) => (l.id === selectedLayerId ? { ...l, ...fields } : l)));
  };

  const updateSelectedGridCell = (index: number, fields: Partial<GridImage>) => {
    if (!selectedLayerId) return;
    setLayers((currentLayers) => currentLayers.map((layer) => {
      if (layer.id !== selectedLayerId || !isGridFrame(layer.shapeType)) return layer;
      const capacity = getGridCells(layer.shapeType).length;
      const nextGridImages = [...(layer.gridImages || [])];
      while (nextGridImages.length < capacity) nextGridImages.push({});
      nextGridImages[index] = { ...nextGridImages[index], ...fields };
      return { ...layer, gridImages: nextGridImages, activeGridCell: index };
    }));
  };

  const getTextSelectionOffsets = (element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!element.contains(range.commonAncestorContainer)) return;

    const beforeStart = range.cloneRange();
    beforeStart.selectNodeContents(element);
    beforeStart.setEnd(range.startContainer, range.startOffset);

    const beforeEnd = range.cloneRange();
    beforeEnd.selectNodeContents(element);
    beforeEnd.setEnd(range.endContainer, range.endOffset);

    const start = beforeStart.toString().length;
    const end = beforeEnd.toString().length;

    if (start === end) return;

    return {
      start: Math.min(start, end),
      end: Math.max(start, end),
    };
  };

  const getTextColorAtSelection = (element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer) && range.startContainer !== element) return null;

    let colorNode: Node | null = range.startContainer;
    if (colorNode === element && range.startOffset > 0) {
      colorNode = element.childNodes[Math.min(range.startOffset - 1, element.childNodes.length - 1)] || element;
    }
    if (colorNode.nodeType === Node.TEXT_NODE) colorNode = colorNode.parentNode;
    const colorElement = colorNode instanceof HTMLElement ? colorNode : element;
    return normalizeColorToHex(window.getComputedStyle(colorElement).color);
  };

  const rememberTextSelection = (layerId: string | number, element: HTMLElement) => {
    const selectionColor = getTextColorAtSelection(element);
    if (selectionColor) setActiveTextColor(selectionColor);

    const offsets = getTextSelectionOffsets(element);
    if (!offsets) return;

    savedTextSelectionRef.current = { layerId, ...offsets };
    // Keep the browser's native blue selection while editing. Re-rendering a
    // preview span here would replace the live contentEditable DOM and undo typing.
    setTextSelectionPreview(null);
  };

  const getEditableTextElement = (layerId: string | number) =>
    document.querySelector(`[data-layer-text-id="${String(layerId).replace(/"/g, '\\"')}"]`) as HTMLElement | null;

  const beginTextEditing = (layerId: string | number, selectAll = false) => {
    const currentElement = getEditableTextElement(layerId);
    const currentLayer = layers.find((layer) => layer.id === layerId);
    const preservedText = currentElement?.innerText || currentLayer?.text || "";
    const preservedHtml = currentElement?.innerHTML
      ? stripSelectionPreviewHtml(currentElement.innerHTML)
      : currentLayer?.textHtml || (currentLayer ? getTextLayerHtml(currentLayer) : "");

    pendingTextEditRef.current = {
      layerId,
      text: preservedText,
      html: preservedHtml,
      selectAll,
    };

    setSelectedLayerId(layerId);
    setDraggingLayerId(null);
    setEditingTextLayerId(layerId);
    setTextSelectionPreview(null);

    if (currentElement) {
      setLayers((currentLayers) => currentLayers.map((currentLayer) => (
        currentLayer.id === layerId
          ? { ...currentLayer, text: preservedText, textHtml: preservedHtml }
          : currentLayer
      )));
    }

    // Focus during the touch event so mobile browsers open the keyboard reliably.
    currentElement?.setAttribute("contenteditable", "true");
    currentElement?.focus();
    if (currentElement) {
      textEditDraftRef.current = {
        layerId,
        text: currentElement.innerText || "",
        textHtml: stripSelectionPreviewHtml(currentElement.innerHTML),
      };
    }

  };

  useLayoutEffect(() => {
    const pending = pendingTextEditRef.current;
    if (!pending || editingTextLayerId !== pending.layerId) return;

    const editableElement = getEditableTextElement(pending.layerId);
    if (!editableElement) return;

    if (editableElement.innerHTML !== pending.html) {
      editableElement.innerHTML = pending.html;
    }
    if (!editableElement.innerHTML && pending.text) {
      editableElement.textContent = pending.text;
    }

    editableElement.setAttribute("contenteditable", "true");
    editableElement.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editableElement);
    if (!pending.selectAll) range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const selectionColor = getTextColorAtSelection(editableElement);
    if (selectionColor) setActiveTextColor(selectionColor);

    if (pending.selectAll) {
      const text = editableElement.innerText || "";
      savedTextSelectionRef.current = { layerId: pending.layerId, start: 0, end: text.length };
    }

    textEditDraftRef.current = {
      layerId: pending.layerId,
      text: editableElement.innerText || pending.text,
      textHtml: stripSelectionPreviewHtml(editableElement.innerHTML),
    };
    pendingTextEditRef.current = null;
  }, [editingTextLayerId]);

  const htmlWithColorRange = (html: string, start: number, end: number, color: string) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const totalLength = wrapper.textContent?.length || 0;
    const safeStart = Math.max(0, Math.min(start, totalLength));
    const safeEnd = Math.max(safeStart, Math.min(end, totalLength));
    if (safeStart === safeEnd) return wrapper.innerHTML;

    const findTextPosition = (offset: number, preferNextNode = false) => {
      const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
      let traversed = 0;
      let lastNode: Text | null = null;

      while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        lastNode = textNode;
        const nextOffset = traversed + textNode.data.length;
        if (offset < nextOffset || (offset === nextOffset && !preferNextNode)) {
          return { node: textNode, offset: Math.max(0, offset - traversed) };
        }
        traversed = nextOffset;
      }

      return lastNode ? { node: lastNode, offset: lastNode.data.length } : null;
    };

    const startPosition = findTextPosition(safeStart, true);
    const endPosition = findTextPosition(safeEnd);
    if (!startPosition || !endPosition) return wrapper.innerHTML;

    const range = document.createRange();
    range.setStart(startPosition.node, startPosition.offset);
    range.setEnd(endPosition.node, endPosition.offset);
    const selectedContent = range.extractContents();

    selectedContent.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
      element.style.removeProperty("color");
      if (!element.getAttribute("style")?.trim()) element.removeAttribute("style");
    });

    const colorSpan = document.createElement("span");
    colorSpan.style.color = color;
    colorSpan.appendChild(selectedContent);
    range.insertNode(colorSpan);
    wrapper.normalize();
    return wrapper.innerHTML;
  };

  const htmlWithSelectionPreview = (text: string, start: number, end: number) => {
    const safeStart = Math.max(0, Math.min(start, text.length));
    const safeEnd = Math.max(safeStart, Math.min(end, text.length));

    return [
      escapeTextHtml(text.slice(0, safeStart)),
      `<span data-pixores-selection="true" style="background: rgba(37, 99, 235, 0.42); color: inherit;">${escapeTextHtml(text.slice(safeStart, safeEnd))}</span>`,
      escapeTextHtml(text.slice(safeEnd)),
    ].join("");
  };

  const stripSelectionPreviewHtml = (html: string) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    wrapper.querySelectorAll("[data-pixores-selection]").forEach((node) => {
      const parent = node.parentNode;
      if (!parent) return;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
    });
    return wrapper.innerHTML;
  };

  const getTextLayerHtml = (layer: Layer) => {
    if (
      editingTextLayerId === layer.id &&
      textSelectionPreview?.layerId === layer.id &&
      textSelectionPreview.end > textSelectionPreview.start
    ) {
      return htmlWithSelectionPreview(layer.text || textSelectionPreview.text, textSelectionPreview.start, textSelectionPreview.end);
    }

    return layer.textHtml || escapeTextHtml(layer.text || "");
  };

  const applyColorToSelectedText = (color: string) => {
    setActiveTextColor(normalizeColorToHex(color) || color);
    if (!selectedLayer || selectedLayer.type !== "text") {
      updateSelectedLayer({ color });
      return;
    }

    const editableElement = getEditableTextElement(selectedLayer.id);
    const liveOffsets = editableElement ? getTextSelectionOffsets(editableElement) : undefined;
    const savedSelection = savedTextSelectionRef.current;
    const offsets =
      liveOffsets ||
      (savedSelection?.layerId === selectedLayer.id
        ? { start: savedSelection.start, end: savedSelection.end }
        : undefined);

    if (editableElement && offsets && offsets.end > offsets.start) {
      const plainText = editableElement.innerText || selectedLayer.text || "";
      const sourceHtml = stripSelectionPreviewHtml(editableElement.innerHTML || selectedLayer.textHtml || escapeTextHtml(plainText));
      const textHtml = htmlWithColorRange(sourceHtml, offsets.start, offsets.end, color);
      updateSelectedLayer({
        text: plainText,
        textHtml,
        color: selectedLayer.color || color,
      });
      setTextSelectionPreview(null);
      savedTextSelectionRef.current = {
        layerId: selectedLayer.id,
        start: offsets.start,
        end: offsets.end,
      };
      return;
    }

    setTextSelectionPreview(null);
    updateSelectedLayer({ color, textHtml: undefined });
  };

 const startResizing = (e: React.MouseEvent | React.TouchEvent, layer: Layer, corner: ResizeState["corner"]) => {
  e.preventDefault();
  e.stopPropagation();
  if (layer.isLocked) {
    setSelectedLayerId(layer.id);
    setDraggingLayerId(null);
    return;
  }
  const { clientX, clientY } = getCoords(e);
  setSelectedLayerId(layer.id);
  setDraggingLayerId(null);
  setResizeState({
    corner,
    initialWidth: layer.width || 150,
    initialHeight: layer.height || 150,
    initialFontSize: layer.fontSize || 40,
    initialX: layer.x,
    initialY: layer.y,
    mouseX: clientX,
    mouseY: clientY,
      initialCropTop: layer.cropTop || 0,
      initialCropBottom: layer.constrainBottom || 0,
      initialCropLeft: layer.cropLeft || 0,
      initialCropRight: layer.cropRight || 0,
      initialAngle: layer.angle || 0,
    });
  };

  const createProjectThumbnail = async () => {
    const workspace = workspaceRef.current;

    if (!workspace) return null;

    try {
      setIsExporting(true);
      setIsCropMode(false);

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );

    await waitForEditorFonts();
    await waitForCanvasImages(workspace);

      const thumbnail = await toPng(workspace, {
        cacheBust: true,
        canvasWidth,
        canvasHeight,
        pixelRatio: 0.25,
        skipFonts: false,
        backgroundColor: canvasBgColor,
        style: {
          boxShadow: "none",
        },
      });

      return thumbnail;
    } catch (error) {
      console.error("Could not generate project thumbnail:", error);
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const saveProject = async () => {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("Please login first.");
      return;
    }

    const projectName = prompt("Project name:", "Untitled Project");
    if (!projectName) return;

    const thumbnail = await createProjectThumbnail();

    const projectData = {
      canvasWidth,
      canvasHeight,
      canvasBgColor,
      canvasStrokeColor,
      canvasStrokeWidth,
      preview,
      layers,
      thumbnail,
    };

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: userData.user.id,
        name: projectName,
        project_data: projectData,
        thumbnail,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setCurrentProjectId(data.id);
    setSavedProjects((prev) => [data, ...prev]);
    alert("Project saved successfully!");
  };

  const saveAsPublicTemplate = async () => {
    if (!isAdmin) {
      alert("Admin access is required to publish templates.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      alert("Please login first.");
      return;
    }

    const templateName = prompt("Public template name:", "New Pixores Template");
    if (!templateName) return;

    const templateCategory = prompt("Template category:", "YouTube") || "YouTube";
    const thumbnail = await createProjectThumbnail();

    if (!thumbnail) {
      alert("Template preview could not be generated. Please try again.");
      return;
    }

    const templateData: EditableTemplateData = {
      canvasWidth,
      canvasHeight,
      canvasBgColor,
      canvasStrokeColor,
      canvasStrokeWidth,
      preview,
      layers,
    };

    const formData = new FormData();
    formData.set("category", "templates");
    formData.set("name", templateName);
    formData.set("alt_text", `${templateName} editable Pixores template`);
    formData.set("tags", templateCategory);
    formData.set("metadata", JSON.stringify({
      assetType: "template",
      templateCategory,
      templateData,
    }));
    formData.set("file", await dataUrlToFile(thumbnail, `${templateName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-preview.png`));

    const response = await fetch("/api/admin/assets", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Template could not be published.");
      return;
    }

    setAdminAssets((prev) => [data.asset, ...prev]);
    alert("Public template saved successfully.");
  };

  const updatePublicTemplate = async () => {
    if (!isAdmin) {
      alert("Admin access is required to update templates.");
      return;
    }

    const openedTemplateId = searchParams.get("template");
    if (!openedTemplateId) {
      alert("Open a template before updating it.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      alert("Please login first.");
      return;
    }

    const staticTemplate = templates.find((template) => template.id === openedTemplateId);
    const existingAsset = adminAssets.find((asset) => asset.id === currentTemplateAssetId)
      || adminAssets.find((asset) => asset.id === openedTemplateId)
      || adminAssets.find((asset) => getAdminTemplateSourceId(asset) === openedTemplateId);
    const existingMetadata = existingAsset?.metadata || {};
    const existingCategory = existingMetadata.templateCategory;
    const templateName = existingAsset?.name || staticTemplate?.name || "Pixores Template";
    const templateCategory = typeof existingCategory === "string"
      ? existingCategory
      : staticTemplate?.category || "Pixores";

    setIsSavingTemplate(true);

    try {
      const thumbnail = await createProjectThumbnail();
      if (!thumbnail) throw new Error("Template preview could not be generated.");

      const templateData: EditableTemplateData = {
        canvasWidth,
        canvasHeight,
        canvasBgColor,
        canvasStrokeColor,
        canvasStrokeWidth,
        preview,
        layers,
      };
      const sourceTemplateId = getAdminTemplateSourceId(existingAsset)
        || staticTemplate?.id
        || null;
      const metadata = {
        ...existingMetadata,
        assetType: "template",
        templateCategory,
        templateData,
        ...(sourceTemplateId ? { sourceTemplateId } : {}),
      };
      const formData = new FormData();
      formData.set("category", "templates");
      formData.set("name", templateName);
      formData.set("alt_text", existingAsset?.alt_text || `${templateName} editable Pixores template`);
      formData.set("tags", existingAsset?.tags?.join(",") || templateCategory);
      formData.set("is_published", String(existingAsset?.is_published ?? true));
      formData.set("sort_order", String(existingAsset?.sort_order ?? 0));
      formData.set("metadata", JSON.stringify(metadata));
      formData.set("file", await dataUrlToFile(
        thumbnail,
        `${templateName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-preview.png`,
      ));

      const response = await fetch(
        existingAsset ? `/api/admin/assets?id=${existingAsset.id}` : "/api/admin/assets",
        {
          method: existingAsset ? "PATCH" : "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Template could not be updated.");

      setAdminAssets((currentAssets) => existingAsset
        ? currentAssets.map((asset) => asset.id === data.asset.id ? data.asset : asset)
        : [data.asset, ...currentAssets]);
      setCurrentTemplateAssetId(data.asset.id);
      alert(existingAsset ? "Public template updated successfully." : "Template is now editable and saved publicly.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Template could not be updated.");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const updateProject = async () => {
    if (!currentProjectId) {
      alert("Open a project first or use Save Project.");
      return;
    }

    const thumbnail = await createProjectThumbnail();

    const projectData = {
      canvasWidth,
      canvasHeight,
      canvasBgColor,
      canvasStrokeColor,
      canvasStrokeWidth,
      preview,
      layers,
      thumbnail,
    };

    const { data, error } = await supabase
      .from("projects")
      .update({
        project_data: projectData,
        thumbnail,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentProjectId)
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setSavedProjects((prev) =>
      prev.map((project) => (project.id === currentProjectId ? data : project))
    );

    alert("Project updated successfully!");
  };

  const loadMyProjects = async () => {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("Please login first.");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .select("id,user_id,name,project_data,thumbnail,created_at,updated_at")
      .eq("user_id", userData.user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setSavedProjects(data || []);
    setShowProjects(true);
  };

  const openProject = (project: any) => {
    const data = project.project_data;

    setCanvasWidth(data.canvasWidth || 1280);
    setCanvasHeight(data.canvasHeight || 720);
    setCanvasBgColor(data.canvasBgColor || "#FFFFFF");
    setCanvasStrokeColor(data.canvasStrokeColor || "#0F172A");
    setCanvasStrokeWidth(data.canvasStrokeWidth || 0);
    setPreview(data.preview || null);

    if (Array.isArray(data.layers)) {
      setLayers(data.layers);
      setSelectedLayerId(data.layers[0]?.id || null);
    }

    setCurrentProjectId(project.id);
    setShowProjects(false);
  };

  const deleteProject = async (projectId: string) => {
    const confirmDelete = confirm("Delete this project?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      alert(error.message);
      return;
    }

    setSavedProjects((prev) => prev.filter((project) => project.id !== projectId));

    if (currentProjectId === projectId) {
      setCurrentProjectId(null);
    }
  };

  const getCropClipPath = (layer: Layer) => {
    if (layer.type !== "image") return "none";

    return `inset(${layer.cropTop || 0}px ${layer.cropRight || 0}px ${
      layer.constrainBottom || 0
    }px ${layer.cropLeft || 0}px)`;
  };

 const getLayerFill = (layer: Layer) => {
  if (!layer.useGradient) {
    return layer.color || "#3B82F6";
  }

  return getGradientFill(layer);
};

  const applyCropToSelectedImage = async () => {
    if (!selectedLayer || selectedLayer.type !== "image" || !selectedLayer.src) return;

    const cropTop = selectedLayer.cropTop || 0;
    const cropRight = selectedLayer.cropRight || 0;
    const cropBottom = selectedLayer.constrainBottom || 0;
    const cropLeft = selectedLayer.cropLeft || 0;

    if (cropTop === 0 && cropRight === 0 && cropBottom === 0 && cropLeft === 0) {
      setIsCropMode(false);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = selectedLayer.src;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not load image for crop"));
    });

    const displayWidth = selectedLayer.width || img.naturalWidth;
    const displayHeight = selectedLayer.height || img.naturalHeight;

    const scaleX = img.naturalWidth / displayWidth;
    const scaleY = img.naturalHeight / displayHeight;

    const sourceX = cropLeft * scaleX;
    const sourceY = cropTop * scaleY;
    const sourceWidth = Math.max(1, img.naturalWidth - (cropLeft + cropRight) * scaleX);
    const sourceHeight = Math.max(1, img.naturalHeight - (cropTop + cropBottom) * scaleY);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sourceWidth);
    canvas.height = Math.round(sourceHeight);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );

    const croppedSrc = canvas.toDataURL("image/png");

    updateSelectedLayer({
      src: croppedSrc,
      width: Math.round(sourceWidth / scaleX),
      height: Math.round(sourceHeight / scaleY),
      cropTop: 0,
      cropRight: 0,
      constrainBottom: 0,
      cropLeft: 0,
    });

    setIsCropMode(false);
  };

  const loadCredits = async () => {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    setCredits(null);
    return;
  }

  const { data } = await supabase
    .from("user_credits")
    .select("credits")
    .eq("user_id", userData.user.id)
    .single();

  if (!data) {
    await supabase.from("user_credits").insert({
      user_id: userData.user.id,
      credits: 5,
    });

    setCredits(5);
    return;
  }

  setCredits(data.credits);
};

useEffect(() => {
  loadCredits();

  const { data: listener } = supabase.auth.onAuthStateChange(() => {
    loadCredits();
  });

  return () => {
    listener.subscription.unsubscribe();
  };
}, []);

const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    credits: 50,
    price: 4.99,
  },
  {
    id: "creator",
    name: "Creator",
    credits: 200,
    price: 9.99,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 500,
    price: 19.99,
  },
];
const closeCreditsModal = () => {
  setShowCreditsModal(false);
};

const buyCredits = async (packageId: string) => {
  try {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("Please login first.");
      return;
    }

    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        packageId,
        userId: userData.user.id,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Checkout failed");
      return;
    }

    window.location.href = data.url;
  } catch (error) {
    console.error(error);
    alert("Could not start checkout.");
  }
};

  if (!isClientMounted) {
    return (
      <div
        suppressHydrationWarning
        style={{
          minHeight: "70vh",
          display: "grid",
          placeItems: "center",
          background: "#F8FAFC",
          color: "#475569",
          fontFamily: "Inter, Arial, sans-serif",
          fontWeight: 800,
        }}
      >
        Loading Pixores Thumbnail Maker...
      </div>
    );
  }

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", minHeight: isMobileLayout ? "100dvh" : "100vh", height: isMobileLayout ? "100dvh" : "100vh", fontFamily: "'Segoe UI', Roboto, sans-serif", background: "#F1F5F9", overflow: "hidden" }}>
      
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Montserrat:wght@700;900&family=Poppins:wght@600;900&family=Inter:wght@400;800&display=swap" />
      <style>{`
        @keyframes pixoresTextPop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes pixoresTextFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>

      {/* HEADER */}
      <header style={{ minHeight: isMobileLayout ? "54px" : "62px", background: "#FFFFFF", color: "#0F172A", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: isMobileLayout ? "8px 14px" : "0 18px", borderBottom: "1px solid #E2E8F0", boxShadow: "0 8px 24px rgba(15,23,42,0.04)", zIndex: 10, flexWrap: "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: "0 1 260px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
            P
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: isMobileLayout ? "14px" : "16px", fontWeight: 850, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Pixores Thumbnail Maker</h1>
            {!isMobileLayout && <p style={{ margin: 0, color: "#64748B", fontSize: "12px" }}>Thumbnail editor</p>}
          </div>
        </div>

        <div style={{ display: isMobileLayout ? "none" : "flex", alignItems: "center", gap: "8px", flex: "1 1 auto", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", border: "1px solid #E2E8F0", borderRadius: "10px", background: "#F8FAFC", color: "#334155", fontWeight: 800, fontSize: "13px" }}>
            <span>Credits: {credits ?? 0}</span>
            <button suppressHydrationWarning onClick={() => setShowCreditsModal(true)} style={{ padding: "5px 8px", background: "#FFFFFF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: "8px", cursor: "pointer", fontWeight: 800 }}>
              Buy
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px", border: "1px solid #E2E8F0", borderRadius: "12px", background: "#FFFFFF" }}>
            <button onClick={saveProject} style={{ padding: "8px 11px", background: "#2563EB", color: "#FFFFFF", border: "none", borderRadius: "9px", fontWeight: 800, cursor: "pointer", fontSize: "13px" }}>Save</button>
            <button onClick={updateProject} disabled={!currentProjectId} style={{ padding: "8px 11px", background: currentProjectId ? "#FFFFFF" : "#F1F5F9", color: currentProjectId ? "#334155" : "#94A3B8", border: "none", borderRadius: "9px", fontWeight: 800, cursor: currentProjectId ? "pointer" : "not-allowed", fontSize: "13px" }}>Update</button>
            <button onClick={loadMyProjects} style={{ padding: "8px 11px", background: "#FFFFFF", color: "#334155", border: "none", borderRadius: "9px", fontWeight: 800, cursor: "pointer", fontSize: "13px" }}>Projects</button>
            {isAdmin && searchParams.get("template") && (
              <button
                onClick={updatePublicTemplate}
                disabled={isSavingTemplate}
                style={{ padding: "8px 11px", background: "#EDE9FE", color: "#6D28D9", border: "none", borderRadius: "9px", fontWeight: 850, cursor: isSavingTemplate ? "wait" : "pointer", fontSize: "13px" }}
              >
                {isSavingTemplate ? "Saving..." : currentTemplateAssetId ? "Update Template" : "Save Template Changes"}
              </button>
            )}
            {isAdmin && <button onClick={saveAsPublicTemplate} style={{ padding: "8px 11px", background: "#F8FAFC", color: "#475569", border: "none", borderRadius: "9px", fontWeight: 850, cursor: "pointer", fontSize: "13px" }}>New Template</button>}
          </div>

          <div style={{ position: "relative" }}>
            <button disabled={isExporting} onClick={() => setShowExportMenu((current) => !current)} style={{ padding: "10px 14px", background: isExporting ? "#94A3B8" : "#10B981", color: "#FFFFFF", border: "none", borderRadius: "10px", fontWeight: 850, cursor: isExporting ? "wait" : "pointer", fontSize: "13px", boxShadow: isExporting ? "none" : "0 8px 18px rgba(16,185,129,0.18)" }}>
              Export
            </button>
            {showExportMenu && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "220px", padding: "8px", border: "1px solid #E2E8F0", borderRadius: "12px", background: "#FFFFFF", boxShadow: "0 18px 40px rgba(15,23,42,0.16)", zIndex: 50 }}>
                <button onClick={() => { setShowExportMenu(false); void downloadPNG(); }} style={{ width: "100%", padding: "10px", border: "none", borderRadius: "9px", background: "#FFFFFF", color: "#0F172A", textAlign: "left", fontWeight: 800, cursor: "pointer" }}>PNG HD</button>
                <button onClick={() => { setShowExportMenu(false); void downloadJPG(); }} style={{ width: "100%", padding: "10px", border: "none", borderRadius: "9px", background: "#FFFFFF", color: "#0F172A", textAlign: "left", fontWeight: 800, cursor: "pointer" }}>JPG High Quality</button>
                <button onClick={() => { setShowExportMenu(false); void downloadTransparentPNG(); }} style={{ width: "100%", padding: "10px", border: "none", borderRadius: "9px", background: "#FFFFFF", color: "#0F172A", textAlign: "left", fontWeight: 800, cursor: "pointer" }}>Transparent PNG</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <header style={{ display: "none", minHeight: isMobileLayout ? "56px" : "68px", background: isMobileLayout ? "#0F172A" : "rgba(255,255,255,0.96)", color: isMobileLayout ? "#FFFFFF" : "#0F172A", alignItems: "center", justifyContent: "space-between", gap: isMobileLayout ? "12px" : "14px", padding: isMobileLayout ? "8px 14px" : "0 18px", borderBottom: isMobileLayout ? "none" : "1px solid #E2E8F0", boxShadow: isMobileLayout ? "0 2px 4px rgba(0,0,0,0.1)" : "0 8px 24px rgba(15,23,42,0.06)", zIndex: 10, flexWrap: "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: isMobileLayout ? "1 1 180px" : "0 0 auto" }}>
          <span style={{ fontSize: "20px" }}>🎨</span>
          <h1 style={{ fontSize: isMobileLayout ? "15px" : "17px", fontWeight: 800, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Pixores Thumbnail Maker</h1>
        </div>

        <div
  style={{
    padding: "8px 12px",
    borderRadius: "8px",
    background: "#1E293B",
    color: "#FACC15",
    fontWeight: 700,
    fontSize: isMobileLayout ? "13px" : "15px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  }}
>
  <span>⭐ Credits: {credits ?? 0}</span>

  <button
    suppressHydrationWarning
    onClick={() => setShowCreditsModal(true)}
    style={{
      padding: "6px 10px",
      background: "#F59E0B",
      color: "#FFF",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: 700,
    }}
  >
    Buy Credits
  </button>
</div>

        <button
  onClick={saveProject}
  style={{
    display: isMobileLayout ? "none" : "block",
    padding: "10px 16px",
    background: "#2563EB",
    color: "#FFF",
    border: "none",
    borderRadius: "999px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
  }}
>
  💾 Save Project
</button>

{isAdmin && (
  <button
    onClick={saveAsPublicTemplate}
    style={{
      display: isMobileLayout ? "none" : "block",
      padding: "10px 16px",
      background: "#7C3AED",
      color: "#FFF",
      border: "none",
      borderRadius: "999px",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: "14px",
    }}
  >
    Save as Public Template
  </button>
)}

<button
  onClick={updateProject}
  disabled={!currentProjectId}
  style={{
    display: isMobileLayout ? "none" : "block",
    padding: "10px 16px",
    background: currentProjectId ? "#F59E0B" : "#94A3B8",
    color: "#FFF",
    border: "none",
    borderRadius: "999px",
    fontWeight: 700,
    cursor: currentProjectId ? "pointer" : "not-allowed",
    fontSize: "14px",
  }}
>
  🔄 Update Project
</button>

<button
  onClick={loadMyProjects}
  style={{
    display: isMobileLayout ? "none" : "block",
    padding: "10px 14px",
    background: "#F8FAFC",
    color: "#0F172A",
    border: "1px solid #CBD5E1",
    borderRadius: "999px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
  }}
>
  📂 My Projects
</button>


        <button disabled={isExporting} onClick={() => downloadPNG()} style={{ display: isMobileLayout ? "none" : "block", padding: "10px 16px", background: isExporting ? "#94A3B8" : "#10B981", color: "#FFF", border: "none", borderRadius: "999px", fontWeight: 700, cursor: isExporting ? "wait" : "pointer", flex: "0 0 auto", fontSize: "14px", boxShadow: isExporting ? "none" : "0 8px 18px rgba(16,185,129,0.22)" }}>
          📥 Download PNG HD
        </button>
        <button disabled={isExporting} onClick={() => downloadTransparentPNG()} style={{ display: isMobileLayout ? "none" : "block", padding: "10px 16px", background: isExporting ? "#94A3B8" : "#0EA5E9", color: "#FFF", border: "none", borderRadius: "999px", fontWeight: 700, cursor: isExporting ? "wait" : "pointer", flex: "0 0 auto", fontSize: "14px", boxShadow: isExporting ? "none" : "0 8px 18px rgba(14,165,233,0.22)" }}>
          Download Transparent PNG
        </button>
      </header>

      {showProjects && (
        <div
          style={{
            background: "#FFFFFF",
            borderBottom: "1px solid #E2E8F0",
            padding: "14px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong>My Projects</strong>

            <button
              onClick={() => setShowProjects(false)}
              style={{
                border: "none",
                background: "#F1F5F9",
                padding: "6px 10px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>

          {savedProjects.length === 0 ? (
            <p style={{ margin: 0, color: "#64748B", fontSize: "14px" }}>
              No saved projects yet.
            </p>
          ) : (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
             {savedProjects.map((project) => (
  <div
    key={project.id}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid #CBD5E1",
      background: "#F8FAFC",
    }}
  >
    {(project.thumbnail || project.project_data?.thumbnail) ? (
      <img
        src={project.thumbnail || project.project_data?.thumbnail}
        alt={project.name}
        style={{
          width: "120px",
          height: "68px",
          objectFit: "cover",
          borderRadius: "6px",
          border: "1px solid #E2E8F0",
          background: "#E2E8F0",
          flex: "0 0 auto",
        }}
      />
    ) : (
      <div
        style={{
          width: "120px",
          height: "68px",
          borderRadius: "6px",
          border: "1px solid #E2E8F0",
          background: "#E2E8F0",
          color: "#64748B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: 700,
          flex: "0 0 auto",
        }}
      >
        No preview
      </div>
    )}
    <button
      onClick={() => openProject(project)}
      style={{
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      📄 {project.name}
    </button>

    <button
      onClick={() => deleteProject(project.id)}
      style={{
        border: "none",
        background: "#FEE2E2",
        color: "#DC2626",
        borderRadius: "6px",
        padding: "5px 8px",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      Delete
    </button>
  </div>
))}
            </div>
          )}
        </div>
      )}

{showCreditsModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999999,
    }}
  >
    <div
      style={{
        width: "90%",
        maxWidth: "700px",
        background: "#FFFFFF",
        borderRadius: "20px",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0 }}>⭐ Buy Credits</h2>

        <button
          onClick={closeCreditsModal}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "24px",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: "16px",
        }}
      >
        {CREDIT_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <h3>{pkg.name}</h3>

            <div
              style={{
                fontSize: "36px",
                fontWeight: 800,
                color: "#2563EB",
              }}
            >
              {pkg.credits}
            </div>

            <p>Credits</p>

            <h2>${pkg.price}</h2>

<button
  onClick={() => buyCredits(pkg.id)}
  style={{
    width: "100%",
    padding: "10px",
    background: "#2563EB",
    color: "#FFF",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 700,
  }}
>
  Buy Now
</button>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
      {/* MAIN LAYOUT */}
      <div
  style={{
    display: "grid",
    gridTemplateColumns: isMobileLayout ? "1fr" : "320px 1fr 340px",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  }}
>
        
        {/* LEFT PANEL */}
        <aside style={{ background: "#FFFFFF", borderRight: isMobileLayout ? "none" : "1px solid #E2E8F0", borderTop: isMobileLayout ? "1px solid #E2E8F0" : "none", padding: isMobileLayout ? "16px" : "20px", overflowY: "auto", display: isMobileLayout ? (mobilePanel === "elements" || mobilePanel === "tools" ? "flex" : "none") : "flex", flexDirection: "column", gap: "18px", minWidth: 0, order: isMobileLayout ? 1 : 0, position: isMobileLayout ? "absolute" : "static", left: isMobileLayout ? 8 : undefined, right: isMobileLayout ? 8 : undefined, bottom: isMobileLayout ? "84px" : undefined, maxHeight: isMobileLayout ? "40dvh" : undefined, zIndex: isMobileLayout ? 2147483646 : undefined, borderRadius: isMobileLayout ? "16px" : undefined, boxShadow: isMobileLayout ? "0 -14px 40px rgba(15, 23, 42, 0.2)" : undefined, touchAction: isMobileLayout ? "pan-y" : undefined, WebkitOverflowScrolling: isMobileLayout ? "touch" : undefined, overscrollBehavior: isMobileLayout ? "contain" : undefined }}>
          {isMobileLayout && (
            <div style={{ position: "sticky", top: "-16px", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", margin: "-10px 0 0", padding: "10px 0", background: "#FFFFFF" }}>
              <strong style={{ fontSize: "14px", color: "#0F172A" }}>{mobilePanel === "elements" ? (mobileAssetSection === "uploads" ? "Uploads" : "Elements") : "Tools"}</strong>
              <button type="button" onClick={() => setMobilePanel(null)} style={{ width: "34px", height: "34px", borderRadius: "999px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#0F172A", fontSize: "18px", lineHeight: 1, cursor: "pointer" }}>x</button>
            </div>
          )}
          
          {/* CANVAS RESIZER */}
          <div style={{ background: "#F8FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
            <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "8px", marginTop: 0 }}>Design Dimensions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <select 
                value={currentPreset} 
                onChange={(e) => handlePresetChange(e.target.value as any)}
                style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}
              >
                <option value="youtube">YouTube Thumbnail (1280x720)</option>
                <option value="facebook">Facebook Post (1200x630)</option>
                <option value="instagram_post">Instagram Post (1080x1080)</option>
                <option value="instagram_story">Instagram Story (1080x1920)</option>
                <option value="custom">Custom Dimensions</option>
              </select>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "10px", color: "#64748B" }}>Width (px)</label>
                  <input type="number" value={canvasWidth} onChange={(e) => { setCurrentPreset("custom"); setCanvasWidth(Math.max(100, Number(e.target.value))); }} style={{ width: "100%", padding: "4px", fontSize: "12px", borderRadius: "4px", border: "1px solid #CBD5E1" }} />
                </div>
                <span style={{ fontSize: "12px", marginTop: "14px", color: "#94A3B8" }}>x</span>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "10px", color: "#64748B" }}>Height (px)</label>
                  <input type="number" value={canvasHeight} onChange={(e) => { setCurrentPreset("custom"); setCanvasHeight(Math.max(100, Number(e.target.value))); }} style={{ width: "100%", padding: "4px", fontSize: "12px", borderRadius: "4px", border: "1px solid #CBD5E1" }} />
                </div>
              </div>
            </div>
          </div>
          <div>
  <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: "8px" }}>
    Canvas Background
  </h2>

  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <label style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Background Color</label>
    <input
      type="color"
      value={canvasBgColor || "#FFFFFF"}
      onChange={(e) => setCanvasBgColor(e.target.value)}
      style={{
        width: "100%",
        height: "30px",
        border: "1px solid #CBD5E1",
        borderRadius: "4px",
        cursor: "pointer",
      }}
    />

    <label
      style={{
        width: "100%",
        padding: "12px",
        borderRadius: "10px",
        border: "1px dashed #2563EB",
        background: "#EFF6FF",
        color: "#1D4ED8",
        fontWeight: 800,
        fontSize: "13px",
        textAlign: "center",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "3px",
        boxSizing: "border-box",
      }}
    >
      <span>Upload Background Image</span>
      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748B" }}>Import an image to use as the canvas background</span>
      <input
        type="file"
        accept="image/*"
        onChange={handleUploadBackground}
        style={{ display: "none" }}
      />
    </label>

    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Background</label>
        {isLoadingBackgrounds && <span style={{ fontSize: "10px", color: "#64748B" }}>Loading...</span>}
      </div>

      {allBackgroundCategories.length > 0 ? (
        <>
          <select
            value={backgroundCategory}
            onChange={(e) => setBackgroundCategory(e.target.value)}
            style={{
              width: "100%",
              padding: "7px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#0F172A",
            }}
          >
            {allBackgroundCategories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name} ({category.assets.length})
              </option>
            ))}
          </select>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", maxHeight: "220px", overflowY: "auto", paddingRight: "2px" }}>
            {visibleBackgroundAssets.map((asset) => (
              <button
                key={asset.src}
                type="button"
                onClick={() => applyBackgroundAsset(asset)}
                title={asset.name}
                style={{
                  aspectRatio: "16 / 10",
                  border: preview === asset.src ? "2px solid #2563EB" : "1px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "0",
                  overflow: "hidden",
                  background: "#E2E8F0",
                  cursor: "pointer",
                  boxShadow: preview === asset.src ? "0 0 0 2px rgba(37,99,235,0.18)" : "none",
                }}
              >
                <img
                  src={asset.src}
                  alt={asset.name}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </button>
            ))}
          </div>

          {(selectedBackgroundCategory?.assets.length || 0) > visibleBackgroundCount && (
            <button
              type="button"
              onClick={() => setVisibleBackgroundCount((count) => count + BACKGROUND_VISIBLE_STEP)}
              style={{ padding: "8px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}
            >
              Load more backgrounds ({Math.min(visibleBackgroundCount, selectedBackgroundCategory?.assets.length || 0)} / {selectedBackgroundCategory?.assets.length || 0})
            </button>
          )}
        </>
      ) : (
        <p style={{ margin: 0, fontSize: "11px", color: "#64748B", lineHeight: 1.4 }}>
          Agrega imagenes dentro de las carpetas de public/background para mostrarlas aqui.
        </p>
      )}
    </div>

    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Canvas Border / Stroke</label>

      <input
        type="color"
        value={canvasStrokeColor}
        onChange={(e) => setCanvasStrokeColor(e.target.value)}
        style={{ width: "100%", height: "28px", border: "none", cursor: "pointer" }}
      />

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748B", marginBottom: "4px" }}>
          <span>Thickness</span>
          <span>{canvasStrokeWidth}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="40"
          step="1"
          value={canvasStrokeWidth}
          onChange={(e) => setCanvasStrokeWidth(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>
    </div>

    {preview && (
      <button
        onClick={() => setPreview(null)}
        style={{
          padding: "4px",
          fontSize: "11px",
          background: "#FEF2F2",
          color: "#DC2626",
          border: "1px solid #FCA5A5",
          borderRadius: "4px",
          cursor: "pointer",
          marginTop: "2px",
        }}
      >
        Remove Image
      </button>
    )}
  </div>
</div>

<hr style={{ border: "none", borderTop: "1px solid #E2E8F0" }} />
          <div>
  <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: "8px" }}>
    Advanced Elements
  </h2>

  <div style={{ background: "#FFFFFF", border: "1px solid #E9D5FF", borderRadius: "16px", padding: "12px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 10px 24px rgba(124,58,237,0.08)" }}>
    <label style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #E9D5FF", borderRadius: "14px", padding: "10px 12px", color: "#64748B", background: "#FFFFFF" }}>
      <span style={{ fontSize: "18px" }}>⌕</span>
      <input
        type="text"
        value={textSearch}
        onChange={(e) => setTextSearch(e.target.value)}
        placeholder="Search fonts and styles"
        style={{ border: "none", outline: "none", width: "100%", fontSize: "13px", background: "transparent", color: "#0F172A" }}
      />
    </label>

    <button onClick={() => addTextLayer()} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #8B5CF6 0%, #9333EA 100%)", color: "#FFF", fontWeight: 800, cursor: "pointer", fontSize: "14px" }}>
      T Add Text Box
    </button>

    <button type="button" onClick={() => addTextLayer({ text: "Smart Caption", fontSize: 42, fontFamily: "Trebuchet MS", isBold: true, color: "#111827" })} style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#111827", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
      ✨ Smart Caption
    </button>

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#111827", fontSize: "13px", fontWeight: 800, paddingTop: "4px" }}>
      <span>Brand Fonts</span>
      <button type="button" style={{ border: "none", background: "transparent", color: "#111827", fontWeight: 800, cursor: "pointer" }}>Manage</button>
    </div>

    <button type="button" onClick={() => addTextLayer({ text: "Brand Headline", fontFamily: "Montserrat", fontSize: 40, isBold: true })} style={{ width: "100%", padding: "9px", borderRadius: "10px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#111827", fontWeight: 700, cursor: "pointer" }}>
      Add your brand font style
    </button>

    <strong style={{ fontSize: "13px", color: "#111827" }}>Pixores text presets</strong>
    {TEXT_PRESETS.filter((preset) => preset.label.toLowerCase().includes(textSearch.toLowerCase()) || preset.fontFamily.toLowerCase().includes(textSearch.toLowerCase()) || textSearch.trim() === "").map((preset) => (
      <button
        key={preset.label}
        type="button"
        onClick={() => addTextLayer(preset)}
        style={{ width: "100%", minHeight: "68px", textAlign: "left", padding: "12px 16px", borderRadius: "16px", border: "1px solid #E2E8F0", background: "#FFFFFF", color: preset.color, cursor: "pointer", fontFamily: preset.fontFamily, fontSize: Math.min(30, Math.max(16, preset.fontSize / 2.4)), fontWeight: preset.isBold ? 900 : 500, lineHeight: 1.05, overflow: "hidden", overflowWrap: "break-word", wordBreak: "normal" }}
      >
        {preset.label}
      </button>
    ))}
  </div>

  <label ref={uploadsSectionRef} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px dashed #8B5CF6", color: "#6D28D9", fontWeight: 750, display: "block", textAlign: "center", cursor: "pointer", fontSize: "13px", background: "#FAF5FF", scrollMarginTop: "12px" }}>
    Import Graphics / PNGs
    <input type="file" accept="image/*" multiple onChange={handleImportImage} style={{ display: "none" }} />
  </label>
  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#475569", fontWeight: 700 }}>
    <input
      type="checkbox"
      checked={saveImportsToBrand}
      onChange={(e) => setSaveImportsToBrand(e.target.checked)}
    />
    Save imported files to My Brand
  </label>

  <div style={{ marginTop: "14px" }}>
    <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: "8px" }}>
      Elements
    </h2>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
      {[
        { id: "people", label: "People" },
        { id: "brand", label: "My Brand" },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setAssetTab(tab.id as AssetTab)}
          style={{
            padding: "9px 7px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            background: assetTab === tab.id ? "#2563EB" : "#F8FAFC",
            color: assetTab === tab.id ? "#FFFFFF" : "#334155",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px", marginBottom: "10px" }}>
      {[
        { id: "elements", label: "Elements" },
        { id: "plants", label: "Plants" },
        { id: "animals", label: "Animals" },
        { id: "objects", label: "Objects" },
        { id: "shapes", label: "Shapes" },
        { id: "frames", label: "Frames" },
        { id: "grids", label: "Grids" },
        { id: "gradients", label: "Gradients" },
        { id: "social", label: "Social Media" },
        { id: "emojis", label: "Emojis" },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setAssetTab(tab.id as AssetTab)}
          style={{
            padding: "7px 5px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            background: assetTab === tab.id ? "#2563EB" : "#F8FAFC",
            color: assetTab === tab.id ? "#FFFFFF" : "#334155",
            fontSize: "10px",
            fontWeight: 800,
            cursor: "pointer",
            minWidth: 0,
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>

    {assetTab === "elements" || assetTab === "plants" || assetTab === "animals" ? (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "9px 10px", border: "1px solid #CBD5E1", borderRadius: "10px", background: "#FFFFFF", color: "#334155", fontSize: "11px", fontWeight: 800 }}>
          <span>{selectedLayer?.vectorSvg ? "Selected element color" : "New element color"}</span>
          <input
            type="color"
            value={selectedLayer?.vectorColor || vectorAssetColor}
            onChange={(event) => updateVectorAssetColor(event.target.value)}
            aria-label="Element color"
            style={{ width: "42px", height: "30px", border: "none", background: "transparent", cursor: "pointer" }}
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {EDITOR_VECTOR_ASSETS.filter((asset) => asset.category === assetTab).map((asset) => (
            <button
              key={`${asset.category}-${asset.name}`}
              type="button"
              onClick={() => addVectorAssetToCanvas(asset)}
              title={`Add ${asset.name}`}
              aria-label={`Add ${asset.name}`}
              style={{ aspectRatio: "1", border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden", cursor: "pointer", background: "#F8FAFC", padding: "10px" }}
            >
              <img
                src={vectorSvgDataUrl(asset.svg, vectorAssetColor)}
                alt={asset.name}
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
            </button>
          ))}
        </div>
      </div>
    ) : assetTab === "people" || assetTab === "objects" ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        {editorImageAssets.filter((asset) => asset.category === assetTab).map((asset) => (
          <div
            key={asset.src}
            onClick={() =>
              addImageToCanvas({
                url: asset.src,
                name: asset.name,
              })
            }
            style={{
              aspectRatio: "1",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              overflow: "hidden",
              cursor: "pointer",
              background: "#F8FAFC",
              padding: "6px",
            }}
            title={asset.name}
          >
            <img
              src={asset.src}
              alt={asset.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        ))}
      </div>
    ) : assetTab === "brand" ? (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {brandStorageWarning && (
          <div style={{ border: "1px solid #FDE68A", borderRadius: "10px", padding: "10px", background: "#FFFBEB", color: "#92400E", fontSize: "11px", lineHeight: 1.4, fontWeight: 700 }}>
            {brandStorageWarning}
          </div>
        )}
        {brandAssets.length === 0 ? (
          <div style={{ border: "1px dashed #CBD5E1", borderRadius: "10px", padding: "14px", color: "#64748B", fontSize: "12px", lineHeight: 1.5, textAlign: "center" }}>
            Import logos, images, or personal objects and enable "Save imported files to My Brand" to reuse them here.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
            {brandAssets.map((asset) => (
              <div key={asset.id} style={{ position: "relative", aspectRatio: "1", border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden", background: "#F8FAFC" }}>
                <button
                  type="button"
                  onClick={() => addImageToCanvas({ url: asset.url, name: asset.name })}
                  title={asset.name}
                  style={{ width: "100%", height: "100%", border: "none", padding: "6px", background: "transparent", cursor: "pointer" }}
                >
                  <img src={asset.thumbnailUrl || asset.url} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      try {
                        await deleteBrandAssetFromSupabase(asset);
                        setBrandAssets((prev) => prev.filter((item) => item.id !== asset.id));
                      } catch (error) {
                        console.error("Unable to delete My Brand asset:", error);
                        alert("This item could not be removed from My Brand. Try again.");
                      }
                    })();
                  }}
                  title="Remove from My Brand"
                  style={{ position: "absolute", top: "4px", right: "4px", width: "22px", height: "22px", borderRadius: "999px", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    ) : assetTab === "social" ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        {SOCIAL_MEDIA_ASSETS.map((asset) => (
          <div key={asset.name} style={{ border: "1px solid #E2E8F0", borderRadius: "10px", overflow: "hidden", background: "#FFFFFF", boxShadow: "0 4px 12px rgba(15,23,42,0.05)" }}>
            <button
              type="button"
              onClick={() => addImageToCanvas({ url: asset.src, name: `${asset.name} Icon` }, { width: 180, height: 180 })}
              title={`Add ${asset.name} icon`}
              aria-label={`Add ${asset.name} icon`}
              style={{ width: "100%", aspectRatio: "1", padding: "16px", border: "none", background: "#F8FAFC", cursor: "pointer" }}
            >
              <img src={asset.src} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            </button>
            <button
              type="button"
              onClick={() => addTextLayer({ text: asset.name, fontFamily: "Montserrat", fontSize: 48, color: asset.color, isBold: true, textAlign: "center" })}
              title={`Add ${asset.name} text`}
              style={{ width: "100%", minHeight: "34px", padding: "6px 4px", border: "none", borderTop: "1px solid #E2E8F0", background: "#FFFFFF", color: asset.color, fontSize: "10px", fontWeight: 800, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {asset.name}
            </button>
          </div>
        ))}
      </div>
    ) : assetTab === "gradients" ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        {PREMADE_GRADIENTS.map((gradient) => (
          <button
            key={gradient.name}
            type="button"
            onClick={() => addPremadeGradient(gradient)}
            title={gradient.name}
            aria-label={gradient.name}
            style={{
              aspectRatio: "1",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              background: getGradientFill({
                gradientType: gradient.type,
                gradientColor1: gradient.color1,
                gradientColor2: gradient.color2,
                gradientDirection: "direction" in gradient ? gradient.direction : undefined,
                gradientPosition: "position" in gradient ? gradient.position : undefined,
              }),
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
            }}
          />
        ))}
      </div>
    ) : assetTab === "grids" ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        {PREMADE_GRIDS.map((grid) => (
          <button
            key={grid.name}
            type="button"
            onClick={() => addPremadeShape(grid)}
            title={grid.name}
            style={{ aspectRatio: "1", padding: "10px", border: "1px solid #E2E8F0", borderRadius: "8px", background: "#F8FAFC", cursor: "pointer" }}
          >
            <span style={{ position: "relative", display: "block", width: "100%", height: "100%", overflow: "hidden", borderRadius: "4px", background: "#FFFFFF" }}>
              {getGridCells(grid.shapeType).map((cell, index) => (
                <span
                  key={index}
                  style={{
                    position: "absolute",
                    left: `${cell.x}%`,
                    top: `${cell.y}%`,
                    width: `${cell.width}%`,
                    height: `${cell.height}%`,
                    boxSizing: "border-box",
                    border: "2px solid #FFFFFF",
                    background: index % 2 === 0 ? "linear-gradient(180deg, #BAE6FD 0%, #E0F2FE 62%, #A3E635 63%, #65A30D 100%)" : "linear-gradient(180deg, #DBEAFE 0%, #EFF6FF 62%, #BEF264 63%, #84CC16 100%)",
                  }}
                />
              ))}
            </span>
          </button>
        ))}
      </div>
    ) : assetTab === "emojis" ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
        {PREMADE_EMOJIS.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => addEmojiLayer(item.emoji, item.name)}
            title={item.name}
            style={{
              aspectRatio: "1",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              background: "#FFFFFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
            }}
          >
            {item.emoji}
          </button>
        ))}
      </div>
    ) : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        {(assetTab === "frames" ? editorFrameAssets : editorShapeAssets).map((shape) => (
          <div
            key={shape.name}
            onClick={() => addPremadeShape(shape)}
            style={{
              aspectRatio: "1",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              background: "#F8FAFC",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={shape.name}
          >
            {shape.shapeType === "rectangle" && (
              <div style={{ width: "40px", height: "28px", background: shape.color }} />
            )}

            {shape.shapeType === "circle" && (
              <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: shape.color }} />
            )}

            {shape.shapeType === "triangle" && (
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "20px solid transparent",
                  borderRight: "20px solid transparent",
                  borderBottom: `40px solid ${shape.color}`,
                }}
              />
            )}

            {shape.shapeType === "star" && (
              <span style={{ fontSize: "42px", color: shape.color }}>★</span>
            )}

            {shape.shapeType === "badge" && (
              <div
                style={{
                  width: "54px",
                  height: "30px",
                  borderRadius: "999px",
                  background: shape.color,
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                NEW
              </div>
            )}

            {shape.shapeType === "speechBubble" && (
              <div
                style={{
                  width: "52px",
                  height: "34px",
                  borderRadius: "12px",
                  border: "3px solid #0F172A",
                  background: shape.color,
                }}
              />
            )}

            {shape.shapeType === "arrow" && (
              <span style={{ fontSize: "42px", color: shape.color }}>➜</span>
            )}

            {shape.shapeType === "line" && (
              <div style={{ width: "50px", height: "6px", borderRadius: "999px", background: shape.color }} />
            )}
            {shape.shapeType === "dashedLine" && (
  <div style={{ width: "50px", borderTop: `4px dashed ${shape.color}` }} />
)}

{shape.shapeType === "frame" && (
  <div style={{ width: "46px", height: "32px", border: `4px solid ${shape.color}` }} />
)}

{shape.shapeType === "roundedFrame" && (
  <div style={{ width: "46px", height: "32px", border: `4px solid ${shape.color}`, borderRadius: "10px" }} />
)}

{shape.shapeType === "circleFrame" && (
  <div style={{ width: "40px", height: "40px", border: `4px solid ${shape.color}`, borderRadius: "50%" }} />
)}

{shape.shapeType === "triangleFrame" && (
  <div
    style={{
      width: "46px",
      height: "42px",
      clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
      background: shape.color,
      padding: "5px",
      boxSizing: "border-box",
    }}
  >
    <div style={{ width: "100%", height: "100%", clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)", background: "linear-gradient(180deg, #BEEBFF 0%, #E9FAFF 62%, #98C93C 63%, #6E9F00 100%)" }} />
  </div>
)}

{isPaperFrame(shape.shapeType) && (
  <div
    style={{
      width: shape.shapeType === "paperPortraitFrame" ? "34px" : shape.shapeType === "paperSquareFrame" ? "40px" : "50px",
      height: shape.shapeType === "paperPortraitFrame" ? "48px" : shape.shapeType === "paperStripFrame" ? "28px" : "36px",
      background: shape.color,
      clipPath: getPaperFrameClipPath(shape.shapeType),
      padding: "5px",
      boxSizing: "border-box",
      filter: "drop-shadow(0 2px 2px rgba(15,23,42,0.18))",
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        clipPath: getPaperFrameClipPath(shape.shapeType),
        background: "linear-gradient(180deg, #BEEBFF 0%, #E9FAFF 60%, #98C93C 61%, #6E9F00 100%)",
      }}
    />
  </div>
)}

{isDeviceFrame(shape.shapeType) && (
  <div
    style={{
      width: shape.shapeType === "phoneFrame" ? "28px" : shape.shapeType === "laptopFrame" ? "54px" : "50px",
      height: shape.shapeType === "phoneFrame" ? "52px" : shape.shapeType === "laptopFrame" ? "38px" : "36px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        width: "100%",
        height: shape.shapeType === "laptopFrame" ? "82%" : "100%",
        border: shape.shapeType === "phoneFrame" ? "4px solid #111827" : "5px solid #111827",
        borderRadius: shape.shapeType === "phoneFrame" ? "12px" : "6px",
        background: "linear-gradient(180deg, #BEEBFF 0%, #E9FAFF 62%, #98C93C 63%, #6E9F00 100%)",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {shape.shapeType === "phoneFrame" && (
        <div style={{ position: "absolute", top: "-2px", left: "30%", right: "30%", height: "5px", borderRadius: "0 0 6px 6px", background: "#111827" }} />
      )}
    </div>
    {shape.shapeType === "laptopFrame" && (
      <div style={{ width: "115%", height: "6px", borderRadius: "0 0 10px 10px", background: "#111827", marginTop: "1px" }} />
    )}
  </div>
)}

{isCompositionFrame(shape.shapeType) && (
  <div
    style={{
      width: shape.shapeType === "vsDividerFrame" ? "26px" : "54px",
      height: shape.shapeType === "vsDividerFrame" ? "54px" : "34px",
      position: "relative",
      borderRadius: "8px",
      background: "#EFF6FF",
      border: "1px solid #CBD5E1",
      overflow: "hidden",
      boxSizing: "border-box",
    }}
  >
    {shape.shapeType === "vsDividerFrame" ? (
      <>
        <div style={{ position: "absolute", inset: "0 50% 0 0", background: "#BEEBFF" }} />
        <div style={{ position: "absolute", inset: "0 0 0 50%", background: "#FECACA" }} />
      </>
    ) : shape.shapeType === "splitScreenFrame" ? (
      <>
        <div style={{ position: "absolute", inset: "0 50% 0 0", background: "#BEEBFF" }} />
        <div style={{ position: "absolute", inset: "0 0 0 50%", background: "#FECACA" }} />
      </>
    ) : (
      <>
        <div style={{ position: "absolute", inset: 0, background: "#BEEBFF" }} />
        <div style={{ position: "absolute", inset: 0, background: "#FECACA", clipPath: "polygon(100% 0, 100% 100%, 26% 100%)" }} />
      </>
    )}
  </div>
)}
          </div>
        ))}
      </div>
    )}
  </div>
</div>
          {/* GALLERY */}
          {importedImages.length > 0 && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {importedImages.map((imgObj, idx) => (
                  <div key={idx} style={{ position: "relative", aspectRatio: "1", border: "1px solid #E2E8F0", borderRadius: "6px", overflow: "hidden", cursor: "pointer", background: "#F8FAFC" }} title={imgObj.name}>
                    <button type="button" onClick={() => addImageToCanvas(imgObj)} style={{ width: "100%", height: "100%", border: "none", padding: 0, background: "transparent", cursor: "pointer" }}>
                      <img src={imgObj.url} alt="imported" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        saveImportedImageToBrand(imgObj);
                      }}
                      style={{ position: "absolute", left: "4px", right: "4px", bottom: "4px", padding: "4px", borderRadius: "5px", border: "1px solid #BFDBFE", background: "rgba(239,246,255,0.95)", color: "#1D4ED8", fontSize: "10px", fontWeight: 800, cursor: "pointer" }}
                    >
                      Save
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LAYER MANAGEMENT */}
          <div style={{ flex: 1, marginTop: "10px" }}>
            <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: "8px" }}>Layers Manager</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {layers.slice().reverse().map((layer) => {
                const originalIndex = layers.findIndex(l => l.id === layer.id);
                return (
                  <div key={layer.id} onClick={() => { setSelectedLayerId(layer.id); setIsCropMode(false); }} style={{ padding: "8px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", border: selectedLayerId === layer.id ? "1px solid #8B5CF6" : "1px solid #E2E8F0", background: selectedLayerId === layer.id ? "#F5F3FF" : "#FFFFFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }} title={layer.name}>
                      {layer.type === "text" ? `🔤 ${layer.text}` : layer.type === "shape" ? `🔷 ${layer.name}` : `🖼️ ${layer.name}`}
                    </span>
                    <div style={{ display: "flex", gap: "2px" }}>
                      <button onClick={(e) => { e.stopPropagation(); moveLayerOrder(originalIndex, "up"); }} disabled={originalIndex === layers.length - 1} style={{ padding: "2px 4px", fontSize: "10px", cursor: "pointer" }} title="Bring Forward">🔼</button>
                      <button onClick={(e) => { e.stopPropagation(); moveLayerOrder(originalIndex, "down"); }} disabled={originalIndex === 0} style={{ padding: "2px 4px", fontSize: "10px", cursor: "pointer" }} title="Send Backward">🔽</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* CENTER WORKSPACE */}
        <section ref={centerWorkspaceRef} style={{ display: "flex", flexDirection: "column", justifyContent: isMobileLayout ? "flex-start" : "center", alignItems: "center", overflow: "auto", padding: isMobileLayout ? "14px 12px 92px" : "30px", background: "#F8FAFC", minWidth: 0, minHeight: 0, order: isMobileLayout ? 0 : 0 }}>
          {/* FLOATING ACTION BAR */}
          {selectedLayer && selectedLayer.type === "text" ? (
            <div style={{ position: isMobileLayout ? "static" : "fixed", top: isMobileLayout ? undefined : "78px", left: isMobileLayout ? undefined : "50%", transform: isMobileLayout ? undefined : "translateX(-50%)", zIndex: isMobileLayout ? undefined : 200, display: "flex", alignItems: "center", gap: "10px", background: "#FFFFFF", padding: "8px 10px", minHeight: "52px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(15,23,42,0.14)", border: "1px solid #E2E8F0", marginBottom: "12px", maxWidth: isMobileLayout ? "100%" : "calc(100vw - 56px)", overflowX: "auto", overscrollBehaviorX: "contain", touchAction: "pan-x", scrollbarWidth: "thin" }}>
              <select
                value={selectedLayer.fontFamily || "Inter"}
                onChange={(e) => {
                  ensureEditorFontLoaded(e.target.value);
                  updateSelectedLayer({ fontFamily: e.target.value });
                }}
                style={{ minWidth: "150px", border: "1px solid #CBD5E1", borderRadius: "10px", padding: "8px 10px", fontSize: "14px", fontWeight: 700, outline: "none", cursor: "pointer", background: "#FFFFFF" }}
                title="Font"
              >
                {FONT_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.fonts.map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <select
                value={selectedLayer.fontSize || 40}
                onChange={(e) => updateSelectedLayer({ fontSize: Number(e.target.value) })}
                title="Text size"
                style={{ flex: "0 0 auto", width: "76px", height: "36px", padding: "0 8px", border: "1px solid #CBD5E1", borderRadius: "8px", background: "#FFFFFF", color: "#0F172A", fontSize: "14px", fontWeight: 800, cursor: "pointer" }}
              >
                {!TEXT_SIZE_OPTIONS.includes(selectedLayer.fontSize || 40) && <option value={selectedLayer.fontSize || 40}>{selectedLayer.fontSize}</option>}
                {TEXT_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>

              <label title="Text color" style={{ width: "34px", height: "34px", borderRadius: "10px", border: "none", background: "#FFFFFF", cursor: "pointer", display: "grid", placeItems: "center", fontWeight: 900, position: "relative" }}>
                A
                <span style={{ position: "absolute", bottom: "4px", width: "22px", height: "4px", borderRadius: "99px", background: activeTextColor || selectedLayer.color || "#000000" }} />
                <input
                  type="color"
                  value={activeTextColor || normalizeColorToHex(selectedLayer.color) || "#000000"}
                  onMouseDown={() => {
                    const editableElement = getEditableTextElement(selectedLayer.id);
                    if (editableElement) rememberTextSelection(selectedLayer.id, editableElement);
                  }}
                  onTouchStart={() => {
                    const editableElement = getEditableTextElement(selectedLayer.id);
                    if (editableElement) rememberTextSelection(selectedLayer.id, editableElement);
                  }}
                  onChange={(e) => applyColorToSelectedText(e.target.value)}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                />
              </label>

              {[
                { label: "B", title: "Bold", active: selectedLayer.isBold, fields: { isBold: !selectedLayer.isBold }, style: { fontWeight: 900 } },
                { label: "I", title: "Italic", active: selectedLayer.isItalic, fields: { isItalic: !selectedLayer.isItalic }, style: { fontStyle: "italic" } },
                { label: "U", title: "Underline", active: selectedLayer.isUnderline, fields: { isUnderline: !selectedLayer.isUnderline }, style: { textDecoration: "underline" } },
                { label: "S", title: "Strikethrough", active: selectedLayer.isStrikethrough, fields: { isStrikethrough: !selectedLayer.isStrikethrough }, style: { textDecoration: "line-through" } },
                { label: "aA", title: "Uppercase", active: selectedLayer.isUppercase, fields: { isUppercase: !selectedLayer.isUppercase }, style: { fontWeight: 800, fontSize: "13px" } },
              ].map((control) => (
                <button key={control.title} type="button" title={control.title} onClick={() => updateSelectedLayer(control.fields as Partial<Layer>)} style={{ width: "34px", height: "34px", borderRadius: "10px", border: "none", background: control.active ? "#E0F2FE" : "#FFFFFF", color: "#111827", cursor: "pointer", fontSize: "17px", ...control.style }}>
                  {control.label}
                </button>
              ))}

              <div style={{ width: "1px", height: "24px", background: "#E2E8F0" }} />

              {[
                { label: "≡", value: "left", title: "Align left" },
                { label: "☰", value: "center", title: "Align center" },
                { label: "≣", value: "right", title: "Align right" },
                { label: "☷", value: "justify", title: "Justify" },
              ].map((align) => (
                <button key={align.value} type="button" title={align.title} onClick={() => updateSelectedLayer({ textAlign: align.value as Layer["textAlign"] })} style={{ width: "34px", height: "34px", borderRadius: "10px", border: "none", background: selectedLayer.textAlign === align.value ? "#E0F2FE" : "#FFFFFF", cursor: "pointer", fontSize: "18px" }}>
                  {align.label}
                </button>
              ))}

              <button
                type="button"
                title="Bullet list"
                onClick={() => {
                  const currentText = selectedLayer.text || "";
                  const hasBullets = currentText.split("\n").every((line) => line.trim().startsWith("•"));
                  updateSelectedLayer({
                    text: hasBullets
                      ? currentText.split("\n").map((line) => line.replace(/^•\s?/, "")).join("\n")
                      : currentText.split("\n").map((line) => `• ${line.replace(/^•\s?/, "")}`).join("\n"),
                    textHtml: undefined,
                  });
                }}
                style={{ height: "34px", minWidth: "34px", borderRadius: "10px", border: "none", background: (selectedLayer.text || "").trim().startsWith("•") ? "#E0F2FE" : "#FFFFFF", cursor: "pointer", fontSize: "18px" }}
              >
                •≡
              </button>

              <label title="Spacing" style={{ height: "34px", minWidth: "78px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "#FFFFFF", display: "flex", alignItems: "center", gap: "6px", padding: "0 8px", fontSize: "12px", fontWeight: 800, color: "#0F172A" }}>
                ↔
                <input type="range" min="-2" max="20" step="1" value={selectedLayer.letterSpacing || 0} onChange={(e) => updateSelectedLayer({ letterSpacing: Number(e.target.value) })} style={{ width: "48px" }} />
              </label>

              <label title="Transparency" style={{ width: "34px", height: "34px", borderRadius: "10px", border: "none", background: "#FFFFFF", cursor: "pointer", display: "grid", placeItems: "center", position: "relative" }}>
                ◩
                <input type="range" min="0" max="1" step="0.05" value={selectedLayer.opacity ?? 1} onChange={(e) => updateSelectedLayer({ opacity: Number(e.target.value) })} style={{ position: "absolute", width: "80px", opacity: 0, cursor: "pointer" }} />
              </label>

              <button type="button" onClick={() => updateSelectedLayer({ strokeWidth: selectedLayer.strokeWidth ? 0 : 4, strokeColor: selectedLayer.strokeColor || "#000000", shadowBlur: selectedLayer.shadowBlur ? 0 : 8, shadowColor: selectedLayer.shadowColor || "#000000", shadowOffsetX: selectedLayer.shadowBlur ? 0 : 4, shadowOffsetY: selectedLayer.shadowBlur ? 0 : 4 })} style={{ height: "34px", padding: "0 12px", borderRadius: "10px", border: "none", background: (selectedLayer.strokeWidth || selectedLayer.shadowBlur) ? "#E0F2FE" : "#FFFFFF", fontWeight: 800, cursor: "pointer" }}>
                Effects
              </button>

              <button type="button" onClick={() => updateSelectedLayer({ textAnimation: selectedLayer.textAnimation === "pop" ? "float" : selectedLayer.textAnimation === "float" ? "none" : "pop" })} style={{ height: "34px", padding: "0 12px", borderRadius: "10px", border: "none", background: selectedLayer.textAnimation && selectedLayer.textAnimation !== "none" ? "#E0F2FE" : "#FFFFFF", fontWeight: 800, cursor: "pointer" }}>
                Animate
              </button>

              <button
                type="button"
                onClick={() => {
                  const layerIndex = layers.findIndex((layer) => layer.id === selectedLayer.id);
                  if (layerIndex < 0) return;
                  const nextLayers = layers.filter((layer) => layer.id !== selectedLayer.id);
                  setLayers([...nextLayers, { ...selectedLayer, x: 50, y: 50 }]);
                }}
                style={{ height: "34px", padding: "0 12px", borderRadius: "10px", border: "none", background: "#FFFFFF", fontWeight: 800, cursor: "pointer" }}
              >
                Position
              </button>
            </div>
          ) : (
            <div style={{ height: "40px", marginBottom: "12px" }} />
          )}

          <div style={{ width: "100%", maxWidth: isMobileLayout ? "100%" : "820px", display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <button
              type="button"
              title="Undo"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              style={{ width: "38px", height: "34px", borderRadius: "10px", border: "1px solid #CBD5E1", background: undoStack.length === 0 ? "#F1F5F9" : "#FFFFFF", color: undoStack.length === 0 ? "#94A3B8" : "#2563EB", cursor: undoStack.length === 0 ? "not-allowed" : "pointer", fontSize: "20px", fontWeight: 800, display: "grid", placeItems: "center" }}
            >
              ↶
            </button>
            <button
              type="button"
              title="Redo"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              style={{ width: "38px", height: "34px", borderRadius: "10px", border: "1px solid #CBD5E1", background: redoStack.length === 0 ? "#F1F5F9" : "#FFFFFF", color: redoStack.length === 0 ? "#94A3B8" : "#2563EB", cursor: redoStack.length === 0 ? "not-allowed" : "pointer", fontSize: "20px", fontWeight: 800, display: "grid", placeItems: "center" }}
            >
              ↷
            </button>
            <button
              type="button"
              title="Paste image"
              onClick={handlePasteFromClipboard}
              style={{ height: "34px", padding: "0 12px", borderRadius: "10px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", cursor: "pointer", fontSize: "12px", fontWeight: 800 }}
            >
              Paste
            </button>
            <button
              type="button"
              title="Select top layer"
              onClick={handleSelectTopLayer}
              disabled={layers.length === 0}
              style={{ height: "34px", padding: "0 12px", borderRadius: "10px", border: "1px solid #CBD5E1", background: layers.length === 0 ? "#F1F5F9" : "#FFFFFF", color: layers.length === 0 ? "#94A3B8" : "#334155", cursor: layers.length === 0 ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 800 }}
            >
              Select
            </button>
            <button
              type="button"
              title="Delete selected layer"
              onClick={deleteLayer}
              disabled={!selectedLayer || selectedLayer.isLocked}
              style={{ height: "34px", padding: "0 12px", borderRadius: "10px", border: "1px solid #CBD5E1", background: !selectedLayer || selectedLayer.isLocked ? "#F1F5F9" : "#FFFFFF", color: !selectedLayer || selectedLayer.isLocked ? "#94A3B8" : "#0F172A", cursor: !selectedLayer || selectedLayer.isLocked ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 850 }}
            >
              Delete
            </button>
          </div>

          {/* CANVAS AREA */}
          <div
  ref={workspaceRef}
  onMouseDown={() => {
    setSelectedLayerId(null);
    setIsCropMode(false);
  }}
  onTouchStart={() => {
    setSelectedLayerId(null);
    setIsCropMode(false);
  }}
  style={{
    position: "relative",
    width: fittedCanvasDisplayWidth ? `${fittedCanvasDisplayWidth}px` : (isMobileLayout && mobileCanvasDisplayWidth ? `${mobileCanvasDisplayWidth}px` : "100%"),
    maxWidth: isMobileLayout ? "100%" : "820px",
    flexShrink: 0,
    aspectRatio: `${canvasWidth} / ${canvasHeight}`,
    backgroundColor: canvasBgColor,
    border: canvasStrokeWidth > 0 ? `${canvasStrokeWidth}px solid ${canvasStrokeColor}` : "none",
    borderRadius: "4px",
    boxSizing: "border-box",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    overflow: "hidden",
    transition: "width 180ms ease",
  }}
>
            {preview && (
              <img 
                src={preview} 
                alt="Bg" 
                crossOrigin="anonymous"
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "cover", 
                  pointerEvents: "none", 
                  position: "absolute", 
                  top: 0, 
                  left: 0,
                  opacity: backgroundOpacity,
                  filter: `blur(${backgroundBlur}px)`
                }} 
              />
            )}

            <div
              data-canvas-design-surface="true"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
                transform: `scale(${workspaceScale})`,
                transformOrigin: "top left",
              }}
            >
            {layers.map((layer, index) => {
              const isSelected = selectedLayerId === layer.id;
              
              const closeCreditsModal = () => {
  setShowCreditsModal(false);
};

const buyCredits = async (packageId: string) => {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    alert("Please login first.");
    return;
  }

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      packageId,
      userId: userData.user.id,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.url) {
    alert(data.error || "Could not start checkout.");
    return;
  }

  window.location.href = data.url;
};
              return (
                
                

                
                <div
                  
  key={layer.id}
  onMouseDown={(e) => {
    const { clientX, clientY } = getCoords(e);
    if (
      layer.type === "text" &&
      editingTextLayerId === layer.id &&
      (e.target as HTMLElement).closest('[contenteditable="true"]')
    ) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    setSelectedLayerId(layer.id);
    setIsCropMode(false);
    if (layer.isLocked) {
      setDraggingLayerId(null);
      return;
    }
    setDraggingLayerId(layer.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    initialDragOffset.current = {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  }}
  onTouchStart={(e) => {
    const { clientX, clientY } = getCoords(e);
    const now = Date.now();
    const isTextDoubleTap =
      layer.type === "text" &&
      lastTextTouchRef.current.layerId === layer.id &&
      now - lastTextTouchRef.current.time < 360;

    lastTextTouchRef.current = { layerId: layer.id, time: now };

    if (isTextDoubleTap) {
      e.preventDefault();
      e.stopPropagation();
      lastTextTouchRef.current = { layerId: null, time: 0 };
      beginTextEditing(layer.id, false);
      return;
    }

    if (
      layer.type === "text" &&
      editingTextLayerId === layer.id &&
      (e.target as HTMLElement).closest('[contenteditable="true"]')
    ) {
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setSelectedLayerId(layer.id);
    setIsCropMode(false);
    if (layer.isLocked) {
      setDraggingLayerId(null);
      return;
    }
    setDraggingLayerId(layer.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    initialDragOffset.current = {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  }}
  style={{
    position: "absolute",
    touchAction: layer.type === "text" && editingTextLayerId === layer.id ? "manipulation" : "none",
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    transform: `translate(-50%, -50%) rotate(${layer.angle || 0}deg) ${layer.isFlippedH ? "scaleX(-1)" : "scaleX(1)"} ${layer.isFlippedV ? "scaleY(-1)" : "scaleY(1)"}`,
                    userSelect: "none",
                    cursor: layer.isLocked ? "not-allowed" : isCropMode ? "default" : (draggingLayerId === layer.id ? "grabbing" : "move"),
                    padding: "4px",
                    outline: !isExporting && isSelected
                      ? (isCropMode
                        ? `${2 / workspaceScale}px dashed #000`
                        : `${2 / workspaceScale}px solid #3B82F6`)
                      : "none",
                    zIndex: !isExporting && isSelected ? 100 : index + 10, 
                    display: "flex",
                    whiteSpace: layer.type === "text" ? "pre-wrap" : "nowrap",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: layer.opacity !== undefined ? layer.opacity : 1,
                  }}
                >
                  {/* TEXT */}
                  {/* TEXT / SHAPE / IMAGE */}
{layer.type === "text" ? (
  <div
    contentEditable={!isExporting && editingTextLayerId === layer.id}
    suppressContentEditableWarning
    onDoubleClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      beginTextEditing(layer.id, false);
    }}
    onClick={(e) => {
      e.stopPropagation();
      setSelectedLayerId(layer.id);
    }}
    onMouseDown={(e) => {
      if (editingTextLayerId === layer.id) {
        e.stopPropagation();
      }
    }}
    onBlur={(e) => {
      const draft = textEditDraftRef.current?.layerId === layer.id ? textEditDraftRef.current : null;
      const text = draft?.text ?? e.currentTarget.innerText;
      const textHtml = draft?.textHtml ?? stripSelectionPreviewHtml(e.currentTarget.innerHTML);
      setLayers((currentLayers) => currentLayers.map((currentLayer) => (
        currentLayer.id === layer.id ? { ...currentLayer, text, textHtml } : currentLayer
      )));
      if (textEditDraftRef.current?.layerId === layer.id) textEditDraftRef.current = null;
      setEditingTextLayerId((currentId) => currentId === layer.id ? null : currentId);
      setTextSelectionPreview(null);
    }}
    onInput={(e) => {
      const text = e.currentTarget.innerText;
      const textHtml = stripSelectionPreviewHtml(e.currentTarget.innerHTML);
      textEditDraftRef.current = {
        layerId: layer.id,
        text,
        textHtml,
      };
      setLayers((currentLayers) => currentLayers.map((currentLayer) => (
        currentLayer.id === layer.id ? { ...currentLayer, text, textHtml } : currentLayer
      )));
    }}
    onMouseUp={(e) => {
      rememberTextSelection(layer.id, e.currentTarget as HTMLElement);
    }}
    onTouchEnd={(e) => {
      if (editingTextLayerId === layer.id) {
        e.stopPropagation();
        rememberTextSelection(layer.id, e.currentTarget as HTMLElement);
      }
    }}
    onKeyUp={(e) => {
      rememberTextSelection(layer.id, e.currentTarget as HTMLElement);
    }}
    onKeyDown={(e) => {
      if (e.key === "Escape") {
        (e.currentTarget as HTMLElement).blur();
      }
      e.stopPropagation();
    }}
    style={{
      width: layer.width ? `${layer.width}px` : "max-content",
      maxWidth: `${canvasWidth}px`,
      minWidth: "24px",
      boxSizing: "border-box",
      display: "inline-block",
      fontSize: `${layer.fontSize}px`,
      color: layer.color,
      fontFamily: `${layer.fontFamily || "Inter"}, Inter, Arial, sans-serif`,
      textAlign: layer.textAlign || "center",
      fontWeight: layer.isBold ? "bold" : "900",
      fontStyle: layer.isItalic ? "italic" : "normal",
      textDecoration: `${layer.isUnderline ? "underline" : ""} ${layer.isStrikethrough ? "line-through" : ""}`.trim() || "none",
      textTransform: layer.isUppercase ? "uppercase" : "none",
      background: layer.hasTextBg ? layer.textBgColor || "#000000" : "transparent",
      padding: layer.hasTextBg ? `${layer.textBgPadding || 6}px ${Math.max(8, (layer.textBgPadding || 6) * 2)}px` : "0px",
      borderRadius: `${layer.borderRadius || 4}px`,
      whiteSpace: layer.width ? "pre-wrap" : "pre",
      overflowWrap: layer.width ? "break-word" : "normal",
      wordBreak: "normal",
      lineHeight: layer.lineHeight || 1,
      letterSpacing: `${layer.letterSpacing || 0}px`,
      cursor: editingTextLayerId === layer.id ? "text" : "move",
      userSelect: editingTextLayerId === layer.id ? "text" : "none",
      WebkitUserSelect: editingTextLayerId === layer.id ? "text" : "none",
      outline: editingTextLayerId === layer.id ? "1px dashed rgba(37, 99, 235, 0.55)" : "none",
      animation: !isExporting && layer.textAnimation === "pop" ? "pixoresTextPop 1.4s ease-in-out infinite" : !isExporting && layer.textAnimation === "float" ? "pixoresTextFloat 1.8s ease-in-out infinite" : "none",
      ...getEfectosEstilo(layer),
    }}
    data-layer-text-id={String(layer.id)}
    {...(editingTextLayerId === layer.id
      ? {}
      : { dangerouslySetInnerHTML: { __html: getTextLayerHtml(layer) } })}
  >
  </div>
) : layer.type === "shape" ? (
  layer.shapeType === "rectangle" ? (
    <div style={{ width: `${layer.width}px`, height: `${layer.height}px`, background: getLayerFill(layer), borderRadius: `${layer.borderRadius || 8}px` }} />
  ) : layer.shapeType === "circle" ? (
    <div style={{ width: `${layer.width}px`, height: `${layer.width}px`, background: getLayerFill(layer), borderRadius: "50%" }} />
  ) : layer.shapeType === "triangle" ? (
  <div
    style={{
      width: 0,
      height: 0,
      borderLeft: `${(layer.width || 100) / 2}px solid transparent`,
      borderRight: `${(layer.width || 100) / 2}px solid transparent`,
      borderBottom: `${layer.height}px solid ${layer.useGradient ? layer.gradientColor1 || layer.color : layer.color}`,
    }}
  />
) : layer.shapeType === "star" ? (
    <div style={{ fontSize: `${layer.width || 120}px`, color: layer.color, lineHeight: 1 }}>★</div>
  ) : layer.shapeType === "badge" ? (
    <div style={{ width: `${layer.width}px`, height: `${layer.height}px`, background: getLayerFill(layer), color: "#fff", borderRadius: `${layer.borderRadius ?? 999}px`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
      NEW
    </div>
  ) : layer.shapeType === "speechBubble" ? (
    <div style={{ width: `${layer.width}px`, minHeight: `${layer.height}px`, background: getLayerFill(layer), borderRadius: `${layer.borderRadius || 18}px`, border: "3px solid #0F172A", position: "relative" }}>
      <div style={{ position: "absolute", bottom: "-18px", left: "35px", width: 0, height: 0, borderTop: `18px solid ${layer.color}`, borderRight: "18px solid transparent" }} />
    </div>
    ) : layer.shapeType === "dashedLine" ? (
  <div
    style={{
      width: `${layer.width}px`,
      height: "0px",
      borderTop: `6px dashed ${layer.color}`,
    }}
  />
) : layer.shapeType === "frame" ? (
  <div
    style={{
      width: `${layer.width}px`,
      height: `${layer.height}px`,
      border: `${layer.strokeWidth ?? 8}px solid ${
        layer.strokeColor || layer.color || "#3B82F6"
      }`,
      overflow: "hidden",
      borderRadius: `${layer.borderRadius || 0}px`,
      position: "relative",
      background: layer.frameImageSrc
        ? "transparent"
        : "repeating-linear-gradient(45deg, #F8FAFC 0 10px, #E2E8F0 10px 20px)",
      boxShadow: !layer.frameImageSrc ? "inset 0 0 0 2px #94A3B8" : "none",
    }}
  >
    {layer.frameImageSrc && (
      <img
        src={layer.frameImageSrc}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: layer.frameImageFit || "cover",
          objectPosition: getFrameImagePosition(layer),
          transform: getFrameImageTransform(layer),
          transformOrigin: "center",
          display: "block",
        }}
      />
    )}
  </div>

) : layer.shapeType === "roundedFrame" ? (
  <div
    style={{
      width: `${layer.width}px`,
      height: `${layer.height}px`,
      border: `${layer.strokeWidth ?? 8}px solid ${
  layer.strokeColor || layer.color || "#3B82F6"
}`,
      borderRadius: `${layer.borderRadius || 24}px`,
      overflow: "hidden",
      position: "relative",
      background: layer.frameImageSrc
        ? "transparent"
        : "repeating-linear-gradient(45deg, #F8FAFC 0 10px, #E2E8F0 10px 20px)",
      boxShadow: !layer.frameImageSrc ? "inset 0 0 0 2px #94A3B8" : "none",
    }}
  >
    {layer.frameImageSrc && (
      <img
        src={layer.frameImageSrc}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: layer.frameImageFit || "cover",
          objectPosition: getFrameImagePosition(layer),
          transform: getFrameImageTransform(layer),
          transformOrigin: "center",
          display: "block",
        }}
      />
    )}
  </div>

) : layer.shapeType === "circleFrame" ? (
  <div
    style={{
      width: `${layer.width}px`,
      height: `${layer.width}px`,
      border: `${layer.strokeWidth ?? 8}px solid ${layer.strokeColor || layer.color || "#FACC15"}`,
      borderRadius: "50%",
      overflow: "hidden",
      position: "relative",
      background: layer.frameImageSrc
        ? "transparent"
        : "repeating-linear-gradient(45deg, #F8FAFC 0 10px, #E2E8F0 10px 20px)",
      boxShadow: !layer.frameImageSrc ? "inset 0 0 0 2px #94A3B8" : "none",
    }}
  >
    {layer.frameImageSrc && (
      <img
        src={layer.frameImageSrc}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: layer.frameImageFit || "cover",
          objectPosition: getFrameImagePosition(layer),
          transform: getFrameImageTransform(layer),
          transformOrigin: "center",
          display: "block",
        }}
      />
    )}
  </div>
  ) : layer.shapeType === "triangleFrame" ? (
  <div
    style={{
      width: `${layer.width}px`,
      height: `${layer.height}px`,
      clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
      background: layer.strokeColor || layer.color || "#22C55E",
      padding: `${layer.strokeWidth ?? 8}px`,
      boxSizing: "border-box",
      position: "relative",
      filter: "drop-shadow(0 6px 10px rgba(15,23,42,0.15))",
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
        overflow: "hidden",
        background: layer.frameImageSrc ? "transparent" : getFramePlaceholderBackground(layer),
      }}
    >
      {layer.frameImageSrc && (
        <img
          src={layer.frameImageSrc}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: layer.frameImageFit || "cover",
            objectPosition: getFrameImagePosition(layer),
            transform: getFrameImageTransform(layer),
            transformOrigin: "center",
            display: "block",
          }}
        />
      )}
    </div>
  </div>
  ) : isDeviceFrame(layer.shapeType) ? (
  <div
    style={{
      width: `${layer.width}px`,
      height: `${layer.height}px`,
      position: "relative",
      filter: "drop-shadow(0 8px 12px rgba(15,23,42,0.22))",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}
  >
    <div
      style={{
        width: "100%",
        height: layer.shapeType === "laptopFrame" ? "84%" : "100%",
        background: layer.strokeColor || layer.color || "#111827",
        borderRadius: layer.shapeType === "phoneFrame" ? "24px" : layer.shapeType === "tabletFrame" ? "16px" : "10px 10px 2px 2px",
        padding: `${layer.strokeWidth ?? 10}px`,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {layer.shapeType === "phoneFrame" && (
        <>
          <div style={{ position: "absolute", top: "7px", left: "33%", right: "33%", height: "9px", borderRadius: "0 0 8px 8px", background: "#020617", zIndex: 2 }} />
          <div style={{ position: "absolute", top: "9px", right: "38%", width: "4px", height: "4px", borderRadius: "50%", background: "#64748B", zIndex: 3 }} />
        </>
      )}

      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: layer.shapeType === "phoneFrame" ? "16px" : layer.shapeType === "tabletFrame" ? "8px" : "2px",
          overflow: "hidden",
          background: layer.frameImageSrc ? "transparent" : getFramePlaceholderBackground(layer),
          position: "relative",
        }}
      >
        {layer.frameImageSrc ? (
          <img
            src={layer.frameImageSrc}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: layer.frameImageFit || "cover",
              objectPosition: getFrameImagePosition(layer),
              transform: getFrameImageTransform(layer),
              transformOrigin: "center",
              display: "block",
            }}
          />
        ) : (
          <>
            <div style={{ position: "absolute", top: "18%", left: "30%", width: "22%", height: "12%", borderRadius: "999px", background: "#FFFFFF" }} />
            <div style={{ position: "absolute", top: "14%", left: "38%", width: "14%", height: "14%", borderRadius: "50%", background: "#FFFFFF" }} />
            <div style={{ position: "absolute", top: "20%", left: "45%", width: "18%", height: "10%", borderRadius: "999px", background: "#FFFFFF" }} />
          </>
        )}
      </div>
    </div>

    {layer.shapeType === "laptopFrame" && (
      <>
        <div style={{ width: "112%", height: "10px", borderRadius: "0 0 16px 16px", background: layer.strokeColor || layer.color || "#111827", position: "relative" }}>
          <div style={{ position: "absolute", left: "43%", right: "43%", top: 0, height: "4px", borderRadius: "0 0 8px 8px", background: "#CBD5E1" }} />
        </div>
        <div style={{ width: "126%", height: "8px", borderRadius: "999px", background: "#D1D5DB", marginTop: "1px" }} />
      </>
    )}
  </div>
  ) : isPaperFrame(layer.shapeType) ? (
  <div
    style={{
      width: `${layer.width}px`,
      height: `${layer.height}px`,
      clipPath: getPaperFrameClipPath(layer.shapeType),
      background: layer.strokeColor || layer.color || "#F8F1E8",
      padding: `${layer.strokeWidth ?? 14}px`,
      boxSizing: "border-box",
      filter: "drop-shadow(0 6px 10px rgba(15,23,42,0.18))",
      position: "relative",
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        clipPath: getPaperFrameClipPath(layer.shapeType),
        overflow: "hidden",
        position: "relative",
        background: layer.frameImageSrc ? "transparent" : getFramePlaceholderBackground(layer),
        boxShadow: !layer.frameImageSrc ? "inset 0 0 0 2px rgba(148,163,184,0.45)" : "none",
      }}
    >
      {layer.frameImageSrc ? (
        <img
          src={layer.frameImageSrc}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: layer.frameImageFit || "cover",
            objectPosition: getFrameImagePosition(layer),
            transform: getFrameImageTransform(layer),
            transformOrigin: "center",
            display: "block",
          }}
        />
      ) : (
        <>
          <div style={{ position: "absolute", top: "18%", left: "30%", width: "22%", height: "12%", borderRadius: "999px", background: "#FFFFFF" }} />
          <div style={{ position: "absolute", top: "14%", left: "38%", width: "14%", height: "14%", borderRadius: "50%", background: "#FFFFFF" }} />
          <div style={{ position: "absolute", top: "20%", left: "45%", width: "18%", height: "10%", borderRadius: "999px", background: "#FFFFFF" }} />
        </>
      )}
    </div>
  </div>
  ) : isGridFrame(layer.shapeType) ? (
  <div
    style={{
      width: `${layer.width}px`,
      height: `${layer.height}px`,
      position: "relative",
      overflow: "hidden",
      borderRadius: `${layer.borderRadius || 0}px`,
      background: "#FFFFFF",
      boxSizing: "border-box",
    }}
  >
    {getGridCells(layer.shapeType).map((cell, index) => {
      const image = layer.gridImages?.[index];
      const gap = layer.gridGap ?? 4;
      return (
        <div
          key={index}
          onClick={() => {
            setLayers((currentLayers) => currentLayers.map((currentLayer) => currentLayer.id === layer.id ? { ...currentLayer, activeGridCell: index } : currentLayer));
          }}
          style={{
            position: "absolute",
            left: `calc(${cell.x}% + ${gap / 2}px)`,
            top: `calc(${cell.y}% + ${gap / 2}px)`,
            width: `calc(${cell.width}% - ${gap}px)`,
            height: `calc(${cell.height}% - ${gap}px)`,
            overflow: "hidden",
            background: image?.src ? "transparent" : index % 2 === 0 ? "linear-gradient(180deg, #BAE6FD 0%, #E0F2FE 62%, #A3E635 63%, #65A30D 100%)" : "linear-gradient(180deg, #DBEAFE 0%, #EFF6FF 62%, #BEF264 63%, #84CC16 100%)",
            boxShadow: selectedLayerId === layer.id && (layer.activeGridCell ?? 0) === index ? "inset 0 0 0 3px #2563EB" : "none",
            boxSizing: "border-box",
          }}
        >
          {image?.src && (
            <img
              src={image.src}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: image.fit || "cover",
                objectPosition: `${image.x ?? 50}% ${image.y ?? 50}%`,
                transform: `scale(${image.flipH ? -(image.scale ?? 1) : image.scale ?? 1}, ${image.flipV ? -(image.scale ?? 1) : image.scale ?? 1})`,
                transformOrigin: "center",
                display: "block",
              }}
            />
          )}
        </div>
      );
    })}
  </div>
  ) : isCompositionFrame(layer.shapeType) ? (
  <div
    style={{
      width: `${layer.width}px`,
      height: `${layer.height}px`,
      position: "relative",
      overflow: "hidden",
      borderRadius: `${layer.borderRadius || 14}px`,
      border: isCompositionFrame(layer.shapeType) ? "none" : `${Math.max(2, layer.strokeWidth || 6)}px solid ${layer.strokeColor || layer.color || "#FACC15"}`,
      background: "#EFF6FF",
      boxSizing: "border-box",
      filter: (layer.shadowBlur || 0) > 0 ? `drop-shadow(${layer.shadowOffsetX || 0}px ${layer.shadowOffsetY || 0}px ${layer.shadowBlur}px ${layer.shadowColor || "#000000"})` : "none",
    }}
  >
    {layer.shapeType === "vsDividerFrame" || layer.shapeType === "splitScreenFrame" ? (
      <>
        <div style={{ position: "absolute", inset: "0 50% 0 0", background: "linear-gradient(180deg, #BAE6FD 0%, #E0F2FE 62%, #A3E635 63%, #65A30D 100%)", zIndex: 0, overflow: "hidden" }}>
          {layer.frameImageSrc && (
            <img src={layer.frameImageSrc} alt="" style={{ width: "100%", height: "100%", objectFit: layer.frameImageFit || "cover", objectPosition: getFrameImagePosition(layer), transform: getFrameImageTransform(layer), transformOrigin: "center", display: "block" }} />
          )}
        </div>
        <div style={{ position: "absolute", inset: "0 0 0 50%", background: "linear-gradient(180deg, #FECACA 0%, #FFE4E6 62%, #FDBA74 63%, #EA580C 100%)", zIndex: 0, overflow: "hidden" }}>
          {layer.frameImageSrc2 && (
            <img src={layer.frameImageSrc2} alt="" style={{ width: "100%", height: "100%", objectFit: layer.frameImageFit || "cover", objectPosition: getFrameImagePosition(layer, 2), transform: getFrameImageTransform(layer, 2), transformOrigin: "center", display: "block" }} />
          )}
        </div>
      </>
    ) : (
      <>
        <div style={{ position: "absolute", inset: 0, clipPath: "polygon(0 0, 78% 0, 22% 100%, 0 100%)", background: "linear-gradient(180deg, #BAE6FD 0%, #E0F2FE 62%, #A3E635 63%, #65A30D 100%)", zIndex: 0, overflow: "hidden" }}>
          {layer.frameImageSrc && (
            <img src={layer.frameImageSrc} alt="" style={{ width: "100%", height: "100%", objectFit: layer.frameImageFit || "cover", objectPosition: getFrameImagePosition(layer), transform: getFrameImageTransform(layer), transformOrigin: "center", display: "block" }} />
          )}
        </div>
        <div style={{ position: "absolute", inset: 0, clipPath: "polygon(78% 0, 100% 0, 100% 100%, 22% 100%)", background: "linear-gradient(180deg, #FECACA 0%, #FFE4E6 62%, #FDBA74 63%, #EA580C 100%)", zIndex: 0, overflow: "hidden" }}>
          {layer.frameImageSrc2 && (
            <img src={layer.frameImageSrc2} alt="" style={{ width: "100%", height: "100%", objectFit: layer.frameImageFit || "cover", objectPosition: getFrameImagePosition(layer, 2), transform: getFrameImageTransform(layer, 2), transformOrigin: "center", display: "block" }} />
          )}
        </div>
        {!layer.frameImageSrc2 && (
          <div style={{ position: "absolute", inset: 0, clipPath: "polygon(78% 0, 100% 0, 100% 100%, 22% 100%)", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.45)", zIndex: 1, pointerEvents: "none" }} />
        )}
      </>
    )}
  </div>
  ) : layer.shapeType === "arrow" ? (
    <div style={{ fontSize: `${layer.width || 120}px`, color: layer.color, lineHeight: 1 }}>➜</div>
  ) : (
    <div style={{ width: `${layer.width}px`, height: "8px", background: getLayerFill(layer), borderRadius: `${layer.borderRadius ?? 999}px` }} />
  )
) : (
  <img
    src={layer.src}
    alt="layer"
    crossOrigin="anonymous"
    style={{
      width: `${layer.width}px`,
      height: `${layer.height}px`,
      minWidth: `${layer.width}px`,
      minHeight: `${layer.height}px`,
      display: "block",
      pointerEvents: "none",
      borderRadius: `${layer.borderRadius || 0}px`,
      mixBlendMode: layer.blendMode || "normal",
      clipPath: getCropClipPath(layer),
      filter: `
        blur(${layer.blur || 0}px)
        ${getImageStrokeFilter(layer)}
        ${(layer.glowRadius || 0) > 0 ? `drop-shadow(0 0 ${layer.glowRadius}px ${layer.glowColor})` : ""}
        ${(layer.shadowBlur || 0) > 0 ? `drop-shadow(${layer.shadowOffsetX}px ${layer.shadowOffsetY}px ${layer.shadowBlur}px ${layer.shadowColor})` : ""}
      `,
    }}
  />
)}

                 {/* TRANSFORM ANCHORS (CORNER HANDLERS) */}
{!isExporting && isSelected && !layer.isLocked && (
  <>
    {[
      { corner: "topLeft", cursor: "nwse-resize" },
      { corner: "topRight", cursor: "nesw-resize" },
      { corner: "bottomLeft", cursor: "nesw-resize" },
      { corner: "bottomRight", cursor: "nwse-resize" }
    ].map((item) => (
      <div
        key={item.corner}
        onMouseDown={(e) => startResizing(e, layer, item.corner as any)}
        onTouchStart={(e) => {
          e.preventDefault(); // Evita que se dispare el evento de ratón después
          e.stopPropagation();
          startResizing(e, layer, item.corner as any);
        }}
        style={{
          position: "absolute",
          width: isCropMode ? "14px" : "10px",
          height: isCropMode ? "14px" : "10px",
          background: isCropMode ? "#000" : "#FFF",
          border: isCropMode ? "none" : "2px solid #3B82F6",
          borderRadius: isCropMode ? "0%" : "50%",
          cursor: item.cursor,
          zIndex: 15,
          touchAction: "none", // ¡CRUCIAL PARA TÁCTIL!
          transform: `scale(${1 / workspaceScale})`,
          transformOrigin: "center",
          ...(item.corner === "topLeft" ? { top: `${-5 / workspaceScale}px`, left: `${-5 / workspaceScale}px` } : {}),
          ...(item.corner === "topRight" ? { top: `${-5 / workspaceScale}px`, right: `${-5 / workspaceScale}px` } : {}),
          ...(item.corner === "bottomLeft" ? { bottom: `${-5 / workspaceScale}px`, left: `${-5 / workspaceScale}px` } : {}),
          ...(item.corner === "bottomRight" ? { bottom: `${-5 / workspaceScale}px`, right: `${-5 / workspaceScale}px` } : {})
        }}
      />
    ))}

    {/* ROTATION ANCHOR WHEEL */}
    {!isCropMode && (
      <div 
        onMouseDown={(e) => startResizing(e, layer, "rotation")}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startResizing(e, layer, "rotation");
        }}
        style={{
          position: "absolute",
          bottom: `${-30 / workspaceScale}px`,
          left: "50%",
          transform: `translateX(-50%) scale(${1 / workspaceScale})`,
          transformOrigin: "top center",
          width: "24px",
          height: "24px",
          background: "#FFFFFF",
          border: "1px solid #CBD5E1",
          borderRadius: "50%",
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          zIndex: 20,
          touchAction: "none"
        }}
      >
        🔄
      </div>
    )}
  </>
)}
{!isExporting && isSelected && layer.isLocked && (
  <div
    style={{
      position: "absolute",
      top: `${-12 / workspaceScale}px`,
      right: `${-12 / workspaceScale}px`,
      width: "24px",
      height: "24px",
      borderRadius: "999px",
      background: "#111827",
      color: "#FFFFFF",
      display: "grid",
      placeItems: "center",
      fontSize: "13px",
      border: "2px solid #FFFFFF",
      boxShadow: "0 4px 10px rgba(15,23,42,0.24)",
      pointerEvents: "none",
      zIndex: 25,
      transform: `scale(${1 / workspaceScale})`,
      transformOrigin: "center",
    }}
  >
    🔒
  </div>
)}
                </div>
              );
            })}
            </div>
          </div>
        </section>

        {/* RIGHT PROPERTY EDIT PANEL */}
        <aside style={{ background: "#FFFFFF", borderLeft: isMobileLayout ? "none" : "1px solid #E2E8F0", borderTop: isMobileLayout ? "1px solid #E2E8F0" : "none", padding: isMobileLayout ? "16px" : "20px", overflowY: "auto", display: isMobileLayout ? (mobilePanel === "edit" ? "flex" : "none") : "flex", flexDirection: "column", gap: "14px", minWidth: 0, order: isMobileLayout ? 3 : 0, position: isMobileLayout ? "absolute" : "static", left: isMobileLayout ? 8 : undefined, right: isMobileLayout ? 8 : undefined, bottom: isMobileLayout ? "84px" : undefined, maxHeight: isMobileLayout ? "40dvh" : undefined, zIndex: isMobileLayout ? 2147483646 : undefined, borderRadius: isMobileLayout ? "16px" : undefined, boxShadow: isMobileLayout ? "0 -14px 40px rgba(15, 23, 42, 0.2)" : undefined, touchAction: isMobileLayout ? "pan-y" : undefined, WebkitOverflowScrolling: isMobileLayout ? "touch" : undefined, overscrollBehavior: isMobileLayout ? "contain" : undefined }}>
          {isMobileLayout && (
            <div style={{ position: "sticky", top: "-16px", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", margin: "-10px 0 0", padding: "10px 0", background: "#FFFFFF" }}>
              <strong style={{ fontSize: "14px", color: "#0F172A" }}>Edit</strong>
              <button type="button" onClick={() => setMobilePanel(null)} style={{ width: "34px", height: "34px", borderRadius: "999px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#0F172A", fontSize: "18px", lineHeight: 1, cursor: "pointer" }}>x</button>
            </div>
          )}
          
          {/* CANVAS BACKGROUND IMAGE ADJUSTMENTS */}
          {preview && (
            <div style={{ background: "#F0FDF4", padding: "12px", borderRadius: "8px", border: "1px solid #BBF7D0", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Background Filters</span>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 600, color: "#14532D" }}>
                  <span>Opacity</span>
                  <span>{Math.round(backgroundOpacity * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={backgroundOpacity} onChange={(e) => setBackgroundOpacity(Number(e.target.value))} style={{ width: "100%", accentColor: "#16A34A" }} />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 600, color: "#14532D" }}>
                  <span>Blur effect</span>
                  <span>{backgroundBlur}px</span>
                </div>
                <input type="range" min="0" max="25" step="1" value={backgroundBlur} onChange={(e) => setBackgroundBlur(Number(e.target.value))} style={{ width: "100%", accentColor: "#16A34A" }} />
              </div>
            </div>
          )}

          <h2 style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginTop: 0 }}>Professional Adjustments</h2>

          {selectedLayer ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => duplicateLayer()} style={{ flex: 1, padding: "6px", background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: "6px", fontSize: "11px", fontWeight: 600 }}>📋 Duplicate</button>
                <button onClick={() => deleteLayer()} style={{ padding: "6px 10px", background: "#FFFFFF", color: "#0F172A", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Delete</button>
              </div>

              <button
                type="button"
                onClick={() => updateSelectedLayer({ isLocked: !selectedLayer.isLocked })}
                style={{
                  width: "100%",
                  padding: "9px",
                  background: selectedLayer.isLocked ? "#111827" : "#F8FAFC",
                  color: selectedLayer.isLocked ? "#FFFFFF" : "#334155",
                  border: selectedLayer.isLocked ? "1px solid #111827" : "1px solid #CBD5E1",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {selectedLayer.isLocked ? "Unlock Layer" : "Lock Layer"}
              </button>

              <hr style={{ border: "none", borderTop: "1px solid #F1F5F9" }} />

              <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "8px" }}>Flip Element</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => updateSelectedLayer({ isFlippedH: !selectedLayer.isFlippedH })}
                    style={{
                      padding: "8px",
                      background: selectedLayer.isFlippedH ? "#DBEAFE" : "#FFFFFF",
                      color: selectedLayer.isFlippedH ? "#1D4ED8" : "#334155",
                      border: selectedLayer.isFlippedH ? "1px solid #60A5FA" : "1px solid #CBD5E1",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    Flip H
                  </button>

                  <button
                    type="button"
                    onClick={() => updateSelectedLayer({ isFlippedV: !selectedLayer.isFlippedV })}
                    style={{
                      padding: "8px",
                      background: selectedLayer.isFlippedV ? "#DBEAFE" : "#FFFFFF",
                      color: selectedLayer.isFlippedV ? "#1D4ED8" : "#334155",
                      border: selectedLayer.isFlippedV ? "1px solid #60A5FA" : "1px solid #CBD5E1",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    Flip V
                  </button>
                </div>
              </div>

              {/* CROP CROP TOOL */}
              {selectedLayer.type === "image" && (
                <button
  onClick={() => {
    if (isCropMode) {
      applyCropToSelectedImage();
    } else {
      setIsCropMode(true);
    }
  }}
  style={{ width: "100%", padding: "8px", background: isCropMode ? "#0F172A" : "#F1F5F9", color: isCropMode ? "#FFF" : "#0F172A", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
>
  {isCropMode ? "✅ Apply Changes" : "✂️ Crop Image"}
</button>
              )}

              {/* PIXEL DIMENSIONS INPUT */}
              {(selectedLayer.type === "image" || selectedLayer.type === "shape" || selectedLayer.type === "text") && (
                <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "6px" }}>Exact Dimensions (px)</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "10px", color: "#64748B" }}>Width</label>
                      <input type="number" value={selectedLayer.width || 0} onChange={(e) => updateSelectedLayer({ width: Math.max(10, Number(e.target.value)) })} style={{ width: "100%", padding: "4px", fontSize: "12px", border: "1px solid #CBD5E1", borderRadius: "4px" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "10px", color: "#64748B" }}>Height</label>
                      <input type="number" value={selectedLayer.height || 0} disabled={selectedLayer.type === "text"} onChange={(e) => updateSelectedLayer({ height: Math.max(10, Number(e.target.value)) })} style={{ width: "100%", padding: "4px", fontSize: "12px", border: "1px solid #CBD5E1", borderRadius: "4px", background: selectedLayer.type === "text" ? "#E2E8F0" : "#FFFFFF" }} />
                    </div>
                  </div>
                  {selectedLayer.type === "text" && (
                    <button type="button" onClick={() => updateSelectedLayer({ width: undefined })} style={{ marginTop: "8px", width: "100%", padding: "7px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                      Auto width / single line
                    </button>
                  )}
                  <div style={{ marginTop: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748B", marginBottom: "4px" }}>
                      <span>Round corners</span>
                      <span>{selectedLayer.borderRadius || 0}px</span>
                    </div>
                    <input type="range" min="0" max="160" step="1" value={selectedLayer.borderRadius || 0} onChange={(e) => updateSelectedLayer({ borderRadius: Number(e.target.value) })} style={{ width: "100%" }} />
                  </div>
                </div>
              )}

              {/* ANGLE ROTATION SLIDER */}
              <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Rotation Angle</label>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#8B5CF6" }}>{selectedLayer.angle || 0}°</span>
                </div>
                <input 
                  type="range" min="0" max="360" step="1" 
                  value={selectedLayer.angle || 0} 
                  onChange={(e) => updateSelectedLayer({ angle: Number(e.target.value) })} 
                  style={{ width: "100%", accentColor: "#8B5CF6" }} 
                />
              </div>

              {/* LAYER TRANSPARENCY SLIDER */}
              <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Transparency</label>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#8B5CF6" }}>{Math.round((selectedLayer.opacity !== undefined ? selectedLayer.opacity : 1) * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={selectedLayer.opacity !== undefined ? selectedLayer.opacity : 1} onChange={(e) => updateSelectedLayer({ opacity: Number(e.target.value) })} style={{ width: "100%", accentColor: "#8B5CF6" }} />
              </div>

              {/* BLUR */}
              {selectedLayer.type === "image" && (
                <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Layer Blur</label>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#8B5CF6" }}>{selectedLayer.blur || 0}px</span>
                  </div>
                  <input type="range" min="0" max="20" step="1" value={selectedLayer.blur || 0} onChange={(e) => updateSelectedLayer({ blur: Number(e.target.value) })} style={{ width: "100%", accentColor: "#8B5CF6" }} />
                </div>
              )}

              {/* TEXT BACKGROUND RESALT */}
              {selectedLayer.type === "text" && (
                <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "flex", gap: "6px", alignItems: "center" }}>
                    <input type="checkbox" checked={selectedLayer.hasTextBg || false} onChange={(e) => updateSelectedLayer({ hasTextBg: e.target.checked })} />
                    Highlight Text Background
                  </label>
                  {selectedLayer.hasTextBg && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                      <input type="color" value={selectedLayer.textBgColor || "#000000"} onChange={(e) => updateSelectedLayer({ textBgColor: e.target.value })} style={{ width: "100%", height: "24px", border: "none" }} />
                      <label style={{ fontSize: "10px", color: "#64748B" }}>Padding Size ({selectedLayer.textBgPadding}px)</label>
                      <input type="range" min="2" max="30" value={selectedLayer.textBgPadding || 6} onChange={(e) => updateSelectedLayer({ textBgPadding: Number(e.target.value) })} style={{ width: "100%" }} />
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600 }}>Element Primary Color</label>
                <input
                  type="color"
                  value={selectedLayer.type === "text" ? (activeTextColor || normalizeColorToHex(selectedLayer.color) || "#000000") : (normalizeColorToHex(selectedLayer.color) || "#FFFFFF")}
                  onMouseDown={() => {
                    if (selectedLayer.type === "text") {
                      const editableElement = getEditableTextElement(selectedLayer.id);
                      if (editableElement) rememberTextSelection(selectedLayer.id, editableElement);
                    }
                  }}
                  onTouchStart={() => {
                    if (selectedLayer.type === "text") {
                      const editableElement = getEditableTextElement(selectedLayer.id);
                      if (editableElement) rememberTextSelection(selectedLayer.id, editableElement);
                    }
                  }}
                  onChange={(e) => {
                    if (selectedLayer.type === "text") {
                      applyColorToSelectedText(e.target.value);
                      return;
                    }

                    updateSelectedLayer({
                      color: e.target.value,
                      ...(selectedLayer.type === "shape" && !selectedLayer.useGradient
                        ? { gradientColor1: e.target.value }
                        : {}),
                    });
                  }}
                />
                {selectedLayer.type === "text" && (
                  <span style={{ fontSize: "11px", color: "#64748B", lineHeight: 1.4 }}>
                    Select part of the text on the canvas, then choose a color to recolor only that selection.
                  </span>
                )}
                {selectedLayer.type === "shape" && (
  <div
    style={{
      background: "#F8FAFC",
      padding: "10px",
      borderRadius: "8px",
      border: "1px solid #E2E8F0",
      marginTop: "8px",
    }}
  >
    <label
      style={{
        fontSize: "11px",
        fontWeight: 700,
        color: "#475569",
        display: "flex",
        gap: "6px",
        alignItems: "center",
      }}
    >
      <input
        type="checkbox"
        checked={selectedLayer.useGradient || false}
        onChange={(e) =>
          updateSelectedLayer({
            useGradient: e.target.checked,
          })
        }
      />
      Gradient Fill
    </label>

   
      
    {selectedLayer.useGradient && (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      marginTop: "8px",
    }}
  >
    <div style={{ display: "flex", gap: "8px" }}>
      <input
        type="color"
        value={selectedLayer.gradientColor1 || selectedLayer.color || "#3B82F6"}
        onChange={(e) =>
          updateSelectedLayer({
            gradientColor1: e.target.value,
          })
        }
        style={{ width: "100%", height: "28px" }}
      />

      <input
        type="color"
        value={selectedLayer.gradientColor2 || "#8B5CF6"}
        onChange={(e) =>
          updateSelectedLayer({
            gradientColor2: e.target.value,
          })
        }
        style={{ width: "100%", height: "28px" }}
      />
    </div>

    <select
      value={selectedLayer.gradientType || "linear"}
      onChange={(e) => updateSelectedLayer({ gradientType: e.target.value as "linear" | "radial" })}
      style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFFFFF" }}
    >
      <option value="linear">Linear Gradient</option>
      <option value="radial">Radial Glow</option>
    </select>

    {(selectedLayer.gradientType || "linear") === "linear" ? (
      <select
        value={selectedLayer.gradientDirection || "diagonal"}
        onChange={(e) => updateSelectedLayer({ gradientDirection: e.target.value as Layer["gradientDirection"] })}
        style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFFFFF" }}
      >
        <option value="top-bottom">Top to Bottom</option>
        <option value="bottom-top">Bottom to Top</option>
        <option value="left-right">Left to Right</option>
        <option value="right-left">Right to Left</option>
        <option value="diagonal">Diagonal</option>
      </select>
    ) : (
      <select
        value={selectedLayer.gradientPosition || "center"}
        onChange={(e) => updateSelectedLayer({ gradientPosition: e.target.value as Layer["gradientPosition"] })}
        style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFFFFF" }}
      >
        <option value="center">Center</option>
        <option value="top">Top</option>
        <option value="bottom">Bottom</option>
        <option value="left">Left</option>
        <option value="right">Right</option>
      </select>
    )}
  </div>
)}
  </div>
  
)}
              </div>
              

              {selectedLayer.type === "text" && (
                <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 800, color: "#475569" }}>Pixores Text Controls</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <label style={{ fontSize: "10px", color: "#64748B" }}>
                      Outline
                      <input type="range" min="0" max="12" value={selectedLayer.strokeWidth || 0} onChange={(e) => updateSelectedLayer({ strokeWidth: Number(e.target.value) })} style={{ width: "100%" }} />
                    </label>
                    <label style={{ fontSize: "10px", color: "#64748B" }}>
                      Outline Color
                      <input type="color" value={selectedLayer.strokeColor || "#000000"} onChange={(e) => updateSelectedLayer({ strokeColor: e.target.value })} style={{ width: "100%", height: "26px" }} />
                    </label>
                    <label style={{ fontSize: "10px", color: "#64748B" }}>
                      Letter Spacing
                      <input type="range" min="-2" max="24" value={selectedLayer.letterSpacing || 0} onChange={(e) => updateSelectedLayer({ letterSpacing: Number(e.target.value) })} style={{ width: "100%" }} />
                    </label>
                    <label style={{ fontSize: "10px", color: "#64748B" }}>
                      Line Height
                      <input type="range" min="0.75" max="2" step="0.05" value={selectedLayer.lineHeight || 1} onChange={(e) => updateSelectedLayer({ lineHeight: Number(e.target.value) })} style={{ width: "100%" }} />
                    </label>
                    <label style={{ fontSize: "10px", color: "#64748B" }}>
                      Glow
                      <input type="range" min="0" max="35" value={selectedLayer.glowRadius || 0} onChange={(e) => updateSelectedLayer({ glowRadius: Number(e.target.value) })} style={{ width: "100%" }} />
                    </label>
                    <label style={{ fontSize: "10px", color: "#64748B" }}>
                      Glow Color
                      <input type="color" value={selectedLayer.glowColor || "#FFFF00"} onChange={(e) => updateSelectedLayer({ glowColor: e.target.value })} style={{ width: "100%", height: "26px" }} />
                    </label>
                    <label style={{ fontSize: "10px", color: "#64748B" }}>
                      Shadow
                      <input type="range" min="0" max="35" value={selectedLayer.shadowBlur || 0} onChange={(e) => updateSelectedLayer({ shadowBlur: Number(e.target.value), shadowOffsetX: selectedLayer.shadowOffsetX || 4, shadowOffsetY: selectedLayer.shadowOffsetY || 4 })} style={{ width: "100%" }} />
                    </label>
                    <label style={{ fontSize: "10px", color: "#64748B" }}>
                      Shadow Color
                      <input type="color" value={selectedLayer.shadowColor || "#000000"} onChange={(e) => updateSelectedLayer({ shadowColor: e.target.value })} style={{ width: "100%", height: "26px" }} />
                    </label>
                  </div>
                </div>
              )}

              {/* REMOVE BACKGROUND MAGIC WITH AI */}
              {selectedLayer.type === "image" && (
                <div style={{ background: "#F8FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block" }}>Pixores AI Tools</label>
                  <button
                    onClick={() => handleRemoveBackgroundAI(selectedLayer)}
                    style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg, #6366F1 0%, #A855F7 100%)", color: "#FFFFFF", border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "12px", cursor: "pointer", boxShadow: "0 2px 4px rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    ✨ Remove Background with AI
                  </button>
                  <button
                    type="button"
                    onClick={downloadSelectedNoBgPNG}
                    disabled={!selectedLayer.src}
                    style={{ width: "100%", padding: "10px", background: selectedLayer.src ? "#0EA5E9" : "#94A3B8", color: "#FFFFFF", border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "12px", cursor: selectedLayer.src ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    Download No-BG PNG
                  </button>
                  <div style={{ marginTop: "4px" }}>
                    <label style={{ fontSize: "10px", color: "#64748B", display: "block", marginBottom: "4px" }}>Alternative Manual Fusion:</label>
                    <select value={selectedLayer.blendMode} onChange={(e) => updateSelectedLayer({ blendMode: e.target.value as any })} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #CBD5E1", fontSize: "12px", background: "#FFF" }}>
                      <option value="normal">Keep Original</option>
                      <option value="multiply">Drop White Background (Multiply)</option>
                      <option value="screen">Drop Black Background (Screen)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* IMAGE BORDER STROKE ADJUST PANEL */}
              {selectedLayer.type === "image" && (
                <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "flex", gap: "6px", alignItems: "center" }}>
                    <input type="checkbox" checked={selectedLayer.hasImageStroke || false} onChange={(e) => updateSelectedLayer({ hasImageStroke: e.target.checked })} />
                    Enable Object/Image Outline (Stroke)
                  </label>
                  {selectedLayer.hasImageStroke && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                      <input type="color" value={selectedLayer.imageStrokeColor || "#3B82F6"} onChange={(e) => updateSelectedLayer({ imageStrokeColor: e.target.value })} style={{ width: "100%", height: "24px", border: "none", cursor: "pointer" }} />
                      <label style={{ fontSize: "10px", color: "#64748B" }}>Thickness ({selectedLayer.imageStrokeWidth}px)</label>
                      <input type="range" min="1" max="20" value={selectedLayer.imageStrokeWidth || 4} onChange={(e) => updateSelectedLayer({ imageStrokeWidth: Number(e.target.value) })} style={{ width: "100%" }} />
                    </div>
                  )}
                </div>
              )}

              {isImageFrame(selectedLayer) && (
                <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "8px" }}>{isGridFrame(selectedLayer.shapeType) ? "Grid Photos" : "Frame Image"}</label>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {!isCompositionFrame(selectedLayer.shapeType) && !isGridFrame(selectedLayer.shapeType) && (
                      <>
                        <input
                          type="color"
                          value={selectedLayer.strokeColor || selectedLayer.color || "#3B82F6"}
                          onChange={(e) => updateSelectedLayer({ strokeColor: e.target.value, color: e.target.value })}
                          style={{ width: "100%", height: "28px", border: "none", cursor: "pointer" }}
                        />

                        <label style={{ fontSize: "10px", color: "#64748B" }}>Frame Thickness ({selectedLayer.strokeWidth ?? 8}px)</label>
                        <input
                          type="range"
                          min="0"
                          max="32"
                          value={selectedLayer.strokeWidth ?? 8}
                          onChange={(e) => updateSelectedLayer({ strokeWidth: Number(e.target.value) })}
                          style={{ width: "100%" }}
                        />
                      </>
                    )}

                    {isGridFrame(selectedLayer.shapeType) && (() => {
                      const cells = getGridCells(selectedLayer.shapeType);
                      const activeCell = Math.min(selectedLayer.activeGridCell ?? 0, cells.length - 1);
                      const activeImage = selectedLayer.gridImages?.[activeCell];
                      return (
                        <>
                          <label style={{ fontSize: "10px", color: "#64748B" }}>Spacing ({selectedLayer.gridGap ?? 4}px)</label>
                          <input type="range" min="0" max="24" value={selectedLayer.gridGap ?? 4} onChange={(e) => updateSelectedLayer({ gridGap: Number(e.target.value) })} style={{ width: "100%" }} />

                          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, cells.length)}, 1fr)`, gap: "6px" }}>
                            {cells.map((_, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => updateSelectedLayer({ activeGridCell: index })}
                                style={{ padding: "7px 4px", borderRadius: "6px", border: "1px solid #CBD5E1", background: activeCell === index ? "#2563EB" : "#FFFFFF", color: activeCell === index ? "#FFFFFF" : "#334155", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}
                              >
                                {index + 1}
                              </button>
                            ))}
                          </div>

                          {activeImage?.src ? (
                            <>
                              <select value={activeImage.fit || "cover"} onChange={(e) => updateSelectedGridCell(activeCell, { fit: e.target.value as "cover" | "contain" })} style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px", background: "#FFF" }}>
                                <option value="cover">Image Fill: Cover</option>
                                <option value="contain">Image Fit: Contain</option>
                              </select>

                              <label style={{ fontSize: "10px", color: "#64748B" }}>Horizontal ({activeImage.x ?? 50}%)</label>
                              <input type="range" min="0" max="100" value={activeImage.x ?? 50} onChange={(e) => updateSelectedGridCell(activeCell, { x: Number(e.target.value) })} style={{ width: "100%" }} />

                              <label style={{ fontSize: "10px", color: "#64748B" }}>Vertical ({activeImage.y ?? 50}%)</label>
                              <input type="range" min="0" max="100" value={activeImage.y ?? 50} onChange={(e) => updateSelectedGridCell(activeCell, { y: Number(e.target.value) })} style={{ width: "100%" }} />

                              <label style={{ fontSize: "10px", color: "#64748B" }}>Zoom ({((activeImage.scale ?? 1) * 100).toFixed(0)}%)</label>
                              <input type="range" min="0.5" max="3" step="0.05" value={activeImage.scale ?? 1} onChange={(e) => updateSelectedGridCell(activeCell, { scale: Number(e.target.value) })} style={{ width: "100%" }} />

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                <button type="button" onClick={() => updateSelectedGridCell(activeCell, { flipH: !activeImage.flipH })} style={{ padding: "7px", borderRadius: "6px", border: "1px solid #CBD5E1", background: activeImage.flipH ? "#DBEAFE" : "#FFFFFF", color: "#334155", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Flip H</button>
                                <button type="button" onClick={() => updateSelectedGridCell(activeCell, { flipV: !activeImage.flipV })} style={{ padding: "7px", borderRadius: "6px", border: "1px solid #CBD5E1", background: activeImage.flipV ? "#DBEAFE" : "#FFFFFF", color: "#334155", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Flip V</button>
                              </div>

                              <button type="button" onClick={() => updateSelectedGridCell(activeCell, { src: undefined, x: 50, y: 50, scale: 1, flipH: false, flipV: false })} style={{ padding: "7px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Remove Photo {activeCell + 1}</button>
                            </>
                          ) : (
                            <div style={{ padding: "9px", borderRadius: "6px", background: "#EFF6FF", color: "#1D4ED8", fontSize: "11px", fontWeight: 700, textAlign: "center" }}>
                              Select an uploaded image to fill photo {activeCell + 1}.
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {selectedLayer.frameImageSrc && (
                      <>
                        <select
                          value={selectedLayer.frameImageFit || "cover"}
                          onChange={(e) => updateSelectedLayer({ frameImageFit: e.target.value as "cover" | "contain" })}
                          style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px", background: "#FFF" }}
                        >
                          <option value="cover">Image Fill: Cover</option>
                          <option value="contain">Image Fit: Contain</option>
                        </select>

                        <label style={{ fontSize: "10px", color: "#64748B" }}>Photo 1 Horizontal ({selectedLayer.frameImageX ?? 50}%)</label>
                        <input type="range" min="0" max="100" value={selectedLayer.frameImageX ?? 50} onChange={(e) => updateSelectedLayer({ frameImageX: Number(e.target.value) })} style={{ width: "100%" }} />

                        <label style={{ fontSize: "10px", color: "#64748B" }}>Photo 1 Vertical ({selectedLayer.frameImageY ?? 50}%)</label>
                        <input type="range" min="0" max="100" value={selectedLayer.frameImageY ?? 50} onChange={(e) => updateSelectedLayer({ frameImageY: Number(e.target.value) })} style={{ width: "100%" }} />

                        <label style={{ fontSize: "10px", color: "#64748B" }}>Photo 1 Zoom ({((selectedLayer.frameImageScale ?? 1) * 100).toFixed(0)}%)</label>
                        <input type="range" min="0.5" max="3" step="0.05" value={selectedLayer.frameImageScale ?? 1} onChange={(e) => updateSelectedLayer({ frameImageScale: Number(e.target.value) })} style={{ width: "100%" }} />

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <button type="button" onClick={() => updateSelectedLayer({ frameImageFlipH: !selectedLayer.frameImageFlipH })} style={{ padding: "7px", borderRadius: "6px", border: "1px solid #CBD5E1", background: selectedLayer.frameImageFlipH ? "#DBEAFE" : "#FFFFFF", color: "#334155", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                            Flip Photo 1 H
                          </button>
                          <button type="button" onClick={() => updateSelectedLayer({ frameImageFlipV: !selectedLayer.frameImageFlipV })} style={{ padding: "7px", borderRadius: "6px", border: "1px solid #CBD5E1", background: selectedLayer.frameImageFlipV ? "#DBEAFE" : "#FFFFFF", color: "#334155", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                            Flip Photo 1 V
                          </button>
                        </div>
                      </>
                    )}

                    {isCompositionFrame(selectedLayer.shapeType) && selectedLayer.frameImageSrc2 && (
                      <>
                        <label style={{ fontSize: "10px", color: "#64748B", borderTop: "1px solid #E2E8F0", paddingTop: "8px" }}>Photo 2 Horizontal ({selectedLayer.frameImage2X ?? 50}%)</label>
                        <input type="range" min="0" max="100" value={selectedLayer.frameImage2X ?? 50} onChange={(e) => updateSelectedLayer({ frameImage2X: Number(e.target.value) })} style={{ width: "100%" }} />

                        <label style={{ fontSize: "10px", color: "#64748B" }}>Photo 2 Vertical ({selectedLayer.frameImage2Y ?? 50}%)</label>
                        <input type="range" min="0" max="100" value={selectedLayer.frameImage2Y ?? 50} onChange={(e) => updateSelectedLayer({ frameImage2Y: Number(e.target.value) })} style={{ width: "100%" }} />

                        <label style={{ fontSize: "10px", color: "#64748B" }}>Photo 2 Zoom ({((selectedLayer.frameImage2Scale ?? 1) * 100).toFixed(0)}%)</label>
                        <input type="range" min="0.5" max="3" step="0.05" value={selectedLayer.frameImage2Scale ?? 1} onChange={(e) => updateSelectedLayer({ frameImage2Scale: Number(e.target.value) })} style={{ width: "100%" }} />

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <button type="button" onClick={() => updateSelectedLayer({ frameImage2FlipH: !selectedLayer.frameImage2FlipH })} style={{ padding: "7px", borderRadius: "6px", border: "1px solid #CBD5E1", background: selectedLayer.frameImage2FlipH ? "#DBEAFE" : "#FFFFFF", color: "#334155", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                            Flip Photo 2 H
                          </button>
                          <button type="button" onClick={() => updateSelectedLayer({ frameImage2FlipV: !selectedLayer.frameImage2FlipV })} style={{ padding: "7px", borderRadius: "6px", border: "1px solid #CBD5E1", background: selectedLayer.frameImage2FlipV ? "#DBEAFE" : "#FFFFFF", color: "#334155", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                            Flip Photo 2 V
                          </button>
                        </div>
                      </>
                    )}

                    {(selectedLayer.frameImageSrc || selectedLayer.frameImageSrc2) && (
                      <button type="button" onClick={() => updateSelectedLayer({ frameImageX: 50, frameImageY: 50, frameImage2X: 50, frameImage2Y: 50, frameImageScale: 1, frameImage2Scale: 1, frameImageFlipH: false, frameImageFlipV: false, frameImage2FlipH: false, frameImage2FlipV: false })} style={{ padding: "7px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                        Reset Frame Photos
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TEXT OUTLINE STROKE */}
              {selectedLayer.type === "text" && (
                <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "6px" }}>Text Outline Color (Stroke)</label>
                  <input type="color" value={selectedLayer.strokeColor || "#000000"} onChange={(e) => updateSelectedLayer({ strokeColor: e.target.value })} style={{ width: "100%", height: "24px", border: "none" }} />
                </div>
              )}

              {/* SHADOWS */}
              <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "6px" }}>Drop Shadows (Shadow)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "10px", color: "#64748B" }}>Shadow Blur ({selectedLayer.shadowBlur || 0}px)</label>
                  <input type="range" min="0" max="25" value={selectedLayer.shadowBlur || 0} onChange={(e) => updateSelectedLayer({ shadowBlur: Number(e.target.value) })} />
                  <input type="color" value={selectedLayer.shadowColor || "#000000"} onChange={(e) => updateSelectedLayer({ shadowColor: e.target.value })} style={{ width: "100%", height: "20px", border: "none" }} />
                </div>
              </div>

            </div>
          ) : (
            <p style={{ fontSize: "12px", color: "#94A3B8", textAlign: "center" }}>Select an element from the canvas to edit.</p>
          )}
        </aside>
      </div>
      {isMobileLayout && mobilePanel === "export" && (
        <aside style={{ position: "absolute", left: "8px", right: "8px", bottom: "84px", maxHeight: "40dvh", overflowY: "auto", background: "#FFFFFF", borderRadius: "16px", boxShadow: "0 -14px 40px rgba(15, 23, 42, 0.2)", padding: "16px", zIndex: 2147483646, display: "flex", flexDirection: "column", gap: "12px", touchAction: "pan-y", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
          <div style={{ position: "sticky", top: "-16px", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", margin: "-10px 0 0", padding: "10px 0", background: "#FFFFFF" }}>
            <strong style={{ fontSize: "14px", color: "#0F172A" }}>Export</strong>
            <button type="button" onClick={() => setMobilePanel(null)} style={{ width: "34px", height: "34px", borderRadius: "999px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#0F172A", fontSize: "18px", lineHeight: 1, cursor: "pointer" }}>x</button>
          </div>

          <div style={{ padding: "10px 12px", borderRadius: "10px", background: "#FEF3C7", color: "#92400E", fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <span>Credits: {credits ?? "-"}</span>
            <button suppressHydrationWarning onClick={() => setShowCreditsModal(true)} style={{ padding: "7px 10px", background: "#F59E0B", color: "#FFFFFF", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700 }}>Buy Credits</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button onClick={saveProject} style={{ padding: "12px 10px", background: "#2563EB", color: "#FFFFFF", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}>Save Project</button>
            <button onClick={updateProject} disabled={!currentProjectId} style={{ padding: "12px 10px", background: currentProjectId ? "#F59E0B" : "#94A3B8", color: "#FFFFFF", border: "none", borderRadius: "10px", fontWeight: 700, cursor: currentProjectId ? "pointer" : "not-allowed" }}>Update</button>
            <button onClick={loadMyProjects} style={{ padding: "12px 10px", background: "#0F172A", color: "#FFFFFF", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}>My Projects</button>
            <button disabled={isExporting} onClick={() => downloadPNG()} style={{ padding: "12px 10px", background: isExporting ? "#94A3B8" : "#10B981", color: "#FFFFFF", border: "none", borderRadius: "10px", fontWeight: 700, cursor: isExporting ? "wait" : "pointer" }}>PNG HD</button>
          </div>

          {isAdmin && (
            <>
              {searchParams.get("template") && (
                <button disabled={isSavingTemplate} onClick={updatePublicTemplate} style={{ padding: "12px 10px", background: "#7C3AED", color: "#FFFFFF", border: "none", borderRadius: "10px", fontWeight: 700, cursor: isSavingTemplate ? "wait" : "pointer" }}>
                  {isSavingTemplate ? "Saving..." : currentTemplateAssetId ? "Update Public Template" : "Save Template Changes"}
                </button>
              )}
              <button onClick={saveAsPublicTemplate} style={{ padding: "12px 10px", background: "#475569", color: "#FFFFFF", border: "none", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}>
                Save as New Public Template
              </button>
            </>
          )}

          <button disabled={isExporting} onClick={() => downloadJPG()} style={{ padding: "12px 10px", background: isExporting ? "#94A3B8" : "#F59E0B", color: "#FFFFFF", border: "none", borderRadius: "10px", fontWeight: 700, cursor: isExporting ? "wait" : "pointer" }}>
            JPG High Quality
          </button>

          <button disabled={isExporting} onClick={() => downloadTransparentPNG()} style={{ padding: "12px 10px", background: isExporting ? "#94A3B8" : "#0EA5E9", color: "#FFFFFF", border: "none", borderRadius: "10px", fontWeight: 700, cursor: isExporting ? "wait" : "pointer" }}>
            Download Transparent PNG
          </button>
        </aside>
      )}

      {isMobileLayout && (
        <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: "76px", background: "#FFFFFF", borderTop: "1px solid #E2E8F0", boxShadow: "0 -8px 24px rgba(15, 23, 42, 0.08)", zIndex: 2147483647, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
          {[
            { id: "elements", icon: "+", label: "Elements" },
            { id: "text", icon: "T", label: "Text" },
            { id: "uploads", icon: "UP", label: "Uploads" },
            { id: "edit", icon: "FX", label: "Edit" },
            { id: "export", icon: "DL", label: "Export" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === "text") {
                  addTextLayer();
                  setMobilePanel("edit");
                  return;
                }
                if (item.id === "elements") {
                  setMobileAssetSection("elements");
                  setMobilePanel("elements");
                  return;
                }
                if (item.id === "uploads") {
                  setMobileAssetSection("uploads");
                  setMobilePanel("elements");
                  requestAnimationFrame(() => requestAnimationFrame(() => {
                    uploadsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }));
                  return;
                }
                setMobilePanel(item.id as "elements" | "edit" | "export");
              }}
              style={{ border: "none", background: (item.id === "elements" ? mobilePanel === "elements" && mobileAssetSection === "elements" : item.id === "uploads" ? mobilePanel === "elements" && mobileAssetSection === "uploads" : mobilePanel === item.id) ? "#EFF6FF" : "#FFFFFF", color: (item.id === "elements" ? mobilePanel === "elements" && mobileAssetSection === "elements" : item.id === "uploads" ? mobilePanel === "elements" && mobileAssetSection === "uploads" : mobilePanel === item.id) ? "#2563EB" : "#475569", fontWeight: 700, fontSize: "11px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "5px", cursor: "pointer" }}
            >
              <span style={{ fontSize: item.id === "text" ? "22px" : "20px", lineHeight: 1 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
