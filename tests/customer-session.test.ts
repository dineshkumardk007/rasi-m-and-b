import { beforeEach, describe, expect, it } from "vitest";

/**
 * The customer session cookie is what stops one shopper reading another
 * shopper's order history — which includes their name, phone and home address.
 *
 * Before this existed, actions took the phone number as an argument and
 * queried with the service-role client, so anyone could enumerate 10-digit
 * numbers and harvest customer addresses. These tests pin the properties the
 * replacement has to keep: a token cannot be forged, cannot be edited, expires,
 * and cannot be swapped with an admin token signed by the same root secret.
 */

const SECRET = "test-secret-that-is-at-least-32-chars-long";

async function loadCustomerSession() {
  return import("@/lib/customer-session");
}

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = SECRET;
});

describe("customer session tokens", () => {
  it("round-trips an identity it issued", async () => {
    const { createCustomerToken, verifyCustomerToken } = await loadCustomerSession();
    const token = createCustomerToken("9876543210", "Priya");
    expect(token).toBeTruthy();
    expect(verifyCustomerToken(token as string)).toEqual({
      sub: "9876543210",
      name: "Priya",
    });
  });

  it("rejects a token signed with a different secret", async () => {
    const { createCustomerToken } = await loadCustomerSession();
    const token = createCustomerToken("9876543210", "Priya") as string;

    process.env.ADMIN_SESSION_SECRET = "another-secret-that-is-at-least-32-chars";
    const { verifyCustomerToken } = await loadCustomerSession();
    expect(verifyCustomerToken(token)).toBeNull();
  });

  it("rejects a payload edited to impersonate another customer", async () => {
    const { createCustomerToken, verifyCustomerToken } = await loadCustomerSession();
    const token = createCustomerToken("9876543210", "Priya") as string;
    const [version, payload, signature] = token.split(".") as [string, string, string];

    // Swap the subject for a victim's number, keeping the original signature.
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    const forged = Buffer.from(
      JSON.stringify({ ...claims, sub: "9000000001" }),
    ).toString("base64url");

    expect(verifyCustomerToken(`${version}.${forged}.${signature}`)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const { verifyCustomerToken } = await loadCustomerSession();
    const { createHmac } = await import("node:crypto");

    const derived = createHmac("sha256", SECRET)
      .update("rasi-customer-session-v1")
      .digest("base64url");
    const past = Math.floor(Date.now() / 1000) - 60;
    const payload = Buffer.from(
      JSON.stringify({ sub: "9876543210", name: "Priya", iat: past - 10, exp: past }),
    ).toString("base64url");
    const body = `v1.${payload}`;
    const sig = createHmac("sha256", derived).update(body).digest("base64url");

    expect(verifyCustomerToken(`${body}.${sig}`)).toBeNull();
  });

  it("rejects a malformed or absent token", async () => {
    const { verifyCustomerToken } = await loadCustomerSession();
    expect(verifyCustomerToken(undefined)).toBeNull();
    expect(verifyCustomerToken("")).toBeNull();
    expect(verifyCustomerToken("garbage")).toBeNull();
    expect(verifyCustomerToken("v1.only-two-parts")).toBeNull();
  });

  it("does not accept an admin token as a customer token", async () => {
    // Domain separation: both are derived from ADMIN_SESSION_SECRET, so an
    // admin cookie must not verify as a customer identity or vice versa.
    const { createSessionToken } = await import("@/lib/admin-session");
    const { verifyCustomerToken } = await loadCustomerSession();

    const adminToken = createSessionToken("admin-owner") as string;
    expect(adminToken).toBeTruthy();
    expect(verifyCustomerToken(adminToken)).toBeNull();
  });
});
