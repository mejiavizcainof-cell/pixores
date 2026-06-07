"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ToolSeo from "@/components/ToolSeo";

export default function FaviconGeneratorPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);

    const imageUrl = URL.createObjectURL(selectedFile);
    setPreview(imageUrl);
  };

  const generateFavicons = async () => {
    if (!file) {
      alert("Please select an image first.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/favicon-generator",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        alert("Error generating favicons.");
        return;
      }

      const blob = await response.blob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download =
        "pixores-favicon-pack.zip";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);

      alert(
        "An error occurred while generating favicons."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "40px",
      }}
    >
      <h1
        style={{
          fontSize: "42px",
          fontWeight: "bold",
          marginBottom: "20px",
        }}
      >
        Favicon Generator
      </h1>

      <p
        style={{
          color: "COLORS.text",
          fontSize: "18px",
          marginBottom: "30px",
        }}
      >
        Automatically generate all favicon files
        required for your website:
      </p>

      <ul
        style={{
          marginBottom: "30px",
          lineHeight: "2",
        }}
      >
        <li>✔ favicon.ico</li>
        <li>✔ favicon-16x16.png</li>
        <li>✔ favicon-32x32.png</li>
        <li>✔ apple-touch-icon.png</li>
        <li>✔ android-chrome-192x192.png</li>
        <li>✔ android-chrome-512x512.png</li>
        <li>✔ site.webmanifest</li>
      </ul>

      <ImageUploader
        onChange={handleFileChange}
        title="Select your logo or image"
        accept=".png,.jpg,.jpeg,.webp"
      />

      <div
        style={{
          marginTop: "25px",
        }}
      >
        <button
          onClick={generateFavicons}
          disabled={loading}
          style={{
            backgroundColor: "#2563EB",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "14px 28px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {loading
            ? "Generating..."
            : "Generate Favicon Pack"}
        </button>
      </div>

      {preview && (
        <div
          style={{
            marginTop: "50px",
          }}
        >
          <h2
            style={{
              marginBottom: "20px",
            }}
          >
            Preview
          </h2>

          <img
            src={preview}
            alt="Preview"
            style={{
              maxWidth: "300px",
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "10px",
              backgroundColor: "#fff",
            }}
          />
        </div>
      )}

      <section
        style={{
          marginTop: "60px",
          lineHeight: "1.8",
        }}
      >
        <h2>
          What's Included?
        </h2>

        <p>
          Our generator creates all the files
          needed to ensure compatibility with:
        </p>

        <ul>
          <li>Google Chrome</li>
          <li>Microsoft Edge</li>
          <li>Firefox</li>
          <li>Safari</li>
          <li>iPhone and iPad</li>
          <li>Android Devices</li>
          <li>Progressive Web Apps (PWA)</li>
        </ul>
      </section>

      <ToolSeo
        title="How to Generate Favicons Online"
        description="
          Upload your logo or image and generate
          a complete favicon package instantly.
          Pixores creates favicon.ico, Apple Touch
          Icons, Android icons and web manifest
          files required by modern websites.
        "
        benefits={[
          "Generate favicon.ico automatically",
          "Create Apple Touch Icons",
          "Generate Android icons",
          "Includes webmanifest file",
          "Works with PNG, JPG and WebP",
          "No registration required",
          "Fast and secure processing",
        ]}
      />
    </main>
  );
}