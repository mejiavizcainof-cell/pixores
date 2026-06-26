import type { Metadata } from "next";
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

      <Suspense fallback={<div>Loading Pixores Thumbnail Maker...</div>}>
        <ThumbnailEditorV2 />
      </Suspense>

      {!isDesktopMode && <PixoreStudioSeo />}
    </>
  );
}
