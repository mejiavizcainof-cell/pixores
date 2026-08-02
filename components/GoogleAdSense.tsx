import {
  googleAdSenseClientId,
  googleAdSenseEnabled,
} from "@/lib/adsense";

export default function GoogleAdSense() {
  if (!googleAdSenseEnabled || !googleAdSenseClientId) return null;

  return (
    <script
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(googleAdSenseClientId)}`}
    />
  );
}
