/**
 * Type surface for src/env.mjs (kept as .mjs so next.config.mjs can import it
 * without transpilation). Update BOTH files when adding a variable.
 */
declare module "@/env.mjs" {
  export const env: {
    // Server (required)
    SUPABASE_SERVICE_ROLE_KEY: string;
    // Server (Phase 2+)
    RAZORPAY_KEY_ID?: string;
    RAZORPAY_KEY_SECRET?: string;
    RAZORPAY_WEBHOOK_SECRET?: string;
    // Server (Phase 4)
    N8N_WEBHOOK_URL?: string;
    N8N_WEBHOOK_SECRET?: string;
    // Client (required)
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    NEXT_PUBLIC_SITE_URL: string;
    // Client (optional)
    NEXT_PUBLIC_RAZORPAY_KEY_ID?: string;
    NEXT_PUBLIC_GA4_MEASUREMENT_ID?: string;
    NEXT_PUBLIC_META_PIXEL_ID?: string;
  };
}
