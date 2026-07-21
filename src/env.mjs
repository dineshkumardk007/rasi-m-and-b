import { z } from "zod";

/**
 * Environment validation — fails loudly, at build time and at import time.
 *
 * Phase 0 requires only Supabase. Keys for later phases (Razorpay, n8n,
 * WhatsApp, analytics) are declared optional here and MUST be flipped to
 * required in the phase that ships the feature (see comments), so a deploy
 * can never silently run without them.
 *
 * SKIP_ENV_VALIDATION=1 is for scaffold-only CI checks. Never set it on Vercel.
 */

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required (Supabase dashboard → Settings → API)"),

  // ---- Phase 2: make these required when checkout ships ----
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // ---- Phase 4: make these required when automation ships ----
  N8N_WEBHOOK_URL: z.string().url().optional(),
  N8N_WEBHOOK_SECRET: z.string().optional(),

  // ---- Admin login: optional here so a keyless demo still boots, but /admin
  // refuses every login unless all three are present (see lib/admin-session).
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ADMIN_SESSION_SECRET: z
    .string()
    .min(32, "ADMIN_SESSION_SECRET must be 32+ characters (pnpm admin:password --secret)")
    .optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a URL like https://xyz.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required (Supabase dashboard → Settings → API)"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  // ---- Phase 2/analytics: optional until wired ----
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional(),
});

const isServer = typeof window === "undefined";
// DEMO MODE: with no Supabase URL configured at all, the site runs on the
// in-memory demo store — valid keyless state, so validation is skipped.
// A PARTIAL config (URL set but keys missing) still fails loudly below.
// SKIP_ENV_VALIDATION is inlined into the client bundle at build time.
const demoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;
const skip = process.env.SKIP_ENV_VALIDATION === "1" || demoMode;

/** @type {z.infer<typeof serverSchema> & z.infer<typeof clientSchema>} */
let env = /** @type {never} */ (process.env);

if (!skip) {
  const parsed = isServer
    ? serverSchema.merge(clientSchema).safeParse(process.env)
    : clientSchema.safeParse({
        // NEXT_PUBLIC_ vars are inlined at build; list them explicitly for the client bundle.
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        NEXT_PUBLIC_GA4_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
        NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
      });

  if (!parsed.success) {
    console.error(
      "\n❌ Invalid or missing environment variables:\n" +
        parsed.error.issues.map((i) => `   • ${i.path.join(".")}: ${i.message}`).join("\n") +
        "\n\n   Copy .env.example to .env.local and fill in the values.\n",
    );
    throw new Error("Environment validation failed — see errors above.");
  }
  env = parsed.data;
}

export { env };
