"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ToolSeo from "@/components/ToolSeo";

export default function WebPToJpgPage() {
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

    const response = await fetch("/api/webp-to-jpg", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      alert("Error converting image");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "converted.jpg";
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
        Convert WebP to JPG
      </h1>

      <p
        style={{
          color: "COLORS.text",
          marginBottom: "30px",
          fontSize: "18px",
        }}
      >
        Convert WebP images to JPG format online for free.
        Fast, secure and high-quality image conversion.
      </p>

      <ImageUploader
        onChange={handleFileChange}
        title="Select a WebP image"
        accept=".webp"
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
          Convert to JPG
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
        title="How to Convert WebP to JPG"
        description="
          Upload your WebP image, click Convert to JPG
          and download the converted file instantly.
          JPG format offers broad compatibility across
          devices, applications and websites.
        "
        benefits={[
          "Convert WebP images to JPG",
          "High-quality image conversion",
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
        <h2>Why Convert WebP to JPG?</h2>

        <p>
          JPG remains one of the most widely supported
          image formats across operating systems,
          applications and online platforms.
        </p>

        <p>
          Converting WebP to JPG ensures compatibility
          with older software, email clients, image
          editors and websites that do not fully support
          WebP files.
        </p>
      </section>
    </main>
  );
}