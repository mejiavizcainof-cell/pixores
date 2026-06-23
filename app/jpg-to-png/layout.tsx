import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Convert JPG to PNG Online",
  description:
    "Convert JPG images to PNG online for free. Preserve image quality and download a compatible PNG file in seconds.",
  path: "/jpg-to-png",
  keywords: ["jpg to png", "convert jpg to png", "jpg png converter"],
});

export default function JpgToPngLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
