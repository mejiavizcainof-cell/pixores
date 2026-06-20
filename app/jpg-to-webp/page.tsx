"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ToolSeo from "@/components/ToolSeo";
import { downloadConvertedFile } from "@/lib/downloadConvertedFile";

export default function JpgToWebpPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);

    const imageUrl = URL.createObjectURL(selectedFile);
    setPreview(imageUrl);
  };

  const convertImage = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    await downloadConvertedFile({ endpoint: "/api/jpg-to-webp", formData, fallbackFileName: "converted.webp" });
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
        Convert JPG to WebP
      </h1>

      <p
        style={{
          color: "COLORS.text",
          marginBottom: "30px",
          fontSize: "18px",
        }}
      >
        Convert JPG images to WebP format online for free.
        Reduce file size and improve website performance.
      </p>

      <ImageUploader
        onChange={handleFileChange}
        title="Select a JPG image"
        accept=".jpg,.jpeg"
      />

      <div className="mt-6">
        <button
          onClick={convertImage}
          style={{
            backgroundColor: "#2563EB",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Convert to WebP
        </button>
      </div>

      {preview && (
        <div className="mt-8">
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
            className="max-w-full rounded border"
          />
        </div>
      )}

      <ToolSeo
        title="How to Convert JPG to WebP"
        description="
          Upload your JPG image, click Convert to WebP
          and download the optimized file instantly.
          WebP images are smaller and load faster than
          traditional JPG files, making them ideal for websites.
        "
        benefits={[
          "Convert JPG images to WebP",
          "Reduce image file size",
          "Improve website performance",
          "Free online converter",
          "No registration required",
          "Works on desktop and mobile",
          "Secure file conversion",
        ]}
      />
    </main>
  );
}
