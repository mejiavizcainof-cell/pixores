import { googleAdSensePublisherId } from "@/lib/adsense";

export function GET() {
  if (!googleAdSensePublisherId) {
    return new Response("AdSense publisher ID has not been configured.\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(`google.com, ${googleAdSensePublisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
