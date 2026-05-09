import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Critical for Docker deployment and memory optimization
  serverExternalPackages: ['@notionhq/client'],
};

export default nextConfig;
