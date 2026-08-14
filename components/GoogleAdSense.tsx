"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  googleAdSenseClientId,
  googleAdSenseEnabled,
} from "@/lib/adsense";
import { publicBlogSlugs } from "@/lib/publicBlogSlugs";

const monetizablePages = new Set([
  "/",
  "/about",
  "/faq",
  "/tools",
  "/jpg-to-png",
  "/png-to-jpg",
  "/jpg-to-webp",
  "/png-to-webp",
  "/webp-to-jpg",
  "/webp-to-png",
  "/heic-to-jpg",
  "/jpg-to-pdf",
  "/compress-image",
  "/resize-image",
  "/rotate-image",
  "/favicon-generator",
  "/crop-image",
  "/watermark-image",
  "/remove-background",
  "/image-upscaler",
]);

function isMonetizablePath(pathname: string) {
  if (monetizablePages.has(pathname) || pathname === "/blog") return true;
  if (!pathname.startsWith("/blog/")) return false;
  return publicBlogSlugs.has(pathname.slice("/blog/".length));
}

export default function GoogleAdSense() {
  const pathname = usePathname();

  if (
    !googleAdSenseEnabled ||
    !googleAdSenseClientId ||
    !isMonetizablePath(pathname)
  ) return null;

  return (
    <Script
      id="pixores-adsense"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(googleAdSenseClientId)}`}
    />
  );
}
