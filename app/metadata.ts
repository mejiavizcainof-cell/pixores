import type { Metadata } from "next";

export const siteMetadata: Metadata = {
  metadataBase: new URL("https://www.pixores.com"),
  applicationName: "Pixores",

  title: {
    default: "Pixores - Thumbnail Maker, Video Editors & Image Tools",
    template: "%s | Pixores",
  },

  description:
    "Create thumbnails, edit videos online or on Windows, and convert, compress, resize and optimize images with Pixores creator tools.",

  keywords: [
    "image converter",
    "free image tools",
    "online image converter",
    "image compressor",
    "image resizer",
    "youtube thumbnail maker",
    "online video maker",
    "video editor for windows",
    "free video editor",
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
      url: "https://www.pixores.com",
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
    title: "Pixores - Thumbnail Maker, Video Editors & Image Tools",
    description:
      "Create thumbnails, edit quick videos online, download Video Maker Pro for Windows, and use practical image tools.",
    url: "https://www.pixores.com",
    siteName: "Pixores",
    images: [
      {
          url: "https://www.pixores.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pixores creator tools for images, thumbnails and video",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Pixores - Thumbnail Maker, Video Editors & Image Tools",
    description:
      "Create thumbnails, edit videos online or on Windows, and use practical image tools.",
    images: ["https://www.pixores.com/og-image.png"],
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
