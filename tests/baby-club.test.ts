import { describe, expect, it } from "vitest";
import {
  BIRTHDAY_COUPON_CODE,
  BIRTHDAY_COUPON_MIN_ORDER,
  BIRTHDAY_COUPON_PERCENT,
  birthdayCouponFor,
  isBirthdayCode,
} from "@/lib/baby-club";
import { evaluateCoupon } from "@/lib/data/catalog";

const at = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};

describe("isBirthdayCode()", () => {
  it("is tolerant of case and stray spaces", () => {
    expect(isBirthdayCode("babybday")).toBe(true);
    expect(isBirthdayCode("  BabyBday  ")).toBe(true);
    expect(isBirthdayCode("SAVE10")).toBe(false);
  });
});

describe("birthdayCouponFor()", () => {
  it("issues the perk during the baby's birth month", () => {
    const coupon = birthdayCouponFor("2024-07-15", at("2025-07-02"));
    expect(coupon).not.toBeNull();
    expect(coupon!.code).toBe(BIRTHDAY_COUPON_CODE);
    expect(coupon!.type).toBe("percent");
    expect(coupon!.value).toBe(BIRTHDAY_COUPON_PERCENT);
  });

  it("withholds it in every other month", () => {
    expect(birthdayCouponFor("2024-07-15", at("2025-06-30"))).toBeNull();
    expect(birthdayCouponFor("2024-07-15", at("2025-08-01"))).toBeNull();
  });

  it("withholds it with no date stored", () => {
    expect(birthdayCouponFor(null, at("2025-07-02"))).toBeNull();
    expect(birthdayCouponFor("", at("2025-07-02"))).toBeNull();
  });

  it("withholds it once the child outgrows the club", () => {
    // Born July 2019 — birth month matches, but the child is 6.
    expect(birthdayCouponFor("2019-07-15", at("2025-07-02"))).toBeNull();
  });

  it("expires at the start of the following month", () => {
    const coupon = birthdayCouponFor("2024-07-15", at("2025-07-20"))!;
    const expiry = new Date(coupon.valid_until!);
    expect(expiry.getMonth()).toBe(7); // August 1 — the July window has closed
    expect(expiry.getFullYear()).toBe(2025);
  });
});

/**
 * evaluateCoupon() compares valid_until against the real clock, so these build
 * the coupon from a date of birth in the *current* month. A coupon minted for a
 * past month is genuinely expired, which is the replay protection under test.
 */
describe("birthday coupon through evaluateCoupon()", () => {
  const now = new Date();
  const thisMonthDob = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}-15`;
  const coupon = () => birthdayCouponFor(thisMonthDob)!;

  it("is live during the birthday month", () => {
    expect(coupon()).not.toBeNull();
    expect(evaluateCoupon(coupon(), 1000).ok).toBe(true);
  });

  it("is refused once its month has passed — a stale copy cannot be replayed", () => {
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 10);
    const stale = birthdayCouponFor(`${now.getFullYear() - 2}-${String(now.getMonth() + 1).padStart(2, "0")}-15`, lastYear)!;
    const check = evaluateCoupon(stale, 1000);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe("expired");
  });

  it("takes the right percentage off", () => {
    const check = evaluateCoupon(coupon(), 1000);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.discount).toBe(1000 * (BIRTHDAY_COUPON_PERCENT / 100));
  });

  it("enforces its minimum order", () => {
    const check = evaluateCoupon(coupon(), BIRTHDAY_COUPON_MIN_ORDER - 1);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe("min_order");
  });

  it("rejects a null coupon the same way as an unknown code", () => {
    const check = evaluateCoupon(null, 1000);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe("not_found");
  });
});
