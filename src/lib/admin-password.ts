import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for the admin login. Kept out of admin-session.ts (which is
 * "server-only") so scripts/admin-password.ts can import it under plain node.
 */

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 32 } as const;

/**
 * Fields are `:`-separated, not the conventional `$` — dotenv expands `$NAME`
 * inside .env files, which silently mangles any `$` in the stored hash.
 * base64url output never contains `:`, so this stays unambiguous.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS);
  return `scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

/** Verify a plaintext password against a stored `scrypt:salt:hash` string. */
export function verifyPasswordHash(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split(":");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  if (expected.length === 0) return false;
  const actual = scryptSync(password, salt, expected.length, SCRYPT_PARAMS);
  return timingSafeEqual(actual, expected);
}
