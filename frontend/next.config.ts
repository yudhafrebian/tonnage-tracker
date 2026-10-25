import type { NextConfig } from "next";

// Alamat backend Express. Lokal: localhost:4000. Production: URL Render, diisi lewat
// environment variable API_URL di Vercel (dibaca saat build).
const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Browser hanya bicara ke domain frontend; /api/* diteruskan ke backend.
  // proxy.ts tidak menyentuh /api (lihat matcher-nya).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
