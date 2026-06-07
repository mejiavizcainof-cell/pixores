"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ToolSeo from "@/components/ToolSeo";

export default function JpgToPdfPage() {
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

    const response = await fetch("/api/jpg-to-pdf", {
      method: "POST",
      body: formData,
    });

    const blob = await response.blob();

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "converted.pdf";
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
        Convert JPG to PDF
      </h1>

      <p
        style={{
          color: "COLORS.text",
          marginBottom: "30px",
          fontSize: "18px",
        }}
      >
        Convert JPG images into PDF documents online
        for free. Fast, secure and easy to use.
      </p>

      <ImageUploader
        onChange={handleFileChange}
        title="Select a JPG image"
        accept=".jpg,.jpeg"
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
        Convert to PDF
      </button>

      <ToolSeo
        title="How to Convert JPG to PDF"
        description="
          Upload your JPG image, click Convert to PDF
          and download your PDF document instantly.
          No software installation or registration
          required.
        "
        benefits={[
          "Convert JPG images to PDF",
          "Free online converter",
          "Fast PDF generation",
          "High-quality output",
          "No registration required",
          "Works on desktop and mobile",
          "Secure file processing",
        ]}
      />
    </main>
  );
}