"use client";

import { useEffect, useState } from "react";
import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";
import ToolSeo from "@/components/ToolSeo";
import { downloadConvertedFile } from "@/lib/downloadConvertedFile";

export default function RotateImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [angle, setAngle] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const chooseImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setAngle(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setError("");
  };

  const downloadImage = async () => {
    if (!file) return;
    setProcessing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("angle", String(angle));
      formData.set("flipHorizontal", String(flipHorizontal));
      formData.set("flipVertical", String(flipVertical));
      await downloadConvertedFile({ endpoint: "/api/rotate-image", formData, fallbackFileName: "oriented-image.jpg" });
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "The image could not be processed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main style={{ width: "100%", maxWidth: "960px", margin: "0 auto", padding: "clamp(24px, 5vw, 48px) 16px 64px" }}>
      <h1 style={{ margin: "0 0 10px", color: "#0F172A", fontSize: "clamp(32px, 6vw, 48px)", lineHeight: 1.1 }}>Rotate and Flip Image</h1>
      <p style={{ margin: "0 0 28px", color: "#475569", fontSize: "18px", lineHeight: 1.6 }}>Correct photo orientation, rotate images, or mirror them horizontally and vertically.</p>

      <ImageUploader onChange={chooseImage} title="Select an image" accept="image/jpeg,image/png,image/webp" />

      {preview && (
        <section style={{ padding: "16px", border: "1px solid #E2E8F0", borderRadius: "8px", background: "#FFFFFF" }}>
          <div style={{ minHeight: "280px", maxHeight: "520px", overflow: "hidden", display: "grid", placeItems: "center", borderRadius: "8px", background: "#F1F5F9" }}>
            <img src={preview} alt="Image orientation preview" style={{ maxWidth: "88%", maxHeight: "460px", objectFit: "contain", transform: `rotate(${angle}deg) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`, transition: "transform 180ms ease" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: "10px", marginTop: "16px" }}>
            <button type="button" onClick={() => setAngle((current) => (current + 270) % 360)} style={controlStyle}><RotateCcw size={19} /> Rotate Left</button>
            <button type="button" onClick={() => setAngle((current) => (current + 90) % 360)} style={controlStyle}><RotateCw size={19} /> Rotate Right</button>
            <button type="button" onClick={() => setFlipHorizontal((current) => !current)} style={{ ...controlStyle, background: flipHorizontal ? "#DBEAFE" : "#FFFFFF", color: flipHorizontal ? "#1D4ED8" : "#0F172A" }}><FlipHorizontal2 size={19} /> Flip Horizontal</button>
            <button type="button" onClick={() => setFlipVertical((current) => !current)} style={{ ...controlStyle, background: flipVertical ? "#DBEAFE" : "#FFFFFF", color: flipVertical ? "#1D4ED8" : "#0F172A" }}><FlipVertical2 size={19} /> Flip Vertical</button>
          </div>

          {error && <p role="alert" style={{ margin: "14px 0 0", color: "#DC2626", fontWeight: 700 }}>{error}</p>}
          <button type="button" onClick={downloadImage} disabled={processing} style={{ width: "100%", marginTop: "16px", padding: "13px 18px", border: 0, borderRadius: "8px", background: processing ? "#94A3B8" : "#2563EB", color: "#FFFFFF", fontWeight: 850, cursor: processing ? "wait" : "pointer" }}>
            {processing ? "Processing..." : "Download Oriented Image"}
          </button>
        </section>
      )}

      <ToolSeo title="Fix Image Orientation Online" description="Rotate JPG, PNG, and WebP photos by 90, 180, or 270 degrees. You can also mirror images horizontally or vertically while preserving high visual quality." benefits={["Automatically respects camera orientation", "Rotate left or right", "Horizontal and vertical image flip", "High-quality output", "Works on mobile and desktop"]} />
    </main>
  );
}

const controlStyle: React.CSSProperties = {
  minHeight: "46px", padding: "10px 12px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
  border: "1px solid #CBD5E1", borderRadius: "8px", background: "#FFFFFF", color: "#0F172A", fontWeight: 750, cursor: "pointer",
};
