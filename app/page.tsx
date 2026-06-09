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
    {
  title: "Thumbnail Creator Pro",
  description:
    "Create professional YouTube thumbnails with layers, drag & drop, custom fonts and advanced editing tools.",
  link: "/thumbnail-creator",
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
          marginBottom: "70px",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(38px, 6vw, 64px)",
            fontWeight: 800,
            color: "#0F172A",
            lineHeight: 1.1,
            marginBottom: "20px",
          }}
        >
          Convert, Compress & Optimize Files Online
        </h1>

        <p
          style={{
            fontSize: "clamp(18px, 3vw, 24px)",
            color: "#475569",
            maxWidth: "850px",
            margin: "0 auto",
            lineHeight: 1.7,
          }}
        >
          Free online tools for image conversion,
          compression, resizing and favicon generation.
          Fast, secure and easy to use on any device.
        </p>
      </section>

      <section
  style={{
    marginBottom: "50px",
    background:
      "linear-gradient(135deg,#2563EB,#7C3AED)",
    color: "#fff",
    padding: "40px",
    borderRadius: "24px",
    textAlign: "center",
  }}
>
  <h2
    style={{
      marginTop: 0,
      fontSize: "42px",
      fontWeight: 800,
    }}
  >
    🎨 New: Thumbnail Creator Pro
  </h2>

  <p
    style={{
      fontSize: "20px",
      maxWidth: "800px",
      margin: "0 auto 24px",
      lineHeight: 1.7,
    }}
  >
    Create professional YouTube thumbnails with
    layers, drag & drop, custom fonts and
    advanced editing tools.
  </p>

  <a
    href="/thumbnail-creator"
    style={{
      display: "inline-block",
      background: "#fff",
      color: "#000000",
      padding: "14px 24px",
      borderRadius: "12px",
      textDecoration: "none",
      fontWeight: 700,
    }}
  >
    Open Thumbnail Creator →
  </a>
</section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
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
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "24px",
                backgroundColor: "#ffffff",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.06)",
                transition: "all 0.2s ease",
                height: "100%",
              }}
            >
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#0F172A",
                  marginBottom: "12px",
                }}
              >
                {tool.title}
              </h2>

              <p
                style={{
                  color: "#475569",
                  lineHeight: "1.7",
                  fontSize: "16px",
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
          marginTop: "90px",
          lineHeight: "1.9",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(30px, 4vw, 40px)",
            color: "#0F172A",
            fontWeight: 700,
            marginBottom: "24px",
          }}
        >
          Free Online Image Conversion Tools
        </h2>

        <p
          style={{
            color: "#334155",
            fontSize: "18px",
          }}
        >
          Pixores provides free online tools to convert
          images between JPG, PNG, WebP, HEIC and PDF
          formats. You can also compress images, resize
          photos and generate complete favicon packages
          for websites.
        </p>

        <p
          style={{
            color: "#334155",
            fontSize: "18px",
          }}
        >
          All file processing is performed automatically
          to deliver the best possible quality while
          keeping files optimized and lightweight.
        </p>

        <p
          style={{
            color: "#334155",
            fontSize: "18px",
          }}
        >
          Our mission is to provide simple, fast and
          free tools for content creators, developers,
          designers, marketers and businesses around
          the world.
        </p>
      </section>
    </main>
  );
}