"use client";

import { useRef, useState } from "react";
import JSZip from "jszip";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const presets = [
  { label: "Instagram square", width: 1080, height: 1080 },
  { label: "YouTube thumbnail", width: 1280, height: 720 },
  { label: "LinkedIn banner", width: 1584, height: 396 },
];

function outputName(fileName: string, usedNames: Set<string>) {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]/g, "-") || "image";
  let name = `${base}.jpg`;
  let number = 2;
  while (usedNames.has(name.toLowerCase())) {
    name = `${base} (${number}).jpg`;
    number += 1;
  }
  usedNames.add(name.toLowerCase());
  return name;
}

export default function BatchImageResizer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [width, setWidth] = useState("1080");
  const [height, setHeight] = useState("1080");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const chooseFiles = (selected: FileList | null) => {
    if (!selected) return;
    const picked = Array.from(selected);
    const valid = picked.filter((file) => {
      const extension = file.name.toLowerCase().split(".").pop() || "";
      return (ACCEPTED_TYPES.has(file.type) || ACCEPTED_EXTENSIONS.has(extension)) && file.size <= MAX_FILE_BYTES;
    });
    const issues: string[] = [];
    if (picked.length > MAX_FILES) issues.push(`Choose up to ${MAX_FILES} images per batch.`);
    if (valid.length !== picked.length) issues.push("Only JPG, PNG and WebP files up to 4 MB each are accepted.");
    setFiles(valid.slice(0, MAX_FILES));
    setError(issues.join(" "));
    setMessage("");
    setProgress(0);
  };

  const resizeBatch = async () => {
    const targetWidth = Number(width);
    const targetHeight = Number(height);
    if (!files.length) {
      setError("Choose at least one image first.");
      return;
    }
    if (!Number.isInteger(targetWidth) || !Number.isInteger(targetHeight) || targetWidth < 1 || targetHeight < 1 || targetWidth > 8000 || targetHeight > 8000 || targetWidth * targetHeight > 40_000_000) {
      setError("Enter whole-number dimensions up to 8000 pixels per side and 40 megapixels total.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("Preparing your images…");
    setProgress(0);
    const zip = new JSZip();
    const usedNames = new Set<string>();
    const failed: string[] = [];
    let completed = 0;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("width", String(targetWidth));
        formData.append("height", String(targetHeight));
        const response = await fetch("/api/resize-batch-item", { method: "POST", body: formData });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Resize failed");
        }
        zip.file(outputName(file.name, usedNames), await response.blob());
        completed += 1;
      } catch {
        failed.push(file.name);
      }
      setProgress(Math.round(((index + 1) / files.length) * 100));
      setMessage(`Resizing ${index + 1} of ${files.length} images…`);
    }

    if (completed > 0) {
      try {
        const archive = await zip.generateAsync({ type: "blob", compression: "STORE" });
        const url = URL.createObjectURL(archive);
        const link = document.createElement("a");
        link.href = url;
        link.download = "resized-images.zip";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage(`${completed} image${completed === 1 ? "" : "s"} resized and downloaded as a ZIP.`);
      } catch {
        setError("The ZIP could not be prepared. Please try a smaller batch.");
        setMessage("");
      }
    } else {
      setError("None of the selected images could be resized.");
      setMessage("");
    }
    if (failed.length) setError(`Could not resize: ${failed.join(", ")}. The other images were downloaded.`);
    setBusy(false);
  };

  return (
    <main className="mx-auto max-w-4xl space-y-7 px-5 py-10 md:px-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Pixores image tools</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">Batch Image Resizer</h1>
        <p className="max-w-3xl text-lg leading-8 text-slate-700">
          Resize up to 10 JPG, PNG or WebP images to the same exact dimensions and download the JPG results in one ZIP file.
        </p>
      </header>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7" aria-label="Resize multiple images">
        <div>
          <label htmlFor="batch-image-files" className="mb-2 block font-semibold text-slate-900">Choose images</label>
          <input
            ref={inputRef}
            id="batch-image-files"
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple
            onChange={(event) => chooseFiles(event.target.files)}
            className="block w-full rounded-xl border border-slate-300 p-3 text-slate-800"
          />
          <p className="mt-2 text-sm text-slate-600">Up to {MAX_FILES} images, 4 MB per file. Each file is uploaded to Pixores for resizing.</p>
        </div>

        {files.length > 0 && (
          <div className="rounded-xl bg-slate-50 p-4">
            <h2 className="mb-2 font-semibold text-slate-900">Selected ({files.length})</h2>
            <ul className="max-h-40 space-y-1 overflow-auto text-sm text-slate-700">
              {files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</li>)}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button key={preset.label} type="button" onClick={() => { setWidth(String(preset.width)); setHeight(String(preset.height)); }} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
              {preset.label} · {preset.width} × {preset.height}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 font-medium text-slate-800">Width (px)<input type="number" min="1" max="8000" value={width} onChange={(event) => setWidth(event.target.value)} className="block w-full rounded-lg border border-slate-300 p-3" /></label>
          <label className="space-y-1 font-medium text-slate-800">Height (px)<input type="number" min="1" max="8000" value={height} onChange={(event) => setHeight(event.target.value)} className="block w-full rounded-lg border border-slate-300 p-3" /></label>
        </div>

        <p className="text-sm leading-6 text-slate-600">Every output uses the exact width and height you enter. If those dimensions have a different shape from a source image, the resize may crop the outer edges to fill the target. Outputs are JPG files.</p>
        <button type="button" disabled={busy || !files.length} onClick={resizeBatch} className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Resizing…" : "Resize images and download ZIP"}
        </button>
        {busy && <progress className="block h-3 w-full" value={progress} max="100" aria-label={`${progress}% complete`} />}
        {message && <p role="status" className="text-sm font-medium text-green-800">{message}</p>}
        {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      </section>

      <section className="space-y-3 leading-7 text-slate-700">
        <h2 className="text-2xl font-bold text-slate-950">How batch resizing works</h2>
        <p>Select up to 10 images, choose exact pixel dimensions or a preset, and start the resize. Pixores processes each image on its server and packages successful JPG results into one ZIP download.</p>
        <p>Batch resizing changes dimensions. When the target shape differs from a source image, Pixores fills the target area and may crop the outer edges. Keep the original files if you need a different crop or format.</p>
      </section>
    </main>
  );
}
