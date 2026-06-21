import type { Metadata } from "next";
import ImageCropTool from "@/components/ImageCropTool";

export const metadata: Metadata = {
  title: "Crop Image Online - Free Photo Cropper",
  description: "Crop JPG, PNG and WebP images online with exact pixel controls, common aspect ratios and full-resolution downloads.",
  alternates: { canonical: "https://www.pixores.com/crop-image" },
  openGraph: {
    title: "Crop Image Online | Pixores",
    description: "Crop images precisely and download the result at full resolution.",
    url: "https://www.pixores.com/crop-image",
    type: "website",
  },
};

export default function CropImagePage() {
  return <ImageCropTool />;
}
