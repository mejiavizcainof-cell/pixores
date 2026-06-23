import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Convert WebP to JPG Online",
  description:
    "Convert WebP images to widely supported JPG files online for free. Download a high-quality JPG without installing software.",
  path: "/webp-to-jpg",
  keywords: ["webp to jpg", "convert webp to jpg", "webp jpg converter"],
});

export default function WebpToJpgLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
