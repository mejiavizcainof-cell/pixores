import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Batch Image Resizer — Resize Multiple Images | Pixores",
  description: "Resize up to 10 JPG, PNG or WebP images to exact dimensions and download the JPG results in one ZIP. Free batch image resizer by Pixores.",
  path: "/resize-images",
  keywords: ["batch image resizer", "resize multiple images", "bulk resize images"],
});

export default function ResizeImagesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
