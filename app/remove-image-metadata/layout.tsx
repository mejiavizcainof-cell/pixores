import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Remove Photo Metadata Online — Pixores",
  description: "Remove embedded metadata from JPG, PNG or WebP images. Pixores creates a new copy in the same format after server-side re-encoding.",
  path: "/remove-image-metadata",
  keywords: ["remove photo metadata", "remove EXIF data", "strip image metadata"],
});

export default function RemoveImageMetadataLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
