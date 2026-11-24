import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Merge PDF Files Online — Free and Private | Pixores",
  description: "Combine PDF files in your browser, reorder them, and download one document. Up to 20 PDFs and 500 pages. Files stay on your device.",
  path: "/merge-pdf",
  keywords: ["merge PDF", "combine PDF files", "join PDF online"],
});

export default function MergePdfLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
