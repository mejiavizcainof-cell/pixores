import type { Metadata } from "next";
import { Suspense } from "react";

import ThumbnailEditorV2 from "@/components/ThumbnailEditorV2";
import PixoreStudioSeo from "@/components/PixoreStudioSeo";
import PixoreStudioSchema from "@/components/PixoreStudioSchema";

export const metadata: Metadata = {
  title: "Pixore Studio V2 | Free YouTube Thumbnail Maker",

  description:
    "Create professional YouTube thumbnails online with Pixore Studio V2. Drag and drop editor, layers, custom fonts and PNG export.",

  alternates: { canonical: "https://www.pixores.com/thumbnail-creator" },

  keywords: [
    "youtube thumbnail maker",
    "thumbnail creator",
    "free thumbnail maker",
    "thumbnail editor",
    "youtube thumbnail generator",
    "pixore studio",
    "pixore studio v2",
  ],
};

export default function Page() {
  return (
    <>
      <PixoreStudioSchema />

      <Suspense fallback={<div>Loading editor...</div>}>
        <ThumbnailEditorV2 />
      </Suspense>

      <PixoreStudioSeo />
    </>
  );
}
