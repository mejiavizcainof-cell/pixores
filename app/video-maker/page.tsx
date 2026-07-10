import type { Metadata } from "next";
import Link from "next/link";
import VideoMaker from "@/components/VideoMaker";

export const metadata: Metadata = {
  title: "Free Video Maker",
  description:
    "Create and edit videos online with Pixores Video Maker. Use a timeline, transitions, media analysis, social formats, and desktop beta export.",
  alternates: { canonical: "https://www.pixores.com/video-maker" },
  keywords: [
    "video maker",
    "free video maker",
    "social video maker",
    "online video editor",
    "youtube video maker",
    "short video maker",
    "Pixores Video Maker",
  ],
};

type VideoMakerPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VideoMakerPage({ searchParams }: VideoMakerPageProps) {
  const values = await searchParams;
  const isDesktopMode = values.desktop === "1";

  return (
    <>
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
                Download Pixores Video Maker beta for PC
              </strong>
              <span style={{ color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
                Use the desktop beta with local render, native project files, FFprobe media analysis, and Windows file dialogs.
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
              Download Desktop Beta
            </Link>
          </div>
        </section>
      )}

      <VideoMaker />
    </>
  );
}
