"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ToolSeo from "@/components/ToolSeo";
import { downloadConvertedFile } from "@/lib/downloadConvertedFile";

export default function PngToWebpPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const convertImage = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    await downloadConvertedFile({ endpoint: "/api/png-to-webp", formData, fallbackFileName: "converted.webp" });
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
        Convert PNG to WebP
      </h1>

      <p
        style={{
          color: "COLORS.text",
          marginBottom: "30px",
          fontSize: "18px",
        }}
      >
        Convert PNG images to WebP format online for free.
        Reduce file size and improve website performance.
      </p>

      <ImageUploader
        onChange={handleFileChange}
        title="Select a PNG image"
        accept=".png"
      />

      <button
        onClick={convertImage}
        style={{
          backgroundColor: "#2563EB",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "12px 24px",
          marginTop: "20px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Convert to WebP
      </button>

      {preview && (
        <div
          style={{
            marginTop: "40px",
          }}
        >
          <h2
            style={{
              marginBottom: "15px",
            }}
          >
            Preview
          </h2>

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
        title="How to Convert PNG to WebP"
        description="
          Upload your PNG image, click Convert to WebP
          and download the optimized file instantly.
          WebP images provide smaller file sizes while
          maintaining excellent visual quality.
        "
        benefits={[
          "Convert PNG images to WebP",
          "Reduce image file size",
          "Improve website loading speed",
          "Free online converter",
          "No registration required",
          "Works on desktop and mobile",
          "Secure file conversion",
        ]}
      />
    </main>
  );
}
