import type { Metadata } from "next";
import ToolsExplorer from "@/components/ToolsExplorer";

export const metadata: Metadata = {
  title: "Free Online Image Tools",
  description: "Explore Pixores tools for image editing, AI background removal, upscaling, conversion, compression, watermarks, templates, and thumbnails.",
  alternates: { canonical: "https://www.pixores.com/tools" },
};

export default function ToolsPage() {
  return <ToolsExplorer />;
}
