import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pixores - Free Online Image & File Tools",
  description:
    "Convert, compress and optimize images online. JPG, PNG, WebP, HEIC, PDF and favicon tools for free.",

  keywords: [
    "image converter",
    "jpg to png",
    "png to jpg",
    "webp converter",
    "webp to jpg",
    "jpg to webp",
    "png to webp",
    "webp to png",
    "heic to jpg",
    "jpg to pdf",
    "pdf to jpg",
    "favicon generator",
    "image compressor",
    "image resizer",
    "online image tools",
    "free image converter",
  ],
};

export default function Home() {
  const tools = [
    {
      title: "JPG → PNG",
      description: "Convert JPG images to PNG format.",
      link: "/jpg-to-png",
    },
    {
      title: "PNG → JPG",
      description: "Convert PNG images to JPG format.",
      link: "/png-to-jpg",
    },
    {
      title: "WebP → JPG",
      description: "Convert WebP images to JPG format.",
      link: "/webp-to-jpg",
    },
    {
      title: "JPG → WebP",
      description: "Convert JPG images to WebP format.",
      link: "/jpg-to-webp",
    },
    {
      title: "PNG → WebP",
      description: "Convert PNG images to WebP format.",
      link: "/png-to-webp",
    },
    {
      title: "WebP → PNG",
      description: "Convert WebP images to PNG format.",
      link: "/webp-to-png",
    },
    {
      title: "HEIC → JPG",
      description: "Convert iPhone HEIC images to JPG.",
      link: "/heic-to-jpg",
    },
    {
      title: "JPG → PDF",
      description: "Convert JPG images to PDF files.",
      link: "/jpg-to-pdf",
    },
    {
      title: "PDF → JPG",
      description: "Convert PDF pages into JPG images.",
      link: "/pdf-to-jpg",
    },
    {
      title: "Favicon Generator",
      description:
        "Generate favicon.ico, Apple Touch Icons and Android icons.",
      link: "/favicon-generator",
    },
    {
      title: "Compress Image",
      description:
        "Reduce image file size while maintaining quality.",
      link: "/compress-image",
    },
    {
      title: "Resize Image",
      description: "Change image dimensions instantly.",
      link: "/resize-image",
    },
  ];

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "40px 20px",
      }}
    >
      <section
        style={{
          textAlign: "center",
          marginBottom: "60px",
        }}
      >
        <h1
          style={{
            fontSize: "56px",
            fontWeight: "bold",
            color: "#2563eb",
            marginBottom: "20px",
          }}
        >
          Convert, Compress & Optimize Files Online
        </h1>

        <p
          style={{
            fontSize: "22px",
            color: "#555",
            maxWidth: "800px",
            margin: "0 auto",
          }}
        >
          Free tools for image conversion, compression,
          resizing and favicon generation.
        </p>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
        }}
      >
        {tools.map((tool) => (
          <a
            key={tool.link}
            href={tool.link}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "24px",
                backgroundColor: "#ffffff",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.05)",
                transition: "0.2s",
                height: "100%",
              }}
            >
              <h2
                style={{
                  fontSize: "28px",
                  marginBottom: "12px",
                }}
              >
                {tool.title}
              </h2>

              <p
                style={{
                  color: "#64748b",
                  lineHeight: "1.6",
                }}
              >
                {tool.description}
              </p>
            </div>
          </a>
        ))}
      </div>

      <section
        style={{
          marginTop: "80px",
          lineHeight: "1.8",
        }}
      >
        <h2
          style={{
            fontSize: "32px",
            marginBottom: "20px",
          }}
        >
          Free Online Image Conversion Tools
        </h2>

        <p>
          Pixores provides free online tools to convert
          images between JPG, PNG, WebP, HEIC and PDF
          formats. You can also compress images, resize
          photos and generate complete favicon packages
          for websites.
        </p>

        <p>
          All file processing is performed automatically
          to deliver the best possible quality while
          keeping files optimized and lightweight.
        </p>

        <p>
          Our mission is to provide simple, fast and
          free tools for content creators, developers,
          designers, marketers and businesses around
          the world.
        </p>
      </section>
    </main>
  );
}