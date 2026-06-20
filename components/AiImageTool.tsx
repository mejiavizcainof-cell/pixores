"use client";

import { useEffect, useState } from "react";
import { ScanSearch, WandSparkles } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";
import ToolSeo from "@/components/ToolSeo";
import { downloadConvertedFile } from "@/lib/downloadConvertedFile";
import { supabase } from "@/lib/supabaseClient";
import styles from "./AiImageTool.module.css";

type AiImageToolProps = {
  mode: "remove-background" | "upscale";
};

const content = {
  "remove-background": {
    eyebrow: "AI image editing",
    title: "AI Background Remover",
    intro: "Remove an image background automatically and download a clean transparent PNG in seconds.",
    uploadTitle: "Choose an image to remove its background",
    button: "Remove Background & Download",
    endpoint: "/api/ai-background-remover",
    fileName: "background-removed.png",
    seoTitle: "Remove Image Background Online",
    seoDescription: "Upload a photo and let Pixores isolate the main subject. The finished image downloads as a transparent PNG that is ready for product photos, thumbnails, profiles, and designs.",
    benefits: [
      "Automatic AI background removal",
      "Transparent high-quality PNG download",
      "Works with portraits, products, and objects",
      "Camera and file upload on mobile",
      "Private server-side processing",
    ],
  },
  upscale: {
    eyebrow: "AI image enhancement",
    title: "AI Image Upscaler",
    intro: "Increase image resolution while preserving detail. Choose 2x or 4x enhancement for sharper photos and graphics.",
    uploadTitle: "Choose an image to increase its resolution",
    button: "Upscale & Download",
    endpoint: "/api/upscale-image",
    fileName: "upscaled-image.png",
    seoTitle: "Increase Image Resolution with AI",
    seoDescription: "Use the Pixores AI image upscaler to enlarge low-resolution photos and graphics. Increase image resolution by 2x or 4x and download a sharper result.",
    benefits: [
      "Increase image resolution by 2x or 4x",
      "AI enhancement for sharper details",
      "Output up to 4096 pixels per side",
      "Camera and file upload on mobile",
      "High-quality image download",
    ],
  },
} as const;

export default function AiImageTool({ mode }: AiImageToolProps) {
  const copy = content[mode];
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scale, setScale] = useState<2 | 4>(2);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setStatus("");
  };

  const runTool = async () => {
    if (!file || busy) return;

    setBusy(true);
    setStatus("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setStatus("Please sign in to use this AI tool.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      if (mode === "upscale") formData.append("scale", String(scale));

      const completed = await downloadConvertedFile({
        endpoint: copy.endpoint,
        formData,
        fallbackFileName: copy.fileName,
        headers: { Authorization: `Bearer ${token}` },
        timeoutMs: mode === "upscale" ? 100000 : 90000,
        processingMessage: mode === "upscale" ? "Enhancing your image with AI..." : "Removing the background...",
        processingHint: mode === "upscale"
          ? "Large images and 4x enhancement can take up to 90 seconds."
          : "This usually finishes in under a minute.",
      });

      if (!completed) setStatus("The image could not be processed. Check the message shown above and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>{copy.eyebrow}</p>
      <h1 className={styles.title}>{copy.title}</h1>
      <p className={styles.intro}>{copy.intro}</p>

      <section className={styles.workspace} aria-label={`${copy.title} workspace`}>
        <ImageUploader onChange={handleFileChange} title={copy.uploadTitle} accept="image/jpeg,image/png,image/webp" />

        {preview && (
          <div className={styles.previewWrap}>
            {/* A local object URL is required to preview the user's selected file. */}
            <img className={styles.preview} src={preview} alt="Selected image preview" />
          </div>
        )}

        <div className={styles.controls}>
          {mode === "upscale" && (
            <div className={styles.scaleGroup}>
              <span className={styles.label}>Resolution increase</span>
              <div className={styles.scaleButtons}>
                {([2, 4] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={scale === value ? styles.scaleActive : styles.scaleButton}
                    onClick={() => setScale(value)}
                    aria-pressed={scale === value}
                  >
                    {value}x
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="button" className={styles.action} onClick={runTool} disabled={!file || busy}>
            {mode === "remove-background" ? <WandSparkles size={20} /> : <ScanSearch size={20} />}
            {busy ? "Processing..." : copy.button}
          </button>
        </div>

        <p className={styles.note}>One successful AI process uses 1 credit. Files are limited to 20 MB.</p>
        {status && <p className={styles.status} role="alert">{status}</p>}
      </section>

      <ToolSeo title={copy.seoTitle} description={copy.seoDescription} benefits={[...copy.benefits]} />
    </main>
  );
}
