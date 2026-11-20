import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Image Resizer — Resize Images Online Free | Pixores",
  description:
    "Free image resizer to resize JPG, PNG and WebP images online by exact width and height. No sign-up, no watermark. Download your resized image in seconds.",
  path: "/resize-image",
  keywords: ["resize image", "image resizer", "change image dimensions"],
});

export default function ResizeImageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
