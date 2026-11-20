import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Free QR Code Generator — Download PNG | Pixores",
  description: "Create a free static QR code from a website URL or text. Preview it and download a PNG. QR content is generated in your browser.",
  path: "/qr-code-generator",
  keywords: ["QR code generator", "create QR code", "free QR code PNG"],
});

export default function QrCodeGeneratorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
