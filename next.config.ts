import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "127.0.0.1:3000", "localhost", "localhost:3000"],
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer", "remotion", "esbuild"],
};

export default nextConfig;
