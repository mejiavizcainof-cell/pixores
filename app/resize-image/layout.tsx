import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Resize Images Online for Free",
  description:
    "Resize JPG, PNG and WebP images online with exact width and height controls. Download a high-quality resized image for free.",
  path: "/resize-image",
  keywords: ["resize image", "image resizer", "change image dimensions"],
});

export default function ResizeImageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
