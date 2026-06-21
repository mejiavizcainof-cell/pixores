"use client";

import { useEffect, useRef, useState } from "react";
import {
  centerCrop,
  makeAspectCrop,
  ReactCrop,
  type PercentCrop,
  type PixelCrop,
} from "react-image-crop";
import { Camera, Crop as CropIcon, Download, ImagePlus, RotateCcw, Upload } from "lucide-react";
import "react-image-crop/dist/ReactCrop.css";
import styles from "./ImageCropTool.module.css";

type OutputFormat = "image/png" | "image/jpeg" | "image/webp";
type CropField = "x" | "y" | "width" | "height";

const ASPECT_OPTIONS = [
  { label: "Free", value: "free", ratio: undefined },
  { label: "1:1", value: "square", ratio: 1 },
  { label: "16:9", value: "landscape", ratio: 16 / 9 },
  { label: "4:5", value: "portrait", ratio: 4 / 5 },
];

function createInitialCrop(width: number, height: number, aspect?: number): PixelCrop {
  const imageAspect = width / height;
  const baseCrop: PercentCrop = aspect
    ? makeAspectCrop(
        aspect >= imageAspect ? { unit: "%", width: 82 } : { unit: "%", height: 82 },
        aspect,
        width,
        height,
      )
    : { unit: "%", x: 9, y: 9, width: 82, height: 82 };
  const centered = centerCrop(baseCrop, width, height);

  return {
    unit: "px",
    x: Math.round((centered.x / 100) * width),
    y: Math.round((centered.y / 100) * height),
    width: Math.round((centered.width / 100) * width),
    height: Math.round((centered.height / 100) * height),
  };
}

export default function ImageCropTool() {
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("cropped-image");
  const [crop, setCrop] = useState<PixelCrop>({ unit: "px", x: 0, y: 0, width: 0, height: 0 });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [imageBounds, setImageBounds] = useState({ width: 0, height: 0 });
  const [sourceDimensions, setSourceDimensions] = useState({ width: 0, height: 0 });
  const [aspectValue, setAspectValue] = useState("free");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("image/png");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const selectedAspect = ASPECT_OPTIONS.find((option) => option.value === aspectValue)?.ratio;

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const loadFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return URL.createObjectURL(file);
    });
    setFileName(file.name.replace(/\.[^.]+$/, "") || "cropped-image");
    setCompletedCrop(null);
    setImageBounds({ width: 0, height: 0 });
    setSourceDimensions({ width: 0, height: 0 });
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const bounds = { width: image.width, height: image.height };
    const initialCrop = createInitialCrop(bounds.width, bounds.height, selectedAspect);
    setImageBounds(bounds);
    setSourceDimensions({ width: image.naturalWidth, height: image.naturalHeight });
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  };

  const normalizeCrop = (nextCrop: PixelCrop): PixelCrop => {
    const width = Math.max(1, Math.min(Math.round(nextCrop.width), imageBounds.width));
    const height = Math.max(1, Math.min(Math.round(nextCrop.height), imageBounds.height));
    const x = Math.max(0, Math.min(Math.round(nextCrop.x), imageBounds.width - width));
    const y = Math.max(0, Math.min(Math.round(nextCrop.y), imageBounds.height - height));
    return { unit: "px", x, y, width, height };
  };

  const updateCropField = (field: CropField, rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    const nextCrop = normalizeCrop({ ...crop, [field]: value });
    setCrop(nextCrop);
    setCompletedCrop(nextCrop);
  };

  const changeAspect = (value: string) => {
    setAspectValue(value);
    const ratio = ASPECT_OPTIONS.find((option) => option.value === value)?.ratio;
    if (!imageBounds.width || !imageBounds.height) return;
    const nextCrop = createInitialCrop(imageBounds.width, imageBounds.height, ratio);
    setCrop(nextCrop);
    setCompletedCrop(nextCrop);
  };

  const resetCrop = () => {
    if (!imageBounds.width || !imageBounds.height) return;
    const nextCrop = createInitialCrop(imageBounds.width, imageBounds.height, selectedAspect);
    setCrop(nextCrop);
    setCompletedCrop(nextCrop);
  };

  const downloadCrop = async () => {
    const image = imageRef.current;
    if (!image || !completedCrop?.width || !completedCrop.height) return;
    setIsDownloading(true);

    try {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const outputWidth = Math.max(1, Math.round(completedCrop.width * scaleX));
      const outputHeight = Math.max(1, Math.round(completedCrop.height * scaleY));
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not create the cropped image.");

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      if (outputFormat === "image/jpeg") {
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, outputWidth, outputHeight);
      }
      context.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        outputWidth,
        outputHeight,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => result ? resolve(result) : reject(new Error("The cropped image could not be generated.")),
          outputFormat,
          outputFormat === "image/png" ? undefined : 0.94,
        );
      });
      const extension = outputFormat === "image/jpeg" ? "jpg" : outputFormat.split("/")[1];
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${fileName}-cropped.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
      alert(error instanceof Error ? error.message : "The cropped image could not be downloaded.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <span className={styles.eyebrow}><CropIcon size={17} /> Image editing</span>
        <h1>Crop Image Online</h1>
        <p>Crop photos precisely, choose a common aspect ratio, and download the result at full resolution.</p>
      </section>

      {!imageUrl ? (
        <section
          className={`${styles.uploadPanel} ${isDraggingFile ? styles.dragging : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDraggingFile(false);
            loadFile(event.dataTransfer.files[0]);
          }}
        >
          <div className={styles.uploadIcon}><ImagePlus size={32} /></div>
          <h2>Select an image to crop</h2>
          <p>Drop a JPG, PNG, WebP, or phone photo here.</p>
          <div className={styles.uploadActions}>
            <button type="button" className={styles.primaryButton} onClick={() => fileInputRef.current?.click()}>
              <Upload size={19} /> Choose Image
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => cameraInputRef.current?.click()}>
              <Camera size={19} /> Use Camera
            </button>
          </div>
          <input ref={fileInputRef} hidden type="file" accept="image/*" onChange={(event) => loadFile(event.target.files?.[0])} />
          <input ref={cameraInputRef} hidden type="file" accept="image/*" capture="environment" onChange={(event) => loadFile(event.target.files?.[0])} />
          <small>Your image is processed locally in your browser.</small>
        </section>
      ) : (
        <section className={styles.editorShell}>
          <div className={styles.canvasColumn}>
            <div className={styles.editorToolbar}>
              <div>
                <strong>{fileName}</strong>
                <span>{sourceDimensions.width} x {sourceDimensions.height} px</span>
              </div>
              <button type="button" className={styles.changeButton} onClick={() => fileInputRef.current?.click()}>
                Change Image
              </button>
            </div>

            <div className={styles.cropStage}>
              <ReactCrop
                crop={crop}
                aspect={selectedAspect}
                minWidth={20}
                minHeight={20}
                keepSelection
                ruleOfThirds
                onChange={(pixelCrop) => setCrop(pixelCrop)}
                onComplete={(pixelCrop) => setCompletedCrop(normalizeCrop(pixelCrop))}
              >
                {/* Blob URLs need a native image element for pixel-accurate canvas export. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={imageRef} src={imageUrl} alt="Image selected for cropping" onLoad={handleImageLoad} />
              </ReactCrop>
            </div>
            <input ref={fileInputRef} hidden type="file" accept="image/*" onChange={(event) => loadFile(event.target.files?.[0])} />
          </div>

          <aside className={styles.controls}>
            <div className={styles.controlsHeader}>
              <div><CropIcon size={20} /><h2>Crop settings</h2></div>
              <button type="button" title="Reset crop" onClick={resetCrop}><RotateCcw size={18} /></button>
            </div>

            <div className={styles.fieldGroup}>
              <label>Aspect ratio</label>
              <div className={styles.segmentedControl}>
                {ASPECT_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={aspectValue === option.value ? styles.activeSegment : ""}
                    onClick={() => changeAspect(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.numberGrid}>
              {([
                ["width", "Width (px)"],
                ["height", "Height (px)"],
                ["x", "Position X (px)"],
                ["y", "Position Y (px)"],
              ] as Array<[CropField, string]>).map(([field, label]) => (
                <label key={field}>
                  <span>{label}</span>
                  <input
                    type="number"
                    min={field === "width" || field === "height" ? 1 : 0}
                    value={Math.round(crop[field] || 0)}
                    onChange={(event) => updateCropField(field, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="crop-format">Output format</label>
              <select id="crop-format" value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}>
                <option value="image/png">PNG</option>
                <option value="image/jpeg">JPG</option>
                <option value="image/webp">WebP</option>
              </select>
            </div>

            <button type="button" className={styles.downloadButton} disabled={isDownloading || !completedCrop?.width} onClick={downloadCrop}>
              {isDownloading ? <span className={styles.spinner} /> : <Download size={20} />}
              {isDownloading ? "Creating image..." : "Crop and Download"}
            </button>
          </aside>
        </section>
      )}

      <section className={styles.details}>
        <h2>Fast, precise image cropping</h2>
        <p>Adjust the crop visually or enter exact pixel values. Pixores keeps the original image resolution and processes the file directly in your browser.</p>
      </section>
    </main>
  );
}
