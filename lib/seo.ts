import type { Metadata } from "next";

export const SITE_URL = "https://www.pixores.com";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}`;
  keywords?: string[];
  index?: boolean;
};

export function createPageMetadata({
  title,
  description,
  path,
  keywords,
  index = true,
}: PageMetadataOptions): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title,
    description,
    keywords,
    robots: {
      index,
      follow: true,
      googleBot: { index, follow: true },
    },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: `${title} - Pixores`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/og-image.png`],
    },
  };
}
