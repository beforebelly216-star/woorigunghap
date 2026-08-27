import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/compatibility/one-to-one",
        destination: "/api/compatibility/one-to-one-resilient",
      },
    ];
  },
};

export default nextConfig;
