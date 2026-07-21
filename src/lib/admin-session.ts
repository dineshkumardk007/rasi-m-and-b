import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { verifyPasswordHash } from "./admin-password";

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
  return secret && secret.length >= 32 ? secret : null;
}

export type CredentialResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "bad_credentials" };

/** Check a username/password pair against the configured admin credentials. */
export function verifyAdminCredentials(username: string, password: string): CredentialResult {
  const validUser = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const plainPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!validUser || (!passwordHash && !plainPassword) || !sessionSecret()) {
    return { ok: false, reason: "not_configured" };
  }

  const userOk = safeEqual(username.trim().toLowerCase(), validUser);
  // Always run the password check so a wrong username is not measurably faster.
  const passOk = passwordHash
    ? verifyPasswordHash(password, passwordHash)
    : safeEqual(password, plainPassword as string);

  return userOk && passOk ? { ok: true } : { ok: false, reason: "bad_credentials" };
}

/** Issue a signed session token, or null when ADMIN_SESSION_SECRET is unset/too short. */
export function createSessionToken(subject = "admin-owner"): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    Buffer.from(JSON.stringify({ sub: subject, iat: now, exp: now + SESSION_TTL_SECONDS })),
  );
  const body = `v1.${payload}`;
  return `${body}.${sign(body, secret)}`;
}

/** Verify a session cookie value. Returns the subject, or null if invalid/expired. */
export function verifySessionToken(token: string | undefined): string | null {
  const secret = sessionSecret();
  if (!secret || !token) return null;

  const [version, payload, signature] = token.split(".");
  if (version !== "v1" || !payload || !signature) return null;

  if (!safeEqual(signature, sign(`v1.${payload}`, secret))) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      sub?: string;
      exp?: number;
    };
    if (!claims.sub || typeof claims.exp !== "number") return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims.sub;
  } catch {
    return null;
  }
}

/**
 * Failed-login throttle. In-memory, so it is per serverless instance rather
 * than global — enough to stop credential stuffing from a single client, not a
 * substitute for a WAF. Move to a Supabase table if the shop ever needs one.
 */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; firstAt: number }>();

export function isLockedOut(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > LOCKOUT_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.firstAt > LOCKOUT_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  entry.count += 1;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
