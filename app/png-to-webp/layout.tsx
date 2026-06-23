import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Convert PNG to WebP Online",
  description:
    "Convert PNG images to modern WebP files online for free. Create smaller web-ready images with a fast browser workflow.",
  path: "/png-to-webp",
  keywords: ["png to webp", "convert png to webp", "png webp converter"],
});

export default function PngToWebpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
