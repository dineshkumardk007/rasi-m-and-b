import { describe, expect, it } from "vitest";
import { hashPassword } from "@/lib/admin-password";
import { looksHashed, upgradeIfLegacy, verifyCustomerPassword } from "@/lib/customer-password";

describe("customer passwords", () => {
  it("accepts the right password against a hashed row", () => {
    const stored = hashPassword("amma-2024");
    expect(verifyCustomerPassword("amma-2024", stored)).toBe(true);
    expect(verifyCustomerPassword("amma-2025", stored)).toBe(false);
  });

  it("still accepts a legacy cleartext row so nobody is locked out mid-migration", () => {
    expect(verifyCustomerPassword("amma-2024", "amma-2024")).toBe(true);
    expect(verifyCustomerPassword("wrong", "amma-2024")).toBe(false);
  });

  it("rejects every password when no password is set", () => {
    // The account-takeover case: checkout creates a customer row for each order
    // with no password. Sign-in used to accept any password for such a row and
    // then keep it, so knowing a phone number was enough to own the account.
    expect(verifyCustomerPassword("anything", "")).toBe(false);
    expect(verifyCustomerPassword("", "")).toBe(false);
  });

  it("tells a stored hash from a stored cleartext value", () => {
    expect(looksHashed(hashPassword("x"))).toBe(true);
    expect(looksHashed("x")).toBe(false);
    // A customer whose literal password starts with the scheme name is still
    // read as cleartext, because a real hash has three colon-separated fields
    // and verifyPasswordHash rejects anything else.
    expect(verifyCustomerPassword("scrypt:hello", "scrypt:hello")).toBe(false);
  });

  it("rewrites a legacy row to a hash on login, and leaves a hashed row alone", () => {
    const upgrade = upgradeIfLegacy("amma-2024", "amma-2024");
    expect("password" in upgrade).toBe(true);
    const rehashed = (upgrade as { password: string }).password;
    expect(looksHashed(rehashed)).toBe(true);
    expect(verifyCustomerPassword("amma-2024", rehashed)).toBe(true);

    expect(upgradeIfLegacy("amma-2024", hashPassword("amma-2024"))).toEqual({});
  });
});
