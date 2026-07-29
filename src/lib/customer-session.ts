import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isDemo } from "./data/mode";

/**
 * Customer session tokens.
 *
 * Password and email sign-in used to prove a credential and then hand the
 * result to the browser to remember — there was no server-side session at all.
 * Every action that needed "who is asking" therefore took the phone number as
 * an argument, which meant anyone could ask for anyone's order history simply
 * by passing a different number (Server Actions are ordinary POST endpoints).
 *
 * A session is now an HMAC-signed cookie, the same scheme the admin panel uses:
 * the server issues it after checking a credential, and reads the caller's
 * identity back out of it. The phone number an action acts on is never taken
 * from the caller again.
 *
 * OTP sign-in goes through Supabase Auth and already has a real session, so
 * `currentCustomer()` accepts either.
 */

export const CUSTOMER_COOKIE = "rasi_customer_session";
/** 30 days — a shopper should not be logged out between visits. */
export const CUSTOMER_TTL_SECONDS = 60 * 60 * 24 * 30;

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

/**
 * Derived from the admin secret rather than a new env var, so an existing
 * deploy keeps working. The extra HMAC is domain separation: an admin token
 * and a customer token are signed with different keys, so one can never be
 * presented as the other.
 */
function customerSecret(): string | null {
  const root = process.env.ADMIN_SESSION_SECRET?.trim();
  if (root && root.length >= 32) {
    return createHmac("sha256", root).update("rasi-customer-session-v1").digest("base64url");
  }
  // Demo mode has no secret configured and no real customer data to protect.
  return isDemo() ? "rasi-demo-customer-session-key-not-for-production" : null;
}

function sign(data: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export interface CustomerIdentity {
  /** 10-digit phone, or the email address for email-registered accounts. */
  sub: string;
  name: string;
}

export function createCustomerToken(sub: string, name: string): string | null {
  const secret = customerSecret();
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    Buffer.from(JSON.stringify({ sub, name, iat: now, exp: now + CUSTOMER_TTL_SECONDS })),
  );
  const body = `v1.${payload}`;
  return `${body}.${sign(body, secret)}`;
}

export function verifyCustomerToken(token: string | undefined): CustomerIdentity | null {
  const secret = customerSecret();
  if (!secret || !token) return null;

  const [version, payload, signature] = token.split(".");
  if (version !== "v1" || !payload || !signature) return null;
  if (!safeEqual(signature, sign(`v1.${payload}`, secret))) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      sub?: string;
      name?: string;
      exp?: number;
    };
    if (!claims.sub || typeof claims.exp !== "number") return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: claims.sub, name: claims.name ?? "Customer" };
  } catch {
    return null;
  }
}

/** Issue the session cookie. Only callable from a Server Action / Route Handler. */
export async function startCustomerSession(sub: string, name: string): Promise<void> {
  const token = createCustomerToken(sub, name);
  if (!token) return;
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_TTL_SECONDS,
  });
}

export async function endCustomerSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE);
}

/**
 * The caller's identity, proven server-side. Returns null for a signed-out
 * visitor. Never trust a phone number that arrived as an argument instead.
 */
export async function currentCustomer(): Promise<CustomerIdentity | null> {
  const jar = await cookies();
  const fromCookie = verifyCustomerToken(jar.get(CUSTOMER_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  // OTP sign-in path: a genuine Supabase Auth session.
  if (isDemo()) return null;
  try {
    const { createClient } = await import("./supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const phone = user.phone ? user.phone.replace(/\D/g, "").slice(-10) : "";
    const sub = phone || user.email || "";
    if (!sub) return null;
    return { sub, name: (user.user_metadata?.name as string) ?? "Customer" };
  } catch {
    return null;
  }
}

/** The caller's 10-digit phone, or null when they signed in with an email. */
export async function currentCustomerPhone(): Promise<string | null> {
  const me = await currentCustomer();
  if (!me) return null;
  const digits = me.sub.replace(/\D/g, "");
  return digits.length === 10 ? digits : null;
}
