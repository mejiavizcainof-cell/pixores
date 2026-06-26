import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import ThumbnailEditorV2 from "@/components/ThumbnailEditorV2";
import PixoreStudioSeo from "@/components/PixoreStudioSeo";
import PixoreStudioSchema from "@/components/PixoreStudioSchema";

export const metadata: Metadata = {
  title: "Free YouTube Thumbnail Maker",
  description:
    "Create professional YouTube thumbnails online for free with Pixores Thumbnail Maker. Use layers, custom fonts, templates, backgrounds and PNG export.",
  alternates: { canonical: "https://www.pixores.com/youtube-thumbnail-maker" },
  keywords: [
    "youtube thumbnail maker",
    "free youtube thumbnail maker",
    "online thumbnail maker",
    "thumbnail creator",
    "thumbnail editor",
    "youtube thumbnail generator",
    "Pixores Thumbnail Maker",
  ],
};

type YouTubeThumbnailMakerPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function YouTubeThumbnailMakerPage({ searchParams }: YouTubeThumbnailMakerPageProps) {
  const values = await searchParams;
  const isDesktopMode = values.desktop === "1";

  return (
    <>
      <PixoreStudioSchema />

      {!isDesktopMode && (
        <section
          style={{
            maxWidth: "1180px",
            margin: "18px auto 0",
            padding: "0 18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              flexWrap: "wrap",
              border: "1px solid #BFDBFE",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #EFF6FF, #FFFFFF)",
              padding: "14px 16px",
              boxShadow: "0 14px 35px rgba(37, 99, 235, 0.08)",
            }}
          >
            <div>
              <strong style={{ display: "block", color: "#0F172A", fontSize: "16px" }}>
                Download Pixores Thumbnail Maker for PC
              </strong>
              <span style={{ color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
                Use the same editor in a Windows desktop app with native file dialogs and local autosave.
              </span>
            </div>
            <Link
              href="/desktop"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "12px",
                background: "#2563EB",
                color: "#FFFFFF",
                fontWeight: 900,
                padding: "11px 15px",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Download PC App
            </Link>
          </div>
        </section>
      )}

      <Suspense fallback={<div>Loading Pixores Thumbnail Maker...</div>}>
        <ThumbnailEditorV2 />
      </Suspense>

      {!isDesktopMode && <PixoreStudioSeo />}
    </>
  );
}
