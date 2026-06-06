"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ToolSeo from "@/components/ToolSeo";

export default function ResizeImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [width, setWidth] = useState("800");
  const [height, setHeight] = useState("600");

  const presets = [
    {
      name: "Instagram Post",
      width: 1080,
      height: 1080,
    },
    {
      name: "Instagram Story",
      width: 1080,
      height: 1920,
    },
    {
      name: "Facebook Post",
      width: 1200,
      height: 630,
    },
    {
      name: "Facebook Cover",
      width: 851,
      height: 315,
    },
    {
      name: "YouTube Thumbnail",
      width: 1280,
      height: 720,
    },
    {
      name: "YouTube Banner",
      width: 2560,
      height: 1440,
    },
    {
      name: "LinkedIn Banner",
      width: 1584,
      height: 396,
    },
    {
      name: "X (Twitter) Header",
      width: 1500,
      height: 500,
    },
    {
      name: "Pinterest Pin",
      width: 1000,
      height: 1500,
    },
    {
      name: "TikTok Profile",
      width: 200,
      height: 200,
    },
    {
      name: "TikTok Cover",
      width: 1080,
      height: 1920,
    },
  ];

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const resizeImage = async () => {
    if (!file) return;

    const formData = new FormData();

    formData.append("file", file);
    formData.append("width", width);
    formData.append("height", height);

    const response = await fetch("/api/resize-image", {
      method: "POST",
      body: formData,
    });

    const blob = await response.blob();

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "resized.jpg";
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
        Resize Image Online
      </h1>

      <p
        style={{
          color: "#666",
          marginBottom: "30px",
          fontSize: "18px",
        }}
      >
        Resize JPG, PNG and WebP images online for free.
        Change image dimensions while maintaining quality.
      </p>

      <ImageUploader
        onChange={handleFileChange}
        title="Select an image"
        accept="image/*"
      />

      <div
        style={{
          marginTop: "30px",
        }}
      >
        <h3>Popular Sizes</h3>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginTop: "15px",
          }}
        >
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                setWidth(String(preset.width));
                setHeight(String(preset.height));
              }}
              style={{
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "10px",
                background: "#fff",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <strong>{preset.name}</strong>
              <br />
              <small>
                {preset.width} × {preset.height}
              </small>
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: "25px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="number"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          placeholder="Width"
          style={{
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        />

        <input
          type="number"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="Height"
          style={{
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        />
      </div>

      <button
        onClick={resizeImage}
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
        Resize Image
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
        title="How to Resize Images Online"
        description="
          Upload your image, enter the desired width
          and height, then download the resized image
          instantly. Perfect for websites, social media,
          documents and presentations.
        "
        benefits={[
          "Resize JPG, PNG and WebP images",
          "Customize image dimensions",
          "Free online image resizer",
          "Fast processing",
          "No registration required",
          "Works on desktop and mobile",
          "Secure file processing",
          "Instagram image size presets",
          "YouTube thumbnail dimensions",
          "Facebook cover size templates",
          "LinkedIn banner sizes",
          "TikTok image dimensions",
        ]}
      />

      <section
        style={{
          marginTop: "60px",
          lineHeight: "1.8",
        }}
      >
        <h2>Popular Social Media Image Sizes</h2>

        <ul>
          <li>Instagram Post: 1080 × 1080</li>
          <li>Instagram Story: 1080 × 1920</li>
          <li>Facebook Post: 1200 × 630</li>
          <li>Facebook Cover: 851 × 315</li>
          <li>YouTube Thumbnail: 1280 × 720</li>
          <li>YouTube Banner: 2560 × 1440</li>
          <li>LinkedIn Banner: 1584 × 396</li>
          <li>X (Twitter) Header: 1500 × 500</li>
          <li>Pinterest Pin: 1000 × 1500</li>
          <li>TikTok Profile Picture: 200 × 200</li>
          <li>TikTok Cover: 1080 × 1920</li>
        </ul>

        <h3>Why Use Recommended Image Sizes?</h3>

        <p>
          Using the correct dimensions helps your images
          look sharp and professional on every platform.
          Proper sizing also improves engagement and
          prevents unwanted cropping.
        </p>

        <h3>Best Image Sizes for Social Media</h3>

        <p>
          Whether you're creating content for Instagram,
          Facebook, YouTube, LinkedIn, Pinterest, X or
          TikTok, these recommended image dimensions help
          ensure the best appearance across desktop and
          mobile devices.
        </p>
      </section>
    </main>
  );
}