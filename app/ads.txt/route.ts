const publisherId = process.env.GOOGLE_ADSENSE_PUBLISHER_ID?.trim();

export function GET() {
  if (!publisherId?.startsWith("pub-")) {
    return new Response("AdSense publisher ID has not been configured.\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
