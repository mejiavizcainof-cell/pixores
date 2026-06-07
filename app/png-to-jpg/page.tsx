"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ToolSeo from "@/components/ToolSeo";

export default function PngToJpgPage() {
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

    const response = await fetch("/api/png-to-jpg", {
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
        Convert PNG to JPG
      </h1>

      <p
        style={{
          color: "COLORS.text",
          marginBottom: "30px",
          fontSize: "18px",
        }}
      >
        Convert PNG images to JPG format online for free.
        Fast, secure and high-quality image conversion.
      </p>

      <ImageUploader
        onChange={handleFileChange}
        title="Select a PNG image"
        accept=".png"
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
        title="How to Convert PNG to JPG"
        description="
          Upload your PNG image, click Convert to JPG
          and download the converted file instantly.
          JPG format is ideal for reducing file size
          and sharing images online.
        "
        benefits={[
          "Convert PNG images to JPG",
          "Reduce image file size",
          "Fast image conversion",
          "Free online converter",
          "No registration required",
          "Works on desktop and mobile",
          "Secure file processing",
        ]}
      />
    </main>
  );
}