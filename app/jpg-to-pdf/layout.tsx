import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Convert JPG Images to PDF Online",
  description:
    "Combine JPG images into a PDF online for free. Arrange your images and download one convenient PDF document.",
  path: "/jpg-to-pdf",
  keywords: ["jpg to pdf", "convert jpg to pdf", "images to pdf"],
});

export default function JpgToPdfLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
