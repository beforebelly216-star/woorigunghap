import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/compatibility/one-to-one",
          destination: "/api/compatibility/one-to-one-resilient",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
