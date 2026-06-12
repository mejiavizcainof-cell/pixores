import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { templates } from "@/lib/templates";

export const metadata: Metadata = {
  title: "Free Design Templates | Pixores",
  description:
    "Choose free templates for YouTube thumbnails, TikTok posts, Instagram posts, and creator designs.",
};

export default function TemplatesPage() {
  return (
    <main
      style={{
        maxWidth: "1180px",
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
          Free Templates
        </h1>

        <p
          style={{
            color: "#475569",
            fontSize: "18px",
            lineHeight: 1.7,
            maxWidth: "760px",
          }}
        >
          Start faster with free templates for YouTube thumbnails, TikTok
          content, Instagram posts, and creator designs.
        </p>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "22px",
        }}
      >
        {templates.map((template) => (
          <div
            key={template.id}
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              overflow: "hidden",
              background: "#FFFFFF",
            }}
          >
            <Image
              src={template.preview}
              alt={template.name}
              width={template.width}
              height={template.height}
              style={{
                width: "100%",
                height: "220px",
                objectFit: "cover",
                background: "#F1F5F9",
              }}
            />

            <div style={{ padding: "18px" }}>
              <p
                style={{
                  color: "#64748B",
                  fontSize: "13px",
                  margin: "0 0 8px",
                }}
              >
                {template.category}
              </p>

              <h2
                style={{
                  color: "#0F172A",
                  fontSize: "22px",
                  margin: "0 0 14px",
                }}
              >
                {template.name}
              </h2>

              <Link
                href={`/thumbnail-creator?template=${template.id}`}
                style={{
                  display: "inline-block",
                  background: "#2563EB",
                  color: "#FFFFFF",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Use Template
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}