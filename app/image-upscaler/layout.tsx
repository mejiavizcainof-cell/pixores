import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Image Upscaler - Increase Image Resolution",
  description: "Upscale images by 2x or 4x, increase image resolution, and download sharper high-quality results with the Pixores AI Image Upscaler.",
  keywords: ["image upscaler", "AI image upscaler", "increase image resolution", "upscale image"],
  alternates: { canonical: "https://www.pixores.com/image-upscaler" },
};

export default function ImageUpscalerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
