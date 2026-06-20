"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ToolSeo from "@/components/ToolSeo";
import { downloadConvertedFile } from "@/lib/downloadConvertedFile";

export default function HeicToJpgPage() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
  };

  const convertImage = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    await downloadConvertedFile({ endpoint: "/api/heic-to-jpg", formData, fallbackFileName: "converted.jpg" });
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
        Convert HEIC to JPG
      </h1>

      <p
        style={{
          color: "COLORS.text",
          marginBottom: "30px",
          fontSize: "18px",
        }}
      >
        Convert iPhone HEIC photos to JPG format online
        for free. Fast, secure and easy to use.
      </p>

      <ImageUploader
        onChange={handleFileChange}
        title="Select a HEIC image"
        accept=".heic"
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
        Convert to JPG
      </button>

      <ToolSeo
        title="How to Convert HEIC to JPG"
        description="
          Upload your HEIC image, click Convert to JPG
          and download the converted file instantly.
          Perfect for iPhone photos that need to be
          opened on Windows, Android or the web.
        "
        benefits={[
          "Convert iPhone HEIC photos to JPG",
          "Free online converter",
          "No registration required",
          "Fast processing",
          "Works on desktop and mobile",
          "High-quality JPG output",
          "Secure file conversion",
        ]}
      />
    </main>
  );
}
