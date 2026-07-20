import "server-only";

/**
 * DEMO MODE runs while Supabase keys are absent so the whole site can be
 * exercised before credentials arrive. Adding real keys to .env.local flips
 * every repository function to Supabase — no code changes.
 */
export function isDemo(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}
