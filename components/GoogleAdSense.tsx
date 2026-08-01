import Script from "next/script";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT?.trim();
const adsEnabled = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ENABLED === "true";

export default function GoogleAdSense() {
  if (!adsEnabled || !clientId?.startsWith("ca-pub-")) return null;

  return (
    <Script
      id="google-adsense"
      async
      strategy="lazyOnload"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`}
    />
  );
}
