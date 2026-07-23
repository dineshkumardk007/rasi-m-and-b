// Validate environment variables at build time so misconfiguration fails loudly
// before deploy, not silently at runtime. Set SKIP_ENV_VALIDATION=1 only for
// CI scaffolding checks (e.g. lint-only jobs) — never on Vercel.
import "./src/env.mjs";

const isDev = process.env.NODE_ENV === "development";

/**
 * Origins the storefront legitimately talks to. Kept in one place so the CSP
 * below and any future review have a single list to check.
 */
const SUPABASE_ORIGIN = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "https://*.supabase.co";
  try {
    return new URL(url).origin;
  } catch {
    return "https://*.supabase.co";
  }
})();

const RAZORPAY = ["https://checkout.razorpay.com", "https://api.razorpay.com", "https://lumberjack.razorpay.com"];
const META = ["https://connect.facebook.net", "https://www.facebook.com"];
const GA = ["https://www.googletagmanager.com", "https://www.google-analytics.com", "https://region1.google-analytics.com"];

/**
 * Full policy, shipped Report-Only for now.
 *
 * Enforcing this needs a production run with real Razorpay and analytics keys
 * behind it: Razorpay's checkout injects further scripts and frames of its own,
 * and a CSP that blocks one of them fails the payment silently. Report-Only
 * gathers the violations without breaking a single order. Flip the header name
 * to `Content-Security-Policy` once the report endpoint has been quiet through
 * a few real payments — see README, "Security headers".
 *
 * 'unsafe-inline' is present because Next hydration data, the JSON-LD blocks
 * and the Meta Pixel bootstrap are all inline. Tightening that to nonces means
 * threading a per-request nonce through middleware, which is a separate change.
 */
const reportOnlyCsp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${[...RAZORPAY, ...META, ...GA].join(" ")}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN} https://www.facebook.com https://www.google-analytics.com`,
  `font-src 'self' data:`,
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_ORIGIN.replace("https://", "wss://")} ${[...RAZORPAY, ...META, ...GA].join(" ")}`,
  `frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `object-src 'none'`,
].join("; ");

/**
 * Enforced from the start. Every directive here is one the storefront provably
 * does not need: the site is never framed, never loads a plugin, and never
 * rewrites its own <base>. Clickjacking on /admin — where a hidden frame over
 * a real session can drive stock and price edits — is what this closes.
 */
const enforcedCsp = [`frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // stop advertising the framework version
  allowedDevOrigins: ["localhost:3000", "192.168.29.197:3000", "192.168.29.197", "localhost"],
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: enforcedCsp },
          { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp },
          // Belt and braces with frame-ancestors: still honoured by older browsers.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            // `payment` is delegated rather than denied: Razorpay's checkout
            // iframe uses the Payment Request API for the Google Pay and UPI
            // intent flows, and a blanket payment=() silently kills them.
            key: "Permissions-Policy",
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")',
          },
          // 2 years, the minimum for preload eligibility. Vercel serves HTTPS
          // only, so there is no plain-HTTP deploy for this to lock anyone out of.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // The admin panel must never be cached by a shared proxy or the browser
        // — a back-button replay after logout would otherwise show stock and
        // customer data to whoever is next on the device.
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
