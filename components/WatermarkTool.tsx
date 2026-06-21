"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import {
  Camera,
  Download,
  Grip,
  ImagePlus,
  Images,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import styles from "./WatermarkTool.module.css";

type WatermarkMode = "text" | "logo";
type OutputFormat = "original" | "image/png" | "image/jpeg" | "image/webp";
type ImageItem = { id: string; file: File; url: string };

const POSITIONS = [
  { label: "Top left", x: 12, y: 12 },
  { label: "Top center", x: 50, y: 12 },
  { label: "Top right", x: 88, y: 12 },
  { label: "Center left", x: 12, y: 50 },
  { label: "Center", x: 50, y: 50 },
  { label: "Center right", x: 88, y: 50 },
  { label: "Bottom left", x: 12, y: 88 },
  { label: "Bottom center", x: 50, y: 88 },
  { label: "Bottom right", x: 88, y: 88 },
];

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("An image could not be loaded."));
  image.src = src;
});

const formatForFile = (format: OutputFormat, file: File) => {
  if (format !== "original") return format;
  return ["image/png", "image/jpeg", "image/webp"].includes(file.type) ? file.type : "image/png";
};

const extensionForFormat = (format: string) => format === "image/jpeg" ? "jpg" : format.split("/")[1];

export default function WatermarkTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const imagesRef = useRef<ImageItem[]>([]);
  const logoUrlRef = useRef<string | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [mode, setMode] = useState<WatermarkMode>("text");
  const [watermarkText, setWatermarkText] = useState("Pixores");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(7);
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("bold");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [opacity, setOpacity] = useState(70);
  const [rotation, setRotation] = useState(-18);
  const [outlineWidth, setOutlineWidth] = useState(1);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const [logoSize, setLogoSize] = useState(24);
  const [position, setPosition] = useState({ x: 88, y: 88 });
  const [tileWatermark, setTileWatermark] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("original");
  const [previewWidth, setPreviewWidth] = useState(600);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const selectedImage = images.find((image) => image.id === selectedImageId) || images[0] || null;

  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => { logoUrlRef.current = logoUrl; }, [logoUrl]);
  useEffect(() => () => {
    imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
  }, []);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const updateWidth = () => setPreviewWidth(preview.clientWidth || 600);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(preview);
    return () => observer.disconnect();
  }, [selectedImageId, images.length]);

  const addFiles = (fileList?: FileList | File[]) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    const newItems = files.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setImages((current) => [...current, ...newItems]);
    setSelectedImageId((current) => current || newItems[0].id);
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      const remaining = current.filter((image) => image.id !== id);
      setSelectedImageId((selected) => selected === id ? remaining[0]?.id || null : selected);
      return remaining;
    });
  };

  const loadLogo = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setLogoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setLogoName(file.name);
    setMode("logo");
  };

  const moveWatermark = (clientX: number, clientY: number) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left - dragOffsetRef.current.x) / rect.width) * 100;
    const y = ((clientY - rect.top - dragOffsetRef.current.y) / rect.height) * 100;
    setPosition({ x: Math.max(3, Math.min(97, x)), y: Math.max(3, Math.min(97, y)) });
  };

  const renderWatermark = async (item: ImageItem, logoImage: HTMLImageElement | null) => {
    const sourceImage = await loadImage(item.url);
    const canvas = document.createElement("canvas");
    canvas.width = sourceImage.naturalWidth;
    canvas.height = sourceImage.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not process this image.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(sourceImage, 0, 0);

    const outputType = formatForFile(outputFormat, item.file);
    const drawOne = (x: number, y: number) => {
      context.save();
      context.globalAlpha = opacity / 100;
      context.translate(x, y);
      context.rotate((rotation * Math.PI) / 180);

      if (mode === "logo" && logoImage) {
        const targetWidth = canvas.width * (logoSize / 100);
        const targetHeight = targetWidth * (logoImage.naturalHeight / logoImage.naturalWidth);
        context.drawImage(logoImage, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
      } else {
        const size = Math.max(12, canvas.width * (fontSize / 100));
        context.font = `${fontWeight} ${size}px ${fontFamily}`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineJoin = "round";
        if (outlineWidth > 0) {
          context.strokeStyle = textColor === "#000000" ? "#FFFFFF" : "#000000";
          context.lineWidth = Math.max(1, size * outlineWidth * 0.025);
          context.strokeText(watermarkText || "Pixores", 0, 0);
        }
        context.fillStyle = textColor;
        context.fillText(watermarkText || "Pixores", 0, 0);
      }
      context.restore();
    };

    if (tileWatermark) {
      const stepX = canvas.width * 0.32;
      const stepY = canvas.height * 0.3;
      for (let y = stepY * 0.35; y < canvas.height + stepY; y += stepY) {
        for (let x = stepX * 0.25; x < canvas.width + stepX; x += stepX) drawOne(x, y);
      }
    } else {
      drawOne(canvas.width * position.x / 100, canvas.height * position.y / 100);
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("The watermarked image could not be created.")),
        outputType,
        outputType === "image/png" ? undefined : 0.94,
      );
    });
    const baseName = item.file.name.replace(/\.[^.]+$/, "") || "image";
    return { blob, name: `${baseName}-watermarked.${extensionForFormat(outputType)}` };
  };

  const downloadImages = async () => {
    if (!images.length || (mode === "logo" && !logoUrl)) return;
    setIsProcessing(true);
    setProgress(2);

    try {
      const logoImage = mode === "logo" && logoUrl ? await loadImage(logoUrl) : null;
      const results: Array<{ blob: Blob; name: string }> = [];
      for (let index = 0; index < images.length; index += 1) {
        results.push(await renderWatermark(images[index], logoImage));
        setProgress(Math.round(((index + 1) / images.length) * 88));
      }

      let downloadBlob: Blob;
      let downloadName: string;
      if (results.length === 1) {
        downloadBlob = results[0].blob;
        downloadName = results[0].name;
      } else {
        const zip = new JSZip();
        results.forEach((result) => zip.file(result.name, result.blob));
        downloadBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        downloadName = "pixores-watermarked-images.zip";
      }

      setProgress(100);
      const url = URL.createObjectURL(downloadBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      alert(error instanceof Error ? error.message : "The images could not be processed.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <span><Images size={17} /> Image protection</span>
        <h1>Add Watermark to Images</h1>
        <p>Add a text signature or logo to JPG, PNG, and WebP images. Process one image or an entire batch directly in your browser.</p>
      </section>

      {!images.length ? (
        <section
          className={`${styles.uploadPanel} ${isDraggingFiles ? styles.dragging : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setIsDraggingFiles(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDraggingFiles(false)}
          onDrop={(event) => { event.preventDefault(); setIsDraggingFiles(false); addFiles(event.dataTransfer.files); }}
        >
          <div className={styles.uploadIcon}><ImagePlus size={32} /></div>
          <h2>Select images</h2>
          <p>Choose several files or drop them here.</p>
          <div className={styles.uploadActions}>
            <button type="button" className={styles.primaryButton} onClick={() => fileInputRef.current?.click()}><Upload size={19} /> Choose Images</button>
            <button type="button" className={styles.secondaryButton} onClick={() => cameraInputRef.current?.click()}><Camera size={19} /> Use Camera</button>
          </div>
          <small>Files never leave your device.</small>
          <input ref={fileInputRef} hidden type="file" accept="image/*" multiple onChange={(event) => addFiles(event.target.files || undefined)} />
          <input ref={cameraInputRef} hidden type="file" accept="image/*" capture="environment" onChange={(event) => addFiles(event.target.files || undefined)} />
        </section>
      ) : (
        <section className={styles.editorShell}>
          <div className={styles.previewColumn}>
            <div className={styles.topbar}>
              <strong>{images.length} {images.length === 1 ? "image" : "images"}</strong>
              <button type="button" onClick={() => fileInputRef.current?.click()}><ImagePlus size={17} /> Add Images</button>
            </div>

            <div className={styles.previewStage}>
              <div ref={previewRef} className={styles.preview}>
                {/* Blob URLs need a native image element for canvas-compatible previews. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedImage?.url} alt="Watermark preview" />
                {!tileWatermark && (
                  <button
                    type="button"
                    className={styles.watermarkPreview}
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                      opacity: opacity / 100,
                      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                      fontFamily,
                      fontWeight,
                      fontSize: `${Math.max(14, previewWidth * fontSize / 100)}px`,
                      color: textColor,
                      WebkitTextStroke: mode === "text" && outlineWidth > 0 ? `${Math.max(1, previewWidth * fontSize / 100 * outlineWidth * 0.025)}px ${textColor === "#000000" ? "#FFFFFF" : "#000000"}` : undefined,
                      width: mode === "logo" ? `${logoSize}%` : "auto",
                    }}
                    onPointerDown={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      dragOffsetRef.current = { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) moveWatermark(event.clientX, event.clientY);
                    }}
                  >
                    {mode === "logo" && logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo watermark" />
                    ) : (
                      <><Grip size={15} />{watermarkText || "Pixores"}</>
                    )}
                  </button>
                )}
                {tileWatermark && (
                  <div className={styles.tilePreview} style={{ opacity: opacity / 100, color: textColor, fontFamily, transform: `rotate(${rotation}deg)` }}>
                    {Array.from({ length: 16 }, (_, index) => (
                      <span key={index}>
                        {mode === "logo" && logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt="" />
                        ) : watermarkText || "Pixores"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.imageStrip}>
              {images.map((image) => (
                <div key={image.id} className={selectedImage?.id === image.id ? styles.selectedThumb : ""}>
                  <button type="button" className={styles.thumbSelect} onClick={() => setSelectedImageId(image.id)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.file.name} />
                    <span>{image.file.name}</span>
                  </button>
                  <button type="button" className={styles.removeThumb} aria-label={`Remove ${image.file.name}`} onClick={() => removeImage(image.id)}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <input ref={fileInputRef} hidden type="file" accept="image/*" multiple onChange={(event) => addFiles(event.target.files || undefined)} />
          </div>

          <aside className={styles.controls}>
            <div className={styles.tabs}>
              <button type="button" className={mode === "text" ? styles.activeTab : ""} onClick={() => setMode("text")}><Type size={18} /> Text</button>
              <button type="button" className={mode === "logo" ? styles.activeTab : ""} onClick={() => setMode("logo")}><Images size={18} /> Logo</button>
            </div>

            {mode === "text" ? (
              <>
                <label className={styles.field}><span>Watermark text</span><input type="text" value={watermarkText} maxLength={80} onChange={(event) => setWatermarkText(event.target.value)} /></label>
                <div className={styles.twoColumns}>
                  <label className={styles.field}><span>Font</span><select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}><option>Arial</option><option>Georgia</option><option>Impact</option><option>Verdana</option><option>Trebuchet MS</option></select></label>
                  <label className={styles.field}><span>Weight</span><select value={fontWeight} onChange={(event) => setFontWeight(event.target.value as "normal" | "bold")}><option value="normal">Regular</option><option value="bold">Bold</option></select></label>
                </div>
                <label className={styles.field}><span>Color</span><input className={styles.colorInput} type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} /></label>
                <RangeField label="Text size" value={fontSize} min={2} max={18} suffix="%" onChange={setFontSize} />
                <RangeField label="Outline" value={outlineWidth} min={0} max={4} suffix="" onChange={setOutlineWidth} />
              </>
            ) : (
              <>
                <button type="button" className={styles.logoUpload} onClick={() => logoInputRef.current?.click()}><Upload size={18} /> {logoName || "Upload transparent logo"}</button>
                <input ref={logoInputRef} hidden type="file" accept="image/png,image/webp,image/svg+xml,image/jpeg" onChange={(event) => loadLogo(event.target.files?.[0])} />
                <RangeField label="Logo size" value={logoSize} min={5} max={70} suffix="%" onChange={setLogoSize} />
              </>
            )}

            <RangeField label="Opacity" value={opacity} min={5} max={100} suffix="%" onChange={setOpacity} />
            <RangeField label="Rotation" value={rotation} min={-180} max={180} suffix="deg" onChange={setRotation} />

            <div className={styles.positionField}>
              <span>Position</span>
              <div className={styles.positionGrid}>
                {POSITIONS.map((item) => (
                  <button type="button" key={item.label} title={item.label} className={Math.abs(position.x - item.x) < 1 && Math.abs(position.y - item.y) < 1 ? styles.activePosition : ""} onClick={() => setPosition({ x: item.x, y: item.y })} />
                ))}
              </div>
            </div>

            <label className={styles.toggle}><input type="checkbox" checked={tileWatermark} onChange={(event) => setTileWatermark(event.target.checked)} /><span>Repeat watermark across image</span></label>
            <label className={styles.field}><span>Output format</span><select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}><option value="original">Keep original format</option><option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option></select></label>

            <button type="button" className={styles.downloadButton} disabled={isProcessing || (mode === "logo" && !logoUrl)} onClick={downloadImages}><Download size={20} />{isProcessing ? `Processing ${progress}%` : images.length > 1 ? "Watermark and Download ZIP" : "Watermark and Download"}</button>
          </aside>
        </section>
      )}

      <section className={styles.details}><h2>Protect and identify your images</h2><p>Add a discreet signature, brand logo, or repeated watermark without uploading your private files to a server.</p></section>

      {isProcessing && <div className={styles.processingOverlay}><div><span className={styles.spinner} /><strong>Adding watermark...</strong><div className={styles.progressTrack}><i style={{ width: `${progress}%` }} /></div><b>{progress}%</b></div></div>}
    </main>
  );
}

function RangeField({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return <label className={styles.rangeField}><span>{label}<b>{value}{suffix}</b></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
