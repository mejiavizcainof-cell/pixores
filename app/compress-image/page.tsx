"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ToolSeo from "@/components/ToolSeo";

export default function CompressImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const compressImage = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/compress-image", {
      method: "POST",
      body: formData,
    });

    const blob = await response.blob();

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "compressed.jpg";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <main className="max-w-4xl mx-auto p-10">
      <h1
        style={{
          fontSize: "42px",
          fontWeight: "bold",
          marginBottom: "20px",
        }}
      >
        Compress Images Online
      </h1>

      <p
        style={{
          color: "#666",
          marginBottom: "30px",
          fontSize: "18px",
        }}
      >
        Reduce image file size while maintaining
        excellent quality. Supports JPG, PNG and WebP.
      </p>

      <ImageUploader
        onChange={handleFileChange}
        title="Select an image"
        accept="image/*"
      />

      <button
        onClick={compressImage}
        style={{
          backgroundColor: "#2563EB",
          color: "white",
          padding: "12px 24px",
          border: "none",
          borderRadius: "8px",
          marginTop: "20px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Compress Image
      </button>

      {preview && (
        <div
          style={{
            marginTop: "40px",
          }}
        >
          <h2>Preview</h2>

          <img
            src={preview}
            alt="Preview"
            className="mt-6 max-w-full"
            style={{
              borderRadius: "12px",
              border: "1px solid #ddd",
            }}
          />
        </div>
      )}

      <ToolSeo
        title="How to Compress Images Online"
        description="
          Upload your image, click Compress Image and
          download the optimized version instantly.
          Pixores helps reduce image size while
          preserving visual quality.
        "
        benefits={[
          "Reduce image file size",
          "Improve website loading speed",
          "Supports JPG, PNG and WebP",
          "Free online image compressor",
          "No registration required",
          "Secure image processing",
          "Works on desktop and mobile",
        ]}
      />
    </main>
  );
}