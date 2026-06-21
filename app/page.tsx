import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/lib/blogPosts";

export const metadata: Metadata = {
  title: "Pixores Studio - Thumbnail Creator, Templates & Image Tools",
  description:
    "Create professional thumbnails with Pixores Studio, start from ready-made templates, and use fast online image tools.",
  alternates: {
    canonical: "https://www.pixores.com",
  },
};

export default function Home() {
  const tools = [
    { icon: "BG", title: "AI Background Remover", description: "Remove backgrounds and download a transparent PNG.", link: "/remove-background", color: "#DBEAFE" },
    { icon: "2x", title: "AI Image Upscaler", description: "Increase image resolution with AI enhancement.", link: "/image-upscaler", color: "#EDE9FE" },
    { icon: "CR", title: "Crop Image", description: "Crop photos with exact pixel controls and full-quality downloads.", link: "/crop-image", color: "#DBEAFE" },
    { icon: "WM", title: "Add Watermark", description: "Protect images with text or logo watermarks.", link: "/watermark-image", color: "#E0F2FE" },
    { icon: "↻", title: "Rotate & Flip Image", description: "Correct photo orientation or mirror an image.", link: "/rotate-image", color: "#E0F2FE" },
    { icon: "🖼️", title: "JPG → PNG", description: "Convert JPG images to PNG format.", link: "/jpg-to-png", color: "#EFF6FF" },
    { icon: "📷", title: "PNG → JPG", description: "Convert PNG images to JPG format.", link: "/png-to-jpg", color: "#FEF3C7" },
    { icon: "🌐", title: "WebP → JPG", description: "Convert WebP images to JPG format.", link: "/webp-to-jpg", color: "#DCFCE7" },
    { icon: "⚡", title: "JPG → WebP", description: "Convert JPG images to WebP format.", link: "/jpg-to-webp", color: "#FCE7F3" },
    { icon: "🚀", title: "PNG → WebP", description: "Convert PNG images to WebP format.", link: "/png-to-webp", color: "#EDE9FE" },
    { icon: "🔄", title: "WebP → PNG", description: "Convert WebP images to PNG format.", link: "/webp-to-png", color: "#E0F2FE" },
    { icon: "📱", title: "HEIC → JPG", description: "Convert iPhone HEIC images to JPG.", link: "/heic-to-jpg", color: "#FEE2E2" },
    { icon: "📄", title: "JPG → PDF", description: "Convert JPG images to PDF files.", link: "/jpg-to-pdf", color: "#F3E8FF" },
    { icon: "⭐", title: "Favicon Generator", description: "Generate favicon.ico and app icons.", link: "/favicon-generator", color: "#ECFDF5" },
    { icon: "🗜️", title: "Compress Image", description: "Reduce image file size while maintaining quality.", link: "/compress-image", color: "#FFF7ED" },
    { icon: "📐", title: "Resize Image", description: "Change image dimensions instantly.", link: "/resize-image", color: "#F0FDFA" },
    { icon: "🎨", title: "Thumbnail Creator Pro", description: "Create professional YouTube thumbnails online.", link: "/thumbnail-creator", color: "#EEF2FF" },
    { icon: "IG", title: "Instagram Reel Saver Guide", description: "Safe ways to save your own reels or permitted content.", link: "/instagram-reel-downloader", color: "#FCE7F3" },
  ];

  const benefits = [
    { title: "Free core tools", description: "Convert, resize, compress, and optimize images without a subscription." },
    { title: "No registration required", description: "Use standard image converters immediately. Sign in only for saved projects and AI tools." },
    { title: "Fast processing", description: "Complete everyday image tasks quickly from desktop or mobile." },
    { title: "Secure uploads", description: "Your files are used only to complete the image task you request." },
    { title: "Professional creator tools", description: "Build thumbnails, prepare graphics, and enhance images in one place." },
  ];

  return (
    <main style={{ background: "#F8FAFC" }}>
      <section
        style={{
          minHeight: "590px",
          padding: "72px 20px",
          display: "flex",
          alignItems: "center",
          backgroundImage:
            "linear-gradient(90deg, rgba(7, 15, 32, 0.94) 0%, rgba(7, 15, 32, 0.78) 42%, rgba(7, 15, 32, 0.18) 100%), url('/blog/create-youtube-thumbnail-free.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
          <p style={{ margin: "0 0 14px", color: "#93C5FD", fontSize: "14px", fontWeight: 850, textTransform: "uppercase" }}>
            Create with confidence
          </p>
          <h1
            style={{
              maxWidth: "660px",
              margin: "0 0 22px",
              color: "#FFFFFF",
              fontSize: "clamp(46px, 7vw, 78px)",
              fontWeight: 900,
              lineHeight: 1.02,
            }}
          >
            Pixores Studio
          </h1>

          <p
            style={{
              maxWidth: "620px",
              margin: "0 0 32px",
              color: "#E2E8F0",
              fontSize: "clamp(18px, 2.4vw, 23px)",
              lineHeight: 1.65,
            }}
          >
            Create professional thumbnails with flexible text, layers, backgrounds, frames, and reusable assets. Start from scratch or customize a ready-made template.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <Link
              href="/thumbnail-creator"
              style={{
                display: "inline-block",
                background: "#2563EB",
                color: "#FFFFFF",
                padding: "15px 24px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 850,
                boxShadow: "0 12px 24px rgba(37,99,235,0.28)",
              }}
            >
              Open Pixores Studio
            </Link>
            <Link
              href="/templates"
              style={{
                display: "inline-block",
                background: "#FFFFFF",
                color: "#0F172A",
                padding: "15px 24px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 850,
              }}
            >
              Browse Templates
            </Link>
          </div>
        </div>
      </section>

      <section
        style={{
          margin: "24px 0 54px",
          padding: "72px 20px",
          background: "#EEF6FF",
          borderTop: "1px solid #DBEAFE",
          borderBottom: "1px solid #DBEAFE",
        }}
      >
        <div
          style={{
            maxWidth: "1120px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: "clamp(36px, 7vw, 90px)",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 12px",
                color: "#2563EB",
                fontSize: "13px",
                fontWeight: 850,
                textTransform: "uppercase",
              }}
            >
              Made for everyday creators
            </p>
            <h2
              style={{
                margin: "0 0 20px",
                color: "#0F172A",
                fontSize: "clamp(34px, 5vw, 52px)",
                lineHeight: 1.08,
              }}
            >
              Why Pixores?
            </h2>
            <p
              style={{
                maxWidth: "480px",
                margin: 0,
                color: "#475569",
                fontSize: "18px",
                lineHeight: 1.75,
              }}
            >
              Simple image tools should feel quick, dependable, and easy to use. Pixores brings essential editing and creator workflows together without unnecessary complexity.
            </p>
          </div>

          <div>
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                style={{
                  padding: "18px 0",
                  display: "grid",
                  gridTemplateColumns: "34px 1fr",
                  gap: "14px",
                  borderBottom: "1px solid #BFDBFE",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "30px",
                    height: "30px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    background: "#2563EB",
                    color: "#FFFFFF",
                    fontSize: "16px",
                    fontWeight: 900,
                  }}
                >
                  ✓
                </span>
                <div>
                  <h3 style={{ margin: "0 0 5px", color: "#0F172A", fontSize: "18px" }}>
                    {benefit.title}
                  </h3>
                  <p style={{ margin: 0, color: "#64748B", lineHeight: 1.55 }}>
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
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
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "22px",
                  padding: "26px",
                  minHeight: "190px",
                  boxShadow: "0 8px 22px rgba(15,23,42,0.06)",
                }}
              >
                <div
                  style={{
                    width: "58px",
                    height: "58px",
                    borderRadius: "18px",
                    background: tool.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "30px",
                    marginBottom: "20px",
                  }}
                >
                  {tool.icon}
                </div>

                <h2
                  style={{
                    fontSize: "24px",
                    color: "#0F172A",
                    marginBottom: "10px",
                  }}
                >
                  {tool.title}
                </h2>

                <p
                  style={{
                    color: "#64748B",
                    fontSize: "16px",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {tool.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "70px 20px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2
            style={{
              fontSize: "clamp(30px, 4vw, 42px)",
              color: "#0F172A",
              fontWeight: 800,
              marginBottom: "12px",
            }}
          >
            Latest Image Editing Guides
          </h2>

          <p
            style={{
              color: "#64748B",
              fontSize: "18px",
              maxWidth: "760px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Learn how to create better thumbnails, optimize images and improve
            your visual content.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          {blogPosts.slice(0, 3).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <article
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "22px",
                  padding: "28px",
                  height: "100%",
                  boxShadow: "0 8px 22px rgba(15,23,42,0.06)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    background: "#EFF6FF",
                    color: "#2563EB",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 800,
                    marginBottom: "14px",
                  }}
                >
                  Guide
                </span>

                <h3
                  style={{
                    color: "#0F172A",
                    fontSize: "22px",
                    lineHeight: 1.3,
                    marginBottom: "12px",
                  }}
                >
                  {post.title}
                </h3>

                <p
                  style={{
                    color: "#64748B",
                    fontSize: "16px",
                    lineHeight: 1.7,
                  }}
                >
                  {post.description}
                </p>
              </article>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "36px" }}>
          <Link
            href="/blog"
            style={{
              display: "inline-block",
              background: "#2563EB",
              color: "#FFFFFF",
              padding: "14px 26px",
              borderRadius: "12px",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            View All Articles →
          </Link>
        </div>
      </section>
      
    </main>
    
  );
}
