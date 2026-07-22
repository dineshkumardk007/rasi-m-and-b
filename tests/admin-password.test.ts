import { describe, expect, it } from "vitest";
import { hashPassword, verifyPasswordHash } from "@/lib/admin-password";

describe("password hashing", () => {
  it("verifies a password against its own hash", () => {
    const stored = hashPassword("RasiAdmin@2403");
    expect(verifyPasswordHash("RasiAdmin@2403", stored)).toBe(true);
  });

  it("rejects the wrong password", () => {
    const stored = hashPassword("RasiAdmin@2403");
    expect(verifyPasswordHash("rasiadmin@2403", stored)).toBe(false);
    expect(verifyPasswordHash("", stored)).toBe(false);
  });

  it("salts, so the same password hashes differently every time", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("never emits a '$', which dotenv would expand out of the stored value", () => {
    // The reason the fields are ':'-separated — see admin-password.ts.
    for (let i = 0; i < 20; i++) expect(hashPassword("pw")).not.toContain("$");
  });

  it("rejects malformed stored values instead of throwing", () => {
    for (const bad of ["", "garbage", "scrypt:", "scrypt::", "bcrypt:a:b", "scrypt:a"]) {
      expect(verifyPasswordHash("pw", bad)).toBe(false);
    }
  });
});
