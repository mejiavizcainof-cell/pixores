import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Convert WebP to PNG Online",
  description:
    "Convert WebP images to PNG online for free. Preserve transparency and download a lossless PNG file in seconds.",
  path: "/webp-to-png",
  keywords: ["webp to png", "convert webp to png", "webp png converter"],
});

export default function WebpToPngLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
