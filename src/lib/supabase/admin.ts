import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env.mjs";

/**
 * Service-role client — BYPASSES RLS. Server-only (enforced by the
 * "server-only" import). Use exclusively for:
 *   - webhook handlers (Razorpay)
 *   - public order tracking lookup (order_no + phone, validated server-side)
 *   - seed / import scripts
 * Never pass its results to the client without filtering.
 */
export function createAdminClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
