import { beforeEach, describe, expect, it } from "vitest";

/**
 * The admin session cookie is the only thing standing between the public
 * internet and a panel that edits stock, prices and customer orders. These
 * tests pin the properties that matter: a token cannot be forged, cannot be
 * edited, and stops working when it expires.
 *
 * Every one of these functions reads process.env at call time rather than at
 * import time, so mutating the env between tests is enough — no module reset.
 */

const SECRET = "test-secret-that-is-at-least-32-chars-long";

async function loadSession() {
  const mod = await import("@/lib/admin-session");
  return mod;
}

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = SECRET;
  process.env.ADMIN_USERNAME = "rasiadmin";
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD_HASH;
});

describe("session tokens", () => {
  it("round-trips a token it issued", async () => {
    const { createSessionToken, verifySessionToken } = await loadSession();
    const token = createSessionToken("admin-owner");
    expect(token).toBeTruthy();
    expect(verifySessionToken(token as string)).toBe("admin-owner");
  });

  it("rejects a token whose payload was edited", async () => {
    const { createSessionToken, verifySessionToken } = await loadSession();
    const token = createSessionToken() as string;
    const [version, payload, signature] = token.split(".") as [string, string, string];

    // Re-encode the claims with a far-future expiry, keeping the old signature.
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    claims.exp = Math.floor(Date.now() / 1000) + 10_000_000;
    const forged = Buffer.from(JSON.stringify(claims)).toString("base64url");

    expect(verifySessionToken(`${version}.${forged}.${signature}`)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const { createSessionToken } = await loadSession();
    const token = createSessionToken() as string;

    process.env.ADMIN_SESSION_SECRET = "a-completely-different-secret-32-chars";
    const { verifySessionToken } = await loadSession();
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const { verifySessionToken } = await loadSession();
    const { createHmac } = await import("node:crypto");

    // Hand-build a token that expired an hour ago.
    const claims = {
      sub: "admin-owner",
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600,
    };
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const body = `v1.${payload}`;
    const sig = createHmac("sha256", SECRET).update(body).digest("base64url");

    expect(verifySessionToken(`${body}.${sig}`)).toBeNull();
  });

  it("rejects junk and the pre-HMAC 'authenticated' cookie value", async () => {
    const { verifySessionToken } = await loadSession();
    for (const bad of ["", "authenticated", "v1.abc", "not.a.token", "v2.a.b"]) {
      expect(verifySessionToken(bad)).toBeNull();
    }
    expect(verifySessionToken(undefined)).toBeNull();
  });

  it("issues nothing when the secret is missing or too short", async () => {
    process.env.ADMIN_SESSION_SECRET = "too-short";
    const short = await loadSession();
    expect(short.createSessionToken()).toBeNull();

    delete process.env.ADMIN_SESSION_SECRET;
    const missing = await loadSession();
    expect(missing.createSessionToken()).toBeNull();
  });
});

describe("credential checks", () => {
  it("refuses every login when nothing is configured", async () => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_SESSION_SECRET;
    const { verifyAdminCredentials } = await loadSession();

    const result = verifyAdminCredentials("rasiadmin", "anything");
    expect(result).toEqual({ ok: false, reason: "not_configured" });
  });

  it("accepts the configured pair and rejects a wrong password", async () => {
    const { hashPassword } = await import("@/lib/admin-password");
    process.env.ADMIN_PASSWORD_HASH = hashPassword("correct-horse");
    const { verifyAdminCredentials } = await loadSession();

    expect(verifyAdminCredentials("rasiadmin", "correct-horse").ok).toBe(true);
    expect(verifyAdminCredentials("rasiadmin", "wrong").ok).toBe(false);
    expect(verifyAdminCredentials("someone-else", "correct-horse").ok).toBe(false);
  });

  it("matches the username case-insensitively but the password exactly", async () => {
    const { hashPassword } = await import("@/lib/admin-password");
    process.env.ADMIN_PASSWORD_HASH = hashPassword("CaseSensitive");
    const { verifyAdminCredentials } = await loadSession();

    expect(verifyAdminCredentials("RasiAdmin", "CaseSensitive").ok).toBe(true);
    expect(verifyAdminCredentials("rasiadmin", "casesensitive").ok).toBe(false);
  });
});
