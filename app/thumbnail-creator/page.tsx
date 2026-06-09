import type { Metadata } from "next";

import ThumbnailEditorV2 from "@/components/ThumbnailEditorV2";
import PixoreStudioSeo from "@/components/PixoreStudioSeo";
import PixoreStudioSchema from "@/components/PixoreStudioSchema";

export const metadata: Metadata = {
  title:
    "Pixore Studio V2 | Free YouTube Thumbnail Maker",

  description:
    "Create professional YouTube thumbnails online with Pixore Studio V2. Drag and drop editor, layers, custom fonts and PNG export.",

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

      <ThumbnailEditorV2 />

      <PixoreStudioSeo />
    </>
  );
}