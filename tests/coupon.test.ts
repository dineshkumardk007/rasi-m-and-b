import { describe, expect, it } from "vitest";
import { evaluateCoupon } from "@/lib/data/catalog";
import type { Coupon } from "@/lib/types";

/**
 * Coupon evaluation decides how much money the shop gives away, and had no
 * test. Expiry and usage limits are especially worth pinning: the admin form
 * only just started offering them, so these are the rules the new fields rely
 * on being enforced.
 */

const coupon = (over: Partial<Coupon> = {}): Coupon => ({
  code: "WELCOME10",
  type: "percent",
  value: 10,
  min_order: 499,
  valid_until: null,
  usage_limit: null,
  used_count: 0,
  ...over,
});

const dayFromNow = (n: number) =>
  new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

describe("coupon evaluation", () => {
  it("applies a percentage discount", () => {
    const res = evaluateCoupon(coupon(), 1000);
    expect(res).toMatchObject({ ok: true, discount: 100 });
  });

  it("applies a flat discount", () => {
    const res = evaluateCoupon(coupon({ type: "flat", value: 50, min_order: 999 }), 1000);
    expect(res).toMatchObject({ ok: true, discount: 50 });
  });

  it("rounds a percentage discount to whole rupees", () => {
    const res = evaluateCoupon(coupon({ value: 10 }), 1055);
    expect(res).toMatchObject({ ok: true, discount: 106 }); // 105.5 → 106
  });

  it("rejects an unknown code", () => {
    expect(evaluateCoupon(null, 1000)).toMatchObject({ ok: false, reason: "not_found" });
  });

  it("rejects a subtotal below the minimum, and reports the minimum", () => {
    expect(evaluateCoupon(coupon({ min_order: 499 }), 498)).toMatchObject({
      ok: false,
      reason: "min_order",
      min: 499,
    });
  });

  it("accepts a subtotal exactly on the minimum", () => {
    expect(evaluateCoupon(coupon({ min_order: 499 }), 499)).toMatchObject({ ok: true });
  });

  it("rejects an expired coupon", () => {
    expect(
      evaluateCoupon(coupon({ valid_until: dayFromNow(-1) }), 1000),
    ).toMatchObject({ ok: false, reason: "expired" });
  });

  it("accepts a coupon that has not expired yet", () => {
    expect(
      evaluateCoupon(coupon({ valid_until: dayFromNow(1) }), 1000),
    ).toMatchObject({ ok: true });
  });

  it("rejects a coupon that has hit its usage limit", () => {
    expect(
      evaluateCoupon(coupon({ usage_limit: 100, used_count: 100 }), 1000),
    ).toMatchObject({ ok: false, reason: "exhausted" });
  });

  it("accepts a coupon with uses remaining", () => {
    expect(
      evaluateCoupon(coupon({ usage_limit: 100, used_count: 99 }), 1000),
    ).toMatchObject({ ok: true });
  });

  it("treats a null usage limit as unlimited", () => {
    expect(
      evaluateCoupon(coupon({ usage_limit: null, used_count: 9999 }), 1000),
    ).toMatchObject({ ok: true });
  });

  it("checks expiry before the minimum order, so the clearer error wins", () => {
    const res = evaluateCoupon(
      coupon({ valid_until: dayFromNow(-1), min_order: 5000 }),
      100,
    );
    expect(res).toMatchObject({ ok: false, reason: "expired" });
  });
});
