"use client";

import { useEffect, useRef, useState } from "react";

const STAGE_SIZE = 320;
const OUTPUT_SIZE = 512;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

function clampOffset(value: number, imageSize: number) {
  return Math.min(0, Math.max(STAGE_SIZE - imageSize, value));
}

export default function RoundProfilePictureCropper() {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  const scale = naturalSize.width && naturalSize.height
    ? STAGE_SIZE / Math.min(naturalSize.width, naturalSize.height) * zoom
    : 1;
  const imageWidth = naturalSize.width * scale;
  const imageHeight = naturalSize.height * scale;
  const boundedLeft = clampOffset(left, imageWidth);
  const boundedTop = clampOffset(top, imageHeight);

  const chooseImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_FILE_BYTES) {
      setError("Choose an image that is 20 MB or smaller.");
      return;
    }
    const url = URL.createObjectURL(selected);
    const image = new Image();
    image.onload = () => {
      setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
      setZoom(1);
      setLeft((STAGE_SIZE - image.naturalWidth * STAGE_SIZE / Math.min(image.naturalWidth, image.naturalHeight)) / 2);
      setTop((STAGE_SIZE - image.naturalHeight * STAGE_SIZE / Math.min(image.naturalWidth, image.naturalHeight)) / 2);
      setFileUrl(url);
      setError("");
    };
    image.onerror = () => { URL.revokeObjectURL(url); setError("This image could not be opened in your browser."); };
    image.src = url;
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!fileUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY, left: boundedLeft, top: boundedTop };
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start) return;
    setLeft(clampOffset(start.left + event.clientX - start.x, imageWidth));
    setTop(clampOffset(start.top + event.clientY - start.y, imageHeight));
  };

  const stopDrag = () => { dragStart.current = null; };

  const updateZoom = (value: number) => {
    const nextZoom = value;
    const nextScale = STAGE_SIZE / Math.min(naturalSize.width, naturalSize.height) * nextZoom;
    setZoom(nextZoom);
    setLeft((STAGE_SIZE - naturalSize.width * nextScale) / 2);
    setTop((STAGE_SIZE - naturalSize.height * nextScale) / 2);
  };

  const nudge = (x: number, y: number) => {
    setLeft(clampOffset(boundedLeft + x, imageWidth));
    setTop(clampOffset(boundedTop + y, imageHeight));
  };

  const download = () => {
    if (!fileUrl || !naturalSize.width || !naturalSize.height) return;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) { setError("Your browser could not prepare the image."); return; }
      context.beginPath();
      context.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      context.clip();
      const outputScale = OUTPUT_SIZE / STAGE_SIZE;
      context.drawImage(image, boundedLeft * outputScale, boundedTop * outputScale, imageWidth * outputScale, imageHeight * outputScale);
      canvas.toBlob((blob) => {
        if (!blob) { setError("Your browser could not export the PNG."); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "round-profile-picture.png";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    };
    image.onerror = () => setError("The selected image could not be rendered.");
    image.src = fileUrl;
  };

  return (
    <main className="mx-auto max-w-4xl space-y-7 px-5 py-10 md:px-10">
      <header className="space-y-3"><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Free Pixores tool</p><h1 className="text-4xl font-bold tracking-tight text-slate-950">Round Profile Picture Cropper</h1><p className="max-w-3xl text-lg leading-8 text-slate-700">Crop a photo into a circle, adjust the zoom and position, and save a transparent PNG. Your image stays in your browser.</p></header>
      <section className="grid gap-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_340px] md:p-7">
        <div className="space-y-5">
          <label htmlFor="profile-picture-file" className="block space-y-2 font-semibold text-slate-900"><span>Choose an image</span><input id="profile-picture-file" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={chooseImage} className="block w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <label className="block space-y-2 font-medium text-slate-800">Zoom <input type="range" min="1" max="2.5" step="0.01" value={zoom} onChange={(event) => updateZoom(Number(event.target.value))} disabled={!fileUrl} className="block w-full" /><span className="text-sm text-slate-600">{Math.round(zoom * 100)}%</span></label>
          <div className="flex flex-wrap gap-2" aria-label="Adjust crop position">
            <button type="button" disabled={!fileUrl} onClick={() => nudge(0, -12)} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40">Up</button>
            <button type="button" disabled={!fileUrl} onClick={() => nudge(-12, 0)} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40">Left</button>
            <button type="button" disabled={!fileUrl} onClick={() => nudge(12, 0)} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40">Right</button>
            <button type="button" disabled={!fileUrl} onClick={() => nudge(0, 12)} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40">Down</button>
          </div>
          <p className="text-sm leading-6 text-slate-600">Drag the image inside the circular frame to reposition it. The transparent area outside the circle is included in the PNG. Processing happens locally in your browser.</p>
          <button type="button" disabled={!fileUrl} onClick={download} className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">Download profile picture PNG</button>
          {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
        </div>
        <div className="flex items-center justify-center rounded-xl bg-slate-100 p-4">
          <div ref={stageRef} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} className={`relative h-80 w-80 touch-none overflow-hidden rounded-full bg-slate-200 ${fileUrl ? "cursor-move" : ""}`} aria-label="Circular profile picture crop preview">
            {fileUrl ? <img src={fileUrl} alt="Selected photo crop preview" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ left: boundedLeft, top: boundedTop, width: imageWidth, height: imageHeight }} /> : <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-slate-500">Your circular crop preview will appear here.</p>}
          </div>
        </div>
      </section>
      <section className="space-y-3 leading-7 text-slate-700"><h2 className="text-2xl font-bold text-slate-950">A profile-picture crop, not an official ID photo</h2><p>This tool creates a circular profile image for websites and social platforms. It does not create or certify passport or government ID photos, which have country-specific requirements.</p></section>
    </main>
  );
}
