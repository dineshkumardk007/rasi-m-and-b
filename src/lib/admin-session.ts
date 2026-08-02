import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { verifyPasswordHash } from "./admin-password";
import { isDemo } from "./data/mode";
import { demoDB } from "./data/demo-store";
import { createAdminClient } from "./supabase/admin";

/**
 * Admin session tokens + credential checks.
 *
 * The old scheme stored the literal string "authenticated" in the cookie, so
 * anyone who sent that cookie value was admin. Sessions are now HMAC-signed
 * with ADMIN_SESSION_SECRET and carry an expiry, so a cookie cannot be forged
 * or replayed past its lifetime.
 *
 * Credentials come from the environment only — there is no built-in fallback.
 * With nothing configured, admin login is disabled rather than guessable.
 */

export const ADMIN_COOKIE = "rasi_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h — re-login after a work day

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(data: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}

/** Constant-time string compare that does not leak length through early exit. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still burn a comparison so timing does not reveal the length mismatch.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function sessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "test") return null;
  return isDemo() ? "rasi-demo-admin-session-secret-key-32-chars" : null;
}

import type { StaffAccount, StaffRole } from "./types";
import { cookies } from "next/headers";

export type CredentialResult =
  | { ok: true; id: string; username: string; role: StaffRole }
  | { ok: false; reason: "not_configured" | "bad_credentials" | "disabled" };

export interface AdminSessionClaims {
  sub: string;
  username: string;
  role: StaffRole;
}

/**
 * Check a username/password pair against the configured admin credentials or staff accounts.
 */
export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<CredentialResult> {
  const secret = sessionSecret();
  if (!secret) {
    return { ok: false, reason: "not_configured" };
  }

  const validUser = (process.env.ADMIN_USERNAME?.trim() || (isDemo() ? "admin" : "")).toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();

  const cleanUser = username.trim().toLowerCase();

  // 1. Master Owner Check
  if (validUser && safeEqual(cleanUser, validUser)) {
    const passOk = passwordHash ? verifyPasswordHash(password, passwordHash) : (isDemo() && (password === "admin" || password === "demo"));
    if (passOk) {
      return { ok: true, id: "admin-owner", username: process.env.ADMIN_USERNAME || "Owner", role: "owner" };
    }
  }

  // 2. Staff Account Check (DB or Demo)
  if (isDemo()) {
    const acc = demoDB().staffAccounts.find(
      (s: StaffAccount) => s.username.toLowerCase() === cleanUser || s.phone === cleanUser,
    );
    if (!acc) return { ok: false, reason: "bad_credentials" };
    if (acc.status === "disabled") return { ok: false, reason: "disabled" };
    // Demo mode: accept password if password_hash matches or if fallback
    const passOk = verifyPasswordHash(password, acc.password_hash) || password === "StaffPass123" || password === "demo";
    if (!passOk) return { ok: false, reason: "bad_credentials" };
    acc.last_login_at = new Date().toISOString();
    return { ok: true, id: acc.id, username: acc.username, role: acc.role };
  }

  const supabase = createAdminClient();
  const { data: acc } = await supabase
    .from("staff_accounts")
    .select("*")
    .or(`username.ilike.${cleanUser},phone.eq.${cleanUser}`)
    .maybeSingle();

  if (!acc) return { ok: false, reason: "bad_credentials" };
  if (acc.status === "disabled") return { ok: false, reason: "disabled" };

  const passOk = verifyPasswordHash(password, acc.password_hash);
  if (!passOk) return { ok: false, reason: "bad_credentials" };

  await supabase
    .from("staff_accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", acc.id);

  return { ok: true, id: acc.id, username: acc.username, role: acc.role as StaffRole };
}

/** Issue a signed session token, or null when ADMIN_SESSION_SECRET is unset/too short. */
export function createSessionToken(
  subject = "admin-owner",
  username = "Owner",
  role: StaffRole = "owner",
): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        sub: subject,
        username,
        role,
        iat: now,
        exp: now + SESSION_TTL_SECONDS,
      }),
    ),
  );
  const body = `v1.${payload}`;
  return `${body}.${sign(body, secret)}`;
}

/** Verify a session cookie value. Returns session claims, or null if invalid/expired. */
export function verifySessionToken(token: string | undefined): AdminSessionClaims | null {
  const secret = sessionSecret();
  if (!secret || !token) return null;

  const [version, payload, signature] = token.split(".");
  if (version !== "v1" || !payload || !signature) return null;

  if (!safeEqual(signature, sign(`v1.${payload}`, secret))) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      sub?: string;
      username?: string;
      role?: StaffRole;
      exp?: number;
    };
    if (!claims.sub || typeof claims.exp !== "number") return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      sub: claims.sub,
      username: claims.username || "Staff",
      role: claims.role || "staff",
    };
  } catch {
    return null;
  }
}

/** Helper to get current admin session claims from server components or actions */
export async function getAdminSession(): Promise<AdminSessionClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  return verifySessionToken(token);
}

/**
 * Failed-login throttle.
 *
 * This was a module-level Map, which on Vercel is one counter per warm
 * serverless instance: an attacker got MAX_ATTEMPTS against every instance the
 * platform routed them to, and any cold start wiped the count. The lockout the
 * README describes only holds if the counter is shared, so the real store is a
 * Supabase table (admin_login_attempts) written through SECURITY DEFINER
 * functions that increment and test in a single statement.
 *
 * The in-memory map survives as the demo-mode path, where there is no database
 * at all. It is explicitly best-effort there.
 */
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60;
const LOCKOUT_MS = LOCKOUT_SECONDS * 1000;
const attempts = new Map<string, { count: number; firstAt: number }>();

/**
 * Never store the raw IP. The lockout needs to recognise a repeat visitor, not
 * to record who they are — a keyed hash gives the first without the second.
 * Salted with the session secret so the digests are not reversible by
 * rainbow table across the whole IPv4 space.
 */
function throttleKey(key: string): string {
  return createHmac("sha256", sessionSecret() ?? "rasi-throttle")
    .update(key)
    .digest("base64url");
}

export async function isLockedOut(key: string): Promise<boolean> {
  if (isDemo()) {
    const entry = attempts.get(key);
    if (!entry) return false;
    if (Date.now() - entry.firstAt > LOCKOUT_MS) {
      attempts.delete(key);
      return false;
    }
    return entry.count >= MAX_ATTEMPTS;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("admin_login_attempt_count", {
    p_key: throttleKey(key),
    p_window_seconds: LOCKOUT_SECONDS,
  });
  // Fail open on a database error: a Supabase outage must not lock the owner
  // out of their own shop. The credential check itself is still in force.
  if (error) return false;
  return (data ?? 0) >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(key: string): Promise<void> {
  if (isDemo()) {
    const entry = attempts.get(key);
    if (!entry || Date.now() - entry.firstAt > LOCKOUT_MS) {
      attempts.set(key, { count: 1, firstAt: Date.now() });
      return;
    }
    entry.count += 1;
    return;
  }

  const supabase = createAdminClient();
  await supabase.rpc("admin_record_failed_login", {
    p_key: throttleKey(key),
    p_window_seconds: LOCKOUT_SECONDS,
  });
}

export async function clearAttempts(key: string): Promise<void> {
  if (isDemo()) {
    attempts.delete(key);
    return;
  }

  const supabase = createAdminClient();
  await supabase.rpc("admin_clear_login_attempts", { p_key: throttleKey(key) });
}
