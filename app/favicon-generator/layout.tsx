import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Free Favicon Generator",
  description:
    "Generate favicon files for your website from one image. Download standard browser, Apple and Android icon sizes in one package.",
  path: "/favicon-generator",
  keywords: ["favicon generator", "create favicon", "website icon generator"],
});

export default function FaviconGeneratorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
