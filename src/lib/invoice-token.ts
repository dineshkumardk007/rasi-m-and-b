import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isDemo } from "./data/mode";

/**
 * Capability token for the printable invoice.
 *
 * The invoice used to be reached at /invoice/RSB-1001?phone=9876543210, which
 * writes a customer's phone number into browser history, server access logs,
 * and the Referer header of anything the page links out to. Order numbers are
 * also sequential, so the phone was the only guard on the URL.
 *
 * The token proves the link was issued by us for this order, and carries no
 * personal data: it is an HMAC over the order number and the phone recorded on
 * the order, so it cannot be transferred to a different order or forged
 * without the secret.
 */

function secret(): string | null {
  const root = process.env.ADMIN_SESSION_SECRET?.trim();
  if (root && root.length >= 32) {
    return createHmac("sha256", root).update("rasi-invoice-link-v1").digest("base64url");
  }
  return isDemo() ? "rasi-demo-invoice-key-not-for-production" : null;
}

function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

/** Token for the invoice link, or null when no secret is configured. */
export function createInvoiceToken(orderNo: string, phone: string): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key)
    .update(`${orderNo.trim()}:${normalisePhone(phone)}`)
    .digest("base64url");
}

export function verifyInvoiceToken(
  orderNo: string,
  phone: string,
  token: string | undefined,
): boolean {
  if (!token) return false;
  const expected = createInvoiceToken(orderNo, phone);
  if (!expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}
