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

const localRuntimeTraceExcludes = [
  "./.runtime-data/**/*",
  "./release*/**/*",
];

const uploadTraceExcludes = [
  ...localRuntimeTraceExcludes,
  "./.tmp-*/**/*",
  "./output/**/*",
  "./public/**/*",
  "./tmp-*/**/*",
];

// These modules power local and desktop rendering. Vercel returns 501 from
// the render routes unless PIXORES_ENABLE_SERVER_RENDER is explicitly set,
// so shipping hundreds of megabytes of Remotion binaries and public media in
// those serverless functions is both unnecessary and over the platform limit.
const localRenderTraceExcludes = [
  ...localRuntimeTraceExcludes,
  "./public/**/*",
  "./node_modules/@esbuild/**/*",
  "./node_modules/@remotion/**/*",
  "./node_modules/@rspack/**/*",
  "./node_modules/esbuild/**/*",
  "./node_modules/ffmpeg-static/**/*",
  "./node_modules/remotion/**/*",
  "./node_modules/typescript/**/*",
  "./node_modules/webpack/**/*",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "127.0.0.1:3000", "localhost", "localhost:3000"],
  outputFileTracingExcludes: {
    "/*": localRuntimeTraceExcludes,
    "/api/render-video": localRenderTraceExcludes,
    "/api/render-video/*": localRenderTraceExcludes,
    "/api/video-maker/upload-asset": uploadTraceExcludes,
  },
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
