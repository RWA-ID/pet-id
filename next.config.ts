import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@pinata/sdk", "handlebars"],
  },
};

export default nextConfig;

// Cloudflare Pages via @cloudflare/next-on-pages
// Build command: npx @cloudflare/next-on-pages
// Output dir:   .vercel/output/static
