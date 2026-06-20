"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ToolSeo from "@/components/ToolSeo";
import { downloadConvertedFile } from "@/lib/downloadConvertedFile";

export default function WebpToPngPage() {
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

    await downloadConvertedFile({ endpoint: "/api/webp-to-png", formData, fallbackFileName: "converted.png" });
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
        Convert WebP to PNG
      </h1>

      <p
        style={{
          color: "COLORS.text",
          marginBottom: "30px",
          fontSize: "18px",
        }}
      >
        Convert WebP images to PNG format online for free.
        Preserve image quality and transparency with fast,
        secure conversion.
      </p>

      <ImageUploader
        onChange={handleFileChange}
        title="Select a WebP image"
        accept=".webp"
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
        Convert to PNG
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
        title="How to Convert WebP to PNG"
        description="
          Upload your WebP image, click Convert to PNG
          and download the converted file instantly.
          PNG format is ideal when you need transparency
          support and lossless image quality.
        "
        benefits={[
          "Convert WebP images to PNG",
          "Preserve transparency",
          "Lossless image quality",
          "Free online converter",
          "Fast processing",
          "No registration required",
          "Works on desktop and mobile",
          "Secure file conversion",
        ]}
      />

      <section
        style={{
          marginTop: "60px",
          lineHeight: "1.8",
        }}
      >
        <h2>Why Convert WebP to PNG?</h2>

        <p>
          PNG is one of the most widely used image formats
          for graphics, logos, screenshots and images that
          require transparent backgrounds.
        </p>

        <p>
          Converting WebP to PNG allows you to use your
          images in design software, websites and platforms
          that require lossless image quality and full
          transparency support.
        </p>

        <h3>Benefits of PNG Format</h3>

        <ul>
          <li>Supports transparent backgrounds</li>
          <li>Lossless image quality</li>
          <li>Excellent for logos and graphics</li>
          <li>Widely supported across applications</li>
          <li>Ideal for web design projects</li>
        </ul>
      </section>
    </main>
  );
}
