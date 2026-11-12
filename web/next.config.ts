import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Owner photos are served from Neon Object Storage (public_read bucket "listing-photos"); next/image
  // resizes them per device. Only that bucket path on Neon storage hosts is allowed.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.aws.neon.tech", pathname: "/listing-photos/**" }],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
