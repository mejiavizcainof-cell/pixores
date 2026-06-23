export default function PixoreStudioSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context":
            "https://schema.org",

          "@type":
            "SoftwareApplication",

          name:
            "Pixores Thumbnail Maker",

          url:
            "https://www.pixores.com/youtube-thumbnail-maker",

          applicationCategory:
            "DesignApplication",

          operatingSystem:
            "Web Browser",

          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        }),
      }}
    />
  );
}
