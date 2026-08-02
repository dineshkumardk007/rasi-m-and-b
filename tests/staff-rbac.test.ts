import { describe, expect, it } from "vitest";
import { hashPassword, verifyPasswordHash } from "@/lib/admin-password";
import { createSessionToken, verifySessionToken } from "@/lib/admin-session";

describe("Staff RBAC & Password Hashing", () => {
  it("hashes and verifies staff passwords securely using scrypt", () => {
    const plain = "StaffPass@123";
    const hash = hashPassword(plain);

    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(verifyPasswordHash(plain, hash)).toBe(true);
    expect(verifyPasswordHash("WrongPass", hash)).toBe(false);
  });

  it("issues and verifies staff session tokens with username and role claims", () => {
    process.env.ADMIN_SESSION_SECRET = "0123456789abcdef0123456789abcdef";

    const token = createSessionToken("staff-123", "priya_manager", "manager");
    expect(token).not.toBeNull();

    const claims = verifySessionToken(token!);
    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe("staff-123");
    expect(claims?.username).toBe("priya_manager");
    expect(claims?.role).toBe("manager");
  });

  it("rejects tampered staff session tokens", () => {
    process.env.ADMIN_SESSION_SECRET = "0123456789abcdef0123456789abcdef";

    const token = createSessionToken("staff-123", "rahul_sales", "staff")!;
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.badsignature123`;

    const claims = verifySessionToken(tampered);
    expect(claims).toBeNull();
  });
});
