import { hashPassword, verifyPasswordHash } from "./admin-password";

/**
 * Customer credential checks.
 *
 * Split out of the server-action file for the same reason admin-password.ts is
 * split out of admin-session.ts: the rules below are pure, and pure rules are
 * the ones worth testing directly.
 *
 * Customer passwords were stored and compared in cleartext. They are now
 * scrypt-hashed with the same helper the admin login uses. Rows written before
 * that change still hold a cleartext value, so verification accepts either form
 * and the caller rewrites the legacy row to a hash the first time its owner
 * logs in — the column drains itself without locking anyone out.
 */

/** Every hash this code writes starts with `scrypt:`; a legacy value never does. */
export function looksHashed(stored: string): boolean {
  return stored.startsWith("scrypt:");
}

export function verifyCustomerPassword(supplied: string, stored: string): boolean {
  if (!stored) return false; // no password set → not verifiable, and not claimable
  return looksHashed(stored) ? verifyPasswordHash(supplied, stored) : supplied === stored;
}

/**
 * What to persist after a successful login: a hash when the stored value was
 * still cleartext, nothing when it is already hashed.
 */
export function upgradeIfLegacy(supplied: string, stored: string): { password: string } | Record<string, never> {
  return looksHashed(stored) ? {} : { password: hashPassword(supplied) };
}
