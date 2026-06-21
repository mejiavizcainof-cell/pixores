import type { Metadata } from "next";
import WatermarkTool from "@/components/WatermarkTool";

export const metadata: Metadata = {
  title: "Add Watermark to Images Online",
  description: "Add text or logo watermarks to JPG, PNG and WebP images. Process multiple photos and download high-quality results.",
  alternates: { canonical: "https://www.pixores.com/watermark-image" },
  openGraph: {
    title: "Add Watermark to Images | Pixores",
    description: "Protect photos with custom text or logo watermarks directly in your browser.",
    url: "https://www.pixores.com/watermark-image",
    type: "website",
  },
};

export default function WatermarkImagePage() {
  return <WatermarkTool />;
}
