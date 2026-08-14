import type { NextConfig } from "next";
import { blogRedirectMap } from "./lib/blogRedirects";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "127.0.0.1:3000", "localhost", "localhost:3000"],
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer", "remotion", "esbuild"],
  async redirects() {
    return Object.entries(blogRedirectMap).map(([source, destination]) => ({
      source: `/blog/${source}`,
      destination: `/blog/${destination}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
