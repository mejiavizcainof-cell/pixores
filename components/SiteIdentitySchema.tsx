import { SITE_URL } from "@/lib/seo";

const siteIdentity = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Pixores",
      url: `${SITE_URL}/`,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
        width: 1024,
        height: 1024,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: "Pixores",
      description:
        "Free online tools to create, edit, convert, compress, resize, and optimize images.",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      inLanguage: ["en", "es"],
    },
  ],
};

export default function SiteIdentitySchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(siteIdentity).replace(/</g, "\\u003c"),
      }}
    />
  );
}
