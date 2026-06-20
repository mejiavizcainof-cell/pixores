import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "All Tools",
  description:
    "Browse AI image editing, conversion, compression and optimization tools available on Pixores.",
};

const tools = [
  {
    title: "AI Background Remover",
    href: "/remove-background",
    description: "Remove image backgrounds automatically and download a transparent PNG.",
  },
  {
    title: "AI Image Upscaler",
    href: "/image-upscaler",
    description: "Increase image resolution by 2x or 4x while preserving important details.",
  },
  {
    title: "Rotate and Flip Image",
    href: "/rotate-image",
    description: "Correct photo orientation, rotate images, and flip them horizontally or vertically.",
  },
  {
    title: "Instagram Reel Saver Guide",
    href: "/instagram-reel-downloader",
    description:
      "Safe guide for saving your own Instagram Reels or content you have permission to use.",
  },
  {
  title: "Thumbnail Creator Pro",
  href: "/thumbnail-creator",
  description:
    "Create professional YouTube thumbnails with layers, drag & drop, custom fonts and advanced editing tools.",
},
  {
    title: "JPG to PNG",
    href: "/jpg-to-png",
    description: "Convert JPG images to PNG format.",
  },
  {
    title: "PNG to JPG",
    href: "/png-to-jpg",
    description: "Convert PNG images to JPG format.",
  },
  {
    title: "JPG to WebP",
    href: "/jpg-to-webp",
    description: "Convert JPG images to WebP format.",
  },
  {
    title: "PNG to WebP",
    href: "/png-to-webp",
    description: "Convert PNG images to WebP format.",
  },
  {
    title: "WebP to JPG",
    href: "/webp-to-jpg",
    description: "Convert WebP images to JPG format.",
  },
  {
    title: "WebP to PNG",
    href: "/webp-to-png",
    description: "Convert WebP images to PNG format.",
  },
  {
    title: "HEIC to JPG",
    href: "/heic-to-jpg",
    description: "Convert HEIC images from iPhone to JPG.",
  },
  {
    title: "JPG to PDF",
    href: "/jpg-to-pdf",
    description: "Convert JPG images into PDF documents.",
  },
  {
    title: "Compress Image",
    href: "/compress-image",
    description: "Reduce image size while preserving quality.",
  },
  {
    title: "Resize Image",
    href: "/resize-image",
    description: "Change image dimensions online.",
  },
  {
    title: "Favicon Generator",
    href: "/favicon-generator",
    description: "Generate all favicon sizes for your website.",
  },
];

export default function ToolsPage() {
  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "40px",
      }}
    >
      <h1>All Pixores Tools</h1>

      <p
        style={{
          color: "#64748b",
          marginBottom: "40px",
        }}
      >
        Free online tools for image conversion,
        compression, optimization and favicon generation.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            style={{
              textDecoration: "none",
              color: "inherit",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "20px",
              backgroundColor: "#fff",
            }}
          >
            <h2>{tool.title}</h2>

            <p
              style={{
                color: "#64748b",
              }}
            >
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
