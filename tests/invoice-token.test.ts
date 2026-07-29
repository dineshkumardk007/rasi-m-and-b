import { beforeEach, describe, expect, it } from "vitest";

/**
 * The invoice link used to carry ?phone=98765xxxxx, putting a customer's number
 * into browser history, access logs and outbound Referer headers. The token
 * that replaced it must be unforgeable and bound to one order.
 */

const SECRET = "test-secret-that-is-at-least-32-chars-long";

async function load() {
  return import("@/lib/invoice-token");
}

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = SECRET;
});

describe("invoice link tokens", () => {
  it("verifies a token it issued for the same order and phone", async () => {
    const { createInvoiceToken, verifyInvoiceToken } = await load();
    const token = createInvoiceToken("RSB-1001", "9876543210") as string;
    expect(token).toBeTruthy();
    expect(verifyInvoiceToken("RSB-1001", "9876543210", token)).toBe(true);
  });

  it("normalises phone formatting on both sides", async () => {
    const { createInvoiceToken, verifyInvoiceToken } = await load();
    const token = createInvoiceToken("RSB-1001", "+91 98765 43210") as string;
    expect(verifyInvoiceToken("RSB-1001", "9876543210", token)).toBe(true);
  });

  it("does not let a token be moved to another order", async () => {
    const { createInvoiceToken, verifyInvoiceToken } = await load();
    const token = createInvoiceToken("RSB-1001", "9876543210") as string;
    // Sequential order numbers make this the obvious attack.
    expect(verifyInvoiceToken("RSB-1002", "9876543210", token)).toBe(false);
  });

  it("rejects a token for a different customer on the same order", async () => {
    const { createInvoiceToken, verifyInvoiceToken } = await load();
    const token = createInvoiceToken("RSB-1001", "9876543210") as string;
    expect(verifyInvoiceToken("RSB-1001", "9000000001", token)).toBe(false);
  });

  it("rejects a missing, empty or garbage token", async () => {
    const { verifyInvoiceToken } = await load();
    expect(verifyInvoiceToken("RSB-1001", "9876543210", undefined)).toBe(false);
    expect(verifyInvoiceToken("RSB-1001", "9876543210", "")).toBe(false);
    expect(verifyInvoiceToken("RSB-1001", "9876543210", "not-a-token")).toBe(false);
  });

  it("stops verifying when the signing secret rotates", async () => {
    const { createInvoiceToken } = await load();
    const token = createInvoiceToken("RSB-1001", "9876543210") as string;

    process.env.ADMIN_SESSION_SECRET = "a-different-secret-at-least-32-chars-ok";
    const { verifyInvoiceToken } = await load();
    expect(verifyInvoiceToken("RSB-1001", "9876543210", token)).toBe(false);
  });
});
