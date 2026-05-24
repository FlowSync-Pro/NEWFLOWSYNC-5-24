import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Canonicalize www → apex for SEO (single canonical host).
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.flowsyncdriver.com" }],
        destination: "https://flowsyncdriver.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
