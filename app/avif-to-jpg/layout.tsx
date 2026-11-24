import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "AVIF to JPG Converter — Free Online | Pixores",
  description: "Convert a static AVIF image to JPG online. Transparent areas become white. Upload one image and download your converted JPG file.",
  path: "/avif-to-jpg",
  keywords: ["avif to jpg", "convert avif to jpg", "avif jpg converter"],
});

export default function AvifToJpgLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
