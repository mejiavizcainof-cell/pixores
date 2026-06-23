import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Convert JPG to WebP Online",
  description:
    "Convert JPG images to efficient WebP files online for free. Reduce file size while keeping useful image quality.",
  path: "/jpg-to-webp",
  keywords: ["jpg to webp", "convert jpg to webp", "jpg webp converter"],
});

export default function JpgToWebpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
