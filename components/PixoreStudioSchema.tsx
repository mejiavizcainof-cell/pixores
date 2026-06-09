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
            "Pixore Studio V2",

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