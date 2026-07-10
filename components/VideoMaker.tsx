"use client";

import { ChangeEvent, DragEvent as ReactDragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { AlignCenter, AlignLeft, AlignRight, ArrowLeft, ArrowRight, Baseline, Bold, Camera, CaseSensitive, ClipboardPaste, Download, Eye, EyeOff, Film, FolderOpen, GripVertical, ImagePlus, Italic, Layers3, List, Lock, Maximize2, Minus, Monitor, Music, PaintRoller, PanelLeftClose, PanelLeftOpen, Pause, Play, Plus, Redo2, Scissors, Search, Settings, Shapes, SkipBack, SkipForward, SlidersHorizontal, Sparkles, Square, Strikethrough, Trash2, Type, Underline, Undo2, Unlock, Volume2, VolumeX } from "lucide-react";
import { buildPixoresProject } from "@/src/video-render/build-project";
import {
  getPixoresVideoExportFormat,
  PIXORES_DEFAULT_VIDEO_EXPORT_FORMAT_ID,
  PIXORES_VIDEO_EXPORT_FORMATS,
  type PixoresVideoExportFormatId,
} from "@/src/video-render/export-formats";
import type { PixoresMediaMetadata, PixoresVideoAsset, PixoresVideoProject } from "@/src/video-render/types";
import { getVideoMakerAdapters } from "@/src/video-maker/adapters/factory";
import {
  PIXORES_VIDEO_START_FORMAT_KEY,
  PIXORES_VIDEO_START_PROJECT_KEY,
  type PixoresVideoStartFormatPayload,
  type PixoresVideoStartProjectPayload,
} from "@/src/video-maker/startup";
import styles from "./VideoMaker.module.css";

type FormatOption = {
  id: string;
  label: string;
  width: number;
  height: number;
};

type ShapeType =
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

type TransitionType = "fade" | "fadeBlack" | "fadeWhite" | "wipeLeft" | "wipeRight" | "slideLeft" | "slideRight" | "zoomFlash";

type LayerAnimationType =
  | "fadeIn"
  | "fadeOut"
  | "slideInLeft"
  | "slideInRight"
  | "slideInUp"
  | "slideInDown"
  | "zoomIn"
  | "zoomOut"
  | "pop";

type LayerAnimation = {
  id: string;
  type: LayerAnimationType;
  start: number;
  duration: number;
};

type KeyframeProperty = "x" | "y" | "width" | "height" | "opacity" | "angle" | "scale";

type LayerKeyframe = {
  id: string;
  time: number;
  property: KeyframeProperty;
  value: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
};

type LayerType = "media" | "text" | "shape" | "audio" | "transition";

type VideoLayer = {
  id: string;
  trackId: string;
  type: LayerType;
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
  textAlign?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  glowColor?: string;
  glowRadius?: number;
  blendMode?: "normal" | "multiply" | "screen" | "darken" | "lighten";
  objectFit?: "cover" | "contain";
  src?: string;
  mediaKind?: "image" | "video" | "audio";
  assetKey?: string;
  sourceStart?: number;
  sourceEnd?: number;
  trimStart?: number;
  trimEnd?: number;
  linkedVideoLayerId?: string;
  audioDetached?: boolean;
  volume?: number;
  transitionKind?: TransitionType;
  fromLayerId?: string;
  toLayerId?: string;
  cutTime?: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
  animations?: LayerAnimation[];
  keyframes?: LayerKeyframe[];
  shapeType?: ShapeType;
  gradientColor1?: string;
  gradientColor2?: string;
};

type MediaAsset = {
  kind: "image" | "video" | "audio";
  image?: HTMLImageElement;
  video?: HTMLVideoElement;
  audio?: HTMLAudioElement;
  url: string;
  persistentUrl?: string;
  duration?: number;
  metadata?: PixoresMediaMetadata;
};

type ImportedAsset = {
  id: string;
  name: string;
  kind: "image" | "video" | "audio";
  url: string;
  persistentUrl?: string;
  uploadStatus?: "local" | "uploading" | "ready" | "error";
  duration?: number;
  size?: number;
  metadata?: PixoresMediaMetadata;
};

type CloudVideoProject = {
  id: string;
  user_id: string | null;
  title: string;
  project: PixoresVideoProject;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

type SidebarPanel = "imports" | "elements" | "text" | "project" | "settings";
type ElementPanelTab = "assets" | "shapes" | "frames" | "grids" | "social" | "gradients" | "transitions" | "emojis";
type ImportKindFilter = "all" | "video" | "image" | "audio";
type EmptyTrack = {
  id: string;
  name: string;
  locked?: boolean;
  visible?: boolean;
  muted?: boolean;
};

type ClipEditState = {
  layerId: string;
  mode: "move" | "trim-start" | "trim-end";
  startX: number;
  initialStart: number;
  initialDuration: number;
  timelineWidth: number;
  initialTrackId: string;
};

type ClipDragPreview = {
  layerId: string;
  trackId: string;
  leftPercent: number;
  widthPercent: number;
};

type StageEditState = {
  layerId: string;
  mode: "move" | "resize" | "rotate";
  edge?: CanvasResizeEdge;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
  initialAngle: number;
  initialPointerAngle: number;
  centerX: number;
  centerY: number;
  stageWidth: number;
  stageHeight: number;
};

type LayoutResizeState = {
  mode: "sidebar" | "timeline";
  startX: number;
  startY: number;
  initialSidebarWidth: number;
  initialTimelineHeight: number;
};

type CanvasResizeEdge = "left" | "right" | "top" | "bottom" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

type CanvasResizeState = {
  edge: CanvasResizeEdge;
  startX: number;
  startY: number;
  initialWidth: number;
};

type LayerHistory = {
  past: VideoLayer[][];
  future: VideoLayer[][];
};

const formats: FormatOption[] = [
  { id: "9_16", label: "9:16", width: 1080, height: 1920 },
  { id: "3_4", label: "3:4", width: 1080, height: 1440 },
  { id: "4_5", label: "4:5", width: 1080, height: 1350 },
  { id: "1_1", label: "1:1", width: 1080, height: 1080 },
  { id: "4_3", label: "4:3", width: 1440, height: 1080 },
  { id: "16_9", label: "16:9", width: 1920, height: 1080 },
  { id: "21_9", label: "21:9", width: 2560, height: 1080 },
  { id: "custom", label: "Personalizadas", width: 1920, height: 1080 },
];

const libraryAssets = [
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
] as const;

const socialAssets = [
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
] as const;

const shapePresets = [
  { name: "Blue Box", shapeType: "rectangle", color: "#3B82F6" },
  { name: "Red Box", shapeType: "rectangle", color: "#EF4444" },
  { name: "Yellow Circle", shapeType: "circle", color: "#FACC15" },
  { name: "Green Circle", shapeType: "circle", color: "#22C55E" },
  { name: "Red Triangle", shapeType: "triangle", color: "#EF4444" },
  { name: "Yellow Triangle", shapeType: "triangle", color: "#FACC15" },
  { name: "Star", shapeType: "star", color: "#FACC15" },
  { name: "Badge", shapeType: "badge", color: "#EF4444" },
  { name: "Speech Bubble", shapeType: "speechBubble", color: "#FFFFFF" },
  { name: "Arrow", shapeType: "arrow", color: "#EF4444" },
  { name: "Line", shapeType: "line", color: "#0F172A" },
  { name: "Black Line", shapeType: "line", color: "#0F172A" },
  { name: "Dashed Line", shapeType: "dashedLine", color: "#0F172A" },
] satisfies Array<{ name: string; shapeType: ShapeType; color: string }>;

const framePresets = [
  { name: "Frame", shapeType: "frame", color: "#EF4444" },
  { name: "Rounded Frame", shapeType: "roundedFrame", color: "#3B82F6" },
  { name: "Circle Frame", shapeType: "circleFrame", color: "#FACC15" },
  { name: "Triangle Frame", shapeType: "triangleFrame", color: "#22C55E" },
  { name: "Paper Wide", shapeType: "paperFrame", color: "#F8F1E8" },
  { name: "Paper Portrait", shapeType: "paperPortraitFrame", color: "#F8F1E8" },
  { name: "Paper Square", shapeType: "paperSquareFrame", color: "#F8F1E8" },
  { name: "Torn Paper", shapeType: "paperStripFrame", color: "#F8F1E8" },
  { name: "Paper Left", shapeType: "paperLeftFrame", color: "#F8F1E8" },
  { name: "Paper Right", shapeType: "paperRightFrame", color: "#F8F1E8" },
  { name: "Phone", shapeType: "phoneFrame", color: "#111827" },
  { name: "Tablet", shapeType: "tabletFrame", color: "#111827" },
  { name: "Laptop", shapeType: "laptopFrame", color: "#111827" },
  { name: "VS Divider", shapeType: "vsDividerFrame", color: "#FACC15" },
  { name: "Split Screen", shapeType: "splitScreenFrame", color: "#2563EB" },
  { name: "Diagonal Split", shapeType: "diagonalSplitFrame", color: "#EF4444" },
] satisfies Array<{ name: string; shapeType: ShapeType; color: string }>;

const gridPresets = [
  { name: "Single Photo", shapeType: "gridSingle", color: "#FFFFFF" },
  { name: "Two Columns", shapeType: "gridTwoColumns", color: "#FFFFFF" },
  { name: "Two Rows", shapeType: "gridTwoRows", color: "#FFFFFF" },
  { name: "Three Columns", shapeType: "gridThreeColumns", color: "#FFFFFF" },
  { name: "Three Rows", shapeType: "gridThreeRows", color: "#FFFFFF" },
  { name: "Four Photos", shapeType: "gridFour", color: "#FFFFFF" },
  { name: "Feature Left", shapeType: "gridHeroLeft", color: "#FFFFFF" },
  { name: "Feature Top", shapeType: "gridHeroTop", color: "#FFFFFF" },
] satisfies Array<{ name: string; shapeType: ShapeType; color: string }>;

const gradientPresets = [
  { name: "Blue Fade", color1: "#FFFFFF", color2: "#1261D6" },
  { name: "Dark Fade", color1: "#0F172A", color2: "#FFFFFF" },
  { name: "Navy Fade", color1: "#FFFFFF", color2: "#172A72" },
  { name: "Purple Side Fade", color1: "#7C3AED", color2: "#FFFFFF" },
  { name: "Orange Fade", color1: "#FFFFFF", color2: "#F97316" },
  { name: "Red Band", color1: "#FFFFFF", color2: "#EF4444" },
  { name: "Pink Glow", color1: "#EC4899", color2: "#FFFFFF" },
  { name: "Blue Glow", color1: "#0284C7", color2: "#FFFFFF" },
  { name: "Lime Glow", color1: "#A3E635", color2: "#FFFFFF" },
  { name: "Black Glow", color1: "#000000", color2: "#FFFFFF" },
] as const;

const basicTransitionPresets = [
  { name: "Fade", transitionKind: "fade", color: "#000000" },
  { name: "Fade Black", transitionKind: "fadeBlack", color: "#000000" },
  { name: "Fade White", transitionKind: "fadeWhite", color: "#FFFFFF" },
  { name: "Wipe Left", transitionKind: "wipeLeft", color: "#0F172A" },
  { name: "Wipe Right", transitionKind: "wipeRight", color: "#0F172A" },
  { name: "Slide Left", transitionKind: "slideLeft", color: "#2563EB" },
  { name: "Slide Right", transitionKind: "slideRight", color: "#2563EB" },
  { name: "Zoom Flash", transitionKind: "zoomFlash", color: "#FFFFFF" },
] satisfies Array<{ name: string; transitionKind: TransitionType; color: string }>;

const animationPresets = [
  { label: "None", type: "" },
  { label: "Fade In", type: "fadeIn" },
  { label: "Fade Out", type: "fadeOut" },
  { label: "Slide In Left", type: "slideInLeft" },
  { label: "Slide In Right", type: "slideInRight" },
  { label: "Slide In Up", type: "slideInUp" },
  { label: "Slide In Down", type: "slideInDown" },
  { label: "Zoom In", type: "zoomIn" },
  { label: "Zoom Out", type: "zoomOut" },
  { label: "Pop", type: "pop" },
] satisfies Array<{ label: string; type: LayerAnimationType | "" }>;

const emojiPresets = [
  { name: "Happy Face", emoji: "\u{1F600}" },
  { name: "Big Smile", emoji: "\u{1F603}" },
  { name: "Laugh", emoji: "\u{1F602}" },
  { name: "Cool", emoji: "\u{1F60E}" },
  { name: "Shocked", emoji: "\u{1F631}" },
  { name: "Mind Blown", emoji: "\u{1F92F}" },
  { name: "Fire", emoji: "\u{1F525}" },
  { name: "Star", emoji: "\u{2B50}" },
  { name: "Sparkles", emoji: "\u{2728}" },
  { name: "Warning", emoji: "\u{26A0}\u{FE0F}" },
  { name: "Money", emoji: "\u{1F4B0}" },
  { name: "Rocket", emoji: "\u{1F680}" },
  { name: "Target", emoji: "\u{1F3AF}" },
  { name: "Eyes", emoji: "\u{1F440}" },
  { name: "Thumbs Up", emoji: "\u{1F44D}" },
  { name: "Heart", emoji: "\u{2764}\u{FE0F}" },
  { name: "Lightning", emoji: "\u{26A1}" },
  { name: "Check", emoji: "\u{2705}" },
  { name: "Cross", emoji: "\u{274C}" },
  { name: "Alarm", emoji: "\u{1F6A8}" },
  { name: "Megaphone", emoji: "\u{1F4E3}" },
  { name: "Crown", emoji: "\u{1F451}" },
  { name: "Trophy", emoji: "\u{1F3C6}" },
  { name: "Camera", emoji: "\u{1F4F8}" },
] as const;

const fontGroups = [
  { label: "Popular", fonts: ["Inter", "Montserrat", "Poppins", "Roboto", "Open Sans", "Lato", "Oswald", "Bebas Neue"] },
  { label: "Bold & Display", fonts: ["Anton", "Archivo Black", "Alfa Slab One", "Black Ops One", "Bowlby One SC", "Bungee", "Fjalla One", "League Spartan", "Luckiest Guy", "Passion One", "Permanent Marker", "Russo One", "Staatliches", "Teko", "Titan One", "Ultra"] },
  { label: "Modern Sans Serif", fonts: ["Archivo", "Barlow", "Cabin", "DM Sans", "Exo 2", "Figtree", "Josefin Sans", "Kanit", "Manrope", "Mulish", "Nunito Sans", "Outfit", "Plus Jakarta Sans", "Quicksand", "Raleway", "Roboto Condensed", "Rubik", "Space Grotesk", "Ubuntu", "Work Sans"] },
  { label: "Serif & Editorial", fonts: ["Abril Fatface", "Bitter", "Bodoni Moda", "Cinzel", "Cormorant Garamond", "DM Serif Display", "Libre Baskerville", "Lora", "Merriweather", "Noto Serif", "Playfair Display", "Roboto Slab", "Source Serif 4", "Spectral"] },
  { label: "Script & Handwritten", fonts: ["Caveat", "Courgette", "Dancing Script", "Great Vibes", "Kaushan Script", "Lobster", "Pacifico", "Patrick Hand", "Sacramento", "Satisfy", "Shadows Into Light", "Yellowtail"] },
  { label: "System Fonts", fonts: ["Arial", "Arial Black", "Comic Sans MS", "Courier New", "Georgia", "Impact", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana"] },
] as const;

const systemFonts = new Set<string>(fontGroups.find((group) => group.label === "System Fonts")?.fonts || []);
const preloadedGoogleFonts = new Set(["Anton", "Bebas Neue", "Inter", "Montserrat", "Poppins"]);

const textPresets = [
  { label: "Bold Title", text: "Bold Title", fontSize: 64, fontFamily: "Anton", color: "#111827" },
  { label: "Clean Subtitle", text: "Clean Subtitle", fontSize: 38, fontFamily: "Trebuchet MS", color: "#1F2937" },
  { label: "Body Caption", text: "Body Caption", fontSize: 26, fontFamily: "Georgia", color: "#334155" },
] as const;

const initialLayers: VideoLayer[] = [];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function applyTransitionEasing(progress: number, easing: VideoLayer["easing"] = "easeInOut") {
  if (easing === "linear") return progress;
  if (easing === "easeIn") return progress * progress;
  if (easing === "easeOut") return 1 - ((1 - progress) * (1 - progress));
  return progress < 0.5 ? 2 * progress * progress : 1 - ((-2 * progress + 2) ** 2) / 2;
}

function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.drawImage(source, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawContain(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.drawImage(source, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawLayerMedia(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  layer: VideoLayer,
  width: number,
  height: number,
) {
  if (layer.objectFit === "contain") {
    drawContain(context, source, sourceWidth, sourceHeight, 0, 0, width, height);
    return;
  }

  drawCover(context, source, sourceWidth, sourceHeight, 0, 0, width, height);
}

function ensureVideoMakerFontLoaded(fontFamily?: string) {
  if (!fontFamily || typeof document === "undefined" || systemFonts.has(fontFamily) || preloadedGoogleFonts.has(fontFamily)) return;
  const linkId = `pixores-video-font-${fontFamily.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, "+")}&display=swap`;
  document.head.appendChild(link);
}

function createStarPath(context: CanvasRenderingContext2D, centerX: number, centerY: number, outerRadius: number, innerRadius: number) {
  context.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const angle = (-Math.PI / 2) + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const pointX = centerX + Math.cos(angle) * radius;
    const pointY = centerY + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.closePath();
}

function drawShape(context: CanvasRenderingContext2D, layer: VideoLayer, x: number, y: number, width: number, height: number) {
  const color = layer.color || "#3B82F6";
  const strokeWidth = layer.strokeWidth ?? Math.max(4, Math.min(width, height) * 0.06);
  context.fillStyle = color;
  context.strokeStyle = layer.strokeColor || color;
  context.lineWidth = strokeWidth;

  if (layer.shapeType === "gradient") {
    const gradient = context.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, layer.gradientColor1 || color);
    gradient.addColorStop(1, layer.gradientColor2 || "#FFFFFF");
    context.fillStyle = gradient;
    context.fillRect(x, y, width, height);
    return;
  }

  if (layer.shapeType === "circle") {
    context.beginPath();
    context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    context.fill();
    return;
  }

  if (layer.shapeType === "triangle") {
    context.beginPath();
    context.moveTo(x + width / 2, y);
    context.lineTo(x + width, y + height);
    context.lineTo(x, y + height);
    context.closePath();
    context.fill();
    return;
  }

  if (layer.shapeType === "star") {
    createStarPath(context, x + width / 2, y + height / 2, Math.min(width, height) / 2, Math.min(width, height) / 4);
    context.fill();
    return;
  }

  if (layer.shapeType === "arrow") {
    context.beginPath();
    context.moveTo(x, y + height * 0.36);
    context.lineTo(x + width * 0.62, y + height * 0.36);
    context.lineTo(x + width * 0.62, y + height * 0.12);
    context.lineTo(x + width, y + height / 2);
    context.lineTo(x + width * 0.62, y + height * 0.88);
    context.lineTo(x + width * 0.62, y + height * 0.64);
    context.lineTo(x, y + height * 0.64);
    context.closePath();
    context.fill();
    return;
  }

  if (layer.shapeType === "line" || layer.shapeType === "dashedLine") {
    context.beginPath();
    context.setLineDash(layer.shapeType === "dashedLine" ? [18, 12] : []);
    context.moveTo(x, y + height / 2);
    context.lineTo(x + width, y + height / 2);
    context.stroke();
    context.setLineDash([]);
    return;
  }

  if (layer.shapeType?.includes("Frame") || layer.shapeType?.startsWith("grid")) {
    context.strokeStyle = color;
    context.strokeRect(x + strokeWidth / 2, y + strokeWidth / 2, width - strokeWidth, height - strokeWidth);
    if (layer.shapeType === "gridTwoColumns" || layer.shapeType === "gridThreeColumns") {
      const divisions = layer.shapeType === "gridTwoColumns" ? 2 : 3;
      for (let index = 1; index < divisions; index += 1) {
        const lineX = x + (width / divisions) * index;
        context.beginPath();
        context.moveTo(lineX, y);
        context.lineTo(lineX, y + height);
        context.stroke();
      }
    }
    if (layer.shapeType === "gridTwoRows" || layer.shapeType === "gridThreeRows") {
      const divisions = layer.shapeType === "gridTwoRows" ? 2 : 3;
      for (let index = 1; index < divisions; index += 1) {
        const lineY = y + (height / divisions) * index;
        context.beginPath();
        context.moveTo(x, lineY);
        context.lineTo(x + width, lineY);
        context.stroke();
      }
    }
    if (layer.shapeType === "gridFour") {
      context.beginPath();
      context.moveTo(x + width / 2, y);
      context.lineTo(x + width / 2, y + height);
      context.moveTo(x, y + height / 2);
      context.lineTo(x + width, y + height / 2);
      context.stroke();
    }
    return;
  }

  if (layer.shapeType === "speechBubble") {
    context.roundRect(x, y, width, height * 0.78, 18);
    context.fill();
    context.beginPath();
    context.moveTo(x + width * 0.18, y + height * 0.76);
    context.lineTo(x + width * 0.28, y + height);
    context.lineTo(x + width * 0.42, y + height * 0.76);
    context.closePath();
    context.fill();
    return;
  }

  context.fillRect(x, y, width, height);
}

function drawTransitionOverlay(
  context: CanvasRenderingContext2D,
  layer: VideoLayer,
  canvasWidth: number,
  canvasHeight: number,
  time: number,
) {
  const progress = clamp((time - layer.start) / Math.max(layer.duration, 0.1), 0, 1);
  const middleAlpha = Math.sin(progress * Math.PI);
  const color = layer.color || "#000000";
  context.save();

  if (layer.transitionKind === "fade" || layer.transitionKind === "fadeBlack" || layer.transitionKind === "fadeWhite") {
    context.globalAlpha = (layer.opacity ?? 1) * middleAlpha * 0.92;
    context.fillStyle = layer.transitionKind === "fadeWhite" ? "#ffffff" : color;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (layer.transitionKind === "wipeLeft") {
    context.globalAlpha = (layer.opacity ?? 1) * 0.86;
    context.fillStyle = color;
    context.fillRect(0, 0, canvasWidth * progress, canvasHeight);
  } else if (layer.transitionKind === "wipeRight") {
    context.globalAlpha = (layer.opacity ?? 1) * 0.86;
    context.fillStyle = color;
    context.fillRect(canvasWidth * (1 - progress), 0, canvasWidth * progress, canvasHeight);
  } else if (layer.transitionKind === "slideLeft") {
    const gradient = context.createLinearGradient(canvasWidth * (1 - progress), 0, canvasWidth, 0);
    gradient.addColorStop(0, `${color}00`);
    gradient.addColorStop(1, color);
    context.globalAlpha = (layer.opacity ?? 1) * 0.78;
    context.fillStyle = gradient;
    context.fillRect(canvasWidth * (1 - progress), 0, canvasWidth, canvasHeight);
  } else if (layer.transitionKind === "slideRight") {
    const gradient = context.createLinearGradient(0, 0, canvasWidth * progress, 0);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}00`);
    context.globalAlpha = (layer.opacity ?? 1) * 0.78;
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvasWidth * progress, canvasHeight);
  } else if (layer.transitionKind === "zoomFlash") {
    const radius = Math.max(canvasWidth, canvasHeight) * (0.2 + progress);
    const gradient = context.createRadialGradient(canvasWidth / 2, canvasHeight / 2, radius * 0.1, canvasWidth / 2, canvasHeight / 2, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}00`);
    context.globalAlpha = (layer.opacity ?? 1) * middleAlpha * 0.9;
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  context.restore();
}

function isBridgeTransitionActive(layer: VideoLayer, time: number) {
  return layer.type === "transition"
    && layer.visible
    && Boolean(layer.fromLayerId)
    && Boolean(layer.toLayerId)
    && time >= layer.start
    && time <= getLayerEnd(layer);
}

function getActiveBridgeTransitionForLayer(layer: VideoLayer, transitions: VideoLayer[], time: number) {
  return transitions.find((transition) => (
    isBridgeTransitionActive(transition, time)
    && (transition.fromLayerId === layer.id || transition.toLayerId === layer.id)
  ));
}

function getSupportedExportType() {
  const exportTypes = [
    { mimeType: "video/mp4;codecs=h264", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];

  return exportTypes.find((type) => MediaRecorder.isTypeSupported(type.mimeType)) || exportTypes.at(-1)!;
}

function applyLayerTransform(context: CanvasRenderingContext2D, layer: VideoLayer, x: number, y: number, width: number, height: number) {
  context.translate(x + width / 2, y + height / 2);
  context.rotate(((layer.angle || 0) * Math.PI) / 180);
  context.scale(layer.isFlippedH ? -1 : 1, layer.isFlippedV ? -1 : 1);
  context.translate(-width / 2, -height / 2);
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function getLayerEnd(layer: VideoLayer) {
  return layer.start + layer.duration;
}

function getLayerSourceStart(layer: VideoLayer) {
  return Math.max(0, layer.sourceStart ?? layer.trimStart ?? 0);
}

function isTrackBlockingClip(layer: VideoLayer) {
  return layer.type !== "audio" && layer.type !== "transition";
}

function sortClipsByTime(clips: VideoLayer[]) {
  return [...clips].sort((first, second) => first.start - second.start || getLayerEnd(first) - getLayerEnd(second));
}

function orderLayersByTrackAndTime(layers: VideoLayer[]) {
  const trackIds = Array.from(new Set(layers.map((layer) => layer.trackId || layer.id)));
  return trackIds.flatMap((trackId) => sortClipsByTime(layers.filter((layer) => (layer.trackId || layer.id) === trackId)));
}

function findNearestFreeStart(
  layers: VideoLayer[],
  trackId: string,
  duration: number,
  desiredStart: number,
  movingLayerId?: string,
) {
  const safeDuration = Math.max(0.05, duration);
  const desired = Math.max(0, desiredStart);
  const clips = sortClipsByTime(layers.filter((layer) => (
    (layer.trackId || layer.id) === trackId
    && layer.id !== movingLayerId
    && isTrackBlockingClip(layer)
  )));

  const overlaps = (start: number) => clips.some((clip) => start < getLayerEnd(clip) && start + safeDuration > clip.start);
  if (!overlaps(desired)) return Number(desired.toFixed(3));

  const candidates: number[] = [];
  let gapStart = 0;
  for (const clip of clips) {
    if (clip.start - gapStart >= safeDuration) {
      candidates.push(clamp(desired, gapStart, clip.start - safeDuration));
    }
    gapStart = Math.max(gapStart, getLayerEnd(clip));
  }
  candidates.push(gapStart);

  return Number(candidates.sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired))[0].toFixed(3));
}

function getTrackNeighborBounds(layers: VideoLayer[], layer: VideoLayer) {
  const trackId = layer.trackId || layer.id;
  const clips = sortClipsByTime(layers.filter((item) => (
    (item.trackId || item.id) === trackId
    && item.id !== layer.id
    && isTrackBlockingClip(item)
  )));

  const previous = [...clips].reverse().find((item) => getLayerEnd(item) <= layer.start);
  const next = clips.find((item) => item.start >= getLayerEnd(layer));
  return {
    previousEnd: previous ? getLayerEnd(previous) : 0,
    nextStart: next ? next.start : Number.POSITIVE_INFINITY,
  };
}

function getInitialMediaBox(asset?: MediaAsset) {
  const naturalWidth = asset?.kind === "image"
    ? (asset.image?.naturalWidth ?? 0)
    : asset?.kind === "video"
      ? (asset.video?.videoWidth ?? 0)
      : 0;
  const naturalHeight = asset?.kind === "image"
    ? (asset.image?.naturalHeight ?? 0)
    : asset?.kind === "video"
      ? (asset.video?.videoHeight ?? 0)
      : 0;
  const ratio = naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 16 / 9;
  const width = 40;
  const height = clamp(width / ratio, 16, 56);

  return {
    x: Number(((100 - width) / 2).toFixed(2)),
    y: Number(((100 - height) / 2).toFixed(2)),
    width,
    height: Number(height.toFixed(2)),
  };
}

function formatTimelineClock(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const totalSeconds = Math.floor(safeSeconds);
  const frames = Math.floor((safeSeconds - totalSeconds) * 100);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(frames).padStart(2, "0")}`;
}

function formatTimecode(seconds: number, fps = 30) {
  const safeSeconds = Math.max(0, seconds);
  const totalSeconds = Math.floor(safeSeconds);
  const frames = Math.min(fps - 1, Math.floor((safeSeconds - totalSeconds) * fps));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatBitrate(bitsPerSecond?: number) {
  if (!bitsPerSecond || bitsPerSecond <= 0) return "";
  if (bitsPerSecond >= 1_000_000) return `${(bitsPerSecond / 1_000_000).toFixed(1)} Mbps`;
  return `${Math.round(bitsPerSecond / 1000)} kbps`;
}

function getMediaMetadataRows(metadata?: PixoresMediaMetadata) {
  if (!metadata) return [];
  const rows: Array<[string, string]> = [];
  if (metadata.width && metadata.height) rows.push(["Size", `${metadata.width}x${metadata.height}`]);
  if (metadata.duration) rows.push(["Duration", formatTimecode(metadata.duration)]);
  if (metadata.fps) rows.push(["FPS", `${metadata.fps}`]);
  if (metadata.codec) rows.push(["Video", metadata.codec.toUpperCase()]);
  if (metadata.audioCodec) rows.push(["Audio", metadata.audioCodec.toUpperCase()]);
  if (metadata.bitrate) rows.push(["Bitrate", formatBitrate(metadata.bitrate)]);
  if (metadata.imageFormat) rows.push(["Image", metadata.imageFormat.toUpperCase()]);
  if (metadata.colorSpace) rows.push(["Color", metadata.colorSpace]);
  rows.push(["Analyzer", metadata.analyzer]);
  return rows;
}

function getAspectRatioLabel(width: number, height: number) {
  const divisor = gcd(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function VideoMaker() {
  const adapters = useMemo(() => getVideoMakerAdapters(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const mediaPreviewRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const mediaAssetsRef = useRef<Map<string, MediaAsset>>(new Map());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const clipEditRef = useRef<ClipEditState | null>(null);
  const stageEditRef = useRef<StageEditState | null>(null);
  const layoutResizeRef = useRef<LayoutResizeState | null>(null);
  const canvasResizeRef = useRef<CanvasResizeState | null>(null);
  const layersRef = useRef<VideoLayer[]>(initialLayers);
  const isDraggingPlayheadRef = useRef(false);
  const [layers, setLayers] = useState<VideoLayer[]>(initialLayers);
  const [history, setHistory] = useState<LayerHistory>({ past: [], future: [] });
  const [imports, setImports] = useState<ImportedAsset[]>([]);
  const [importSearch, setImportSearch] = useState("");
  const [importKindFilter, setImportKindFilter] = useState<ImportKindFilter>("all");
  const [selectedImportId, setSelectedImportId] = useState("");
  const [mediaPreviewTime, setMediaPreviewTime] = useState(0);
  const [mediaPreviewDuration, setMediaPreviewDuration] = useState(0);
  const [isMediaPreviewPlaying, setIsMediaPreviewPlaying] = useState(false);
  const [mediaPreviewVolume, setMediaPreviewVolume] = useState(1);
  const [isMediaPreviewMuted, setIsMediaPreviewMuted] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [emptyTracks, setEmptyTracks] = useState<EmptyTrack[]>([]);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [clipDragPreview, setClipDragPreview] = useState<ClipDragPreview | null>(null);
  const [activePanel, setActivePanel] = useState<SidebarPanel>("imports");
  const [activeElementTab, setActiveElementTab] = useState<ElementPanelTab>("assets");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [formatIndex, setFormatIndex] = useState(5);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [timelineDuration, setTimelineDuration] = useState(6);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [background, setBackground] = useState("#0f172a");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [masterVolume, setMasterVolume] = useState(1);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [exportFileName, setExportFileName] = useState("pixores-video.mp4");
  const [serverExportFormatId, setServerExportFormatId] = useState<PixoresVideoExportFormatId>(PIXORES_DEFAULT_VIDEO_EXPORT_FORMAT_ID);
  const [status, setStatus] = useState("Ready");
  const [isPreparingServerRender, setIsPreparingServerRender] = useState(false);
  const [serverRenderId, setServerRenderId] = useState("");
  const [serverRenderProgress, setServerRenderProgress] = useState(0);
  const [serverRenderUrl, setServerRenderUrl] = useState("");
  const [projectTitle, setProjectTitle] = useState("Untitled video");
  const [cloudProjects, setCloudProjects] = useState<CloudVideoProject[]>([]);
  const [currentCloudProjectId, setCurrentCloudProjectId] = useState("");
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [sidePanelWidth, setSidePanelWidth] = useState(300);
  const [timelineHeight, setTimelineHeight] = useState(240);
  const [manualCanvasWidth, setManualCanvasWidth] = useState<number | null>(null);
  const [canvasZoom, setCanvasZoom] = useState("fit");
  const [markInTime, setMarkInTime] = useState<number | null>(null);
  const [markOutTime, setMarkOutTime] = useState<number | null>(null);
  const selectedFormat = useMemo(() => {
    const selectedPreset = formats[formatIndex] || formats[5];
    return selectedPreset.id === "custom"
      ? { ...selectedPreset, width: customWidth, height: customHeight }
      : selectedPreset;
  }, [customHeight, customWidth, formatIndex]);
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
  const selectedImport = imports.find((item) => item.id === selectedImportId) || imports[0];
  const contentTimelineDuration = useMemo(
    () => layers.reduce((duration, layer) => Math.max(duration, getLayerEnd(layer)), 0),
    [layers],
  );
  const effectiveTimelineDuration = layers.length > 0
    ? Math.max(contentTimelineDuration, 0.05)
    : Math.max(timelineDuration, 1);
  const selectedServerExportFormat = getPixoresVideoExportFormat(serverExportFormatId);
  const projectAspectLabel = useMemo(
    () => getAspectRatioLabel(selectedFormat.width, selectedFormat.height),
    [selectedFormat.height, selectedFormat.width],
  );
  const projectStats = useMemo(() => ({
    tracks: new Set(layers.filter((layer) => layer.type !== "transition").map((layer) => layer.trackId || layer.id)).size,
    media: layers.filter((layer) => layer.type === "media").length,
    audio: layers.filter((layer) => layer.type === "audio").length,
    text: layers.filter((layer) => layer.type === "text").length,
    transitions: layers.filter((layer) => layer.type === "transition").length,
  }), [layers]);
  const filteredImports = useMemo(() => {
    const query = importSearch.trim().toLowerCase();
    return imports.filter((item) => (
      (importKindFilter === "all" || item.kind === importKindFilter)
      && (!query || item.name.toLowerCase().includes(query))
    ));
  }, [importKindFilter, importSearch, imports]);
  const trackGroups = useMemo(() => {
    const groups: Array<{ trackId: string; name: string; clips: VideoLayer[]; emptyTrack?: EmptyTrack }> = [];
    for (const track of emptyTracks) {
      groups.push({ trackId: track.id, name: track.name, clips: [], emptyTrack: track });
    }
    for (const layer of layers) {
      if (layer.type === "transition") continue;
      const trackId = layer.trackId || layer.id;
      const group = groups.find((item) => item.trackId === trackId);
      if (group) group.clips.push(layer);
      else groups.push({ trackId, name: layer.name, clips: [layer] });
    }
    return groups.map((group) => ({ ...group, clips: sortClipsByTime(group.clips) }));
  }, [emptyTracks, layers]);
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const visibleStageLayers = layers.filter((layer) => (
    layer.visible
    && layer.type !== "audio"
    && layer.type !== "transition"
    && currentTime >= layer.start
    && currentTime <= getLayerEnd(layer)
  ));

  const canvasStyle = useMemo(() => {
    const ratio = selectedFormat.width / selectedFormat.height;
    const availableWidth = Math.max(240, previewSize.width > 0 ? previewSize.width - 28 : 1120);
    const availableHeight = Math.max(180, previewSize.height > 0 ? previewSize.height - 32 : 720);
    const fitWidth = Math.min(availableWidth, availableHeight * ratio);
    const zoomScale = canvasZoom === "fit" ? 1 : Number(canvasZoom) / 100;
    const displayWidth = manualCanvasWidth ?? clamp(fitWidth * zoomScale, 180, 1800);
    const displayHeight = displayWidth / ratio;

    return {
      width: `${displayWidth}px`,
      height: `${displayHeight}px`,
      aspectRatio: `${selectedFormat.width} / ${selectedFormat.height}`,
    };
  }, [canvasZoom, manualCanvasWidth, previewSize.height, previewSize.width, selectedFormat.height, selectedFormat.width]);

  const timelineInnerStyle = useMemo(
    () => ({ width: `${Math.round(timelineZoom * 100)}%` }),
    [timelineZoom],
  );

  const timelineMarks = useMemo(() => {
    const step = timelineZoom >= 2 ? 0.5 : 1;
    const count = Math.floor(effectiveTimelineDuration / step) + 1;
    return Array.from({ length: count }, (_, index) => Number((index * step).toFixed(1)));
  }, [effectiveTimelineDuration, timelineZoom]);

  const drawScene = useCallback((context: CanvasRenderingContext2D, time: number) => {
    const canvas = context.canvas;
    const width = selectedFormat.width;
    const height = selectedFormat.height;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    const bridgeTransitions = layers.filter((layer) => isBridgeTransitionActive(layer, time));

    const drawMediaLayerAtTime = (
      layer: VideoLayer,
      layerTime: number,
      opacity = 1,
      clip?: { x: number; y: number; width: number; height: number },
      translateX = 0,
      scale = 1,
    ) => {
      if (layer.type !== "media") return;
      const asset = mediaAssetsRef.current.get(layer.assetKey || layer.id);
      if (!asset) return;

      const x = (layer.x / 100) * width;
      const y = (layer.y / 100) * height;
      const layerWidth = (layer.width / 100) * width;
      const layerHeight = (layer.height / 100) * height;
      context.save();
      if (clip) {
        context.beginPath();
        context.rect(clip.x, clip.y, clip.width, clip.height);
        context.clip();
      }
      context.globalAlpha = (layer.opacity ?? 1) * opacity;
      applyLayerTransform(context, layer, x + translateX, y, layerWidth, layerHeight);
      if (scale !== 1) {
        context.translate(layerWidth / 2, layerHeight / 2);
        context.scale(scale, scale);
        context.translate(-layerWidth / 2, -layerHeight / 2);
      }
      if (layer.blur) context.filter = `blur(${layer.blur}px)`;
      if (layer.blendMode && layer.blendMode !== "normal") context.globalCompositeOperation = layer.blendMode;
      if (layer.borderRadius) {
        context.beginPath();
        context.roundRect(0, 0, layerWidth, layerHeight, layer.borderRadius);
        context.clip();
      }

      if (asset.kind === "image" && asset.image?.complete) {
        drawLayerMedia(context, asset.image, asset.image.naturalWidth, asset.image.naturalHeight, layer, layerWidth, layerHeight);
      }

      if (asset.kind === "video" && asset.video && asset.video.readyState >= 2) {
        const localTime = clamp(layerTime - layer.start, 0, Math.max(0.1, layer.duration));
        const sourceTime = getLayerSourceStart(layer) + localTime;
        if (Number.isFinite(asset.video.duration) && Math.abs(asset.video.currentTime - sourceTime) > 0.28) {
          asset.video.currentTime = Math.min(sourceTime, Math.max(0, asset.video.duration - 0.05));
        }
        drawLayerMedia(context, asset.video, asset.video.videoWidth || width, asset.video.videoHeight || height, layer, layerWidth, layerHeight);
      }

      if ((layer.strokeWidth || 0) > 0) {
        context.strokeStyle = layer.strokeColor || "#ffffff";
        context.lineWidth = layer.strokeWidth || 0;
        context.strokeRect(0, 0, layerWidth, layerHeight);
      }
      context.restore();
    };

    for (const layer of [...layers].reverse()) {
      const active = layer.visible && time >= layer.start && time <= getLayerEnd(layer);
      if (!active) continue;
      if (layer.type === "transition") continue;
      if (getActiveBridgeTransitionForLayer(layer, bridgeTransitions, time)) continue;

      const x = (layer.x / 100) * width;
      const y = (layer.y / 100) * height;
      const layerWidth = (layer.width / 100) * width;
      const layerHeight = (layer.height / 100) * height;
      context.save();
      context.globalAlpha = layer.opacity;
      applyLayerTransform(context, layer, x, y, layerWidth, layerHeight);
      if (layer.blur) context.filter = `blur(${layer.blur}px)`;
      if (layer.blendMode && layer.blendMode !== "normal") context.globalCompositeOperation = layer.blendMode;

      if (layer.type === "media") {
        context.restore();
        drawMediaLayerAtTime(layer, time);
        continue;
      }

      if (layer.type === "text") {
        const fontSize = Math.max(18, Math.round((layer.fontSize || 48) * (width / 1280)));
        const fontStyle = layer.isItalic ? "italic" : "normal";
        const fontWeight = layer.isBold === false ? "500" : "900";
        context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${layer.fontFamily || "Arial"}, Arial, sans-serif`;
        context.fillStyle = layer.color || "#ffffff";
        context.textBaseline = "top";
        context.shadowColor = layer.shadowColor || "rgba(0, 0, 0, 0.36)";
        context.shadowBlur = layer.shadowBlur ?? Math.round(fontSize * 0.22);
        context.shadowOffsetX = layer.shadowOffsetX || 0;
        context.shadowOffsetY = layer.shadowOffsetY || 0;
        const textValue = layer.isUppercase ? (layer.text || "").toUpperCase() : layer.text || "";
        const lines = wrapText(context, textValue, layerWidth).slice(0, 4).map((line) => (layer.hasBullets ? `• ${line.replace(/^•\s?/, "")}` : line));
        const align = layer.textAlign || "left";
        context.textAlign = align;
        const textX = align === "center" ? layerWidth / 2 : align === "right" ? layerWidth : 0;
        if (layer.hasTextBg) {
          context.save();
          context.shadowBlur = 0;
          context.fillStyle = layer.textBgColor || "#000000";
          const padding = layer.textBgPadding || 8;
          context.fillRect(-padding, -padding, layerWidth + padding * 2, lines.length * fontSize * (layer.lineHeight || 1.08) + padding * 2);
          context.restore();
        }
        lines.forEach((line, index) => {
          const lineY = index * fontSize * (layer.lineHeight || 1.08);
          if ((layer.strokeWidth || 0) > 0) {
            context.strokeStyle = layer.strokeColor || "#000000";
            context.lineWidth = layer.strokeWidth || 0;
            context.strokeText(line, textX, lineY);
          }
          if ((layer.glowRadius || 0) > 0) {
            context.save();
            context.shadowColor = layer.glowColor || "#ffff00";
            context.shadowBlur = layer.glowRadius || 0;
            context.fillText(line, textX, lineY);
            context.restore();
          }
          context.fillText(line, textX, lineY);
          if (layer.isUnderline || layer.isStrikethrough) {
            const measuredWidth = context.measureText(line).width;
            const lineStart = align === "center" ? textX - measuredWidth / 2 : align === "right" ? textX - measuredWidth : textX;
            if (layer.isUnderline) context.fillRect(lineStart, lineY + fontSize * 0.96, measuredWidth, Math.max(2, fontSize * 0.05));
            if (layer.isStrikethrough) context.fillRect(lineStart, lineY + fontSize * 0.52, measuredWidth, Math.max(2, fontSize * 0.045));
          }
        });
        context.shadowBlur = 0;
      }

      if (layer.type === "shape") {
        drawShape(context, layer, 0, 0, layerWidth, layerHeight);
      }

      context.restore();
    }

    bridgeTransitions.forEach((layer) => {
      const fromLayer = layers.find((item) => item.id === layer.fromLayerId);
      const toLayer = layers.find((item) => item.id === layer.toLayerId);
      if (!fromLayer || !toLayer || !isTransitionCompatibleClip(fromLayer) || !isTransitionCompatibleClip(toLayer)) return;

      const rawProgress = clamp((time - layer.start) / Math.max(layer.duration, 0.1), 0, 1);
      const progress = applyTransitionEasing(rawProgress, layer.easing);
      const transitionKind = layer.transitionKind || "fade";
      const fromTime = time;
      const toTime = Math.max(toLayer.start, time);

      if (transitionKind === "wipeLeft" || transitionKind === "wipeRight") {
        drawMediaLayerAtTime(fromLayer, fromTime);
        const revealWidth = width * progress;
        const clip = transitionKind === "wipeLeft"
          ? { x: 0, y: 0, width: revealWidth, height }
          : { x: width - revealWidth, y: 0, width: revealWidth, height };
        drawMediaLayerAtTime(toLayer, toTime, 1, clip);
        return;
      }

      if (transitionKind === "slideLeft" || transitionKind === "slideRight") {
        const direction = transitionKind === "slideLeft" ? 1 : -1;
        drawMediaLayerAtTime(fromLayer, fromTime, 1, undefined, -direction * progress * width);
        drawMediaLayerAtTime(toLayer, toTime, 1, undefined, direction * (1 - progress) * width);
        return;
      }

      if (transitionKind === "zoomFlash") {
        drawMediaLayerAtTime(fromLayer, fromTime, 1 - progress, undefined, 0, 1 + progress * 0.08);
        drawMediaLayerAtTime(toLayer, toTime, progress, undefined, 0, 1.08 - progress * 0.08);
        drawTransitionOverlay(context, layer, width, height, time);
        return;
      }

      drawMediaLayerAtTime(fromLayer, fromTime, 1 - progress);
      drawMediaLayerAtTime(toLayer, toTime, progress);
    });

    layers
      .filter((layer) => (
        layer.type === "transition"
        && layer.visible
        && !layer.fromLayerId
        && !layer.toLayerId
        && time >= layer.start
        && time <= getLayerEnd(layer)
      ))
      .forEach((layer) => drawTransitionOverlay(context, layer, width, height, time));
  }, [background, layers, selectedFormat.height, selectedFormat.width]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    const media = mediaPreviewRef.current;
    if (!media) return;
    media.volume = mediaPreviewVolume;
    media.muted = isMediaPreviewMuted;
  }, [isMediaPreviewMuted, mediaPreviewVolume, selectedImportId]);

  useEffect(() => {
    const previewPanel = previewPanelRef.current;
    if (!previewPanel) return;

    const updatePreviewSize = () => {
      const rect = previewPanel.getBoundingClientRect();
      setPreviewSize({ width: rect.width, height: rect.height });
    };

    updatePreviewSize();
    const resizeObserver = new ResizeObserver(updatePreviewSize);
    resizeObserver.observe(previewPanel);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    layers.forEach((layer) => {
      if (layer.type === "text") ensureVideoMakerFontLoaded(layer.fontFamily);
    });
  }, [layers]);

  useEffect(() => {
    mediaAssetsRef.current.forEach((asset, assetId) => {
      if (asset.kind !== "video" || !asset.video) return;
      const assetLayers = layers.filter((layer) => layer.assetKey === assetId);
      const audioLayers = layers.filter((layer) => layer.type === "audio" && layer.assetKey === assetId);
      const activeAudioVolumes = audioLayers
        .filter((layer) => layer.visible && currentTime >= layer.start && currentTime <= getLayerEnd(layer))
        .map((layer) => layer.volume ?? 1);
      const activeMediaLayer = assetLayers.some((layer) => layer.type === "media" && layer.visible && currentTime >= layer.start && currentTime <= getLayerEnd(layer));
      const hasSeparatedAudio = assetLayers.some((layer) => layer.type === "media" && layer.audioDetached);
      const clipVolume = activeAudioVolumes.length > 0 ? Math.max(...activeAudioVolumes) : activeMediaLayer && !hasSeparatedAudio ? 1 : 0;
      asset.video.volume = clamp(masterVolume * clipVolume, 0, 1);
      asset.video.muted = masterVolume <= 0 || clipVolume <= 0 || !isPlaying;
    });
  }, [currentTime, isPlaying, layers, masterVolume]);

  useEffect(() => {
    const assets = mediaAssetsRef.current;
    return () => {
      assets.forEach((asset) => URL.revokeObjectURL(asset.url));
    };
  }, []);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  useEffect(() => {
    const projectPayload = sessionStorage.getItem(PIXORES_VIDEO_START_PROJECT_KEY);
    const formatPayload = sessionStorage.getItem(PIXORES_VIDEO_START_FORMAT_KEY);

    sessionStorage.removeItem(PIXORES_VIDEO_START_PROJECT_KEY);
    sessionStorage.removeItem(PIXORES_VIDEO_START_FORMAT_KEY);

    const timeoutId = window.setTimeout(() => {
      if (projectPayload) {
        try {
          const payload = JSON.parse(projectPayload) as PixoresVideoStartProjectPayload;
          applyProjectJson(payload.project);
          if (payload.title) setProjectTitle(payload.title);
          setCurrentCloudProjectId("");
          setStatus(payload.filePath ? `Desktop project opened: ${payload.filePath}` : "Desktop project opened");
        } catch {
          setStatus("Desktop start project could not be loaded");
        }
        return;
      }

      if (formatPayload) {
        try {
          const payload = JSON.parse(formatPayload) as PixoresVideoStartFormatPayload;
          const nextFormatIndex = formats.findIndex((format) => format.id === payload.format.id);
          setFormatIndex(nextFormatIndex >= 0 ? nextFormatIndex : formats.findIndex((format) => format.id === "custom"));
          setCustomWidth(payload.format.width);
          setCustomHeight(payload.format.height);
          setManualCanvasWidth(null);
          setProjectTitle(payload.title || "Untitled video");
          setStatus(`New desktop project: ${payload.format.label}`);
        } catch {
          setStatus("Desktop start format could not be applied");
        }
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    drawScene(context, currentTime);
  }, [currentTime, drawScene]);

  useEffect(() => {
    if (!serverRenderId || !isPreparingServerRender) return;

    let cancelled = false;
    let timeoutId = 0;

    const pollRenderStatus = async () => {
      try {
        const payload = await adapters.renderAdapter.getRenderStatus(serverRenderId);

        const progress = Math.round(Math.max(0, Math.min(1, payload.progress || 0)) * 100);
        setServerRenderProgress(progress);

        if (payload.status === "completed") {
          const warningText = payload.warnings?.length
            ? ` Warning: ${payload.warnings[0]}${payload.warnings.length > 1 ? ` (+${payload.warnings.length - 1} more)` : ""}`
            : "";
          if (payload.outputUrl) setServerRenderUrl(payload.outputUrl);
          setStatus(`${adapters.isDesktop ? "Desktop local" : "Render Server"} ${selectedServerExportFormat.label}: completed (${progress}%).${warningText}`);
          setIsPreparingServerRender(false);
          return;
        }

        if (payload.status === "failed") {
          setStatus(`${adapters.isDesktop ? "Desktop render" : "Render Server"} failed: ${payload.error || "Render failed"}`);
          setIsPreparingServerRender(false);
          return;
        }

        setStatus(`${adapters.isDesktop ? "Desktop local" : "Render Server"} ${selectedServerExportFormat.label}: ${payload.status || "queued"} ${progress}%`);
      } catch (error) {
        setStatus(`${adapters.isDesktop ? "Desktop render" : "Render Server"} error: ${error instanceof Error ? error.message : "Status request failed"}`);
        setIsPreparingServerRender(false);
        return;
      }

      if (!cancelled) timeoutId = window.setTimeout(pollRenderStatus, 1500);
    };

    void pollRenderStatus();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [adapters.isDesktop, adapters.renderAdapter, isPreparingServerRender, selectedServerExportFormat.label, serverRenderId]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resize = layoutResizeRef.current;
      if (resize) {
        if (resize.mode === "sidebar") {
          const nextWidth = clamp(resize.initialSidebarWidth + event.clientX - resize.startX, 220, 520);
          setSidePanelWidth(nextWidth);
        } else {
          const nextHeight = clamp(resize.initialTimelineHeight - (event.clientY - resize.startY), 210, 460);
          setTimelineHeight(nextHeight);
        }
      }

      const canvasResize = selectedLayerId ? null : canvasResizeRef.current;
      if (canvasResize) {
        const ratio = selectedFormat.width / selectedFormat.height;
        const deltaX = event.clientX - canvasResize.startX;
        const deltaY = event.clientY - canvasResize.startY;
        const edge = canvasResize.edge;
        const horizontalDelta = edge.includes("Right") || edge === "right"
          ? deltaX
          : edge.includes("Left") || edge === "left"
            ? -deltaX
            : 0;
        const verticalDelta = edge.includes("bottom") || edge === "bottom"
          ? deltaY * ratio
          : edge.includes("top") || edge === "top"
            ? -deltaY * ratio
            : 0;
        const nextWidth = clamp(canvasResize.initialWidth + horizontalDelta + verticalDelta, 360, 2200);
        setManualCanvasWidth(nextWidth);
      }
    };

    const handlePointerUp = () => {
      layoutResizeRef.current = null;
      canvasResizeRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [selectedFormat.height, selectedFormat.width, selectedLayerId]);

  useEffect(() => {
    if (!isPlaying || isRecording) return;
    let animationFrame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - previous) / 1000;
      previous = now;
      setCurrentTime((value) => {
        const next = value + elapsed;
        if (next >= effectiveTimelineDuration) {
          setIsPlaying(false);
          return effectiveTimelineDuration;
        }
        return next;
      });
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [effectiveTimelineDuration, isPlaying, isRecording]);

  useEffect(() => {
    setCurrentTime((value) => (
      value > effectiveTimelineDuration ? effectiveTimelineDuration : value
    ));
  }, [effectiveTimelineDuration]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || (target instanceof HTMLElement && target.isContentEditable);

      if (!isTyping && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        deleteSelectedLayer();
        return;
      }

      const modifierPressed = event.ctrlKey || event.metaKey;
      if (!modifierPressed) return;

      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (key === "z") {
        event.preventDefault();
        undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      } else if (key === "v") {
        event.preventDefault();
        void pasteFromClipboard();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function pushHistorySnapshot(snapshot = layersRef.current) {
    setHistory((current) => ({
      past: [...current.past, snapshot].slice(-60),
      future: [],
    }));
  }

  function commitLayers(updater: (current: VideoLayer[]) => VideoLayer[]) {
    setLayers((current) => {
      const next = updater(current);
      if (next === current) return current;
      setHistory((historyState) => ({
        past: [...historyState.past, current].slice(-60),
        future: [],
      }));
      return next;
    });
  }

  function undo() {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      const nextPast = current.past.slice(0, -1);
      setLayers(previous);
      setSelectedLayerId(previous[0]?.id || "");
      return {
        past: nextPast,
        future: [layersRef.current, ...current.future].slice(0, 60),
      };
    });
    setStatus("Undo");
  }

  function redo() {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      setLayers(next);
      setSelectedLayerId(next[0]?.id || "");
      return {
        past: [...current.past, layersRef.current].slice(-60),
        future: current.future.slice(1),
      };
    });
    setStatus("Redo");
  }

  function updateLayer(id: string, patch: Partial<VideoLayer>) {
    commitLayers((current) => current.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)));
  }

  function updateLayerAnimation(layer: VideoLayer, patch: Omit<Partial<LayerAnimation>, "type"> & { type?: LayerAnimationType | "" }) {
    if (patch.type === "") {
      updateLayer(layer.id, { animations: [] });
      return;
    }

    const currentAnimation = layer.animations?.[0] || {
      id: `animation-${Date.now()}`,
      type: "fadeIn" as LayerAnimationType,
      start: 0,
      duration: 0.6,
    };
    updateLayer(layer.id, {
      animations: [{
        ...currentAnimation,
        ...patch,
        type: (patch.type || currentAnimation.type) as LayerAnimationType,
        start: clamp(Number(patch.start ?? currentAnimation.start), 0, Math.max(0, layer.duration - 0.05)),
        duration: clamp(Number(patch.duration ?? currentAnimation.duration), 0.05, Math.max(0.05, layer.duration)),
      }],
    });
  }

  function getLayerKeyframeValue(layer: VideoLayer, property: KeyframeProperty) {
    if (property === "x") return layer.x;
    if (property === "y") return layer.y;
    if (property === "width") return layer.width;
    if (property === "height") return layer.height;
    if (property === "opacity") return layer.opacity;
    if (property === "angle") return layer.angle || 0;
    return 1;
  }

  function addLayerKeyframe(layer: VideoLayer, property: KeyframeProperty = "x") {
    const keyframe: LayerKeyframe = {
      id: `keyframe-${Date.now()}`,
      time: clamp(Number((currentTime - layer.start).toFixed(2)), 0, Math.max(0, layer.duration)),
      property,
      value: getLayerKeyframeValue(layer, property),
      easing: "easeInOut",
    };

    updateLayer(layer.id, {
      keyframes: [...(layer.keyframes || []), keyframe].sort((a, b) => a.time - b.time),
    });
    setStatus("Keyframe added");
  }

  function deleteLayerKeyframe(layer: VideoLayer, keyframeId: string) {
    updateLayer(layer.id, {
      keyframes: (layer.keyframes || []).filter((keyframe) => keyframe.id !== keyframeId),
    });
    setStatus("Keyframe deleted");
  }

  function beginLayoutResize(event: ReactPointerEvent<HTMLElement>, mode: LayoutResizeState["mode"]) {
    event.preventDefault();
    layoutResizeRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialSidebarWidth: sidePanelWidth,
      initialTimelineHeight: timelineHeight,
    };
    document.body.style.cursor = mode === "sidebar" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }

  function beginCanvasResize(event: ReactPointerEvent<HTMLElement>, edge: CanvasResizeEdge) {
    event.preventDefault();
    event.stopPropagation();
    if (selectedLayerId) {
      canvasResizeRef.current = null;
      return;
    }
    const currentWidth = manualCanvasWidth ?? (Number.parseFloat(String(canvasStyle.width)) || 720);
    canvasResizeRef.current = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      initialWidth: currentWidth,
    };
    const cursorMap: Record<CanvasResizeEdge, string> = {
      left: "ew-resize",
      right: "ew-resize",
      top: "ns-resize",
      bottom: "ns-resize",
      topLeft: "nwse-resize",
      bottomRight: "nwse-resize",
      topRight: "nesw-resize",
      bottomLeft: "nesw-resize",
    };
    document.body.style.cursor = cursorMap[edge];
    document.body.style.userSelect = "none";
  }

  function startCanvasResize(event: ReactPointerEvent<HTMLElement>, edge: CanvasResizeEdge) {
    beginCanvasResize(event, edge);
  }

  function startLayerResize(event: ReactPointerEvent<HTMLElement>, layer: VideoLayer, edge: CanvasResizeEdge) {
    beginStageEdit(event, layer, "resize", edge);
  }

  function openSettingsPanel() {
    setActivePanel("settings");
    setIsSidebarOpen(true);
  }

  function createCurrentProject() {
    return buildPixoresProject({
      canvas: {
        width: selectedFormat.width,
        height: selectedFormat.height,
      },
      duration: effectiveTimelineDuration,
      background,
      layers,
      assets: imports.map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        url: item.url,
        persistentUrl: item.persistentUrl,
        uploadStatus: item.uploadStatus,
        duration: item.duration,
        metadata: item.metadata,
      })),
      format: selectedFormat,
    });
  }

  function validateProjectForServer(project: PixoresVideoProject) {
    if (!Number.isFinite(project.duration) || project.duration <= 0) return "Project duration is required";
    if (!Number.isFinite(project.canvas.width) || project.canvas.width <= 0) return "Canvas width must be valid";
    if (!Number.isFinite(project.canvas.height) || project.canvas.height <= 0) return "Canvas height must be valid";
    if (!Array.isArray(project.layers)) return "Project layers must be an array";
    if (!Array.isArray(project.assets)) return "Project assets must be an array";
    return "";
  }

  async function prepareServerRenderMp4() {
    const project = createCurrentProject();
    const validationError = validateProjectForServer(project);
    if (validationError) {
      setStatus(`Render Server error: ${validationError}`);
      return;
    }

    setIsPreparingServerRender(true);
    setServerRenderId("");
    setServerRenderProgress(0);
    setServerRenderUrl("");
    setStatus(`${adapters.isDesktop ? "Desktop local" : "Render Server"} ${selectedServerExportFormat.label}: queueing job...`);

    try {
      const payload = await adapters.renderAdapter.startRender(project, { outputFormatId: selectedServerExportFormat.id });
      if (!payload.renderId) throw new Error("Render adapter did not return a renderId");

      setServerRenderId(payload.renderId);
      setServerRenderProgress(Math.round(Math.max(0, Math.min(1, payload.progress || 0)) * 100));
      setStatus(`${adapters.isDesktop ? "Desktop local" : "Render Server"} ${selectedServerExportFormat.label}: ${payload.status || "queued"} (${payload.renderId})`);
    } catch (error) {
      setStatus(`Render Server error: ${error instanceof Error ? error.message : "Request failed"}`);
      setIsPreparingServerRender(false);
    }
  }

  function downloadProjectJson(project: PixoresVideoProject) {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pixores-project-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function saveProjectJson() {
    const project = createCurrentProject();
    localStorage.setItem("pixores-video-project", JSON.stringify(project));
    setStatus("Project JSON saved");
  }

  function exportProjectJson() {
    downloadProjectJson(createCurrentProject());
    setStatus("Project JSON exported");
  }

  async function saveDesktopProjectPackage() {
    setStatus("Saving desktop project...");

    try {
      const result = await adapters.projectPackageAdapter.saveProjectPackage({
        title: projectTitle,
        project: createCurrentProject(),
      });

      if (result.canceled) {
        setStatus("Desktop project save canceled");
        return;
      }

      setProjectTitle(result.metadata.title);
      setCurrentCloudProjectId("");
      setStatus(`Desktop project saved: ${result.filePath}`);
    } catch (error) {
      setStatus(`Desktop save error: ${error instanceof Error ? error.message : "Save failed"}`);
    }
  }

  async function openDesktopProjectPackage() {
    setStatus("Opening desktop project...");

    try {
      const result = await adapters.projectPackageAdapter.openProjectPackage();

      if (result.canceled) {
        setStatus("Desktop project open canceled");
        return;
      }

      applyProjectJson(result.project);
      setProjectTitle(result.metadata.title);
      setCurrentCloudProjectId("");
      setStatus(`Desktop project opened: ${result.filePath}`);
    } catch (error) {
      setStatus(`Desktop open error: ${error instanceof Error ? error.message : "Open failed"}`);
    }
  }

  async function loadCloudProjects() {
    setIsCloudLoading(true);
    setStatus("Loading cloud projects...");

    try {
      const response = await fetch("/api/video-maker/projects");
      const payload = await response.json().catch(() => null) as { projects?: CloudVideoProject[]; error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || `Cloud load failed with ${response.status}`);
      }

      setCloudProjects(Array.isArray(payload?.projects) ? payload.projects : []);
      setStatus("Cloud projects loaded");
    } catch (error) {
      setStatus(`Cloud load error: ${error instanceof Error ? error.message : "Request failed"}`);
    } finally {
      setIsCloudLoading(false);
    }
  }

  async function saveProjectToCloud() {
    const title = projectTitle.trim() || "Untitled video";
    const project = createCurrentProject();
    setIsCloudSaving(true);
    setStatus(currentCloudProjectId ? "Updating cloud project..." : "Saving cloud project...");

    try {
      const response = await fetch(currentCloudProjectId ? `/api/video-maker/projects/${encodeURIComponent(currentCloudProjectId)}` : "/api/video-maker/projects", {
        method: currentCloudProjectId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          project,
          thumbnail_url: null,
        }),
      });
      const payload = await response.json().catch(() => null) as { project?: CloudVideoProject; error?: string } | null;

      if (!response.ok || !payload?.project) {
        throw new Error(payload?.error || `Cloud save failed with ${response.status}`);
      }

      setProjectTitle(payload.project.title);
      setCurrentCloudProjectId(payload.project.id);
      setCloudProjects((current) => {
        const withoutSaved = current.filter((item) => item.id !== payload.project?.id);
        return [payload.project as CloudVideoProject, ...withoutSaved];
      });
      setStatus("Project saved to cloud");
    } catch (error) {
      setStatus(`Cloud save error: ${error instanceof Error ? error.message : "Request failed"}`);
    } finally {
      setIsCloudSaving(false);
    }
  }

  async function loadProjectFromCloud(projectId: string) {
    setIsCloudLoading(true);
    setStatus("Opening cloud project...");

    try {
      const response = await fetch(`/api/video-maker/projects/${encodeURIComponent(projectId)}`);
      const payload = await response.json().catch(() => null) as { project?: CloudVideoProject; error?: string } | null;

      if (!response.ok || !payload?.project) {
        throw new Error(payload?.error || `Cloud project failed with ${response.status}`);
      }

      applyProjectJson(payload.project.project);
      setProjectTitle(payload.project.title);
      setCurrentCloudProjectId(payload.project.id);
      setStatus("Cloud project loaded");
    } catch (error) {
      setStatus(`Cloud project error: ${error instanceof Error ? error.message : "Request failed"}`);
    } finally {
      setIsCloudLoading(false);
    }
  }

  async function deleteCloudProject(projectId: string) {
    setIsCloudLoading(true);
    setStatus("Deleting cloud project...");

    try {
      const response = await fetch(`/api/video-maker/projects/${encodeURIComponent(projectId)}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null) as { deleted?: boolean; error?: string } | null;

      if (!response.ok || !payload?.deleted) {
        throw new Error(payload?.error || `Cloud delete failed with ${response.status}`);
      }

      setCloudProjects((current) => current.filter((project) => project.id !== projectId));
      if (currentCloudProjectId === projectId) setCurrentCloudProjectId("");
      setStatus("Cloud project deleted");
    } catch (error) {
      setStatus(`Cloud delete error: ${error instanceof Error ? error.message : "Request failed"}`);
    } finally {
      setIsCloudLoading(false);
    }
  }

  function rebuildAssetCache(projectAssets: PixoresVideoAsset[]) {
    mediaAssetsRef.current.forEach((asset) => {
      if (asset.url.startsWith("blob:")) URL.revokeObjectURL(asset.url);
    });
    mediaAssetsRef.current.clear();

    projectAssets.forEach((asset) => {
      if (asset.kind === "video") {
        const video = document.createElement("video");
        video.src = asset.url;
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        video.crossOrigin = "anonymous";
        mediaAssetsRef.current.set(asset.id, { kind: "video", url: asset.url, persistentUrl: asset.persistentUrl || asset.url, duration: asset.duration, metadata: asset.metadata, video });
        return;
      }

      if (asset.kind === "audio") {
        const audio = document.createElement("audio");
        audio.src = asset.url;
        audio.crossOrigin = "anonymous";
        mediaAssetsRef.current.set(asset.id, { kind: "audio", url: asset.url, persistentUrl: asset.persistentUrl || asset.url, duration: asset.duration, metadata: asset.metadata, audio });
        return;
      }

      const image = new Image();
      image.src = asset.url;
      mediaAssetsRef.current.set(asset.id, { kind: "image", url: asset.url, persistentUrl: asset.persistentUrl || asset.url, duration: asset.duration, metadata: asset.metadata, image });
    });
  }

  function applyProjectJson(project: PixoresVideoProject) {
    if (project.schemaVersion !== 1) {
      setStatus("Unsupported project JSON");
      return;
    }

    const nextFormatIndex = formats.findIndex((format) => format.id === project.format.id);
    if (nextFormatIndex >= 0) setFormatIndex(nextFormatIndex);
    else setFormatIndex(formats.findIndex((format) => format.id === "custom"));
    setCustomWidth(project.canvas.width);
    setCustomHeight(project.canvas.height);
    setTimelineDuration(project.duration);
    setBackground(project.background);
    setLayers(project.layers as VideoLayer[]);
    setSelectedLayerId(project.layers[0]?.id || "");
    setSelectedTrackId(project.layers[0]?.trackId || project.layers[0]?.id || "");
    setEmptyTracks([]);
    setImports(project.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      kind: asset.kind === "video" ? "video" : asset.kind === "audio" ? "audio" : "image",
      url: asset.url,
      persistentUrl: asset.persistentUrl || asset.url,
      uploadStatus: asset.uploadStatus || "ready",
      duration: asset.duration,
      size: asset.metadata?.size,
      metadata: asset.metadata,
    })));
    rebuildAssetCache(project.assets);
    setStatus("Project JSON loaded");
  }

  async function handleProjectFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const project = JSON.parse(await file.text()) as PixoresVideoProject;
      applyProjectJson(project);
      setCurrentCloudProjectId("");
    } catch {
      setStatus("Invalid project JSON");
    }
  }

  async function toggleCanvasFullscreen() {
    const previewPanel = previewPanelRef.current;
    if (!previewPanel) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await previewPanel.requestFullscreen();
      }
    } catch {
      setStatus("Fullscreen is not available");
    }
  }

  function selectLayer(layerId: string, trackId?: string) {
    setSelectedLayerId(layerId);
    if (trackId) setSelectedTrackId(trackId);
  }

  function addEmptyTrack() {
    const id = `empty-track-${Date.now()}`;
    setEmptyTracks((current) => [{ id, name: `Track ${current.length + trackGroups.length + 1}`, visible: true }, ...current]);
    setSelectedLayerId("");
    setSelectedTrackId(id);
    setStatus("Empty track added");
  }

  function fitSelectedMediaToCanvas() {
    if (!selectedLayer || selectedLayer.type !== "media" || selectedLayer.locked) return;
    updateLayer(selectedLayer.id, { x: 0, y: 0, width: 100, height: 100, angle: 0 });
    setStatus("Selected layer fitted to canvas");
  }

  function fillSelectedMediaCanvas() {
    if (!selectedLayer || selectedLayer.type !== "media" || selectedLayer.locked) return;
    updateLayer(selectedLayer.id, { x: 0, y: 0, width: 100, height: 100, angle: 0, objectFit: "cover" });
    setStatus("Media filled canvas");
  }

  function makeSelectedMediaOverlay() {
    if (!selectedLayer || selectedLayer.type !== "media" || selectedLayer.locked) return;
    const asset = selectedLayer.assetKey ? mediaAssetsRef.current.get(selectedLayer.assetKey) : undefined;
    const box = getInitialMediaBox(asset);
    updateLayer(selectedLayer.id, { ...box, angle: 0, objectFit: "contain" });
    setStatus("Media resized as overlay layer");
  }

  function stopPlayback() {
    setIsPlaying(false);
    setCurrentTime(0);
  }

  function stepFrame(direction: -1 | 1) {
    const frameStep = 1 / 30;
    setIsPlaying(false);
    setCurrentTime((value) => clamp(value + frameStep * direction, 0, effectiveTimelineDuration));
  }

  function snapshotCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `pixores-frame-${formatTimecode(currentTime).replace(/:/g, "-")}.png`;
    link.click();
    setStatus("Snapshot saved");
  }

  function toggleMediaPreviewPlayback() {
    const media = mediaPreviewRef.current;
    if (!media) return;
    if (media.paused) {
      void media.play();
      setIsMediaPreviewPlaying(true);
    } else {
      media.pause();
      setIsMediaPreviewPlaying(false);
    }
  }

  function stopMediaPreview() {
    const media = mediaPreviewRef.current;
    if (!media) return;
    media.pause();
    media.currentTime = 0;
    setMediaPreviewTime(0);
    setIsMediaPreviewPlaying(false);
  }

  function snapshotSelectedImport() {
    if (!selectedImport) return;
    if (selectedImport.kind === "image") {
      const link = document.createElement("a");
      link.href = selectedImport.url;
      link.download = selectedImport.name.replace(/\.[^.]+$/, "") || "pixores-image";
      link.click();
      return;
    }

    const media = mediaPreviewRef.current;
    if (!(media instanceof HTMLVideoElement) || media.videoWidth <= 0 || media.videoHeight <= 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = media.videoWidth;
    canvas.height = media.videoHeight;
    canvas.getContext("2d")?.drawImage(media, 0, 0, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${selectedImport.name.replace(/\.[^.]+$/, "")}-snapshot.png`;
    link.click();
    setStatus("Media snapshot saved");
  }

  function replaceSelectedClipWithImport(item: ImportedAsset) {
    const asset = mediaAssetsRef.current.get(item.id);
    if (!asset || !selectedLayer || selectedLayer.locked) {
      setStatus("Select an unlocked clip to replace");
      return;
    }
    if (selectedLayer.type === "audio" && item.kind !== "audio") {
      setStatus("Select audio to replace an audio clip");
      return;
    }
    if (selectedLayer.type !== "audio" && item.kind === "audio") {
      setStatus("Audio cannot replace a visual clip");
      return;
    }
    updateLayer(selectedLayer.id, {
      name: item.name.replace(/\.[^.]+$/, "").slice(0, 28) || selectedLayer.name,
      src: asset.url,
      mediaKind: item.kind,
      assetKey: item.id,
      duration: Math.max(0.2, item.duration || asset.duration || selectedLayer.duration),
      sourceStart: 0,
      trimStart: 0,
      sourceEnd: undefined,
      trimEnd: undefined,
    });
    setStatus("Selected clip replaced");
  }

  function setImportAsBackground(item: ImportedAsset) {
    if (item.kind === "audio") return;
    const asset = mediaAssetsRef.current.get(item.id);
    if (!asset) return;
    const layerId = `background-${item.id}-${Date.now()}`;
    const backgroundLayer: VideoLayer = {
      id: layerId,
      trackId: `background-track-${layerId}`,
      type: "media",
      name: `Background: ${item.name.replace(/\.[^.]+$/, "").slice(0, 22)}`,
      start: 0,
      duration: Math.max(effectiveTimelineDuration, item.duration || asset.duration || 5),
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      src: asset.url,
      mediaKind: item.kind,
      assetKey: item.id,
      objectFit: item.kind === "image" ? "cover" : undefined,
      volume: item.kind === "video" ? 1 : undefined,
    };
    insertLayerAfterSelection(backgroundLayer);
    setStatus("Media set as canvas background layer");
  }

  function toggleTextBullets(layer: VideoLayer) {
    updateLayer(layer.id, { hasBullets: !layer.hasBullets });
  }

  function getClipInsertPosition(duration: number) {
    if (!selectedLayer) {
      return { trackId: selectedTrackId || `track-${Date.now()}`, start: Math.max(0, currentTime) };
    }

    const trackId = selectedLayer.trackId || selectedLayer.id;
    const desiredStart = getLayerEnd(selectedLayer);
    return {
      trackId,
      start: findNearestFreeStart(layersRef.current, trackId, duration, desiredStart),
      duration,
    };
  }

  function insertLayersAfterSelection(nextLayers: VideoLayer[]) {
    const primaryLayer = nextLayers[0];
    if (!primaryLayer) return;
    const insertEnd = Math.max(...nextLayers.map((layer) => getLayerEnd(layer)));

    commitLayers((current) => {
      const selectedIndex = current.findIndex((item) => item.id === selectedLayerId);
      const placedLayers = nextLayers.map((layer) => {
        const trackId = layer.trackId || layer.id;
        const start = isTrackBlockingClip(layer)
          ? findNearestFreeStart(current, trackId, layer.duration, layer.start, layer.id)
          : Math.max(0, layer.start);
        return { ...layer, start };
      });

      if (selectedIndex < 0) return orderLayersByTrackAndTime([...placedLayers, ...current]);
      return orderLayersByTrackAndTime([
        ...current.slice(0, selectedIndex + 1),
        ...placedLayers,
        ...current.slice(selectedIndex + 1),
      ]);
    });

    setTimelineDuration((value) => Math.max(value, Math.ceil(insertEnd)));
    setEmptyTracks((current) => current.filter((track) => !nextLayers.some((layer) => (layer.trackId || layer.id) === track.id)));
    setSelectedLayerId(primaryLayer.id);
    setSelectedTrackId(primaryLayer.trackId || primaryLayer.id);
    setActivePanel("settings");
    setIsSidebarOpen(true);
  }

  function insertLayerAfterSelection(layer: VideoLayer) {
    insertLayersAfterSelection([layer]);
  }

  function moveSelectedClipInTrack(direction: "previous" | "next") {
    const selected = layersRef.current.find((layer) => layer.id === selectedLayerId);
    if (!selected || selected.locked) return;
    const trackId = selected.trackId || selected.id;
    const trackClips = sortClipsByTime(layersRef.current.filter((layer) => (layer.trackId || layer.id) === trackId));
    const selectedIndex = trackClips.findIndex((layer) => layer.id === selected.id);
    const targetIndex = direction === "previous" ? selectedIndex - 1 : selectedIndex + 1;
    if (selectedIndex < 0 || targetIndex < 0 || targetIndex >= trackClips.length) return;

    const reordered = [...trackClips];
    const [clip] = reordered.splice(selectedIndex, 1);
    reordered.splice(targetIndex, 0, clip);
    const firstStart = Math.min(...trackClips.map((layer) => layer.start));
    let nextStart = firstStart;
    const nextStarts = new Map<string, number>();
    reordered.forEach((layer) => {
      nextStarts.set(layer.id, Number(nextStart.toFixed(2)));
      nextStart += layer.duration;
    });

    commitLayers((current) => current.map((layer) => (
      nextStarts.has(layer.id) ? { ...layer, start: nextStarts.get(layer.id) || 0 } : layer
    )));
    setTimelineDuration((value) => Math.max(value, Math.ceil(nextStart)));
    setStatus(direction === "previous" ? "Clip moved earlier" : "Clip moved later");
  }

  function getTimelineTrackAtPoint(clientX: number, clientY: number) {
    const element = document.elementFromPoint(clientX, clientY);
    const track = element?.closest("[data-timeline-track]") as HTMLElement | null;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    const trackId = track.dataset.trackId;
    if (!trackId || rect.width <= 0) return null;
    const time = clamp(((clientX - rect.left) / rect.width) * effectiveTimelineDuration, 0, effectiveTimelineDuration);
    return { trackId, rect, time };
  }

  function isTransitionCompatibleClip(layer: VideoLayer) {
    return layer.type === "media" && (layer.mediaKind === "image" || layer.mediaKind === "video");
  }

  function findTransitionCut(trackId: string, time: number, dropTolerance = 0.8) {
    const cutTolerance = 0.12;
    const clips = sortClipsByTime(layersRef.current.filter((layer) => (
      (layer.trackId || layer.id) === trackId
      && isTransitionCompatibleClip(layer)
    )));
    let bestCut: { fromLayer: VideoLayer; toLayer: VideoLayer; cutTime: number; distance: number } | null = null;

    for (let index = 0; index < clips.length - 1; index += 1) {
      const fromLayer = clips[index];
      const toLayer = clips[index + 1];
      const cutTime = getLayerEnd(fromLayer);
      const gap = Math.abs(toLayer.start - cutTime);
      const distance = Math.abs(time - cutTime);
      if (gap <= cutTolerance && distance <= dropTolerance && (!bestCut || distance < bestCut.distance)) {
        bestCut = { fromLayer, toLayer, cutTime, distance };
      }
    }

    return bestCut ? { fromLayer: bestCut.fromLayer, toLayer: bestCut.toLayer, cutTime: bestCut.cutTime } : null;
  }

  function findSelectedTransitionCut() {
    const selected = layersRef.current.find((layer) => layer.id === selectedLayerId);
    const trackId = selected?.trackId || selectedTrackId;
    if (!trackId) return null;
    if (selected && isTransitionCompatibleClip(selected)) {
      const clips = sortClipsByTime(layersRef.current.filter((layer) => (
        (layer.trackId || layer.id) === trackId
        && isTransitionCompatibleClip(layer)
      )));
      const selectedIndex = clips.findIndex((layer) => layer.id === selected.id);
      const nextClip = clips[selectedIndex + 1];
      if (nextClip && Math.abs(nextClip.start - getLayerEnd(selected)) <= 0.12) {
        return { fromLayer: selected, toLayer: nextClip, cutTime: getLayerEnd(selected), trackId };
      }
      const previousClip = clips[selectedIndex - 1];
      if (previousClip && Math.abs(selected.start - getLayerEnd(previousClip)) <= 0.12) {
        return { fromLayer: previousClip, toLayer: selected, cutTime: selected.start, trackId };
      }
    }

    const cut = findTransitionCut(trackId, currentTime, Number.POSITIVE_INFINITY);
    return cut ? { ...cut, trackId } : null;
  }

  function addTransitionAtCut(
    preset: { name: string; transitionKind: TransitionType; color: string },
    trackId: string,
    cutTime: number,
    fromLayerId?: string,
    toLayerId?: string,
  ) {
    const id = `transition-${Date.now()}`;
    const duration = 0.6;
    const start = clamp(cutTime - duration / 2, 0, Math.max(0, effectiveTimelineDuration - duration));
    const nextLayer: VideoLayer = {
      id,
      trackId,
      type: "transition",
      name: preset.name,
      start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      color: preset.color,
      transitionKind: preset.transitionKind,
      fromLayerId,
      toLayerId,
      cutTime,
      easing: "easeInOut",
    };

    commitLayers((current) => {
      const withoutDuplicateTransition = current.filter((layer) => (
        layer.type !== "transition"
        || layer.fromLayerId !== fromLayerId
        || layer.toLayerId !== toLayerId
      ));
      const insertIndex = withoutDuplicateTransition.findIndex((layer) => layer.id === toLayerId);
      if (insertIndex < 0) return [nextLayer, ...withoutDuplicateTransition];
      return [
        ...withoutDuplicateTransition.slice(0, insertIndex),
        nextLayer,
        ...withoutDuplicateTransition.slice(insertIndex),
      ];
    });
    setSelectedLayerId(id);
    setActivePanel("settings");
    setStatus(`${preset.name} transition added at cut`);
  }

  function updateClipFromPointer(clientX: number, clientY: number) {
    const edit = clipEditRef.current;
    if (!edit) return;

    const deltaSeconds = ((clientX - edit.startX) / edit.timelineWidth) * effectiveTimelineDuration;
    const targetTrack = edit.mode === "move" ? getTimelineTrackAtPoint(clientX, clientY) : null;

    setLayers((current) => {
      const nextLayers = current.map((layer) => {
      if (layer.id !== edit.layerId || layer.locked) return layer;

      if (edit.mode === "move") {
        const desiredStart = clamp(edit.initialStart + deltaSeconds, 0, Math.max(0, effectiveTimelineDuration - edit.initialDuration));
        const targetTrackId = targetTrack?.trackId || edit.initialTrackId;
        const nextStart = isTrackBlockingClip(layer)
          ? findNearestFreeStart(current, targetTrackId, edit.initialDuration, desiredStart, layer.id)
          : desiredStart;
        if (targetTrack) {
          setClipDragPreview({
            layerId: layer.id,
            trackId: targetTrackId,
            leftPercent: (nextStart / effectiveTimelineDuration) * 100,
            widthPercent: (layer.duration / effectiveTimelineDuration) * 100,
          });
        }
        return {
          ...layer,
          start: nextStart,
          trackId: targetTrackId,
        };
      }

      if (edit.mode === "trim-start") {
        const bounds = isTrackBlockingClip(layer)
          ? getTrackNeighborBounds(current, { ...layer, start: edit.initialStart, duration: edit.initialDuration })
          : { previousEnd: 0 };
        const maxStart = edit.initialStart + edit.initialDuration - 0.2;
        const nextStart = clamp(edit.initialStart + deltaSeconds, bounds.previousEnd, maxStart);
        return {
          ...layer,
          start: nextStart,
          duration: clamp(edit.initialDuration - (nextStart - edit.initialStart), 0.2, effectiveTimelineDuration),
        };
      }

      const bounds = isTrackBlockingClip(layer)
        ? getTrackNeighborBounds(current, { ...layer, start: edit.initialStart, duration: edit.initialDuration })
        : { nextStart: Number.POSITIVE_INFINITY };
      const maxDurationByNeighbor = Number.isFinite(bounds.nextStart)
        ? Math.max(0.2, bounds.nextStart - edit.initialStart)
        : Math.max(0.2, effectiveTimelineDuration - edit.initialStart);
      return {
        ...layer,
        duration: clamp(edit.initialDuration + deltaSeconds, 0.2, maxDurationByNeighbor),
      };
      });

      return edit.mode === "move" ? orderLayersByTrackAndTime(nextLayers) : nextLayers;
    });
  }

  function updateStageElementFromPointer(clientX: number, clientY: number, keepAspect = false) {
    const edit = stageEditRef.current;
    if (!edit) return;

    const deltaXPercent = ((clientX - edit.startX) / edit.stageWidth) * 100;
    const deltaYPercent = ((clientY - edit.startY) / edit.stageHeight) * 100;

    setLayers((current) => current.map((layer) => {
      if (layer.id !== edit.layerId || layer.locked) return layer;

      if (edit.mode === "rotate") {
        const pointerAngle = Math.atan2(clientY - edit.centerY, clientX - edit.centerX) * (180 / Math.PI);
        const nextAngle = (edit.initialAngle + pointerAngle - edit.initialPointerAngle + 360) % 360;
        return {
          ...layer,
          angle: Math.round(nextAngle),
        };
      }

      if (edit.mode === "move") {
        return {
          ...layer,
          x: clamp(edit.initialX + deltaXPercent, 0, 100 - layer.width),
          y: clamp(edit.initialY + deltaYPercent, 0, 100 - layer.height),
        };
      }

      const minSize = 4;
      const edge = edit.edge || "bottomRight";
      const initialRight = edit.initialX + edit.initialWidth;
      const initialBottom = edit.initialY + edit.initialHeight;
      const aspectRatio = edit.initialWidth / Math.max(edit.initialHeight, 0.001);
      const isCorner = (edge.includes("Left") || edge.includes("Right"))
        && (edge.includes("top") || edge.includes("Bottom") || edge.includes("bottom"));
      let nextX = edit.initialX;
      let nextY = edit.initialY;
      let nextWidth = edit.initialWidth;
      let nextHeight = edit.initialHeight;

      if (edge.includes("Left") || edge === "left") {
        nextX = clamp(edit.initialX + deltaXPercent, 0, initialRight - minSize);
        nextWidth = initialRight - nextX;
      }

      if (edge.includes("Right") || edge === "right") {
        nextWidth = clamp(edit.initialWidth + deltaXPercent, minSize, 100 - edit.initialX);
      }

      if (edge.includes("top") || edge === "top") {
        nextY = clamp(edit.initialY + deltaYPercent, 0, initialBottom - minSize);
        nextHeight = initialBottom - nextY;
      }

      if (edge.includes("Bottom") || edge.includes("bottom") || edge === "bottom") {
        nextHeight = clamp(edit.initialHeight + deltaYPercent, minSize, 100 - edit.initialY);
      }

      if (keepAspect && isCorner) {
        const widthChange = Math.abs(nextWidth - edit.initialWidth);
        const heightChange = Math.abs(nextHeight - edit.initialHeight);
        if (widthChange >= heightChange) {
          nextHeight = clamp(nextWidth / aspectRatio, minSize, 100);
        } else {
          nextWidth = clamp(nextHeight * aspectRatio, minSize, 100);
        }

        if (edge.includes("Left")) nextX = initialRight - nextWidth;
        if (edge.includes("top")) nextY = initialBottom - nextHeight;

        nextX = clamp(nextX, 0, 100 - nextWidth);
        nextY = clamp(nextY, 0, 100 - nextHeight);
        nextWidth = clamp(nextWidth, minSize, 100 - nextX);
        nextHeight = clamp(nextHeight, minSize, 100 - nextY);
      }

      return {
        ...layer,
        x: Number(nextX.toFixed(2)),
        y: Number(nextY.toFixed(2)),
        width: Number(nextWidth.toFixed(2)),
        height: Number(nextHeight.toFixed(2)),
      };
    }));
  }

  function beginStageEdit(
    event: ReactPointerEvent<HTMLElement>,
    layer: VideoLayer,
    mode: StageEditState["mode"],
    edge?: CanvasResizeEdge,
  ) {
    const stage = event.currentTarget.closest("[data-preview-stage]");
    const rect = stage?.getBoundingClientRect();
    if (!rect) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedLayerId(layer.id);
    setActivePanel("settings");
    if (layer.locked) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    pushHistorySnapshot();
    const centerX = rect.left + ((layer.x + layer.width / 2) / 100) * rect.width;
    const centerY = rect.top + ((layer.y + layer.height / 2) / 100) * rect.height;
    stageEditRef.current = {
      layerId: layer.id,
      mode,
      edge,
      startX: event.clientX,
      startY: event.clientY,
      initialX: layer.x,
      initialY: layer.y,
      initialWidth: layer.width,
      initialHeight: layer.height,
      initialAngle: layer.angle || 0,
      initialPointerAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI),
      centerX,
      centerY,
      stageWidth: rect.width,
      stageHeight: rect.height,
    };
  }

  function selectStageLayerAtPoint(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    const clickedLayer = layers.find((layer) => (
      layer.visible
      && currentTime >= layer.start
      && currentTime <= getLayerEnd(layer)
      && xPercent >= layer.x
      && xPercent <= layer.x + layer.width
      && yPercent >= layer.y
      && yPercent <= layer.y + layer.height
    ));

    if (!clickedLayer) return;
    setSelectedLayerId(clickedLayer.id);
    setActivePanel("settings");
  }

  function endStageEdit(event: ReactPointerEvent<HTMLElement>) {
    if (stageEditRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      stageEditRef.current = null;
    }
  }

  function beginClipEdit(
    event: ReactPointerEvent<HTMLElement>,
    layer: VideoLayer,
    mode: ClipEditState["mode"],
  ) {
    if (layer.locked) return;
    const timelineTrack = event.currentTarget.closest("[data-timeline-track]");
    const rect = timelineTrack?.getBoundingClientRect();
    if (!rect) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pushHistorySnapshot();
    setSelectedLayerId(layer.id);
    setSelectedTrackId(layer.trackId || layer.id);
    setIsPlaying(false);
    clipEditRef.current = {
      layerId: layer.id,
      mode,
      startX: event.clientX,
      initialStart: layer.start,
      initialDuration: layer.duration,
      timelineWidth: rect.width,
      initialTrackId: layer.trackId || layer.id,
    };
    if (mode === "move") {
      setClipDragPreview({
        layerId: layer.id,
        trackId: layer.trackId || layer.id,
        leftPercent: (layer.start / effectiveTimelineDuration) * 100,
        widthPercent: (layer.duration / effectiveTimelineDuration) * 100,
      });
    }
  }

  function endClipEdit(event: ReactPointerEvent<HTMLElement>) {
    if (clipEditRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      clipEditRef.current = null;
      setClipDragPreview(null);
    }
  }

  function seekFromTimelineElement(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setIsPlaying(false);
    setCurrentTime(clamp(((event.clientX - rect.left) / rect.width) * effectiveTimelineDuration, 0, effectiveTimelineDuration));
  }

  function beginPlayheadDrag(event: ReactPointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    isDraggingPlayheadRef.current = true;
    const timelineElement = event.currentTarget.parentElement;
    const rect = timelineElement?.getBoundingClientRect();
    if (rect) {
      setIsPlaying(false);
      setCurrentTime(clamp(((event.clientX - rect.left) / rect.width) * effectiveTimelineDuration, 0, effectiveTimelineDuration));
    }
  }

  function dragPlayhead(event: ReactPointerEvent<HTMLSpanElement>) {
    if (!isDraggingPlayheadRef.current) return;
    const timelineElement = event.currentTarget.parentElement;
    const rect = timelineElement?.getBoundingClientRect();
    if (!rect) return;
    setCurrentTime(clamp(((event.clientX - rect.left) / rect.width) * effectiveTimelineDuration, 0, effectiveTimelineDuration));
  }

  function endPlayheadDrag(event: ReactPointerEvent<HTMLSpanElement>) {
    if (!isDraggingPlayheadRef.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    isDraggingPlayheadRef.current = false;
  }

  function togglePlayback() {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setCurrentTime((value) => (value >= effectiveTimelineDuration ? 0 : value));
    setIsPlaying(true);
  }

  function fitTimelineToView() {
    setTimelineZoom(1);
    setStatus("Timeline fitted to view");
  }

  function zoomTimeline(delta: number) {
    setTimelineZoom((value) => clamp(Number((value + delta).toFixed(2)), 1, 3));
  }

  function addTextLayer() {
    const id = `text-${Date.now()}`;
    const nextLayer: VideoLayer = {
      id,
      trackId: `track-${id}`,
      type: "text",
      name: `Text ${layers.filter((layer) => layer.type === "text").length + 1}`,
      start: currentTime,
      duration: Math.min(4, effectiveTimelineDuration - currentTime) || 2,
      visible: true,
      locked: false,
      opacity: 1,
      x: 25,
      y: 40,
      width: 50,
      height: 14,
      text: "New text layer",
      color: "#ffffff",
      fontSize: 54,
      fontFamily: "Anton",
    };
    commitLayers((current) => [nextLayer, ...current]);
    setSelectedLayerId(id);
    setActivePanel("settings");
    setIsSidebarOpen(true);
  }

  function addTextPreset(preset: (typeof textPresets)[number]) {
    const id = `text-${Date.now()}`;
    ensureVideoMakerFontLoaded(preset.fontFamily);
    const duration = Math.min(4, effectiveTimelineDuration - currentTime) || 2;
    const insert = getClipInsertPosition(duration);
    const nextLayer: VideoLayer = {
      id,
      trackId: insert.trackId,
      type: "text",
      name: preset.label,
      start: insert.start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      x: 8,
      y: preset.label === "Body Caption" ? 72 : 48,
      width: preset.label === "Body Caption" ? 54 : 70,
      height: preset.label === "Body Caption" ? 9 : 14,
      text: preset.text,
      color: preset.color,
      fontSize: preset.fontSize,
      fontFamily: preset.fontFamily,
    };
    insertLayerAfterSelection(nextLayer);
  }

  function createMediaLayerFromAsset(asset: { name: string; src: string }) {
    const id = `asset-${Date.now()}`;
    const assetKey = `library-${asset.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const duration = Math.min(5, effectiveTimelineDuration - currentTime) || 2;
    const insert = getClipInsertPosition(duration);
    const image = new Image();
    image.src = asset.src;
    mediaAssetsRef.current.set(assetKey, { kind: "image", image, url: asset.src });

    const nextLayer: VideoLayer = {
      id,
      trackId: insert.trackId,
      type: "media",
      name: asset.name,
      start: insert.start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      x: 30,
      y: 24,
      width: 40,
      height: 40,
      src: asset.src,
      mediaKind: "image",
      assetKey,
    };
    insertLayerAfterSelection(nextLayer);
    setStatus(`${asset.name} added`);
  }

  function addShapeLayer(preset: { name: string; shapeType: ShapeType; color: string }, gradient?: { color1: string; color2: string }) {
    const id = `shape-${Date.now()}`;
    const isLine = preset.shapeType === "line" || preset.shapeType === "dashedLine";
    const isFrame = preset.shapeType.includes("Frame") || preset.shapeType.startsWith("grid");
    const duration = Math.min(5, effectiveTimelineDuration - currentTime) || 2;
    const insert = getClipInsertPosition(duration);
    const nextLayer: VideoLayer = {
      id,
      trackId: insert.trackId,
      type: "shape",
      name: preset.name,
      start: insert.start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      x: isFrame ? 18 : 32,
      y: isFrame ? 18 : 30,
      width: isLine ? 42 : isFrame ? 64 : 28,
      height: isLine ? 5 : isFrame ? 52 : 28,
      color: preset.color,
      shapeType: preset.shapeType,
      gradientColor1: gradient?.color1,
      gradientColor2: gradient?.color2,
    };
    insertLayerAfterSelection(nextLayer);
    setStatus(`${preset.name} added`);
  }

  function addTransitionLayer(preset: { name: string; transitionKind: TransitionType; color: string }) {
    const cut = findSelectedTransitionCut();
    if (!cut) {
      setStatus(`Drag ${preset.name} onto a cut between touching image/video clips`);
      return;
    }
    addTransitionAtCut(preset, cut.trackId, cut.cutTime, cut.fromLayer.id, cut.toLayer.id);
  }

  function handleTransitionDrop(event: ReactDragEvent<HTMLDivElement>, trackId: string) {
    event.preventDefault();
    event.stopPropagation();
    const transitionKind = (
      event.dataTransfer.getData("application/x-pixores-transition-kind")
      || event.dataTransfer.getData("text/plain")
    ) as TransitionType;
    if (!transitionKind) return;

    const preset = basicTransitionPresets.find((item) => item.transitionKind === transitionKind);
    if (!preset) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const dropTime = clamp(((event.clientX - rect.left) / rect.width) * effectiveTimelineDuration, 0, effectiveTimelineDuration);
    const cut = findTransitionCut(trackId, dropTime);
    if (!cut) {
      setStatus("Drop transitions only on a cut between touching image/video clips");
      return;
    }

    addTransitionAtCut(preset, trackId, cut.cutTime, cut.fromLayer.id, cut.toLayer.id);
  }

  function addEmojiLayer(item: { name: string; emoji: string }) {
    const id = `emoji-${Date.now()}`;
    const duration = Math.min(4, effectiveTimelineDuration - currentTime) || 2;
    const insert = getClipInsertPosition(duration);
    const nextLayer: VideoLayer = {
      id,
      trackId: insert.trackId,
      type: "text",
      name: item.name,
      start: insert.start,
      duration,
      visible: true,
      locked: false,
      opacity: 1,
      x: 38,
      y: 34,
      width: 24,
      height: 24,
      text: item.emoji,
      color: "#ffffff",
      fontSize: 96,
      fontFamily: "Arial",
    };
    insertLayerAfterSelection(nextLayer);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const id = `media-${Date.now()}`;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");
    const assetKind: ImportedAsset["kind"] = isVideo ? "video" : isAudio ? "audio" : "image";
    const baseMetadata: PixoresMediaMetadata = {
      analyzer: "browser",
      analyzedAt: new Date().toISOString(),
      mimeType: file.type || undefined,
      size: file.size,
      hasVideo: isVideo,
      hasAudio: isAudio || isVideo ? undefined : false,
    };
    const asset: MediaAsset = { kind: assetKind, url, metadata: baseMetadata };

    if (isVideo) {
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.crossOrigin = "anonymous";
      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          const metadata: PixoresMediaMetadata = {
            ...baseMetadata,
            duration: video.duration,
            width: video.videoWidth || undefined,
            height: video.videoHeight || undefined,
            hasVideo: true,
          };
          asset.duration = video.duration;
          asset.metadata = metadata;
          setImports((current) => current.map((item) => (
            item.id === id ? { ...item, duration: video.duration, metadata } : item
          )));
          setTimelineDuration((current) => Math.max(current, Math.ceil(video.duration)));
        }
      };
      void video.play().catch(() => undefined);
      asset.video = video;
    } else if (isAudio) {
      const audio = document.createElement("audio");
      audio.src = url;
      audio.crossOrigin = "anonymous";
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          const metadata: PixoresMediaMetadata = {
            ...baseMetadata,
            duration: audio.duration,
            hasVideo: false,
            hasAudio: true,
          };
          asset.duration = audio.duration;
          asset.metadata = metadata;
          setImports((current) => current.map((item) => (
            item.id === id ? { ...item, duration: audio.duration, metadata } : item
          )));
          setTimelineDuration((current) => Math.max(current, Math.ceil(audio.duration)));
        }
      };
      asset.audio = audio;
    } else {
      const image = new Image();
      image.src = url;
      image.onload = () => {
        const metadata: PixoresMediaMetadata = {
          ...baseMetadata,
          width: image.naturalWidth || undefined,
          height: image.naturalHeight || undefined,
          hasVideo: false,
          hasAudio: false,
        };
        asset.metadata = metadata;
        setImports((current) => current.map((item) => (
          item.id === id ? { ...item, metadata } : item
        )));
      };
      asset.image = image;
    }

    mediaAssetsRef.current.set(id, asset);
    setImports((current) => [{
      id,
      name: file.name,
      kind: assetKind,
      url,
      duration: asset.duration,
      size: file.size,
      metadata: baseMetadata,
      uploadStatus: "uploading",
    }, ...current]);
    setSelectedImportId(id);
    setActivePanel("imports");
    setIsSidebarOpen(true);
    setStatus(isVideo ? "Video imported. Uploading asset..." : isAudio ? "Audio imported. Uploading asset..." : "Image imported. Uploading asset...");
    void uploadImportedAsset(id, file);
  }

  function createAudioLayerFromVideo(videoLayer: VideoLayer, suffix = Date.now().toString()): VideoLayer {
    return {
      id: `audio-${videoLayer.id}-${suffix}`,
      trackId: `audio-track-${videoLayer.id}-${suffix}`,
      type: "audio",
      name: `Audio: ${videoLayer.name}`,
      start: videoLayer.start,
      duration: videoLayer.duration,
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 8,
      src: videoLayer.src,
      mediaKind: "video",
      assetKey: videoLayer.assetKey,
      sourceStart: getLayerSourceStart(videoLayer),
      sourceEnd: videoLayer.sourceEnd,
      trimStart: getLayerSourceStart(videoLayer),
      trimEnd: videoLayer.trimEnd,
      linkedVideoLayerId: videoLayer.id,
      volume: masterVolume,
    };
  }

  async function uploadImportedAsset(assetId: string, file: File) {
    setImports((current) => current.map((item) => (
      item.id === assetId ? { ...item, uploadStatus: "uploading" } : item
    )));

    try {
      const payload = await adapters.assetAdapter.importAsset(file, {
        projectTitle,
        kind: file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image",
      });
      const persistentUrl = payload.assetUrl || undefined;
      const metadata = payload.metadata;
      const analyzedDuration = metadata?.duration;
      const analyzedSize = payload.size || metadata?.size || file.size;

      const mediaAsset = mediaAssetsRef.current.get(assetId);
      if (mediaAsset) mediaAssetsRef.current.set(assetId, {
        ...mediaAsset,
        persistentUrl,
        duration: analyzedDuration || mediaAsset.duration,
        metadata: metadata || mediaAsset.metadata,
      });
      setImports((current) => current.map((item) => (
        item.id === assetId ? {
          ...item,
          persistentUrl,
          uploadStatus: "ready",
          duration: analyzedDuration || item.duration,
          size: analyzedSize,
          metadata: metadata || item.metadata,
        } : item
      )));
      setStatus(metadata?.analyzer === "ffprobe" || metadata?.analyzer === "sharp"
        ? "Media analyzed and ready"
        : adapters.assetAdapter.kind === "desktop" ? "Desktop adapter ready" : "Asset ready for server render");
    } catch {
      setImports((current) => current.map((item) => (
        item.id === assetId ? { ...item, uploadStatus: "error" } : item
      )));
      setStatus(adapters.assetAdapter.kind === "desktop" ? "Desktop asset adapter failed" : "Asset upload failed");
    }
  }

  function addImportToTrack(item: ImportedAsset) {
    const asset = mediaAssetsRef.current.get(item.id);
    if (!asset) {
      setStatus("Import is no longer available");
      return;
    }

    const layerId = `clip-${item.id}-${Date.now()}`;
    const layerDuration = item.kind === "video" || item.kind === "audio"
      ? Math.max(0.2, item.metadata?.duration || asset.metadata?.duration || item.duration || asset.duration || Math.min(8, effectiveTimelineDuration))
      : Math.min(5, effectiveTimelineDuration - currentTime) || 2;
    const insert = getClipInsertPosition(layerDuration);

    if (item.kind === "audio") {
      const audioLayer: VideoLayer = {
        id: layerId,
        trackId: `audio-track-${layerId}`,
        type: "audio",
        name: item.name.replace(/\.[^.]+$/, "").slice(0, 28) || "Audio",
        start: insert.start,
        duration: layerDuration,
        visible: true,
        locked: false,
        opacity: 1,
        x: 0,
        y: 0,
        width: 100,
        height: 8,
        src: asset.url,
        mediaKind: "audio",
        assetKey: item.id,
        volume: masterVolume,
      };
      insertLayerAfterSelection(audioLayer);
      setStatus("Audio added to tracks");
      return;
    }

    const initialMediaBox = getInitialMediaBox(asset);
    const nextLayer: VideoLayer = {
      id: layerId,
      trackId: insert.trackId,
      type: "media",
      name: item.name.replace(/\.[^.]+$/, "").slice(0, 28) || "Media",
      start: insert.start,
      duration: layerDuration,
      visible: true,
      locked: false,
      opacity: 1,
      x: initialMediaBox.x,
      y: initialMediaBox.y,
      width: initialMediaBox.width,
      height: initialMediaBox.height,
      src: asset.url,
      mediaKind: item.kind,
      assetKey: item.id,
      audioDetached: false,
      objectFit: "contain",
      volume: item.kind === "video" ? 1 : undefined,
    };

    if (item.kind === "video") {
      insertLayerAfterSelection(nextLayer);
      setStatus("Video added to canvas");
      return;
    }

    insertLayerAfterSelection(nextLayer);
    setStatus("Import added to tracks");
  }

  function extractAudioFromSelectedVideo() {
    const layer = layersRef.current.find((item) => item.id === selectedLayerId);
    if (!layer || layer.type !== "media" || layer.mediaKind !== "video" || !layer.assetKey) {
      setStatus("Select a video clip to separate audio");
      return;
    }
    if (layer.locked) {
      setStatus("Unlock the video before separating audio");
      return;
    }

    const existingAudio = layersRef.current.find((item) => (
      item.type === "audio"
      && item.linkedVideoLayerId === layer.id
      && item.assetKey === layer.assetKey
    ));
    if (existingAudio) {
      setSelectedLayerId(existingAudio.id);
      setStatus("Audio is already separated");
      return;
    }

    updateLayer(layer.id, { audioDetached: true });
    insertLayersAfterSelection([createAudioLayerFromVideo({ ...layer, audioDetached: true })]);
    setStatus("Audio separated into a new track");
  }

  function deleteImport(itemId: string) {
    setImports((current) => current.filter((item) => item.id !== itemId));
    if (selectedImportId === itemId) setSelectedImportId("");

    if (!layersRef.current.some((layer) => (layer.assetKey || layer.id) === itemId)) {
      const asset = mediaAssetsRef.current.get(itemId);
      if (asset) URL.revokeObjectURL(asset.url);
      mediaAssetsRef.current.delete(itemId);
    }

    setStatus("Import removed");
  }

  function reorderLayer(activeTrackId: string, overTrackId: string) {
    if (activeTrackId === overTrackId) return;
    commitLayers((current) => {
      const groupedTrackIds = Array.from(new Set(current.map((layer) => layer.trackId || layer.id)));
      const fromIndex = groupedTrackIds.indexOf(activeTrackId);
      const toIndex = groupedTrackIds.indexOf(overTrackId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const activeTrackLayers = current.filter((layer) => (layer.trackId || layer.id) === activeTrackId);
      if (activeTrackLayers.some((layer) => layer.locked)) return current;
      const nextTrackIds = [...groupedTrackIds];
      const [trackId] = nextTrackIds.splice(fromIndex, 1);
      nextTrackIds.splice(toIndex, 0, trackId);
      return nextTrackIds.flatMap((trackIdItem) => current.filter((layer) => (layer.trackId || layer.id) === trackIdItem));
    });
  }

  function removeLayer(id: string) {
    commitLayers((current) => {
      const next = current.filter((layer) => layer.id !== id);
      if (selectedLayerId === id) setSelectedLayerId("");
      return next;
    });
  }

  function removeTrack(trackId: string) {
    const targetTrackSnapshot = layersRef.current.filter((layer) => (layer.trackId || layer.id) === trackId);
    if (targetTrackSnapshot.length > 0 && !window.confirm("Delete this track and all clips inside it?")) return;
    commitLayers((current) => {
      const targetTrack = current.filter((layer) => (layer.trackId || layer.id) === trackId);
      if (targetTrack.some((layer) => layer.locked)) {
        setStatus("Unlock the track before deleting it");
        return current;
      }

      const next = current.filter((layer) => (layer.trackId || layer.id) !== trackId);
      if (targetTrack.some((layer) => layer.id === selectedLayerId)) setSelectedLayerId("");
      return next;
    });
    setEmptyTracks((current) => current.filter((track) => track.id !== trackId));
    if (selectedTrackId === trackId) setSelectedTrackId("");
  }

  function deleteSelectedLayer() {
    const layer = layersRef.current.find((item) => item.id === selectedLayerId);
    if (!layer) {
      setStatus("Select a clip before deleting");
      return;
    }
    if (layer.locked) {
      setStatus("Unlock the track before deleting it");
      return;
    }

    removeLayer(layer.id);
    setStatus("Track deleted");
  }

  function deleteSelectedTrack() {
    const layer = layersRef.current.find((item) => item.id === selectedLayerId);
    const trackId = layer?.trackId || layer?.id || selectedTrackId;
    if (!trackId) return;
    removeTrack(trackId);
    setStatus("Track deleted");
  }

  function duplicateSelectedLayer() {
    const layer = layersRef.current.find((item) => item.id === selectedLayerId);
    if (!layer || layer.locked) return;
    const id = `${layer.type}-${Date.now()}`;
    const duplicate: VideoLayer = {
      ...layer,
      id,
      name: `${layer.name} copy`,
      start: getLayerEnd(layer),
      x: clamp(layer.x + 3, 0, 100),
      y: clamp(layer.y + 3, 0, 100),
    };
    insertLayerAfterSelection(duplicate);
    setStatus("Clip duplicated");
  }

  function splitSelectedLayer() {
    const layer = layers.find((item) => item.id === selectedLayerId);
    if (!layer || layer.locked) return;
    if (currentTime <= layer.start + 0.2 || currentTime >= getLayerEnd(layer) - 0.2) {
      setStatus("Move the playhead inside the clip to split");
      return;
    }

    const firstDuration = currentTime - layer.start;
    const secondDuration = getLayerEnd(layer) - currentTime;
    const baseSourceStart = getLayerSourceStart(layer);
    const newId = `${layer.type}-${Date.now()}`;
    const secondLayer: VideoLayer = {
      ...layer,
      id: newId,
      name: `${layer.name} copy`,
      start: currentTime,
      duration: secondDuration,
      sourceStart: baseSourceStart + firstDuration,
      trimStart: baseSourceStart + firstDuration,
      sourceEnd: layer.sourceEnd,
      trimEnd: layer.trimEnd,
    };

    commitLayers((current) => current.flatMap((item) => (
      item.id === layer.id
        ? [{
          ...item,
          duration: firstDuration,
          sourceStart: baseSourceStart,
          trimStart: baseSourceStart,
          sourceEnd: baseSourceStart + firstDuration,
          trimEnd: baseSourceStart + firstDuration,
        }, secondLayer]
        : [item]
    )));
    setSelectedLayerId(newId);
    setStatus("Clip split at playhead");
  }

  async function pasteFromClipboard() {
    if (!navigator.clipboard) {
      setStatus("Clipboard is not available in this browser");
      return;
    }

    try {
      if ("read" in navigator.clipboard) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((type) => type.startsWith("image/"));
          if (!imageType) continue;

          const blob = await item.getType(imageType);
          const id = `paste-${Date.now()}`;
          const url = URL.createObjectURL(blob);
          const image = new Image();
          image.src = url;
          mediaAssetsRef.current.set(id, { kind: "image", image, url });
          setImports((current) => [{ id, name: "Pasted image", kind: "image", url }, ...current]);
          const duration = Math.min(5, effectiveTimelineDuration - currentTime) || 2;
          const insert = getClipInsertPosition(duration);

          const pastedLayer: VideoLayer = {
            id,
            trackId: insert.trackId,
            type: "media",
            name: "Pasted image",
            start: insert.start,
            duration,
            visible: true,
            locked: false,
            opacity: 1,
            x: 27.5,
            y: 27.5,
            width: 45,
            height: 45,
            src: url,
            mediaKind: "image",
            assetKey: id,
          };

          insertLayerAfterSelection(pastedLayer);
          setStatus("Pasted image");
          return;
        }
      }

      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setStatus("Clipboard is empty");
        return;
      }

      const id = `paste-text-${Date.now()}`;
      const duration = Math.min(4, effectiveTimelineDuration - currentTime) || 2;
      const insert = getClipInsertPosition(duration);
      const pastedTextLayer: VideoLayer = {
        id,
        trackId: insert.trackId,
        type: "text",
        name: "Pasted text",
        start: insert.start,
        duration,
        visible: true,
        locked: false,
        opacity: 1,
        x: 8,
        y: 48,
        width: 72,
        height: 14,
        text: text.trim().slice(0, 160),
        color: "#ffffff",
        fontSize: 54,
      };

      insertLayerAfterSelection(pastedTextLayer);
      setStatus("Pasted text");
    } catch {
      setStatus("Allow clipboard access to paste");
    }
  }

  async function exportVideo() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || isRecording) return;

    if (!("MediaRecorder" in window)) {
      setStatus("This browser cannot export video");
      return;
    }

    setDownloadUrl("");
    setIsPlaying(false);
    setIsRecording(true);
    setStatus("Rendering timeline...");

    const stream = canvas.captureStream(30);
    const exportType = getSupportedExportType();
    const recorder = new MediaRecorder(stream, { mimeType: exportType.mimeType });
    const chunks: Blob[] = [];
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: exportType.mimeType });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setExportFileName(`pixores-video.${exportType.extension}`);
      setIsRecording(false);
      setStatus(exportType.extension === "mp4" ? "MP4 export ready" : "MP4 not supported in this browser. WebM export ready");
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.start();
    const start = performance.now();

    const renderExportFrame = (now: number) => {
      const nextTime = clamp((now - start) / 1000, 0, effectiveTimelineDuration);
      setCurrentTime(nextTime);
      drawScene(context, nextTime);

      if (nextTime >= effectiveTimelineDuration || recorder.state === "inactive") {
        if (recorder.state !== "inactive") recorder.stop();
        return;
      }

      requestAnimationFrame(renderExportFrame);
    };

    requestAnimationFrame(renderExportFrame);
  }

  function stopExport() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  return (
    <div className={styles.page}>
      <section
        className={`${styles.editorShell} ${isSidebarOpen ? "" : styles.menuClosed}`}
        style={{
          gridTemplateColumns: isSidebarOpen
            ? `56px ${sidePanelWidth}px 6px minmax(0, 1fr)`
            : "56px 0 minmax(0, 1fr)",
        }}
      >
        <aside className={styles.leftRail} aria-label="Video maker menu">
          <button type="button" className={styles.railButton} onClick={() => setIsSidebarOpen((value) => !value)} aria-label={isSidebarOpen ? "Collapse menu" : "Open menu"}>
            {isSidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
          </button>
          <button type="button" className={`${styles.railButton} ${activePanel === "imports" ? styles.activeRailButton : ""}`} onClick={() => { setActivePanel("imports"); setIsSidebarOpen(true); }} aria-label="Imports"><ImagePlus size={19} /></button>
          <button type="button" className={`${styles.railButton} ${activePanel === "elements" ? styles.activeRailButton : ""}`} onClick={() => { setActivePanel("elements"); setIsSidebarOpen(true); }} aria-label="Elements"><Shapes size={19} /></button>
          <button type="button" className={`${styles.railButton} ${activePanel === "text" ? styles.activeRailButton : ""}`} onClick={() => { setActivePanel("text"); setIsSidebarOpen(true); }} aria-label="Text"><Type size={19} /></button>
          <button type="button" className={`${styles.railButton} ${activePanel === "project" ? styles.activeRailButton : ""}`} onClick={() => { setActivePanel("project"); setIsSidebarOpen(true); }} aria-label="Project"><Film size={19} /></button>
          <button type="button" className={`${styles.railButton} ${activePanel === "settings" ? styles.activeRailButton : ""}`} onClick={() => { setActivePanel("settings"); setIsSidebarOpen(true); }} aria-label="Track settings"><Settings size={19} /></button>
        </aside>

        <aside className={`${styles.sidePanel} ${isSidebarOpen ? "" : styles.sidePanelClosed}`} aria-label="Video maker options">
          {activePanel === "imports" && (
            <div className={styles.importBox}>
              <div className={styles.panelTitle}><ImagePlus size={17} /> Imports</div>
              <label className={styles.importDrop}>
                <ImagePlus size={20} />
                <span>Add image, video or audio</span>
                <input type="file" accept="image/*,video/*,audio/*" onChange={handleFileChange} />
              </label>
              <div className={styles.mediaSearch}>
                <Search size={15} />
                <input
                  type="search"
                  value={importSearch}
                  onChange={(event) => setImportSearch(event.target.value)}
                  placeholder="Search media"
                />
              </div>
              <div className={styles.mediaFilters} aria-label="Media filters">
                {([
                  ["all", "All"],
                  ["video", "Video"],
                  ["image", "Images"],
                  ["audio", "Audio"],
                ] as Array<[ImportKindFilter, string]>).map(([kind, label]) => (
                  <button
                    type="button"
                    key={kind}
                    className={importKindFilter === kind ? styles.activeMediaFilter : ""}
                    onClick={() => setImportKindFilter(kind)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className={styles.importList}>
                {filteredImports.length ? filteredImports.map((item) => (
                  <div
                    className={`${styles.importItem} ${selectedImport?.id === item.id ? styles.selectedImportItem : ""}`}
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedImportId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setSelectedImportId(item.id);
                    }}
                  >
                    <span className={styles.importPreview}>
                      {item.kind === "video" ? (
                        <video src={item.url} muted playsInline preload="metadata" />
                      ) : item.kind === "audio" ? (
                        <Music size={20} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt="" />
                      )}
                      {(item.kind === "video" || item.kind === "audio") && (
                        <small>{formatTimelineClock(item.duration || 0).slice(3)}</small>
                      )}
                    </span>
                    <span className={styles.importName}>
                      {item.kind === "video" ? <Film size={14} /> : item.kind === "audio" ? <Music size={14} /> : <ImagePlus size={14} />}
                      <span>{item.name}</span>
                    </span>
                    <span className={`${styles.importStatus} ${styles[`importStatus${(item.uploadStatus || "local")[0].toUpperCase()}${(item.uploadStatus || "local").slice(1)}`]}`}>
                      {item.uploadStatus === "uploading" ? "Analyzing" : item.uploadStatus === "ready" ? "Analyzed" : item.uploadStatus === "error" ? "Error" : "Local"}
                    </span>
                    <div className={styles.importActions}>
                      <button type="button" onClick={() => addImportToTrack(item)} aria-label={`Add ${item.name} to tracks`}>
                        <Plus size={14} />
                      </button>
                      <button type="button" onClick={() => deleteImport(item.id)} aria-label={`Delete ${item.name} from imports`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )) : <span className={styles.emptyImports}>{imports.length ? "No media matches this search" : "No imports yet"}</span>}
              </div>
              {selectedImport && (
                <div className={styles.mediaPreviewPanel}>
                  <div className={styles.mediaPreviewHeader}>
                    <span>{selectedImport.name}</span>
                    <small>{selectedImport.kind.toUpperCase()} - {formatFileSize(selectedImport.metadata?.size || selectedImport.size)}</small>
                  </div>
                  {selectedImport.metadata && (
                    <>
                      <dl className={styles.mediaMetadataGrid}>
                        {getMediaMetadataRows(selectedImport.metadata).map(([label, value]) => (
                          <div key={`${label}-${value}`}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                      {selectedImport.metadata.warnings?.length ? (
                        <div className={styles.mediaMetadataWarnings}>
                          {selectedImport.metadata.warnings.map((warning) => <span key={warning}>{warning}</span>)}
                        </div>
                      ) : null}
                    </>
                  )}
                  <div className={styles.mediaPreviewStage}>
                    {selectedImport.kind === "video" ? (
                      <video
                        key={selectedImport.id}
                        ref={(node) => { mediaPreviewRef.current = node; }}
                        src={selectedImport.url}
                        playsInline
                        onLoadedMetadata={(event) => {
                          setMediaPreviewDuration(event.currentTarget.duration || selectedImport.duration || 0);
                          setMediaPreviewTime(event.currentTarget.currentTime || 0);
                        }}
                        onTimeUpdate={(event) => setMediaPreviewTime(event.currentTarget.currentTime || 0)}
                        onPlay={() => setIsMediaPreviewPlaying(true)}
                        onPause={() => setIsMediaPreviewPlaying(false)}
                      />
                    ) : selectedImport.kind === "audio" ? (
                      <div className={styles.audioPreviewStage}>
                        <Music size={26} />
                        <audio
                          key={selectedImport.id}
                          ref={(node) => { mediaPreviewRef.current = node; }}
                          src={selectedImport.url}
                          onLoadedMetadata={(event) => {
                            setMediaPreviewDuration(event.currentTarget.duration || selectedImport.duration || 0);
                            setMediaPreviewTime(event.currentTarget.currentTime || 0);
                          }}
                          onTimeUpdate={(event) => setMediaPreviewTime(event.currentTarget.currentTime || 0)}
                          onPlay={() => setIsMediaPreviewPlaying(true)}
                          onPause={() => setIsMediaPreviewPlaying(false)}
                        />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedImport.url} alt="" />
                    )}
                  </div>
                  <div className={styles.mediaPreviewControls}>
                    <button type="button" onClick={toggleMediaPreviewPlayback} disabled={selectedImport.kind === "image"} aria-label="Play media preview">
                      {isMediaPreviewPlaying ? <Square size={14} /> : <Play size={14} />}
                    </button>
                    <button type="button" onClick={stopMediaPreview} disabled={selectedImport.kind === "image"} aria-label="Stop media preview">
                      <Square size={14} />
                    </button>
                    <input
                      type="range"
                      min="0"
                      max={mediaPreviewDuration || selectedImport.duration || 0}
                      step="0.05"
                      value={mediaPreviewTime}
                      disabled={selectedImport.kind === "image"}
                      onChange={(event) => {
                        const media = mediaPreviewRef.current;
                        const nextTime = Number(event.target.value);
                        if (media) media.currentTime = nextTime;
                        setMediaPreviewTime(nextTime);
                      }}
                    />
                    <span>{formatTimecode(mediaPreviewTime)} / {formatTimecode(mediaPreviewDuration || selectedImport.duration || 0)}</span>
                    <button type="button" onClick={() => setIsMediaPreviewMuted((value) => !value)} aria-label="Mute media preview">
                      {isMediaPreviewMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={mediaPreviewVolume}
                      onChange={(event) => setMediaPreviewVolume(Number(event.target.value))}
                    />
                    <button type="button" onClick={snapshotSelectedImport} disabled={selectedImport.kind === "audio"} aria-label="Snapshot media">
                      <Camera size={14} />
                    </button>
                    <button type="button" onClick={() => void mediaPreviewRef.current?.requestFullscreen?.()} disabled={selectedImport.kind === "image"} aria-label="Fullscreen media">
                      <Maximize2 size={14} />
                    </button>
                  </div>
                  <div className={styles.mediaPreviewActions}>
                    <button type="button" onClick={() => addImportToTrack(selectedImport)}><Plus size={14} /> Add to Timeline</button>
                    <button type="button" onClick={() => replaceSelectedClipWithImport(selectedImport)} disabled={!selectedLayer || selectedLayer.locked}>Replace Selected Clip</button>
                    {selectedImport.kind !== "audio" && (
                      <button type="button" onClick={() => setImportAsBackground(selectedImport)}>Set as Background</button>
                    )}
                    <button type="button" onClick={() => deleteImport(selectedImport.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activePanel === "elements" && (
            <div className={styles.toolSection}>
              <div className={styles.panelTitle}><Shapes size={17} /> Elements</div>
              <div className={styles.elementTabs}>
                {([
                  ["assets", "Assets"],
                  ["shapes", "Shapes"],
                  ["frames", "Frames"],
                  ["grids", "Grids"],
                  ["social", "Social"],
                  ["gradients", "Gradients"],
                  ["transitions", "Transitions"],
                  ["emojis", "Emojis"],
                ] as Array<[ElementPanelTab, string]>).map(([tab, label]) => (
                  <button type="button" key={tab} className={activeElementTab === tab ? styles.activeElementTab : ""} onClick={() => setActiveElementTab(tab)}>
                    {label}
                  </button>
                ))}
              </div>

              {activeElementTab === "assets" && (
                <div className={styles.assetGrid}>
                  {libraryAssets.map((asset) => (
                    <button type="button" key={`${asset.category}-${asset.name}`} className={styles.assetCard} onClick={() => createMediaLayerFromAsset(asset)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.src} alt="" />
                      <span>{asset.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeElementTab === "shapes" && (
                <div className={styles.assetGrid}>
                  {shapePresets.map((shape) => (
                    <button type="button" key={shape.name} className={styles.assetCard} onClick={() => addShapeLayer(shape)}>
                      <span className={styles.shapePreview} style={{ background: shape.shapeType === "line" || shape.shapeType === "dashedLine" ? "transparent" : shape.color, borderColor: shape.color }}>
                        {shape.shapeType === "star" ? "*" : shape.shapeType === "arrow" ? ">" : ""}
                      </span>
                      <span>{shape.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeElementTab === "frames" && (
                <div className={styles.assetGrid}>
                  {framePresets.map((frame) => (
                    <button type="button" key={frame.name} className={styles.assetCard} onClick={() => addShapeLayer(frame)}>
                      <span className={styles.framePreview} style={{ borderColor: frame.color }} />
                      <span>{frame.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeElementTab === "grids" && (
                <div className={styles.assetGrid}>
                  {gridPresets.map((grid) => (
                    <button type="button" key={grid.name} className={styles.assetCard} onClick={() => addShapeLayer(grid)}>
                      <span className={styles.gridPreview} />
                      <span>{grid.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeElementTab === "social" && (
                <div className={styles.assetGrid}>
                  {socialAssets.map((asset) => (
                    <button type="button" key={asset.name} className={styles.assetCard} onClick={() => createMediaLayerFromAsset(asset)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.src} alt="" />
                      <span>{asset.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeElementTab === "gradients" && (
                <div className={styles.assetGrid}>
                  {gradientPresets.map((gradient) => (
                    <button
                      type="button"
                      key={gradient.name}
                      className={styles.assetCard}
                      onClick={() => addShapeLayer({ name: gradient.name, shapeType: "gradient", color: gradient.color1 }, gradient)}
                    >
                      <span className={styles.gradientPreview} style={{ background: `linear-gradient(135deg, ${gradient.color1}, ${gradient.color2})` }} />
                      <span>{gradient.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeElementTab === "transitions" && (
                <div className={styles.assetGrid}>
                  {basicTransitionPresets.map((transition) => (
                    <button
                      type="button"
                      key={transition.name}
                      className={styles.assetCard}
                      draggable
                      onClick={() => addTransitionLayer(transition)}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "copy";
                        event.dataTransfer.setData("application/x-pixores-transition-kind", transition.transitionKind);
                        event.dataTransfer.setData("text/plain", transition.transitionKind);
                      }}
                    >
                      <span className={`${styles.transitionPreview} ${styles[`transitionPreview${transition.transitionKind[0].toUpperCase()}${transition.transitionKind.slice(1)}`]}`} />
                      <span>{transition.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeElementTab === "emojis" && (
                <div className={styles.assetGrid}>
                  {emojiPresets.map((item) => (
                    <button type="button" key={item.name} className={styles.assetCard} onClick={() => addEmojiLayer(item)}>
                      <span className={styles.emojiPreview}>{item.emoji}</span>
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activePanel === "text" && (
            <div className={styles.toolSection}>
              <div className={styles.panelTitle}><Type size={17} /> Text</div>
              <button type="button" className={styles.fullButton} onClick={addTextLayer}><Type size={17} /> Add text track</button>
              <div className={styles.assetGrid}>
                {textPresets.map((preset) => (
                  <button type="button" key={preset.label} className={styles.textPresetCard} onClick={() => addTextPreset(preset)}>
                    <strong style={{ fontFamily: `${preset.fontFamily}, Arial, sans-serif`, color: preset.color }}>{preset.text}</strong>
                    <span>{preset.fontFamily}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activePanel === "project" && (
            <div className={styles.toolSection}>
              <div className={styles.panelTitle}><Film size={17} /> Project</div>
              <div className={styles.projectInfoCard}>
                <div className={styles.projectInfoTitle}>
                  <Monitor size={16} />
                  <span>Project information</span>
                </div>
                <dl className={styles.projectInfoGrid}>
                  <div>
                    <dt>Name</dt>
                    <dd>{projectTitle || "Untitled video"}</dd>
                  </div>
                  <div>
                    <dt>Resolution</dt>
                    <dd>{selectedFormat.width} x {selectedFormat.height}</dd>
                  </div>
                  <div>
                    <dt>Format</dt>
                    <dd>{projectAspectLabel}</dd>
                  </div>
                  <div>
                    <dt>Timeline</dt>
                    <dd>{formatTimelineClock(effectiveTimelineDuration)}</dd>
                  </div>
                  <div>
                    <dt>Frame rate</dt>
                    <dd>30fps</dd>
                  </div>
                  <div>
                    <dt>Audio</dt>
                    <dd>44100Hz</dd>
                  </div>
                </dl>
                <div className={styles.projectStats}>
                  <span><Layers3 size={14} /> {projectStats.tracks} tracks</span>
                  <span><Film size={14} /> {projectStats.media} media</span>
                  <span><Music size={14} /> {projectStats.audio} audio</span>
                  <span><Type size={14} /> {projectStats.text} text</span>
                  <span><Sparkles size={14} /> {projectStats.transitions} transitions</span>
                </div>
              </div>
              <label>
                Project title
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(event) => setProjectTitle(event.target.value)}
                  placeholder="Untitled video"
                />
              </label>
              <div className={styles.groupLabel}>Dimensions</div>
              <label>
                Preset
                <select
                  value={formats[formatIndex]?.id || "16_9"}
                  onChange={(event) => {
                    const nextIndex = formats.findIndex((format) => format.id === event.target.value);
                    if (nextIndex < 0) return;
                    setFormatIndex(nextIndex);
                    const nextFormat = formats[nextIndex];
                    if (nextFormat.id !== "custom") {
                      setCustomWidth(nextFormat.width);
                      setCustomHeight(nextFormat.height);
                    }
                  }}
                >
                  {formats.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.label} ({format.width}x{format.height})
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.dimensionGrid}>
                <label>
                  Width
                  <input
                    type="number"
                    min="100"
                    max="7680"
                    value={selectedFormat.width}
                    onChange={(event) => {
                      setFormatIndex(formats.findIndex((format) => format.id === "custom"));
                      setCustomWidth(clamp(Number(event.target.value), 100, 7680));
                    }}
                  />
                </label>
                <label>
                  Height
                  <input
                    type="number"
                    min="100"
                    max="7680"
                    value={selectedFormat.height}
                    onChange={(event) => {
                      setFormatIndex(formats.findIndex((format) => format.id === "custom"));
                      setCustomHeight(clamp(Number(event.target.value), 100, 7680));
                    }}
                  />
                </label>
              </div>
              <div className={styles.dimensionNote}>{selectedFormat.width} x {selectedFormat.height}px</div>

              <div className={styles.twoColumns}>
                <label>
                  Length
                  <input type="number" min="2" max="600" value={timelineDuration} onChange={(event) => setTimelineDuration(clamp(Number(event.target.value), 2, 600))} />
                </label>
                <label>
                  Background
                  <input type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
                </label>
              </div>

              <div className={styles.actions}>
                <button type="button" onClick={isRecording ? stopExport : exportVideo} className={styles.primaryAction}>
                  {isRecording ? <Square size={17} /> : <Play size={17} />}
                  {isRecording ? "Stop" : "Export MP4"}
                </button>
                {downloadUrl && (
                  <a href={downloadUrl} download={exportFileName} className={styles.downloadAction}>
                    <Download size={17} />
                    Download
                  </a>
                )}
              </div>

              <div className={styles.projectJsonActions}>
                <label className={styles.renderFormatControl}>
                  Render format
                  <select
                    value={serverExportFormatId}
                    onChange={(event) => setServerExportFormatId(event.target.value as PixoresVideoExportFormatId)}
                    disabled={isPreparingServerRender}
                  >
                    {PIXORES_VIDEO_EXPORT_FORMATS.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.label} (.{format.extension})
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={prepareServerRenderMp4} disabled={isPreparingServerRender}>
                  {isPreparingServerRender ? "Preparing Render..." : `Render ${selectedServerExportFormat.label}`}
                </button>
                {(isPreparingServerRender || serverRenderProgress > 0) && (
                  <span className={styles.renderProgress}>Render progress: {serverRenderProgress}%</span>
                )}
                <button type="button" onClick={saveProjectToCloud} disabled={isCloudSaving}>
                  {isCloudSaving ? "Saving Cloud..." : currentCloudProjectId ? "Update Cloud Project" : "Save to Cloud"}
                </button>
                <button type="button" onClick={loadCloudProjects} disabled={isCloudLoading}>
                  {isCloudLoading ? "Loading Cloud..." : "Load from Cloud"}
                </button>
                {cloudProjects.length > 0 && (
                  <div className={styles.cloudProjectList}>
                    {cloudProjects.map((project) => (
                      <div key={project.id} className={styles.cloudProjectRow}>
                        <button type="button" onClick={() => loadProjectFromCloud(project.id)} disabled={isCloudLoading}>
                          <span>{project.title}</span>
                          <small>{new Date(project.updated_at).toLocaleDateString()}</small>
                        </button>
                        <button type="button" onClick={() => deleteCloudProject(project.id)} disabled={isCloudLoading} aria-label={`Delete ${project.title}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={saveProjectJson}>Save Project JSON</button>
                <button type="button" onClick={() => projectFileInputRef.current?.click()}>Load Project JSON</button>
                <button type="button" onClick={exportProjectJson}>Export Project JSON</button>
                {serverRenderUrl && (
                  <a href={serverRenderUrl} className={styles.serverRenderDownload}>
                    Download {selectedServerExportFormat.extension.toUpperCase()}
                  </a>
                )}
                {adapters.isDesktop && (
                  <>
                    <button type="button" onClick={saveDesktopProjectPackage}>Save Desktop Project</button>
                    <button type="button" onClick={openDesktopProjectPackage}>Open Desktop Project</button>
                  </>
                )}
                <input
                  ref={projectFileInputRef}
                  className={styles.hiddenFileInput}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleProjectFileChange}
                />
              </div>

              <div className={styles.status}>{status}</div>
            </div>
          )}

          {activePanel === "settings" && selectedLayer && (
            <div className={styles.layerEditor}>
              <div className={styles.editorTop}>
                <strong>Track settings</strong>
                <div>
                  <button type="button" onClick={() => updateLayer(selectedLayer.id, { visible: !selectedLayer.visible })} className={styles.smallIconButton}>
                    {selectedLayer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button type="button" onClick={() => updateLayer(selectedLayer.id, { locked: !selectedLayer.locked })} className={styles.smallIconButton}>
                    {selectedLayer.locked ? <Lock size={15} /> : <Unlock size={15} />}
                  </button>
                </div>
              </div>

              <label>
                Track name
                <input disabled={selectedLayer.locked} value={selectedLayer.name} onChange={(event) => updateLayer(selectedLayer.id, { name: event.target.value })} />
              </label>

              <details className={styles.editSection} open>
                <summary>Quick actions</summary>
                <div className={styles.actionGrid}>
                  <button type="button" onClick={duplicateSelectedLayer} disabled={selectedLayer.locked}>Duplicate</button>
                  <button type="button" onClick={() => deleteSelectedLayer()} disabled={selectedLayer.locked}>Delete</button>
                  <button type="button" onClick={() => updateLayer(selectedLayer.id, { isFlippedH: !selectedLayer.isFlippedH })} className={selectedLayer.isFlippedH ? styles.activeToggle : ""}>Flip H</button>
                  <button type="button" onClick={() => updateLayer(selectedLayer.id, { isFlippedV: !selectedLayer.isFlippedV })} className={selectedLayer.isFlippedV ? styles.activeToggle : ""}>Flip V</button>
                </div>
              </details>

              <details className={styles.editSection} open>
                <summary>Transform</summary>
                <div className={styles.twoColumns}>
                  <label>
                    Width %
                    <input disabled={selectedLayer.locked} type="number" min="1" max="100" value={selectedLayer.width} onChange={(event) => updateLayer(selectedLayer.id, { width: clamp(Number(event.target.value), 1, 100) })} />
                  </label>
                  <label>
                    Height %
                    <input disabled={selectedLayer.locked} type="number" min="1" max="100" value={selectedLayer.height} onChange={(event) => updateLayer(selectedLayer.id, { height: clamp(Number(event.target.value), 1, 100) })} />
                  </label>
                </div>
                <label>
                  Rotation {selectedLayer.angle || 0} deg
                  <input disabled={selectedLayer.locked} type="range" min="0" max="360" step="1" value={selectedLayer.angle || 0} onChange={(event) => updateLayer(selectedLayer.id, { angle: Number(event.target.value) })} />
                </label>
                <label>
                  Round corners {selectedLayer.borderRadius || 0}px
                  <input disabled={selectedLayer.locked} type="range" min="0" max="160" step="1" value={selectedLayer.borderRadius || 0} onChange={(event) => updateLayer(selectedLayer.id, { borderRadius: Number(event.target.value) })} />
                </label>
              </details>

              <details className={styles.editSection} open>
                <summary>Appearance</summary>
                <label>
                  Transparency {Math.round((selectedLayer.opacity ?? 1) * 100)}%
                  <input disabled={selectedLayer.locked} type="range" min="0" max="1" step="0.05" value={selectedLayer.opacity} onChange={(event) => updateLayer(selectedLayer.id, { opacity: Number(event.target.value) })} />
                </label>
                <label>
                  Blur {selectedLayer.blur || 0}px
                  <input disabled={selectedLayer.locked} type="range" min="0" max="20" step="1" value={selectedLayer.blur || 0} onChange={(event) => updateLayer(selectedLayer.id, { blur: Number(event.target.value) })} />
                </label>
                <div className={styles.colorGrid}>
                  <label>
                    Shadow
                    <input disabled={selectedLayer.locked} type="color" value={selectedLayer.shadowColor || "#000000"} onChange={(event) => updateLayer(selectedLayer.id, { shadowColor: event.target.value })} />
                  </label>
                  <label>
                    Shadow blur
                    <input disabled={selectedLayer.locked} type="number" min="0" max="35" value={selectedLayer.shadowBlur || 0} onChange={(event) => updateLayer(selectedLayer.id, { shadowBlur: Number(event.target.value), shadowOffsetX: selectedLayer.shadowOffsetX || 4, shadowOffsetY: selectedLayer.shadowOffsetY || 4 })} />
                  </label>
                </div>
                <div className={styles.twoColumns}>
                  <label>
                    Shadow X
                    <input disabled={selectedLayer.locked} type="number" min="-60" max="60" value={selectedLayer.shadowOffsetX || 0} onChange={(event) => updateLayer(selectedLayer.id, { shadowOffsetX: Number(event.target.value) })} />
                  </label>
                  <label>
                    Shadow Y
                    <input disabled={selectedLayer.locked} type="number" min="-60" max="60" value={selectedLayer.shadowOffsetY || 0} onChange={(event) => updateLayer(selectedLayer.id, { shadowOffsetY: Number(event.target.value) })} />
                  </label>
                </div>
              </details>

              {selectedLayer.type === "text" && (
                <>
                  <label>
                    Text
                    <input disabled={selectedLayer.locked} value={selectedLayer.text || ""} onChange={(event) => updateLayer(selectedLayer.id, { text: event.target.value })} />
                  </label>
                  <div className={styles.colorGrid}>
                    <label>
                      Color
                      <input disabled={selectedLayer.locked} type="color" value={selectedLayer.color || "#ffffff"} onChange={(event) => updateLayer(selectedLayer.id, { color: event.target.value })} />
                    </label>
                    <label>
                      Font
                      <input disabled={selectedLayer.locked} type="number" min="18" max="140" value={selectedLayer.fontSize || 48} onChange={(event) => updateLayer(selectedLayer.id, { fontSize: Number(event.target.value) })} />
                    </label>
                  </div>
                  <label>
                    Typeface
                    <select
                      disabled={selectedLayer.locked}
                      value={selectedLayer.fontFamily || "Anton"}
                      onChange={(event) => {
                        ensureVideoMakerFontLoaded(event.target.value);
                        updateLayer(selectedLayer.id, { fontFamily: event.target.value });
                      }}
                    >
                      {fontGroups.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.fonts.map((font) => (
                            <option key={font} value={font}>{font}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <details className={styles.editSection} open>
                    <summary>Text controls</summary>
                    <div className={styles.actionGrid}>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.isBold !== false ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { isBold: selectedLayer.isBold === false })}>Bold</button>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.isItalic ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { isItalic: !selectedLayer.isItalic })}>Italic</button>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.isUnderline ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { isUnderline: !selectedLayer.isUnderline })}>Underline</button>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.hasTextBg ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { hasTextBg: !selectedLayer.hasTextBg })}>Text BG</button>
                      <button type="button" disabled={selectedLayer.locked} className={(selectedLayer.textAlign || "left") === "left" ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { textAlign: "left" })}>Left</button>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.textAlign === "center" ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { textAlign: "center" })}>Center</button>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.textAlign === "right" ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { textAlign: "right" })}>Right</button>
                      <button type="button" disabled={selectedLayer.locked} className={selectedLayer.isStrikethrough ? styles.activeToggle : ""} onClick={() => updateLayer(selectedLayer.id, { isStrikethrough: !selectedLayer.isStrikethrough })}>Strike</button>
                    </div>
                    <div className={styles.colorGrid}>
                      <label>
                        Text BG
                        <input disabled={selectedLayer.locked} type="color" value={selectedLayer.textBgColor || "#000000"} onChange={(event) => updateLayer(selectedLayer.id, { textBgColor: event.target.value, hasTextBg: true })} />
                      </label>
                      <label>
                        BG padding
                        <input disabled={selectedLayer.locked} type="number" min="0" max="40" value={selectedLayer.textBgPadding || 8} onChange={(event) => updateLayer(selectedLayer.id, { textBgPadding: Number(event.target.value), hasTextBg: true })} />
                      </label>
                    </div>
                    <label>
                      Letter spacing {selectedLayer.letterSpacing || 0}px
                      <input disabled={selectedLayer.locked} type="range" min="-2" max="24" step="1" value={selectedLayer.letterSpacing || 0} onChange={(event) => updateLayer(selectedLayer.id, { letterSpacing: Number(event.target.value) })} />
                    </label>
                    <label>
                      Line height {selectedLayer.lineHeight || 1.08}
                      <input disabled={selectedLayer.locked} type="range" min="0.75" max="2" step="0.05" value={selectedLayer.lineHeight || 1.08} onChange={(event) => updateLayer(selectedLayer.id, { lineHeight: Number(event.target.value) })} />
                    </label>
                    <div className={styles.colorGrid}>
                      <label>
                        Outline
                        <input disabled={selectedLayer.locked} type="color" value={selectedLayer.strokeColor || "#000000"} onChange={(event) => updateLayer(selectedLayer.id, { strokeColor: event.target.value })} />
                      </label>
                      <label>
                        Outline px
                        <input disabled={selectedLayer.locked} type="number" min="0" max="18" value={selectedLayer.strokeWidth || 0} onChange={(event) => updateLayer(selectedLayer.id, { strokeWidth: Number(event.target.value) })} />
                      </label>
                    </div>
                    <div className={styles.colorGrid}>
                      <label>
                        Glow
                        <input disabled={selectedLayer.locked} type="color" value={selectedLayer.glowColor || "#ffff00"} onChange={(event) => updateLayer(selectedLayer.id, { glowColor: event.target.value })} />
                      </label>
                      <label>
                        Glow px
                        <input disabled={selectedLayer.locked} type="number" min="0" max="40" value={selectedLayer.glowRadius || 0} onChange={(event) => updateLayer(selectedLayer.id, { glowRadius: Number(event.target.value) })} />
                      </label>
                    </div>
                  </details>
                </>
              )}

              {selectedLayer.type === "shape" && (
                <>
                  <div className={styles.colorGrid}>
                    <label>
                      Color
                      <input disabled={selectedLayer.locked} type="color" value={selectedLayer.color || "#3B82F6"} onChange={(event) => updateLayer(selectedLayer.id, { color: event.target.value, gradientColor1: selectedLayer.shapeType === "gradient" ? event.target.value : selectedLayer.gradientColor1 })} />
                    </label>
                    <label>
                      Shape
                      <select disabled={selectedLayer.locked} value={selectedLayer.shapeType || "rectangle"} onChange={(event) => updateLayer(selectedLayer.id, { shapeType: event.target.value as ShapeType })}>
                        {[...shapePresets, ...framePresets, ...gridPresets, { name: "Gradient", shapeType: "gradient" as const, color: "#2563EB" }].map((shape) => (
                          <option key={`${shape.shapeType}-${shape.name}`} value={shape.shapeType}>{shape.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {selectedLayer.shapeType === "gradient" && (
                    <div className={styles.colorGrid}>
                      <label>
                        Start
                        <input disabled={selectedLayer.locked} type="color" value={selectedLayer.gradientColor1 || selectedLayer.color || "#2563EB"} onChange={(event) => updateLayer(selectedLayer.id, { gradientColor1: event.target.value, color: event.target.value })} />
                      </label>
                      <label>
                        End
                        <input disabled={selectedLayer.locked} type="color" value={selectedLayer.gradientColor2 || "#FFFFFF"} onChange={(event) => updateLayer(selectedLayer.id, { gradientColor2: event.target.value })} />
                      </label>
                    </div>
                  )}
                </>
              )}

              {selectedLayer.type === "media" && (
                <details className={styles.editSection} open>
                  <summary>Media tools</summary>
                  {(selectedLayer.mediaKind === "image" || selectedLayer.mediaKind === "video") && (
                    <div className={styles.actionGrid}>
                      <button type="button" disabled={selectedLayer.locked} onClick={fitSelectedMediaToCanvas}>Fit Selected to Canvas</button>
                      <button type="button" disabled={selectedLayer.locked} onClick={fillSelectedMediaCanvas}>Fill Canvas</button>
                      <button type="button" disabled={selectedLayer.locked} onClick={makeSelectedMediaOverlay}>Overlay 40%</button>
                    </div>
                  )}
                  <label>
                    Layer fit
                    <select
                      disabled={selectedLayer.locked}
                      value={selectedLayer.objectFit || "cover"}
                      onChange={(event) => updateLayer(selectedLayer.id, { objectFit: event.target.value as VideoLayer["objectFit"] })}
                    >
                      <option value="contain">Contain / show whole media</option>
                      <option value="cover">Cover / fill box</option>
                    </select>
                  </label>
                  <div className={styles.colorGrid}>
                    <label>
                      Outline
                      <input disabled={selectedLayer.locked} type="color" value={selectedLayer.strokeColor || "#ffffff"} onChange={(event) => updateLayer(selectedLayer.id, { strokeColor: event.target.value })} />
                    </label>
                    <label>
                      Outline px
                      <input disabled={selectedLayer.locked} type="number" min="0" max="30" value={selectedLayer.strokeWidth || 0} onChange={(event) => updateLayer(selectedLayer.id, { strokeWidth: Number(event.target.value) })} />
                    </label>
                  </div>
                  <label>
                    Blend mode
                    <select disabled={selectedLayer.locked} value={selectedLayer.blendMode || "normal"} onChange={(event) => updateLayer(selectedLayer.id, { blendMode: event.target.value as VideoLayer["blendMode"] })}>
                      <option value="normal">Keep original</option>
                      <option value="multiply">Drop white background</option>
                      <option value="screen">Drop black background</option>
                      <option value="darken">Darken</option>
                      <option value="lighten">Lighten</option>
                    </select>
                  </label>
                </details>
              )}

              {selectedLayer.type === "audio" && (
                <details className={styles.editSection} open>
                  <summary>Audio tools</summary>
                  <label>
                    Volume
                    <input
                      disabled={selectedLayer.locked}
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedLayer.volume ?? masterVolume}
                      onChange={(event) => updateLayer(selectedLayer.id, { volume: Number(event.target.value) })}
                    />
                  </label>
                  <span className={styles.settingNote}>Separated audio track from the video clip.</span>
                </details>
              )}

              {selectedLayer.type === "transition" && (
                <details className={styles.editSection} open>
                  <summary>Transition tools</summary>
                  <label>
                    Type
                    <select
                      disabled={selectedLayer.locked}
                      value={selectedLayer.transitionKind || "fade"}
                      onChange={(event) => updateLayer(selectedLayer.id, { transitionKind: event.target.value as TransitionType })}
                    >
                      {basicTransitionPresets.map((transition) => (
                        <option key={transition.transitionKind} value={transition.transitionKind}>{transition.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Color
                    <input disabled={selectedLayer.locked} type="color" value={selectedLayer.color || "#000000"} onChange={(event) => updateLayer(selectedLayer.id, { color: event.target.value })} />
                  </label>
                  <label>
                    From layer
                    <select disabled={selectedLayer.locked} value={selectedLayer.fromLayerId || ""} onChange={(event) => updateLayer(selectedLayer.id, { fromLayerId: event.target.value || undefined })}>
                      <option value="">Auto / none</option>
                      {layers.filter((layer) => layer.type !== "transition" && layer.type !== "audio").map((layer) => (
                        <option key={layer.id} value={layer.id}>{layer.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    To layer
                    <select disabled={selectedLayer.locked} value={selectedLayer.toLayerId || ""} onChange={(event) => updateLayer(selectedLayer.id, { toLayerId: event.target.value || undefined })}>
                      <option value="">Auto / none</option>
                      {layers.filter((layer) => layer.type !== "transition" && layer.type !== "audio").map((layer) => (
                        <option key={layer.id} value={layer.id}>{layer.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Easing
                    <select disabled={selectedLayer.locked} value={selectedLayer.easing || "easeInOut"} onChange={(event) => updateLayer(selectedLayer.id, { easing: event.target.value as VideoLayer["easing"] })}>
                      <option value="linear">Linear</option>
                      <option value="easeIn">Ease in</option>
                      <option value="easeOut">Ease out</option>
                      <option value="easeInOut">Ease in/out</option>
                    </select>
                  </label>
                </details>
              )}

              {(selectedLayer.type === "text" || selectedLayer.type === "shape" || selectedLayer.type === "media") && (
                <details className={styles.editSection} open>
                  <summary>Animation</summary>
                  <label>
                    Animation
                    <select
                      disabled={selectedLayer.locked}
                      value={selectedLayer.animations?.[0]?.type || ""}
                      onChange={(event) => updateLayerAnimation(selectedLayer, { type: event.target.value as LayerAnimationType | "" })}
                    >
                      {animationPresets.map((animation) => (
                        <option key={animation.label} value={animation.type}>{animation.label}</option>
                      ))}
                    </select>
                  </label>
                  {selectedLayer.animations?.[0] && (
                    <div className={styles.twoColumns}>
                      <label>
                        Start
                        <input
                          disabled={selectedLayer.locked}
                          type="number"
                          min="0"
                          max={selectedLayer.duration}
                          step="0.1"
                          value={selectedLayer.animations[0].start}
                          onChange={(event) => updateLayerAnimation(selectedLayer, { start: Number(event.target.value) })}
                        />
                      </label>
                      <label>
                        Duration
                        <input
                          disabled={selectedLayer.locked}
                          type="number"
                          min="0.05"
                          max={selectedLayer.duration}
                          step="0.05"
                          value={selectedLayer.animations[0].duration}
                          onChange={(event) => updateLayerAnimation(selectedLayer, { duration: Number(event.target.value) })}
                        />
                      </label>
                    </div>
                  )}
                </details>
              )}

              {(selectedLayer.type === "text" || selectedLayer.type === "shape" || selectedLayer.type === "media") && (
                <details className={styles.editSection}>
                  <summary>Keyframes</summary>
                  <span className={styles.settingNote}>Render server uses these keyframes. Preview local will improve later.</span>
                  <div className={styles.keyframeActions}>
                    {(["x", "y", "opacity", "angle"] as KeyframeProperty[]).map((property) => (
                      <button
                        key={property}
                        type="button"
                        disabled={selectedLayer.locked}
                        onClick={() => addLayerKeyframe(selectedLayer, property)}
                      >
                        + {property}
                      </button>
                    ))}
                  </div>
                  {(selectedLayer.keyframes || []).length > 0 ? (
                    <div className={styles.keyframeList}>
                      {[...(selectedLayer.keyframes || [])].sort((a, b) => a.time - b.time).map((keyframe) => (
                        <div key={keyframe.id} className={styles.keyframeRow}>
                          <span>{keyframe.property}</span>
                          <span>{keyframe.time.toFixed(2)}s</span>
                          <span>{Number(keyframe.value.toFixed(2))}</span>
                          <button
                            type="button"
                            disabled={selectedLayer.locked}
                            onClick={() => deleteLayerKeyframe(selectedLayer, keyframe.id)}
                            aria-label={`Delete ${keyframe.property} keyframe`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.settingNote}>No keyframes yet.</span>
                  )}
                </details>
              )}

              <div className={styles.twoColumns}>
                <label>
                  Start
                  <input disabled={selectedLayer.locked} type="number" min="0" max={effectiveTimelineDuration} step="0.1" value={selectedLayer.start} onChange={(event) => updateLayer(selectedLayer.id, { start: clamp(Number(event.target.value), 0, effectiveTimelineDuration) })} />
                </label>
                <label>
                  Duration
                  <input disabled={selectedLayer.locked} type="number" min="0.2" max={effectiveTimelineDuration} step="0.1" value={selectedLayer.duration} onChange={(event) => updateLayer(selectedLayer.id, { duration: clamp(Number(event.target.value), 0.2, effectiveTimelineDuration) })} />
                </label>
              </div>

              {selectedLayer.type !== "audio" && selectedLayer.type !== "transition" && (
                <>
                  <div className={styles.twoColumns}>
                    <label>
                      X
                      <input disabled={selectedLayer.locked} type="number" min="0" max="100" value={selectedLayer.x} onChange={(event) => updateLayer(selectedLayer.id, { x: clamp(Number(event.target.value), 0, 100) })} />
                    </label>
                    <label>
                      Y
                      <input disabled={selectedLayer.locked} type="number" min="0" max="100" value={selectedLayer.y} onChange={(event) => updateLayer(selectedLayer.id, { y: clamp(Number(event.target.value), 0, 100) })} />
                    </label>
                  </div>

                  <label>
                    Opacity
                    <input disabled={selectedLayer.locked} type="range" min="0" max="1" step="0.05" value={selectedLayer.opacity} onChange={(event) => updateLayer(selectedLayer.id, { opacity: Number(event.target.value) })} />
                  </label>
                </>
              )}

              <button type="button" disabled={selectedLayer.locked} onClick={() => removeLayer(selectedLayer.id)} className={styles.dangerButton}>Delete track</button>
            </div>
          )}
        </aside>

        {isSidebarOpen && (
          <div
            className={styles.columnResizeHandle}
            role="separator"
            aria-label="Resize side panel"
            onPointerDown={(event) => beginLayoutResize(event, "sidebar")}
          />
        )}

        <main
          className={styles.mainEditor}
          style={{ gridTemplateRows: `46px minmax(0, 1fr) 8px ${timelineHeight}px` }}
        >
          <header className={styles.topBar}>
            <div>
              <span className={styles.kicker}><Film size={17} /> Pixores Video Maker</span>
              <h1>Video editor</h1>
            </div>
            <div className={styles.topBarActions}>
              <label className={styles.backgroundControl}>
                <span>Background</span>
                <input type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
              </label>
              <button type="button" onClick={undo} disabled={!canUndo} className={styles.topIconButton} aria-label="Undo"><Undo2 size={17} /></button>
              <button type="button" onClick={redo} disabled={!canRedo} className={styles.topIconButton} aria-label="Redo"><Redo2 size={17} /></button>
              <button type="button" onClick={() => void pasteFromClipboard()} className={styles.topIconButton} aria-label="Paste"><ClipboardPaste size={17} /></button>
              <button type="button" onClick={isRecording ? stopExport : exportVideo} className={styles.exportButton}>
                {isRecording ? <Square size={17} /> : <Download size={17} />}
                {isRecording ? "Stop" : "Export"}
              </button>
            </div>
          </header>

          <div className={styles.workspace}>
          <div className={styles.previewColumn}>
            <div ref={previewPanelRef} className={styles.previewPanel}>
              {selectedLayer?.type === "text" && (
                <div className={styles.floatingTextToolbar} onPointerDown={(event) => event.stopPropagation()}>
                  <button type="button" className={styles.durationPill} onClick={openSettingsPanel}>
                    <span className={styles.clockGlyph} />
                    {selectedLayer.duration.toFixed(1)}s
                  </button>
                  <select
                    aria-label="Text font"
                    value={selectedLayer.fontFamily || "Anton"}
                    onChange={(event) => {
                      ensureVideoMakerFontLoaded(event.target.value);
                      updateLayer(selectedLayer.id, { fontFamily: event.target.value });
                    }}
                  >
                    {fontGroups.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.fonts.map((font) => (
                          <option key={font} value={font}>{font}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div className={styles.fontStepper}>
                    <button type="button" aria-label="Decrease font size" onClick={() => updateLayer(selectedLayer.id, { fontSize: Math.max(8, (selectedLayer.fontSize || 48) - 2) })}><Minus size={15} /></button>
                    <input aria-label="Font size" type="number" min="8" max="300" value={selectedLayer.fontSize || 48} onChange={(event) => updateLayer(selectedLayer.id, { fontSize: clamp(Number(event.target.value), 8, 300) })} />
                    <button type="button" aria-label="Increase font size" onClick={() => updateLayer(selectedLayer.id, { fontSize: Math.min(300, (selectedLayer.fontSize || 48) + 2) })}><Plus size={15} /></button>
                  </div>
                  <label className={styles.toolbarColor} aria-label="Text color">
                    <Baseline size={20} />
                    <span style={{ background: selectedLayer.color || "#ffffff" }} />
                    <input type="color" value={selectedLayer.color || "#ffffff"} onChange={(event) => updateLayer(selectedLayer.id, { color: event.target.value })} />
                  </label>
                  <button type="button" className={selectedLayer.isBold !== false ? styles.activeToolbarButton : ""} aria-label="Bold" onClick={() => updateLayer(selectedLayer.id, { isBold: selectedLayer.isBold === false })}><Bold size={19} /></button>
                  <button type="button" className={selectedLayer.isItalic ? styles.activeToolbarButton : ""} aria-label="Italic" onClick={() => updateLayer(selectedLayer.id, { isItalic: !selectedLayer.isItalic })}><Italic size={19} /></button>
                  <button type="button" className={selectedLayer.isUnderline ? styles.activeToolbarButton : ""} aria-label="Underline" onClick={() => updateLayer(selectedLayer.id, { isUnderline: !selectedLayer.isUnderline })}><Underline size={19} /></button>
                  <button type="button" className={selectedLayer.isStrikethrough ? styles.activeToolbarButton : ""} aria-label="Strikethrough" onClick={() => updateLayer(selectedLayer.id, { isStrikethrough: !selectedLayer.isStrikethrough })}><Strikethrough size={18} /></button>
                  <button type="button" className={selectedLayer.isUppercase ? styles.activeToolbarButton : ""} aria-label="Uppercase" onClick={() => updateLayer(selectedLayer.id, { isUppercase: !selectedLayer.isUppercase })}><CaseSensitive size={19} /></button>
                  <div className={styles.alignGroup} aria-label="Text alignment">
                    <button type="button" className={(selectedLayer.textAlign || "left") === "left" ? styles.activeToolbarButton : ""} aria-label="Align left" onClick={() => updateLayer(selectedLayer.id, { textAlign: "left" })}><AlignLeft size={18} /></button>
                    <button type="button" className={selectedLayer.textAlign === "center" ? styles.activeToolbarButton : ""} aria-label="Align center" onClick={() => updateLayer(selectedLayer.id, { textAlign: "center" })}><AlignCenter size={18} /></button>
                    <button type="button" className={selectedLayer.textAlign === "right" ? styles.activeToolbarButton : ""} aria-label="Align right" onClick={() => updateLayer(selectedLayer.id, { textAlign: "right" })}><AlignRight size={18} /></button>
                  </div>
                  <button type="button" className={selectedLayer.hasBullets ? styles.activeToolbarButton : ""} aria-label="Bullets" onClick={() => toggleTextBullets(selectedLayer)}><List size={19} /></button>
                  <button type="button" aria-label="Text spacing" onClick={openSettingsPanel}>T</button>
                  <button type="button" aria-label="Transparency" onClick={() => updateLayer(selectedLayer.id, { opacity: selectedLayer.opacity < 1 ? 1 : 0.65 })} className={selectedLayer.opacity < 1 ? styles.activeToolbarButton : ""}>Opacity</button>
                  <button type="button" className={styles.textToolbarButton} onClick={openSettingsPanel}><Sparkles size={15} /> Effects</button>
                  <button type="button" className={styles.textToolbarButton} onClick={openSettingsPanel}>Animate</button>
                  <button type="button" className={styles.textToolbarButton} onClick={openSettingsPanel}>Position</button>
                  <button type="button" aria-label="Copy style" onClick={openSettingsPanel}><PaintRoller size={19} /></button>
                </div>
              )}
              <div className={styles.canvasFrame} style={canvasStyle}>
                <canvas ref={canvasRef} className={styles.canvas} />
                <div
                  className={styles.stageOverlay}
                  data-preview-stage
                  onPointerDown={selectStageLayerAtPoint}
                >
                  {[...visibleStageLayers].reverse().map((layer) => (
                    <div
                      key={layer.id}
                      className={`${styles.stageElement} ${layer.id === selectedLayerId ? styles.activeStageElement : ""} ${layer.locked ? styles.lockedStageElement : ""}`}
                      style={{
                        left: `${layer.x}%`,
                        top: `${layer.y}%`,
                        width: `${layer.width}%`,
                        height: `${layer.height}%`,
                        transform: `rotate(${layer.angle || 0}deg) scale(${layer.isFlippedH ? -1 : 1}, ${layer.isFlippedV ? -1 : 1})`,
                      }}
                      onPointerDown={(event) => beginStageEdit(event, layer, "move")}
                      onPointerMove={(event) => updateStageElementFromPointer(event.clientX, event.clientY, event.shiftKey)}
                      onPointerUp={endStageEdit}
                      onPointerCancel={endStageEdit}
                    >
                      {layer.id === selectedLayerId && !layer.locked && (
                        <span
                          className={styles.stageRotateHandle}
                          onPointerDown={(event) => beginStageEdit(event, layer, "rotate")}
                          onPointerMove={(event) => updateStageElementFromPointer(event.clientX, event.clientY, event.shiftKey)}
                          onPointerUp={endStageEdit}
                          onPointerCancel={endStageEdit}
                          title={`${Math.round(layer.angle || 0)} deg`}
                        />
                      )}
                      {(["top", "right", "bottom", "left", "topLeft", "topRight", "bottomLeft", "bottomRight"] as CanvasResizeEdge[]).map((edge) => (
                        <span
                          key={edge}
                          className={`${styles.stageResizeHandle} ${styles[`stageResize${edge[0].toUpperCase()}${edge.slice(1)}`]}`}
                          onPointerDown={(event) => startLayerResize(event, layer, edge)}
                          onPointerMove={(event) => updateStageElementFromPointer(event.clientX, event.clientY, event.shiftKey)}
                          onPointerUp={endStageEdit}
                          onPointerCancel={endStageEdit}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                {!selectedLayerId && (["top", "right", "bottom", "left", "topLeft", "topRight", "bottomLeft", "bottomRight"] as CanvasResizeEdge[]).map((edge) => (
                  <span
                    key={edge}
                    className={`${styles.canvasResizeHandle} ${styles[`canvasResize${edge[0].toUpperCase()}${edge.slice(1)}`]}`}
                    onPointerDown={(event) => startCanvasResize(event, edge)}
                  />
                ))}
              </div>
            </div>

            <div className={styles.transport}>
              <button type="button" onClick={() => stepFrame(-1)} className={styles.iconButton} aria-label="Previous frame">
                <SkipBack size={16} />
              </button>
              <button type="button" onClick={togglePlayback} className={styles.iconButton} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause size={17} /> : <Play size={17} />}
              </button>
              <button type="button" onClick={stopPlayback} className={styles.iconButton} aria-label="Stop">
                <Square size={15} />
              </button>
              <button type="button" onClick={() => stepFrame(1)} className={styles.iconButton} aria-label="Next frame">
                <SkipForward size={16} />
              </button>
              <button type="button" onClick={toggleCanvasFullscreen} className={styles.iconButton} aria-label="Fullscreen preview">
                <Maximize2 size={17} />
              </button>
              <button type="button" onClick={snapshotCanvas} className={styles.iconButton} aria-label="Snapshot">
                <Camera size={16} />
              </button>
              <input
                type="range"
                min="0"
                max={effectiveTimelineDuration}
                step={1 / 30}
                value={currentTime}
                onChange={(event) => {
                  setIsPlaying(false);
                  setCurrentTime(Number(event.target.value));
                }}
              />
              <button type="button" onClick={() => setMarkInTime(currentTime)} className={styles.markButton}>{"{"}</button>
              <button type="button" onClick={() => setMarkOutTime(currentTime)} className={styles.markButton}>{"}"}</button>
              <button type="button" onClick={splitSelectedLayer} disabled={!selectedLayer || selectedLayer.locked} className={styles.iconButton} aria-label="Split at playhead">
                <Scissors size={16} />
              </button>
              <label className={styles.volumeControl} aria-label="Preview volume">
                {masterVolume <= 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={masterVolume}
                  onChange={(event) => setMasterVolume(Number(event.target.value))}
                />
              </label>
              <select
                className={styles.canvasZoomSelect}
                value={canvasZoom}
                onChange={(event) => {
                  setCanvasZoom(event.target.value);
                  setManualCanvasWidth(null);
                }}
                aria-label="Canvas zoom"
              >
                <option value="fit">Fit</option>
                <option value="25">25%</option>
                <option value="50">50%</option>
                <option value="75">75%</option>
                <option value="100">100%</option>
                <option value="150">150%</option>
                <option value="200">200%</option>
              </select>
              <button type="button" className={styles.iconButton} aria-label="Player settings">
                <Settings size={16} />
              </button>
              <span>{formatTimecode(currentTime)} / {formatTimecode(effectiveTimelineDuration)}</span>
              {(markInTime !== null || markOutTime !== null) && (
                <span className={styles.markReadout}>
                  IN {markInTime === null ? "--:--:--:--" : formatTimecode(markInTime)} · OUT {markOutTime === null ? "--:--:--:--" : formatTimecode(markOutTime)}
                </span>
              )}
            </div>
          </div>
          </div>

          <div
            className={styles.timelineResizeHandle}
            role="separator"
            aria-label="Resize timeline"
            onPointerDown={(event) => beginLayoutResize(event, "timeline")}
          />

          <section className={styles.timeline} aria-label="Layer timeline">
          <div className={styles.timelineHeader}>
            <div>
              <span>Timeline</span>
              <span className={styles.timelineHint}>{formatTimelineClock(currentTime)} / {formatTimelineClock(effectiveTimelineDuration)} · {projectStats.tracks} tracks · {projectAspectLabel}</span>
            </div>
            <div className={styles.timelineTools}>
              <button type="button" onClick={undo} disabled={!canUndo} title="Undo"><Undo2 size={15} /></button>
              <button type="button" onClick={redo} disabled={!canRedo} title="Redo"><Redo2 size={15} /></button>
              <button type="button" onClick={addEmptyTrack} title="New empty track"><Plus size={15} /> Track</button>
              <button type="button" onClick={splitSelectedLayer} disabled={!selectedLayer || selectedLayer.locked} title="Split selected clip"><Scissors size={15} /> Split</button>
              <button type="button" onClick={duplicateSelectedLayer} disabled={!selectedLayer || selectedLayer.locked} title="Duplicate selected clip"><ClipboardPaste size={15} /> Duplicate</button>
              <button type="button" onClick={() => deleteSelectedLayer()} disabled={!selectedLayer || selectedLayer.locked} title="Delete selected clip"><Trash2 size={15} /></button>
              <button type="button" onClick={extractAudioFromSelectedVideo} disabled={!selectedLayer || selectedLayer.type !== "media" || selectedLayer.mediaKind !== "video" || selectedLayer.locked} title="Detach audio"><Music size={15} /> Audio</button>
              <button type="button" onClick={() => setCurrentTime(0)} title="Go to start"><ArrowLeft size={15} /></button>
              <button type="button" onClick={() => setCurrentTime(effectiveTimelineDuration)} title="Go to end"><ArrowRight size={15} /></button>
              <button type="button" onClick={fitTimelineToView} title="Fit timeline"><SlidersHorizontal size={15} /> Fit</button>
              <div className={styles.timelineZoomControl}>
                <button type="button" onClick={() => zoomTimeline(-0.25)} aria-label="Zoom out"><Minus size={14} /></button>
                <input type="range" min="1" max="3" step="0.25" value={timelineZoom} onChange={(event) => setTimelineZoom(Number(event.target.value))} />
                <button type="button" onClick={() => zoomTimeline(0.25)} aria-label="Zoom in"><Plus size={14} /></button>
              </div>
            </div>
          </div>
          <div className={styles.timelineScroll}>
            <div className={styles.timelineInner} style={timelineInnerStyle}>
              <div className={styles.timeRuler} onPointerDown={seekFromTimelineElement}>
                {timelineMarks.map((mark) => (
                  <span key={mark} style={{ left: `${(mark / effectiveTimelineDuration) * 100}%` }}>{mark}s</span>
                ))}
                <span
                  className={styles.rulerPlayhead}
                  style={{ left: `${(currentTime / effectiveTimelineDuration) * 100}%` }}
                  onPointerDown={beginPlayheadDrag}
                  onPointerMove={dragPlayhead}
                  onPointerUp={endPlayheadDrag}
                  onPointerCancel={endPlayheadDrag}
                />
              </div>
              <div className={styles.timelineRows}>
                {trackGroups.length === 0 && (
                  <div className={styles.emptyTimelineDrop}>
                    <FolderOpen size={22} />
                    <span>Import media or add a text track to start editing</span>
                    <button type="button" onClick={() => { setActivePanel("imports"); setIsSidebarOpen(true); }}>Open media</button>
                  </div>
                )}
                {trackGroups.map(({ trackId, name, clips, emptyTrack }) => {
                  const firstClip = clips[0];
                  const isSelectedTrack = clips.some((clip) => clip.id === selectedLayerId);
                  const isActiveTrack = isSelectedTrack || selectedTrackId === trackId;
                  const isLockedTrack = clips.length ? clips.some((clip) => clip.locked) : !!emptyTrack?.locked;
                  const isVisibleTrack = clips.length ? clips.some((clip) => clip.visible) : emptyTrack?.visible !== false;
                  const isMutedTrack = clips.length ? clips.every((clip) => (clip.volume ?? 1) <= 0) : !!emptyTrack?.muted;
                  const trackKindLabel = firstClip ? (firstClip.type === "media" ? firstClip.mediaKind || "media" : firstClip.type) : "empty";
                  const trackTransitions = layers.filter((layer) => (
                    layer.type === "transition"
                    && (layer.trackId || layer.id) === trackId
                    && layer.visible
                  ));
                  return (
                  <div
                    role="button"
                    tabIndex={0}
                    key={trackId}
                    className={`${styles.timelineRow} ${isActiveTrack ? styles.activeTimelineRow : ""} ${isLockedTrack ? styles.lockedTimelineRow : ""}`}
                    onClick={(event) => {
                      if (event.target === event.currentTarget) {
                        setSelectedLayerId(firstClip?.id || "");
                        setSelectedTrackId(trackId);
                      }
                    }}
                    onDragOver={(event) => {
                      if (draggingLayerId && draggingLayerId !== trackId) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const activeId = event.dataTransfer.getData("text/plain") || draggingLayerId;
                      if (activeId) reorderLayer(activeId, trackId);
                      setDraggingLayerId(null);
                    }}
                    onDragEnd={() => setDraggingLayerId(null)}
                  >
                    <span
                      className={styles.trackName}
                      draggable={!isLockedTrack}
                      onDragStart={(event) => {
                        if (isLockedTrack) {
                          event.preventDefault();
                          return;
                        }
                        setDraggingLayerId(trackId);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", trackId);
                      }}
                      onDragEnd={() => setDraggingLayerId(null)}
                    >
                      <GripVertical size={15} />
                      <button type="button" onClick={(event) => {
                        event.stopPropagation();
                        if (clips.length) clips.forEach((clip) => updateLayer(clip.id, { locked: !isLockedTrack }));
                        else setEmptyTracks((current) => current.map((track) => (track.id === trackId ? { ...track, locked: !isLockedTrack } : track)));
                      }} aria-label={isLockedTrack ? "Unlock track" : "Lock track"}>
                        {isLockedTrack ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                      <button type="button" onClick={(event) => {
                        event.stopPropagation();
                        if (clips.length) clips.forEach((clip) => updateLayer(clip.id, { visible: !isVisibleTrack }));
                        else setEmptyTracks((current) => current.map((track) => (track.id === trackId ? { ...track, visible: !isVisibleTrack } : track)));
                      }} aria-label={isVisibleTrack ? "Hide track" : "Show track"}>
                        {isVisibleTrack ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button type="button" onClick={(event) => {
                        event.stopPropagation();
                        if (clips.length) clips.forEach((clip) => updateLayer(clip.id, { volume: isMutedTrack ? 1 : 0 }));
                        else setEmptyTracks((current) => current.map((track) => (track.id === trackId ? { ...track, muted: !isMutedTrack } : track)));
                      }} aria-label={isMutedTrack ? "Unmute track" : "Mute track"}>
                        <Volume2 size={14} />
                      </button>
                      <span className={styles.trackTitle}>
                        <b>{firstClip?.name || name}</b>
                        <small>{trackKindLabel} · {clips.length} clip{clips.length === 1 ? "" : "s"}</small>
                      </span>
                    </span>
                    <div
                      className={styles.timelineTrack}
                      data-timeline-track
                      data-track-id={trackId}
                      onPointerDown={seekFromTimelineElement}
                      onDragOver={(event) => {
                        if (
                          event.dataTransfer.types.includes("application/x-pixores-transition-kind")
                          || event.dataTransfer.types.includes("text/plain")
                        ) event.preventDefault();
                      }}
                      onDrop={(event) => handleTransitionDrop(event, trackId)}
                    >
                      <span
                        className={styles.playhead}
                        style={{ left: `${(currentTime / effectiveTimelineDuration) * 100}%` }}
                        onPointerDown={beginPlayheadDrag}
                        onPointerMove={dragPlayhead}
                        onPointerUp={endPlayheadDrag}
                        onPointerCancel={endPlayheadDrag}
                      />
                      {clips.map((layer) => (
                        <span
                          key={layer.id}
                          className={`${styles.clip} ${layer.type === "audio" ? styles.audioClip : ""} ${layer.id === selectedLayerId ? styles.selectedClip : ""}`}
                          onPointerDown={(event) => beginClipEdit(event, layer, "move")}
                          onPointerMove={(event) => updateClipFromPointer(event.clientX, event.clientY)}
                          onPointerUp={endClipEdit}
                          onPointerCancel={endClipEdit}
                          style={{
                            left: `${(layer.start / effectiveTimelineDuration) * 100}%`,
                            width: `${(layer.duration / effectiveTimelineDuration) * 100}%`,
                          }}
                        >
                          <span
                            className={styles.clipHandle}
                            onPointerDown={(event) => beginClipEdit(event, layer, "trim-start")}
                            onPointerMove={(event) => updateClipFromPointer(event.clientX, event.clientY)}
                            onPointerUp={endClipEdit}
                            onPointerCancel={endClipEdit}
                          />
                          {layer.type === "audio" ? "AUDIO" : layer.type}
                          <span
                            className={styles.clipHandle}
                            onPointerDown={(event) => beginClipEdit(event, layer, "trim-end")}
                            onPointerMove={(event) => updateClipFromPointer(event.clientX, event.clientY)}
                            onPointerUp={endClipEdit}
                            onPointerCancel={endClipEdit}
                          />
                        </span>
                      ))}
                      {trackTransitions.map((layer) => {
                        const cutTime = layer.cutTime ?? (layer.start + layer.duration / 2);
                        const safeCutPercent = clamp(cutTime / effectiveTimelineDuration, 0, 1) * 100;
                        return (
                          <span
                            key={layer.id}
                            className={`${styles.transitionBridge} ${layer.id === selectedLayerId ? styles.selectedTransitionBridge : ""}`}
                            style={{
                              left: `${safeCutPercent}%`,
                              width: `${(layer.duration / effectiveTimelineDuration) * 100}%`,
                            }}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectedLayerId(layer.id);
                              setActivePanel("settings");
                              setIsPlaying(false);
                            }}
                            title={`${layer.name} at ${cutTime.toFixed(2)}s`}
                          >
                            TRANS
                          </span>
                        );
                      })}
                      {clipDragPreview?.trackId === trackId && (
                        <span
                          className={styles.clipDragGhost}
                          style={{
                            left: `${clipDragPreview.leftPercent}%`,
                            width: `${clipDragPreview.widthPercent}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
        </main>
      </section>
    </div>
  );
}
