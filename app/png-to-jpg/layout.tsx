import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Convert PNG to JPG Online",
  description:
    "Convert PNG images to compact JPG files online for free. Choose a background and download a high-quality JPG in seconds.",
  path: "/png-to-jpg",
  keywords: ["png to jpg", "convert png to jpg", "png jpg converter"],
});

export default function PngToJpgLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
