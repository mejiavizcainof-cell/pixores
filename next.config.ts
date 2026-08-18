import type { NextConfig } from "next";

// Keep the runtime config self-contained. The packaged Next.js server transpiles
// this file with plain Node.js, where imports from application source are not
// resolved reliably inside Electron resources.
const packagedBlogRedirectMap: Record<string, string> = {
  "best-youtube-thumbnail-size": "how-to-create-youtube-thumbnail",
  "create-youtube-thumbnail-free": "how-to-create-youtube-thumbnail",
  "what-makes-thumbnail-go-viral": "how-to-create-youtube-thumbnail",
  "canva-vs-pixores": "how-to-create-youtube-thumbnail",
  "remove-image-background-free": "make-transparent-background-png",
  "improve-image-quality-online": "increase-image-resolution-ai",
  "reduce-image-size-without-losing-quality": "compress-images-for-website-seo",
};

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "127.0.0.1:3000", "localhost", "localhost:3000"],
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer", "remotion", "esbuild"],
  async redirects() {
    return Object.entries(packagedBlogRedirectMap).map(([source, destination]) => ({
      source: `/blog/${source}`,
      destination: `/blog/${destination}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
