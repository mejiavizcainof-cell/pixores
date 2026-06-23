import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Convert HEIC to JPG Online",
  description:
    "Convert iPhone HEIC photos to compatible JPG images online for free. Process your photo and download a high-quality JPG.",
  path: "/heic-to-jpg",
  keywords: ["heic to jpg", "convert heic to jpg", "iphone photo converter"],
});

export default function HeicToJpgLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
