import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/lib/blogPosts";

export const metadata: Metadata = {
  title: "Pixores - Free Online Image & File Tools",
  description:
    "Convert, compress and optimize images online. JPG, PNG, WebP, HEIC, PDF and thumbnail tools for free.",
  alternates: {
    canonical: "https://www.pixores.com",
  },
};

export default function Home() {
  const tools = [
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

  return (
    <main style={{ background: "#F8FAFC" }}>
      <section
        style={{
          textAlign: "center",
          padding: "80px 20px 60px",
          background:
            "linear-gradient(180deg, #EEF2FF 0%, #F8FAFC 100%)",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(42px, 7vw, 76px)",
            fontWeight: 900,
            color: "#0F172A",
            lineHeight: 1.05,
            marginBottom: "22px",
          }}
        >
          Free Online Image Tools
        </h1>

        <p
          style={{
            fontSize: "clamp(18px, 3vw, 24px)",
            color: "#475569",
            maxWidth: "850px",
            margin: "0 auto 32px",
            lineHeight: 1.7,
          }}
        >
          Convert, compress, resize, optimize and create professional
          thumbnails directly in your browser.
        </p>

        <Link
          href="/thumbnail-creator"
          style={{
            display: "inline-block",
            background: "#2563EB",
            color: "#fff",
            padding: "16px 28px",
            borderRadius: "14px",
            textDecoration: "none",
            fontWeight: 800,
            boxShadow: "0 12px 24px rgba(37,99,235,0.25)",
          }}
        >
          Try Thumbnail Creator →
        </Link>
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
          margin: "30px auto",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg,#2563EB,#7C3AED)",
            color: "#fff",
            padding: "48px",
            borderRadius: "28px",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "42px", marginTop: 0 }}>
            🎨 Thumbnail Creator Pro
          </h2>

          <p
            style={{
              fontSize: "20px",
              maxWidth: "780px",
              margin: "0 auto 26px",
              lineHeight: 1.7,
            }}
          >
            Create professional YouTube thumbnails with layers, drag & drop,
            custom fonts and fast editing tools.
          </p>

          <Link
            href="/thumbnail-creator"
            style={{
              display: "inline-block",
              background: "#fff",
              color: "#111827",
              padding: "14px 24px",
              borderRadius: "12px",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Open Thumbnail Creator →
          </Link>
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
