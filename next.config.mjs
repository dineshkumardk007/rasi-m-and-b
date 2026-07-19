// Validate environment variables at build time so misconfiguration fails loudly
// before deploy, not silently at runtime. Set SKIP_ENV_VALIDATION=1 only for
// CI scaffolding checks (e.g. lint-only jobs) — never on Vercel.
import "./src/env.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        // Supabase Storage public bucket (product images)
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
