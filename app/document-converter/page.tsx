import type { Metadata } from "next";
import DocumentConverter from "@/components/DocumentConverter";
import ToolSeo from "@/components/ToolSeo";

export const metadata: Metadata = {
  title: "Word to PDF & PDF to Word Converter",
  description: "Convert DOCX to PDF and PDF to editable Word documents securely in your browser with Pixores.",
  alternates: { canonical: "https://www.pixores.com/document-converter" },
};

export default function DocumentConverterPage() {
  return (
    <main>
      <DocumentConverter />
      <ToolSeo
        tool="document-converter"
        title="How to Review a Word or PDF Conversion"
        description="Convert DOCX and text-based PDF files locally, then verify layout, fonts, tables, images, and page structure before relying on the downloaded document."
      />
    </main>
  );
}
