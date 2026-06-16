"use client";
import { supabase } from "@/lib/supabaseClient";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import { templates } from "@/lib/templates";



type Layer = {
  id: string | number; 
  type: "text" | "image" | "shape";
  name: string;
  text?: string;
  src?: string;
  frameImageSrc?: string;
frameImageFit?: "cover" | "contain";
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
  | "circleFrame";
  x: number; 
  y: number; 
  fontSize?: number;
  color?: string;
  useGradient?: boolean;
gradientColor1?: string;
gradientColor2?: string;
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
  isUppercase?: boolean;
  textAlign?: "left" | "center" | "right";
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
const PREMADE_ASSETS = [

  { category: "people", name: "Shocked Man", src: "/template-assets/people/shocked-man.png" },
  { category: "people", name: "Shocked Woman", src: "/template-assets/people/shocked-woman.png" },
  { category: "people", name: "Business Man", src: "/template-assets/people/business-man.png" },
  { category: "people", name: "Podcast Host", src: "/template-assets/people/podcast-host.png" },
  { category: "people", name: "Gamer", src: "/template-assets/people/gamer.png" },

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

const PREMADE_FRAMES = [
  { name: "Frame", shapeType: "frame" as const, color: "#EF4444" },
  { name: "Rounded Frame", shapeType: "roundedFrame" as const, color: "#3B82F6" },
  { name: "Circle Frame", shapeType: "circleFrame" as const, color: "#FACC15" },
];

const FRAME_SHAPE_TYPES = ["frame", "roundedFrame", "circleFrame"];

const PRESET_SIZES = {
  youtube: { name: "YouTube Thumbnail", width: 1280, height: 720 },
  facebook: { name: "Facebook Post", width: 1200, height: 630 },
  instagram_post: { name: "Instagram Post", width: 1080, height: 1080 },
  instagram_story: { name: "Instagram Story", width: 1080, height: 1920 },
  custom: { name: "Custom Size", width: 1080, height: 990 }
};

export default function ThumbnailEditorV2() {
  useEffect(() => {
    console.log("Supabase:", supabase);
  }, []);
  const [preview, setPreview] = useState<string | null>(null);
  const [canvasBgColor, setCanvasBgColor] = useState<string>("#FFFFFF");
  const [canvasStrokeColor, setCanvasStrokeColor] = useState<string>("#0F172A");
  const [canvasStrokeWidth, setCanvasStrokeWidth] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isMobileLayout, setIsMobileLayout] = useState<boolean>(false);
  
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(1);
  const [backgroundBlur, setBackgroundBlur] = useState<number>(0);

  const [currentPreset, setCurrentPreset] = useState<keyof typeof PRESET_SIZES>("youtube");
  const [canvasWidth, setCanvasWidth] = useState<number>(1280);
  const [canvasHeight, setCanvasHeight] = useState<number>(720);

  const [draggingLayerId, setDraggingLayerId] = useState<string | number | null>(null);
  const [importedImages, setImportedImages] = useState<ImportedFile[]>([]);
  const [isCropMode, setIsCropMode] = useState<boolean>(false);
  const [assetTab, setAssetTab] = useState<"people" | "objects" | "shapes" | "frames">("people");

  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [showProjects, setShowProjects] = useState(false);

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

 const [layers, setLayers] = useState<Layer[]>([]);

  const [selectedLayerId, setSelectedLayerId] = useState<string | number | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const initialDragOffset = useRef({ x: 0, y: 0 });

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
  useEffect(() => {
  const templateId = searchParams.get("template");

  if (!templateId) return;

  const template = templates.find((t) => t.id === templateId);

  if (!template) return;

  setCanvasWidth(template.width);
  setCanvasHeight(template.height);
  setCanvasBgColor(template.canvas.background);

 const loadedLayers: Layer[] = template.canvas.elements.map((element: any, index: number) => {
  const baseLayer = {
    id: `template-${index}`,
    type: element.type,
    name: element.name || `Template Layer ${index + 1}`,
    x: element.x,
    y: element.y,
    opacity: element.opacity ?? 1,
    angle: element.angle ?? 0,
  };

  if (element.type === "text") {
    return {
      ...baseLayer,
      type: "text",
      text: element.text,
      fontSize: element.fontSize || 80,
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
    shadowColor: "#000000",
    shadowBlur: element.shadowBlur ?? 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  };
});

  setLayers(loadedLayers);
  setSelectedLayerId(loadedLayers[0]?.id || null);
}, [searchParams]);

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
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  const deleteLayer = () => {
    if (layers.length === 0 || !selectedLayerId) return;
    const updated = layers.filter((layer) => layer.id !== selectedLayerId);
    setLayers(updated);
    setSelectedLayerId(updated.length > 0 ? updated[updated.length - 1].id : null);
  };

  const getEfectosEstilo = (layer: Layer) => {
    if (layer.type !== "text") return {};
    const sColor = layer.strokeColor || "#000000";
    const sWidth = layer.strokeWidth || 0;
    const gColor = layer.glowColor || "#3B82F6";
    const gRadius = layer.glowRadius || 0;

    let textShadowString = "";
    if (sWidth > 0) {
      textShadowString += `-${sWidth}px -${sWidth}px 0 ${sColor}, ${sWidth}px -${sWidth}px 0 ${sColor}, -${sWidth}px ${sWidth}px 0 ${sColor}, ${sWidth}px ${sWidth}px 0 ${sColor}, 0px ${sWidth}px 0 ${sColor}, 0px -${sWidth}px 0 ${sColor}, ${sWidth}px 0px 0 ${sColor}, -${sWidth}px 0px 0 ${sColor}`;
    }
    if (gRadius > 0) {
      if (textShadowString) textShadowString += ", ";
      textShadowString += `0 0 ${gRadius}px ${gColor}, 0 0 ${gRadius * 1.5}px ${gColor}`;
    }
    if ((layer.shadowBlur || 0) > 0 || (layer.shadowOffsetX || 0) !== 0) {
      if (textShadowString) textShadowString += ", ";
      textShadowString += `${layer.shadowOffsetX}px ${layer.shadowOffsetY}px ${layer.shadowBlur}px ${layer.shadowColor}`;
    }
    return { textShadow: textShadowString || "none" };
  };

  // GLOBAL KEYBOARD MANAGEMENT (Delete, Backspace, Enter, Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";

      if (isTyping) {
        if (e.key === "Enter") {
          (document.activeElement as HTMLElement).blur();
        }
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
  }, [selectedLayerId, draggingLayerId, resizeState.corner, layers]);

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
    resizeState.initialCropTop + (resizeState.corner?.includes("top") ? deltaY : 0)
  );

  const newCropBottom = Math.max(
    0,
    resizeState.initialCropBottom + (resizeState.corner?.includes("bottom") ? -deltaY : 0)
  );

  const newCropLeft = Math.max(
    0,
    resizeState.initialCropLeft + (resizeState.corner?.includes("Left") ? deltaX : 0)
  );

  const newCropRight = Math.max(
    0,
    resizeState.initialCropRight + (resizeState.corner?.includes("Right") ? -deltaX : 0)
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
            const horizontalDelta = affectsLeft ? -deltaX : affectsRight ? deltaX : 0;
            const verticalDelta = affectsTop ? -deltaY : affectsBottom ? deltaY : 0;
            newFontSize = Math.max(8, Math.round(resizeState.initialFontSize + (horizontalDelta + verticalDelta) / 2));
            return { ...layer, fontSize: newFontSize };
          }

          if (affectsLeft) newWidth = resizeState.initialWidth - deltaX;
          if (affectsRight) newWidth = resizeState.initialWidth + deltaX;
          if (affectsTop) newHeight = resizeState.initialHeight - deltaY;
          if (affectsBottom) newHeight = resizeState.initialHeight + deltaY;

          newWidth = Math.max(20, Math.round(newWidth));
          newHeight = Math.max(20, Math.round(newHeight));

          const widthChange = newWidth - resizeState.initialWidth;
          const heightChange = newHeight - resizeState.initialHeight;
          const xShiftPx = affectsLeft ? -widthChange / 2 : affectsRight ? widthChange / 2 : 0;
          const yShiftPx = affectsTop ? -heightChange / 2 : affectsBottom ? heightChange / 2 : 0;

          newX = Math.max(0, Math.min(100, resizeState.initialX + (xShiftPx / rect.width) * 100));
          newY = Math.max(0, Math.min(100, resizeState.initialY + (yShiftPx / rect.height) * 100));
          
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
}, [draggingLayerId, resizeState, selectedLayerId, isCropMode]);

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

const res = await fetch("/api/remove-bg", {
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
  };

  const handleImportImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: ImportedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      newFiles.push({ url: URL.createObjectURL(files[i]), name: files[i].name });
    }
    setImportedImages([...importedImages, ...newFiles]);
    e.target.value = "";
  };
const isImageFrame = (layer?: Layer) => {
  return (
    layer?.type === "shape" &&
    FRAME_SHAPE_TYPES.includes(layer.shapeType || "")
  );
};

const addImageToSelectedFrame = (fileObj: ImportedFile) => {
  if (!selectedLayer || !isImageFrame(selectedLayer)) return false;

  updateSelectedLayer({
    frameImageSrc: fileObj.url,
    frameImageFit: "cover",
    name: `${selectedLayer.name} + Image`,
  });

  return true;
};
 const addImageToCanvas = (fileObj: ImportedFile) => {
  if (addImageToSelectedFrame(fileObj)) {
  return;
}
  const uniqueId = `img-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const newLayer: Layer = {
    id: uniqueId,
    type: "image",
    name: fileObj.name,
    src: fileObj.url,
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

  setLayers((prev) => [...prev, newLayer]);
  setSelectedLayerId(newLayer.id);
  setIsCropMode(false);
};

  const addTextLayer = () => {
    const uniqueId = `txt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const newLayer: Layer = {
      id: uniqueId,
      type: "text",
      name: "Text Layer " + (layers.length + 1),
      text: "New Text Line",
      x: 50,
      y: 50,
      fontSize: 40,
      color: "#000000",
      fontFamily: "Arial",
      strokeColor: "#000000",
      strokeWidth: 0,
      glowColor: "#FFFF00",
      glowRadius: 0,
      textAlign: "center",
      hasTextBg: false,
      textBgColor: "#FF0000",
      textBgPadding: 6,
      opacity: 1,
      angle: 0,
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const addShapeLayer = (shapeType: Layer["shapeType"]) => {
    const uniqueId = `shp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const isFrame = FRAME_SHAPE_TYPES.includes(shapeType || "");
    const newLayer: Layer = {
      id: uniqueId,
      type: "shape",
      shapeType: shapeType,
      name: `Shape: ${shapeType}`,
      x: 50,
      y: 50,
      width: 150,
      height: 150,
      color: "#3B82F6",
      useGradient: false,
gradientColor1: "#3B82F6",
gradientColor2: "#8B5CF6",
      gradientDirection: "diagonal",
      strokeColor: isFrame ? "#3B82F6" : undefined,
      strokeWidth: isFrame ? 8 : undefined,
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

  const addPremadeShape = (
    shape: (typeof PREMADE_SHAPES)[number] | (typeof PREMADE_FRAMES)[number]
  ) => {
  const uniqueId = `shp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const isFrame = FRAME_SHAPE_TYPES.includes(shape.shapeType || "");

  const newLayer: Layer = {
    id: uniqueId,
    type: "shape",
    shapeType: shape.shapeType,
    name: shape.name,
    x: 50,
    y: 50,
    width: 180,
    height: 120,
    color: shape.color,
    strokeColor: isFrame ? shape.color : undefined,
    strokeWidth: isFrame ? 8 : undefined,
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

  try {
    setIsExporting(true);
    setIsCropMode(false);

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    await waitForCanvasImages(workspace);

    const dataUrl = await toPng(workspace, {
      cacheBust: false,
      canvasWidth,
      canvasHeight,
      pixelRatio: 1,
      skipFonts: true,
      backgroundColor: canvasBgColor,
      style: {
        boxShadow: "none",
      },
    });

    const link =
      document.createElement("a");

    link.download =
      "pixores-design.png";

    link.href = dataUrl;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error(err);
    alert("The PNG could not be generated. Please check that all images are loaded and try again.");
  } finally {
    setIsExporting(false);
  }
};
  const updateSelectedLayer = (fields: Partial<Layer>) => {
    if (!selectedLayerId) return;
    setLayers(layers.map((l) => (l.id === selectedLayerId ? { ...l, ...fields } : l)));
  };

 const startResizing = (e: React.MouseEvent | React.TouchEvent, layer: Layer, corner: ResizeState["corner"]) => {
  e.preventDefault();
  e.stopPropagation();
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

      await waitForCanvasImages(workspace);

      const thumbnail = await toPng(workspace, {
        cacheBust: true,
        canvasWidth,
        canvasHeight,
        pixelRatio: 0.25,
        skipFonts: true,
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

  const directionMap = {
    "top-bottom": "180deg",
    "bottom-top": "0deg",
    "left-right": "90deg",
    "right-left": "270deg",
    "diagonal": "135deg",
  };

  return `linear-gradient(
    ${directionMap[layer.gradientDirection || "diagonal"]},
    ${layer.gradientColor1 || layer.color || "#3B82F6"},
    ${layer.gradientColor2 || "#8B5CF6"}
  )`;
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

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: isMobileLayout ? "auto" : "100vh", height: isMobileLayout ? "auto" : "100vh", fontFamily: "'Segoe UI', Roboto, sans-serif", background: "#F1F5F9", overflowX: "hidden" }}>
      
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Montserrat:wght@700;900&family=Poppins:wght@600;900&family=Inter:wght@400;800&display=swap" />

      {/* HEADER */}
      <header style={{ minHeight: "56px", background: "#0F172A", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: isMobileLayout ? "10px 12px" : "0 20px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", zIndex: 10, flexWrap: isMobileLayout ? "wrap" : "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: "1 1 180px" }}>
          <span style={{ fontSize: "20px" }}>🎨</span>
          <h1 style={{ fontSize: isMobileLayout ? "15px" : "16px", fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis" }}>Pixores Studio V2</h1>
        </div>

        <div
  style={{
    padding: "8px 12px",
    borderRadius: "8px",
    background: "#1E293B",
    color: "#FACC15",
    fontWeight: 700,
    fontSize: isMobileLayout ? "13px" : "15px",
  }}
>
  ⭐ Credits: {credits ?? "-"}

  <button
  onClick={() => setShowCreditsModal(true)}
  style={{
    marginTop: "6px",
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
    padding: isMobileLayout ? "9px 12px" : "8px 16px",
    background: "#2563EB",
    color: "#FFF",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: isMobileLayout ? "14px" : "16px",
  }}
>
  💾 Save Project
</button>

<button
  onClick={updateProject}
  disabled={!currentProjectId}
  style={{
    padding: isMobileLayout ? "9px 12px" : "8px 16px",
    background: currentProjectId ? "#F59E0B" : "#94A3B8",
    color: "#FFF",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    cursor: currentProjectId ? "pointer" : "not-allowed",
    fontSize: isMobileLayout ? "14px" : "16px",
  }}
>
  🔄 Update Project
</button>

<button
  onClick={loadMyProjects}
  style={{
    padding: isMobileLayout ? "9px 12px" : "8px 16px",
    background: "#0F172A",
    color: "#FFF",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: isMobileLayout ? "14px" : "16px",
  }}
>
  📂 My Projects
</button>


        <button disabled={isExporting} onClick={() => downloadPNG()} style={{ padding: isMobileLayout ? "9px 12px" : "8px 16px", background: isExporting ? "#94A3B8" : "#10B981", color: "#FFF", border: "none", borderRadius: "6px", fontWeight: 600, cursor: isExporting ? "wait" : "pointer", flex: isMobileLayout ? "1 1 140px" : "0 0 auto", fontSize: isMobileLayout ? "14px" : "16px" }}>
          📥 Download PNG HD
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
    overflow: isMobileLayout ? "visible" : "hidden",
  }}
>
        
        {/* LEFT PANEL */}
        <aside style={{ background: "#FFFFFF", borderRight: isMobileLayout ? "none" : "1px solid #E2E8F0", borderTop: isMobileLayout ? "1px solid #E2E8F0" : "none", padding: isMobileLayout ? "16px" : "20px", overflowY: isMobileLayout ? "visible" : "auto", display: "flex", flexDirection: "column", gap: "18px", minWidth: 0, order: isMobileLayout ? 1 : 0 }}>
          
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
    <input
      type="color"
      value={canvasBgColor}
      onChange={(e) => setCanvasBgColor(e.target.value)}
      style={{
        width: "100%",
        height: "30px",
        border: "1px solid #CBD5E1",
        borderRadius: "4px",
        cursor: "pointer",
      }}
    />

    <input
      type="file"
      accept="image/*"
      onChange={handleUploadBackground}
      style={{ fontSize: "12px", width: "100%" }}
    />

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

  <button onClick={addTextLayer} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "none", background: "#8B5CF6", color: "#FFF", fontWeight: 600, cursor: "pointer", marginBottom: "12px" }}>
    🔤 Add Text Block
  </button>

  <label style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px dashed #8B5CF6", color: "#8B5CF6", fontWeight: 500, display: "block", textAlign: "center", cursor: "pointer", fontSize: "13px" }}>
    📥 Import Graphics / PNGs
    <input type="file" accept="image/*" multiple onChange={handleImportImage} style={{ display: "none" }} />
  </label>

  <div style={{ marginTop: "14px" }}>
    <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: "8px" }}>
      Elements
    </h2>

    <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
      {[
        { id: "people", label: "People" },
        { id: "objects", label: "Objects" },
        { id: "shapes", label: "Shapes" },
        { id: "frames", label: "Frames" },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setAssetTab(tab.id as "people" | "objects" | "shapes" | "frames")}
          style={{
            flex: 1,
            padding: "7px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            background: assetTab === tab.id ? "#2563EB" : "#F8FAFC",
            color: assetTab === tab.id ? "#FFFFFF" : "#334155",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>

    {assetTab === "people" || assetTab === "objects" ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        {PREMADE_ASSETS.filter((asset) => asset.category === assetTab).map((asset) => (
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
    ) : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        {(assetTab === "frames" ? PREMADE_FRAMES : PREMADE_SHAPES).map((shape) => (
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
                  <div key={idx} onClick={() => addImageToCanvas(imgObj)} style={{ aspectRatio: "1", border: "1px solid #E2E8F0", borderRadius: "6px", overflow: "hidden", cursor: "pointer" }} title={imgObj.name}>
                    <img src={imgObj.url} alt="imported" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
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
        <section style={{ display: "flex", flexDirection: "column", justifyContent: isMobileLayout ? "flex-start" : "center", alignItems: "center", overflow: isMobileLayout ? "visible" : "auto", padding: isMobileLayout ? "16px" : "30px", background: "#F8FAFC", minWidth: 0, order: isMobileLayout ? 0 : 0 }}>
          {/* FLOATING ACTION BAR */}
          {selectedLayer && selectedLayer.type === "text" ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#FFFFFF", padding: isMobileLayout ? "8px 10px" : "6px 20px", borderRadius: isMobileLayout ? "10px" : "30px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", border: "1px solid #E2E8F0", marginBottom: "12px", maxWidth: "100%", overflowX: "auto" }}>
              <select value={selectedLayer.fontFamily} onChange={(e) => updateSelectedLayer({ fontFamily: e.target.value })} style={{ border: "none", fontSize: "13px", fontWeight: 600, outline: "none", cursor: "pointer" }}>
                <option value="Arial">Arial</option>
                <option value="Impact">Impact</option>
                <option value="Anton">Anton (Heavy)</option>
                <option value="Bebas Neue">Bebas Neue</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Poppins">Poppins</option>
                <option value="Inter">Inter</option>
              </select>
              <span style={{ color: "#E2E8F0" }}>|</span>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button onClick={() => updateSelectedLayer({ fontSize: Math.max(10, (selectedLayer.fontSize || 40) - 4) })} style={{ border: "none", background: "none", cursor: "pointer", fontWeight: "bold" }}>-</button>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>{selectedLayer.fontSize}</span>
                <button onClick={() => updateSelectedLayer({ fontSize: (selectedLayer.fontSize || 40) + 4 })} style={{ border: "none", background: "none", cursor: "pointer", fontWeight: "bold" }}>+</button>
              </div>
              <span style={{ color: "#E2E8F0" }}>|</span>
              
              <button onClick={() => updateSelectedLayer({ textAlign: "left" })} style={{ border: "none", background: selectedLayer.textAlign === "left" ? "#E2E8F0" : "none", cursor: "pointer", borderRadius: "4px", fontSize: "14px", padding: "2px 6px" }}>⬅️</button>
              <button onClick={() => updateSelectedLayer({ textAlign: "center" })} style={{ border: "none", background: selectedLayer.textAlign === "center" ? "#E2E8F0" : "none", cursor: "pointer", borderRadius: "4px", fontSize: "14px", padding: "2px 6px" }}>☰</button>
              <button onClick={() => updateSelectedLayer({ textAlign: "right" })} style={{ border: "none", background: selectedLayer.textAlign === "right" ? "#E2E8F0" : "none", cursor: "pointer", borderRadius: "4px", fontSize: "14px", padding: "2px 6px" }}>➡️</button>
              <span style={{ color: "#E2E8F0" }}>|</span>
              
              <button onClick={() => updateSelectedLayer({ isBold: !selectedLayer.isBold })} style={{ border: "none", background: selectedLayer.isBold ? "#E2E8F0" : "none", fontWeight: "bold", cursor: "pointer", borderRadius: "4px", width: "24px" }}>B</button>
              <button onClick={() => updateSelectedLayer({ isUppercase: !selectedLayer.isUppercase })} style={{ border: "none", background: selectedLayer.isUppercase ? "#E2E8F0" : "none", cursor: "pointer", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>aA</button>
              <span style={{ color: "#E2E8F0" }}>|</span>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
                Outline:
                <input type="number" min="0" max="10" value={selectedLayer.strokeWidth || 0} onChange={(e) => updateSelectedLayer({ strokeWidth: Number(e.target.value) })} style={{ width: "36px", padding: "2px", borderRadius: "4px", border: "1px solid #CBD5E1" }} />
              </label>
            </div>
          ) : (
            <div style={{ height: "40px", marginBottom: "12px" }} />
          )}

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
    width: "100%",
    maxWidth: isMobileLayout ? "100%" : "820px",
    aspectRatio: `${canvasWidth} / ${canvasHeight}`,
    backgroundColor: canvasBgColor,
    border: canvasStrokeWidth > 0 ? `${canvasStrokeWidth}px solid ${canvasStrokeColor}` : "none",
    borderRadius: "4px",
    boxSizing: "border-box",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    overflow: "hidden",
  }}
>
            {preview && (
              <img 
                src={preview} 
                alt="Bg" 
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
    e.stopPropagation();
    setSelectedLayerId(layer.id);
    setIsCropMode(false);
    setDraggingLayerId(layer.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    initialDragOffset.current = {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  }}
  onTouchStart={(e) => {
    const { clientX, clientY } = getCoords(e);
    e.preventDefault();
    e.stopPropagation();
    setSelectedLayerId(layer.id);
    setIsCropMode(false);
    setDraggingLayerId(layer.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    initialDragOffset.current = {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  }}
  style={{
    position: "absolute",
    touchAction: "none",
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    transform: `translate(-50%, -50%) rotate(${layer.angle || 0}deg) ${layer.isFlippedH ? "scaleX(-1)" : "scaleX(1)"} ${layer.isFlippedV ? "scaleY(-1)" : "scaleY(1)"}`,
                    userSelect: "none",
                    cursor: isCropMode ? "default" : (draggingLayerId === layer.id ? "grabbing" : "move"),
                    padding: "4px",
                    outline: !isExporting && isSelected ? (isCropMode ? "2px dashed #000" : "2px solid #3B82F6") : "none",
                    zIndex: !isExporting && isSelected ? 100 : index + 10, 
                    display: "flex",
                    whiteSpace: "nowrap",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: layer.opacity !== undefined ? layer.opacity : 1,
                  }}
                >
                  {/* TEXT */}
                  {/* TEXT / SHAPE / IMAGE */}
{layer.type === "text" ? (
  <div
    style={{
      fontSize: `${layer.fontSize}px`,
      color: layer.color,
      fontFamily: layer.fontFamily,
      textAlign: layer.textAlign || "center",
      fontWeight: layer.isBold ? "bold" : "900",
      fontStyle: layer.isItalic ? "italic" : "normal",
      textDecoration: layer.isUnderline ? "underline" : "none",
      textTransform: layer.isUppercase ? "uppercase" : "none",
      background: layer.hasTextBg ? layer.textBgColor : "transparent",
      padding: layer.hasTextBg ? `${layer.textBgPadding}px` : "0px",
      borderRadius: "4px",
      whiteSpace: "nowrap",
      ...getEfectosEstilo(layer),
    }}
  >
    {layer.text}
  </div>
) : layer.type === "shape" ? (
  layer.shapeType === "rectangle" ? (
    <div style={{ width: `${layer.width}px`, height: `${layer.height}px`, background: getLayerFill(layer), borderRadius: "8px" }} />
  ) : layer.shapeType === "circle" ? (
    <div style={{ width: `${layer.width}px`, height: `${layer.width}px`, background: getLayerFill(layer), borderRadius: "50%" }} />
  ) : layer.shapeType === "triangle" ? (
  <div
    style={{
      width: 0,
      height: 0,
      borderLeft: `${(layer.width || 100) / 2}px solid transparent`,
      borderRight: `${(layer.width || 100) / 2}px solid transparent`,
      borderBottom: `${layer.height}px solid ${layer.gradientColor1 || layer.color}`,
    }}
  />
) : layer.shapeType === "star" ? (
    <div style={{ fontSize: `${layer.width || 120}px`, color: layer.color, lineHeight: 1 }}>★</div>
  ) : layer.shapeType === "badge" ? (
    <div style={{ width: `${layer.width}px`, height: `${layer.height}px`, background: getLayerFill(layer), color: "#fff", borderRadius: "999px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
      NEW
    </div>
  ) : layer.shapeType === "speechBubble" ? (
    <div style={{ width: `${layer.width}px`, minHeight: `${layer.height}px`, background: getLayerFill(layer), borderRadius: "18px", border: "3px solid #0F172A", position: "relative" }}>
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
      borderRadius: "24px",
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
          display: "block",
        }}
      />
    )}
  </div>
  ) : layer.shapeType === "arrow" ? (
    <div style={{ fontSize: `${layer.width || 120}px`, color: layer.color, lineHeight: 1 }}>➜</div>
  ) : (
    <div style={{ width: `${layer.width}px`, height: "8px", background: getLayerFill(layer), borderRadius: "999px" }} />
  )
) : (
  <img
    src={layer.src}
    alt="layer"
    style={{
      width: `${layer.width}px`,
      height: `${layer.height}px`,
      minWidth: `${layer.width}px`,
      minHeight: `${layer.height}px`,
      display: "block",
      pointerEvents: "none",
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
{!isExporting && isSelected && (
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
          ...(item.corner === "topLeft" ? { top: "-5px", left: "-5px" } : {}),
          ...(item.corner === "topRight" ? { top: "-5px", right: "-5px" } : {}),
          ...(item.corner === "bottomLeft" ? { bottom: "-5px", left: "-5px" } : {}),
          ...(item.corner === "bottomRight" ? { bottom: "-5px", right: "-5px" } : {})
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
          bottom: "-30px",
          left: "50%",
          transform: "translateX(-50%)",
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
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT PROPERTY EDIT PANEL */}
        <aside style={{ background: "#FFFFFF", borderLeft: isMobileLayout ? "none" : "1px solid #E2E8F0", borderTop: isMobileLayout ? "1px solid #E2E8F0" : "none", padding: isMobileLayout ? "16px" : "20px", overflowY: isMobileLayout ? "visible" : "auto", display: "flex", flexDirection: "column", gap: "14px", minWidth: 0, order: isMobileLayout ? 3 : 0 }}>
          
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
                <button onClick={() => deleteLayer()} style={{ padding: "6px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>🗑️ Delete</button>
              </div>

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
              {(selectedLayer.type === "image" || selectedLayer.type === "shape") && (
                <div style={{ background: "#F8FAFC", padding: "10px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "6px" }}>Exact Dimensions (px)</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "10px", color: "#64748B" }}>Width</label>
                      <input type="number" value={selectedLayer.width || 0} onChange={(e) => updateSelectedLayer({ width: Math.max(10, Number(e.target.value)) })} style={{ width: "100%", padding: "4px", fontSize: "12px", border: "1px solid #CBD5E1", borderRadius: "4px" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "10px", color: "#64748B" }}>Height</label>
                      <input type="number" value={selectedLayer.height || 0} onChange={(e) => updateSelectedLayer({ height: Math.max(10, Number(e.target.value)) })} style={{ width: "100%", padding: "4px", fontSize: "12px", border: "1px solid #CBD5E1", borderRadius: "4px" }} />
                    </div>
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
                <input type="color" value={selectedLayer.color || "#FFFFFF"} onChange={(e) => updateSelectedLayer({ color: e.target.value })} />
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
      value={selectedLayer.gradientDirection || "diagonal"}
      onChange={(e) =>
        updateSelectedLayer({
          gradientDirection: e.target.value as any,
        })
      }
      style={{
        width: "100%",
        padding: "6px",
        borderRadius: "6px",
        border: "1px solid #CBD5E1",
      }}
    >
      <option value="top-bottom">Top → Bottom</option>
      <option value="bottom-top">Bottom → Top</option>
      <option value="left-right">Left → Right</option>
      <option value="right-left">Right → Left</option>
      <option value="diagonal">Diagonal</option>
    </select>
  </div>
)}
  </div>
  
)}
              </div>
              

              {selectedLayer.type === "text" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600 }}>Edit Content String</label>
                  <input type="text" value={selectedLayer.text} onChange={(e) => updateSelectedLayer({ text: e.target.value })} style={{ padding: "6px", border: "1px solid #CBD5E1", borderRadius: "6px", fontSize: "13px" }} />
                </div>
              )}

              {/* REMOVE BACKGROUND MAGIC WITH AI */}
              {selectedLayer.type === "image" && (
                <div style={{ background: "#F8FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block" }}>AI Power Tools (Canva Style)</label>
                  <button
                    onClick={() => handleRemoveBackgroundAI(selectedLayer)}
                    style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg, #6366F1 0%, #A855F7 100%)", color: "#FFFFFF", border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "12px", cursor: "pointer", boxShadow: "0 2px 4px rgba(139, 92, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    ✨ Remove Background with AI
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
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "8px" }}>Frame Stroke</label>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input
                      type="color"
                      value={selectedLayer.strokeColor || selectedLayer.color || "#3B82F6"}
                      onChange={(e) => updateSelectedLayer({ strokeColor: e.target.value, color: e.target.value })}
                      style={{ width: "100%", height: "28px", border: "none", cursor: "pointer" }}
                    />

                    <label style={{ fontSize: "10px", color: "#64748B" }}>Thickness ({selectedLayer.strokeWidth ?? 8}px)</label>
                    <input
                      type="range"
                      min="0"
                      max="32"
                      value={selectedLayer.strokeWidth ?? 8}
                      onChange={(e) => updateSelectedLayer({ strokeWidth: Number(e.target.value) })}
                      style={{ width: "100%" }}
                    />

                    {selectedLayer.frameImageSrc && (
                      <select
                        value={selectedLayer.frameImageFit || "cover"}
                        onChange={(e) => updateSelectedLayer({ frameImageFit: e.target.value as "cover" | "contain" })}
                        style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px", background: "#FFF" }}
                      >
                        <option value="cover">Image Fill: Cover</option>
                        <option value="contain">Image Fit: Contain</option>
                      </select>
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
    </div>
  );
}
