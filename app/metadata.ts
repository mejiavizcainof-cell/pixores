import type { Metadata } from "next";

export const siteMetadata: Metadata = {
  metadataBase: new URL("https://pixores.com"),

  title: {
    default: "Pixores - Free Online Image & File Tools",
    template: "%s | Pixores",
  },

  description:
    "Convert, compress, resize and optimize images online for free. JPG, PNG, WebP, HEIC, PDF and favicon tools with fast and secure processing.",

  keywords: [
    "image converter",
    "jpg to png",
    "png to jpg",
    "webp to jpg",
    "jpg to webp",
    "png to webp",
    "webp to png",
    "heic to jpg",
    "jpg to pdf",
    "pdf to jpg",
    "favicon generator",
    "png to favicon",
    "jpg to favicon",
    "favicon.ico",
    "image compressor",
    "image resizer",
    "free image tools",
    "online image converter",
    "image optimization",
    "webp converter",
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

  alternates: {
    canonical: "https://pixores.com",
  },

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
      "Convert, compress, resize and optimize images online. JPG, PNG, WebP, HEIC, PDF and favicon tools available for free.",

    url: "https://pixores.com",

    siteName: "Pixores",

    images: [
      {
        url: "/og-image.png",
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
      "Convert, compress, resize and optimize images online for free.",

    images: ["/og-image.png"],

    creator: "@pixores",
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