import type { Metadata } from "next";
import Link from "next/link";

import { blogPosts } from "@/lib/blogPosts";

export const metadata: Metadata = {
  title: "Pixores Blog",
  description:
    "Guides and tips for image conversion, YouTube thumbnails, compression, resizing, and online image tools.",
};

export default function BlogPage() {
  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "48px 20px",
      }}
    >
      <section style={{ marginBottom: "36px" }}>
        <h1
          style={{
            color: "#0F172A",
            fontSize: "44px",
            lineHeight: 1.1,
            marginBottom: "12px",
          }}
        >
          Pixores Blog
        </h1>

        <p
          style={{
            color: "#475569",
            fontSize: "18px",
            lineHeight: 1.7,
            maxWidth: "720px",
          }}
        >
          Practical guides for creators who work with images, thumbnails, and
          online file tools.
        </p>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            style={{
              color: "inherit",
              textDecoration: "none",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              background: "#FFFFFF",
              padding: "22px",
            }}
          >
            <p
              style={{
                color: "#64748B",
                fontSize: "13px",
                margin: "0 0 10px",
              }}
            >
              {post.date}
            </p>

            <h2
              style={{
                color: "#0F172A",
                fontSize: "24px",
                margin: "0 0 12px",
              }}
            >
              {post.title}
            </h2>

            <p style={{ color: "#475569", lineHeight: 1.7, margin: 0 }}>
              {post.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
