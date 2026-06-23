import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Compress Images Online for Free",
  description:
    "Compress JPG, PNG and WebP images online for free. Reduce image file size while preserving useful visual quality.",
  path: "/compress-image",
  keywords: ["compress image", "image compressor", "reduce image file size"],
});

export default function CompressImageLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
