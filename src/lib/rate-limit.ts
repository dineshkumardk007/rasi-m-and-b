import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { isDemo } from "./data/mode";
import { createAdminClient } from "./supabase/admin";

/**
 * General-purpose rate limit for public write actions.
 *
 * Server Actions are ordinary POST endpoints whose ids sit in the client
 * bundle, so anything reachable without a login can be called in a loop.
 * Review posting, sign-up and coupon checks were all unthrottled: enough for
 * review spam, junk customer rows, and brute-forcing which coupon codes exist.
 *
 * Storage is the same admin_login_attempts table the login throttle uses —
 * SECURITY DEFINER functions that increment and test in one statement, so two
 * simultaneous requests cannot both read "under the limit". A per-process Map
 * would give an attacker a fresh budget on every warm serverless instance.
 *
 * Fails open on a database error, matching the login throttle: a Supabase
 * outage must not take the storefront's write paths down with it.
 */

const SALT = () => process.env.ADMIN_SESSION_SECRET?.trim() || "rasi-rate-limit";

/** Demo mode has no database; best-effort in-process counters instead. */
const memory = new Map<string, { count: number; firstAt: number }>();

function hashKey(bucket: string, identifier: string): string {
  return createHmac("sha256", SALT())
    .update(`ratelimit:${bucket}:${identifier}`)
    .digest("base64url");
}

/**
 * Best-effort caller identity for anonymous actions. Behind Vercel the client
 * IP arrives in x-forwarded-for; it is hashed, never stored in the clear.
 */
export async function callerKey(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for") ?? "";
    const ip = fwd.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    return ip;
  } catch {
    return "unknown";
  }
}

export interface RateLimitOptions {
  /** Distinct name per action, so budgets do not bleed into each other. */
  bucket: string;
  /** Who is being limited — usually the hashed caller IP or an account id. */
  identifier: string;
  /** Requests allowed inside the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/** True when the call is allowed; false when the caller is over budget. */
export async function allowRequest({
  bucket,
  identifier,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<boolean> {
  const key = hashKey(bucket, identifier);

  if (isDemo()) {
    const now = Date.now();
    const entry = memory.get(key);
    if (!entry || now - entry.firstAt > windowSeconds * 1000) {
      memory.set(key, { count: 1, firstAt: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("admin_record_failed_login", {
      p_key: key,
      p_window_seconds: windowSeconds,
    });
    if (error) return true; // fail open
    return (data ?? 0) <= limit;
  } catch {
    return true;
  }
}

/** Convenience wrapper: limit an anonymous action by caller IP. */
export async function allowByCaller(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  return allowRequest({
    bucket,
    identifier: await callerKey(),
    limit,
    windowSeconds,
  });
}
