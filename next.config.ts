import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  redirects() {
    return [
      { source: "/collab/:path*", destination: "/studio/collab/:path*", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "src/app/globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
