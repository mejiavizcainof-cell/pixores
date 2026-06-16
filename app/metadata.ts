import type { Metadata } from "next";

export const siteMetadata: Metadata = {
  metadataBase: new URL("https://pixores.com"),

  alternates: {
    canonical: "https://pixores.com",
  },

  title: {
    default: "Pixores - Free Online Image & File Tools",
    template: "%s | Pixores",
  },

  description:
    "Convert, compress, resize, optimize and edit images online for free. Create YouTube thumbnails, convert JPG, PNG, WebP, HEIC, PDF files and generate favicons.",

  keywords: [
    "image converter",
    "free image tools",
    "online image converter",
    "image compressor",
    "image resizer",
    "youtube thumbnail maker",
    "thumbnail creator",
    "youtube thumbnail creator",
    "create youtube thumbnail",
    "jpg to png",
    "png to jpg",
    "webp to jpg",
    "jpg to webp",
    "png to webp",
    "webp to png",
    "heic to jpg",
    "jpg to pdf",
    "favicon generator",
    "image optimization",
    "pixores",
  ],

  authors: [
    {
      name: "Pixores",
      url: "https://pixores.com",
    },
  ],

  creator: "Pixores",
  publisher: "Pixores",
  category: "Technology",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    title: "Pixores - Free Online Image & File Tools",
    description:
      "Free online image tools to convert, compress, resize, optimize and create professional YouTube thumbnails.",
    url: "https://pixores.com",
    siteName: "Pixores",
    images: [
      {
        url: "https://pixores.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pixores - Free Online Image Tools",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Pixores - Free Online Image & File Tools",
    description:
      "Convert, compress, resize, optimize and create YouTube thumbnails online for free.",
    images: ["https://pixores.com/og-image.png"],
  },

  icons: {
    icon: [
      {
        url: "/favicon.ico",
      },
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
  },

  manifest: "/site.webmanifest",
};