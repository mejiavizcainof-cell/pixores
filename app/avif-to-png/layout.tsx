import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "AVIF to PNG Converter — Free Online | Pixores",
  description: "Convert a static AVIF image to PNG online and preserve transparency. Upload one image and download your converted PNG file.",
  path: "/avif-to-png",
  keywords: ["avif to png", "convert avif to png", "avif png converter"],
});

export default function AvifToPngLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
